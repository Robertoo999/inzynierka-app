package com.prolearn.submission;

import com.prolearn.task.Task;
import com.prolearn.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id")
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private User student;

    @Column(columnDefinition = "text")
    private String content;   // link/tekst

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    @Column(columnDefinition = "text")
    private String code;

    @Column(columnDefinition = "text")
    private String testReport;   // przechowujemy JSON jako TEXT

    private Integer autoScore;

    @Column(columnDefinition = "text")
    private String stdout;

    @Column(name = "attempt_number")
    private Integer attemptNumber;

    @Column(name = "manual_score")
    private Integer manualScore;

    @Column(name = "teacher_comment", length = 1024)
    private String teacherComment;

    @Column
    private Integer points;   // null dopóki nieocenione

    @Column(columnDefinition = "text")
    private String feedback;

    @Column(name = "graded_at")
    private Instant gradedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    private User gradedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    // --- getters/setters ---
    public UUID getId() { return id; }

    public Task getTask() { return task; }
    public void setTask(Task task) { this.task = task; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public SubmissionStatus getStatus() { return status; }
    public void setStatus(SubmissionStatus status) { this.status = status; }

    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public Instant getGradedAt() { return gradedAt; }
    public void setGradedAt(Instant gradedAt) { this.gradedAt = gradedAt; }

    public User getGradedBy() { return gradedBy; }
    public void setGradedBy(User gradedBy) { this.gradedBy = gradedBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTestReport() { return testReport; }
    public void setTestReport(String testReport) { this.testReport = testReport; }

    public Integer getAutoScore() { return autoScore; }
    public void setAutoScore(Integer autoScore) { this.autoScore = autoScore; }

    public String getStdout() { return stdout; }
    public void setStdout(String stdout) { this.stdout = stdout; }

    public Integer getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(Integer attemptNumber) { this.attemptNumber = attemptNumber; }

    public Integer getManualScore() { return manualScore; }
    public void setManualScore(Integer manualScore) { this.manualScore = manualScore; }

    public String getTeacherComment() { return teacherComment; }
    public void setTeacherComment(String teacherComment) { this.teacherComment = teacherComment; }
}
