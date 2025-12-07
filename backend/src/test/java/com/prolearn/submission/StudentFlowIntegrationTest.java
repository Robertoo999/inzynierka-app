package com.prolearn.submission;

import com.prolearn.classes.ClassService;
import com.prolearn.classes.Classroom;
import com.prolearn.classes.ClassroomRepository;
import com.prolearn.lesson.Lesson;
import com.prolearn.lesson.LessonRepository;
import com.prolearn.submission.dto.SubmissionCreateRequest;
import com.prolearn.task.ProgrammingTestCase;
import com.prolearn.task.ProgrammingTestCaseRepository;
import com.prolearn.task.Task;
import com.prolearn.task.TaskRepository;
import com.prolearn.user.Role;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * E2E style integration covering student lifecycle: join class -> run code (no submission) -> submit attempts.
 */
@SpringBootTest
@Transactional
class StudentFlowIntegrationTest {

    @Autowired SubmissionController submissionController;
    @Autowired TaskRepository taskRepo;
    @Autowired ProgrammingTestCaseRepository caseRepo;
    @Autowired LessonRepository lessonRepo;
    @Autowired UserRepository userRepo;
    @Autowired ClassroomRepository classroomRepo;
    @Autowired ClassService classService;
    @Autowired SubmissionRepository submissionRepository;

    private User teacher;
    private User student;
    private Task task;
    private UUID studentId;
    private UUID taskId;

    private static final EnumSet<SubmissionStatus> ATTEMPT_STATUSES = EnumSet.of(SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED);

    @BeforeEach
    void setup() {
        // teacher
        teacher = new User();
        teacher.setEmail("teacher+" + UUID.randomUUID() + "@test.local");
        teacher.setPasswordHash("x");
        teacher.setRole(Role.TEACHER);
        teacher = userRepo.save(teacher);

        // student
        student = new User();
        student.setEmail("student+" + UUID.randomUUID() + "@test.local");
        student.setPasswordHash("x");
        student.setRole(Role.STUDENT);
        student = userRepo.save(student);
        studentId = student.getId();

    // classroom owned by teacher (use service to ensure valid join code format)
    var dto = classService.createClass("Klasa" + UUID.randomUUID().toString().substring(0,5), teacher.getId());
    Classroom classroom = classroomRepo.findById(dto.id()).orElseThrow();
    // student joins using join code provided by service
    classService.joinClass(dto.joinCode(), student.getId());

        // lesson
        Lesson lesson = new Lesson();
        lesson.setTitle("lesson" + UUID.randomUUID());
        lesson.setContent("content");
        lesson.setCreatedBy(teacher);
        lesson.setClassroom(classroom);
        lesson = lessonRepo.save(lesson);

        // task (JavaScript code task with 2 attempts max, lock after submit so run will be blocked after max attempts)
        task = new Task();
        task.setLesson(lesson);
        task.setTitle("task" + UUID.randomUUID());
        task.setDescription("desc");
        task.setMaxPoints(10);
        task.setLanguage("javascript");
        task.setType("CODE");
        task.setGradingMode("AUTO");
        task.setAllowRunBeforeSubmit(true);
        task.setLockAfterSubmit(true);
        task.setMaxAttempts(2);
        task = taskRepo.save(task);
        taskId = task.getId();

        // test case
        ProgrammingTestCase c = new ProgrammingTestCase();
        c.setTask(task);
        c.setInput("abc");
        c.setExpected("abc");
        c.setPoints(5);
        c.setOrder(0);
        caseRepo.save(c);

        // authenticate as student for run/submit calls
        var auth = new TestingAuthenticationToken(student.getEmail(), null, "STUDENT", "ROLE_STUDENT");
        auth.setDetails(studentId);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void studentRunDoesNotCreateSubmissionThenSubmittingConsumesAttempts() {
        long initialAttempts = submissionRepository.countByTaskIdAndStudent_IdAndStatusIn(taskId, studentId, ATTEMPT_STATUSES);
        assertEquals(0, initialAttempts, "No attempts at start");

        // First run (no submission persisted)
        Map<String,Object> run1 = submissionController.runCode(taskId, new SubmissionController.RunRequest("function solve(input){return input}"), SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(run1.get("tests"));
        assertEquals(0, submissionRepository.countByTaskIdAndStudent_IdAndStatusIn(taskId, studentId, ATTEMPT_STATUSES), "Run must not create submission");

        // Second run still returns fresh results and does not create submissions
        Map<String,Object> run2 = submissionController.runCode(taskId, new SubmissionController.RunRequest("function solve(input){return input}"), SecurityContextHolder.getContext().getAuthentication());
        assertNotSame(run1, run2, "Second run returns a new map instance");
        assertEquals(0, submissionRepository.countByTaskIdAndStudent_IdAndStatusIn(taskId, studentId, ATTEMPT_STATUSES));

        // Submit first attempt
        var sub1 = submissionController.submit(taskId, new SubmissionCreateRequest("content1", "function solve(input){return input}"), SecurityContextHolder.getContext().getAuthentication());
        assertEquals(1, sub1.attemptNumber());
        assertEquals(1, submissionRepository.countByTaskIdAndStudent_IdAndStatusIn(taskId, studentId, ATTEMPT_STATUSES));

    // Run still allowed (attemptsUsed == 1 < maxAttempts)
    Map<String,Object> runAfterSubmit = submissionController.runCode(taskId, new SubmissionController.RunRequest("function solve(input){return input}"), SecurityContextHolder.getContext().getAuthentication());
    assertNotNull(runAfterSubmit.get("tests"));
    }
}
