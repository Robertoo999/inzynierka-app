package com.prolearn.classes;

import com.prolearn.user.Role;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ClassMembersControllerTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepo;
    @Autowired ClassService classService;

    UUID teacherId;
    UUID studentId;
    Long classId;
    String joinCode;

    @BeforeEach
    void setup() {
        // create fresh users (unique emails to avoid constraint clashes)
        String teacherEmail = "teacher_" + UUID.randomUUID() + "@test.local";
        String studentEmail = "student_" + UUID.randomUUID() + "@test.local";

        User teacher = new User();
        teacher.setEmail(teacherEmail);
        teacher.setPasswordHash("x");
        teacher.setRole(Role.TEACHER);
        teacher = userRepo.save(teacher);
        teacherId = teacher.getId();

        User student = new User();
        student.setEmail(studentEmail);
        student.setPasswordHash("x");
        student.setRole(Role.STUDENT);
        student = userRepo.save(student);
        studentId = student.getId();

        var dto = classService.createClass("Klasa Testowa", teacherId);
        classId = dto.id();
        joinCode = dto.joinCode();
        // join student
        classService.joinClass(joinCode, studentId);
    }

    private void authenticate(String email, String role) {
        var auth = new UsernamePasswordAuthenticationToken(email, "", List.of(new SimpleGrantedAuthority(role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void teacherCanListMembers() throws Exception {
        authenticate(userRepo.findById(teacherId).orElseThrow().getEmail(), "TEACHER");
        var mvcResult = mvc.perform(get("/api/classes/" + classId + "/members"))
                .andExpect(status().isOk())
                .andReturn();
        String json = mvcResult.getResponse().getContentAsString();
        assertThat(json).contains("teacher").contains("student_");
    }

    @Test
    void studentCanListMembersButGetsForbiddenOnProgress() throws Exception {
        authenticate(userRepo.findById(studentId).orElseThrow().getEmail(), "STUDENT");
        mvc.perform(get("/api/classes/" + classId + "/members"))
                .andExpect(status().isOk());
        // progress endpoint requires teacher
        mvc.perform(get("/api/classes/" + classId + "/progress"))
                .andExpect(status().isForbidden());
    }

    @Test
    void teacherCanAccessProgressOverview() throws Exception {
        authenticate(userRepo.findById(teacherId).orElseThrow().getEmail(), "TEACHER");
        mvc.perform(get("/api/classes/" + classId + "/progress"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/classes/" + classId + "/progress/overview"))
                .andExpect(status().isOk());
    }
}
