const BASE_URL = 'http://localhost:5000/api/quiz';

export async function initQuiz() {
    const res = await fetch(`${BASE_URL}/init`);
    return await res.json();
}

export async function getNextRound() {
    const res = await fetch(`${BASE_URL}/next-round`);
    return await res.json();
}

export async function postVote(winnerId) {
    const res = await fetch(`${BASE_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId })
    });
    return await res.json();
}

export async function saveWinner(winner) {
    await fetch(`${BASE_URL}/final-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: winner.id,
            name: winner.name,
            cover: winner.cover
        })
    });
}

export async function getWinners() {
    const res = await fetch(`${BASE_URL}/winners`);
    return await res.json();
}

export async function updateWinnerData(gameId, data) {
    const res = await fetch(`${BASE_URL}/winner/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}