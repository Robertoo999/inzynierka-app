package com.prolearn.classes.dto;

import com.prolearn.classes.Classroom;

public record ClassroomDto(Long id, String name, String joinCode) {
    public static ClassroomDto fromEntity(Classroom c) {
        return new ClassroomDto(c.getId(), c.getName(), c.getJoinCode());
    }
}
