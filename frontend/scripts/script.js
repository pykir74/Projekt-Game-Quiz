import * as api from './api.js';
import * as ui from './ui.js';

let gameA, gameB;
let startingGames = 32, roundCounter = 1, votes = 0;
let s_round = "1/32 - PIERWSZA RUNDA", maxVotesThisRound = 16;

// Wystawiamy funkcje do okna, by HTML mógł je wywołać
window.startApp = startApp;
window.restartQuiz = restartQuiz;

async function startApp() {
    await api.initQuiz();
    ui.showMainInterface();
    await loadRound();
}

async function loadRound() {
    const data = await api.getNextRound();
    if (data.error === "NEED_INIT") return restartQuiz();
    if (data.winner) return showWinner(data.winner);

    // 1. NAJPIERW upewnij się, że layout istnieje
    if (!document.getElementById('nameA')) {
        // Przekazujemy aktualny stan rundy do szablonu
        ui.resetLayout(s_round, `${votes + 1}/${maxVotesThisRound}`);
    }

    gameA = data.player1;
    gameB = data.player2;

    // 2. Aktualizujemy status (logika rund)
    updateRoundStatus();

    // 3. Aktualizujemy napisy
    ui.updateRoundDisplay(s_round, `${votes + 1}/${maxVotesThisRound}`);

    // 4. Wypełniamy karty danymi
    ui.fillCard('A', gameA, changeSlide);
    ui.fillCard('B', gameB, changeSlide);

    // 5. DOPIERO TERAZ podpinamy eventy, bo mamy pewność, że p1 i p2 istnieją
    const card1 = document.getElementById('p1');
    const card2 = document.getElementById('p2');

    if (card1 && card2) {
        card1.onclick = () => castVote(gameA.id);
        card2.onclick = () => castVote(gameB.id);
    }
}

async function castVote(id) {
    await api.postVote(id);
    votes++;
    await loadRound();
}

function updateRoundStatus() {
    if (votes >= (startingGames / Math.pow(2, roundCounter))) {
        votes = 0;
        roundCounter++;
        const rounds = { 2: "1/16 - DRUGA RUNDA", 3: "1/8 - ĆWIERĆFINAŁY", 4: "1/4 - PÓŁFINAŁY", 5: "1/2 - FINAŁ" };
        s_round = rounds[roundCounter] || s_round;
        maxVotesThisRound /= 2;
    }
}

function changeSlide(dir, containerId, e) {
    e.stopPropagation();
    const images = document.getElementById(containerId).getElementsByClassName('gallery-img');
    let activeIdx = Array.from(images).findIndex(img => img.classList.contains('active'));
    images[activeIdx].classList.remove('active');
    let nextIdx = (activeIdx + dir + images.length) % images.length;
    images[nextIdx].classList.add('active');
}

function showWinner(winner) {
    document.getElementById('quiz').innerHTML = `
        <div class="winner" style="text-align: center;">
            <h1>🏆 Zwycięzca: ${winner.name}!</h1>
            <img src="${winner.cover}" width="300"><br>
            <button onclick="restartQuiz()">Zagraj jeszcze raz</button>
        </div>`;
    api.saveWinner(winner);
    if (window.confetti) window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

async function restartQuiz() {
    await api.initQuiz();
    roundCounter = 1; votes = 0; maxVotesThisRound = 16;
    s_round = "1/32 - PIERWSZA RUNDA";
    await loadRound();
}