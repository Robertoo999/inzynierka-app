package com.prolearn.task.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuizDto(
        UUID id,
        UUID lessonId,
        String title,
        String description,
        Integer maxPoints,
        Instant createdAt,
        String type,
        List<QuizQuestionDto> questions
) {}

