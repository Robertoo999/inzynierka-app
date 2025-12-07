# Zachowanie testów — ProLearn (JS/Python)

Ten dokument podsumowuje działanie uruchamiania i wysyłania zadań programistycznych w aplikacji (uczeń i nauczyciel), wspierane języki oraz zasady walidacji.

## Języki i tryby

- JavaScript: tryby `EVAL` i `IO`.
- Python: tylko tryb `IO` (wymaga usług wykonawczych Judge0).

W `EVAL` wywoływana jest funkcja `solve(input)`, a jej wartość zwrotna porównywana jest z oczekiwanym wynikiem. W `IO` dane trafiają na `stdin`, a sprawdzane jest pełne `stdout`.

## Uczeń — przyciski „Uruchom” i „Wyślij”

- Uruchom:
  - Pokazuje wyłącznie `stdout` programu (bez surowego JSON, błędy prezentowane są przyjaźnie po polsku).
  - Nie wyświetla zestawu testów; służy do szybkiego sprawdzenia działania programu.
  - Linia informacyjna jest neutralna („Program uruchomiony pomyślnie.” lub znormalizowany komunikat błędu).
- Wyślij:
  - Uruchamia testy i pokazuje oddzielny panel „Testy — podsumowanie” (Zaliczone X z Y) z czytelnymi wierszami.
  - Poniżej pokazuje szczegóły tylko testów oznaczonych jako widoczne (Wejście/Oczekiwany/Wynik/Błąd).
  - Konsola (stdout) z „Uruchom” pozostaje bez zmian — wyniki testów są odseparowane.
  - Obsługuje limity prób i blokadę po wysłaniu (komunikaty po polsku).

Sanity i a11y:
- Konsola filtruje „json-like” wyjście, aby uniknąć wycieku surowych struktur.
- Komunikaty błędów są znormalizowane („Musisz być zalogowany…”, „Uruchamianie niedostępne…”, itp.).
- Panele mają `aria-live="polite"`, listy są dostępne z klawiatury.

## Nauczyciel — „Uruchom testy (demo)”

- Wykorzystuje zapisane `teacherSolution` zadania (uczniowie nie mają do niego dostępu).
- Prezentuje wynik w formie „Wyniki testów (demo) — Zaliczono X/Y” oraz skrócone podsumowanie błędów na górze (z możliwością rozwinięcia szczegółów).
- Nie wyświetla surowych struktur ani pełnych JSON-ów; błędy i różnice są czytelnie streszczane.
- Jeśli Python/IO nie jest dostępny (brak `JUDGE0_URL`), UI wyświetla podpowiedź o brakującej konfiguracji.

## Walidacja i bezpieczeństwo

- Backend odrzuca puste testy (jednocześnie puste Wejście i Oczekiwany).
- Python wymusza tryb `IO`; JavaScript domyślnie `EVAL` (możliwy `IO`).
- Suma punktów testów nie może przekroczyć limitu punktów zadania.
- Po stronie edytora nauczyciela testy nie zapisują się automatycznie — obowiązuje ręczny zapis (przycisk „Zapisz zadanie”).

## Wskazówki dla autorów zadań

- Dla trybu `EVAL` w JS wymagaj funkcji `solve(input)` (edytor podpowiada to automatycznie); dla Pythona używaj `IO`.
- Ustaw widoczność testów, aby uczniowie po „Wyślij” widzieli tylko zaakceptowane do ujawnienia przypadki.
- W razie problemów z Pythonem upewnij się, że backend ma `JUDGE0_URL` (np. uruchom przez `docker compose up`).
