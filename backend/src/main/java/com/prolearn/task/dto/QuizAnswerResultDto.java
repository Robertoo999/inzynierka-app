package com.prolearn.task.dto;

import java.util.UUID;

public record QuizAnswerResultDto(
        UUID questionId,
        String selectedAnswer,
        String correctAnswer,
        Boolean isCorrect,
        Integer pointsEarned,
        String explanation
) {}

