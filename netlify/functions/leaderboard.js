// netlify/functions/leaderboard.js
// The /fun page's Radius Points leaderboard. Same setup as events-load / events-save: it keeps one small
// file (leaderboard.json) on the `data` branch through the GitHub API, so it needs no new env vars and
// never triggers a deploy.
//   GET  /.netlify/functions/leaderboard?id=<clientId>   -> { board: [{ name, score, t, me }] }   (top 25)
//   POST /.netlify/functions/leaderboard  { id, hello: true }        -> { ok }   (the page says hello at 300 points: it starts that player's clock)
//   POST /.netlify/functions/leaderboard  { id, name, score [, rename: true] } -> { ok, rank, name, board }
//     A name is written once and never changes, unless the request says rename:true (only the /fun page sends that; /all never does).
// Scores are earned in the visitor's browser, so they cannot be trusted outright. What the server can do is keep the clock: it remembers when
// each player id first said hello, and a claimed score has to fit what could really be earned since then (RATE_H points an hour, the
// fastest Memory Match grinding there is, plus a small head start). Typing a huge number into the browser's storage or the console therefore
// gets you nothing: you can only sign what the time you have actually spent could pay.
const crypto = require('crypto');

const FILE = 'leaderboard.json', SEEN = 'leaderboard-seen.json', BRANCH = 'data', SHOW = 25, KEEP = 50, MIN = 1000, MAXSCORE = 2000000000;
// Every game except Memory Match has a daily cap, and repeat Memory boards pay less and less, so the real ceiling is Memory pairs: about 8,000 an
// hour for a very fast human. RATE_H leaves plenty of room above that. BASE covers the first stretch before the hello and a lucky streak.
const RATE_H = 20000, BASE = 10000, HOUR = 3600000, SEEN_KEEP = 5000, SEEN_TTL = 120 * 86400000;
const BAD = ['fuck', 'shit', 'cunt', 'nigg', 'fagg', 'rape', 'nazi', 'bitch', 'whore', 'slut', 'dick', 'cock', 'penis', 'vagina', 'hitler', 'kkk'];
const lastHit = new Map();   // best-effort per-IP throttle (resets when the function instance recycles)

const hash = id => crypto.createHash('sha256').update('kr-fun|' + String(id)).digest('hex').slice(0, 16);
function cleanName(raw) {
  let n = String(raw == null ? '' : raw).normalize('NFKC').replace(/[^A-Za-z0-9 _.!'&-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14).trim();
  return n;
}
const flat = s => s.toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
const rude = n => { const f = flat(n); return BAD.some(b => f.includes(b.replace(/(.)\1+/g, '$1'))); };
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
const view = (rows, me) => rows.slice().sort((a, b) => b.score - a.score || a.t - b.t).slice(0, SHOW).map(r => ({ name: r.name, score: r.score, t: r.t, me: !!me && r.id === me }));

exports.handler = async (event) => {
  const owner = process.env.GITHUB_OWNER, repo = process.env.GITHUB_REPO, token = process.env.GITHUB_TOKEN;
  if (!owner || !repo || !token) return json(200, { board: [], offline: true });   // not configured: the page falls back to its own local board
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'KingstonRadius/1.0', 'Content-Type': 'application/json' };
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${FILE}`;
  const apiSeen = `https://api.github.com/repos/${owner}/${repo}/contents/${SEEN}`;

  async function read() {
    const r = await fetch(`${api}?ref=${BRANCH}`, { headers });
    if (r.status === 404) return { rows: [], sha: null };
    if (!r.ok) throw new Error('read ' + r.status);
    const j = await r.json();
    let rows = []; try { rows = JSON.parse(Buffer.from(String(j.content || '').replace(/\n/g, ''), 'base64').toString('utf-8')); } catch (e) {}
    return { rows: Array.isArray(rows) ? rows : [], sha: j.sha };
  }
  async function readSeen() {                                    // { hash: first-hello time in ms }
    const r = await fetch(`${apiSeen}?ref=${BRANCH}`, { headers });
    if (r.status === 404) return { seen: {}, sha: null };
    if (!r.ok) throw new Error('read seen ' + r.status);
    const j = await r.json();
    let seen = {}; try { seen = JSON.parse(Buffer.from(String(j.content || '').replace(/\n/g, ''), 'base64').toString('utf-8')); } catch (e) {}
    return { seen: seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {}, sha: j.sha };
  }
  // the first time we hear from a player id, write down when. Returns the time it was first seen (an existing one is never changed).
  async function firstSeen(me, now) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const { seen, sha } = await readSeen();
      if (seen[me]) return seen[me];
      seen[me] = now;
      const keys = Object.keys(seen).filter(k => now - seen[k] <= SEEN_TTL).sort((a, b) => seen[b] - seen[a]).slice(0, SEEN_KEEP), out = {};
      keys.forEach(k => { out[k] = seen[k]; });
      if (!out[me]) out[me] = now;
      const put = await fetch(apiSeen, { method: 'PUT', headers, body: JSON.stringify({ message: '[fun] leaderboard clock', content: Buffer.from(JSON.stringify(out)).toString('base64'), branch: BRANCH, ...(sha ? { sha } : {}) }) });
      if (put.ok) return now;
      if ((put.status === 409 || put.status === 422) && attempt < 5) { await new Promise(r => setTimeout(r, 150 * attempt)); continue; }
      throw new Error('write seen ' + put.status);
    }
    return now;
  }

  try {
    if (event.httpMethod === 'GET') {
      const id = (event.queryStringParameters || {}).id;
      const { rows } = await read();
      return json(200, { board: view(rows, id ? hash(id) : null) });
    }
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const ip = (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'])) || 'x';
    const now = Date.now();
    if (now - (lastHit.get(ip) || 0) < 15000) return json(429, { error: 'Easy there. Try again in a few seconds.' });
    lastHit.set(ip, now); if (lastHit.size > 500) lastHit.clear();

    const id = String(b.id || '');
    if (id.length < 8 || id.length > 80) return json(400, { error: 'Missing player id' });
    if (b.hello) { await firstSeen(hash(id), now); return json(200, { ok: true }); }
    const name = cleanName(b.name), score = Math.floor(Number(b.score));
    if (!name) return json(400, { error: 'Write a name first (letters, numbers and spaces).' });
    if (rude(name)) return json(400, { error: 'Pick a different name.' });
    if (!Number.isFinite(score) || score < MIN) return json(400, { error: 'You need ' + MIN + ' points to sign the board.' });
    if (score > MAXSCORE) return json(400, { error: 'That score looks off.' });
    const me = hash(id);
    const first = await firstSeen(me, now);                     // a player who never said hello starts the clock right now
    if (score > BASE + RATE_H * ((now - first) / HOUR)) return json(400, { error: 'That is more points than can be earned in the time you have been playing. Keep playing and try again later.' });

    for (let attempt = 1; attempt <= 5; attempt++) {
      const { rows, sha } = await read();
      if (!rows.some(r => r.id === me) && rows.some(r => String(r.name).toLowerCase() === name.toLowerCase())) return json(409, { error: 'Somebody already signed as that. Pick another name.' });
      const mine = rows.find(r => r.id === me);
      if (mine) {
        if (b.rename === true && name !== mine.name) {                               // only /fun asks for this; on /all a name is set once and never changes
          if (rows.some(r => r.id !== me && String(r.name).toLowerCase() === name.toLowerCase())) return json(409, { error: 'Somebody already signed as that. Pick another name.' });
          mine.name = name;
        }
        mine.score = Math.max(mine.score, score); mine.t = now;
      }
      else rows.push({ id: me, name, score, t: now });
      rows.sort((a, c) => c.score - a.score || a.t - c.t);
      const kept = rows.slice(0, KEEP);
      const put = await fetch(api, { method: 'PUT', headers, body: JSON.stringify({ message: '[fun] leaderboard', content: Buffer.from(JSON.stringify(kept)).toString('base64'), branch: BRANCH, ...(sha ? { sha } : {}) }) });
      if (put.ok) {
        const rank = kept.findIndex(r => r.id === me) + 1;
        return json(200, { ok: true, rank: rank || null, name: (kept.find(r => r.id === me) || {}).name || name, board: view(kept, me) });
      }
      if ((put.status === 409 || put.status === 422) && attempt < 5) { await new Promise(r => setTimeout(r, 150 * attempt)); continue; }
      throw new Error('write ' + put.status);
    }
    return json(503, { error: 'Busy. Try again.' });
  } catch (e) {
    return json(500, { error: 'The board is asleep. Try again later.' });
  }
};
