# Plan Rozwoju ProLearn - System Wspomagający Naukę Programowania

## 1. ANALIZA OBECNEGO STANU

### 1.1. Główne Funkcjonalności (Co już działa)

#### Backend (Spring Boot):
- **Autentykacja i autoryzacja:**
  - Rejestracja i logowanie (JWT)
  - Role: STUDENT, TEACHER
  - Security z filtrami JWT
  
- **Zarządzanie klasami:**
  - Tworzenie klas przez nauczyciela
  - Dołączanie uczniów przez kod (join_code)
  - Członkostwo w klasach (ClassMember)
  - Relacje UUID zamiast email (naprawione)

- **Lekcje:**
  - Tworzenie lekcji w klasie
  - Edycja i usuwanie lekcji
  - System aktywności (LessonActivity):
    - CONTENT - bloki treści (markdown, obraz, embed)
    - TASK - powiązanie z zadaniem
  - Kolejność aktywności (orderIndex)

- **Zadania programistyczne:**
  - Tworzenie zadań (Task) z kodem startowym
  - Typ: CODE
  - Język: javascript
  - Tryb oceniania: AUTO (GraalVM Polyglot)
  - Testy jako asserty JavaScript

- **Zgłoszenia (Submissions):**
  - Wysyłanie rozwiązań przez uczniów
  - Auto-grading dla JavaScript
  - Ocenianie ręczne przez nauczyciela
  - Status: SUBMITTED, GRADED, REJECTED
  - Feedback i punkty

#### Frontend (React + TypeScript):
- **Strona główna (ClassesPage):**
  - Logowanie/rejestracja
  - Lista klas użytkownika
  - Tworzenie klas (nauczyciel)
  - Dołączanie do klas (uczeń)

- **Strona klasy (ClassPage):**
  - Lista lekcji
  - Tworzenie lekcji (nauczyciel)
  - Edycja/usuwanie lekcji
  - System aktywności:
    - Sidebar z listą aktywności
    - Główny obszar z treścią/zadaniem
    - Tworzenie bloków CONTENT i TASK
    - Przenoszenie aktywności (↑↓)

- **Zadania:**
  - Edytor kodu dla uczniów (prosty textarea)
  - Wyświetlanie zgłoszeń dla nauczyciela
  - Ocenianie zgłoszeń

### 1.2. Największe Problemy / Braki

#### Funkcjonalne:
1. **Brak zadań typu QUIZ** - tylko zadania programistyczne
2. **Brak systemu punktów/odznak** - tylko podstawowe punkty za zadania
3. **Brak statystyk i raportów:**
   - Brak podglądu postępów ucznia
   - Brak statystyk dla nauczyciela (średnie, wykresy)
   - Brak historii zgłoszeń
4. **Brak zarządzania uczniami:**
   - Nie można usunąć ucznia z klasy
   - Brak listy członków klasy
   - Brak widoku szczegółów ucznia
5. **Ograniczony edytor treści:**
   - Brak edytora markdown z podglądem
   - Brak uploadu obrazów (tylko URL)
   - Podstawowe renderowanie markdown
6. **Brak walidacji i feedbacku:**
   - Brak walidacji formularzy po stronie frontendu
   - Ograniczone komunikaty błędów
   - Brak potwierdzeń akcji

#### UX / Dostępność:
1. **Słaby edytor kodu:**
   - Zwykły textarea zamiast edytora z podświetlaniem
   - Brak podglądu stdout/testów dla uczniów
   - Brak wizualizacji wyników auto-gradingu
2. **Problemy z dostępnością:**
   - Brak etykiet ARIA
   - Brak obsługi klawiatury (focus, tab order)
   - Niskie kontrasty w niektórych miejscach
   - Brak komunikatów dla screen readerów
3. **Słaba nawigacja:**
   - Brak breadcrumbs
   - Ograniczone menu nawigacyjne
   - Brak wskaźników postępu
4. **Problemy z responsywnością:**
   - Layout może być lepszy na mobile
   - Modal może być za duży na małych ekranach

#### Techniczne:
1. **Brak testów:**
   - Brak unit testów
   - Brak integration testów
   - Brak testów frontendu
2. **Ograniczona walidacja backend:**
   - Niektóre DTO bez @Valid
   - Brak custom validators
3. **Brak dokumentacji API:**
   - SpringDoc OpenAPI jest w zależnościach, ale nie skonfigurowany
4. **Problemy z architekturą:**
   - Duplikacja logiki (np. tworzenie lekcji w dwóch kontrolerach)
   - Brak serwisów dla niektórych operacji
   - Mieszanie logiki biznesowej z kontrolerami

#### Bezpieczeństwo:
1. **Brak rate limiting**
2. **Brak weryfikacji uprawnień w niektórych miejscach**
3. **Brak sanitizacji inputów (XSS)**

---

## 2. DOCELOWY KSZTAŁT SYSTEMU

### 2.1. Role
- **Uczeń (STUDENT):**
  - Dołączanie do klas
  - Przeglądanie lekcji
  - Rozwiązywanie zadań (CODE, QUIZ)
  - Podgląd swoich wyników i postępów
  - Historia zgłoszeń

- **Nauczyciel (TEACHER):**
  - Tworzenie i zarządzanie klasami
  - Dodawanie/usuwanie uczniów z klas
  - Tworzenie i edycja lekcji
  - Tworzenie zadań (CODE, QUIZ)
  - Ocenianie zgłoszeń
  - Statystyki klasy i uczniów
  - Raporty postępów

- **Admin (opcjonalnie):**
  - Zarządzanie użytkownikami
  - Zarządzanie klasami globalnie
  - Statystyki systemowe

### 2.2. Podstawowe Moduły

#### 2.2.1. Zarządzanie Klasami i Uczniami
- Lista klas użytkownika
- Tworzenie klas z unikalnym kodem
- Dołączanie uczniów przez kod
- Lista członków klasy
- Usuwanie uczniów z klasy
- Szczegóły ucznia (postępy, statystyki)

#### 2.2.2. Tworzenie i Edycja Lekcji / Zestawów Zadań
- **Lekcje:**
  - Tytuł, opis
  - Lista aktywności w kolejności
  - Typy aktywności:
    - **CONTENT** - treść edukacyjna (markdown, obrazy, video)
    - **TASK_CODE** - zadanie programistyczne
    - **TASK_QUIZ** - quiz/pytania
  - Publikacja/ukrycie lekcji
  - Duplikowanie lekcji

- **Zestawy zadań:**
  - Grupowanie zadań w zestawy
  - Możliwość przypisania zestawu do lekcji

#### 2.2.3. Zadania Programistyczne (CODE)
- Edytor kodu z podświetlaniem składni
- Języki: JavaScript (na start, później Python)
- Kod startowy
- Testy automatyczne
- Auto-grading z wynikami
- Podgląd stdout
- Limit czasu wykonania
- Historia prób

#### 2.2.4. Zadania typu Quiz / Pytania Jednokrotnego Wyboru
- Pytanie tekstowe
- 2-6 opcji odpowiedzi
- Jedna poprawna odpowiedź
- Punkty za poprawną odpowiedź
- Wyjaśnienie po odpowiedzi (opcjonalnie)
- Możliwość losowej kolejności opcji

#### 2.2.5. Podgląd Postępów Ucznia
- **Dla ucznia:**
  - Lista zadań z statusem (nie rozpoczęte, w toku, ukończone)
  - Punkty za zadania
  - Wykres postępów w czasie
  - Odznaki/osiągnięcia
  - Ranking w klasie (opcjonalnie)

- **Dla nauczyciela:**
  - Statystyki klasy (średnie, rozkład punktów)
  - Lista uczniów z postępami
  - Szczegóły ucznia (wszystkie zgłoszenia, historia)
  - Wykresy i raporty
  - Eksport danych (CSV)

#### 2.2.6. System Punktów / Odznak (Prosty)
- Punkty za zadania (już jest)
- Odznaki za osiągnięcia:
  - "Pierwsze kroki" - pierwsze zadanie ukończone
  - "Perfekcjonista" - 100% punktów w zadaniu
  - "Wytrwały" - 10 zadań ukończonych
  - "Mistrz" - wszystkie zadania w lekcji ukończone
- Prosty ranking (bez przesadnego gamifikowania)
- Wizualizacja odznak na profilu

### 2.3. Wzorce z Platform Edukacyjnych

**Inspiracje:**
- **Scratch:** Wizualny, intuicyjny interfejs, blokowa struktura
- **Code.org:** Proste, krokowe lekcje, wizualne wskazówki
- **Khan Academy:** System punktów, odznaki, postępy
- **Duolingo:** Proste, czytelne interfejsy, natychmiastowy feedback

**Zasady:**
- Prosty, czytelny język (dla uczniów podstawówki)
- Duże, wyraźne przyciski
- Natychmiastowy feedback
- Wizualne wskaźniki postępu
- Minimalizm - nie przytłaczać opcjami

---

## 3. SZCZEGÓŁOWY PLAN PRAC (BACKLOG)

### KROK 1: Refaktoryzacja i Porządki Techniczne (Backend)
**Opis:** Uporządkowanie kodu backendu, poprawa architektury, dodanie brakujących serwisów.

**Zadania:**
- Utworzenie `LessonService` - przeniesienie logiki z kontrolerów
- Utworzenie `ClassService` - logika zarządzania klasami
- Utworzenie `TaskService` - rozszerzenie istniejącego
- Dodanie walidacji DTO (@Valid, custom validators)
- Ujednolicenie obsługi błędów
- Dodanie dokumentacji API (SpringDoc OpenAPI)
- Refaktoryzacja duplikacji kodu

**Pliki do zmiany:**
- `backend/src/main/java/com/prolearn/lesson/LessonService.java` (nowy)
- `backend/src/main/java/com/prolearn/classes/ClassService.java` (nowy)
- `backend/src/main/java/com/prolearn/task/TaskService.java` (rozszerzenie)
- Wszystkie kontrolery (refaktoryzacja)
- `backend/src/main/java/com/prolearn/api/ApiExceptionHandler.java` (rozszerzenie)

---

### KROK 2: Model i API dla Zadań Quiz (Backend)
**Opis:** Dodanie wsparcia dla zadań typu quiz z pytaniami jednokrotnego wyboru.

**Zadania:**
- Rozszerzenie encji `Task` o pole `questionType` (CODE, QUIZ)
- Utworzenie encji `QuizQuestion` (pytanie, opcje, poprawna odpowiedź)
- Utworzenie encji `QuizAnswer` (odpowiedź ucznia)
- API endpointy:
  - `POST /api/lessons/{id}/tasks/quiz` - tworzenie quizu
  - `GET /api/tasks/{id}/quiz` - pobranie quizu
  - `POST /api/tasks/{id}/quiz/submit` - wysłanie odpowiedzi
- Rozszerzenie `Submission` o odpowiedzi quizowe
- Migracja bazy danych V15

**Pliki do utworzenia/zmiany:**
- `backend/src/main/java/com/prolearn/task/QuizQuestion.java` (nowy)
- `backend/src/main/java/com/prolearn/task/QuizAnswer.java` (nowy)
- `backend/src/main/java/com/prolearn/task/QuizController.java` (nowy)
- `backend/src/main/java/com/prolearn/task/Task.java` (rozszerzenie)
- `backend/src/main/java/com/prolearn/submission/Submission.java` (rozszerzenie)
- `backend/src/main/resources/db/migration/V15__quiz_tasks.sql` (nowy)

---

### KROK 3: API Zarządzania Uczniami w Klasie (Backend)
**Opis:** Endpointy do zarządzania członkami klasy.

**Zadania:**
- `GET /api/classes/{id}/members` - lista członków klasy
- `GET /api/classes/{id}/members/{userId}` - szczegóły członka
- `DELETE /api/classes/{id}/members/{userId}` - usunięcie członka (nauczyciel)
- `GET /api/classes/{id}/members/me` - sprawdzenie członkostwa
- Walidacja uprawnień (tylko nauczyciel może usuwać)

**Pliki do utworzenia/zmiany:**
- `backend/src/main/java/com/prolearn/classes/ClassMembersController.java` (nowy)
- `backend/src/main/java/com/prolearn/classes/dto/ClassMemberDto.java` (nowy)
- `backend/src/main/java/com/prolearn/classes/ClassController.java` (możliwe rozszerzenie)

---

### KROK 4: API Statystyk i Raportów (Backend)
**Opis:** Endpointy do pobierania statystyk i raportów.

**Zadania:**
- `GET /api/classes/{id}/stats` - statystyki klasy (średnie, rozkład)
- `GET /api/students/{id}/stats` - statystyki ucznia
- `GET /api/students/{id}/progress` - postępy ucznia (wykresy)
- `GET /api/tasks/{id}/stats` - statystyki zadania
- `GET /api/lessons/{id}/stats` - statystyki lekcji
- DTO dla statystyk

**Pliki do utworzenia:**
- `backend/src/main/java/com/prolearn/stats/StatsController.java` (nowy)
- `backend/src/main/java/com/prolearn/stats/StatsService.java` (nowy)
- `backend/src/main/java/com/prolearn/stats/dto/` (DTO)

---

### KROK 5: System Odznak (Backend)
**Opis:** Prosty system odznak za osiągnięcia.

**Zadania:**
- Encja `Badge` (nazwa, opis, ikona, warunek)
- Encja `UserBadge` (użytkownik, odznaka, data otrzymania)
- Serwis `BadgeService` - automatyczne przyznawanie odznak
- `GET /api/my/badges` - odznaki użytkownika
- `GET /api/students/{id}/badges` - odznaki ucznia (nauczyciel)
- Migracja V16

**Pliki do utworzenia:**
- `backend/src/main/java/com/prolearn/badge/Badge.java`
- `backend/src/main/java/com/prolearn/badge/UserBadge.java`
- `backend/src/main/java/com/prolearn/badge/BadgeService.java`
- `backend/src/main/java/com/prolearn/badge/BadgeController.java`
- `backend/src/main/resources/db/migration/V16__badges.sql`

---

### KROK 6: Usprawnienia UX - Edytor Kodu (Frontend)
**Opis:** Zastąpienie textarea profesjonalnym edytorem kodu.

**Zadania:**
- Instalacja Monaco Editor lub CodeMirror
- Komponent `CodeEditor` z podświetlaniem składni
- Obsługa JavaScript (później Python)
- Integracja z istniejącym `StudentEditor`
- Podgląd stdout i wyników testów
- Wizualizacja wyników auto-gradingu (passed/failed)

**Pliki do utworzenia/zmiany:**
- `frontend/src/components/CodeEditor.tsx` (nowy)
- `frontend/src/components/TestResults.tsx` (nowy)
- `frontend/src/pages/ClassPage.tsx` (zmiana StudentEditor)
- `frontend/package.json` (dodanie zależności)

---

### KROK 7: Interfejs Quiz (Frontend)
**Opis:** Komponenty do rozwiązywania i tworzenia quizów.

**Zadania:**
- Komponent `QuizViewer` - wyświetlanie quizu dla ucznia
- Komponent `QuizCreator` - tworzenie quizu (nauczyciel)
- Komponent `QuizEditor` - edycja quizu
- Walidacja odpowiedzi
- Wyświetlanie wyników po odpowiedzi
- Integracja z `CreateActivity` i `TaskActivity`

**Pliki do utworzenia:**
- `frontend/src/components/QuizViewer.tsx`
- `frontend/src/components/QuizCreator.tsx`
- `frontend/src/components/QuizEditor.tsx`
- `frontend/src/pages/ClassPage.tsx` (integracja)
- `frontend/src/api.ts` (rozszerzenie API)

---

### KROK 8: Strona Zarządzania Uczniami (Frontend)
**Opis:** Interfejs do zarządzania członkami klasy.

**Zadania:**
- Strona `ClassMembersPage.tsx`
- Lista członków z podstawowymi info
- Przycisk usuwania (nauczyciel)
- Link do szczegółów ucznia
- Filtrowanie i wyszukiwanie
- Routing: `/classes/:classId/members`

**Pliki do utworzenia:**
- `frontend/src/pages/ClassMembersPage.tsx`
- `frontend/src/App.tsx` (routing)
- `frontend/src/api.ts` (API calls)

---

### KROK 9: Strona Statystyk i Postępów (Frontend)
**Opis:** Wizualizacja statystyk i postępów.

**Zadania:**
- Strona `StudentStatsPage.tsx` - dla ucznia
- Strona `ClassStatsPage.tsx` - dla nauczyciela
- Komponenty wykresów (Chart.js lub Recharts)
- Wykresy:
  - Postępy w czasie (linia)
  - Rozkład punktów (słupki)
  - Ukończone zadania (kołowy)
- Tabela zadań ze statusami
- Routing

**Pliki do utworzenia:**
- `frontend/src/pages/StudentStatsPage.tsx`
- `frontend/src/pages/ClassStatsPage.tsx`
- `frontend/src/components/ProgressChart.tsx`
- `frontend/src/components/StatsTable.tsx`
- `frontend/package.json` (Chart.js/Recharts)
- `frontend/src/App.tsx` (routing)

---

### KROK 10: System Odznak (Frontend)
**Opis:** Wyświetlanie i zarządzanie odznakami.

**Zadania:**
- Komponent `BadgeList` - lista odznak użytkownika
- Komponent `BadgeCard` - pojedyncza odznaka
- Strona `MyBadgesPage.tsx` - profil z odznakami
- Wizualizacja odznak na stronie statystyk
- Ikony/emoji dla odznak
- Routing

**Pliki do utworzenia:**
- `frontend/src/components/BadgeList.tsx`
- `frontend/src/components/BadgeCard.tsx`
- `frontend/src/pages/MyBadgesPage.tsx`
- `frontend/src/api.ts` (API calls)

---

### KROK 11: Usprawnienia Edytora Treści (Frontend)
**Opis:** Lepszy edytor markdown z podglądem.

**Zadania:**
- Instalacja edytora markdown (np. react-markdown-editor-lite)
- Komponent `MarkdownEditor` z podglądem
- Upload obrazów (opcjonalnie - integracja z backendem)
- Lepsze renderowanie markdown (react-markdown)
- Obsługa embed (YouTube, Vimeo)
- Integracja z `CreateActivity` i `EditActivity`

**Pliki do utworzenia/zmiany:**
- `frontend/src/components/MarkdownEditor.tsx`
- `frontend/src/components/ContentViewer.tsx` (ulepszenie)
- `frontend/src/pages/ClassPage.tsx` (integracja)
- `frontend/package.json` (zależności)

---

### KROK 12: Dostępność - ARIA i Semantyka (Frontend)
**Opis:** Poprawa dostępności zgodnie z WCAG.

**Zadania:**
- Dodanie etykiet ARIA do wszystkich formularzy
- Poprawa semantyki HTML (header, nav, main, aside, footer)
- Dodanie `aria-label` do przycisków bez tekstu
- Poprawa focus management
- Dodanie `role` attributes
- Testy z screen readerem

**Pliki do zmiany:**
- Wszystkie komponenty React
- `frontend/src/pages/ClassesPage.tsx`
- `frontend/src/pages/ClassPage.tsx`
- `frontend/src/App.tsx`

---

### KROK 13: Dostępność - Kolory i Kontrast (Frontend)
**Opis:** Poprawa kontrastów i obsługi kolorów.

**Zadania:**
- Sprawdzenie wszystkich kontrastów (WCAG AA minimum)
- Poprawa kolorów tekstu na tle
- Dodanie trybu wysokiego kontrastu (opcjonalnie)
- Nie poleganie tylko na kolorach (dodanie ikon/tekstu)
- Poprawa focus indicators
- Testy z narzędziami dostępności

**Pliki do zmiany:**
- `frontend/src/styles.css` (głównie)
- Wszystkie komponenty z inline styles

---

### KROK 14: Walidacja Formularzy (Frontend)
**Opis:** Walidacja po stronie klienta.

**Zadania:**
- Instalacja biblioteki walidacji (react-hook-form + zod)
- Walidacja formularza logowania/rejestracji
- Walidacja tworzenia lekcji
- Walidacja tworzenia zadań
- Walidacja quizów
- Komunikaty błędów po polsku
- Wizualne wskaźniki błędów

**Pliki do utworzenia/zmiany:**
- `frontend/src/hooks/useFormValidation.ts` (nowy)
- `frontend/src/pages/ClassesPage.tsx` (walidacja)
- `frontend/src/pages/ClassPage.tsx` (walidacja)
- `frontend/package.json` (zależności)

---

### KROK 15: Komunikaty i Feedback (Frontend)
**Opis:** System powiadomień i komunikatów.

**Zadania:**
- Komponent `Toast` dla powiadomień
- Komponent `ConfirmDialog` dla potwierdzeń
- Context dla globalnych komunikatów
- Komunikaty sukcesu/błędu/info
- Auto-ukrywanie komunikatów
- Dostępność komunikatów (aria-live)

**Pliki do utworzenia:**
- `frontend/src/components/Toast.tsx`
- `frontend/src/components/ConfirmDialog.tsx`
- `frontend/src/contexts/NotificationContext.tsx`
- Integracja w komponentach

---

### KROK 16: Nawigacja i Layout (Frontend)
**Opis:** Ulepszenie nawigacji i layoutu.

**Zadania:**
- Komponent `Navigation` z menu
- Breadcrumbs
- Wskaźniki postępu (progress bars)
- Lepszy header z logo
- Footer z informacjami
- Responsywny layout
- Mobile menu

**Pliki do utworzenia/zmiany:**
- `frontend/src/components/Navigation.tsx`
- `frontend/src/components/Breadcrumbs.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/App.tsx` (layout)
- `frontend/src/styles.css` (responsive)

---

### KROK 17: Upload Obrazów (Backend + Frontend)
**Opis:** Możliwość uploadu obrazów zamiast tylko URL.

**Zadania:**
- Endpoint `POST /api/upload/image` (backend)
- Przechowywanie plików (lokalnie lub S3)
- Walidacja typów i rozmiarów
- Endpoint `GET /api/images/{id}` - pobieranie
- Komponent `ImageUpload` (frontend)
- Integracja z `MarkdownEditor`

**Pliki do utworzenia:**
- `backend/src/main/java/com/prolearn/upload/UploadController.java`
- `backend/src/main/java/com/prolearn/upload/FileStorageService.java`
- `frontend/src/components/ImageUpload.tsx`
- Migracja (opcjonalnie - tabela dla metadanych)

---

### KROK 18: Testy Backend (Backend)
**Opis:** Dodanie testów jednostkowych i integracyjnych.

**Zadania:**
- Unit testy dla serwisów
- Integration testy dla kontrolerów
- Testy bezpieczeństwa (autoryzacja)
- Testy walidacji
- Testy auto-gradingu
- Konfiguracja testów (JUnit 5, Mockito)

**Pliki do utworzenia:**
- `backend/src/test/java/com/prolearn/...` (struktura testów)
- `backend/pom.xml` (zależności testowe)

---

### KROK 19: Dokumentacja i README (Ogólne)
**Opis:** Dokumentacja projektu.

**Zadania:**
- Aktualizacja README.md
- Dokumentacja API (SpringDoc)
- Instrukcje instalacji
- Przewodnik dla nauczycieli
- Przewodnik dla uczniów
- Dokumentacja techniczna

**Pliki do utworzenia/zmiany:**
- `README.md` (aktualizacja)
- `docs/` (folder z dokumentacją)
- `docs/TEACHER_GUIDE.md`
- `docs/STUDENT_GUIDE.md`

---

### KROK 20: Optymalizacja i Performance (Backend + Frontend)
**Opis:** Optymalizacja wydajności.

**Zadania:**
- Lazy loading komponentów (frontend)
- Code splitting
- Cache dla API calls (frontend)
- Optymalizacja zapytań JPA (backend)
- Indeksy w bazie danych
- Paginacja dla list
- Debouncing w formularzach

**Pliki do zmiany:**
- Wszystkie komponenty React (lazy loading)
- Repozytoria (paginacja)
- `frontend/src/api.ts` (cache)
- Migracje (indeksy)

---

## 4. PRIORYTETYZACJA

### Wysoki Priorytet (MVP):
- KROK 1: Refaktoryzacja backend
- KROK 2: Quiz backend
- KROK 6: Edytor kodu
- KROK 7: Quiz frontend
- KROK 12: Dostępność ARIA
- KROK 13: Kontrasty

### Średni Priorytet:
- KROK 3: Zarządzanie uczniami
- KROK 4: Statystyki
- KROK 9: Strona statystyk
- KROK 11: Edytor markdown
- KROK 14: Walidacja
- KROK 15: Komunikaty

### Niski Priorytet (Nice to have):
- KROK 5: Odznaki
- KROK 10: Odznaki frontend
- KROK 17: Upload obrazów
- KROK 18: Testy
- KROK 19: Dokumentacja
- KROK 20: Optymalizacja

---

## 5. UWAGI

- Każdy krok powinien być realizowany niezależnie
- Po każdym kroku testować funkcjonalność
- Commity powinny być atomowe (jeden krok = jeden commit lub kilka małych)
- Przed każdym krokiem sprawdzić czy nie ma konfliktów z poprzednimi zmianami
- W razie problemów - zatrzymać się i skonsultować

---

**Data utworzenia:** 2025-11-07
**Wersja:** 1.0

