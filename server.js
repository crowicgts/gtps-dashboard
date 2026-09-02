const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GTPS_PORT = process.env.GTPS_PORT || 25741;
const GTPS_CLOUD_API = `https://api.gtps.cloud/g-api/${GTPS_PORT}/status`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let serverData = {
    status: "OFFLINE",
    lastHeartbeat: 0,
    port: GTPS_PORT,
    playerCount: 0,
    players: [],
    logs: []
};

// Periodic polling from GTPS Cloud Gateway
async function pollGTPSCloud() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(GTPS_CLOUD_API, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            serverData = {
                status: "ONLINE",
                lastHeartbeat: Date.now(),
                port: data.port || GTPS_PORT,
                playerCount: data.playerCount || (data.players ? data.players.length : 0),
                players: data.players || [],
                logs: data.logs || serverData.logs || []
            };
        } else {
            serverData.status = "OFFLINE";
        }
    } catch (err) {
        serverData.status = "OFFLINE";
    }
}

// Poll every 3 seconds
setInterval(pollGTPSCloud, 3000);
pollGTPSCloud();

// Status endpoint for the web dashboard frontend
app.get('/api/status', (req, res) => {
    res.json(serverData);
});

app.listen(PORT, () => {
    console.log(`GTPS Web Dashboard running on http://localhost:${PORT}`);
    console.log(`Connecting to GTPS Cloud API: ${GTPS_CLOUD_API}`);
});
