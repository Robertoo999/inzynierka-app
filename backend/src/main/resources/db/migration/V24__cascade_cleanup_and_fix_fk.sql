-- Ensure cascades and clean up potential orphans

-- 1) Make lessons.class_id delete cascade to remove lessons when class removed (and downstream via existing cascades)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_lessons_class'
  ) THEN
    ALTER TABLE lessons DROP CONSTRAINT fk_lessons_class;
  END IF;
  ALTER TABLE lessons
    ADD CONSTRAINT fk_lessons_class
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
END $$;

-- 2) lesson_activities.task_id should continue to SET NULL (activities are removed explicitly when task is deleted via API)
--    Keep as-is, but add constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_activities_task'
  ) THEN
    ALTER TABLE lesson_activities
      ADD CONSTRAINT fk_activities_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Best-effort cleanup of historical orphans (if any)
--    Remove submissions without existing task
DELETE FROM submissions s WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = s.task_id);
--    Remove lesson_activities without existing lesson
DELETE FROM lesson_activities a WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.id = a.lesson_id);
--    Remove quiz_attempts without existing activity
DELETE FROM quiz_attempts qa WHERE NOT EXISTS (SELECT 1 FROM lesson_activities la WHERE la.id = qa.activity_id);
--    Remove programming test cases without existing task
DELETE FROM programming_test_cases ptc WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = ptc.task_id);
