package com.prolearn.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {
	java.util.List<QuizAttempt> findAllByActivity_IdOrderByCreatedAtDesc(java.util.UUID activityId);
	java.util.List<QuizAttempt> findAllByActivity_IdAndStudentIdOrderByCreatedAtDesc(java.util.UUID activityId, java.util.UUID studentId);
	boolean existsByActivity_IdAndStudentId(java.util.UUID activityId, java.util.UUID studentId);
	void deleteByActivity_Id(java.util.UUID activityId);
}
