package com.prolearn.classes;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {
    Optional<Classroom> findByJoinCode(String joinCode);
    Optional<Classroom> findByOwner_IdAndNameIgnoreCase(UUID ownerId, String name);
}
