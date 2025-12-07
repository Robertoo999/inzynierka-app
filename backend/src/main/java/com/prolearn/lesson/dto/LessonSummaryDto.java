package com.prolearn.lesson.dto;

import java.util.List;
import java.util.UUID;

public class LessonSummaryDto {
    private UUID lessonId;
    private Integer totalTasks;
    private Integer totalMaxPoints;
    private List<StudentLessonSummary> students;

    public LessonSummaryDto() {}

    public LessonSummaryDto(UUID lessonId, Integer totalTasks, Integer totalMaxPoints, List<StudentLessonSummary> students) {
        this.lessonId = lessonId;
        this.totalTasks = totalTasks;
        this.totalMaxPoints = totalMaxPoints;
        this.students = students;
    }

    public UUID getLessonId() { return lessonId; }
    public Integer getTotalTasks() { return totalTasks; }
    public Integer getTotalMaxPoints() { return totalMaxPoints; }
    public List<StudentLessonSummary> getStudents() { return students; }

    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public void setTotalTasks(Integer totalTasks) { this.totalTasks = totalTasks; }
    public void setTotalMaxPoints(Integer totalMaxPoints) { this.totalMaxPoints = totalMaxPoints; }
    public void setStudents(List<StudentLessonSummary> students) { this.students = students; }
}
