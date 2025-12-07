package com.prolearn.submission.dto;

import com.prolearn.submission.SubmissionStatus;

import java.time.Instant;
import java.util.UUID;

public record SubmissionResponse(
        UUID id,
        UUID taskId,
        UUID studentId,
        String content,
        SubmissionStatus status,
        Integer points,
        String feedback,
        Instant gradedAt,
        UUID gradedBy,
        Instant createdAt,
        String code,
        Integer autoScore,
        String stdout,
        String testReport,
        Integer attemptNumber,
        Integer manualScore,
        String teacherComment,
        Integer maxAttempts,
        Integer maxPoints,
        Integer effectiveScore
) {}
