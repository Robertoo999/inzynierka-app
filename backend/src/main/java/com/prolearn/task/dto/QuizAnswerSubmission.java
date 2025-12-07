package com.prolearn.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record QuizAnswerSubmission(
        @NotNull(message = "Id pytania jest wymagane")
        UUID questionId,
        
        @NotBlank(message = "Wybrana odpowiedź jest wymagana")
        @Pattern(regexp = "^[A-F]$", message = "Wybrana odpowiedź musi być jedną z liter A-F")
        String selectedAnswer
) {}

