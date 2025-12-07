package com.prolearn.task.dto;

import java.time.Instant;
import java.util.UUID;

public class TaskDto {
    public UUID id;
    public UUID lessonId;
    public String title;
    public String description;
    public Integer maxPoints;
    public Integer maxAttempts;
    public Boolean allowRunBeforeSubmit;
    public Boolean lockAfterSubmit;
    public Instant createdAt;
    public String type;
    public String language;
    public String starterCode;
    public String tests;
    public String gradingMode;
    // teacher-only hidden solution (never sent to students via public endpoints)
    public String teacherSolution;
}
