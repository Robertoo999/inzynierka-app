package com.prolearn.classes;

import com.prolearn.classes.dto.ClassMemberDto;
import com.prolearn.security.CurrentUser;
import com.prolearn.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class ClassMembersController {

    private final ClassService classService;
    private final ClassMemberRepository memberRepo;
    private final CurrentUser currentUser;
    private final com.prolearn.lesson.LessonService lessonService;

    @GetMapping("/api/classes/{classId}/members")
    @Transactional(readOnly = true)
    public List<ClassMemberDto> listMembers(@PathVariable Long classId) {
        User user = currentUser.require();
        // caller must be a member to list members
        classService.requireMembership(classId, user.getId());
        List<ClassMember> members = memberRepo.findByIdClassId(classId);
        return members.stream().map(m -> new ClassMemberDto(
            m.getMember().getId(),
            m.getMember().getEmail(),
            m.getMember().getFirstName(),
            m.getMember().getLastName(),
            m.getRole(),
            m.getCreatedAt()
        )).collect(Collectors.toList());
    }

    @GetMapping("/api/classes/{classId}/members/me")
    @Transactional(readOnly = true)
    public ClassMemberDto getMyMembership(@PathVariable Long classId) {
        User user = currentUser.require();
        ClassMember cm = classService.requireMembership(classId, user.getId());
        return new ClassMemberDto(
            cm.getMember().getId(),
            cm.getMember().getEmail(),
            cm.getMember().getFirstName(),
            cm.getMember().getLastName(),
            cm.getRole(),
            cm.getCreatedAt()
        );
    }

    @GetMapping("/api/classes/{classId}/progress")
    @Transactional(readOnly = true)
    public com.prolearn.lesson.dto.LessonClassProgressDto classProgress(@PathVariable Long classId, @RequestParam(value = "lessonId", required = false) java.util.UUID lessonId) {
        User me = currentUser.require();
        // only teachers may view class progress
        classService.requireTeacherMembership(classId, me.getId());
        return lessonService.getClassProgress(classId, lessonId, me.getId());
    }

    @GetMapping("/api/classes/{classId}/progress/overview")
    @Transactional(readOnly = true)
    public com.prolearn.lesson.dto.ClassProgressOverviewDto classProgressOverview(@PathVariable Long classId) {
        User me = currentUser.require();
        classService.requireTeacherMembership(classId, me.getId());
        return lessonService.getClassProgressOverview(classId, me.getId());
    }

    // restrict {userId} path variable to UUID pattern to avoid accidental matching of literal paths like "me"
    @GetMapping("/api/classes/{classId}/members/{userId:[0-9a-fA-F\\-]{36}}")
    @Transactional(readOnly = true)
    public ClassMemberDto getMember(@PathVariable Long classId, @PathVariable UUID userId) {
        User me = currentUser.require();
        // allow only teacher or the same user
        ClassMember self = classService.requireMembership(classId, me.getId());
        if (!me.getId().equals(userId) && !"TEACHER".equalsIgnoreCase(self.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Brak uprawnień");
        }
        return memberRepo.findById(new ClassMemberId(classId, userId))
            .map(m -> new ClassMemberDto(
                m.getMember().getId(),
                m.getMember().getEmail(),
                m.getMember().getFirstName(),
                m.getMember().getLastName(),
                m.getRole(),
                m.getCreatedAt()
            ))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono członka"));
    }

    @DeleteMapping("/api/classes/{classId}/members/{userId}")
    public void removeMember(@PathVariable Long classId, @PathVariable String userId) {
        User me = currentUser.require();
        // special-case literal "me" so clients that hit the generic route won't cause a UUID conversion error
        if ("me".equalsIgnoreCase(userId)) {
            doLeaveClass(classId, me);
            return;
        }
        // otherwise attempt to parse as UUID and require teacher privileges
        java.util.UUID uid;
        try {
            uid = java.util.UUID.fromString(userId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowy identyfikator użytkownika");
        }
        classService.requireTeacherMembership(classId, me.getId());
        ClassMemberId id = new ClassMemberId(classId, uid);
        if (memberRepo.existsById(id)) {
            memberRepo.deleteById(id);
        }
    }

    /**
     * Allows the current authenticated user to leave the class.
     * This is a convenience endpoint so students may remove themselves.
     */
    // Internal helper to remove the current user from the class. Kept private to avoid duplicate mappings.
    private void doLeaveClass(Long classId, User me) {
        // ensure the user is a member
        classService.requireMembership(classId, me.getId());
        ClassMemberId id = new ClassMemberId(classId, me.getId());
        if (memberRepo.existsById(id)) {
            memberRepo.deleteById(id);
        }
    }
}
