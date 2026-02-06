const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());


// --- KONFIGURACJA POŁĄCZEŃ ---

const mongoUrl = process.env.MONGO_URL || 'mongodb://admin:password123@mongodb:27017/gamequiz?authSource=admin';
mongoose.connect(mongoUrl)
    .then(() => console.log('Połączono z MongoDB'))
    .catch(err => console.error('Błąd MongoDB:', err));

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Błąd Redisa:', err));
redisClient.connect().then(() => console.log('Połączono z Redisem'));


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

async function getAccessToken() {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;
    const response = await axios.post(url);
    return response.data.access_token;
}

async function fetchGames() {
    console.log("Reset");
    try {
        const token = await getAccessToken();
        const response = await axios({
            url: "https://api.igdb.com/v4/games",
            method: 'POST',
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${token}`,
            },
            // Pobieramy: nazwę, url okładki i ocenę. Warunek: musi mieć okładkę i min. 50 ocen.
            data: "fields name, cover.url, summary, total_rating; where cover != null & total_rating_count < 50; limit 32;"
        });

        // Mapujemy dane, żeby naprawić URL okładek (z miniatur na HD)
        return response.data.map(game => ({
            id: game.id,
            name: game.name,
            summary: game.summary || "Brak opisu.",
            cover: game.cover.url.replace('t_thumb', 't_720p').replace('//', 'https://')
        }));
    } catch (err) {
        // To wypisze konkretny błąd w terminalu Dockera
        console.error("LOGI BŁĘDU:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Dane:", err.response.data);
        } else {
            console.error("Komunikat:", err.message);
        }
        return [];
    }
}

// Endpoint do inicjalizacji quizu (pobiera gry i wrzuca do Redisa)
app.get('/api/quiz/init', async (req, res) => {
    await redisClient.flushAll(); // Czyści Redisa przed załadowaniem nowych gier
    const games = await fetchGames();
    if (games.length > 0) {
        // Tasujemy gry (żeby quiz nie był zawsze taki sam)
        const shuffled = games.sort(() => 0.5 - Math.random());
        await redisClient.setEx('games_list', 3600, JSON.stringify(shuffled));
        res.json({ message: "Quiz zainicjalizowany!", count: shuffled.length });
    } else {
        res.status(500).json({ error: "Nie udało się pobrać gier" });
    }
});



// --- LOGIKA I ENDPOINTY ---

app.get('/', (req, res) => {
    res.send('API działa! Serwer Node.js jest online.');
});

// Testowy endpoint do pobierania gier
app.get('/api/games', async (req, res) => {
    try {
        // 1. Najpierw sprawdźmy w Redisie (Cache)
        const cachedGames = await redisClient.get('games_list');

        if (cachedGames) {
            console.log('--- Pobieram dane z REDISA ---');
            return res.json(JSON.parse(cachedGames));
        }

        // 2. Jeśli nie ma w Redisie, tutaj docelowo będzie fetch do IGDB
        // Na razie zrobimy "dummy data" do testów
        const dummyGames = [
            { id: 1, name: "The Witcher 3", rating: 98 },
            { id: 2, name: "Cyberpunk 2077", rating: 85 }
        ];

        console.log('--- Brak w Redisie, zapisuję nowe dane ---');

        // Zapisujemy w Redisie na 60 sekund (EX: 60)
        await redisClient.setEx('games_list', 60, JSON.stringify(dummyGames));

        res.json(dummyGames);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pomocnicza funkcja do losowania par
app.get('/api/quiz/next-round', async (req, res) => {
    const cachedGames = await redisClient.get('games_list');

    if (!cachedGames) {
        // Zwracamy status 200, ale z informacją o błędzie w JSONie
        return res.json({ error: "NEED_INIT" });
    }

    let games = JSON.parse(cachedGames);

    // Jeśli została tylko jedna gra - mamy zwycięzcę!
    if (games.length === 1) {
        return res.json({ winner: games[0] });
    }

    // Losujemy dwie gry do pojedynku
    const player1 = games[0];
    const player2 = games[1];

    res.json({ player1, player2, remaining: games.length });
});

// Endpoint do wysyłania wyniku (kto wygrał pojedynek)
app.post('/api/quiz/vote', async (req, res) => {
    const { winnerId } = req.body;
    const cachedGames = await redisClient.get('games_list');
    let games = JSON.parse(cachedGames);

    // Usuwamy przegraną grę (tę, która NIE jest winnerId z aktualnej pary)
    // To uproszczona logika: wyrzucamy pierwszą grę z listy, która nie wygrała
    const updatedGames = games.filter(g => g.id === winnerId || games.indexOf(g) > 1);

    // Przesuwamy zwycięzcę na koniec kolejki, żeby zmierzył się z kimś innym później
    const winner = updatedGames.shift();
    updatedGames.push(winner);

    await redisClient.setEx('games_list', 3600, JSON.stringify(updatedGames));
    res.json({ message: "Głos oddany!" });
});

// 1. Definicja Schematu MongoDB
const statsSchema = new mongoose.Schema({
    gameId: Number,
    name: String,
    wins: { type: Number, default: 0 }
});
const GameStats = mongoose.model('GameStats', statsSchema);

// 2. Endpoint do zapisywania ostatecznego zwycięzcy
app.post('/api/quiz/final-winner', async (req, res) => {
    const { id, name } = req.body;
    try {
        // Znajdź grę w bazie i zwiększ licznik wins o 1 (upsert tworzy rekord jeśli go nie ma)
        await GameStats.findOneAndUpdate(
            { gameId: id },
            { $inc: { wins: 1 }, name: name },
            { upsert: true }
        );
        res.json({ message: "Statystyki zaktualizowane!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Endpoint do pobierania rankingu (na przyszłość)
app.get('/api/quiz/leaderboard', async (req, res) => {
    const topGames = await GameStats.find().sort({ wins: -1 }).limit(10);
    res.json(topGames);
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Serwer śmiga na porcie ${PORT}`);
});