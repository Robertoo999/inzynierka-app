package com.prolearn.lesson.dto;

import java.util.UUID;

public class LessonOverviewDto {
    private UUID lessonId;
    private String title;
    private int totalTasks;
    private int totalMaxPoints;

    public LessonOverviewDto() {}

    public LessonOverviewDto(UUID lessonId, String title, int totalTasks, int totalMaxPoints) {
        this.lessonId = lessonId;
        this.title = title;
        this.totalTasks = totalTasks;
        this.totalMaxPoints = totalMaxPoints;
    }

    public UUID getLessonId() { return lessonId; }
    public String getTitle() { return title; }
    public int getTotalTasks() { return totalTasks; }
    public int getTotalMaxPoints() { return totalMaxPoints; }

    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public void setTitle(String title) { this.title = title; }
    public void setTotalTasks(int totalTasks) { this.totalTasks = totalTasks; }
    public void setTotalMaxPoints(int totalMaxPoints) { this.totalMaxPoints = totalMaxPoints; }
}
