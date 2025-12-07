package com.prolearn.lesson.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Request DTO for creating an activity that also creates an inline task in one call.
 * This is used to simplify frontend flow: instead of creating Task then Activity
 * the backend creates both in one transaction.
 */
public record ActivityWithTaskCreateRequest(
        @NotBlank String type,
        @NotBlank @Size(min = 1, max = 200, message = "Tytuł musi mieć od 1 do 200 znaków") String title,
        Integer orderIndex,
        @Size(max = 50000, message = "Treść nie może przekraczać 50000 znaków") String body,
        TaskInline task
) {
    public static record TaskInline(
            @NotBlank @Size(min = 1, max = 200, message = "Tytuł musi mieć od 1 do 200 znaków") String title,
            @Size(max = 5000, message = "Opis nie może przekraczać 5000 znaków") String description,
            @Min(value = 1, message = "Maks. punkty muszą być >= 1") @Max(value = 100, message = "Maks. punkty nie mogą przekraczać 100") Integer maxPoints,
            @Size(max = 50, message = "Typ nie może przekraczać 50 znaków") String type,
            @Size(max = 50, message = "Język nie może przekraczać 50 znaków") String language,
            @Size(max = 50000, message = "Kod startowy nie może przekraczać 50000 znaków") String starterCode,
            @Size(max = 50000, message = "Testy nie mogą przekraczać 50000 znaków") String tests,
            @Size(max = 50, message = "Tryb oceniania nie może przekraczać 50 znaków") String gradingMode
    ) {}
}
