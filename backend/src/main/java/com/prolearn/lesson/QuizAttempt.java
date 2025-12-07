package com.prolearn.lesson;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false)
    private LessonActivity activity;

    @Column(name = "student_id", columnDefinition = "uuid", nullable = false)
    private UUID studentId;

    @Column(nullable = false)
    private int correct;

    @Column(nullable = false)
    private int total;

    @Column(nullable = false)
    private int points;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    // getters/setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LessonActivity getActivity() { return activity; }
    public void setActivity(LessonActivity activity) { this.activity = activity; }

    public UUID getStudentId() { return studentId; }
    public void setStudentId(UUID studentId) { this.studentId = studentId; }

    public int getCorrect() { return correct; }
    public void setCorrect(int correct) { this.correct = correct; }

    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }

    public int getPoints() { return points; }
    public void setPoints(int points) { this.points = points; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
