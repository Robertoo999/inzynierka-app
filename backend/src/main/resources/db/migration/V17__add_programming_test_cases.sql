-- Add programming test cases table
CREATE TABLE IF NOT EXISTS programming_test_cases (
    id uuid PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    input_text text,
    expected_text text,
    visible boolean NOT NULL DEFAULT true,
    points integer NOT NULL DEFAULT 0,
    ordering integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_programming_test_cases_task_id ON programming_test_cases(task_id);
