const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let serverData = {
    status: "OFFLINE",
    lastHeartbeat: 0,
    port: 25741,
    playerCount: 0,
    players: [],
    logs: []
};

app.post('/api/sync', (req, res) => {
    const { secret, port, players, logs } = req.body;
    if (secret !== "GTPS_SECRET_KEY_12345") {
        return res.status(403).json({ error: "Invalid secret key" });
    }

    serverData.status = "ONLINE";
    serverData.lastHeartbeat = Date.now();
    serverData.port = port || 25741;
    serverData.players = players || [];
    serverData.playerCount = (players || []).length;
    serverData.logs = logs || [];

    res.json({ success: true, timestamp: Date.now() });
});

app.get('/api/status', (req, res) => {
    const isOnline = (Date.now() - serverData.lastHeartbeat) < 10000;
    res.json({
        ...serverData,
        status: isOnline ? "ONLINE" : "OFFLINE",
        playerCount: isOnline ? serverData.playerCount : 0,
        players: isOnline ? serverData.players : []
    });
});

app.listen(PORT, () => {
    console.log(`GTPS Web Dashboard running on http://localhost:${PORT}`);
});
