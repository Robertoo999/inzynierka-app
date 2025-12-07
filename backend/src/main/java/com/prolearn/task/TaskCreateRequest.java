package com.prolearn.task;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaskCreateRequest(
        @NotBlank @Size(min = 3, max = 200) String title,
        @Size(max = 5000) String description,
        @Min(1) @Max(100) int maxPoints
) {}
