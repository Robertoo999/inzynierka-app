package com.prolearn.lesson.dto;

import java.util.List;

public class ClassProgressOverviewDto {
    private Long classId;
    private List<LessonOverviewDto> lessons;
    private List<StudentDto> students;
    private List<StudentLessonOverviewDto> results;

    public ClassProgressOverviewDto() {}

    public ClassProgressOverviewDto(Long classId, List<LessonOverviewDto> lessons, List<StudentDto> students, List<StudentLessonOverviewDto> results) {
        this.classId = classId;
        this.lessons = lessons;
        this.students = students;
        this.results = results;
    }

    public Long getClassId() { return classId; }
    public List<LessonOverviewDto> getLessons() { return lessons; }
    public List<StudentDto> getStudents() { return students; }
    public List<StudentLessonOverviewDto> getResults() { return results; }

    public void setClassId(Long classId) { this.classId = classId; }
    public void setLessons(List<LessonOverviewDto> lessons) { this.lessons = lessons; }
    public void setStudents(List<StudentDto> students) { this.students = students; }
    public void setResults(List<StudentLessonOverviewDto> results) { this.results = results; }
}
