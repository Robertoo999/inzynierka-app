ProLearn — Copilot instructions (FINAL)

You are my coding assistant for the ProLearn mono-repo.
Your job: implement features, fix bugs, refactor code, and generate files inside this repo.
Always operate directly on the existing codebase.

Repo layout

backend/ — Spring Boot 3.3 (Java 21, Maven). Main: com.prolearn.ProLearnApplication.

frontend/ — React + TypeScript (Vite). Scripts in frontend/package.json.

docker-compose.yml — services: db (Postgres 16.4) and backend.

Migrations: backend/src/main/resources/db/migration (Flyway). This is the schema source of truth.

Runtime

API is canonical. JPA + Flyway run at startup (application.yml).

Health: GET /api/health.

Security config: backend/src/main/java/com/prolearn/security/SecurityConfig.java.

Code grading:

JS: GraalVM (JsAutoGrader).

Other languages: Judge0 (CodeExecutionService, requires JUDGE0_URL).

Frontend calls API at VITE_API_BASE (default: http://localhost:8080).

Dev flows (PowerShell)

DB only: docker compose up -d db

Backend dev: cd backend; .\mvnw.cmd spring-boot:run

Build JAR: cd backend; .\mvnw.cmd -DskipTests package

Frontend dev: cd frontend; npm i; npm run dev

Full stack: docker compose up --build

Key files

Backend entry: ProLearnApplication.java

Config: backend/src/main/resources/application.yml

Security/JWT: backend/src/main/java/com/prolearn/security/*

Grading:

JS: grading/JsAutoGrader.java

Multi-language: grading/CodeExecutionService.java

Conventions

Flyway: never edit existing migration scripts. Add new VNN__desc.sql.

Schema must match JPA. Hibernate ddl-auto: validate.

Config injected from env:

DB_URL, DB_USER, DB_PASSWORD,

PORT, CORS_ORIGIN,

APP_JWT_SECRET, APP_JWT_EXPIRES_MINUTES,

APP_VERSION,

optional: JUDGE0_URL.

Frontend build: npm run build runs tsc -b && vite build.

Diagnostics

tmp_health.ps1, tmp_login.ps1, etc. for smoke tests.

Examples

Add migration → new VNN__desc.sql, run backend.

Backend tests → cd backend; .\mvnw.cmd test

Frontend tests → cd frontend; npm test

Watch-outs

Do NOT modify existing Flyway scripts.

Keep JPA entities in sync with DB schema.

Set JUDGE0_URL for full code execution support.

Align CORS_ORIGIN with frontend URL.

AI Behavior Rules (important)

RÓB DUŻE KROKI. No micro-questions.

NIE zadawaj pytań. If context is missing → assume the most reasonable option.

Jeśli coś istnieje → użyj tego. Nie duplikuj.

Nie zmieniaj niczego, co już poprawiłeś, chyba że jest to konieczne dla nowego zadania.

Po każdej zmianie — zrób krótkie, 1–2 zdaniowe podsumowanie, bez lania wody.

Jeśli wspominam o klasie/pliku — odszukaj go i pracuj w nim.

Nie usuwaj funkcjonalności, chyba że wyraźnie o to poproszę.

Trzymaj się stylu i konwencji repo (nawet jeśli proszę o coś dziwnego).