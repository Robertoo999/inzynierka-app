package com.prolearn.lesson;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prolearn.lesson.LessonActivityRepository;
import com.prolearn.lesson.LessonRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

@SpringBootTest
@AutoConfigureMockMvc
public class ActivityControllerIntegrationTest {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper mapper;

    @Autowired
    LessonRepository lessonRepository;

    @Autowired
    LessonActivityRepository activityRepository;

    @Autowired
    com.prolearn.user.UserRepository userRepository;

    @Autowired
    com.prolearn.classes.ClassroomRepository classroomRepository;

    @Autowired
    QuizAttemptRepository quizAttemptRepository;

    @Test
    public void submitQuiz_createsAttempt() throws Exception {
        // find or create a user and classroom to satisfy DB constraints
        var user = userRepository.findByEmail("dev@example.com").orElseGet(() -> {
            var u = new com.prolearn.user.User(); u.setEmail("dev@example.com"); u.setPasswordHash(""); u.setRole(com.prolearn.user.Role.TEACHER); return userRepository.save(u);
        });
        var classroom = classroomRepository.findAll().stream().filter(c->c.getOwner()!=null && c.getOwner().getId().equals(user.getId())).findFirst().orElseGet(() -> {
            var c = new com.prolearn.classes.Classroom(); c.setName("DevClass"); c.setJoinCode("DEVCODE"); c.setOwner(user); return classroomRepository.save(c);
        });

        var lesson = new Lesson();
        lesson.setTitle("T");
        lesson.setContent("");
        lesson.setCreatedBy(user);
        lesson.setClassroom(classroom);
        lessonRepository.save(lesson);

        var a = new LessonActivity();
        a.setLesson(lesson);
        a.setType("QUIZ");
        a.setTitle("Q1");
        String body = "{\"maxPoints\":10,\"questions\":[{\"text\":\"Q1\",\"choices\":[{\"text\":\"A\",\"correct\":true},{\"text\":\"B\"}]}]}";
        a.setBody(body);
        activityRepository.save(a);

        // set current user in SecurityContext
    UUID uid = UUID.randomUUID();
    var auth = new UsernamePasswordAuthenticationToken("test", null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_STUDENT")));
    auth.setDetails(uid);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        var payload = mapper.writeValueAsString(java.util.Map.of("answers", java.util.List.of(0)));

    mockMvc.perform(post("/api/activities/" + a.getId() + "/quiz/submit")
        .with(authentication(auth))
        .contentType(MediaType.APPLICATION_JSON)
        .content(payload))
        .andExpect(status().is2xxSuccessful());

        var attempts = quizAttemptRepository.findAllByActivity_IdOrderByCreatedAtDesc(a.getId());
        Assertions.assertFalse(attempts.isEmpty());
        var first = attempts.get(0);
        Assertions.assertEquals(uid, first.getStudentId());
        Assertions.assertEquals(1, first.getCorrect());
    }
}
