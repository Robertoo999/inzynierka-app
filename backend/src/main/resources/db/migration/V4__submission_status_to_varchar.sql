-- 1) Usuń domyślną wartość (to ona trzyma zależność do typu ENUM)
ALTER TABLE submissions
    ALTER COLUMN status DROP DEFAULT;

-- 2) Zmień typ kolumny z ENUM na VARCHAR przy użyciu castu
ALTER TABLE submissions
ALTER COLUMN status TYPE VARCHAR(16) USING status::text;

-- 3) Ustaw nowy DEFAULT już jako tekst
ALTER TABLE submissions
    ALTER COLUMN status SET DEFAULT 'SUBMITTED';

-- 4) (opcjonalnie) Dodaj constraint na dozwolone wartości
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_submissions_status'
  ) THEN
ALTER TABLE submissions
    ADD CONSTRAINT chk_submissions_status
        CHECK (status IN ('SUBMITTED','GRADED'));
END IF;
END $$;

-- 5) Usuń typ ENUM, ale dopiero gdy nic go już nie używa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    -- na tym etapie nie ma już zależności, więc CASCADE nie powinno być potrzebne
DROP TYPE submission_status;
END IF;
END $$;
