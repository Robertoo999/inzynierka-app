-- Create table to store quiz attempts by students
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id uuid NOT NULL REFERENCES lesson_activities(id) ON DELETE CASCADE,
    student_id uuid NOT NULL,
    correct integer NOT NULL,
    total integer NOT NULL,
    points integer NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);
