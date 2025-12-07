package com.prolearn.submission;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    @Query("""
     select s
     from Submission s
     join fetch s.task t       
     where s.id = :id
  """)
    Optional<Submission> findByIdWithTask(@Param("id") UUID id);
    Optional<Submission> findTopByTaskIdAndStudent_IdOrderByCreatedAtDesc(UUID taskId, UUID studentId);
    List<Submission> findByTaskIdAndStudent_IdOrderByCreatedAtAsc(UUID taskId, UUID studentId);
    List<Submission> findByTaskIdOrderByCreatedAtAsc(UUID taskId);
    List<Submission> findByTaskIdOrderByCreatedAtDesc(UUID taskId);
    List<Submission> findByStudentIdOrderByCreatedAtDesc(UUID studentId);
    List<Submission> findByTaskIdIn(List<UUID> taskIds);
    void deleteByTaskId(UUID taskId);
    void deleteByTaskIdAndStudent_Id(UUID taskId, UUID studentId);
    long countByTaskIdAndStudent_IdAndStatusIn(UUID taskId, UUID studentId, Collection<SubmissionStatus> statuses);

    @EntityGraph(attributePaths = {"task", "task.lesson", "task.lesson.classroom", "student"})
    List<Submission> findByTask_Lesson_Classroom_IdOrderByCreatedAtDesc(Long classId);

}
