package com.prolearn.classes;

import com.prolearn.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "class_members")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClassMember {

    @EmbeddedId
    private ClassMemberId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false, insertable = false, updatable = false)
    @MapsId("memberId")
    private User member;

    // "TEACHER" albo "STUDENT"
    @Column(nullable = false, length = 16)
    private String role;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
