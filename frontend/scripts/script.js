import * as api from './api.js';
import * as ui from './ui.js';

let gameA, gameB;
let startingGames = 32, roundCounter = 1, votes = 0;
let s_round = "1/32 - FIRST ROUND", maxVotesThisRound = 16;

window.startApp = startApp;
window.restartQuiz = restartQuiz;

async function startApp() {
    roundCounter = 1; votes = 0; maxVotesThisRound = 16;
    s_round = "1/32 - FIRST ROUND";
    await api.initQuiz();
    document.getElementById('winners-history-container').style.display = 'none';
    ui.showMainInterface();
    await loadRound();
}

// Function for loading round data and updating UI
async function loadRound() {
    const data = await api.getNextRound();
    if (data.error === "NEED_INIT") return restartQuiz();
    if (data.winner) return showWinner(data.winner);

    if (!document.getElementById('nameA')) {

        ui.resetLayout(s_round, `${votes + 1}/${maxVotesThisRound}`);
    }

    gameA = data.player1;
    gameB = data.player2;

    updateRoundStatus();

    ui.updateRoundDisplay(s_round, `${votes + 1}/${maxVotesThisRound}`);

    ui.fillCard('A', gameA, changeSlide);
    ui.fillCard('B', gameB, changeSlide);

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
        const rounds = { 2: "1/16 - SECOND ROUND", 3: "1/8 - QUARTER-FINALS", 4: "1/4 - SEMIFINALS", 5: "1/2 - FINALS" };
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
            <h1>🏆 Winner: ${winner.name}!</h1>
            <img src="${winner.cover}" width="300"><br>
            <div style="display: flex; justify-content: center; gap: 10px;">
                <button onclick="restartQuiz()">Play Again</button>
                <button onclick="goToMainPage()">Back to Main Page</button>
            </div>
        </div>`;

    api.saveWinner(winner);

    if (window.confetti) window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

window.goToMainPage = function () {
    document.getElementById('main-inteface').style.display = 'none';

    const mainMenu = document.getElementById('main-menu-screen');
    mainMenu.style.display = '';

    document.getElementById('winners-history-container').style.display = 'block';

    loadWinnersHistory();
}

window.addEventListener('DOMContentLoaded', async () => {
    loadWinnersHistory();
});

async function loadWinnersHistory() {
    const winners = await api.getWinners();
    ui.renderWinnersList(winners, async (id, data) => {
        try {
            await api.updateWinnerData(id, data);
            alert(`Updated ${data.userScore}/100 and other data!`);
        } catch (err) {
            console.error("Update failed", err);
        }
    });
}

async function restartQuiz() {
    await api.initQuiz();
    roundCounter = 1; votes = 0; maxVotesThisRound = 16;
    s_round = "1/32 - FIRST ROUND";
    await loadRound();
}
// Initialize Lucide icons
lucide.createIcons();