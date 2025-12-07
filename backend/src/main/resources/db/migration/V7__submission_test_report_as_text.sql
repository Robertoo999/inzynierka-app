-- V7__submission_test_report_as_text.sql  (przykładowa nazwa)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='submissions' AND column_name='test_report' AND data_type='jsonb'
  ) THEN
ALTER TABLE submissions
ALTER COLUMN test_report TYPE TEXT USING test_report::text;
END IF;
END $$;
