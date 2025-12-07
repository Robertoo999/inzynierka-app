package com.prolearn.lesson.dto;

import java.util.UUID;

public class StudentLessonSummary {
    private UUID studentId;
    private String email;
    private String firstName;
    private String lastName;
    private Integer totalPoints;
    private Integer maxPoints;
    private Integer tasksCompleted;
    private Integer totalTasks;

    public StudentLessonSummary() {}

    public StudentLessonSummary(UUID studentId, String email, String firstName, String lastName, Integer totalPoints, Integer maxPoints, Integer tasksCompleted, Integer totalTasks) {
        this.studentId = studentId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.totalPoints = totalPoints;
        this.maxPoints = maxPoints;
        this.tasksCompleted = tasksCompleted;
        this.totalTasks = totalTasks;
    }

    public UUID getStudentId() { return studentId; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public Integer getTotalPoints() { return totalPoints; }
    public Integer getMaxPoints() { return maxPoints; }
    public Integer getTasksCompleted() { return tasksCompleted; }
    public Integer getTotalTasks() { return totalTasks; }

    public void setStudentId(UUID studentId) { this.studentId = studentId; }
    public void setEmail(String email) { this.email = email; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }
    public void setMaxPoints(Integer maxPoints) { this.maxPoints = maxPoints; }
    public void setTasksCompleted(Integer tasksCompleted) { this.tasksCompleted = tasksCompleted; }
    public void setTotalTasks(Integer totalTasks) { this.totalTasks = totalTasks; }
}
