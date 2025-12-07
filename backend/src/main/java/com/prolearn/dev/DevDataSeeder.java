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

    public DevDataSeeder(UserRepository userRepo, ClassService classService, LessonService lessonService) {
        this.userRepo = userRepo;
        this.classService = classService;
        this.lessonService = lessonService;
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

            // Check if a demo class already exists (by name)
            String demoClassName = "ProLearn Demo";
            boolean exists = classService.getUserClasses(teacher.getId()).stream().anyMatch(c -> demoClassName.equalsIgnoreCase(c.name()));
            if (exists) {
                System.out.println("DevDataSeeder: demo class already exists, skipping creation");
            } else {
                // create class as teacher
                ClassroomDto created = classService.createClass(demoClassName, teacher.getId());
                System.out.println("DevDataSeeder: created demo class: " + created.name() + " (id=" + created.id() + ") joinCode=" + created.joinCode());

                // if student exists, join by code
                if (studentOpt.isPresent()) {
                    try {
                        classService.joinClass(created.joinCode(), studentOpt.get().getId());
                        System.out.println("DevDataSeeder: student joined demo class");
                    } catch (Exception e) {
                        System.err.println("DevDataSeeder: failed to join student to demo class: " + e.getMessage());
                    }
                }

        // create a sample lesson with one content and one task
        try {
            var activity1 = new LessonWithActivitiesCreateRequest.ActivityCreateRequest(
                "CONTENT",
                "Wprowadzenie",
                "{\"blocks\": [{\"type\": \"markdown\", \"md\": \"Witaj w lekcji demo!\"}]}",
                null
            );

            var taskReq = new LessonWithActivitiesCreateRequest.TaskCreateRequest(
                "Przykładowe zadanie",
                "Proste zadanie demonstracyjne",
                10,
                "function solve(){ return 42 }",
                ""
            );

            var activity2 = new LessonWithActivitiesCreateRequest.ActivityCreateRequest(
                "TASK",
                "Ćwiczenie: rozwiązanie",
                null,
                taskReq
            );

            var lessonReq = new LessonWithActivitiesCreateRequest(
                "Lekcja demo",
                "Krótki opis lekcji demo",
                List.of(activity1, activity2)
            );

            lessonService.createLessonWithActivities(created.id(), lessonReq, teacher.getId());
            System.out.println("DevDataSeeder: created sample lesson in demo class");

            // If class has few lessons, add two more varied sample lessons
            var existing = lessonService.getLessonsInClass(created.id());
            if (existing.size() < 3) {
            // content-only lesson
            var a1 = new LessonWithActivitiesCreateRequest.ActivityCreateRequest(
                "CONTENT",
                "Szybkie wprowadzenie",
                "{\"blocks\": [{\"type\": \"markdown\", \"md\": \"Kilka słów wprowadzających.\"}]}",
                null
            );
            var l1 = new LessonWithActivitiesCreateRequest("Szybka lekcja", "Opis szybkiej lekcji", List.of(a1));
            lessonService.createLessonWithActivities(created.id(), l1, teacher.getId());

            // lesson with a quiz activity
            var quizBody = "{\\\"questions\\\": [{\\\"text\\\": \\\"2+2=?\\\", \\\"choices\\\": [{\\\"text\\\": \\\"3\\\"}, {\\\"text\\\": \\\"4\\\", \\\"correct\\\": true}] }]}";
            var qAct = new LessonWithActivitiesCreateRequest.ActivityCreateRequest("QUIZ", "Krótki quiz", quizBody, null);
            var l2 = new LessonWithActivitiesCreateRequest("Quiz demo", "Krótki quiz demonstracyjny", List.of(qAct));
            lessonService.createLessonWithActivities(created.id(), l2, teacher.getId());

            System.out.println("DevDataSeeder: added two extra demo lessons") ;
            }
        } catch (Exception e) {
            System.err.println("DevDataSeeder: failed to create sample lesson: " + e.getMessage());
        }
            }

        } catch (Exception e) {
            System.err.println("DevDataSeeder failed: " + e.getMessage());
        }
    }
}
