# Game Tournament Quiz Application 🎮

A web application based on a "Tournament Bracket" system that allows users to select the best game from 32 random titles fetched from the IGDB API. The project utilizes a microservices architecture based on Docker containers.

## Key Features
* **Tournament System:** Automatic generation of rounds (1/32, 1/16, Quarter-finals, etc.).
* **Screenshot Gallery:** An interactive slider with navigation arrows inside game cards that prevents accidental voting.
* **Hall of Fame:** A history of winners displayed on the main page, persisted in MongoDB.
* **Player's Journal:** Ability to rate won games (scale 1-100), mark them as "Played", and write custom reviews.
* **State Persistence:** Redis is used to cache the current tournament progress, preventing data loss upon page refresh.

## Technologies
* **Frontend:** HTML5, CSS3 (Flexbox/Grid), JavaScript ES6 Modules.
* **Backend:** Node.js (Express.js).
* **Databases:** * **MongoDB:** Persistent storage for winners' statistics, ratings, and reviews.
    * **Redis:** High-performance cache for managing the tournament queue and session state.
* **Containerization:** Docker & Docker Compose.

## Modular Structure (Frontend)
The application is divided into modules to improve readability and maintainability:
* `api.js`: Handles backend communication using the Fetch API.
* `ui.js`: Manages DOM rendering, interface updates, and the gallery system.
* `script.js`: Controls the business logic, tournament flow, and application state.

## Setup & Installation
1. Copy the `data.env` file to the root directory and provide your IGDB API credentials:
   ```env
   CLIENT_ID=your_client_id
   ACCESS_TOKEN=your_access_token
2. Launch the entire stack using Docker:
   ```sh
   docker-compose up --build
   ```
3. The application will be available at: http://localhost:3000.

## Database Management
To connect to the MongoDB database (e.g., via MongoDB Compass):
* Connection String: mongodb://admin:password123@localhost:27017/gamequiz?authSource=admin
* Wiping the database via Terminal:
  ```sh
   docker exec -it game_quiz_db mongosh -u admin -p password123 --authenticationDatabase admin
   use test
   db.gamestats.deleteMany({})
  ```

## User Manual
1. Click Start Quiz to begin a new tournament.
2. Choose your preferred game by clicking on its card. You can browse screenshots using the arrows (clicking arrows does not register a vote).
3. After the final, you can return to the Main Page to see the winner in the Hall of Fame.
4. Enter your review, set a score (1-100), and click Save Changes to update the database.
