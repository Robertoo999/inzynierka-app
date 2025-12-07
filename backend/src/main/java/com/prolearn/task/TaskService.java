package com.prolearn.task;

import com.prolearn.lesson.Lesson;
import com.prolearn.lesson.LessonRepository;
import com.prolearn.task.dto.CreateTaskDto;
import com.prolearn.task.dto.TaskDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepo;
    private final LessonRepository lessonRepo;
    private final ProgrammingTestCaseRepository testRepo;
    private final com.prolearn.lesson.LessonActivityRepository activityRepo;

    /**
     * Tworzy nowe zadanie.
     */
    @Transactional
    public TaskDto create(CreateTaskDto req) {
        UUID lessonId = Objects.requireNonNull(req.lessonId, "lessonId");
    Lesson lesson = lessonRepo.findById(lessonId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono lekcji: " + req.lessonId));

        Task task = new Task();
        task.setLesson(lesson);
        task.setTitle(req.title);
        task.setDescription(req.description);
        task.setMaxPoints(req.maxPoints != null ? req.maxPoints : 10);
    // enforce single-at-least submit attempt by default
    task.setMaxAttempts(req.maxAttempts != null ? (req.maxAttempts < 1 ? 1 : req.maxAttempts) : 1);
        task.setAllowRunBeforeSubmit(req.allowRunBeforeSubmit != null ? req.allowRunBeforeSubmit : Boolean.TRUE);
        task.setLockAfterSubmit(req.lockAfterSubmit != null ? req.lockAfterSubmit : Boolean.TRUE);
        task.setType(req.type != null ? req.type : "CODE");
        task.setLanguage(req.language != null ? req.language : "javascript");
        task.setStarterCode(req.starterCode);
        task.setTests(req.tests);
        task.setGradingMode(req.gradingMode != null ? req.gradingMode : "AUTO");
        task.setTeacherSolution(req.teacherSolution);

        task = taskRepo.save(Objects.requireNonNull(task, "task"));
        return toDto(task);
    }

    /**
     * Aktualizuje zadanie.
     */
    @Transactional
    public TaskDto update(UUID taskId, String title, String description, Integer maxPoints,
                          String starterCode, String tests, String gradingMode, String language, String teacherSolution,
                          Integer maxAttempts, Boolean allowRunBeforeSubmit, Boolean lockAfterSubmit) {
        Objects.requireNonNull(taskId, "taskId");
    Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));

        if (title != null) task.setTitle(title);
        if (description != null) task.setDescription(description);
        if (maxPoints != null) task.setMaxPoints(maxPoints);
        if (starterCode != null) task.setStarterCode(starterCode);
        if (tests != null) task.setTests(tests);
        if (gradingMode != null) task.setGradingMode(gradingMode);
        if (language != null) task.setLanguage(language);
        if (teacherSolution != null) task.setTeacherSolution(teacherSolution);
    if (maxAttempts != null) task.setMaxAttempts(maxAttempts < 1 ? 1 : maxAttempts);
        if (allowRunBeforeSubmit != null) task.setAllowRunBeforeSubmit(allowRunBeforeSubmit);
        if (lockAfterSubmit != null) task.setLockAfterSubmit(lockAfterSubmit);

        // Walidacja spójności: suma punktów testów musi być RÓWNA maksymalnym punktom zadania, jeśli istnieją testy
        Integer sum = testRepo.sumPointsByTaskId(task.getId());
        int testsSum = sum == null ? 0 : sum;
        if (testsSum > 0 && testsSum != task.getMaxPoints()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Suma punktów wszystkich testów (" + testsSum + ") musi być równa maksymalnej liczbie punktów zadania (" + task.getMaxPoints() + ")");
        }

        task = taskRepo.save(Objects.requireNonNull(task, "task"));
        return toDto(task);
    }

    /**
     * Usuwa zadanie.
     */
    @Transactional
    public void delete(UUID taskId) {
        Objects.requireNonNull(taskId, "taskId");
    Task task = taskRepo.findById(taskId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));
        // Remove any lesson activities referencing this task to avoid stale UI artifacts
        try {
            activityRepo.deleteByTask_Id(task.getId());
        } catch (Exception ignore) {}
        taskRepo.delete(Objects.requireNonNull(task, "task"));
    }

    /**
     * Pobiera zadanie po ID.
     */
    @Transactional(readOnly = true)
    public Task getTask(UUID taskId) {
        Objects.requireNonNull(taskId, "taskId");
        return taskRepo.findById(taskId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));
    }

    /**
     * Mapuje encję Task na TaskDto.
     */
    public TaskDto toDto(Task task) {
        TaskDto dto = new TaskDto();
        dto.id = task.getId();
        dto.lessonId = task.getLesson() != null ? task.getLesson().getId() : null;
        dto.title = task.getTitle();
        dto.description = task.getDescription();
        dto.maxPoints = task.getMaxPoints();
        dto.maxAttempts = task.getMaxAttempts();
        dto.allowRunBeforeSubmit = task.getAllowRunBeforeSubmit();
        dto.lockAfterSubmit = task.getLockAfterSubmit();
        dto.createdAt = task.getCreatedAt();
        dto.type = task.getType();
        dto.language = task.getLanguage();
        dto.starterCode = task.getStarterCode();
        dto.tests = task.getTests();
        dto.gradingMode = task.getGradingMode();
        dto.teacherSolution = task.getTeacherSolution();
        return dto;
    }
}
