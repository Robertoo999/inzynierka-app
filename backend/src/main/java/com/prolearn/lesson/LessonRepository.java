package com.prolearn.lesson;

import org.springframework.data.jpa.repository.JpaRepository;

// src/main/java/com/prolearn/lesson/LessonRepository.java
import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findAllByClassroom_IdOrderByCreatedAtAsc(Long classId);
}
