// netlify/functions/leaderboard.js
// The /fun page's Radius Points leaderboard. Same setup as events-load / events-save: it keeps one small
// file (leaderboard.json) on the `data` branch through the GitHub API, so it needs no new env vars and
// never triggers a deploy.
//   GET  /.netlify/functions/leaderboard?id=<clientId>   -> { board: [{ name, score, t, me }] }   (top 25)
//   POST /.netlify/functions/leaderboard  { id, name, score } -> { ok, rank, board }
// It is an honor system (scores come from the visitor's browser), so it only does sanity checks.
const crypto = require('crypto');

const FILE = 'leaderboard.json', BRANCH = 'data', SHOW = 25, KEEP = 50, MIN = 1000, MAXSCORE = 5000000;
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

  async function read() {
    const r = await fetch(`${api}?ref=${BRANCH}`, { headers });
    if (r.status === 404) return { rows: [], sha: null };
    if (!r.ok) throw new Error('read ' + r.status);
    const j = await r.json();
    let rows = []; try { rows = JSON.parse(Buffer.from(String(j.content || '').replace(/\n/g, ''), 'base64').toString('utf-8')); } catch (e) {}
    return { rows: Array.isArray(rows) ? rows : [], sha: j.sha };
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

    const name = cleanName(b.name), score = Math.floor(Number(b.score)), id = String(b.id || '');
    if (id.length < 8 || id.length > 80) return json(400, { error: 'Missing player id' });
    if (!name) return json(400, { error: 'Write a name first (letters, numbers and spaces).' });
    if (rude(name)) return json(400, { error: 'Pick a different name.' });
    if (!Number.isFinite(score) || score < MIN) return json(400, { error: 'You need ' + MIN + ' points to sign the board.' });
    if (score > MAXSCORE) return json(400, { error: 'That score looks off.' });
    const me = hash(id);

    for (let attempt = 1; attempt <= 5; attempt++) {
      const { rows, sha } = await read();
      if (rows.some(r => r.id !== me && String(r.name).toLowerCase() === name.toLowerCase())) return json(409, { error: 'Somebody already signed as that. Pick another name.' });
      const mine = rows.find(r => r.id === me);
      if (mine) { mine.name = name; mine.score = Math.max(mine.score, score); mine.t = now; }
      else rows.push({ id: me, name, score, t: now });
      rows.sort((a, c) => c.score - a.score || a.t - c.t);
      const kept = rows.slice(0, KEEP);
      const put = await fetch(api, { method: 'PUT', headers, body: JSON.stringify({ message: '[fun] leaderboard', content: Buffer.from(JSON.stringify(kept)).toString('base64'), branch: BRANCH, ...(sha ? { sha } : {}) }) });
      if (put.ok) {
        const rank = kept.findIndex(r => r.id === me) + 1;
        return json(200, { ok: true, rank: rank || null, board: view(kept, me) });
      }
      if ((put.status === 409 || put.status === 422) && attempt < 5) { await new Promise(r => setTimeout(r, 150 * attempt)); continue; }
      throw new Error('write ' + put.status);
    }
    return json(503, { error: 'Busy. Try again.' });
  } catch (e) {
    return json(500, { error: 'The board is asleep. Try again later.' });
  }
};
