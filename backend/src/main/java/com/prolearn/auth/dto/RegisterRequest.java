package com.prolearn.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {
    @Email @NotBlank
    private String email;

    @NotBlank @Size(min = 6, max = 100)
    private String password;

    @NotBlank
    private String role; // "STUDENT" | "TEACHER"

    // Optional personal details
    private String firstName;
    private String lastName;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email == null ? null : email.toLowerCase(); }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
}
