const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());


// Configuring connections

const mongoUrl = process.env.MONGO_URL || 'mongodb://admin:password123@mongodb:27017/gamequiz?authSource=admin';
mongoose.connect(mongoUrl)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error while connecting to MongoDB:', err));

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.connect().then(() => console.log('Connected to Redis'));


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

async function getAccessToken() {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;
    const response = await axios.post(url);
    return response.data.access_token;
}

async function fetchGames() {
    console.log("Fetching games with random offset");
    try {
        const token = await getAccessToken();

        // To make fetched games more random
        const randomOffset = Math.floor(Math.random() * 500);

        const response = await axios({
            url: "https://api.igdb.com/v4/games",
            method: 'POST',
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': `Bearer ${token}`,
            },
            data: `fields name, cover.url, summary, first_release_date, platforms.name, rating, rating_count, screenshots.url; where cover != null & rating_count > 50; sort rating_count desc; limit 32; offset ${randomOffset};`
        });

        console.log(`Data fetched (Offset: ${randomOffset})`);

        return response.data.map(game => ({
            id: game.id,
            name: game.name,
            summary: game.summary || "No description.",
            cover: game.cover ? game.cover.url.replace('t_thumb', 't_720p').replace('//', 'https://') : '',
            release_date: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : 'TBA',
            rating: game.rating ? Math.round(game.rating) : 'N/A',
            rating_count: game.rating_count || 0,
            platforms: game.platforms ? game.platforms.map(p => p.name).join(', ') : 'PC',
            screenshots: game.screenshots ? game.screenshots.slice(0, 3).map(s => s.url.replace('t_thumb', 't_720p').replace('//', 'https://')) : []
        }));
    } catch (err) {
        console.error("IGDB Error:", err.message);
        return [];
    }
}

app.get('/api/quiz/init', async (req, res) => {
    await redisClient.flushAll();
    const games = await fetchGames();
    if (games.length > 0) {
        // Shuffle the games before saving to Redis, so we get a different order each time
        const shuffled = games.sort(() => 0.5 - Math.random());
        await redisClient.setEx('games_list', 3600, JSON.stringify(shuffled));
        res.json({ message: "Quiz initialized!", count: shuffled.length });
    } else {
        res.status(500).json({ error: "Could not fetch games" });
    }
});



// Logic and endpoints

app.get('/', (req, res) => {
    res.send('API is working! Node.js server is online.');
});


// Function for getting random games
app.get('/api/quiz/next-round', async (req, res) => {
    const cachedGames = await redisClient.get('games_list');

    if (!cachedGames) {
        return res.json({ error: "NEED_INIT" });
    }

    let games = JSON.parse(cachedGames);

    if (games.length === 1) {
        return res.json({ winner: games[0] });
    }

    const player1 = games[0];
    const player2 = games[1];

    res.json({ player1, player2, remaining: games.length });
});

// Endpoint for winner selection
app.post('/api/quiz/vote', async (req, res) => {
    const { winnerId } = req.body;
    const cachedGames = await redisClient.get('games_list');
    let games = JSON.parse(cachedGames);

    const updatedGames = games.filter(g => g.id === winnerId || games.indexOf(g) > 1);

    const winner = updatedGames.shift();
    updatedGames.push(winner);

    await redisClient.setEx('games_list', 3600, JSON.stringify(updatedGames));
    res.json({ message: "Głos oddany!" });
});

// MongoDB schema for game stats
const statsSchema = new mongoose.Schema({
    gameId: Number,
    name: String,
    cover: String,
    played: { type: Boolean, default: false },
    review: { type: String, default: "" },
    userScore: {
        type: Number,
        default: 50,
        min: 1,
        max: 100
    },
    wins: { type: Number, default: 0 }
});
const GameStats = mongoose.model('GameStats', statsSchema);

// Endpoint for updating stats after quiz completion
app.post('/api/quiz/final-winner', async (req, res) => {
    const { id, name, cover } = req.body;
    try {
        await GameStats.findOneAndUpdate(
            { gameId: id },
            {
                $inc: { wins: 1 },
                name: name,
                cover: cover
            },
            { upsert: true, new: true }
        );
        res.json({ message: "Winner saved to database!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/quiz/winners', async (req, res) => {
    try {
        const winners = await GameStats.find().sort({ wins: -1 });
        res.json(winners);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/quiz/winner/:id', async (req, res) => {
    const { played, review, userScore } = req.body;
    try {
        const updated = await GameStats.findOneAndUpdate(
            { gameId: req.params.id },
            { played, review, userScore },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Serwer śmiga na porcie ${PORT}`);
});