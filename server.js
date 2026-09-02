const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GTPS_PORT = process.env.GTPS_PORT || 25741;
const GTPS_CLOUD_API = `https://api.gtps.cloud/g-api/${GTPS_PORT}/status`;

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
                logs: data.logs || []
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

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VOIDPS • Official Growtopia Realm</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-black: #050104;
            --bg-card: rgba(18, 3, 10, 0.88);
            --neon-red: #ff0044;
            --neon-crimson: #e11d48;
            --neon-glow: rgba(255, 0, 68, 0.45);
            --red-border: rgba(255, 0, 68, 0.4);
            --text-main: #ffffff;
            --text-muted: #fda4af;
            --online-green: #00ff88;
            --offline-red: #ff0044;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Space Grotesk', sans-serif; }

        body {
            background-color: var(--bg-black);
            color: var(--text-main);
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
            background-image: 
                radial-gradient(circle at 15% 20%, rgba(255, 0, 68, 0.16) 0%, transparent 40%),
                radial-gradient(circle at 85% 20%, rgba(225, 29, 72, 0.16) 0%, transparent 45%),
                radial-gradient(circle at 50% 80%, rgba(136, 19, 55, 0.22) 0%, transparent 50%);
        }

        #lightning-canvas {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 0;
        }

        /* Top Navbar */
        .navbar {
            position: relative;
            z-index: 10;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 44px;
            height: 76px;
            background: rgba(6, 1, 4, 0.95);
            border-bottom: 2px solid var(--red-border);
            box-shadow: 0 4px 35px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 0, 68, 0.2);
        }

        .nav-logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .nav-logo h1 {
            font-family: 'Syne', sans-serif;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: 2px;
            background: linear-gradient(180deg, #ffffff, #ff0044);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 20px rgba(255, 0, 68, 0.4);
        }

        .nav-controls {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .lang-switch-btn {
            background: rgba(255, 0, 68, 0.15);
            border: 1px solid var(--red-border);
            color: #fff;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 700;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.25s ease;
        }

        .lang-switch-btn:hover {
            background: rgba(255, 0, 68, 0.35);
            box-shadow: 0 0 20px var(--neon-glow);
            transform: translateY(-2px);
        }

        .flag-img {
            width: 22px;
            height: 15px;
            border-radius: 2px;
            object-fit: cover;
            box-shadow: 0 0 8px rgba(0,0,0,0.5);
        }

        /* Hero Section */
        .hero {
            position: relative;
            z-index: 1;
            padding: 80px 20px 40px 20px;
            text-align: center;
            max-width: 960px;
            margin: 0 auto;
        }

        .hero h2 {
            font-family: 'Syne', sans-serif;
            font-size: 54px;
            font-weight: 900;
            letter-spacing: -1px;
            background: linear-gradient(180deg, #ffffff, #ff4d6d 60%, #ff0044);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 35px rgba(255, 0, 68, 0.6);
            margin-bottom: 16px;
            line-height: 1.1;
        }

        @media (max-width: 768px) { .hero h2 { font-size: 38px; } }

        .hero p {
            color: var(--text-muted);
            font-size: 16px;
            margin-bottom: 34px;
            line-height: 1.6;
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
        }

        .hero-action-buttons {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 40px;
        }

        .btn-glow-red {
            font-family: 'Syne', sans-serif;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            background: linear-gradient(135deg, #e11d48, #ff0044);
            border: 2px solid #ff4d6d;
            color: #ffffff;
            padding: 16px 36px;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 0 30px rgba(255, 0, 68, 0.7);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-glow-red:hover {
            transform: translateY(-3px) scale(1.03);
            box-shadow: 0 0 45px rgba(255, 0, 68, 1);
            filter: brightness(1.15);
        }

        .btn-glow-store {
            font-family: 'Syne', sans-serif;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            background: rgba(20, 3, 10, 0.85);
            border: 2px solid var(--red-border);
            color: #ff99aa;
            padding: 16px 36px;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(0,0,0,0.6);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-glow-store:hover {
            background: rgba(45, 6, 22, 0.95);
            border-color: var(--neon-red);
            color: #fff;
            box-shadow: 0 0 30px var(--neon-glow);
            transform: translateY(-3px);
        }

        /* Status Cards (Only Status and Players) */
        .status-container {
            max-width: 680px;
            margin: 0 auto 50px auto;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            position: relative;
            z-index: 1;
            padding: 0 20px;
        }

        @media (max-width: 500px) { .status-container { grid-template-columns: 1fr; } }

        .status-card {
            background: var(--bg-card);
            border: 1px solid var(--red-border);
            padding: 24px;
            border-radius: 14px;
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(12px);
            text-align: center;
            transition: all 0.25s ease;
        }

        .status-card:hover {
            border-color: var(--neon-red);
            box-shadow: 0 0 30px var(--neon-glow);
            transform: translateY(-3px);
        }

        .status-card h4 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--text-muted);
            margin-bottom: 8px;
            font-weight: 700;
        }

        .status-card .val {
            font-family: 'Syne', sans-serif;
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        /* Tutorial Modal */
        .tutorial-modal {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.92);
            backdrop-filter: blur(14px);
            z-index: 100;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .tutorial-box {
            background: #080105;
            border: 2px solid var(--neon-red);
            border-radius: 18px;
            width: 840px;
            max-width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 0 60px rgba(255, 0, 68, 0.6);
            padding: 32px;
            animation: popIn 0.25s ease;
        }

        @keyframes popIn {
            from { transform: scale(0.92); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .tutorial-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--red-border);
        }

        .tutorial-header h3 {
            font-family: 'Syne', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: #ff4d6d;
            letter-spacing: 1px;
        }

        .platform-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .plat-btn {
            background: rgba(20, 3, 10, 0.85);
            border: 1px solid var(--red-border);
            color: var(--text-muted);
            padding: 10px 22px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .plat-btn:hover {
            color: white;
            border-color: var(--neon-red);
        }

        .plat-btn.active {
            background: linear-gradient(135deg, #e11d48, #ff0044);
            border-color: #ff4d6d;
            color: white;
            box-shadow: 0 0 25px var(--neon-glow);
        }

        /* Step Card */
        .guide-container {
            background: #0f0209;
            border: 1px solid var(--red-border);
            border-radius: 14px;
            padding: 26px;
            display: flex;
            flex-direction: column;
            gap: 22px;
        }

        .step-item {
            display: flex;
            gap: 18px;
        }

        .step-num {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 0, 68, 0.25);
            border: 2px solid var(--neon-red);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 16px;
            flex-shrink: 0;
            box-shadow: 0 0 12px var(--neon-glow);
        }

        .step-content h4 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 17px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 4px;
        }

        .step-content p {
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.5;
        }

        .code-snippet {
            background: #000000;
            border: 1px solid #3d0517;
            padding: 10px 14px;
            border-radius: 6px;
            color: #38bdf8;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            margin-top: 8px;
            word-break: break-all;
        }

        .guide-btn {
            background: rgba(255, 0, 68, 0.2);
            border: 1px solid var(--neon-red);
            color: #fff;
            padding: 9px 18px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            margin-top: 10px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
        }

        .guide-btn:hover {
            background: var(--neon-red);
            box-shadow: 0 0 15px var(--neon-glow);
        }

        .apk-card {
            background: rgba(255, 0, 68, 0.08);
            border: 1px dashed var(--neon-red);
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 22px;
        }

        /* Language Welcome Overlay */
        .lang-modal {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.94);
            backdrop-filter: blur(16px);
            z-index: 200;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .lang-box {
            background: #0d0107;
            border: 2px solid var(--neon-red);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 480px;
            width: 90%;
            box-shadow: 0 0 70px rgba(255, 0, 68, 0.7);
            animation: popIn 0.3s ease;
        }

        .lang-box h3 {
            font-family: 'Syne', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 6px;
            letter-spacing: 1px;
        }

        .lang-options {
            display: flex;
            gap: 16px;
            margin-top: 26px;
        }

        .lang-choice-btn {
            flex: 1;
            background: rgba(22, 3, 12, 0.9);
            border: 2px solid var(--red-border);
            padding: 22px 16px;
            border-radius: 14px;
            color: white;
            font-family: 'Syne', sans-serif;
            font-weight: 800;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .lang-choice-btn:hover {
            border-color: var(--neon-red);
            background: rgba(255, 0, 68, 0.25);
            box-shadow: 0 0 35px var(--neon-glow);
            transform: translateY(-4px);
        }

        .choice-flag {
            width: 48px;
            height: 32px;
            border-radius: 4px;
            box-shadow: 0 0 15px rgba(0,0,0,0.6);
            object-fit: cover;
        }
    </style>
</head>
<body>
    <canvas id="lightning-canvas"></canvas>

    <!-- Language Selector Popup -->
    <div class="lang-modal" id="langModal">
        <div class="lang-box">
            <div style="font-size: 40px; margin-bottom: 8px; filter: drop-shadow(0 0 15px var(--neon-red));">⚡</div>
            <h3>SELECT LANGUAGE</h3>
            <p style="color: var(--text-muted); font-size: 14px;">PILIH BAHASA ANDA UNTUK MELANJUTKAN</p>
            <div class="lang-options">
                <button class="lang-choice-btn" onclick="setLanguage('en')">
                    <img src="https://flagcdn.com/w80/gb.png" alt="English" class="choice-flag">
                    <span>ENGLISH</span>
                </button>
                <button class="lang-choice-btn" onclick="setLanguage('id')">
                    <img src="https://flagcdn.com/w80/id.png" alt="Indonesia" class="choice-flag">
                    <span>INDONESIA</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-logo">
            <span style="font-size: 26px; filter: drop-shadow(0 0 10px var(--neon-red));">⚡</span>
            <h1>VOIDPS</h1>
        </div>
        <div class="nav-controls">
            <button class="lang-switch-btn" onclick="openLanguageModal()">
                <img src="https://flagcdn.com/w80/gb.png" id="currentLangFlag" alt="Language" class="flag-img">
                <span id="currentLangText">ENGLISH</span>
            </button>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <h2 id="heroTitle">THE ULTIMATE GROWTOPIA REALM</h2>
        <p id="heroDesc">Connect to the fastest, zero-lag GTPS Cloud server. Join thousands of champions, conquer custom bosses, and trade in our rich economy.</p>
        
        <div class="hero-action-buttons">
            <button class="btn-glow-red" onclick="openTutorial('windows')">
                <span>📖</span> <span id="btnHowToPlayText">HOW TO PLAY</span>
            </button>
            <button class="btn-glow-store" onclick="alert('Store coming soon!')">
                <span>🛒</span> <span id="btnStoreText">SHOP ASSETS</span>
            </button>
        </div>
    </section>

    <!-- Live Status Cards (Only Status & Players) -->
    <section class="status-container">
        <div class="status-card">
            <h4 id="lblServerStatus">SERVER STATUS</h4>
            <div class="val">
                <span id="statusDot" style="width:12px; height:12px; border-radius:50%; background:var(--online-green); box-shadow:0 0 12px var(--online-green);"></span>
                <span id="statusText">ONLINE</span>
            </div>
        </div>
        <div class="status-card">
            <h4 id="lblOnlinePlayers">ONLINE PLAYERS</h4>
            <div class="val" id="playerCountVal" style="color:#ff4d6d;">0</div>
        </div>
    </section>

    <!-- Tutorial Modal (Exact match to screenshots) -->
    <div class="tutorial-modal" id="tutorialModal">
        <div class="tutorial-box">
            <div class="tutorial-header">
                <h3 id="tutorialModalTitle">HOW TO PLAY ON VOIDPS</h3>
                <button onclick="closeTutorial()" style="background:transparent; border:none; color:var(--text-muted); font-size:26px; cursor:pointer;">&times;</button>
            </div>

            <div class="platform-tabs">
                <button class="plat-btn active" onclick="switchPlatform('windows')">🪟 Windows</button>
                <button class="plat-btn" onclick="switchPlatform('android')">🤖 Android</button>
                <button class="plat-btn" onclick="switchPlatform('ios')">🍎 iOS (Surge 5)</button>
                <button class="plat-btn" onclick="switchPlatform('macos')">🍏 macOS</button>
            </div>

            <!-- WINDOWS GUIDE -->
            <div id="guide-windows" class="guide-content">
                <div class="guide-container">
                    <div class="step-item">
                        <div class="step-num">1</div>
                        <div class="step-content">
                            <h4 id="winStep1Title">Run Notepad as Administrator</h4>
                            <p id="winStep1Desc">Right-click Notepad and choose "Run as Administrator".</p>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">2</div>
                        <div class="step-content">
                            <h4 id="winStep2Title">Open hosts file</h4>
                            <p id="winStep2Desc">Go to File -> Open and navigate to:</p>
                            <div class="code-snippet">C:\\Windows\\System32\\drivers\\etc\\hosts</div>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">3</div>
                        <div class="step-content">
                            <h4 id="winStep3Title">Add entries</h4>
                            <p id="winStep3Desc">Click Copy Hosts, paste the two lines at the bottom of the file, then Save (Ctrl + S).</p>
                            <button class="guide-btn" onclick="copyToClipboard('5.39.13.16 growtopia1.com\\n5.39.13.16 growtopia2.com')">📋 <span id="btnCopyHosts">Copy Hosts</span></button>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">4</div>
                        <div class="step-content">
                            <h4 id="winStep4Title">Launch Growtopia</h4>
                            <p id="winStep4Desc">Open Growtopia and click Play.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ANDROID GUIDE -->
            <div id="guide-android" class="guide-content" style="display:none;">
                <div class="apk-card">
                    <h5 style="color:#ff4d6d; font-size:13px; font-weight:800; letter-spacing:1px; margin-bottom:4px;" id="apkOptional">OPTIONAL • Quick Setup with APK</h5>
                    <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;" id="apkDesc">Want to play without doing any other steps? Download .apk file and install it and you're ready to play! (Connects you directly to GTPS Cloud).</p>
                    <button class="guide-btn" style="background:var(--neon-red);" onclick="alert('Downloading APK...')">📥 <span id="btnDownloadApk">Download GTPS Cloud APK</span></button>
                </div>
                <div class="guide-container">
                    <div class="step-item">
                        <div class="step-num">1</div>
                        <div class="step-content">
                            <h4 id="andStep1Title">Install PowerTunnel</h4>
                            <p id="andStep1Desc">Download from official releases and install the APK on your device.</p>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">2</div>
                        <div class="step-content">
                            <h4 id="andStep2Title">Configure Host Settings</h4>
                            <p id="andStep2Desc">Open PowerTunnel -> ☰ -> Host Settings -> Host list URL.</p>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">3</div>
                        <div class="step-content">
                            <h4 id="andStep3Title">Paste URL</h4>
                            <p id="andStep3Desc">Click Copy URL and paste it into PowerTunnel.</p>
                            <div style="display:flex; gap:10px;">
                                <button class="guide-btn" onclick="copyToClipboard('https://api.gtps.cloud/hosts/25741')">📋 Copy URL</button>
                                <button class="guide-btn" onclick="alert('Downloading vHost...')">📥 Download vHost</button>
                            </div>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">4</div>
                        <div class="step-content">
                            <h4 id="andStep4Title">Start</h4>
                            <p id="andStep4Desc">Set Update period to On start, then press Start.</p>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">5</div>
                        <div class="step-content">
                            <h4 id="andStep5Title">Launch Growtopia</h4>
                            <p id="andStep5Desc">Open Growtopia and click Play.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- IOS GUIDE -->
            <div id="guide-ios" class="guide-content" style="display:none;">
                <div class="guide-container">
                    <div class="step-item">
                        <div class="step-num">1</div>
                        <div class="step-content">
                            <h4 id="iosStep1Title">Install Surge 5</h4>
                            <p id="iosStep1Desc">Download and install Surge 5 from the App Store.</p>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">2</div>
                        <div class="step-content">
                            <h4 id="iosStep2Title">Import Profile</h4>
                            <p id="iosStep2Desc">Open Default.conf -> tap IMPORT -> Download Profile from URL.</p>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">3</div>
                        <div class="step-content">
                            <h4 id="iosStep3Title">Paste URL and Setup</h4>
                            <p id="iosStep3Desc">Click Copy URL, paste into Surge, then tap SETUP and allow the VPN profile.</p>
                            <button class="guide-btn" onclick="copyToClipboard('https://api.gtps.cloud/surge/25741')">📋 Copy URL</button>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">4</div>
                        <div class="step-content">
                            <h4 id="iosStep4Title">Launch Growtopia</h4>
                            <p id="iosStep4Desc">Open Growtopia and click Play.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MACOS GUIDE -->
            <div id="guide-macos" class="guide-content" style="display:none;">
                <div class="guide-container">
                    <div class="step-item">
                        <div class="step-num">1</div>
                        <div class="step-content">
                            <h4 id="macStep1Title">Open Terminal</h4>
                            <p id="macStep1Desc">Open Terminal via Spotlight -> type "Terminal" and press Enter.</p>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">2</div>
                        <div class="step-content">
                            <h4 id="macStep2Title">Edit hosts file</h4>
                            <p id="macStep2Desc">Run the following command:</p>
                            <div class="code-snippet">sudo nano /etc/hosts</div>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">3</div>
                        <div class="step-content">
                            <h4 id="macStep3Title">Add entries</h4>
                            <p id="macStep3Desc">Click Copy Hosts, paste the two lines at the bottom of the file, then save with Ctrl+X then Y.</p>
                            <button class="guide-btn" onclick="copyToClipboard('5.39.13.16 growtopia1.com\\n5.39.13.16 growtopia2.com')">📋 Copy Hosts</button>
                        </div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">4</div>
                        <div class="step-content">
                            <h4 id="macStep4Title">Launch Growtopia</h4>
                            <p id="macStep4Desc">Open Growtopia and click Play.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentLang = localStorage.getItem('voidps_lang') || 'en';

        const TRANSLATIONS = {
            en: {
                flagSrc: 'https://flagcdn.com/w80/gb.png',
                langText: 'ENGLISH',
                heroTitle: 'THE ULTIMATE GROWTOPIA REALM',
                heroDesc: 'Connect to the fastest, zero-lag GTPS Cloud server. Join thousands of champions, conquer custom bosses, and trade in our rich economy.',
                btnHowToPlay: 'HOW TO PLAY',
                btnStore: 'SHOP ASSETS',
                lblStatus: 'SERVER STATUS',
                lblOnline: 'ONLINE PLAYERS',
                modalTitle: 'HOW TO PLAY ON VOIDPS',
                winStep1T: 'Run Notepad as Administrator',
                winStep1D: 'Right-click Notepad and choose "Run as Administrator".',
                winStep2T: 'Open hosts file',
                winStep2D: 'Go to File -> Open and navigate to:',
                winStep3T: 'Add entries',
                winStep3D: 'Click Copy Hosts, paste the two lines at the bottom of the file, then Save (Ctrl + S).',
                winStep4T: 'Launch Growtopia',
                winStep4D: 'Open Growtopia and click Play.',
                apkOpt: 'OPTIONAL • Quick Setup with APK',
                apkD: 'Want to play without doing any other steps? Download .apk file and install it and you are ready to play! (Connects you directly to GTPS Cloud).',
                btnApk: 'Download GTPS Cloud APK',
                andStep1T: 'Install PowerTunnel',
                andStep1D: 'Download from official releases and install the APK on your device.',
                andStep2T: 'Configure Host Settings',
                andStep2D: 'Open PowerTunnel -> ☰ -> Host Settings -> Host list URL.',
                andStep3T: 'Paste URL',
                andStep3D: 'Click Copy URL and paste it into PowerTunnel.',
                andStep4T: 'Start',
                andStep4D: 'Set Update period to On start, then press Start.',
                andStep5T: 'Launch Growtopia',
                andStep5D: 'Open Growtopia and click Play.',
                iosStep1T: 'Install Surge 5',
                iosStep1D: 'Download and install Surge 5 from the App Store.',
                iosStep2T: 'Import Profile',
                iosStep2D: 'Open Default.conf -> tap IMPORT -> Download Profile from URL.',
                iosStep3T: 'Paste URL and Setup',
                iosStep3D: 'Click Copy URL, paste into Surge, then tap SETUP and allow the VPN profile.',
                iosStep4T: 'Launch Growtopia',
                iosStep4D: 'Open Growtopia and click Play.',
                macStep1T: 'Open Terminal',
                macStep1D: 'Open Terminal via Spotlight -> type "Terminal" and press Enter.',
                macStep2T: 'Edit hosts file',
                macStep2D: 'Run the following command:',
                macStep3T: 'Add entries',
                macStep3D: 'Click Copy Hosts, paste the two lines at the bottom of the file, then save with Ctrl+X then Y.',
                macStep4T: 'Launch Growtopia',
                macStep4D: 'Open Growtopia and click Play.'
            },
            id: {
                flagSrc: 'https://flagcdn.com/w80/id.png',
                langText: 'INDONESIA',
                heroTitle: 'SERVER GROWTOPIA TERBAIK',
                heroDesc: 'Terhubung ke server GTPS Cloud tercepat dan tanpa lag. Bergabunglah dengan ribuan pemain, kalahkan custom boss, dan nikmati ekonomi server kami.',
                btnHowToPlay: 'CARA BERMAIN',
                btnStore: 'BELI ITEM',
                lblStatus: 'STATUS SERVER',
                lblOnline: 'PEMAIN ONLINE',
                modalTitle: 'CARA BERMAIN DI VOIDPS',
                winStep1T: 'Buka Notepad sebagai Administrator',
                winStep1D: 'Klik kanan Notepad lalu pilih "Run as Administrator".',
                winStep2T: 'Buka file hosts',
                winStep2D: 'Buka File -> Open lalu navigasi ke:',
                winStep3T: 'Tambahkan entri',
                winStep3D: 'Klik Salin Hosts, tempel kedua baris di bagian bawah file, lalu Simpan (Ctrl + S).',
                winStep4T: 'Buka Growtopia',
                winStep4D: 'Buka aplikasi Growtopia dan tekan Play.',
                apkOpt: 'OPSIONAL • Setup Cepat dengan APK',
                apkD: 'Mau main langsung tanpa repot? Unduh file .apk, pasang di HP Anda dan langsung siap main! (Terhubung langsung ke GTPS Cloud).',
                btnApk: 'Unduh GTPS Cloud APK',
                andStep1T: 'Pasang PowerTunnel',
                andStep1D: 'Unduh dari rilis resmi lalu instal file APK di perangkat Anda.',
                andStep2T: 'Konfigurasi Host Settings',
                andStep2D: 'Buka PowerTunnel -> ☰ -> Host Settings -> Host list URL.',
                andStep3T: 'Tempelkan URL',
                andStep3D: 'Klik Salin URL lalu tempelkan ke kolom PowerTunnel.',
                andStep4T: 'Mulai',
                andStep4D: 'Atur Update period ke On start, lalu tekan Start.',
                andStep5T: 'Buka Growtopia',
                andStep5D: 'Buka aplikasi Growtopia dan tekan Play.',
                iosStep1T: 'Pasang Surge 5',
                iosStep1D: 'Unduh dan pasang aplikasi Surge 5 dari App Store.',
                iosStep2T: 'Impor Profil',
                iosStep2D: 'Buka Default.conf -> tekan IMPORT -> Download Profile from URL.',
                iosStep3T: 'Tempel URL & Pasang',
                iosStep3D: 'Klik Salin URL, tempel di Surge, tekan SETUP lalu izinkan profil VPN.',
                iosStep4T: 'Buka Growtopia',
                iosStep4D: 'Buka aplikasi Growtopia dan tekan Play.',
                macStep1T: 'Buka Terminal',
                macStep1D: 'Buka Terminal via Spotlight -> ketik "Terminal" dan tekan Enter.',
                macStep2T: 'Edit file hosts',
                macStep2D: 'Jalankan perintah berikut:',
                macStep3T: 'Tambahkan entri',
                macStep3D: 'Klik Salin Hosts, tempelkan di bagian paling bawah, lalu simpan dengan Ctrl+X kemudian Y.',
                macStep4T: 'Buka Growtopia',
                macStep4D: 'Buka aplikasi Growtopia dan tekan Play.'
            }
        };

        function setLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('voidps_lang', lang);
            document.getElementById('langModal').style.display = 'none';
            applyTranslations();
        }

        function openLanguageModal() {
            document.getElementById('langModal').style.display = 'flex';
        }

        function applyTranslations() {
            const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
            document.getElementById('currentLangFlag').src = t.flagSrc;
            document.getElementById('currentLangText').innerText = t.langText;
            document.getElementById('heroTitle').innerText = t.heroTitle;
            document.getElementById('heroDesc').innerText = t.heroDesc;
            document.getElementById('btnHowToPlayText').innerText = t.btnHowToPlay;
            document.getElementById('btnStoreText').innerText = t.btnStore;
            document.getElementById('lblServerStatus').innerText = t.lblStatus;
            document.getElementById('lblOnlinePlayers').innerText = t.lblOnline;
            document.getElementById('tutorialModalTitle').innerText = t.modalTitle;

            document.getElementById('winStep1Title').innerText = t.winStep1T;
            document.getElementById('winStep1Desc').innerText = t.winStep1D;
            document.getElementById('winStep2Title').innerText = t.winStep2T;
            document.getElementById('winStep2Desc').innerText = t.winStep2D;
            document.getElementById('winStep3Title').innerText = t.winStep3T;
            document.getElementById('winStep3Desc').innerText = t.winStep3D;
            document.getElementById('winStep4Title').innerText = t.winStep4T;
            document.getElementById('winStep4Desc').innerText = t.winStep4D;

            document.getElementById('apkOptional').innerText = t.apkOpt;
            document.getElementById('apkDesc').innerText = t.apkD;
            document.getElementById('btnDownloadApk').innerText = t.btnApk;
            document.getElementById('andStep1Title').innerText = t.andStep1T;
            document.getElementById('andStep1Desc').innerText = t.andStep1D;
            document.getElementById('andStep2Title').innerText = t.andStep2T;
            document.getElementById('andStep2Desc').innerText = t.andStep2D;
            document.getElementById('andStep3Title').innerText = t.andStep3T;
            document.getElementById('andStep3Desc').innerText = t.andStep3D;
            document.getElementById('andStep4Title').innerText = t.andStep4T;
            document.getElementById('andStep4Desc').innerText = t.andStep4D;
            document.getElementById('andStep5Title').innerText = t.andStep5T;
            document.getElementById('andStep5Desc').innerText = t.andStep5D;

            document.getElementById('iosStep1Title').innerText = t.iosStep1T;
            document.getElementById('iosStep1Desc').innerText = t.iosStep1D;
            document.getElementById('iosStep2Title').innerText = t.iosStep2T;
            document.getElementById('iosStep2Desc').innerText = t.iosStep2D;
            document.getElementById('iosStep3Title').innerText = t.iosStep3T;
            document.getElementById('iosStep3Desc').innerText = t.iosStep3D;
            document.getElementById('iosStep4Title').innerText = t.iosStep4T;
            document.getElementById('iosStep4Desc').innerText = t.iosStep4D;

            document.getElementById('macStep1Title').innerText = t.macStep1T;
            document.getElementById('macStep1Desc').innerText = t.macStep1D;
            document.getElementById('macStep2Title').innerText = t.macStep2T;
            document.getElementById('macStep2Desc').innerText = t.macStep2D;
            document.getElementById('macStep3Title').innerText = t.macStep3T;
            document.getElementById('macStep3Desc').innerText = t.macStep3D;
            document.getElementById('macStep4Title').innerText = t.macStep4T;
            document.getElementById('macStep4Desc').innerText = t.macStep4D;
        }

        if (localStorage.getItem('voidps_lang')) {
            document.getElementById('langModal').style.display = 'none';
        }
        applyTranslations();

        function openTutorial(platform) {
            document.getElementById('tutorialModal').style.display = 'flex';
            switchPlatform(platform || 'windows');
        }

        function closeTutorial() {
            document.getElementById('tutorialModal').style.display = 'none';
        }

        function switchPlatform(plat) {
            document.querySelectorAll('.guide-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.plat-btn').forEach(el => el.classList.remove('active'));
            const target = document.getElementById('guide-' + plat);
            if (target) target.style.display = 'block';
            event.target.classList.add('active');
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        }

        /* Canvas Particle Animation */
        const canvas = document.getElementById('lightning-canvas');
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
                this.size = Math.random() * 3 + 1;
                this.speedX = (Math.random() - 0.5) * 1.2;
                this.speedY = -Math.random() * 1.5 - 0.5;
                this.color = Math.random() > 0.4 ? 'rgba(255, 0, 68, 0.6)' : 'rgba(225, 29, 72, 0.4)';
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.y < 0) this.y = canvas.height;
                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 70; i++) particles.push(new Particle());

        function animateCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            requestAnimationFrame(animateCanvas);
        }
        animateCanvas();

        async function fetchServerStatus() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                const isOnline = data.status === 'ONLINE';

                const dot = document.getElementById('statusDot');
                const txt = document.getElementById('statusText');

                if (isOnline) {
                    dot.style.background = 'var(--online-green)';
                    dot.style.boxShadow = '0 0 14px var(--online-green)';
                    txt.innerText = 'ONLINE';
                    txt.style.color = 'var(--online-green)';
                } else {
                    dot.style.background = 'var(--offline-red)';
                    dot.style.boxShadow = '0 0 14px var(--offline-red)';
                    txt.innerText = 'OFFLINE';
                    txt.style.color = 'var(--offline-red)';
                }

                document.getElementById('playerCountVal').innerText = data.playerCount || 0;
            } catch (e) {
                console.error(e);
            }
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
    console.log(`VOIDPS Red & Black Portal running on port ${PORT}`);
});
