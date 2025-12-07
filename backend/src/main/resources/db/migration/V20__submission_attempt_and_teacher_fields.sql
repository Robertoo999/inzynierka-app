ALTER TABLE submissions ADD COLUMN attempt_number INT;
ALTER TABLE submissions ADD COLUMN manual_score INT;
ALTER TABLE submissions ADD COLUMN teacher_comment VARCHAR(1024);
