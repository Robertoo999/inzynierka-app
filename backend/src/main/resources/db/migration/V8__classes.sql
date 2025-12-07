-- Tabela klas
CREATE TABLE IF NOT EXISTS classes (
                                       id BIGSERIAL PRIMARY KEY,
                                       name TEXT NOT NULL,
                                       join_code VARCHAR(12) NOT NULL UNIQUE,
    owner_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

-- Membership (email jako identyfikator użytkownika)
CREATE TABLE IF NOT EXISTS class_members (
                                             class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    member_email TEXT NOT NULL,
    role VARCHAR(16) NOT NULL, -- 'TEACHER' | 'STUDENT'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, member_email)
    );
