package com.prolearn.lesson.dto;

import java.time.Instant;
import java.util.UUID;

public record LessonActivityDto(
        UUID id,
        String type,
        String title,
        Integer orderIndex,
        String body,       // JSON string dla CONTENT
        UUID taskId,       // dla TASK
        Instant createdAt
) {}
