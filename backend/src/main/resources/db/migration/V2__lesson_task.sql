CREATE TABLE lessons (
                         id UUID PRIMARY KEY NOT NULL,
                         title VARCHAR(200) NOT NULL,
                         content TEXT NOT NULL,
                         created_by UUID NOT NULL REFERENCES users(id),
                         created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
                       id UUID PRIMARY KEY NOT NULL,
                       lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
                       title VARCHAR(200) NOT NULL,
                       description TEXT,
                       max_points INTEGER NOT NULL DEFAULT 1,
                       created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- proste wskaźniki
CREATE INDEX idx_tasks_lesson ON tasks(lesson_id);
