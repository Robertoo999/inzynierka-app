package com.prolearn.task.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateQuizRequest(
        @NotNull(message = "Identyfikator lekcji jest wymagany")
        UUID lessonId,
        
        @NotBlank(message = "Tytuł jest wymagany")
        @Size(min = 3, max = 200, message = "Tytuł musi mieć od 3 do 200 znaków")
        String title,
        
        @Size(max = 5000, message = "Opis nie może przekroczyć 5000 znaków")
        String description,
        
        @NotNull(message = "Maksymalna liczba punktów jest wymagana")
        Integer maxPoints,
        
        @NotEmpty(message = "Co najmniej jedno pytanie jest wymagane")
        @Size(min = 1, max = 50, message = "Quiz musi mieć od 1 do 50 pytań")
        List<@Valid QuizQuestionDto> questions
) {}

