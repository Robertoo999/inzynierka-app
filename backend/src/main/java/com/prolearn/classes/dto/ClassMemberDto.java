package com.prolearn.classes.dto;

import java.time.Instant;
import java.util.UUID;

public record ClassMemberDto(UUID id, String email, String firstName, String lastName, String role, Instant joinedAt) {
}
