package com.prolearn.lesson.dto;

import java.util.UUID;

public class StudentLessonOverviewDto {
    private UUID studentId;
    private UUID lessonId;
    private int tasksCompleted;
    private int totalTasks;
    private int pointsEarned;
    private int maxPoints;

    public StudentLessonOverviewDto() {}

    public StudentLessonOverviewDto(UUID studentId, UUID lessonId, int tasksCompleted, int totalTasks, int pointsEarned, int maxPoints) {
        this.studentId = studentId;
        this.lessonId = lessonId;
        this.tasksCompleted = tasksCompleted;
        this.totalTasks = totalTasks;
        this.pointsEarned = pointsEarned;
        this.maxPoints = maxPoints;
    }

    public UUID getStudentId() { return studentId; }
    public UUID getLessonId() { return lessonId; }
    public int getTasksCompleted() { return tasksCompleted; }
    public int getTotalTasks() { return totalTasks; }
    public int getPointsEarned() { return pointsEarned; }
    public int getMaxPoints() { return maxPoints; }

    public void setStudentId(UUID studentId) { this.studentId = studentId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public void setTasksCompleted(int tasksCompleted) { this.tasksCompleted = tasksCompleted; }
    public void setTotalTasks(int totalTasks) { this.totalTasks = totalTasks; }
    public void setPointsEarned(int pointsEarned) { this.pointsEarned = pointsEarned; }
    public void setMaxPoints(int maxPoints) { this.maxPoints = maxPoints; }
}
