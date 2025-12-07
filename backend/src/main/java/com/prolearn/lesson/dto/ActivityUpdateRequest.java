package com.prolearn.lesson.dto;

import jakarta.validation.constraints.Size;

public record ActivityUpdateRequest(
        @Size(min = 1, max = 200, message = "Tytuł musi mieć od 1 do 200 znaków")
        String title,
        Integer orderIndex,
        @Size(max = 50000, message = "Treść nie może przekraczać 50000 znaków")
        String body
) {}
