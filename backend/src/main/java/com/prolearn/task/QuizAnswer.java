package com.prolearn.task;

import com.prolearn.submission.Submission;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_answers",
        uniqueConstraints = @UniqueConstraint(name = "ux_quiz_answers_submission_question",
                columnNames = {"submission_id", "question_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAnswer {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private QuizQuestion question;

    @Column(name = "selected_answer", nullable = false, length = 1)
    private String selectedAnswer; // 'A', 'B', 'C', 'D', 'E', 'F'

    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect;

    @Column(name = "points_earned", nullable = false)
    @Builder.Default
    private Integer pointsEarned = 0;

    @Column(name = "answered_at", nullable = false)
    @Builder.Default
    private Instant answeredAt = Instant.now();

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (answeredAt == null) {
            answeredAt = Instant.now();
        }
        if (pointsEarned == null) {
            pointsEarned = 0;
        }
    }
}

