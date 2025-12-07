package com.prolearn.classes;

import com.prolearn.classes.dto.ClassroomDto;
import com.prolearn.classes.dto.CreateClassRequest;
import com.prolearn.classes.dto.JoinClassRequest;
import com.prolearn.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class ClassController {

    private final ClassService classService;

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public ClassroomDto create(@RequestBody @Valid CreateClassRequest req) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        return classService.createClass(req.name(), userId);
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public List<ClassroomDto> myClasses() {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        return classService.getUserClasses(userId);
    }

    @PostMapping(value = "/join", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ClassroomDto> join(@RequestBody @Valid JoinClassRequest req) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        ClassroomDto result = classService.joinClass(req.code(), userId);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{classId}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<Void> delete(@PathVariable Long classId) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }

        classService.deleteClass(classId, userId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
