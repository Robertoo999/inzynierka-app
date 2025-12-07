package com.prolearn.submission.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record GradeRequest(
        @Min(0) Integer manualScore,
        @Size(max = 10000) String teacherComment
) {}
