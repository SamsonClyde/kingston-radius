// netlify/functions/save-events.js
//
// Receives the full events array from the admin panel,
// serializes it to events.js format, and commits it to GitHub.
//
// Required environment variables (set in Netlify dashboard → Site settings → Environment variables):
//   GITHUB_TOKEN   — personal access token with repo scope
//   GITHUB_OWNER   — your GitHub username  (e.g. SamsonClyde)
//   GITHUB_REPO    — repo name             (e.g. kingston-radius)
//   ADMIN_SECRET   — a secret string the client must send to authenticate
//                    (set this to anything strong, e.g. a random UUID)
//                    Also set ADMIN_SECRET in the browser: store it as a constant
//                    in index.html or prompt for it — see note below.

const GITHUB_API = 'https://api.github.com';
const FILE_PATH  = 'events.js';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Auth check — client must send X-Admin-Secret header matching env var
  const secret = process.env.ADMIN_SECRET;
  if (secret && event.headers['x-admin-secret'] !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let events;
  try {
    ({ events } = JSON.parse(event.body));
    if (!Array.isArray(events)) throw new Error('events must be an array');
  } catch (e) {
    return { statusCode: 400, body: `Bad request: ${e.message}` };
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return { statusCode: 500, body: 'Missing GitHub env vars' };
  }

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'KingstonRadius-AdminPanel/1.0',
    'Content-Type': 'application/json',
  };

  // GET current file SHA
  const getUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${FILE_PATH}`;
  const getResp = await fetch(getUrl, { headers });
  if (!getResp.ok) {
    const txt = await getResp.text();
    return { statusCode: 500, body: `GitHub GET failed: ${getResp.status} ${txt}` };
  }
  const { sha } = await getResp.json();

  // Sort and reassign IDs
  const dated   = events.filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date));
  const undated = events.filter(e => !e.date);
  const sorted  = [...dated, ...undated].map((e, i) => ({ ...e, id: i + 1 }));

  // Serialize to events.js
  const lines = sorted.map(e => {
    // Use JSON.stringify for safe string escaping of each field
    const s = (v) => JSON.stringify(String(v || ''));
    return `  {\n    id: ${e.id},\n    date: ${s(e.date)},\n    title: ${s(e.title)},\n    venue: ${s(e.venue)},\n    venueUrl: ${s(e.venueUrl)},\n    location: ${s(e.location)},\n    mapsUrl: ${s(e.mapsUrl)},\n    time: ${s(e.time)},\n    price: ${s(e.price)},\n    free: ${e.free ? 'true' : 'false'}\n  }`;
  });
  const content = `const EVENTS = [\n${lines.join(',\n')}\n];\n`;

  // Base64 encode
  const encoded = Buffer.from(content, 'utf8').toString('base64');

  // PUT to GitHub — retry once on SHA conflict (409)
  const putBody = JSON.stringify({
    message: `[admin] Manual update via admin panel`,
    content: encoded,
    sha,
  });

  let putResp = await fetch(getUrl, { method: 'PUT', headers, body: putBody });

  if (putResp.status === 409) {
    // SHA conflict — re-fetch and retry once
    const retryGet  = await fetch(getUrl, { headers });
    const { sha: newSha } = await retryGet.json();
    const retryBody = JSON.stringify({ message: `[admin] Manual update via admin panel`, content: encoded, sha: newSha });
    putResp = await fetch(getUrl, { method: 'PUT', headers, body: retryBody });
  }

  if (putResp.ok) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, events: sorted.length }) };
  } else {
    const txt = await putResp.text();
    return { statusCode: 500, body: `GitHub PUT failed: ${putResp.status} ${txt}` };
  }
};
