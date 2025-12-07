package com.prolearn.task;

import com.prolearn.submission.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuizAnswerRepository extends JpaRepository<QuizAnswer, UUID> {
    List<QuizAnswer> findBySubmission_Id(UUID submissionId);
    List<QuizAnswer> findBySubmission(Submission submission);
}

