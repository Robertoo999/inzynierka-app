INSERT INTO users (id, email, password_hash, role)
VALUES (
           '11111111-1111-1111-1111-111111111111',
           'dev@example.com',
           '$2a$10$WSTAW_TUTAJ_HASH_BCRYPT_BEZ_PREFIKSU',
           'TEACHER'
       )
    ON CONFLICT (email) DO UPDATE
                               SET password_hash = EXCLUDED.password_hash,
                               role          = EXCLUDED.role;
