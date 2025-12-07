-- Add mode column to programming_test_cases to support EVAL (JS expression) or IO (stdin/stdout)
ALTER TABLE programming_test_cases
    ADD COLUMN IF NOT EXISTS mode VARCHAR(16) NOT NULL DEFAULT 'EVAL';
