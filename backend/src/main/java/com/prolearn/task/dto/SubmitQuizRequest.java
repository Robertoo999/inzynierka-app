package com.prolearn.task.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SubmitQuizRequest(
        @NotEmpty(message = "Co najmniej jedna odpowiedź jest wymagana")
        @Size(max = 50, message = "Nie można przesłać więcej niż 50 odpowiedzi")
        List<@Valid QuizAnswerSubmission> answers
) {}

