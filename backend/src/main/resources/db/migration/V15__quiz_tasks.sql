-- V15__quiz_tasks.sql
-- Dodanie wsparcia dla zadań typu QUIZ

-- Tabela pytań quizowych
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY NOT NULL,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    question VARCHAR(1000) NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500),
    option_d VARCHAR(500),
    option_e VARCHAR(500),
    option_f VARCHAR(500),
    correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F')),
    explanation VARCHAR(2000),
    points INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT chk_quiz_question_points CHECK (points > 0)
);

-- Indeksy dla quiz_questions
CREATE INDEX idx_quiz_questions_task ON quiz_questions(task_id);
CREATE INDEX idx_quiz_questions_task_order ON quiz_questions(task_id, order_index);

-- Tabela odpowiedzi ucznia na pytania quizowe
CREATE TABLE quiz_answers (
    id UUID PRIMARY KEY NOT NULL,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer VARCHAR(1) NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E', 'F')),
    is_correct BOOLEAN NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    answered_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ux_quiz_answers_submission_question UNIQUE (submission_id, question_id)
);

-- Indeksy dla quiz_answers
CREATE INDEX idx_quiz_answers_submission ON quiz_answers(submission_id);
CREATE INDEX idx_quiz_answers_question ON quiz_answers(question_id);

-- Komentarz: Zadania typu QUIZ będą miały type='QUIZ' w tabeli tasks
-- i będą zawierać pytania w tabeli quiz_questions

