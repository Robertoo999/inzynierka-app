package com.prolearn.lesson.dto;

import java.util.List;
import java.util.UUID;

public class LessonClassProgressDto {
    private Long classId;
    private UUID lessonId;
    private List<StudentDto> students;
    private List<TaskDto> tasks;
    private List<StudentTaskResultDto> results;

    public LessonClassProgressDto() {}

    public LessonClassProgressDto(Long classId, UUID lessonId, List<StudentDto> students, List<TaskDto> tasks, List<StudentTaskResultDto> results) {
        this.classId = classId;
        this.lessonId = lessonId;
        this.students = students;
        this.tasks = tasks;
        this.results = results;
    }

    public Long getClassId() { return classId; }
    public UUID getLessonId() { return lessonId; }
    public List<StudentDto> getStudents() { return students; }
    public List<TaskDto> getTasks() { return tasks; }
    public List<StudentTaskResultDto> getResults() { return results; }

    public void setClassId(Long classId) { this.classId = classId; }
    public void setLessonId(UUID lessonId) { this.lessonId = lessonId; }
    public void setStudents(List<StudentDto> students) { this.students = students; }
    public void setTasks(List<TaskDto> tasks) { this.tasks = tasks; }
    public void setResults(List<StudentTaskResultDto> results) { this.results = results; }
}
