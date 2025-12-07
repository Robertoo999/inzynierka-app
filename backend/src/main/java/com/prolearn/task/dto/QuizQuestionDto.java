package com.prolearn.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record QuizQuestionDto(
        UUID id,
        @NotBlank(message = "Treść pytania jest wymagana")
        @Size(max = 1000, message = "Treść pytania nie może przekroczyć 1000 znaków")
        String question,
        
        @NotBlank(message = "Opcja A jest wymagana")
        @Size(max = 500, message = "Opcja nie może przekroczyć 500 znaków")
        String optionA,
        
        @NotBlank(message = "Opcja B jest wymagana")
        @Size(max = 500, message = "Opcja nie może przekroczyć 500 znaków")
        String optionB,
        
        @Size(max = 500, message = "Opcja nie może przekroczyć 500 znaków")
        String optionC,
        
        @Size(max = 500, message = "Opcja nie może przekroczyć 500 znaków")
        String optionD,
        
        @Size(max = 500, message = "Opcja nie może przekroczyć 500 znaków")
        String optionE,
        
        @Size(max = 500, message = "Opcja nie może przekroczyć 500 znaków")
        String optionF,
        
        @NotBlank(message = "Poprawna odpowiedź jest wymagana")
        @Pattern(regexp = "^[A-F]$", message = "Poprawna odpowiedź musi być jedną z liter A-F")
        String correctAnswer,
        
        @Size(max = 2000, message = "Wyjaśnienie nie może przekroczyć 2000 znaków")
        String explanation,
        
        @NotNull(message = "Liczba punktów jest wymagana")
        Integer points,
        
        Integer orderIndex
) {}

