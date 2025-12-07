package com.prolearn.lesson;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LessonActivityRepository extends JpaRepository<LessonActivity, UUID> {
    List<LessonActivity> findAllByLesson_IdOrderByOrderIndexAsc(UUID lessonId);
    void deleteByTask_Id(UUID taskId);
}
