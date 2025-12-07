package com.prolearn.task;

import com.prolearn.security.SecurityUtils;
import com.prolearn.task.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    /**
     * Tworzy zadanie typu QUIZ z pytaniami.
     * POST /api/lessons/{lessonId}/tasks/quiz
     */
    @PostMapping(value = "/lessons/{lessonId}/tasks/quiz", 
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('TEACHER')")
    public QuizDto createQuiz(
            @PathVariable("lessonId") UUID lessonId,
            @RequestBody @Valid CreateQuizRequest req
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }

        // Upewnij się, że lessonId w ścieżce zgadza się z tym w request
        if (!lessonId.equals(req.lessonId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Niezgodny identyfikator lekcji");
        }

        return quizService.createQuiz(req, userId);
    }

    /**
     * Pobiera quiz z pytaniami.
     * GET /api/tasks/{taskId}/quiz
     * - Dla nauczyciela: pokazuje poprawne odpowiedzi
     * - Dla ucznia: ukrywa poprawne odpowiedzi
     */
    @GetMapping(value = "/tasks/{taskId}/quiz", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    public QuizDto getQuiz(
            @PathVariable("taskId") UUID taskId,
            @RequestParam(value = "includeAnswers", defaultValue = "false") boolean includeAnswers
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }

        // TODO: Sprawdź czy użytkownik jest nauczycielem - jeśli tak, zawsze pokazuj odpowiedzi
        // Na razie używamy parametru includeAnswers
        return quizService.getQuiz(taskId, includeAnswers);
    }

    /**
     * Wysyła odpowiedzi na quiz.
     * POST /api/tasks/{taskId}/quiz/submit
     */
    @PostMapping(value = "/tasks/{taskId}/quiz/submit",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public QuizResultDto submitQuiz(
            @PathVariable("taskId") UUID taskId,
            @RequestBody @Valid SubmitQuizRequest req
    ) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }

        return quizService.submitQuiz(taskId, req, userId);
    }

    /**
     * Pobiera wynik quizu dla istniejącego submission.
     * GET /api/submissions/{submissionId}/quiz/result
     */
    @GetMapping(value = "/submissions/{submissionId}/quiz/result",
                produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    public QuizResultDto getQuizResult(@PathVariable("submissionId") UUID submissionId) {
        UUID userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Użytkownik nieautoryzowany");
        }

        return quizService.getQuizResult(submissionId, userId);
    }
}

