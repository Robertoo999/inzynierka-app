package com.prolearn.task;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record TaskUpdateRequest(
        @Size(min = 1, max = 200, message = "Tytuł musi mieć od 1 do 200 znaków") String title,
        @Size(max = 5000, message = "Opis nie może przekraczać 5000 znaków") String description,
        @Min(value = 1, message = "Maks. punkty muszą być >= 1") @Max(value = 100, message = "Maks. punkty nie mogą przekraczać 100") Integer maxPoints,
        @Size(max = 50000, message = "Kod startowy nie może przekraczać 50000 znaków") String starterCode,
        @Size(max = 50000, message = "Testy nie mogą przekraczać 50000 znaków") String tests
) {}
