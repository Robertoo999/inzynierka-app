package com.prolearn.submission.dto;

import jakarta.validation.constraints.Size;

public record SubmissionCreateRequest(
        @Size(max = 10000) String content,
        @Size(max = 20000) String code
) {}
