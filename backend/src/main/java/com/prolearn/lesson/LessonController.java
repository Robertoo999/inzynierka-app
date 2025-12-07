package com.prolearn.lesson;

import com.prolearn.lesson.dto.LessonDetailResponse;
import com.prolearn.lesson.dto.LessonListItem;
import jakarta.annotation.security.PermitAll;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/lessons", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;

    @PermitAll
    @GetMapping
    public List<LessonListItem> list() {
        return lessonService.getAllLessons();
    }

    @PermitAll
    @GetMapping("/{id}")
    public LessonDetailResponse get(@PathVariable("id") UUID id) {
        return lessonService.getLessonDetails(id);
    }

    @jakarta.annotation.security.RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @GetMapping("/{id}/summary")
    public com.prolearn.lesson.dto.LessonSummaryDto summary(@PathVariable("id") UUID id) {
        return lessonService.getLessonSummary(id);
    }
}
