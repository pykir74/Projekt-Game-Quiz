# Game Tournament Quiz Application

Aplikacja pozwala na wzięcie udziału w turnieju, w którym wybieramy najciekawszą grę spośród 32 wybranych tytułów pobranych z API IGDB.

## Technologie
* **Frontend:** HTML5, JavaScript (Fetch API)
* **Backend:** Node.js (Express)
* **Baza danych:** MongoDB (statystyki zwycięzców)
* **Cache/Session:** Redis (stan aktualnego turnieju)
* **Konteneryzacja:** Docker & Docker Compose

## Uruchomienie
1. Skopiuj plik `data.env` do folderu głównego i uzupełnij klucze API IGDB.
2. Uruchom aplikację komendą:
   ```bash
   docker-compose up --build