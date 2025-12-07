package com.prolearn.lesson.dto;

import java.util.UUID;

public class StudentDto {
    private UUID studentId;
    private String email;
    private String firstName;
    private String lastName;

    public StudentDto() {}

    public StudentDto(UUID studentId, String email, String firstName, String lastName) {
        this.studentId = studentId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    public UUID getStudentId() { return studentId; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }

    public void setStudentId(UUID studentId) { this.studentId = studentId; }
    public void setEmail(String email) { this.email = email; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
}
