let gameA, gameB;
let startingGames = 32;
let roundCounter = 1;
let votes = 0;
let s_round = "1/32 - PIERWSZA RUNDA";
let maxVotesThisRound = 16;

function showMainInterface() {
    document.getElementById('main-menu-screen').style.display = 'none';
    document.getElementById('main-inteface').style.display = 'block';
}

function checkIfNextRound() {
    // Sprawdzamy, czy liczba głosów osiągnęła limit dla danej rundy
    if (votes >= (startingGames / Math.pow(2, roundCounter))) {
        votes = 0;
        roundCounter += 1;
        switch (roundCounter) {
            case 2:
                s_round = "1/16 - DRUGA RUNDA";
                maxVotesThisRound = 8;
                break;
            case 3:
                s_round = "1/8 - ĆWIERĆFINAŁY";
                maxVotesThisRound = 4;
                break;
            case 4:
                s_round = "1/4 - PÓŁFINAŁY";
                maxVotesThisRound = 2;
                break;
            case 5:
                s_round = "1/2 - FINAŁ";
                maxVotesThisRound = 1;
                break; // Dodano brakujący break
            default:
                break;
        }
    }
}

function resetQuizLayout() {
    document.getElementById('quiz').innerHTML = `
            <div class="round">
            <h3 id="round"></h3>
            <p id="maxvotes"></p>
            </div>
                <div class="quiz-wrap">
                    <div class="game-chooser">
                        <div id="p1" class="card" onclick="vote(gameA.id)">
                            <img id="imgA" src="">
                            <h2 id="nameA"></h2>
                            <div class="game-info">
                                <span id="dateA" class="info-badge"></span>
                                <span id="ratingA" class="info-badge"></span>
                            </div>
                            <p id="platformsA" class="platforms-text"></p>
                            <p id="summaryA"></p>
                            <div id="screensA" class="screenshots-container"></div>
                        </div>
                        <h1 class="vs"> VS </h1>
                        <div id="p2" class="card" onclick="vote(gameB.id)">
                            <img id="imgB" src="">
                            <h2 id="nameB"></h2>
                            <div class="game-info">
                                <span id="dateB" class="info-badge"></span>
                                <span id="ratingB" class="info-badge"></span>
                            </div>
                            <p id="platformsB" class="platforms-text"></p>
                            <p id="summaryB"></p>
                            <div id="screensB" class="screenshots-container"></div>
                        </div>
                    </div>
                </div>
                `;
}

async function loadRound() {
    try {
        const res = await fetch('http://localhost:5000/api/quiz/next-round');
        const data = await res.json();

        // 1. Jeśli backend prosi o init (pusty Redis)
        if (data.error === "NEED_INIT") {
            console.log("Redis pusty, restartuję...");
            await restartQuiz();
            return;
        }

        // 2. Jeśli mamy zwycięzcę
        if (data.winner) {
            renderWinner(data.winner);
            return;
        }

        // 3. Sprawdźmy, czy HTML istnieje (np. po powrocie z ekranu zwycięzcy)
        if (!document.getElementById('nameA')) {
            resetQuizLayout();
        }

        // 4. Pobieramy dane graczy
        gameA = data.player1;
        gameB = data.player2;

        // 5. ZABEZPIECZENIE KRYTYCZNE:
        // Jeśli backend zwrócił sukces, ale brakuje danych gier (np. gameA jest null)
        if (!gameA || !gameB) {
            console.warn("Otrzymano niepełną parę gier. Restartuję rundę...", data);
            await restartQuiz();
            return;
        }

        checkIfNextRound();

        // Aktualizacja licznika
        const roundEl = document.getElementById('round');
        const votesEl = document.getElementById('maxvotes');
        if (roundEl) roundEl.innerText = s_round;
        if (votesEl) votesEl.innerText = `${votes + 1}/${maxVotesThisRound}`;

        // Wypełnianie danych
        fillGameData('A', gameA);
        fillGameData('B', gameB);

    } catch (err) {
        console.error("Błąd ładowania rundy:", err);
    }
}

function fillGameData(suffix, game) {
    // Jeśli z jakiegoś powodu gra jest undefined, przerywamy, żeby nie wywalić błędu w konsoli
    if (!game) return;

    const nameEl = document.getElementById(`name${suffix}`);
    if (nameEl) nameEl.innerText = game.name;

    const imgEl = document.getElementById(`img${suffix}`);
    if (imgEl) imgEl.src = game.cover;

    const sumEl = document.getElementById(`summary${suffix}`);
    if (sumEl) sumEl.innerText = game.summary;

    const dateEl = document.getElementById(`date${suffix}`);
    if (dateEl) dateEl.innerText = `📅 ${game.release_date || 'TBA'}`;

    const rateEl = document.getElementById(`rating${suffix}`);
    if (rateEl) rateEl.innerText = `⭐ ${game.rating || 'N/A'}/100`;

    const platEl = document.getElementById(`platforms${suffix}`);
    if (platEl) platEl.innerText = `🎮 ${game.platforms || 'PC'}`;

    // Screenshoty
    const screensDiv = document.getElementById(`screens${suffix}`);
    if (screensDiv) {
        screensDiv.innerHTML = ''; // Wyczyść stare

        if (game.screenshots && Array.isArray(game.screenshots) && game.screenshots.length > 0) {

            // 1. Przycisk "Wstecz"
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '&#10094;'; // Strzałka w lewo
            prevBtn.className = 'gallery-nav prev-btn';
            // Przekazujemy ID kontenera i event
            prevBtn.onclick = (e) => changeSlide(-1, `screens${suffix}`, e);
            screensDiv.appendChild(prevBtn);

            // 2. Obrazki
            game.screenshots.forEach((url, index) => {
                const img = document.createElement('img');
                img.src = url;
                img.className = 'gallery-img';
                // Pierwsze zdjęcie dostaje klasę 'active', reszta jest ukryta
                if (index === 0) img.classList.add('active');
                screensDiv.appendChild(img);
            });

            // 3. Przycisk "Dalej"
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '&#10095;'; // Strzałka w prawo
            nextBtn.className = 'gallery-nav next-btn';
            nextBtn.onclick = (e) => changeSlide(1, `screens${suffix}`, e);
            screensDiv.appendChild(nextBtn);

        } else {
            // Jak nie ma screenów, wyświetl komunikat lub ukryj galerię
            screensDiv.style.display = 'none';
        }
    }
}

// Funkcja obsługująca zmianę slajdów
function changeSlide(direction, containerId, event) {
    // KLUCZOWE: Zatrzymuje kliknięcie, żeby nie oddało głosu na grę!
    event.stopPropagation();

    const container = document.getElementById(containerId);
    const images = container.getElementsByClassName('gallery-img');
    let activeIndex = 0;

    // Znajdź, które zdjęcie jest teraz aktywne
    for (let i = 0; i < images.length; i++) {
        if (images[i].classList.contains('active')) {
            activeIndex = i;
            images[i].classList.remove('active'); // Ukryj obecne
            break;
        }
    }

    // Oblicz nowy indeks (z zapętlaniem: ostatni -> pierwszy, pierwszy -> ostatni)
    let newIndex = activeIndex + direction;
    if (newIndex >= images.length) newIndex = 0;
    if (newIndex < 0) newIndex = images.length - 1;

    // Pokaż nowe zdjęcie
    images[newIndex].classList.add('active');
}

async function vote(id) {
    try {
        await fetch('http://localhost:5000/api/quiz/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winnerId: id })
        });
        votes += 1;
        loadRound();
    } catch (err) {
        console.error("Błąd głosowania:", err);
    }
}

async function restartQuiz() {
    try {
        const res = await fetch('http://localhost:5000/api/quiz/init');
        const data = await res.json();
        if (data.message) {
            // Resetujemy stan lokalny
            roundCounter = 1;
            votes = 0;
            maxVotesThisRound = 16;
            s_round = "1/32 - PIERWSZA RUNDA";

            // Jeśli jesteśmy na ekranie zwycięzcy, musimy przywrócić układ
            if (!document.getElementById('nameA')) {
                resetQuizLayout();
            }

            loadRound();
        }
    } catch (err) {
        console.error("Błąd podczas restartu:", err);
        alert("Nie udało się zrestartować quizu. Sprawdź, czy serwer działa.");
    }
}

function renderWinner(winner) {
    const quizDiv = document.getElementById('quiz');
    quizDiv.innerHTML = `
    <div class="winner" style="text-align: center; padding: 20px;">
        <h1>🏆 Zwycięzca: ${winner.name}!</h1>
        <img src="${winner.cover}" width="300" style="border-radius: 10px; margin: 20px 0;"><br>
        <button id="restartBtn" style="padding: 15px 30px; font-size: 1.2em; cursor: pointer;">Zagraj jeszcze raz</button>
    </div>
    `;

    // POPRAWKA: Przypisujemy funkcję BEZ nawiasów ()
    document.getElementById('restartBtn').onclick = restartQuiz;

    saveWinnerToStats(winner);
    confettiCelebration();
}

async function saveWinnerToStats(winner) {
    try {
        await fetch('http://localhost:5000/api/quiz/final-winner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: winner.id, name: winner.name })
        });
    } catch (err) {
        console.error("Nie udało się zapisać statystyk:", err);
    }
}

async function startApp() {
    console.log("Uruchamianie aplikacji...");
    try {
        await fetch('http://localhost:5000/api/quiz/init');
        showMainInterface();
        loadRound();
    } catch (err) {
        alert("Błąd połączenia z serwerem. Upewnij się, że Docker działa.");
    }
}

function confettiCelebration() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}