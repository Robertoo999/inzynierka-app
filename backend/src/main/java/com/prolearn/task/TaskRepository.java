package com.prolearn.task;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByLesson_IdOrderByCreatedAtAsc(UUID lessonId);
    // find tasks for all lessons that belong to a classroom (single query)
    List<Task> findAllByLesson_Classroom_IdOrderByCreatedAtAsc(Long classId);
}
