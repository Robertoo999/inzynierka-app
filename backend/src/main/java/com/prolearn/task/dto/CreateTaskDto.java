package com.prolearn.task.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class CreateTaskDto {
    @NotNull(message = "Identyfikator lekcji jest wymagany")
    public UUID lessonId;
    
    @NotBlank(message = "Tytuł jest wymagany")
    @Size(min = 3, max = 200, message = "Tytuł musi mieć od 3 do 200 znaków")
    public String title;
    
    @Size(max = 5000, message = "Opis nie może przekroczyć 5000 znaków")
    public String description;
    
    @Min(value = 1, message = "Maksymalna liczba punktów musi wynosić co najmniej 1")
    @Max(value = 100, message = "Maksymalna liczba punktów nie może przekroczyć 100")
    public Integer maxPoints;

    @Min(value = 1, message = "Maksymalna liczba prób musi wynosić co najmniej 1")
    public Integer maxAttempts;

    public Boolean allowRunBeforeSubmit;

    public Boolean lockAfterSubmit;
    
    public String type;        // "CODE"
    
    public String language;    // "javascript"
    
    @Size(max = 20000, message = "Kod startowy nie może przekroczyć 20000 znaków")
    public String starterCode;
    
    @Size(max = 20000, message = "Testy nie mogą przekroczyć 20000 znaków")
    public String tests;
    
    public String gradingMode; // "AUTO"

    // Optional hidden teacher solution used for demo test runs (never exposed publicly)
    @Size(max = 50000, message = "Rozwiązanie nauczyciela nie może przekraczać 50000 znaków")
    public String teacherSolution;
}
