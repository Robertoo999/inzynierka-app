package com.prolearn.classes;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClassMemberRepository extends JpaRepository<ClassMember, ClassMemberId> {
    List<ClassMember> findByIdMemberId(UUID memberId);
    boolean existsById(ClassMemberId id);
    boolean existsByIdClassIdAndIdMemberId(Long classId, UUID memberId);
    // find all members for a given class id
    List<ClassMember> findByIdClassId(Long classId);
}
