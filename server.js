const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GTPS_PORT = process.env.GTPS_PORT || 25741;
const GTPS_CLOUD_API = `https://api.gtps.cloud/g-api/${GTPS_PORT}/status`;
const GTPS_CLOUD_EXEC_API = `https://api.gtps.cloud/g-api/${GTPS_PORT}/exec`;

app.use(cors());
app.use(express.json());

let serverData = {
    status: "OFFLINE",
    lastHeartbeat: 0,
    port: GTPS_PORT,
    playerCount: 0,
    players: [],
    logs: [],
    richest: [],
    topGems: [],
    topLevel: [],
    gemEvent: false,
    xpEvent: false
};

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
                logs: data.logs || serverData.logs || [],
                richest: data.richest || [],
                topGems: data.topGems || [],
                topLevel: data.topLevel || [],
                gemEvent: data.gemEvent || false,
                xpEvent: data.xpEvent || false
            };
        } else {
            serverData.status = "OFFLINE";
        }
    } catch (err) {
        serverData.status = "OFFLINE";
    }
}

setInterval(pollGTPSCloud, 2500);
pollGTPSCloud();

app.get('/api/status', (req, res) => {
    res.json(serverData);
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "voidps" && password === "voidpsadmin") {
        return res.json({ success: true, token: "voidps_auth_token_999888" });
    }
    return res.status(401).json({ success: false, error: "Invalid username or password" });
});

app.post('/api/admin/action', async (req, res) => {
    const { token, action, payload } = req.body;
    if (token !== "voidps_auth_token_999888") {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const response = await fetch(GTPS_CLOUD_EXEC_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        const result = await response.json().catch(() => ({ success: true }));
        return res.json({ success: true, result });
    } catch (e) {
        return res.json({ success: true, message: "Action queued to GTPS" });
    }
});

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VOIDPS • Ultimate GTPS Portal</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #070314;
            --bg-card: rgba(19, 10, 42, 0.7);
            --bg-card-hover: rgba(32, 16, 70, 0.85);
            --neon-purple: #a855f7;
            --neon-violet: #8b5cf6;
            --neon-pink: #ec4899;
            --neon-cyan: #06b6d4;
            --neon-gold: #fbbf24;
            --purple-glow: rgba(168, 85, 247, 0.4);
            --pink-glow: rgba(236, 72, 153, 0.4);
            --border-purple: rgba(168, 85, 247, 0.35);
            --border-glow: #c084fc;
            --text-main: #ffffff;
            --text-dim: #a78bfa;
            --online-green: #10b981;
            --offline-red: #f43f5e;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }

        body {
            background-color: var(--bg-base);
            color: var(--text-main);
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
            background-image: 
                radial-gradient(circle at 15% 15%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 85% 20%, rgba(236, 72, 153, 0.12) 0%, transparent 45%),
                radial-gradient(circle at 50% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 50%);
        }

        /* Animated Grid Overlay */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
            z-index: 0;
            animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
            0% { transform: translateY(0); }
            100% { transform: translateY(40px); }
        }

        .container {
            max-width: 1350px;
            margin: 0 auto;
            padding: 24px;
            position: relative;
            z-index: 1;
        }

        /* Header Bar */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-card);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-purple);
            padding: 20px 30px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 25px var(--purple-glow);
            margin-bottom: 24px;
            animation: glowHeader 4s ease-in-out infinite alternate;
        }

        @keyframes glowHeader {
            0% { border-color: rgba(168, 85, 247, 0.35); box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 20px var(--purple-glow); }
            100% { border-color: rgba(236, 72, 153, 0.55); box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 35px var(--pink-glow); }
        }

        .brand-box {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .brand-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, var(--neon-purple), var(--neon-pink));
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            box-shadow: 0 0 20px var(--neon-pink);
            animation: pulseIcon 3s infinite;
        }

        @keyframes pulseIcon {
            0%, 100% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.05); filter: brightness(1.2); }
        }

        .brand-title h1 {
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            font-weight: 900;
            background: linear-gradient(90deg, #ffffff, #d8b4fe, #f472b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 2px;
        }

        .brand-title p {
            color: var(--text-dim);
            font-size: 13px;
            letter-spacing: 1px;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid var(--border-purple);
            padding: 8px 18px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 600;
        }

        .status-light {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--offline-red);
            box-shadow: 0 0 10px var(--offline-red);
        }

        .status-light.online {
            background: var(--online-green);
            box-shadow: 0 0 14px var(--online-green);
            animation: pulseLight 1.5s infinite;
        }

        @keyframes pulseLight {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
        }

        .btn-admin {
            background: linear-gradient(135deg, #7e22ce, #db2777);
            border: 1px solid var(--neon-pink);
            color: white;
            padding: 9px 20px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 0 15px rgba(219, 39, 119, 0.4);
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn-admin:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 25px rgba(219, 39, 119, 0.8);
        }

        /* Navigation Tabs */
        .nav-tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            overflow-x: auto;
            padding-bottom: 4px;
        }

        .tab-btn {
            background: var(--bg-card);
            backdrop-filter: blur(10px);
            border: 1px solid var(--border-purple);
            color: var(--text-dim);
            padding: 12px 22px;
            border-radius: 14px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
        }

        .tab-btn:hover {
            background: var(--bg-card-hover);
            color: white;
            border-color: var(--neon-purple);
        }

        .tab-btn.active {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(236, 72, 153, 0.35));
            border-color: var(--border-glow);
            color: white;
            box-shadow: 0 0 20px var(--purple-glow);
        }

        /* Stat Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .stat-box {
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-purple);
            padding: 22px;
            border-radius: 16px;
            position: relative;
            overflow: hidden;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .stat-box:hover {
            transform: translateY(-3px);
            border-color: var(--neon-purple);
            box-shadow: 0 8px 30px var(--purple-glow);
        }

        .stat-box::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 100%; height: 3px;
            background: linear-gradient(90deg, var(--neon-purple), var(--neon-pink));
        }

        .stat-box h4 {
            font-size: 12px;
            text-transform: uppercase;
            color: var(--text-dim);
            margin-bottom: 6px;
            letter-spacing: 1px;
        }

        .stat-box .num {
            font-family: 'Orbitron', sans-serif;
            font-size: 30px;
            font-weight: 700;
            color: white;
        }

        /* Main Content Grid */
        .tab-content { display: none; }
        .tab-content.active { display: block; animation: fadeIn 0.3s ease; }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 24px;
        }

        @media (max-width: 960px) {
            .dashboard-grid { grid-template-columns: 1fr; }
        }

        .panel {
            background: var(--bg-card);
            backdrop-filter: blur(14px);
            border: 1px solid var(--border-purple);
            border-radius: 18px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(168, 85, 247, 0.2);
        }

        .panel-header h3 {
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            color: #ffffff;
            letter-spacing: 1px;
        }

        /* Player List */
        .player-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-height: 520px;
            overflow-y: auto;
        }

        .player-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(10, 5, 24, 0.6);
            border: 1px solid rgba(168, 85, 247, 0.2);
            padding: 14px 18px;
            border-radius: 12px;
            transition: all 0.2s ease;
        }

        .player-item:hover {
            border-color: var(--border-glow);
            background: rgba(30, 14, 60, 0.8);
            transform: translateX(4px);
        }

        .player-name {
            font-weight: 700;
            font-size: 16px;
            color: white;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .player-world {
            font-size: 13px;
            color: var(--neon-cyan);
            margin-top: 2px;
        }

        .player-meta {
            text-align: right;
        }

        .player-gems {
            color: var(--neon-gold);
            font-weight: 700;
            font-size: 14px;
        }

        .player-lvl {
            color: var(--text-dim);
            font-size: 12px;
        }

        /* Terminal Logs */
        .terminal-box {
            background: #04020a;
            border: 1px solid #1e133a;
            border-radius: 12px;
            padding: 16px;
            height: 520px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }

        .log-row {
            margin-bottom: 10px;
            line-height: 1.5;
            word-break: break-all;
        }

        .log-t { color: #6b7280; margin-right: 8px; }
        .log-tag {
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 8px;
            text-transform: uppercase;
        }
        .tag-login { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
        .tag-logout { background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid #f43f5e; }
        .tag-chat { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid #8b5cf6; }
        .tag-world { background: rgba(6, 182, 212, 0.2); color: #67e8f9; border: 1px solid #06b6d4; }

        /* Mines Mini-Game */
        .mines-wrapper {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 24px;
        }

        @media (max-width: 860px) {
            .mines-wrapper { grid-template-columns: 1fr; }
        }

        .mines-controls {
            background: var(--bg-card);
            border: 1px solid var(--border-purple);
            padding: 24px;
            border-radius: 18px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .input-group label {
            display: block;
            font-size: 13px;
            color: var(--text-dim);
            margin-bottom: 6px;
            font-weight: 600;
        }

        .input-group input, .input-group select {
            width: 100%;
            background: #0a0518;
            border: 1px solid var(--border-purple);
            padding: 12px 14px;
            border-radius: 10px;
            color: white;
            font-size: 15px;
            outline: none;
        }

        .input-group input:focus, .input-group select:focus {
            border-color: var(--neon-purple);
            box-shadow: 0 0 15px var(--purple-glow);
        }

        .btn-play {
            background: linear-gradient(135deg, #9333ea, #ec4899);
            border: none;
            color: white;
            padding: 14px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            font-family: 'Orbitron', sans-serif;
            cursor: pointer;
            box-shadow: 0 0 25px rgba(236, 72, 153, 0.5);
            transition: all 0.2s ease;
        }

        .btn-play:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 35px rgba(236, 72, 153, 0.8);
        }

        .btn-cashout {
            background: linear-gradient(135deg, #059669, #10b981);
            border: none;
            color: white;
            padding: 14px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            font-family: 'Orbitron', sans-serif;
            cursor: pointer;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
            transition: all 0.2s ease;
            display: none;
        }

        .mines-board {
            background: var(--bg-card);
            border: 1px solid var(--border-purple);
            padding: 24px;
            border-radius: 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .mines-grid {
            display: grid;
            grid-template-columns: repeat(5, 75px);
            grid-template-rows: repeat(5, 75px);
            gap: 12px;
        }

        @media (max-width: 500px) {
            .mines-grid {
                grid-template-columns: repeat(5, 55px);
                grid-template-rows: repeat(5, 55px);
                gap: 8px;
            }
        }

        .mine-tile {
            background: #150a2e;
            border: 2px solid #3b1d6e;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.2s ease;
            user-select: none;
        }

        .mine-tile:hover {
            background: #25124f;
            border-color: var(--neon-purple);
            transform: scale(1.05);
            box-shadow: 0 0 15px var(--purple-glow);
        }

        .mine-tile.revealed-gem {
            background: linear-gradient(135deg, #064e3b, #047857);
            border-color: #34d399;
            box-shadow: 0 0 20px #10b981;
            animation: popIn 0.3s ease;
        }

        .mine-tile.revealed-bomb {
            background: linear-gradient(135deg, #881337, #be123c);
            border-color: #fb7185;
            box-shadow: 0 0 25px #f43f5e;
            animation: shake 0.4s ease;
        }

        @keyframes popIn { 0% { transform: scale(0.6); } 100% { transform: scale(1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }

        /* Admin Modal */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 100;
            display: none;
            align-items: center;
            justify-content: center;
        }

        .modal-box {
            background: #0f0724;
            border: 2px solid var(--neon-pink);
            border-radius: 20px;
            padding: 32px;
            width: 440px;
            max-width: 90%;
            box-shadow: 0 0 50px rgba(236, 72, 153, 0.5);
            animation: popIn 0.25s ease;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .modal-header h3 {
            font-family: 'Orbitron', sans-serif;
            color: var(--neon-pink);
            font-size: 20px;
        }

        .close-btn {
            background: transparent;
            border: none;
            color: var(--text-dim);
            font-size: 24px;
            cursor: pointer;
        }

        .empty-box {
            text-align: center;
            padding: 40px;
            color: var(--text-dim);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand-box">
                <div class="brand-icon">⚡</div>
                <div class="brand-title">
                    <h1>VOIDPS CONTROL</h1>
                    <p>NEXT-GEN GTPS ECOSYSTEM & LIVE PORTAL</p>
                </div>
            </div>
            <div class="header-actions">
                <div class="status-badge">
                    <div class="status-light" id="statusLight"></div>
                    <span id="statusTxt">CHECKING...</span>
                </div>
                <button class="btn-admin" onclick="openAdminModal()">
                    <span>🛡️</span> <span id="adminBtnTxt">Admin Login</span>
                </button>
            </div>
        </header>

        <div class="nav-tabs">
            <button class="tab-btn active" onclick="switchTab('tab-overview')">🌐 Live Server</button>
            <button class="tab-btn" onclick="switchTab('tab-players')">👑 Online Players</button>
            <button class="tab-btn" onclick="switchTab('tab-mines')">💣 Mines Casino</button>
            <button class="tab-btn" onclick="switchTab('tab-leaderboard')">🏆 Leaderboards</button>
            <button class="tab-btn" onclick="switchTab('tab-logs')">📜 Real-Time Logs</button>
            <button class="tab-btn" id="adminTabBtn" style="display:none;" onclick="switchTab('tab-admin')">⚡ Master Admin</button>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <h4>Server Port</h4>
                <div class="num" id="sPort">25741</div>
            </div>
            <div class="stat-box">
                <h4>Active Players</h4>
                <div class="num" id="sPlayers">0</div>
            </div>
            <div class="stat-box">
                <h4>Server Status</h4>
                <div class="num" id="sState" style="color: var(--online-green);">ONLINE</div>
            </div>
            <div class="stat-box">
                <h4>Active Boosts</h4>
                <div class="num" id="sBoosts" style="font-size: 20px; color: var(--neon-gold);">1x Regular</div>
            </div>
        </div>

        <!-- TAB 1: OVERVIEW -->
        <div id="tab-overview" class="tab-content active">
            <div class="dashboard-grid">
                <div class="panel">
                    <div class="panel-header">
                        <h3>Online Players</h3>
                        <span id="playerCounter" style="color: var(--neon-purple); font-weight:700;">0 Active</span>
                    </div>
                    <div class="player-list" id="overviewPlayerList">
                        <div class="empty-box">No players online or server connecting...</div>
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-header">
                        <h3>Live Server Stream</h3>
                        <span style="color: var(--neon-pink); font-size:12px;">Real-Time</span>
                    </div>
                    <div class="terminal-box" id="overviewLogs">
                        <div class="empty-box">Connecting to stream...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB 2: PLAYERS ROSTER -->
        <div id="tab-players" class="tab-content">
            <div class="panel">
                <div class="panel-header">
                    <h3>Server Roster & Player Inspect</h3>
                    <input type="text" id="playerSearch" placeholder="Search player..." oninput="filterPlayers()" style="background:#0a0518; border:1px solid var(--border-purple); padding:8px 14px; border-radius:8px; color:white; font-size:13px; outline:none;">
                </div>
                <div class="player-list" id="fullPlayerList">
                    <div class="empty-box">No players online.</div>
                </div>
            </div>
        </div>

        <!-- TAB 3: MINES CASINO -->
        <div id="tab-mines" class="tab-content">
            <div class="mines-wrapper">
                <div class="mines-controls">
                    <h3 style="font-family:'Orbitron',sans-serif; color:var(--neon-pink); font-size:18px;">💣 MINES GAME</h3>
                    <div class="input-group">
                        <label>Bet Amount (Gems)</label>
                        <input type="number" id="mineBet" value="1000" min="100" step="100">
                    </div>
                    <div class="input-group">
                        <label>Mine Count (1 - 24)</label>
                        <select id="mineBombs">
                            <option value="1">1 Mine (Safe)</option>
                            <option value="3" selected>3 Mines (Standard)</option>
                            <option value="5">5 Mines (Risky)</option>
                            <option value="10">10 Mines (Extreme)</option>
                            <option value="20">20 Mines (God Mode)</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Current Multiplier</label>
                        <div id="mineMultiplier" style="font-family:'Orbitron',sans-serif; font-size:26px; color:var(--neon-gold); font-weight:700;">1.00x</div>
                    </div>
                    <button class="btn-play" id="btnStartMines" onclick="startMinesGame()">START GAME</button>
                    <button class="btn-cashout" id="btnCashout" onclick="cashoutMines()">CASHOUT (0 Gems)</button>
                </div>
                <div class="mines-board">
                    <div class="mines-grid" id="minesGrid"></div>
                </div>
            </div>
        </div>

        <!-- TAB 4: LEADERBOARD -->
        <div id="tab-leaderboard" class="tab-content">
            <div class="dashboard-grid">
                <div class="panel">
                    <div class="panel-header">
                        <h3>👑 Top Richest Players</h3>
                    </div>
                    <div class="player-list" id="lbRichest">
                        <div class="empty-box">Calculating rankings...</div>
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-header">
                        <h3>💎 Top Gems Balance</h3>
                    </div>
                    <div class="player-list" id="lbGems">
                        <div class="empty-box">Calculating rankings...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB 5: LOGS -->
        <div id="tab-logs" class="tab-content">
            <div class="panel">
                <div class="panel-header">
                    <h3>Full Server Activity Feed</h3>
                </div>
                <div class="terminal-box" id="fullLogs" style="height: 600px;">
                    <div class="empty-box">No logs captured yet.</div>
                </div>
            </div>
        </div>

        <!-- TAB 6: MASTER ADMIN PANEL -->
        <div id="tab-admin" class="tab-content">
            <div class="panel" style="border-color: var(--neon-pink); box-shadow: 0 0 30px rgba(236,72,153,0.3);">
                <div class="panel-header">
                    <h3 style="color: var(--neon-pink);">⚡ MASTER SERVER CONTROL (VOIDPS)</h3>
                    <span style="color: #34d399; font-weight: bold;">AUTHENTICATED</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                    <div class="mines-controls">
                        <h4>📢 Global Server Broadcast</h4>
                        <input type="text" id="adminBroadcastMsg" placeholder="Message to all players..." style="background:#0a0518; border:1px solid var(--border-purple); padding:10px; border-radius:8px; color:white;">
                        <button class="btn-play" onclick="adminBroadcast()">SEND BROADCAST</button>
                    </div>
                    <div class="mines-controls">
                        <h4>⚡ Player Actions</h4>
                        <input type="text" id="adminTargetPlayer" placeholder="Player Name" style="background:#0a0518; border:1px solid var(--border-purple); padding:10px; border-radius:8px; color:white;">
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-admin" style="flex:1; justify-content:center;" onclick="adminAction('kick')">Kick</button>
                            <button class="btn-admin" style="flex:1; justify-content:center; background:#991b1b;" onclick="adminAction('ban')">Ban</button>
                        </div>
                    </div>
                    <div class="mines-controls">
                        <h4>💎 Grant Gems / Items</h4>
                        <input type="text" id="grantPlayer" placeholder="Target Player" style="background:#0a0518; border:1px solid var(--border-purple); padding:8px; border-radius:8px; color:white;">
                        <input type="number" id="grantGems" placeholder="Gems Amount" style="background:#0a0518; border:1px solid var(--border-purple); padding:8px; border-radius:8px; color:white;">
                        <button class="btn-play" onclick="adminGrantGems()">GRANT GEMS</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ADMIN LOGIN MODAL -->
    <div class="modal-overlay" id="adminModal">
        <div class="modal-box">
            <div class="modal-header">
                <h3>ADMIN AUTHENTICATION</h3>
                <button class="close-btn" onclick="closeAdminModal()">&times;</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 14px;">
                <div class="input-group">
                    <label>Username</label>
                    <input type="text" id="adminUser" placeholder="Enter username (voidps)">
                </div>
                <div class="input-group">
                    <label>Password</label>
                    <input type="password" id="adminPass" placeholder="Enter password (voidpsadmin)">
                </div>
                <div id="loginErr" style="color: var(--offline-red); font-size: 13px; display: none;"></div>
                <button class="btn-play" style="margin-top: 10px;" onclick="submitAdminLogin()">LOGIN TO CONTROL</button>
            </div>
        </div>
    </div>

    <script>
        let adminToken = localStorage.getItem('voidps_token') || null;
        let cachedPlayers = [];

        function formatNum(n) { return Number(n || 0).toLocaleString(); }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            const target = document.getElementById(tabId);
            if (target) target.classList.add('active');
            event.target.classList.add('active');
        }

        function openAdminModal() {
            if (adminToken) {
                switchTab('tab-admin');
                document.getElementById('adminTabBtn').classList.add('active');
            } else {
                document.getElementById('adminModal').style.display = 'flex';
            }
        }

        function closeAdminModal() {
            document.getElementById('adminModal').style.display = 'none';
        }

        async function submitAdminLogin() {
            const u = document.getElementById('adminUser').value;
            const p = document.getElementById('adminPass').value;
            const err = document.getElementById('loginErr');

            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                const data = await res.json();
                if (data.success) {
                    adminToken = data.token;
                    localStorage.setItem('voidps_token', adminToken);
                    closeAdminModal();
                    document.getElementById('adminTabBtn').style.display = 'flex';
                    document.getElementById('adminBtnTxt').innerText = 'Admin Panel';
                    switchTab('tab-admin');
                } else {
                    err.innerText = data.error || 'Invalid credentials';
                    err.style.display = 'block';
                }
            } catch (e) {
                err.innerText = 'Connection error';
                err.style.display = 'block';
            }
        }

        if (adminToken) {
            document.getElementById('adminTabBtn').style.display = 'flex';
            document.getElementById('adminBtnTxt').innerText = 'Admin Panel';
        }

        async function fetchServerStatus() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();

                const isOnline = data.status === 'ONLINE';
                const light = document.getElementById('statusLight');
                const txt = document.getElementById('statusTxt');
                const state = document.getElementById('sState');

                if (isOnline) {
                    light.className = 'status-light online';
                    txt.innerText = 'ONLINE';
                    txt.style.color = 'var(--online-green)';
                    state.innerText = 'ONLINE';
                    state.style.color = 'var(--online-green)';
                } else {
                    light.className = 'status-light';
                    txt.innerText = 'OFFLINE';
                    txt.style.color = 'var(--offline-red)';
                    state.innerText = 'OFFLINE';
                    state.style.color = 'var(--offline-red)';
                }

                document.getElementById('sPort').innerText = data.port || 25741;
                document.getElementById('sPlayers').innerText = data.playerCount || 0;
                document.getElementById('playerCounter').innerText = (data.playerCount || 0) + ' Active';

                cachedPlayers = data.players || [];
                renderPlayers(cachedPlayers);
                renderLogs(data.logs || []);
                renderLeaderboards(cachedPlayers);
            } catch (err) {
                console.error(err);
            }
        }

        function renderPlayers(players) {
            const ov = document.getElementById('overviewPlayerList');
            const full = document.getElementById('fullPlayerList');

            if (!players || players.length === 0) {
                const empty = '<div class="empty-box">No players currently online.</div>';
                ov.innerHTML = empty;
                full.innerHTML = empty;
                return;
            }

            const html = players.map(p => \`
                <div class="player-item">
                    <div>
                        <div class="player-name">👑 \${p.name}</div>
                        <div class="player-world">📍 World: <b>\${p.world}</b></div>
                    </div>
                    <div class="player-meta">
                        <div class="player-gems">💎 \${formatNum(p.gems)} Gems</div>
                        <div class="player-lvl">Level \${p.level} • \${p.wl} WL</div>
                    </div>
                </div>
            \`).join('');

            ov.innerHTML = html;
            full.innerHTML = html;
        }

        function renderLogs(logs) {
            const ov = document.getElementById('overviewLogs');
            const full = document.getElementById('fullLogs');

            if (!logs || logs.length === 0) {
                const empty = '<div class="empty-box">No activity logs recorded.</div>';
                ov.innerHTML = empty;
                full.innerHTML = empty;
                return;
            }

            const html = logs.map(l => {
                let tagClass = 'tag-chat';
                if (l.type === 'LOGIN') tagClass = 'tag-login';
                if (l.type === 'LOGOUT') tagClass = 'tag-logout';
                if (l.type === 'WORLD') tagClass = 'tag-world';

                return \`
                    <div class="log-row">
                        <span class="log-t">[\${l.time}]</span>
                        <span class="log-tag \${tagClass}">\${l.type}</span>
                        <span>\${l.text}</span>
                    </div>
                \`;
            }).join('');

            ov.innerHTML = html;
            full.innerHTML = html;
        }

        function renderLeaderboards(players) {
            const lbR = document.getElementById('lbRichest');
            const lbG = document.getElementById('lbGems');

            if (!players || players.length === 0) {
                lbR.innerHTML = '<div class="empty-box">No data.</div>';
                lbG.innerHTML = '<div class="empty-box">No data.</div>';
                return;
            }

            const sortedWL = [...players].sort((a,b) => (b.wl || 0) - (a.wl || 0));
            const sortedGems = [...players].sort((a,b) => (b.gems || 0) - (a.gems || 0));

            lbR.innerHTML = sortedWL.slice(0, 5).map((p, i) => \`
                <div class="player-item">
                    <div class="player-name">#\${i+1} \${p.name}</div>
                    <div class="player-meta"><span style="color:var(--neon-gold); font-weight:bold;">\${formatNum(p.wl)} WL</span></div>
                </div>
            \`).join('');

            lbG.innerHTML = sortedGems.slice(0, 5).map((p, i) => \`
                <div class="player-item">
                    <div class="player-name">#\${i+1} \${p.name}</div>
                    <div class="player-meta"><span style="color:var(--neon-purple); font-weight:bold;">\${formatNum(p.gems)} Gems</span></div>
                </div>
            \`).join('');
        }

        function filterPlayers() {
            const q = document.getElementById('playerSearch').value.toLowerCase();
            const filtered = cachedPlayers.filter(p => p.name.toLowerCase().includes(q) || p.world.toLowerCase().includes(q));
            renderPlayers(filtered);
        }

        /* MINES GAME LOGIC */
        let minesActive = false;
        let minesMap = [];
        let gemsFound = 0;
        let currentMultiplier = 1.00;
        let currentBet = 1000;

        function initMinesGrid() {
            const grid = document.getElementById('minesGrid');
            grid.innerHTML = '';
            for (let i = 0; i < 25; i++) {
                const t = document.createElement('div');
                t.className = 'mine-tile';
                t.innerText = '❓';
                t.onclick = () => revealMine(i);
                grid.appendChild(t);
            }
        }
        initMinesGrid();

        function startMinesGame() {
            currentBet = Number(document.getElementById('mineBet').value) || 1000;
            const bombCount = Number(document.getElementById('mineBombs').value) || 3;

            minesMap = Array(25).fill('GEM');
            let placed = 0;
            while (placed < bombCount) {
                const r = Math.floor(Math.random() * 25);
                if (minesMap[r] !== 'BOMB') {
                    minesMap[r] = 'BOMB';
                    placed++;
                }
            }

            minesActive = true;
            gemsFound = 0;
            currentMultiplier = 1.00;
            document.getElementById('mineMultiplier').innerText = '1.00x';
            document.getElementById('btnStartMines').style.display = 'none';
            document.getElementById('btnCashout').style.display = 'block';
            document.getElementById('btnCashout').innerText = \`CASHOUT (\${formatNum(currentBet)} Gems)\`;
            initMinesGrid();
        }

        function revealMine(index) {
            if (!minesActive) return;
            const grid = document.getElementById('minesGrid');
            const tile = grid.children[index];
            if (tile.classList.contains('revealed-gem') || tile.classList.contains('revealed-bomb')) return;

            if (minesMap[index] === 'BOMB') {
                tile.className = 'mine-tile revealed-bomb';
                tile.innerText = '💣';
                minesActive = false;
                document.getElementById('btnStartMines').style.display = 'block';
                document.getElementById('btnCashout').style.display = 'none';
                document.getElementById('mineMultiplier').innerText = '0.00x (BUST)';
                for (let i = 0; i < 25; i++) {
                    if (minesMap[i] === 'BOMB') grid.children[i].innerText = '💣';
                }
            } else {
                tile.className = 'mine-tile revealed-gem';
                tile.innerText = '💎';
                gemsFound++;
                currentMultiplier = (currentMultiplier * 1.22).toFixed(2);
                document.getElementById('mineMultiplier').innerText = currentMultiplier + 'x';
                const win = Math.floor(currentBet * currentMultiplier);
                document.getElementById('btnCashout').innerText = \`CASHOUT (\${formatNum(win)} Gems)\`;
            }
        }

        function cashoutMines() {
            if (!minesActive) return;
            minesActive = false;
            const win = Math.floor(currentBet * currentMultiplier);
            alert(\`🎉 CASHOUT SUCCESS! You won \${formatNum(win)} Gems (\${currentMultiplier}x)!\`);
            document.getElementById('btnStartMines').style.display = 'block';
            document.getElementById('btnCashout').style.display = 'none';
        }

        setInterval(fetchServerStatus, 2500);
        fetchServerStatus();
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(DASHBOARD_HTML);
});

app.listen(PORT, () => {
    console.log(`VOIDPS Master Dashboard running on port ${PORT}`);
    console.log(`Connected to GTPS Cloud Gateway: ${GTPS_CLOUD_API}`);
});
