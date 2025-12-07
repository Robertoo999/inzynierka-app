package com.prolearn.task;

import com.prolearn.lesson.Lesson;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "max_points", nullable = false)
    private int maxPoints;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "max_attempts", nullable = false)
    private Integer maxAttempts = 1; // single submission attempt by default

    @Column(name = "allow_run_before_submit", nullable = false)
    private Boolean allowRunBeforeSubmit = true;

    @Column(name = "lock_after_submit", nullable = false)
    private Boolean lockAfterSubmit = true;

    // ---- pola pod konsolę/ocenianie ----
    @Column(nullable = false)
    private String type = "CODE";

    @Column(nullable = false)
    private String language = "javascript";

    @Column(columnDefinition = "text")
    private String starterCode;

    @Column(columnDefinition = "text")
    private String tests;

    // Hidden teacher solution used only for demo test runs (never exposed to students)
    @Column(name = "teacher_solution", columnDefinition = "text")
    private String teacherSolution;

    @Column(nullable = false)
    private String gradingMode = "AUTO";

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        normalizeAttemptSettings();
    }

    @PreUpdate
    public void preUpdate() {
        normalizeAttemptSettings();
    }

    private void normalizeAttemptSettings() {
        // ensure at least one submission attempt by default
        if (maxAttempts == null || maxAttempts < 1) maxAttempts = 1;
        if (allowRunBeforeSubmit == null) allowRunBeforeSubmit = Boolean.TRUE;
        if (lockAfterSubmit == null) lockAfterSubmit = Boolean.TRUE;
    }

    // --- getters/setters ---
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Lesson getLesson() { return lesson; }
    public void setLesson(Lesson lesson) { this.lesson = lesson; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getMaxPoints() { return maxPoints; }
    public void setMaxPoints(int maxPoints) { this.maxPoints = maxPoints; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) {
        // clamp to minimum 1
        this.maxAttempts = (maxAttempts == null || maxAttempts < 1) ? 1 : maxAttempts;
    }

    public Boolean getAllowRunBeforeSubmit() { return allowRunBeforeSubmit; }
    public void setAllowRunBeforeSubmit(Boolean allowRunBeforeSubmit) { this.allowRunBeforeSubmit = allowRunBeforeSubmit; }

    public Boolean getLockAfterSubmit() { return lockAfterSubmit; }
    public void setLockAfterSubmit(Boolean lockAfterSubmit) { this.lockAfterSubmit = lockAfterSubmit; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getStarterCode() { return starterCode; }
    public void setStarterCode(String starterCode) { this.starterCode = starterCode; }

    public String getTests() { return tests; }
    public void setTests(String tests) { this.tests = tests; }

    public String getGradingMode() { return gradingMode; }
    public void setGradingMode(String gradingMode) { this.gradingMode = gradingMode; }

    public String getTeacherSolution() { return teacherSolution; }
    public void setTeacherSolution(String teacherSolution) { this.teacherSolution = teacherSolution; }
}
