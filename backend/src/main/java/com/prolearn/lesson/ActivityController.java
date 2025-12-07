package com.prolearn.lesson;

import com.prolearn.lesson.dto.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prolearn.security.SecurityUtils;
import com.prolearn.task.Task;
import com.prolearn.task.TaskRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.List;
import java.util.HashMap;

@RestController
@RequestMapping(produces = MediaType.APPLICATION_JSON_VALUE)
public class ActivityController {
    private final LessonRepository lessons;
    private final LessonActivityRepository activities;
    private final TaskRepository tasks;
    private final com.prolearn.submission.SubmissionRepository submissionRepository;
    private final LessonService lessonService;
    private final ObjectMapper objectMapper;
    private final com.prolearn.lesson.QuizAttemptRepository quizAttemptRepository;

    public ActivityController(LessonRepository lessons, LessonActivityRepository activities,
                              TaskRepository tasks, com.prolearn.submission.SubmissionRepository submissionRepository,
                              LessonService lessonService, ObjectMapper objectMapper,
                              com.prolearn.lesson.QuizAttemptRepository quizAttemptRepository) {
        this.lessons = lessons;
        this.activities = activities;
        this.tasks = tasks;
        this.submissionRepository = submissionRepository;
        this.lessonService = lessonService;
        this.objectMapper = objectMapper;
        this.quizAttemptRepository = quizAttemptRepository;
    }

    public static record QuizSubmitRequest(List<Integer> answers) {}

    public static record QuizResult(int correct, int total, int points, double percent) {}

    @RolesAllowed({"STUDENT","ROLE_STUDENT","TEACHER","ROLE_TEACHER"})
    @PostMapping(path="/api/activities/{id}/quiz/submit", consumes=MediaType.APPLICATION_JSON_VALUE)
    public QuizResult submitQuiz(@PathVariable("id") UUID id, @RequestBody QuizSubmitRequest req){
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");

        LessonActivity a = activities.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono aktywności"));
        if (!"QUIZ".equalsIgnoreCase(a.getType())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aktywność nie jest quizem");

        String body = a.getBody();
        if (body == null || body.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Brak treści quizu");

        if (quizAttemptRepository.existsByActivity_IdAndStudentId(id, userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quiz został już ukończony");
        }

        try {
            var grade = QuizGrader.grade(body, req.answers(), objectMapper);

            // persist attempt (best-effort)
            try {
                QuizAttempt aTry = new QuizAttempt();
                aTry.setActivity(a);
                aTry.setStudentId(userId);
                aTry.setCorrect(grade.correct());
                aTry.setTotal(grade.total());
                aTry.setPoints(grade.points());
                quizAttemptRepository.save(aTry);
            } catch (Exception e) {
                System.err.println("Failed to save quiz attempt: " + e.getMessage());
            }

            return new QuizResult(grade.correct(), grade.total(), grade.points(), grade.percent());
        } catch (IllegalArgumentException iae) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, iae.getMessage());
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowa treść quizu: niepoprawny JSON");
        }
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @GetMapping(path="/api/activities/{id}/attempts", produces=MediaType.APPLICATION_JSON_VALUE)
    public java.util.List<java.util.Map<String,Object>> listAttempts(@PathVariable("id") UUID id){
        // only teachers can list attempts for an activity
        LessonActivity a = activities.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono aktywności"));
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        lessonService.requireTeacherOfLesson(a.getLesson().getId(), userId);

        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var at : quizAttemptRepository.findAllByActivity_IdOrderByCreatedAtDesc(id)){
            var m = new HashMap<String,Object>();
            m.put("id", at.getId());
            m.put("studentId", at.getStudentId());
            m.put("correct", at.getCorrect());
            m.put("total", at.getTotal());
            m.put("points", at.getPoints());
            m.put("createdAt", at.getCreatedAt());
            out.add(m);
        }
        return out;
    }

    @RolesAllowed({"STUDENT","ROLE_STUDENT"})
    @GetMapping(path="/api/activities/{id}/attempts/me", produces=MediaType.APPLICATION_JSON_VALUE)
    public java.util.List<java.util.Map<String,Object>> myAttempts(@PathVariable("id") UUID id){
        LessonActivity a = activities.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono aktywności"));
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");

        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        for (var at : quizAttemptRepository.findAllByActivity_IdAndStudentIdOrderByCreatedAtDesc(id, userId)){
            var m = new HashMap<String,Object>();
            m.put("id", at.getId());
            m.put("correct", at.getCorrect());
            m.put("total", at.getTotal());
            m.put("points", at.getPoints());
            m.put("createdAt", at.getCreatedAt());
            out.add(m);
        }
        return out;
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PostMapping(path="/api/lessons/{id}/activities-with-task", consumes=MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public LessonActivityDto createWithTask(@PathVariable("id") UUID lessonId, @Valid @RequestBody com.prolearn.lesson.dto.ActivityWithTaskCreateRequest req){
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        lessonService.requireTeacherOfLesson(lessonId, userId);
        Lesson l = requireLesson(lessonId);

        // validate type and order index
        String type = req.type() == null ? null : req.type().trim().toUpperCase();
        if (type == null || type.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Typ aktywności jest wymagany");
        }
        if (!("CONTENT".equals(type) || "TASK".equals(type) || "QUIZ".equals(type))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowy typ aktywności: dozwolone CONTENT, TASK, QUIZ");
        }
        if (req.orderIndex() != null && req.orderIndex() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kolejność nie może być ujemna");
        }

        // If inline task provided, enforce TASK type
        if (req.task() != null && !"TASK".equals(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Typ musi być TASK, aby utworzyć zadanie w tej samej operacji");
        }

        // If inline task provided, create it
        com.prolearn.lesson.dto.ActivityWithTaskCreateRequest.TaskInline inline = req.task();
        Task createdTask = null;
        if (inline != null) {
            Task t = new Task();
            t.setLesson(l);
            t.setTitle(inline.title());
            t.setDescription(inline.description());
            t.setMaxPoints(inline.maxPoints() != null ? inline.maxPoints() : 10);
            t.setType(inline.type() != null ? inline.type() : "CODE");
            t.setLanguage(inline.language() != null ? inline.language() : "javascript");
            t.setStarterCode(inline.starterCode());
            t.setTests(inline.tests());
            t.setGradingMode(inline.gradingMode() != null ? inline.gradingMode() : "AUTO");
            createdTask = tasks.save(t);
        }

        LessonActivity a = new LessonActivity();
        a.setLesson(l);
        a.setType(type);
        a.setTitle(req.title());
        a.setOrderIndex(req.orderIndex()!=null ? req.orderIndex() : 0);
        a.setBody(req.body());
        if (createdTask != null) a.setTask(createdTask);

        return map(activities.save(a));
    }

    private Lesson requireLesson(UUID id) {
        return lessons.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono lekcji"));
    }
    private static LessonActivityDto map(LessonActivity a) {
        return new LessonActivityDto(a.getId(), a.getType(), a.getTitle(), a.getOrderIndex(),
                a.getBody(), a.getTask()!=null ? a.getTask().getId() : null, a.getCreatedAt());
    }

    public static record MoveRequest(Integer newIndex) {}

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PostMapping(path="/api/lessons/{lessonId}/activities/{activityId}/move", consumes=MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public java.util.List<com.prolearn.lesson.dto.LessonActivityDto> moveActivity(
            @PathVariable("lessonId") UUID lessonId,
            @PathVariable("activityId") UUID activityId,
            @RequestBody MoveRequest req
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        lessonService.requireTeacherOfLesson(lessonId, userId);

        var list = activities.findAllByLesson_IdOrderByOrderIndexAsc(lessonId);
        if (list.isEmpty()) return java.util.List.of();

        int currentIndex = -1;
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).getId().equals(activityId)) { currentIndex = i; break; }
        }
        if (currentIndex == -1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono aktywności w lekcji");

        int newIndex = req == null || req.newIndex() == null ? currentIndex : req.newIndex();
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= list.size()) newIndex = list.size() - 1;
        if (newIndex == currentIndex) return list.stream().map(ActivityController::map).toList();

        // reorder
        var item = list.remove(currentIndex);
        list.add(newIndex, item);

        // rewrite orderIndex
        for (int i = 0; i < list.size(); i++) {
            list.get(i).setOrderIndex(i);
        }

        activities.saveAll(list);
        return list.stream().map(ActivityController::map).toList();
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PostMapping(path="/api/lessons/{id}/activities", consumes=MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public LessonActivityDto create(@PathVariable("id") UUID lessonId, @Valid @RequestBody ActivityCreateRequest req){
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        lessonService.requireTeacherOfLesson(lessonId, userId);
        Lesson l = requireLesson(lessonId);
        // validate type and order
        String type = req.type() == null ? null : req.type().trim().toUpperCase();
        if (type == null || type.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Typ aktywności jest wymagany");
        }
        if (!("CONTENT".equals(type) || "TASK".equals(type) || "QUIZ".equals(type))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowy typ aktywności: dozwolone CONTENT, TASK, QUIZ");
        }
        if (req.orderIndex()!=null && req.orderIndex() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kolejność nie może być ujemna");
        }
        LessonActivity a = new LessonActivity();
        a.setLesson(l);
        a.setType(type);
        a.setTitle(req.title());
        a.setOrderIndex(req.orderIndex()!=null ? req.orderIndex() : 0);
        a.setBody(req.body());
        if ("CONTENT".equalsIgnoreCase(req.type())) {
            validateContentBody(req.body());
        }
        if ("TASK".equalsIgnoreCase(req.type())) {
            if (req.taskId()==null)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"taskId jest wymagany dla typu TASK");
                Task t = tasks.findById(req.taskId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Nie znaleziono zadania"));
            a.setTask(t);
        }
        return map(activities.save(a));
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PatchMapping(path="/api/activities/{id}", consumes=MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    public LessonActivityDto update(@PathVariable("id") UUID id, @Valid @RequestBody ActivityUpdateRequest req){
        LessonActivity a = activities.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Nie znaleziono aktywności"));
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        lessonService.requireTeacherOfLesson(a.getLesson().getId(), userId);
        if (req.title()!=null) a.setTitle(req.title());
        if (req.orderIndex()!=null) {
            if (req.orderIndex() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kolejność nie może być ujemna");
            a.setOrderIndex(req.orderIndex());
        }
        if (req.body()!=null) {
            if ("CONTENT".equalsIgnoreCase(a.getType())) {
                validateContentBody(req.body());
            }
            a.setBody(req.body());
        }
        return map(activities.save(a));
    }

    private void validateContentBody(String body) {
        if (body == null || body.isBlank()) return; // allow empty content
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode blocks = root.get("blocks");
            if (blocks == null || !blocks.isArray()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowa treść: brak tablicy 'blocks'");
            }
            for (JsonNode b : blocks) {
                JsonNode t = b.get("type");
                if (t == null || !t.isTextual()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowy blok treści: brak pola 'type'");
                String type = t.asText();
                switch (type) {
                    case "markdown" -> { if (b.get("md") == null || !b.get("md").isTextual()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blok 'markdown' wymaga tekstu 'md'"); }
                    case "image" -> { if (b.get("src") == null || !b.get("src").isTextual()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blok 'image' wymaga pola 'src'"); }
                    case "embed" -> { if (b.get("url") == null || !b.get("url").isTextual()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blok 'embed' wymaga pola 'url'"); }
                    case "code" -> {
                        JsonNode code = b.get("code");
                        if (code == null || !code.isTextual() || code.asText() == null) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blok 'code' wymaga pola 'code' jako tekst");
                        }
                        // 'lang' jest opcjonalne; jeśli obecne, musi być tekstowe
                        JsonNode lang = b.get("lang");
                        if (lang != null && !lang.isTextual()) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pole 'lang' w bloku 'code' musi być tekstowe, jeśli podane");
                        }
                    }
                    default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieznany typ bloku: " + type);
                }
            }
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowa treść: niepoprawny JSON");
        }
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @DeleteMapping("/api/activities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable("id") UUID id){
        LessonActivity a = activities.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Nie znaleziono aktywności"));
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }
        lessonService.requireTeacherOfLesson(a.getLesson().getId(), userId);
        // If this activity has an attached task, delete submissions and the task entity as well
        if (a.getTask() != null) {
            var t = a.getTask();
            var taskId = t.getId();
            if (taskId != null) {
                submissionRepository.deleteByTaskId(taskId);
                tasks.deleteById(taskId);
            }
            a.setTask(null);
        }
        // If this is a QUIZ activity, delete quiz attempts
        if ("QUIZ".equalsIgnoreCase(a.getType())) {
            quizAttemptRepository.deleteByActivity_Id(a.getId());
        }

        activities.delete(a);
    }
}
