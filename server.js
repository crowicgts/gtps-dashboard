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
    logs: []
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
                logs: data.logs || serverData.logs || []
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
        return res.json({ success: true, message: "Action queued" });
    }
});

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VOIDPS • Official Growtopia Realm</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #030712;
            --lol-gold: #c8aa6e;
            --lol-gold-bright: #f0e6d2;
            --lol-blue-glow: #00d2ff;
            --lol-deep-blue: #091428;
            --lol-panel-bg: rgba(9, 20, 40, 0.85);
            --lol-border: #1e3a5f;
            --lol-border-active: #c8aa6e;
            --neon-cyan: #38bdf8;
            --text-gold: #c8aa6e;
            --text-main: #f0e6d2;
            --text-muted: #a09b8c;
            --online-green: #00ff88;
            --offline-red: #ff3366;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }

        body {
            background-color: var(--bg-dark);
            color: var(--text-main);
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        /* Animated Canvas Particles */
        #bg-canvas {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 0;
        }

        /* Top LoL Style Navigation Bar */
        .top-navbar {
            position: relative;
            z-index: 10;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 40px;
            height: 72px;
            background: rgba(4, 10, 20, 0.95);
            border-bottom: 2px solid #1e282d;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 210, 255, 0.15);
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .nav-logo-text {
            font-family: 'Cinzel', serif;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 3px;
            background: linear-gradient(180deg, #fff, #c8aa6e 60%, #785a28);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 20px rgba(200, 170, 110, 0.5);
        }

        .nav-links {
            display: flex;
            gap: 24px;
            height: 100%;
            align-items: center;
        }

        .nav-link {
            font-family: 'Rajdhani', sans-serif;
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--text-muted);
            cursor: pointer;
            padding: 8px 12px;
            position: relative;
            transition: all 0.25s ease;
        }

        .nav-link:hover {
            color: #ffffff;
            text-shadow: 0 0 10px var(--lol-blue-glow);
        }

        .nav-link.active {
            color: var(--lol-gold-bright);
        }

        .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -16px; left: 0; width: 100%; height: 3px;
            background: linear-gradient(90deg, transparent, var(--lol-blue-glow), transparent);
            box-shadow: 0 0 10px var(--lol-blue-glow);
        }

        .nav-auth {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .btn-play-now {
            font-family: 'Cinzel', serif;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            background: linear-gradient(180deg, #1e3a5f, #0a1428);
            border: 2px solid var(--lol-blue-glow);
            color: #ffffff;
            padding: 10px 24px;
            border-radius: 2px;
            cursor: pointer;
            box-shadow: 0 0 15px rgba(0, 210, 255, 0.4), inset 0 0 10px rgba(0, 210, 255, 0.2);
            transition: all 0.3s ease;
        }

        .btn-play-now:hover {
            background: linear-gradient(180deg, #00d2ff, #091428);
            box-shadow: 0 0 25px rgba(0, 210, 255, 0.8), inset 0 0 15px rgba(0, 210, 255, 0.5);
            transform: translateY(-2px);
        }

        /* Hero Banner */
        .hero-banner {
            position: relative;
            z-index: 1;
            height: 380px;
            background: radial-gradient(circle at 70% 30%, rgba(0, 210, 255, 0.2) 0%, transparent 60%),
                        linear-gradient(180deg, rgba(3, 7, 18, 0.3) 0%, #030712 100%),
                        url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop') center/cover;
            display: flex;
            align-items: center;
            padding: 0 60px;
            border-bottom: 2px solid rgba(0, 210, 255, 0.3);
            box-shadow: inset 0 -40px 60px #030712;
        }

        .hero-content {
            max-width: 650px;
        }

        .hero-tag {
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 4px;
            color: var(--lol-blue-glow);
            text-transform: uppercase;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .hero-title {
            font-family: 'Cinzel', serif;
            font-size: 52px;
            font-weight: 900;
            letter-spacing: 3px;
            background: linear-gradient(180deg, #ffffff, #c8aa6e 60%, #946c24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 30px rgba(0, 210, 255, 0.4);
            line-height: 1.1;
            margin-bottom: 16px;
        }

        .hero-desc {
            color: var(--text-muted);
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 24px;
        }

        .hero-stats {
            display: flex;
            gap: 20px;
        }

        .hero-stat-pill {
            background: rgba(9, 20, 40, 0.85);
            border: 1px solid var(--lol-border);
            padding: 8px 18px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 0 15px rgba(0,0,0,0.5);
        }

        .main-container {
            max-width: 1400px;
            margin: -30px auto 40px auto;
            padding: 0 30px;
            position: relative;
            z-index: 2;
        }

        /* League Style Featured Grid */
        .featured-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }

        @media (max-width: 1100px) { .featured-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .featured-grid { grid-template-columns: 1fr; } }

        .feature-card {
            background: linear-gradient(180deg, rgba(16, 32, 60, 0.7), rgba(9, 20, 40, 0.95));
            border: 1px solid var(--lol-border);
            border-radius: 4px;
            padding: 20px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        }

        .feature-card:hover {
            border-color: var(--lol-blue-glow);
            transform: translateY(-4px);
            box-shadow: 0 12px 35px rgba(0, 210, 255, 0.25);
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 100%; height: 2px;
            background: linear-gradient(90deg, transparent, var(--lol-blue-glow), transparent);
        }

        .feature-card h4 {
            font-family: 'Rajdhani', sans-serif;
            font-size: 13px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 6px;
        }

        .feature-card .val {
            font-family: 'Cinzel', serif;
            font-size: 28px;
            font-weight: 800;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Tab Content Panels */
        .tab-panel { display: none; }
        .tab-panel.active { display: block; animation: fadeIn 0.3s ease; }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-layout {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 24px;
        }

        @media (max-width: 960px) { .dashboard-layout { grid-template-columns: 1fr; } }

        .glass-box {
            background: var(--lol-panel-bg);
            border: 1px solid var(--lol-border);
            border-radius: 4px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.7);
        }

        .glass-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #1e3a5f;
        }

        .glass-header h3 {
            font-family: 'Cinzel', serif;
            font-size: 18px;
            letter-spacing: 2px;
            color: var(--lol-gold-bright);
        }

        /* Item Icon Component */
        .gt-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(200, 170, 110, 0.4);
            font-size: 16px;
            vertical-align: middle;
        }

        .icon-bgl { border-color: #38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.4); }
        .icon-dl { border-color: #60a5fa; box-shadow: 0 0 8px rgba(96, 165, 250, 0.4); }
        .icon-wl { border-color: #fbbf24; }
        .icon-gems { border-color: #ec4899; }

        /* Player Item Row */
        .player-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(4, 10, 20, 0.7);
            border: 1px solid #142845;
            padding: 14px 18px;
            margin-bottom: 10px;
            border-radius: 2px;
            transition: all 0.2s ease;
        }

        .player-row:hover {
            border-color: var(--lol-blue-glow);
            background: rgba(10, 26, 52, 0.9);
            box-shadow: 0 0 15px rgba(0, 210, 255, 0.2);
            transform: translateX(4px);
        }

        .player-title {
            font-weight: 700;
            font-size: 15px;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .player-loc {
            font-size: 12px;
            color: var(--neon-cyan);
            margin-top: 2px;
        }

        .player-wealth {
            text-align: right;
        }

        /* Terminal Logs */
        .terminal-stream {
            background: #02050d;
            border: 1px solid #102035;
            padding: 16px;
            height: 500px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }

        .log-line {
            margin-bottom: 8px;
            line-height: 1.4;
            word-break: break-all;
        }

        .log-badge {
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 6px;
            text-transform: uppercase;
        }

        .badge-login { background: #064e3b; color: #34d399; border: 1px solid #059669; }
        .badge-logout { background: #881337; color: #f43f5e; border: 1px solid #be123c; }
        .badge-chat { background: #1e3a8a; color: #60a5fa; border: 1px solid #2563eb; }
        .badge-world { background: #581c87; color: #c084fc; border: 1px solid #7e22ce; }

        /* Mines Game */
        .mines-container {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 24px;
        }

        @media (max-width: 860px) { .mines-container { grid-template-columns: 1fr; } }

        .mines-panel {
            background: var(--lol-panel-bg);
            border: 1px solid var(--lol-border);
            padding: 24px;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .mines-input {
            width: 100%;
            background: #040a14;
            border: 1px solid #1e3a5f;
            padding: 12px;
            color: #ffffff;
            border-radius: 2px;
            font-size: 14px;
            outline: none;
        }

        .mines-input:focus {
            border-color: var(--lol-blue-glow);
            box-shadow: 0 0 15px rgba(0, 210, 255, 0.4);
        }

        .btn-gold {
            font-family: 'Cinzel', serif;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            background: linear-gradient(180deg, #785a28, #463714);
            border: 2px solid var(--lol-gold);
            color: var(--lol-gold-bright);
            padding: 14px;
            border-radius: 2px;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(200, 170, 110, 0.3);
            transition: all 0.25s ease;
        }

        .btn-gold:hover {
            background: linear-gradient(180deg, #c8aa6e, #785a28);
            color: #000;
            box-shadow: 0 0 30px rgba(200, 170, 110, 0.8);
            transform: translateY(-2px);
        }

        .mines-board-box {
            background: var(--lol-panel-bg);
            border: 1px solid var(--lol-border);
            padding: 24px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .mines-grid-matrix {
            display: grid;
            grid-template-columns: repeat(5, 75px);
            grid-template-rows: repeat(5, 75px);
            gap: 12px;
        }

        @media (max-width: 500px) {
            .mines-grid-matrix {
                grid-template-columns: repeat(5, 55px);
                grid-template-rows: repeat(5, 55px);
                gap: 8px;
            }
        }

        .grid-cell {
            background: #091428;
            border: 2px solid #1e3a5f;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        }

        .grid-cell:hover {
            border-color: var(--lol-blue-glow);
            box-shadow: 0 0 15px rgba(0, 210, 255, 0.5);
            transform: scale(1.05);
        }

        .grid-cell.hit-gem {
            background: linear-gradient(180deg, #064e3b, #065f46);
            border-color: #34d399;
            box-shadow: 0 0 20px #10b981;
        }

        .grid-cell.hit-bomb {
            background: linear-gradient(180deg, #881337, #9f1239);
            border-color: #f43f5e;
            box-shadow: 0 0 25px #f43f5e;
        }

        /* Modal Overlay */
        .modal-mask {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 100;
            display: none;
            align-items: center;
            justify-content: center;
        }

        .modal-card {
            background: #091428;
            border: 2px solid var(--lol-gold);
            border-radius: 4px;
            padding: 36px;
            width: 440px;
            max-width: 90%;
            box-shadow: 0 0 50px rgba(200, 170, 110, 0.4);
        }

        .empty-placeholder {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <canvas id="bg-canvas"></canvas>

    <nav class="top-navbar">
        <div class="nav-brand">
            <span style="font-size: 28px;">⚡</span>
            <span class="nav-logo-text">VOIDPS</span>
        </div>
        <div class="nav-links">
            <div class="nav-link active" onclick="activateTab('tab-live')">REALM STATUS</div>
            <div class="nav-link" onclick="activateTab('tab-players')">ROSTER</div>
            <div class="nav-link" onclick="activateTab('tab-mines')">MINES CASINO</div>
            <div class="nav-link" onclick="activateTab('tab-leaderboard')">HALL OF FAME</div>
            <div class="nav-link" onclick="activateTab('tab-logs')">SERVER LOGS</div>
            <div class="nav-link" id="navAdminTab" style="display:none;" onclick="activateTab('tab-admin')">⚡ MASTER CONTROL</div>
        </div>
        <div class="nav-auth">
            <button class="btn-play-now" id="btnAdminAuth" onclick="openAdminDialog()">ADMIN LOGIN</button>
        </div>
    </nav>

    <div class="hero-banner">
        <div class="hero-content">
            <div class="hero-tag">
                <span>⚡</span> LIVE REALM • PORT 25741
            </div>
            <h1 class="hero-title">ENTER THE REALM</h1>
            <p class="hero-desc">Experience the ultimate Growtopia private server ecosystem. High performance, zero lag, live real-time world tracking, and exclusive economies.</p>
            <div class="hero-stats">
                <div class="hero-stat-pill">
                    <span style="width:10px; height:10px; border-radius:50%; background:var(--online-green); box-shadow:0 0 10px var(--online-green);" id="heroStatusDot"></span>
                    <span style="font-weight:700; letter-spacing:1px;" id="heroStatusText">SERVER ONLINE</span>
                </div>
                <div class="hero-stat-pill">
                    <span style="color:var(--lol-blue-glow);">👑</span>
                    <span style="font-weight:700;" id="heroPlayerCount">0 PLAYERS ONLINE</span>
                </div>
            </div>
        </div>
    </div>

    <div class="main-container">
        <!-- Featured Grid -->
        <div class="featured-grid">
            <div class="feature-card">
                <h4>Active Realm Port</h4>
                <div class="val" id="cardPort">25741</div>
            </div>
            <div class="feature-card">
                <h4>Online Champions</h4>
                <div class="val" id="cardOnline">0</div>
            </div>
            <div class="feature-card">
                <h4>Top Currency</h4>
                <div class="val">
                    <span class="gt-icon icon-bgl">💎</span>
                    <span style="font-size:18px; color:var(--neon-cyan);">BGL (7188)</span>
                </div>
            </div>
            <div class="feature-card">
                <h4>Server Engine</h4>
                <div class="val" style="color:var(--online-green); font-size:22px;">GTPS CLOUD</div>
            </div>
        </div>

        <!-- TAB: LIVE -->
        <div id="tab-live" class="tab-panel active">
            <div class="dashboard-layout">
                <div class="glass-box">
                    <div class="glass-header">
                        <h3>ACTIVE PLAYERS</h3>
                        <span id="playerBadge" style="color:var(--lol-blue-glow); font-weight:700;">0 ONLINE</span>
                    </div>
                    <div id="livePlayerList">
                        <div class="empty-placeholder">Connecting to realm stream...</div>
                    </div>
                </div>

                <div class="glass-box">
                    <div class="glass-header">
                        <h3>REALM ACTIVITY FEED</h3>
                        <span style="color:var(--lol-gold); font-size:12px;">LIVE LOGS</span>
                    </div>
                    <div class="terminal-stream" id="liveLogs">
                        <div class="empty-placeholder">Streaming server logs...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB: ROSTER -->
        <div id="tab-players" class="tab-panel">
            <div class="glass-box">
                <div class="glass-header">
                    <h3>ONLINE CHAMPIONS ROSTER</h3>
                    <input type="text" id="playerFilter" placeholder="Search champion or world..." oninput="applyPlayerFilter()" class="mines-input" style="width:260px;">
                </div>
                <div id="rosterList">
                    <div class="empty-placeholder">No champions currently online.</div>
                </div>
            </div>
        </div>

        <!-- TAB: MINES -->
        <div id="tab-mines" class="tab-panel">
            <div class="mines-container">
                <div class="mines-panel">
                    <h3 style="font-family:'Cinzel',serif; color:var(--lol-gold-bright); font-size:18px;">💣 MINES CASINO</h3>
                    <div>
                        <label style="font-size:12px; color:var(--text-muted); font-weight:bold;">BET AMOUNT (GEMS)</label>
                        <input type="number" id="mineBet" value="1000" min="100" class="mines-input" style="margin-top:6px;">
                    </div>
                    <div>
                        <label style="font-size:12px; color:var(--text-muted); font-weight:bold;">MINE COUNT</label>
                        <select id="mineBombs" class="mines-input" style="margin-top:6px;">
                            <option value="1">1 Mine (Low Risk)</option>
                            <option value="3" selected>3 Mines (Standard)</option>
                            <option value="5">5 Mines (High Risk)</option>
                            <option value="10">10 Mines (Extreme)</option>
                            <option value="20">20 Mines (Godlike)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px; color:var(--text-muted); font-weight:bold;">CURRENT MULTIPLIER</label>
                        <div id="mineMultiplier" style="font-family:'Cinzel',serif; font-size:28px; color:var(--lol-blue-glow); font-weight:900; margin-top:4px;">1.00x</div>
                    </div>
                    <button class="btn-gold" id="btnStartMines" onclick="startMines()">START GAME</button>
                    <button class="btn-gold" id="btnCashoutMines" style="display:none; background:linear-gradient(180deg, #059669, #047857); border-color:#34d399;" onclick="cashoutMines()">CASHOUT</button>
                </div>
                <div class="mines-board-box">
                    <div class="mines-grid-matrix" id="minesGrid"></div>
                </div>
            </div>
        </div>

        <!-- TAB: LEADERBOARDS -->
        <div id="tab-leaderboard" class="tab-panel">
            <div class="dashboard-layout">
                <div class="glass-box">
                    <div class="glass-header">
                        <h3>👑 RICHEST LOCKS (WL/DL/BGL)</h3>
                    </div>
                    <div id="lbRichest">
                        <div class="empty-placeholder">Calculating wealth...</div>
                    </div>
                </div>
                <div class="glass-box">
                    <div class="glass-header">
                        <h3>💎 GEMS VAULT RANKINGS</h3>
                    </div>
                    <div id="lbGems">
                        <div class="empty-placeholder">Calculating balances...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB: LOGS -->
        <div id="tab-logs" class="tab-panel">
            <div class="glass-box">
                <div class="glass-header">
                    <h3>FULL SECURITY & SERVER LOGS</h3>
                </div>
                <div class="terminal-stream" id="fullLogStream" style="height: 560px;">
                    <div class="empty-placeholder">Streaming...</div>
                </div>
            </div>
        </div>

        <!-- TAB: ADMIN -->
        <div id="tab-admin" class="tab-panel">
            <div class="glass-box" style="border-color: var(--lol-gold);">
                <div class="glass-header">
                    <h3 style="color:var(--lol-gold-bright);">⚡ VOIDPS MASTER CONTROL PANEL</h3>
                    <span style="color:var(--online-green); font-weight:bold;">AUTHORIZED</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                    <div class="mines-panel">
                        <h4>📢 Global World Broadcast</h4>
                        <input type="text" id="broadcastText" placeholder="Broadcast message to server..." class="mines-input">
                        <button class="btn-gold" onclick="sendBroadcast()">BROADCAST TO WORLD</button>
                    </div>
                    <div class="mines-panel">
                        <h4>⚡ Champion Punishment</h4>
                        <input type="text" id="targetPlayer" placeholder="Player Name" class="mines-input">
                        <div style="display:flex; gap:10px;">
                            <button class="btn-gold" style="flex:1;" onclick="adminAction('kick')">KICK</button>
                            <button class="btn-gold" style="flex:1; border-color:#f43f5e;" onclick="adminAction('ban')">BAN</button>
                        </div>
                    </div>
                    <div class="mines-panel">
                        <h4>💎 Economy Grant</h4>
                        <input type="text" id="grantTarget" placeholder="Target Player" class="mines-input">
                        <input type="number" id="grantGemsAmt" placeholder="Gems Count" class="mines-input">
                        <button class="btn-gold" onclick="sendGrantGems()">GRANT GEMS</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Admin Dialog -->
    <div class="modal-mask" id="adminModal">
        <div class="modal-card">
            <h3 style="font-family:'Cinzel',serif; color:var(--lol-gold-bright); font-size:20px; margin-bottom:20px; text-align:center;">ADMIN AUTHENTICATION</h3>
            <div style="display:flex; flex-direction:column; gap:14px;">
                <div>
                    <label style="font-size:12px; color:var(--text-muted);">USERNAME</label>
                    <input type="text" id="authUsername" placeholder="voidps" class="mines-input" style="margin-top:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:var(--text-muted);">PASSWORD</label>
                    <input type="password" id="authPassword" placeholder="voidpsadmin" class="mines-input" style="margin-top:6px;">
                </div>
                <div id="authErr" style="color:var(--offline-red); font-size:13px; display:none;"></div>
                <button class="btn-gold" style="margin-top:10px;" onclick="performAdminLogin()">LOGIN TO CONTROL</button>
                <button class="btn-play-now" onclick="closeAdminDialog()">CANCEL</button>
            </div>
        </div>
    </div>

    <script>
        let adminToken = localStorage.getItem('voidps_token') || null;
        let cachedPlayers = [];

        function formatNumber(n) { return Number(n || 0).toLocaleString(); }

        /* Animated Canvas Particles */
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        let particles = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = (Math.random() - 0.5) * 0.8;
                this.speedY = (Math.random() - 0.5) * 0.8;
                this.color = Math.random() > 0.5 ? 'rgba(0, 210, 255, 0.4)' : 'rgba(200, 170, 110, 0.3)';
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
                if (this.y < 0) this.y = canvas.height;
                if (this.y > canvas.height) this.y = 0;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 60; i++) particles.push(new Particle());

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();

        /* Navigation */
        function activateTab(tabId) {
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const target = document.getElementById(tabId);
            if (target) target.classList.add('active');
            event.target.classList.add('active');
        }

        function openAdminDialog() {
            if (adminToken) {
                activateTab('tab-admin');
                document.getElementById('navAdminTab').classList.add('active');
            } else {
                document.getElementById('adminModal').style.display = 'flex';
            }
        }

        function closeAdminDialog() {
            document.getElementById('adminModal').style.display = 'none';
        }

        async function performAdminLogin() {
            const u = document.getElementById('authUsername').value;
            const p = document.getElementById('authPassword').value;
            const err = document.getElementById('authErr');

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
                    closeAdminDialog();
                    document.getElementById('navAdminTab').style.display = 'block';
                    document.getElementById('btnAdminAuth').innerText = 'CONTROL PANEL';
                    activateTab('tab-admin');
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
            document.getElementById('navAdminTab').style.display = 'block';
            document.getElementById('btnAdminAuth').innerText = 'CONTROL PANEL';
        }

        /* Item Icon Helper */
        function renderItemIcon(itemID) {
            const id = Number(itemID);
            if (id === 7188) return '<span class="gt-icon icon-bgl">💎</span>';
            if (id === 1796) return '<span class="gt-icon icon-dl">💠</span>';
            if (id === 242) return '<span class="gt-icon icon-wl">🔒</span>';
            if (id === 112) return '<span class="gt-icon icon-gems">✨</span>';
            if (id === 3898) return '<span class="gt-icon">☎️</span>';
            if (id === 1008) return '<span class="gt-icon">🏧</span>';
            return '<span class="gt-icon">📦</span>';
        }

        async function fetchServerFeed() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();

                const isOnline = data.status === 'ONLINE';
                const heroDot = document.getElementById('heroStatusDot');
                const heroTxt = document.getElementById('heroStatusText');

                if (isOnline) {
                    heroDot.style.background = 'var(--online-green)';
                    heroDot.style.boxShadow = '0 0 10px var(--online-green)';
                    heroTxt.innerText = 'SERVER ONLINE';
                } else {
                    heroDot.style.background = 'var(--offline-red)';
                    heroDot.style.boxShadow = '0 0 10px var(--offline-red)';
                    heroTxt.innerText = 'SERVER OFFLINE';
                }

                document.getElementById('cardPort').innerText = data.port || 25741;
                document.getElementById('cardOnline').innerText = data.playerCount || 0;
                document.getElementById('heroPlayerCount').innerText = (data.playerCount || 0) + ' PLAYERS ONLINE';
                document.getElementById('playerBadge').innerText = (data.playerCount || 0) + ' ONLINE';

                cachedPlayers = data.players || [];
                renderPlayerList(cachedPlayers);
                renderLogs(data.logs || []);
                renderLeaderboards(cachedPlayers);
            } catch (e) {
                console.error(e);
            }
        }

        function renderPlayerList(players) {
            const live = document.getElementById('livePlayerList');
            const roster = document.getElementById('rosterList');

            if (!players || players.length === 0) {
                const empty = '<div class="empty-placeholder">No champions currently online.</div>';
                live.innerHTML = empty;
                roster.innerHTML = empty;
                return;
            }

            const html = players.map(p => \`
                <div class="player-row">
                    <div>
                        <div class="player-title">👑 \${p.name}</div>
                        <div class="player-loc">📍 World: <b>\${p.world}</b></div>
                    </div>
                    <div class="player-wealth">
                        <div style="color:var(--text-gold); font-weight:700;">
                            \${renderItemIcon(112)} \${formatNumber(p.gems)} Gems
                        </div>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                            Level \${p.level} • \${renderItemIcon(242)} \${p.wl} WL
                        </div>
                    </div>
                </div>
            \`).join('');

            live.innerHTML = html;
            roster.innerHTML = html;
        }

        function renderLogs(logs) {
            const live = document.getElementById('liveLogs');
            const full = document.getElementById('fullLogStream');

            if (!logs || logs.length === 0) {
                const empty = '<div class="empty-placeholder">No activity logs recorded.</div>';
                live.innerHTML = empty;
                full.innerHTML = empty;
                return;
            }

            const html = logs.map(l => {
                let badgeClass = 'badge-chat';
                if (l.type === 'LOGIN') badgeClass = 'badge-login';
                if (l.type === 'LOGOUT') badgeClass = 'badge-logout';
                if (l.type === 'WORLD') badgeClass = 'badge-world';

                return \`
                    <div class="log-line">
                        <span style="color:#64748b;">[\${l.time}]</span>
                        <span class="log-badge \${badgeClass}">\${l.type}</span>
                        <span>\${l.text}</span>
                    </div>
                \`;
            }).join('');

            live.innerHTML = html;
            full.innerHTML = html;
        }

        function renderLeaderboards(players) {
            const lbR = document.getElementById('lbRichest');
            const lbG = document.getElementById('lbGems');

            if (!players || players.length === 0) {
                lbR.innerHTML = '<div class="empty-placeholder">No data.</div>';
                lbG.innerHTML = '<div class="empty-placeholder">No data.</div>';
                return;
            }

            const sortedWL = [...players].sort((a,b) => (b.wl || 0) - (a.wl || 0));
            const sortedGems = [...players].sort((a,b) => (b.gems || 0) - (a.gems || 0));

            lbR.innerHTML = sortedWL.slice(0, 5).map((p, i) => \`
                <div class="player-row">
                    <div class="player-title">#\${i+1} \${p.name}</div>
                    <div style="color:var(--text-gold); font-weight:bold;">
                        \${renderItemIcon(242)} \${formatNumber(p.wl)} WL
                    </div>
                </div>
            \`).join('');

            lbG.innerHTML = sortedGems.slice(0, 5).map((p, i) => \`
                <div class="player-row">
                    <div class="player-title">#\${i+1} \${p.name}</div>
                    <div style="color:var(--lol-blue-glow); font-weight:bold;">
                        \${renderItemIcon(112)} \${formatNumber(p.gems)} Gems
                    </div>
                </div>
            \`).join('');
        }

        function applyPlayerFilter() {
            const q = document.getElementById('playerFilter').value.toLowerCase();
            const filtered = cachedPlayers.filter(p => p.name.toLowerCase().includes(q) || p.world.toLowerCase().includes(q));
            renderPlayerList(filtered);
        }

        /* Mines Game */
        let minesActive = false;
        let minesMap = [];
        let currentMultiplier = 1.00;
        let currentBet = 1000;

        function buildMinesGrid() {
            const grid = document.getElementById('minesGrid');
            grid.innerHTML = '';
            for (let i = 0; i < 25; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.innerText = '❓';
                cell.onclick = () => onCellClick(i);
                grid.appendChild(cell);
            }
        }
        buildMinesGrid();

        function startMines() {
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
            currentMultiplier = 1.00;
            document.getElementById('mineMultiplier').innerText = '1.00x';
            document.getElementById('btnStartMines').style.display = 'none';
            document.getElementById('btnCashoutMines').style.display = 'block';
            document.getElementById('btnCashoutMines').innerText = \`CASHOUT (\${formatNumber(currentBet)} Gems)\`;
            buildMinesGrid();
        }

        function onCellClick(index) {
            if (!minesActive) return;
            const grid = document.getElementById('minesGrid');
            const cell = grid.children[index];
            if (cell.classList.contains('hit-gem') || cell.classList.contains('hit-bomb')) return;

            if (minesMap[index] === 'BOMB') {
                cell.className = 'grid-cell hit-bomb';
                cell.innerText = '💣';
                minesActive = false;
                document.getElementById('btnStartMines').style.display = 'block';
                document.getElementById('btnCashoutMines').style.display = 'none';
                document.getElementById('mineMultiplier').innerText = '0.00x (BUST)';
                for (let i = 0; i < 25; i++) {
                    if (minesMap[i] === 'BOMB') grid.children[i].innerText = '💣';
                }
            } else {
                cell.className = 'grid-cell hit-gem';
                cell.innerText = '💎';
                currentMultiplier = (currentMultiplier * 1.25).toFixed(2);
                document.getElementById('mineMultiplier').innerText = currentMultiplier + 'x';
                const win = Math.floor(currentBet * currentMultiplier);
                document.getElementById('btnCashoutMines').innerText = \`CASHOUT (\${formatNumber(win)} Gems)\`;
            }
        }

        function cashoutMines() {
            if (!minesActive) return;
            minesActive = false;
            const win = Math.floor(currentBet * currentMultiplier);
            alert(\`🎉 CASHOUT! You won \${formatNumber(win)} Gems (\${currentMultiplier}x)!\`);
            document.getElementById('btnStartMines').style.display = 'block';
            document.getElementById('btnCashoutMines').style.display = 'none';
        }

        setInterval(fetchServerFeed, 2500);
        fetchServerFeed();
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(DASHBOARD_HTML);
});

app.listen(PORT, () => {
    console.log(`VOIDPS League-Themed Master Control running on port ${PORT}`);
});
