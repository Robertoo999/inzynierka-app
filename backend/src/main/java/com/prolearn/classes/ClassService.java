package com.prolearn.classes;

import com.prolearn.classes.dto.ClassroomDto;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClassService {

    private final ClassroomRepository classroomRepo;
    private final ClassMemberRepository memberRepo;
    private final UserRepository userRepo;
    private final com.prolearn.lesson.LessonService lessonService;

    /**
     * Generuje unikalny 6-znakowy kod dołączenia do klasy.
     */
    private String generateUniqueJoinCode() {
        SecureRandom r = new SecureRandom();
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(r.nextInt(chars.length())));
            }
            code = sb.toString();
        } while (classroomRepo.findByJoinCode(code).isPresent());
        return code;
    }

    /**
     * Tworzy nową klasę i dodaje właściciela jako członka z rolą TEACHER.
     */
    @Transactional
    public ClassroomDto createClass(String name, UUID ownerId) {
        User owner = userRepo.findById(ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    String normalized = name == null ? "" : name.trim();
    if (normalized.length() < 3) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nazwa klasy musi mieć co najmniej 3 znaki");
    }
    // case-insensitive uniqueness per owner
    if (classroomRepo.findByOwner_IdAndNameIgnoreCase(ownerId, normalized).isPresent()) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Klasa o tej nazwie już istnieje w Twoim panelu");
    }

        String joinCode = generateUniqueJoinCode();

        Classroom classroom = Classroom.builder()
        .name(normalized)
                .joinCode(joinCode)
                .owner(owner)
                .build();
        classroom = classroomRepo.save(classroom);

        // Dodaj właściciela jako członka (TEACHER)
        ClassMember member = ClassMember.builder()
                .id(new ClassMemberId(classroom.getId(), ownerId))
                .member(owner)
                .role("TEACHER")
                .build();
        memberRepo.save(member);

        return toDto(classroom, true);
    }

    /**
     * Zwraca listę klas użytkownika.
     */
    @Transactional(readOnly = true)
    public List<ClassroomDto> getUserClasses(UUID userId) {
        List<ClassMember> memberships = memberRepo.findByIdMemberId(userId);
        return memberships.stream().map(m -> {
            Classroom c = classroomRepo.findById(m.getId().getClassId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
            boolean includeCode = c.getOwner().getId().equals(userId) || "TEACHER".equals(m.getRole());
            return toDto(c, includeCode);
        }).toList();
    }

    /**
     * Dołącza użytkownika do klasy na podstawie kodu.
     */
    @Transactional
    public ClassroomDto joinClass(String code, UUID userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        String normalizedCode = code == null ? "" : code.trim().toUpperCase();
    Classroom classroom = classroomRepo.findByJoinCode(normalizedCode)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nieprawidłowy kod klasy"));

        ClassMemberId id = new ClassMemberId(classroom.getId(), userId);
        if (!memberRepo.existsById(id)) {
            ClassMember member = ClassMember.builder()
                    .id(id)
                    .member(user)
                    .role("STUDENT")
                    .build();
            memberRepo.save(member);
        }

        return toDto(classroom, false);
    }

    /**
     * Sprawdza czy użytkownik jest członkiem klasy.
     */
    @Transactional(readOnly = true)
    public ClassMember requireMembership(Long classId, UUID userId) {
    return memberRepo.findById(new ClassMemberId(classId, userId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Nie jesteś członkiem tej klasy"));
    }

    /**
     * Sprawdza czy użytkownik jest nauczycielem w klasie.
     */
    @Transactional(readOnly = true)
    public void requireTeacherMembership(Long classId, UUID userId) {
        ClassMember member = requireMembership(classId, userId);
        if (!"TEACHER".equalsIgnoreCase(member.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tę operację może wykonać tylko nauczyciel tej klasy");
        }
    }

    /**
     * Pobiera klasę po ID.
     */
    @Transactional(readOnly = true)
    public Classroom getClassroom(Long classId) {
        return classroomRepo.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));
    }

    /**
     * Usuwa klasę wraz z członkostwami. Dostęp tylko dla nauczyciela danej klasy.
     */
    @Transactional
    public void deleteClass(Long classId, UUID userId) {
        // upewnij się, że użytkownik jest nauczycielem w tej klasie
        requireTeacherMembership(classId, userId);

        Classroom classroom = classroomRepo.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Class not found"));

        // najpierw usuń wszystkie lekcje w tej klasie, używając istniejącej logiki LessonService
        var lessons = lessonService.getLessonsInClass(classId);
        if (lessons != null) {
            for (var lessonItem : lessons) {
                java.util.UUID lessonId = lessonItem.id();
                if (lessonId != null) {
                    lessonService.deleteLesson(classId, lessonId, userId);
                }
            }
        }

        // usuń wszystkich członków klasy
        memberRepo.deleteAll(memberRepo.findByIdClassId(classId));

        // na końcu usuń samą klasę
        classroomRepo.delete(classroom);
    }

    /**
     * Mapuje encję Classroom na DTO.
     */
    private static ClassroomDto toDto(Classroom c, boolean includeCode) {
        return new ClassroomDto(c.getId(), c.getName(), includeCode ? c.getJoinCode() : null);
    }
}

