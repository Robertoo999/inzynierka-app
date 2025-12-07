-- Lekcja jako moduł – lista aktywności
CREATE TABLE IF NOT EXISTS lesson_activities (
                                                 id UUID PRIMARY KEY,
                                                 lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    a_type VARCHAR(16) NOT NULL,                  -- 'CONTENT' | 'TASK'
    title VARCHAR(200),
    body TEXT,                                     -- JSON jako TEXT (dla CONTENT)
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
CREATE INDEX IF NOT EXISTS idx_activities_lesson
    ON lesson_activities(lesson_id, order_index);
