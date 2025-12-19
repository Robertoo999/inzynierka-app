-- Delete classroom with id=2 and all dependent data (safe-order deletions)
BEGIN;

-- collect lesson IDs
-- NOTE: run this script with a DB user that has appropriate privileges

-- Delete submissions for tasks in lessons of the class
DELETE FROM submissions
WHERE task_id IN (
  SELECT t.id FROM tasks t JOIN lessons l ON t.lesson_id = l.id WHERE l.class_id = 2
);

-- Delete programming test cases for tasks in the class
DELETE FROM programming_test_cases
WHERE task_id IN (
  SELECT t.id FROM tasks t JOIN lessons l ON t.lesson_id = l.id WHERE l.class_id = 2
);

-- Delete lesson activities (which may reference tasks)
DELETE FROM lesson_activities
WHERE lesson_id IN (
  SELECT id FROM lessons WHERE class_id = 2
);

-- Delete tasks in lessons of the class
DELETE FROM tasks
WHERE lesson_id IN (
  SELECT id FROM lessons WHERE class_id = 2
);

-- Delete lessons in the class
DELETE FROM lessons
WHERE class_id = 2;

-- Delete class members
DELETE FROM class_members
WHERE id_class_id = 2 OR ( -- fallback if composite column names differ
      class_id = 2
);

-- Finally delete the classroom row
DELETE FROM classes
WHERE id = 2;

COMMIT;

-- Verify: select * from classes where id=2; should return no rows
