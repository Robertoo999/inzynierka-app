package com.prolearn.lesson.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record LessonWithActivitiesCreateRequest(
        @NotBlank @Size(min = 3, max = 200) String title,
        @Size(max = 10000) String content,
        @Valid List<ActivityCreateRequest> activities
) {
    public static record ActivityCreateRequest(
            @NotBlank String type,
            @Size(max = 200) String title,
            @Size(max = 20000) String body,
            TaskCreateRequest task
    ) {}

    public static record TaskCreateRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 20000) String description,
            int maxPoints,
            @Size(max = 20000) String starterCode,
            @Size(max = 20000) String tests
    ) {}
}
