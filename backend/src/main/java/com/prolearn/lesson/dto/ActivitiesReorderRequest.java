package com.prolearn.lesson.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ActivitiesReorderRequest(
        @NotNull List<UUID> ids
) {}
