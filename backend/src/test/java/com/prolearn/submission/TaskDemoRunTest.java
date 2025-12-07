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
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@SpringBootTest
@Transactional
public class TaskDemoRunTest {

    @Autowired SubmissionController submissionController;
    @Autowired TaskRepository taskRepo;
    @Autowired ProgrammingTestCaseRepository caseRepo;
    @Autowired LessonRepository lessonRepo;
    @Autowired UserRepository userRepo;
    @Autowired ClassroomRepository classroomRepo;

    private Task mkTaskWithSolution(String language, String teacherSolution) {
        User teacher = new User();
        teacher.setEmail("teacher+" + UUID.randomUUID() + "@test.local");
        teacher.setPasswordHash("x");
        teacher.setRole(Role.TEACHER);
        teacher = userRepo.save(teacher);

        Classroom classroom = Classroom.builder()
                .name("cls" + UUID.randomUUID())
                .joinCode(UUID.randomUUID().toString().replace("-", "").substring(0,8))
                .owner(teacher)
                .build();
        classroom = classroomRepo.save(classroom);

        Lesson lesson = new Lesson();
        lesson.setTitle("lesson" + UUID.randomUUID());
        lesson.setContent("content");
        lesson.setCreatedBy(teacher);
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
        t.setTeacherSolution(teacherSolution);
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
    void demoRunUsesTeacherSolutionJS() {
        Task t = mkTaskWithSolution("javascript", "function solve(input){return input}\nconsole.log(solve('abc'))");
        addCase(t, "abc", "abc", 10);
        // authenticate as teacher to satisfy @RolesAllowed
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.TestingAuthenticationToken("teacher", null, "TEACHER","ROLE_TEACHER")
        );
        Map<String,Object> out = submissionController.runDemo(t.getId());
        Assertions.assertTrue(out.containsKey("tests"));
        List<?> tests = (List<?>) out.get("tests");
        Assertions.assertEquals(1, tests.size());
        Map<?,?> first = (Map<?,?>) tests.get(0);
        Assertions.assertEquals(true, first.get("passed"));
    }

    @Test
    void demoRunFailsWithoutSolution() {
        Task t = mkTaskWithSolution("javascript", null);
        addCase(t, "x", "x", 5);
        try {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    new org.springframework.security.authentication.TestingAuthenticationToken("teacher", null, "TEACHER","ROLE_TEACHER")
            );
            submissionController.runDemo(t.getId());
            Assertions.fail("Should throw when teacherSolution missing");
        } catch (Exception e) {
            Assertions.assertTrue(e instanceof org.springframework.web.server.ResponseStatusException);
        }
    }
}
