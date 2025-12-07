-- Ensure unique class name per owner (case-insensitive)
-- Create a functional unique index on (owner_id, lower(name))
CREATE UNIQUE INDEX IF NOT EXISTS ux_classes_owner_name_ci
    ON classes (owner_id, lower(name));
