package com.prolearn.task;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "quiz_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizQuestion {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(nullable = false, length = 1000)
    private String question;

    @Column(name = "option_a", nullable = false, length = 500)
    private String optionA;

    @Column(name = "option_b", nullable = false, length = 500)
    private String optionB;

    @Column(name = "option_c", length = 500)
    private String optionC;

    @Column(name = "option_d", length = 500)
    private String optionD;

    @Column(name = "option_e", length = 500)
    private String optionE;

    @Column(name = "option_f", length = 500)
    private String optionF;

    @Column(name = "correct_answer", nullable = false, length = 1)
    private String correctAnswer; // 'A', 'B', 'C', 'D', 'E', 'F'

    @Column(name = "explanation", length = 2000)
    private String explanation; // Wyjaśnienie po odpowiedzi

    @Column(name = "points", nullable = false)
    @Builder.Default
    private Integer points = 1; // Punkty za poprawną odpowiedź

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0; // Kolejność pytań

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (points == null) {
            points = 1;
        }
        if (orderIndex == null) {
            orderIndex = 0;
        }
    }
}

