-- V11__lesson_belongs_to_class.sql

-- 1) Dodaj kolumnę (może być NULL na start)
ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS class_id BIGINT;

-- 2) (opcjonalnie) indeks pod zapytania
CREATE INDEX IF NOT EXISTS idx_lessons_class_id ON lessons(class_id);

-- 3) Dodaj FK tylko jeśli jeszcze go nie ma
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_lessons_class'
  ) THEN
ALTER TABLE lessons
    ADD CONSTRAINT fk_lessons_class
        FOREIGN KEY (class_id) REFERENCES classes(id);
END IF;
END$$;
