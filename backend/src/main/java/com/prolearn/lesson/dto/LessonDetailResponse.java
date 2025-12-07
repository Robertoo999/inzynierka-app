package com.prolearn.lesson.dto;

import com.prolearn.task.TaskResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LessonDetailResponse(
        UUID id,
        String title,
        String content,
        Instant createdAt,
        List<TaskResponse> tasks,            // stary widok (kompatybilność)
        List<LessonActivityDto> activities   // NOWE: lista aktywności
) {}
