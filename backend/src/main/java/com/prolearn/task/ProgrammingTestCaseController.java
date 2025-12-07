package com.prolearn.task;

import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(produces = "application/json")
public class ProgrammingTestCaseController {

    private final ProgrammingTestCaseRepository repo;
    private final TaskRepository tasks;

    public ProgrammingTestCaseController(ProgrammingTestCaseRepository repo, TaskRepository tasks) {
        this.repo = repo;
        this.tasks = tasks;
    }

    record TestRequest(String input, String expected, Boolean visible, Integer points, Integer ordering, String mode) {}
    record TestResponse(UUID id, String input, String expected, boolean visible, int points, int ordering, String mode) {}

    @GetMapping("/api/tasks/{taskId}/tests")
    @Transactional(readOnly = true)
    public List<TestResponse> list(@PathVariable("taskId") UUID taskId) {
        return repo.findByTaskIdOrderByOrderAsc(taskId).stream()
                .map(t -> new TestResponse(t.getId(), t.getInput(), t.getExpected(), t.isVisible(), t.getPoints(), t.getOrder(), t.getMode()))
                .toList();
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PostMapping(value = "/api/tasks/{taskId}/tests", consumes = "application/json")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public TestResponse create(@PathVariable("taskId") UUID taskId, @Valid @RequestBody TestRequest req) {
        Task task = tasks.findById(taskId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));
        String in = req.input() == null ? "" : req.input().trim();
        String exp = req.expected() == null ? "" : req.expected().trim();
        if (in.isEmpty() || exp.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wejście i oczekiwany wynik testu są wymagane");
        }
        int newPoints = req.points() == null ? 0 : Math.max(0, req.points());
        int current = repo.sumPointsByTaskId(taskId) == null ? 0 : repo.sumPointsByTaskId(taskId);
        if (current + newPoints > task.getMaxPoints()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suma punktów testów przekroczy maksymalną liczbę punktów zadania (" + task.getMaxPoints() + ")");
        }
    ProgrammingTestCase t = new ProgrammingTestCase();
        t.setTask(task);
        t.setInput(in);
        t.setExpected(exp);
        t.setVisible(req.visible() == null ? true : req.visible());
        t.setPoints(newPoints);
        t.setOrder(req.ordering() == null ? 0 : req.ordering());
    // Enforce language policy: Python -> IO only; JavaScript -> requested mode (default EVAL)
    String requested = req.mode() == null ? null : req.mode().trim();
    String mode = (task.getLanguage() != null && task.getLanguage().toLowerCase().startsWith("py"))
        ? "IO"
        : ("IO".equalsIgnoreCase(requested) ? "IO" : "EVAL");
    t.setMode(mode);
        t = repo.save(t);
        return new TestResponse(t.getId(), t.getInput(), t.getExpected(), t.isVisible(), t.getPoints(), t.getOrder(), t.getMode());
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @PutMapping(value = "/api/tasks/{taskId}/tests/{id}", consumes = "application/json")
    @Transactional
    public TestResponse update(@PathVariable("taskId") UUID taskId, @PathVariable("id") UUID id, @Valid @RequestBody TestRequest req) {
        ProgrammingTestCase t = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono testu"));
        if (!t.getTask().getId().equals(taskId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieprawidłowe zadanie");

        String in = req.input() == null ? null : req.input().trim();
        String exp = req.expected() == null ? null : req.expected().trim();
        if (in != null && in.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wejście testu nie może być puste");
        }
        if (exp != null && exp.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Oczekiwany wynik testu nie może być pusty");
        }

        int newPoints = req.points() == null ? t.getPoints() : Math.max(0, req.points());
        // suma innych testów (bez aktualizowanego)
        int current = repo.sumPointsByTaskId(taskId) == null ? 0 : repo.sumPointsByTaskId(taskId);
        int others = current - t.getPoints();
        if (others + newPoints > t.getTask().getMaxPoints()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Suma punktów testów przekroczy maksymalną liczbę punktów zadania (" + t.getTask().getMaxPoints() + ")");
        }

    if (in != null) t.setInput(in);
        if (exp != null) t.setExpected(exp);
        t.setVisible(req.visible() == null ? t.isVisible() : req.visible());
        t.setPoints(newPoints);
        t.setOrder(req.ordering() == null ? t.getOrder() : req.ordering());
    // Enforce language policy again on update
    String requested = req.mode() == null ? t.getMode() : req.mode().trim();
    String mode = (t.getTask().getLanguage() != null && t.getTask().getLanguage().toLowerCase().startsWith("py"))
        ? "IO"
        : ("IO".equalsIgnoreCase(requested) ? "IO" : "EVAL");
    t.setMode(mode);
        t = repo.save(t);
        return new TestResponse(t.getId(), t.getInput(), t.getExpected(), t.isVisible(), t.getPoints(), t.getOrder(), t.getMode());
    }

    @RolesAllowed({"TEACHER","ROLE_TEACHER"})
    @DeleteMapping("/api/tasks/{taskId}/tests/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable("taskId") UUID taskId, @PathVariable("id") UUID id) {
        ProgrammingTestCase t = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono testu"));
        if (!t.getTask().getId().equals(taskId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Niezgodne zadanie");
        repo.delete(t);
    }
}
