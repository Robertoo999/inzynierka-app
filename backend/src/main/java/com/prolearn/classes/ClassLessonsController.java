package com.prolearn.classes;

import com.prolearn.lesson.LessonService;
import com.prolearn.lesson.dto.LessonCreateRequest;
import com.prolearn.lesson.dto.LessonListItem;
import com.prolearn.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/classes/{classId}/lessons", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ClassLessonsController {

    private final LessonService lessonService;
    private final ClassService classService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<LessonListItem> list(@PathVariable("classId") Long classId) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        classService.requireMembership(classId, userId);
        return lessonService.getLessonsInClass(classId);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('TEACHER')")
    public LessonListItem create(
            @PathVariable("classId") Long classId,
            @Valid @RequestBody LessonCreateRequest req
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        return lessonService.createLessonInClass(classId, req, userId);
    }

    @PostMapping(value = "/with-activities", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('TEACHER')")
    public LessonListItem createWithActivities(
            @PathVariable("classId") Long classId,
            @Valid @RequestBody com.prolearn.lesson.dto.LessonWithActivitiesCreateRequest req
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        return lessonService.createLessonWithActivities(classId, req, userId);
    }

    public record LessonUpdateRequest(String title, String content) {}

    @PutMapping(value="/{lessonId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('TEACHER')")
    public LessonListItem update(
            @PathVariable("classId") Long classId,
            @PathVariable("lessonId") UUID lessonId,
            @RequestBody LessonUpdateRequest req
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        return lessonService.updateLesson(classId, lessonId, req.title(), req.content(), userId);
    }

    @DeleteMapping("/{lessonId}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(
            @PathVariable("classId") Long classId,
            @PathVariable("lessonId") UUID lessonId
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        lessonService.deleteLesson(classId, lessonId, userId);
    }
}
