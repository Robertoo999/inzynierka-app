package com.prolearn.submission.dto;

import java.util.UUID;

public record ClassSubmissionResponse(
        SubmissionResponse submission,
        UUID lessonId,
        String lessonTitle,
        String taskTitle,
        String studentEmail,
        String studentFirstName,
        String studentLastName
) {}
