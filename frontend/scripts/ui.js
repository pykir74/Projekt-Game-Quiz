export function showMainInterface() {
    document.getElementById('main-menu-screen').style.display = 'none';
    document.getElementById('main-inteface').style.display = 'block';
}

export function resetLayout(s_round, votesInfo) {
    document.getElementById('quiz').innerHTML = `
        <div class="round">
            <h3 id="round">${s_round}</h3>
            <p id="maxvotes">${votesInfo}</p>
        </div>
        <div class="quiz-wrap">
            <div class="game-chooser">
                ${createCard('A')}
                <h1 class="vs"> VS </h1>
                ${createCard('B')}
            </div>
        </div>`;
}

function createCard(suffix) {
    // Changing id based on suffix to avoid conflicts between the two cards
    const cardId = suffix === 'A' ? '1' : '2';
    return `
        <div id="p${cardId}" class="card">
            <img id="img${suffix}" src="">
            <h2 id="name${suffix}"></h2>
            <div class="game-info">
                <span id="date${suffix}" class="info-badge"></span>
                <span id="rating${suffix}" class="info-badge"></span>
            </div>
            <p id="platforms${suffix}" class="platforms-text"></p>
            <p id="summary${suffix}"></p>
            <div id="screens${suffix}" class="screenshots-container"></div>
        </div>`;
}

export function fillCard(suffix, game, onSlideChange) {
    if (!game) return;
    document.getElementById(`name${suffix}`).innerText = game.name;
    document.getElementById(`img${suffix}`).src = game.cover;
    document.getElementById(`summary${suffix}`).innerText = game.summary;
    document.getElementById(`date${suffix}`).innerText = `📅 ${game.release_date || 'TBA'}`;
    document.getElementById(`rating${suffix}`).innerText = `⭐ ${game.rating || 'N/A'}/100`;
    document.getElementById(`platforms${suffix}`).innerText = `🎮 ${game.platforms || 'PC'}`;

    const sc = document.getElementById(`screens${suffix}`);
    if (game.screenshots?.length > 0) {
        sc.style.display = 'flex';
        sc.innerHTML = '';

        const prev = document.createElement('button');
        prev.innerHTML = '&#10094;';
        prev.className = 'gallery-nav prev-btn';
        prev.onclick = (e) => onSlideChange(-1, `screens${suffix}`, e);

        const next = document.createElement('button');
        next.innerHTML = '&#10095;';
        next.className = 'gallery-nav next-btn';
        next.onclick = (e) => onSlideChange(1, `screens${suffix}`, e);

        sc.appendChild(prev);
        game.screenshots.forEach((url, i) => {
            const img = document.createElement('img');
            img.src = url;
            img.className = `gallery-img ${i === 0 ? 'active' : ''}`;
            sc.appendChild(img);
        });
        sc.appendChild(next);
    } else {
        sc.style.display = 'none';
    }
}

export function updateRoundDisplay(s_round, votesInfo) {
    const roundEl = document.getElementById('round');
    const votesEl = document.getElementById('maxvotes');
    if (roundEl) roundEl.innerText = s_round;
    if (votesEl) votesEl.innerText = votesInfo;
}

export function renderWinnersList(winners, onUpdate) {
    const container = document.getElementById('winners-history');
    if (!container) return;

    if (winners.length === 0) {
        container.innerHTML = "<p>No winners yet. Play the quiz to fill your Hall of Fame!</p>";
        return;
    }

    container.innerHTML = winners.map(game => `
        <div class="winner-history-card" data-id="${game.gameId}">
            <img src="${game.cover}" alt="${game.name}">
            <div class="winner-info">
                <h4>${game.name} (Wins: ${game.wins})</h4>
                <div class="stats-row">
                    <label>
                        <input type="checkbox" class="played-check" ${game.played ? 'checked' : ''}> Played
                    </label>
                    <label>
                        Score: <input type="number" class="score-input" value="${game.userScore || 50}" min="1" max="100">
                    </label>
                </div>
                <textarea class="review-text" placeholder="Your review...">${game.review || ''}</textarea>
                <button class="save-update-btn">Save Changes</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.save-update-btn').forEach(btn => {
        btn.onclick = () => {
            const card = btn.closest('.winner-history-card');
            const id = card.dataset.id;
            const played = card.querySelector('.played-check').checked;
            const review = card.querySelector('.review-text').value;

            let userScore = parseInt(card.querySelector('.score-input').value);
            if (isNaN(userScore) || userScore < 1) userScore = 1;
            if (userScore > 100) userScore = 100;

            card.querySelector('.score-input').value = userScore;

            onUpdate(id, { played, review, userScore });
        };
    });
}