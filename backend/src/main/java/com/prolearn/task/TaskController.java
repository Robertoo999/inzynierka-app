package com.prolearn.task;

import com.prolearn.task.dto.CreateTaskDto;
import com.prolearn.task.dto.TaskDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService service;

    @PostMapping(path="/lessons/{id}/tasks", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('TEACHER')")
    public TaskDto create(@RequestBody @jakarta.validation.Valid CreateTaskDto req){
        return service.create(req);
    }

    @GetMapping("/tasks/{id}")
    public PublicTaskView getPublic(@PathVariable("id") UUID id) {
        Task task = service.getTask(id);
        UUID lessonId = task.getLesson() != null ? task.getLesson().getId() : null;
    return new PublicTaskView(task.getId(), lessonId, task.getTitle(), task.getDescription(),
        task.getMaxPoints(), task.getMaxAttempts(), task.getAllowRunBeforeSubmit(), task.getLockAfterSubmit(),
        task.getCreatedAt(), task.getType(), task.getLanguage(), task.getStarterCode());
    }

    @GetMapping("/tasks/{id}/teacher")
    @PreAuthorize("hasRole('TEACHER')")
    public TaskDto getTeacher(@PathVariable("id") UUID id) {
        Task task = service.getTask(id);
        return service.toDto(task);
    }

    public record TaskUpdateRequest(String title, String description, Integer maxPoints,
                                    String starterCode, String tests, String gradingMode, String language,
                                    String teacherSolution,
                                    Integer maxAttempts, Boolean allowRunBeforeSubmit, Boolean lockAfterSubmit) {}

    @PatchMapping(path="/tasks/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('TEACHER')")
    public TaskDto update(@PathVariable("id") UUID id, @RequestBody TaskUpdateRequest req){
        return service.update(id, req.title(), req.description(), req.maxPoints(),
        req.starterCode(), req.tests(), req.gradingMode(), req.language(), req.teacherSolution(),
        req.maxAttempts(), req.allowRunBeforeSubmit(), req.lockAfterSubmit());
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(@PathVariable("id") UUID id){
        service.delete(id);
    }

    public record PublicTaskView(UUID id, UUID lessonId, String title, String description, int maxPoints,
                                 Integer maxAttempts, Boolean allowRunBeforeSubmit, Boolean lockAfterSubmit,
                                 java.time.Instant createdAt, String type, String language, String starterCode) {}
}
