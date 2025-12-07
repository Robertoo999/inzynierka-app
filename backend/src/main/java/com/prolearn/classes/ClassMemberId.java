package com.prolearn.classes;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class ClassMemberId implements Serializable {
    private Long classId;
    private UUID memberId;
}
