package com.prolearn.lesson.dto;

import java.util.UUID;

public class StudentTaskResultDto {
    private UUID studentId;
    private UUID taskId;
    private String status; // NOT_STARTED / IN_PROGRESS / DONE
    private Integer points;

    public StudentTaskResultDto() {}

    public StudentTaskResultDto(UUID studentId, UUID taskId, String status, Integer points) {
        this.studentId = studentId;
        this.taskId = taskId;
        this.status = status;
        this.points = points;
    }

    public UUID getStudentId() { return studentId; }
    public UUID getTaskId() { return taskId; }
    public String getStatus() { return status; }
    public Integer getPoints() { return points; }

    public void setStudentId(UUID studentId) { this.studentId = studentId; }
    public void setTaskId(UUID taskId) { this.taskId = taskId; }
    public void setStatus(String status) { this.status = status; }
    public void setPoints(Integer points) { this.points = points; }
}
