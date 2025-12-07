-- Ustaw domyślną wartość i napraw istniejące NULL-e
ALTER TABLE classes
    ALTER COLUMN created_at SET DEFAULT now();

UPDATE classes
SET created_at = now()
WHERE created_at IS NULL;
