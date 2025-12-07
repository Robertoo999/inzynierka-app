package com.prolearn.task;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, UUID> {
    List<QuizQuestion> findByTask_IdOrderByOrderIndexAsc(UUID taskId);
    void deleteByTask_Id(UUID taskId);
}

