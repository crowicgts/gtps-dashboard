const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

app.get('/logo.png', (req, res) => {
    const localPath = path.join(__dirname, 'public', 'logo.png');
    if (fs.existsSync(localPath)) return res.sendFile(localPath);
    res.status(404).end();
});

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VOID Private Server</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
:root{
    --bg:#09020a;
    --panel:#140711;
    --panel2:#1b0913;
    --red:#ff174f;
    --red2:#ff4d6d;
    --pink:#ff86a1;
    --green:#40ff9a;
    --gold:#ffd35a;
    --text:#fff;
    --muted:#c98c9e;
    --line:rgba(255,23,79,.32);
    --shadow:0 24px 70px rgba(0,0,0,.55);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
    min-height:100vh;
    color:var(--text);
    background:
      radial-gradient(circle at 50% 15%,rgba(255,23,79,.20),transparent 32%),
      radial-gradient(circle at 8% 45%,rgba(150,0,50,.18),transparent 28%),
      radial-gradient(circle at 92% 60%,rgba(255,23,79,.12),transparent 28%),
      linear-gradient(#09020a,#12030c 55%,#070107);
    font-family:Inter,system-ui,sans-serif;
    overflow-x:hidden;
}
body:before{
    content:"";
    position:fixed;inset:0;pointer-events:none;z-index:-1;
    opacity:.22;
    background-image:
      radial-gradient(#ff174f 1px,transparent 1px),
      radial-gradient(#fff 1px,transparent 1px);
    background-size:97px 97px,173px 173px;
    background-position:10px 20px,70px 90px;
}
#fx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
a{text-decoration:none;color:inherit}
button{font:inherit}
.nav{
    height:78px;display:flex;align-items:center;justify-content:space-between;
    padding:0 5vw;position:sticky;top:0;z-index:20;
    background:rgba(8,1,7,.78);backdrop-filter:blur(18px);
    border-bottom:1px solid var(--line);
    box-shadow:0 8px 40px rgba(0,0,0,.35);
}
.brand{display:flex;align-items:center;gap:12px}
.brand-mark{
    width:42px;height:42px;border-radius:10px;
    background:linear-gradient(145deg,#ff2b59,#8e002e);
    border:1px solid #ff6480;
    box-shadow:0 0 25px rgba(255,23,79,.45);
    display:grid;place-items:center;font-family:"Press Start 2P";font-size:13px;
}
.brand span{font-weight:900;letter-spacing:2px}
.navlinks{display:flex;gap:8px}
.navlinks a,.navbtn{
    padding:10px 15px;border:1px solid transparent;border-radius:9px;
    color:#e6b6c1;font-weight:800;font-size:13px;transition:.2s;
    background:transparent;cursor:pointer;
}
.navlinks a:hover,.navbtn:hover{color:white;border-color:var(--line);background:rgba(255,23,79,.09)}
.navright{display:flex;align-items:center;gap:9px}
.social{
    width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--line);
    border-radius:9px;background:rgba(255,255,255,.035);font-weight:900;
}
.social:hover{border-color:var(--red2);box-shadow:0 0 22px rgba(255,23,79,.35);transform:translateY(-2px)}
.lang,.music{
    border:1px solid var(--line);border-radius:9px;background:rgba(255,23,79,.08);
    color:white;padding:10px 13px;font-weight:900;cursor:pointer;
}
.hero{
    max-width:1200px;margin:auto;padding:70px 24px 30px;position:relative;
    display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:25px;
}
.hero-copy{position:relative;z-index:4}
.kicker{
    display:inline-flex;align-items:center;gap:9px;padding:8px 12px;
    border:1px solid var(--line);background:rgba(255,23,79,.08);border-radius:999px;
    color:#ff9bb0;font-weight:900;font-size:11px;letter-spacing:1.8px;
}
.kicker i{width:8px;height:8px;background:var(--green);border-radius:50%;box-shadow:0 0 13px var(--green)}
.hero h1{
    margin-top:18px;font-size:clamp(42px,6vw,76px);line-height:.95;
    font-weight:900;letter-spacing:-4px;
    text-shadow:0 0 35px rgba(255,23,79,.25);
}
.hero h1 b{color:var(--red);font-style:normal}
.hero p{max-width:650px;color:#d9a5b3;line-height:1.7;margin:20px 0 26px;font-size:16px}
.actions{display:flex;gap:12px;flex-wrap:wrap}
.primary,.secondary{
    border-radius:11px;padding:14px 21px;font-weight:900;cursor:pointer;
    border:1px solid var(--red2);transition:.25s;display:inline-flex;align-items:center;gap:9px;
}
.primary{background:linear-gradient(135deg,#ff174f,#b9003d);box-shadow:0 0 35px rgba(255,23,79,.35)}
.secondary{background:rgba(255,255,255,.035);color:#ffd5df}
.primary:hover,.secondary:hover{transform:translateY(-3px);box-shadow:0 0 40px rgba(255,23,79,.5)}
.hero-art{
    min-height:390px;position:relative;display:grid;place-items:center;
}
.art-card{
    position:relative;width:min(100%,530px);border:1px solid rgba(255,255,255,.14);
    border-radius:20px;overflow:hidden;background:#1a0a12;box-shadow:var(--shadow);
    transform:rotate(1deg);
}
.art-card img{
    width:100%;display:block;aspect-ratio:1/1;object-fit:cover;
    image-rendering:auto;filter:saturate(1.12) contrast(1.04);
}
.art-card:after{
    content:"";position:absolute;inset:0;
    background:linear-gradient(180deg,transparent 48%,rgba(8,1,7,.86));
}
.logo-float{
    position:absolute;z-index:5;bottom:-55px;left:-35px;width:min(78%,440px);
    filter:drop-shadow(0 0 25px rgba(255,23,79,.62));
    animation:float 3.6s ease-in-out infinite alternate;
}
@keyframes float{to{transform:translateY(-12px) rotate(-1deg)}}
.world-strip{
    height:86px;margin-top:25px;position:relative;overflow:hidden;
    background:
      linear-gradient(90deg,transparent 0 4%,rgba(255,255,255,.04) 4% 4.5%,transparent 4.5% 10%);
    border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,23,79,.18);
}
.world-strip:before{
    content:"";position:absolute;left:0;right:0;bottom:0;height:34px;
    background:
      linear-gradient(#58c84d 0 6px,#2c8e36 6px 10px,#61391f 10px 100%);
    box-shadow:inset 0 8px 0 rgba(255,255,255,.08);
}
.world-strip:after{
    content:"";position:absolute;left:6%;bottom:31px;width:28px;height:28px;
    background:#48ad43;border-radius:50%;box-shadow:18px -9px 0 #54be4b,36px 1px 0 #3d9f3b,18px 15px 0 #2e8531;
}
.container{max-width:1200px;margin:auto;padding:20px 24px 75px}
.section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin:42px 0 18px}
.section-head h2{font-size:27px;letter-spacing:-1px}
.section-head p{color:#b77c8d;font-size:13px}
.status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.card{
    background:linear-gradient(145deg,rgba(31,9,20,.94),rgba(12,3,10,.96));
    border:1px solid var(--line);border-radius:15px;padding:22px;
    box-shadow:0 15px 45px rgba(0,0,0,.28);position:relative;overflow:hidden;
}
.card:before{content:"";position:absolute;left:0;top:0;width:80px;height:2px;background:var(--red)}
.card-label{font-size:11px;letter-spacing:2px;color:#a97080;font-weight:900}
.card-value{font-size:31px;font-weight:900;margin-top:8px}
.online{color:var(--green);text-shadow:0 0 15px rgba(64,255,154,.35)}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--green);box-shadow:0 0 13px var(--green);margin-right:8px}
.features{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.feature{min-height:155px}
.icon{
    width:44px;height:44px;border-radius:11px;display:grid;place-items:center;
    background:rgba(255,23,79,.12);border:1px solid var(--line);font-size:21px;margin-bottom:15px;
}
.feature h3{font-size:16px;margin-bottom:7px}
.feature p{color:#b98291;font-size:13px;line-height:1.6}
.gallery{display:grid;grid-template-columns:1.35fr .65fr;gap:14px}
.gallery .shot{height:300px;border-radius:15px;overflow:hidden;border:1px solid var(--line);position:relative;background:#0e0710}
.shot img{width:100%;height:100%;object-fit:cover;image-rendering:auto;display:block}
.shot span{position:absolute;left:14px;bottom:13px;padding:7px 10px;border-radius:7px;background:rgba(0,0,0,.72);font-size:10px;font-weight:900;letter-spacing:1px}
.connect{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.steps{display:grid;gap:12px}
.step{display:flex;gap:14px;align-items:flex-start}
.num{
    width:31px;height:31px;flex:0 0 31px;border-radius:8px;display:grid;place-items:center;
    background:rgba(255,23,79,.15);border:1px solid var(--red2);color:white;font-weight:900;
}
.step h3{font-size:14px;margin-bottom:4px}
.step p{font-size:12px;color:#b98291;line-height:1.55}
.code{
    margin-top:8px;background:#070107;border:1px solid #3b0b1c;border-radius:8px;
    padding:10px;font-family:monospace;color:#ff9bb0;font-size:12px;word-break:break-all;
}
.footer{
    border-top:1px solid var(--line);padding:28px 24px 38px;text-align:center;color:#895c6b;font-size:11px;
}
.footer b{color:#d99aaa}
.modal{
    position:fixed;inset:0;background:rgba(0,0,0,.84);backdrop-filter:blur(13px);
    z-index:100;display:none;align-items:center;justify-content:center;padding:20px;
}
.modal.show{display:flex}
.modal-box{
    width:min(880px,100%);max-height:88vh;overflow:auto;background:#10040c;
    border:1px solid var(--red2);border-radius:17px;box-shadow:0 0 70px rgba(255,23,79,.28);padding:25px;
}
.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.modal-head h2{font-size:20px}
.close{border:0;background:none;color:#d99aaa;font-size:28px;cursor:pointer}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px}
.tab{border:1px solid var(--line);background:#180712;color:#d8a3b0;padding:9px 12px;border-radius:8px;cursor:pointer;font-weight:800;font-size:12px}
.tab.active{background:var(--red);border-color:#ff7d98;color:white}
.guide{display:none}.guide.active{display:block}
@media(max-width:900px){
    .navlinks{display:none}
    .hero{grid-template-columns:1fr;padding-top:45px}
    .hero-art{min-height:340px}
    .logo-float{left:3%;bottom:-35px}
    .status-grid{grid-template-columns:1fr 1fr}
    .features{grid-template-columns:1fr 1fr}
    .gallery,.connect{grid-template-columns:1fr}
}
@media(max-width:600px){
    .nav{padding:0 15px}.navright .social{display:none}.music{display:none}
    .hero{padding-left:16px;padding-right:16px}
    .hero h1{letter-spacing:-2px}
    .container{padding-left:16px;padding-right:16px}
    .status-grid,.features{grid-template-columns:1fr}
    .art-card{transform:none}
    .logo-float{width:88%;left:6%}
}
</style>
</head>
<body>
<canvas id="fx"></canvas>

<nav class="nav">
    <a class="brand" href="#">
        <div class="brand-mark">V</div><span>VOID PS</span>
    </a>
    <div class="navlinks">
        <a href="#status">STATUS</a>
        <a href="#features">FEATURES</a>
        <a href="#gallery">WORLD</a>
        <a href="#connect">CONNECT</a>
    </div>
    <div class="navright">
        <a class="social" href="https://discord.gg" target="_blank" title="Discord">◉</a>
        <button class="music" id="musicBtn" onclick="toggleAudio()">🔇 MUSIC OFF</button>
        <button class="lang" onclick="toggleLang()">EN / ID</button>
    </div>
</nav>

<main>
<section class="hero">
    <div class="hero-copy">
        <div class="kicker"><i></i> GTPS CLOUD • VOID PRIVATE SERVER</div>
        <h1>YOUR WORLD.<br><b>YOUR RULES.</b></h1>
        <p id="heroText">
            A Growtopia-inspired private server experience built around custom worlds,
            trading, events, bosses and a fast GTPS Cloud connection.
        </p>
        <div class="actions">
            <button class="primary" onclick="openTutorial()">▶ HOW TO PLAY</button>
            <a class="secondary" href="#status">◈ VIEW SERVER</a>
        </div>
    </div>

    <div class="hero-art">
        <div class="art-card">
            <img src="https://cdn3.xsolla.com/img/misc/images/ceee2713e37d23ad726a71b2d363a34c.png" alt="Pixel sandbox scene">
        </div>
        <img class="logo-float" src="/logo.png" alt="VOID Private Server">
    </div>
</section>

<div class="world-strip"></div>

<div class="container">
<section id="status">
    <div class="section-head">
        <div><h2>SERVER CONTROL CENTER</h2><p>Live information from GTPS Cloud</p></div>
    </div>
    <div class="status-grid">
        <div class="card">
            <div class="card-label">SERVER STATUS</div>
            <div class="card-value online" id="statusText"><span class="dot"></span>ONLINE</div>
        </div>
        <div class="card">
            <div class="card-label">PLAYERS ONLINE</div>
            <div class="card-value" id="playerCount">0</div>
        </div>
        <div class="card">
            <div class="card-label">GTPS PORT</div>
            <div class="card-value" id="portValue">25741</div>
        </div>
    </div>
</section>

<section id="features">
    <div class="section-head">
        <div><h2>WHY VOID?</h2><p>Everything a good GTPS portal should show</p></div>
    </div>
    <div class="features">
        <div class="card feature"><div class="icon">🌎</div><h3>Custom Worlds</h3><p>Build, explore and discover unique pixel worlds made for the VOID community.</p></div>
        <div class="card feature"><div class="icon">💎</div><h3>Trading</h3><p>Trade items and grow your collection inside a player-driven server economy.</p></div>
        <div class="card feature"><div class="icon">⚡</div><h3>Fast Connection</h3><p>Live server status and GTPS Cloud connectivity right on the homepage.</p></div>
        <div class="card feature"><div class="icon">👑</div><h3>Events & Bosses</h3><p>Custom events, challenges and boss fights keep the world active.</p></div>
    </div>
</section>

<section id="gallery">
    <div class="section-head">
        <div><h2>WELCOME TO THE PIXEL WORLD</h2><p>A proper Growtopia-style visual instead of a giant broken image box.</p></div>
    </div>
    <div class="gallery">
        <div class="shot">
            <img src="https://store.ubisoft.com/on/demandware.static/-/Sites-masterCatalog/default/dw9196a025/images/large/6493f06c04058b0ed100b6d0-4.jpg" alt="Growtopia pixel world">
            <span>PIXEL WORLD</span>
        </div>
        <div class="shot">
            <img src="https://image.api.playstation.com/gs2-sec/appkgo/prod/CUSA14348_00/2/i_45b22e52a3ffd1a3f034f3d2768f639172636d029a10d55f459285628d976826/i/pic0.png" alt="Growtopia artwork">
            <span>GROW • BUILD • PLAY</span>
        </div>
    </div>
</section>

<section id="connect">
    <div class="section-head">
        <div><h2>HOW TO CONNECT</h2><p>Quick setup for the VOID private server</p></div>
    </div>
    <div class="connect">
        <div class="card steps">
            <div class="step"><div class="num">1</div><div><h3>Open the hosts file</h3><p>On Windows, open Notepad as Administrator and open the hosts file.</p><div class="code">C:\\Windows\\System32\\drivers\\etc\\hosts</div></div></div>
            <div class="step"><div class="num">2</div><div><h3>Add the VOID entries</h3><p>Paste the server entries supplied by your VOID staff, then save the file.</p></div></div>
            <div class="step"><div class="num">3</div><div><h3>Launch Growtopia</h3><p>Start the game and press Play. The live status above tells you whether the server is reachable.</p></div></div>
        </div>
        <div class="card">
            <div class="card-label">SERVER INFO</div>
            <div style="margin-top:14px;display:grid;gap:13px">
                <div><span style="color:#a97080;font-size:11px">NAME</span><br><b>VOID PRIVATE SERVER</b></div>
                <div><span style="color:#a97080;font-size:11px">PORT</span><br><b id="infoPort">25741</b></div>
                <div><span style="color:#a97080;font-size:11px">STATUS API</span><br><b style="color:var(--green)">LIVE / AUTO REFRESH</b></div>
            </div>
        </div>
    </div>
</section>
</div>
</main>

<footer class="footer">
    <b>VOID PRIVATE SERVER</b> • Built for the VOID community.<br>
    Growtopia is a trademark of Ubisoft. Growtopia imagery/assets belong to their respective owners and are used here as a companion-style visual reference.
</footer>

<div class="modal" id="tutorial">
<div class="modal-box">
    <div class="modal-head"><h2>HOW TO PLAY ON VOID PS</h2><button class="close" onclick="closeTutorial()">×</button></div>
    <div class="tabs">
        <button class="tab active" onclick="showGuide('windows',this)">WINDOWS</button>
        <button class="tab" onclick="showGuide('android',this)">ANDROID</button>
        <button class="tab" onclick="showGuide('ios',this)">IOS</button>
        <button class="tab" onclick="showGuide('mac',this)">MACOS</button>
    </div>
    <div id="windows" class="guide active">
        <div class="card steps">
            <div class="step"><div class="num">1</div><div><h3>Run Notepad as Administrator</h3><p>Right-click Notepad and choose Run as Administrator.</p></div></div>
            <div class="step"><div class="num">2</div><div><h3>Open hosts</h3><div class="code">C:\\Windows\\System32\\drivers\\etc\\hosts</div></div></div>
            <div class="step"><div class="num">3</div><div><h3>Add your VOID host entries</h3><p>Paste the entries provided by your server staff at the bottom and save.</p></div></div>
            <div class="step"><div class="num">4</div><div><h3>Launch Growtopia</h3><p>Open Growtopia and click Play.</p></div></div>
        </div>
    </div>
    <div id="android" class="guide">
        <div class="card steps">
            <div class="step"><div class="num">1</div><div><h3>Install your preferred host/VPN tool</h3><p>Use the setup method currently provided by VOID staff.</p></div></div>
            <div class="step"><div class="num">2</div><div><h3>Apply the VOID host list</h3><p>Paste the current host-list URL supplied by the server.</p></div></div>
            <div class="step"><div class="num">3</div><div><h3>Start the connection</h3><p>Enable the profile, then launch Growtopia.</p></div></div>
        </div>
    </div>
    <div id="ios" class="guide">
        <div class="card steps">
            <div class="step"><div class="num">1</div><div><h3>Install your configured network profile</h3><p>Use the current iOS setup instructions from VOID staff.</p></div></div>
            <div class="step"><div class="num">2</div><div><h3>Enable the profile</h3><p>Allow the network/VPN profile, then open Growtopia.</p></div></div>
        </div>
    </div>
    <div id="mac" class="guide">
        <div class="card steps">
            <div class="step"><div class="num">1</div><div><h3>Open Terminal</h3><p>Open Terminal from Spotlight.</p></div></div>
            <div class="step"><div class="num">2</div><div><h3>Edit hosts</h3><div class="code">sudo nano /etc/hosts</div></div></div>
            <div class="step"><div class="num">3</div><div><h3>Add the current VOID entries</h3><p>Paste the entries supplied by VOID staff and save.</p></div></div>
        </div>
    </div>
</div>
</div>

<audio id="audio" loop preload="auto">
    <source src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=cyberpunk-2099-10701.mp3" type="audio/mpeg">
</audio>

<script>
let audioOn = false;
function toggleAudio(){
    const a=document.getElementById('audio'), b=document.getElementById('musicBtn');
    if(audioOn){a.pause();audioOn=false;b.textContent='🔇 MUSIC OFF';}
    else{a.play().then(()=>{audioOn=true;b.textContent='🔊 MUSIC ON';}).catch(()=>{});}
}
function openTutorial(){document.getElementById('tutorial').classList.add('show')}
function closeTutorial(){document.getElementById('tutorial').classList.remove('show')}
function showGuide(id,btn){
    document.querySelectorAll('.guide').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.getElementById(id).classList.add('active');btn.classList.add('active');
}
function toggleLang(){
    const t=document.getElementById('heroText');
    if(t.dataset.lang==='id'){
        t.textContent='A Growtopia-inspired private server experience built around custom worlds, trading, events, bosses and a fast GTPS Cloud connection.';
        t.dataset.lang='en';
    }else{
        t.textContent='Pengalaman private server bergaya Growtopia dengan world custom, trading, event, boss dan koneksi GTPS Cloud yang cepat.';
        t.dataset.lang='id';
    }
}
async function fetchStatus(){
    try{
        const r=await fetch('/api/status'); const d=await r.json();
        const online=d.status==='ONLINE';
        document.getElementById('statusText').innerHTML='<span class="dot" style="'+(online?'':'background:var(--red);box-shadow:0 0 13px var(--red)')+'"></span>'+(online?'ONLINE':'OFFLINE');
        document.getElementById('statusText').className='card-value '+(online?'online':'');
        document.getElementById('playerCount').textContent=d.playerCount||0;
        document.getElementById('portValue').textContent=d.port||'25741';
        document.getElementById('infoPort').textContent=d.port||'25741';
    }catch(e){
        document.getElementById('statusText').innerHTML='<span class="dot" style="background:var(--red);box-shadow:0 0 13px var(--red)"></span>OFFLINE';
        document.getElementById('statusText').className='card-value';
    }
}
setInterval(fetchStatus,2500); fetchStatus();

const c=document.getElementById('fx'),x=c.getContext('2d'); let bolts=[],sparks=[];
function resize(){c.width=innerWidth;c.height=innerHeight}
addEventListener('resize',resize);resize();
function bolt(){
    const sx=Math.random()*c.width, sy=Math.random()*c.height*.55, pts=[{x:sx,y:sy}];
    let y=sy;
    while(y<c.height*.82){y+=15+Math.random()*28;pts.push({x:pts[pts.length-1].x+(Math.random()-.5)*70,y});}
    bolts.push({pts,life:1});
}
function tick(){
    x.clearRect(0,0,c.width,c.height);
    if(Math.random()<.012) bolt();
    if(Math.random()<.35) sparks.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*2+1,v:.15+Math.random()*.5});
    sparks.forEach(s=>{s.y-=s.v;s.r*=.999;x.fillStyle='rgba(255,35,85,.65)';x.beginPath();x.arc(s.x,s.y,s.r,0,Math.PI*2);x.fill()});
    sparks=sparks.filter(s=>s.y>0);
    bolts.forEach(b=>{
        x.save();x.globalAlpha=b.life;x.shadowBlur=18;x.shadowColor='#ff174f';
        x.strokeStyle='#ffdce4';x.lineWidth=2;x.beginPath();x.moveTo(b.pts[0].x,b.pts[0].y);
        b.pts.slice(1).forEach(p=>x.lineTo(p.x,p.y));x.stroke();x.restore();b.life-=.08;
    });
    bolts=bolts.filter(b=>b.life>0);requestAnimationFrame(tick);
}
tick();
document.getElementById('tutorial').addEventListener('click',e=>{if(e.target.id==='tutorial')closeTutorial()});
</script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(DASHBOARD_HTML);
});

app.listen(PORT, () => {
    console.log(`VOID Private Server portal running on port ${PORT}`);
});
