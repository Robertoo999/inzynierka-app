package com.prolearn.submission;

import com.prolearn.classes.Classroom;
import com.prolearn.classes.ClassroomRepository;
import com.prolearn.lesson.Lesson;
import com.prolearn.lesson.LessonRepository;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class RunEndpointLanguagesTest {

    @Autowired SubmissionController submissionController;
    @Autowired TaskRepository taskRepo;
    @Autowired ProgrammingTestCaseRepository caseRepo;
    @Autowired LessonRepository lessonRepo;
    @Autowired UserRepository userRepo;
    @Autowired ClassroomRepository classroomRepo;

    private User student;

    @BeforeEach
    void init() {
        // create a fresh unique student user per test to avoid unique email conflicts across test suite
        student = new User();
        student.setEmail("student+" + UUID.randomUUID() + "@test.local");
        student.setPasswordHash("x");
        student.setRole(Role.STUDENT);
        student = userRepo.save(student);
    SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("student", null, "STUDENT", "ROLE_STUDENT") {{ setDetails(student.getId()); }});
    }

    private Task mkTask(String language) {
    Classroom classroom = Classroom.builder()
        .name("cls" + UUID.randomUUID())
        .joinCode(UUID.randomUUID().toString().replace("-", "").substring(0,8))
                .owner(student)
                .build();
        classroom = classroomRepo.save(classroom);

        Lesson lesson = new Lesson();
        lesson.setTitle("lesson" + UUID.randomUUID());
        lesson.setContent("content");
        lesson.setCreatedBy(student);
        lesson.setClassroom(classroom);
        lesson = lessonRepo.save(lesson);

        Task t = new Task();
        t.setLesson(lesson);
        t.setTitle("task" + UUID.randomUUID());
        t.setDescription("desc");
        t.setMaxPoints(10);
        t.setLanguage(language);
        t.setType("CODE");
        t.setGradingMode("AUTO");
        t.setAllowRunBeforeSubmit(true);
        t.setLockAfterSubmit(false);
        t = taskRepo.save(t);
        return t;
    }

    private void addCase(Task t, String input, String expected, int pts) {
        ProgrammingTestCase c = new ProgrammingTestCase();
        c.setTask(t);
        c.setInput(input);
        c.setExpected(expected);
        c.setPoints(pts);
        c.setOrder(caseRepo.findByTaskIdOrderByOrderAsc(t.getId()).size());
        caseRepo.save(c);
    }

    @Test
    void jsRunProducesPerTestResults() {
        Task t = mkTask("javascript");
        addCase(t, "abc", "abc", 5);
        Map<String,Object> out = submissionController.runCode(t.getId(), new SubmissionController.RunRequest("function solve(input){return input}"), SecurityContextHolder.getContext().getAuthentication());
        assertTrue(out.containsKey("tests"));
        List<?> tests = (List<?>) out.get("tests");
        assertEquals(1, tests.size());
        Map<?,?> first = (Map<?,?>) tests.get(0);
        assertEquals(true, first.get("passed"));
    }

    @Test
    void pythonRunFallbackWhenJudge0Missing() {
        Task t = mkTask("python");
        addCase(t, "hi", "hi", 3);
        Map<String,Object> out = submissionController.runCode(t.getId(), new SubmissionController.RunRequest("def solve(input):\n    return input"), SecurityContextHolder.getContext().getAuthentication());
        List<?> tests = (List<?>) out.get("tests");
        assertEquals(1, tests.size());
        // Without Judge0 configured we now fallback and should pass
        assertEquals(true, ((Map<?,?>) tests.get(0)).get("passed"));
    }
}
