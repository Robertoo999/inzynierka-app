-- Zadania kodowe + wynik automatycznej oceny

ALTER TABLE tasks
    ADD COLUMN type VARCHAR(32) DEFAULT 'CODE' NOT NULL,
  ADD COLUMN language VARCHAR(32) DEFAULT 'javascript' NOT NULL,
  ADD COLUMN starter_code TEXT,
  ADD COLUMN tests TEXT,
  ADD COLUMN grading_mode VARCHAR(32) DEFAULT 'AUTO' NOT NULL;

ALTER TABLE submissions
    ADD COLUMN code TEXT,
  ADD COLUMN test_report JSONB,
  ADD COLUMN auto_score INT,
  ADD COLUMN stdout TEXT;
