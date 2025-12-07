-- kolumny jeśli nie istnieją
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS type varchar(32) NOT NULL DEFAULT 'CODE',
    ADD COLUMN IF NOT EXISTS language varchar(32) NOT NULL DEFAULT 'javascript',
    ADD COLUMN IF NOT EXISTS starter_code text,
    ADD COLUMN IF NOT EXISTS tests text,
    ADD COLUMN IF NOT EXISTS grading_mode varchar(32) NOT NULL DEFAULT 'AUTO';

CREATE INDEX IF NOT EXISTS idx_tasks_lesson_created
    ON tasks(lesson_id, created_at);
