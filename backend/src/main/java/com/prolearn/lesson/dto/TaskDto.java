package com.prolearn.lesson.dto;

import java.util.UUID;

public class TaskDto {
    private UUID taskId;
    private String title;
    private Integer maxPoints;
    private String type; // TASK or QUIZ
    private UUID lessonId;
    private String lessonTitle;
    private UUID activityId;

    public TaskDto() {}

    public TaskDto(UUID taskId, String title, Integer maxPoints, String type, UUID lessonId, String lessonTitle, UUID activityId) {
        this.taskId = taskId;
        this.title = title;
        this.maxPoints = maxPoints;
        this.type = type;
        this.lessonId = lessonId;
        this.lessonTitle = lessonTitle;
        this.activityId = activityId;
    }

    public UUID getTaskId() { return taskId; }
    public String getTitle() { return title; }
    public Integer getMaxPoints() { return maxPoints; }
    public String getType() { return type; }
    public UUID getLessonId() { return lessonId; }
    public String getLessonTitle() { return lessonTitle; }
    public UUID getActivityId() { return activityId; }

    public void setTaskId(UUID taskId) { this.taskId = taskId; }
    public void setTitle(String title) { this.title = title; }
    public void setMaxPoints(Integer maxPoints) { this.maxPoints = maxPoints; }
    public void setType(String type) { this.type = type; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public void setLessonTitle(String lessonTitle) { this.lessonTitle = lessonTitle; }
    public void setActivityId(UUID activityId) { this.activityId = activityId; }
}
