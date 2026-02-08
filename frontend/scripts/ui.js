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
    // suffix to 'A' lub 'B', ale ID karty ustawiamy na 'p1' i 'p2' dla spójności z main.js
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