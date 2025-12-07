package com.prolearn.task;

import java.time.Instant;
import java.util.UUID;

/**
 * Publiczna reprezentacja zadania dla ucznia (bez testów i trybu oceniania).
 */
public record TaskPublicResponse(
        UUID id,
        UUID lessonId,
        String title,
        String description,
        int maxPoints,
        Instant createdAt,
        String type,
        String language,
        String starterCode,
        Integer maxAttempts,
        Boolean allowRunBeforeSubmit,
        Boolean lockAfterSubmit
) {}
