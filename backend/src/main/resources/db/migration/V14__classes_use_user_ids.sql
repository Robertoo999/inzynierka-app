-- Migracja: zmiana z email na UUID w relacjach klas

-- 1. Dodaj nowe kolumny
ALTER TABLE classes ADD COLUMN owner_id UUID;
ALTER TABLE class_members ADD COLUMN member_id UUID;

-- 2. Wypełnij owner_id na podstawie owner_email
UPDATE classes c
SET owner_id = u.id
FROM users u
WHERE c.owner_email = u.email;

-- 3. Wypełnij member_id na podstawie member_email
UPDATE class_members cm
SET member_id = u.id
FROM users u
WHERE cm.member_email = u.email;

-- 4. Sprawdź czy wszystkie wiersze mają wypełnione UUID (opcjonalnie - można usunąć jeśli nie ma danych)
-- DELETE FROM classes WHERE owner_id IS NULL;
-- DELETE FROM class_members WHERE member_id IS NULL;

-- 5. Ustaw NOT NULL i dodaj foreign keys
ALTER TABLE classes 
    ALTER COLUMN owner_id SET NOT NULL,
    ADD CONSTRAINT fk_classes_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE class_members 
    ALTER COLUMN member_id SET NOT NULL,
    ADD CONSTRAINT fk_class_members_member FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. Usuń stare kolumny i zmień primary key
ALTER TABLE classes DROP COLUMN owner_email;

-- Usuń stary primary key i dodaj nowy
ALTER TABLE class_members DROP CONSTRAINT IF EXISTS class_members_pkey;
ALTER TABLE class_members ADD PRIMARY KEY (class_id, member_id);
ALTER TABLE class_members DROP COLUMN member_email;

