package com.prolearn.dev;

import com.prolearn.classes.ClassService;
import com.prolearn.classes.Classroom;
import com.prolearn.classes.dto.ClassroomDto;
import com.prolearn.lesson.LessonService;
import com.prolearn.lesson.dto.LessonWithActivitiesCreateRequest;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.prolearn.task.TaskRepository;
import com.prolearn.task.ProgrammingTestCaseRepository;
import com.prolearn.grading.JsAutoGrader;
import com.prolearn.submission.SubmissionRepository;
import com.prolearn.task.Task;
import com.prolearn.submission.Submission;
import com.prolearn.submission.SubmissionStatus;
import java.time.Instant;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Dev-only data seeder that creates a sample class and a sample lesson for the dev users.
 * Safe to run multiple times (idempotent).
 */
@Component
public class DevDataSeeder implements CommandLineRunner {

    private final UserRepository userRepo;
    private final ClassService classService;
    private final LessonService lessonService;
    private final TaskRepository taskRepo;
    private final SubmissionRepository submissionRepo;
    private final ProgrammingTestCaseRepository caseRepo;
    private final JsAutoGrader jsAutoGrader;

    public DevDataSeeder(UserRepository userRepo, ClassService classService, LessonService lessonService,
                         TaskRepository taskRepo, SubmissionRepository submissionRepo, ProgrammingTestCaseRepository caseRepo, JsAutoGrader jsAutoGrader) {
        this.userRepo = userRepo;
        this.classService = classService;
        this.lessonService = lessonService;
        this.taskRepo = taskRepo;
        this.submissionRepo = submissionRepo;
        this.caseRepo = caseRepo;
        this.jsAutoGrader = jsAutoGrader;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            Optional<User> teacherOpt = userRepo.findByEmailIgnoreCase("teacher@test.local");
            Optional<User> studentOpt = userRepo.findByEmailIgnoreCase("student@test.local");

            if (teacherOpt.isEmpty()) {
                System.out.println("DevDataSeeder: teacher not found, skipping sample data seeding");
                return;
            }

            User teacher = teacherOpt.get();

            // Klasa 1A seeding removed per request; keeping only Klasa Demo below.

                // 6) Create a NEW demo class with two lessons and two tasks + testcases and student submissions
                try {
                    String demo2ClassName = "Klasa Demo";
                    // check if teacher already has this class
                    var teacherCls = classService.getUserClasses(teacher.getId());
                    Optional<ClassroomDto> demo2Opt = teacherCls.stream().filter(c -> demo2ClassName.equalsIgnoreCase(c.name())).findFirst();
                    ClassroomDto demo2;
                    if (demo2Opt.isPresent()) {
                        demo2 = demo2Opt.get();
                        System.out.println("DevDataSeeder: demo class already exists: " + demo2.name() + " (id=" + demo2.id() + ")");
                    } else {
                        demo2 = classService.createClass(demo2ClassName, teacher.getId());
                        System.out.println("DevDataSeeder: created demo class: " + demo2.name() + " (id=" + demo2.id() + ") joinCode=" + demo2.joinCode());
                    }

                    // ensure student is member
                    if (studentOpt.isPresent()) {
                        var student = studentOpt.get();
                        try { classService.joinClass(demo2.joinCode(), student.getId()); } catch (Exception ignore) {}
                    }

                    // Lessons and tasks definitions
                    var lessonsWanted = List.of(
                        new LessonWithActivitiesCreateRequest("Lekcja A: Suma demo 1", "Demo zadanie 1", List.of(
                            new LessonWithActivitiesCreateRequest.ActivityCreateRequest("TASK", "Suma demo 1", null,
                                new LessonWithActivitiesCreateRequest.TaskCreateRequest(
                                    "Suma demo 1",
                                    "Zadanie: suma dwóch liczb",
                                    6,
                                    "function solve(input){ const nums = (String(input||'').match(/-?\\d+/g)||[]).map(Number); return String(nums.reduce((a,b)=>a+b,0)); }",
                                    ""
                                )
                            )
                        )),
                        new LessonWithActivitiesCreateRequest("Lekcja B: Suma demo 2", "Demo zadanie 2", List.of(
                            new LessonWithActivitiesCreateRequest.ActivityCreateRequest("TASK", "Suma demo 2", null,
                                new LessonWithActivitiesCreateRequest.TaskCreateRequest(
                                    "Suma demo 2",
                                    "Zadanie: suma dwóch liczb (druga wariacja)",
                                    6,
                                    "function solve(input){ const nums = (String(input||'').match(/-?\\d+/g)||[]).map(Number); return String(nums[0]||0); }",
                                    ""
                                )
                            )
                        ))
                    );

                    for (var lr : lessonsWanted) {
                        // create lesson if missing
                        var lessonsInDemo2 = lessonService.getLessonsInClass(demo2.id());
                        boolean exists = lessonsInDemo2.stream().anyMatch(l -> l.title().equalsIgnoreCase(lr.title()));
                        if (!exists) {
                            lessonService.createLessonWithActivities(demo2.id(), lr, teacher.getId());
                            System.out.println("DevDataSeeder: created lesson '" + lr.title() + "' in " + demo2.name());
                        }
                    }

                    // For each task in the class, ensure testcases and create student submissions (one partial each)
                    if (studentOpt.isPresent()) {
                        var student = studentOpt.get();
                        var tasksInClass = taskRepo.findAllByLesson_Classroom_IdOrderByCreatedAtAsc(demo2.id());
                        for (Task t : tasksInClass) {
                            // testcases for first task title contains 'demo 1', second 'demo 2'
                            if (t.getTitle() == null) continue;
                            if (t.getTitle().toLowerCase().contains("demo 1")) {
                                // ensure test cases: same as earlier 3-case set
                                var existingCases = caseRepo.findByTaskIdOrderByOrderAsc(t.getId());
                                java.util.Map<String,String> existingCaseMap = new java.util.HashMap<>();
                                for (var c : existingCases) existingCaseMap.put((c.getInput()==null?"":c.getInput()) + "|" + (c.getExpected()==null?"":c.getExpected()), "1");
                                com.prolearn.task.ProgrammingTestCase tc1 = new com.prolearn.task.ProgrammingTestCase(); tc1.setTask(t); tc1.setInput("2 3"); tc1.setExpected("5"); tc1.setPoints(2); tc1.setOrder(0);
                                com.prolearn.task.ProgrammingTestCase tc2 = new com.prolearn.task.ProgrammingTestCase(); tc2.setTask(t); tc2.setInput("10 -4"); tc2.setExpected("6"); tc2.setPoints(3); tc2.setOrder(1);
                                com.prolearn.task.ProgrammingTestCase tc3 = new com.prolearn.task.ProgrammingTestCase(); tc3.setTask(t); tc3.setInput("0 0"); tc3.setExpected("0"); tc3.setPoints(1); tc3.setOrder(2);
                                if (!existingCaseMap.containsKey(tc1.getInput()+"|"+tc1.getExpected())) caseRepo.save(tc1);
                                if (!existingCaseMap.containsKey(tc2.getInput()+"|"+tc2.getExpected())) caseRepo.save(tc2);
                                if (!existingCaseMap.containsKey(tc3.getInput()+"|"+tc3.getExpected())) caseRepo.save(tc3);

                                // create a partial (incorrect) submission: a - b (should pass only last test)
                                boolean hasPartial = submissionRepo.findByTaskIdAndStudent_IdOrderByCreatedAtAsc(t.getId(), student.getId()).stream()
                                        .anyMatch(ss -> ss.getCode() != null && ss.getCode().contains("- Number(p[1])"));
                                if (!hasPartial) {
                                    String partial = "function solve(input){ var p = String(input).trim().split(/\\s+|,|\\;/); return Number(p[0]) - Number(p[1]); }";
                                    var cases = caseRepo.findByTaskIdOrderByOrderAsc(t.getId());
                                    var grade = jsAutoGrader.gradeWithCases(partial, cases);
                                    Submission s = new Submission();
                                    s.setTask(t);
                                    s.setStudent(student);
                                    s.setContent("Przykładowe oddanie: częściowo błędne (demo)");
                                    s.setCode(partial);
                                    s.setStatus(SubmissionStatus.GRADED);
                                    s.setAutoScore(grade.score);
                                    s.setPoints(grade.score);
                                    s.setTestReport(grade.stdout);
                                    s.setAttemptNumber(1);
                                    s.setCreatedAt(Instant.now());
                                    submissionRepo.save(s);
                                    System.out.println("DevDataSeeder: created partial submission for task '" + t.getTitle() + "' (points=" + grade.score + ")");
                                }
                            } else if (t.getTitle().toLowerCase().contains("demo 2")) {
                                // ensure test cases for demo 2
                                var existingCases = caseRepo.findByTaskIdOrderByOrderAsc(t.getId());
                                java.util.Map<String,String> existingCaseMap = new java.util.HashMap<>();
                                for (var c : existingCases) existingCaseMap.put((c.getInput()==null?"":c.getInput()) + "|" + (c.getExpected()==null?"":c.getExpected()), "1");
                                com.prolearn.task.ProgrammingTestCase tc1 = new com.prolearn.task.ProgrammingTestCase(); tc1.setTask(t); tc1.setInput("1 1"); tc1.setExpected("2"); tc1.setPoints(2); tc1.setOrder(0);
                                com.prolearn.task.ProgrammingTestCase tc2 = new com.prolearn.task.ProgrammingTestCase(); tc2.setTask(t); tc2.setInput("2 2"); tc2.setExpected("4"); tc2.setPoints(2); tc2.setOrder(1);
                                com.prolearn.task.ProgrammingTestCase tc3 = new com.prolearn.task.ProgrammingTestCase(); tc3.setTask(t); tc3.setInput("3 0"); tc3.setExpected("3"); tc3.setPoints(2); tc3.setOrder(2);
                                if (!existingCaseMap.containsKey(tc1.getInput()+"|"+tc1.getExpected())) caseRepo.save(tc1);
                                if (!existingCaseMap.containsKey(tc2.getInput()+"|"+tc2.getExpected())) caseRepo.save(tc2);
                                if (!existingCaseMap.containsKey(tc3.getInput()+"|"+tc3.getExpected())) caseRepo.save(tc3);

                                // create a partial submission: return first number only (should pass only last test where second operand is 0)
                                boolean hasPartial = submissionRepo.findByTaskIdAndStudent_IdOrderByCreatedAtAsc(t.getId(), student.getId()).stream()
                                        .anyMatch(ss -> ss.getCode() != null && ss.getCode().contains("return Number(p[0])"));
                                if (!hasPartial) {
                                    String partial = "function solve(input){ var p = String(input).trim().split(/\\s+|,|\\;/); return Number(p[0]); }";
                                    var cases = caseRepo.findByTaskIdOrderByOrderAsc(t.getId());
                                    var grade = jsAutoGrader.gradeWithCases(partial, cases);
                                    Submission s = new Submission();
                                    s.setTask(t);
                                    s.setStudent(student);
                                    s.setContent("Przykładowe oddanie: częściowo błędne (demo 2)");
                                    s.setCode(partial);
                                    s.setStatus(SubmissionStatus.GRADED);
                                    s.setAutoScore(grade.score);
                                    s.setPoints(grade.score);
                                    s.setTestReport(grade.stdout);
                                    s.setAttemptNumber(1);
                                    s.setCreatedAt(Instant.now());
                                    submissionRepo.save(s);
                                    System.out.println("DevDataSeeder: created partial submission for task '" + t.getTitle() + "' (points=" + grade.score + ")");
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("DevDataSeeder: failed to create demo2 data: " + e.getMessage());
                }

                    System.out.println("DevDataSeeder: demo data ready. Login as teacher@test.local (Test123!) then open Teacher -> Klasy -> Klasa Demo -> Zgłoszenia to see sample submissions.");


        } catch (Exception e) {
            System.err.println("DevDataSeeder failed: " + e.getMessage());
        }
    }
}
