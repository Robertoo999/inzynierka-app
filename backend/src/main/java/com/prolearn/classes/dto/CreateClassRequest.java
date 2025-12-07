package com.prolearn.classes.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateClassRequest(
        @NotBlank String name
) {}
