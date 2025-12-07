package com.prolearn.task.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuizResultDto(
        UUID submissionId,
        UUID taskId,
        Integer totalPoints,
        Integer maxPoints,
        Integer correctAnswers,
        Integer totalQuestions,
        Instant submittedAt,
        List<QuizAnswerResultDto> answers
) {}

