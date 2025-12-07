package com.prolearn.task;

import com.prolearn.lesson.Lesson;
import com.prolearn.lesson.LessonRepository;
import com.prolearn.submission.Submission;
import com.prolearn.submission.SubmissionRepository;
import com.prolearn.submission.SubmissionStatus;
import com.prolearn.task.dto.*;
import com.prolearn.user.User;
import com.prolearn.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final TaskRepository taskRepo;
    private final QuizQuestionRepository questionRepo;
    private final QuizAnswerRepository answerRepo;
    private final LessonRepository lessonRepo;
    private final SubmissionRepository submissionRepo;
    private final UserRepository userRepo;

        private static final List<SubmissionStatus> ATTEMPT_STATUSES = List.of(SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED);

    /**
     * Tworzy zadanie typu QUIZ z pytaniami.
     */
    @Transactional
    public QuizDto createQuiz(CreateQuizRequest req, UUID userId) {
        UUID lessonId = Objects.requireNonNull(req.lessonId(), "lessonId");
        Lesson lesson = lessonRepo.findById(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono lekcji"));

        // Utwórz zadanie
        Task task = new Task();
        task.setLesson(lesson);
        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setMaxPoints(req.maxPoints());
        task.setType("QUIZ");
        task.setGradingMode("AUTO"); // Quizy są zawsze auto-oceniane
        task = taskRepo.save(task);

        // Utwórz pytania
        int orderIndex = 0;
        for (QuizQuestionDto qDto : req.questions()) {
            QuizQuestion question = QuizQuestion.builder()
                    .task(task)
                    .question(qDto.question())
                    .optionA(qDto.optionA())
                    .optionB(qDto.optionB())
                    .optionC(qDto.optionC())
                    .optionD(qDto.optionD())
                    .optionE(qDto.optionE())
                    .optionF(qDto.optionF())
                    .correctAnswer(qDto.correctAnswer().toUpperCase())
                    .explanation(qDto.explanation())
                    .points(qDto.points() != null ? qDto.points() : 1)
                    .orderIndex(orderIndex++)
                    .build();
            questionRepo.save(Objects.requireNonNull(question));
        }

        return toQuizDto(task);
    }

    /**
     * Pobiera quiz z pytaniami (bez poprawnych odpowiedzi dla uczniów).
     */
    @Transactional(readOnly = true)
    public QuizDto getQuiz(UUID taskId, boolean includeCorrectAnswers) {
        Objects.requireNonNull(taskId, "taskId");
        Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));

                if (!"QUIZ".equals(task.getType())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zadanie nie jest quizem");
        }

        List<QuizQuestion> questions = questionRepo.findByTask_IdOrderByOrderIndexAsc(taskId);
        
        List<QuizQuestionDto> questionDtos = questions.stream()
                .map(q -> toQuestionDto(q, includeCorrectAnswers))
                .collect(Collectors.toList());

        return new QuizDto(
                task.getId(),
                task.getLesson() != null ? task.getLesson().getId() : null,
                task.getTitle(),
                task.getDescription(),
                task.getMaxPoints(),
                task.getCreatedAt(),
                task.getType(),
                questionDtos
        );
    }

    /**
     * Przetwarza odpowiedzi na quiz i tworzy submission.
     */
    @Transactional
    public QuizResultDto submitQuiz(UUID taskId, SubmitQuizRequest req, UUID userId) {
        Objects.requireNonNull(taskId, "taskId");
        Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zadania"));

                if (!"QUIZ".equals(task.getType())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zadanie nie jest quizem");
                }

        Objects.requireNonNull(userId, "userId");
        User student = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nie znaleziono użytkownika"));

                long attemptsUsed = submissionRepo.countByTaskIdAndStudent_IdAndStatusIn(taskId, userId, ATTEMPT_STATUSES);
                if (attemptsUsed >= task.getMaxAttempts()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Brak dostępnych prób dla tego zadania");
                }

                Submission submission = new Submission();
                submission.setTask(task);
                submission.setStudent(student);
                submission.setStatus(SubmissionStatus.SUBMITTED);
                submission.setAttemptNumber((int) attemptsUsed + 1);
                submission.setAutoScore(null);
                submission.setManualScore(null);
                submission.setTeacherComment(null);
                submission = submissionRepo.save(submission);
                final Submission savedSubmission = submission;

        // Pobierz wszystkie pytania quizu
        List<QuizQuestion> allQuestions = questionRepo.findByTask_IdOrderByOrderIndexAsc(taskId);
        
        List<QuizAnswerResultDto> answerResults = req.answers().stream()
                .map(answerReq -> {
                    QuizQuestion question = allQuestions.stream()
                            .filter(q -> q.getId().equals(answerReq.questionId()))
                            .findFirst()
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.BAD_REQUEST, "Nie znaleziono pytania: " + answerReq.questionId()));

                    String selected = answerReq.selectedAnswer().toUpperCase();
                    boolean isCorrect = question.getCorrectAnswer().equalsIgnoreCase(selected);
                    int pointsEarned = isCorrect ? question.getPoints() : 0;

                    // Zapisz odpowiedź
                    QuizAnswer answer = QuizAnswer.builder()
                            .submission(savedSubmission)
                            .question(question)
                            .selectedAnswer(selected)
                            .isCorrect(isCorrect)
                            .pointsEarned(pointsEarned)
                            .build();
                    answerRepo.save(Objects.requireNonNull(answer));

                    return new QuizAnswerResultDto(
                            question.getId(),
                            selected,
                            question.getCorrectAnswer(),
                            isCorrect,
                            pointsEarned,
                            question.getExplanation()
                    );
                })
                .collect(Collectors.toList());

        // Oblicz statystyki
        int totalPoints = answerResults.stream()
                .mapToInt(QuizAnswerResultDto::pointsEarned)
                .sum();
        int correctAnswers = (int) answerResults.stream()
                .filter(QuizAnswerResultDto::isCorrect)
                .count();

        // Zaktualizuj submission
        submission.setAutoScore(totalPoints);
        submission.setPoints(totalPoints);
        submission.setStatus(SubmissionStatus.GRADED);
        submissionRepo.save(submission);

        return new QuizResultDto(
                submission.getId(),
                taskId,
                totalPoints,
                task.getMaxPoints(),
                correctAnswers,
                allQuestions.size(),
                submission.getCreatedAt(),
                answerResults
        );
    }

    /**
     * Pobiera wynik quizu dla istniejącego submission.
     */
    @Transactional(readOnly = true)
    public QuizResultDto getQuizResult(UUID submissionId, UUID userId) {
        Objects.requireNonNull(submissionId, "submissionId");
        Submission submission = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nie znaleziono zgłoszenia"));

        // Sprawdź uprawnienia
        if (!submission.getStudent().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Brak uprawnień do podglądu tego zgłoszenia");
        }

        Task task = submission.getTask();
                if (!"QUIZ".equals(task.getType())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "To zgłoszenie nie dotyczy quizu");
        }

        List<QuizAnswer> answers = answerRepo.findBySubmission(submission);
        List<QuizQuestion> allQuestions = questionRepo.findByTask_IdOrderByOrderIndexAsc(task.getId());

        List<QuizAnswerResultDto> answerResults = answers.stream()
                .map(a -> new QuizAnswerResultDto(
                        a.getQuestion().getId(),
                        a.getSelectedAnswer(),
                        a.getQuestion().getCorrectAnswer(),
                        a.getIsCorrect(),
                        a.getPointsEarned(),
                        a.getQuestion().getExplanation()
                ))
                .collect(Collectors.toList());

        int totalPoints = submission.getPoints() != null ? submission.getPoints() : 0;
        int correctAnswers = (int) answerResults.stream()
                .filter(QuizAnswerResultDto::isCorrect)
                .count();

        return new QuizResultDto(
                submission.getId(),
                task.getId(),
                totalPoints,
                task.getMaxPoints(),
                correctAnswers,
                allQuestions.size(),
                submission.getCreatedAt(),
                answerResults
        );
    }

    /**
     * Mapuje QuizQuestion na QuizQuestionDto.
     */
    private QuizQuestionDto toQuestionDto(QuizQuestion q, boolean includeCorrectAnswer) {
        return new QuizQuestionDto(
                q.getId(),
                q.getQuestion(),
                q.getOptionA(),
                q.getOptionB(),
                q.getOptionC(),
                q.getOptionD(),
                q.getOptionE(),
                q.getOptionF(),
                includeCorrectAnswer ? q.getCorrectAnswer() : null, // Ukryj poprawną odpowiedź dla uczniów
                includeCorrectAnswer ? q.getExplanation() : null, // Ukryj wyjaśnienie dla uczniów
                q.getPoints(),
                q.getOrderIndex()
        );
    }

    /**
     * Mapuje Task na QuizDto.
     */
    private QuizDto toQuizDto(Task task) {
        List<QuizQuestion> questions = questionRepo.findByTask_IdOrderByOrderIndexAsc(task.getId());
        List<QuizQuestionDto> questionDtos = questions.stream()
                .map(q -> toQuestionDto(q, true)) // Dla nauczyciela zawsze pokazuj poprawne odpowiedzi
                .collect(Collectors.toList());

        return new QuizDto(
                task.getId(),
                task.getLesson() != null ? task.getLesson().getId() : null,
                task.getTitle(),
                task.getDescription(),
                task.getMaxPoints(),
                task.getCreatedAt(),
                task.getType(),
                questionDtos
        );
    }
}

