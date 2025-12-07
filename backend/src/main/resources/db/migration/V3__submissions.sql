CREATE TYPE submission_status AS ENUM ('SUBMITTED','GRADED');

CREATE TABLE submissions (
                             id UUID PRIMARY KEY NOT NULL,
                             task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                             student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             content TEXT,                 -- np. link do projektu, opis, itp.
                             status submission_status NOT NULL DEFAULT 'SUBMITTED',
                             points INTEGER,               -- null dopóki nieocenione
                             feedback TEXT,
                             graded_at TIMESTAMP WITHOUT TIME ZONE,
                             graded_by UUID REFERENCES users(id),
                             created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ux_submissions_task_student ON submissions(task_id, student_id);
CREATE INDEX idx_submissions_task ON submissions(task_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
