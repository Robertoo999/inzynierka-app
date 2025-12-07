-- Ustaw domyślny timestamp i napraw istniejące NULL-e (class_members)
ALTER TABLE class_members
    ALTER COLUMN created_at SET DEFAULT now();

UPDATE class_members
SET created_at = now()
WHERE created_at IS NULL;

-- (opcjonalnie idempotentnie także dla classes – nie zaszkodzi jeśli już jest)
ALTER TABLE classes
    ALTER COLUMN created_at SET DEFAULT now();

UPDATE classes
SET created_at = now()
WHERE created_at IS NULL;
