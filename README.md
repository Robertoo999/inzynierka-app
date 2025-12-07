# ProLearn — system wspomagający naukę programowania (szkoła podstawowa)

Mono-repo:
- `backend/` — Spring Boot 3.3 (Java 21, Maven, JPA, Flyway, PostgreSQL)
- `frontend/` — React + TypeScript (Vite)

## Start (minimalny)
1. Uruchom bazę:
   ```bash
   docker compose up -d db
   ```
2. Backend:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   Zdrowie: `GET http://localhost:8080/api/health`
3. Frontend (dev):
   ```bash
   cd ../frontend
   npm i
   npm run dev
   ```
   Aplikacja: `http://localhost:5173` (pobiera `GET /api/health` z backendu).

## Zmienne środowiskowe
Backend (opcjonalnie):
- `DB_URL` (domyślnie `jdbc:postgresql://localhost:5432/prolearn`)
- `DB_USER` (domyślnie `prolearn`)
- `DB_PASSWORD` (domyślnie `prolearn`)
- `PORT` (domyślnie `8080`)

Frontend:
- `VITE_API_BASE` (domyślnie `http://localhost:8080`)

## Docker
Plik `docker-compose.yml` zawiera **tylko** usługę `db` (PostgreSQL). W kolejnym kroku dodamy usługę `backend` i integrację buildów.

## Licencja
MIT
