package com.prolearn.submission;

import com.prolearn.classes.ClassService;
import com.prolearn.classes.ClassroomRepository;
import com.prolearn.lesson.LessonRepository;
import com.prolearn.submission.dto.SubmissionCreateRequest;
import com.prolearn.submission.dto.SubmissionResponse;
import com.prolearn.task.ProgrammingTestCase;
import com.prolearn.task.ProgrammingTestCaseRepository;
import com.prolearn.task.Task;
import com.prolearn.task.TaskRepository;
import com.prolearn.user.Role;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class AutoGradingIntegrationTest {

    @Autowired SubmissionController submissionController;
    @Autowired TaskRepository taskRepo;
    @Autowired ProgrammingTestCaseRepository caseRepo;
    @Autowired UserRepository userRepo;
    @Autowired ClassService classService;
    @Autowired ClassroomRepository classroomRepo;
    @Autowired LessonRepository lessonRepo;

    @Test
    void submissionGetsAutoGraded() {
        // create teacher and student
        User teacher = new User();
        teacher.setEmail("teacher+auto@tests.local");
        teacher.setPasswordHash("x");
        teacher.setRole(Role.TEACHER);
        teacher = userRepo.save(teacher);

        User student = new User();
        student.setEmail("student+auto@tests.local");
        student.setPasswordHash("x");
        student.setRole(Role.STUDENT);
        student = userRepo.save(student);

        // create class and join student
        var dto = classService.createClass("Klasa-Auto-" + UUID.randomUUID().toString().substring(0,5), teacher.getId());
        var classroom = classroomRepo.findById(dto.id()).orElseThrow();
        classService.joinClass(dto.joinCode(), student.getId());

        // create lesson
        var lesson = new com.prolearn.lesson.Lesson();
        lesson.setTitle("Auto lesson");
        lesson.setContent("auto");
        lesson.setCreatedBy(teacher);
        lesson.setClassroom(classroom);
        lesson = lessonRepo.save(lesson);

        // create task
        Task task = new Task();
        task.setLesson(lesson);
        task.setTitle("Auto task");
        task.setDescription("desc");
        task.setMaxPoints(10);
        task.setLanguage("javascript");
        task.setType("CODE");
        task.setGradingMode("AUTO");
        task.setAllowRunBeforeSubmit(true);
        task.setMaxAttempts(3);
        task = taskRepo.save(task);

        // create a single programming test case (EVAL mode)
        ProgrammingTestCase c = new ProgrammingTestCase();
        c.setTask(task);
        c.setInput("abc");
        c.setExpected("abc");
        c.setPoints(10);
        c.setOrder(0);
        caseRepo.save(c);

        // authenticate as student
        UUID studentId = student.getId();
        var auth = new TestingAuthenticationToken(student.getEmail(), null, "STUDENT", "ROLE_STUDENT");
        auth.setDetails(studentId);
        SecurityContextHolder.getContext().setAuthentication(auth);

        // submit code that should pass the test
        SubmissionResponse resp = submissionController.submit(task.getId(), new SubmissionCreateRequest("auto","function solve(input){return input}"), SecurityContextHolder.getContext().getAuthentication());

        assertNotNull(resp, "submission response should not be null");
        assertEquals(com.prolearn.submission.SubmissionStatus.GRADED, resp.status(), "submission should be graded");
        assertNotNull(resp.autoScore(), "autoScore should be set");
        assertTrue(resp.autoScore() > 0 || resp.points() != null, "submission should have points or autoScore");
        // prefer asserting full points when possible
        assertEquals(10, resp.points() == null ? resp.autoScore() : resp.points());
    }
}
