

CREATE TABLE users (
                       id UUID PRIMARY KEY NOT NULL,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(20) NOT NULL,
                       created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

