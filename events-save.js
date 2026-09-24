// netlify/functions/events-save.js
// Writes to the `data` branch — never touches `main`, never triggers a deploy.
// Accepts any combination of: manualEvents, scrapedEvents, emailEvents, reviewStatus,
// reviewStatusPatch, customVenues, hiddenTitles, posterImage ({filename, contentBase64})
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const secret = process.env.ADMIN_SECRET;
  if (!secret || event.headers['x-admin-secret'] !== secret) {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: `Bad request: ${e.message}` };
  }
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) {
    return { statusCode: 500, body: 'Missing env vars' };
  }

  const DATA_BRANCH = 'data';
  const apiHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'KingstonRadius/1.0',
    'Content-Type': 'application/json',
  };

  async function writeFile(path, data) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${DATA_BRANCH}`;
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const MAX_ATTEMPTS = 5;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let sha = null;
      try {
        const getResp = await fetch(apiUrl, { headers: apiHeaders });
        if (getResp.ok) sha = (await getResp.json()).sha;
      } catch {}

      const putBody = JSON.stringify({
        message: `[admin] Update ${path}`,
        content,
        branch: DATA_BRANCH,
        ...(sha ? { sha } : {}),
      });
      const putResp = await fetch(putUrl, { method: 'PUT', headers: apiHeaders, body: putBody });

      if (putResp.ok) return; // success

      // 409 = someone else wrote to this file between our GET and PUT — retry with a fresh SHA
      if (putResp.status === 409 && attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 150 * attempt)); // small increasing backoff
        continue;
      }

      const txt = await putResp.text();
      throw new Error(`GitHub write failed for ${path} after ${attempt} attempt(s): ${putResp.status} ${txt}`);
    }
  }

  // Merges a small set of key changes into whatever the file *currently* contains on
  // GitHub, rather than blindly overwriting it with a client's full local snapshot.
  // This is what actually prevents one browser tab/device from silently erasing
  // another's changes — each save only ever touches the specific keys it changed,
  // re-reading the freshest content on every retry attempt.
  // A patch value of `null` deletes that key.
  async function writeFileMerged(path, patch) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${DATA_BRANCH}`;
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const MAX_ATTEMPTS = 5;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let sha = null;
      let current = {};
      try {
        const getResp = await fetch(apiUrl, { headers: apiHeaders });
        if (getResp.ok) {
          const json = await getResp.json();
          sha = json.sha;
          try { current = JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8')); }
          catch { current = {}; }
        }
      } catch {}

      const merged = { ...current };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete merged[key];
        else merged[key] = value;
      }

      const content = Buffer.from(JSON.stringify(merged, null, 2)).toString('base64');
      const putBody = JSON.stringify({
        message: `[admin] Merge update to ${path}`,
        content,
        branch: DATA_BRANCH,
        ...(sha ? { sha } : {}),
      });
      const putResp = await fetch(putUrl, { method: 'PUT', headers: apiHeaders, body: putBody });

      if (putResp.ok) return;

      if (putResp.status === 409 && attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 150 * attempt));
        continue; // next loop iteration re-fetches fresh content + sha before retrying
      }

      const txt = await putResp.text();
      throw new Error(`GitHub merged write failed for ${path} after ${attempt} attempt(s): ${putResp.status} ${txt}`);
    }
  }

  // Uploads a binary file (already base64-encoded by the client) to the data
  // branch and returns its permanent raw-content URL. Used for poster images —
  // same GitHub Contents API mechanism as writeFile, just skipping the JSON
  // stringify step since the client sends already-encoded binary content.
  async function uploadBinaryFile(path, base64Content) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${DATA_BRANCH}`;
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const MAX_ATTEMPTS = 5;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let sha = null;
      try {
        const getResp = await fetch(apiUrl, { headers: apiHeaders });
        if (getResp.ok) sha = (await getResp.json()).sha;
      } catch {}

      const putBody = JSON.stringify({
        message: `[admin] Upload ${path}`,
        content: base64Content,
        branch: DATA_BRANCH,
        ...(sha ? { sha } : {}),
      });
      const putResp = await fetch(putUrl, { method: 'PUT', headers: apiHeaders, body: putBody });

      if (putResp.ok) {
        return `https://raw.githubusercontent.com/${owner}/${repo}/${DATA_BRANCH}/${path}`;
      }
      if (putResp.status === 409 && attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 150 * attempt));
        continue;
      }
      const txt = await putResp.text();
      throw new Error(`GitHub upload failed for ${path} after ${attempt} attempt(s): ${putResp.status} ${txt}`);
    }
  }

  function sanitizeFilename(name) {
    const dot = name.lastIndexOf('.');
    const base = (dot > 0 ? name.slice(0, dot) : name)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    const ext = (dot > 0 ? name.slice(dot + 1) : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
    return `${Date.now()}-${base || 'poster'}.${ext}`;
  }

  try {
    let posterUrl = null;
    if (body.posterImage && body.posterImage.contentBase64) {
      const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
      const approxBytes = Math.ceil(body.posterImage.contentBase64.length * 3 / 4);
      if (approxBytes > MAX_BYTES) {
        return { statusCode: 400, body: 'Image too large (8 MB max)' };
      }
      const filename = sanitizeFilename(body.posterImage.filename || 'poster.jpg');
      posterUrl = await uploadBinaryFile(`posters/${filename}`, body.posterImage.contentBase64);
    }

    const writes = [];
    if (Array.isArray(body.manualEvents))  writes.push(writeFile('manual-events.json',  body.manualEvents));
    if (Array.isArray(body.scrapedEvents)) writes.push(writeFile('scraped-events.json', body.scrapedEvents));
    if (Array.isArray(body.emailEvents))   writes.push(writeFile('email-events.json',   body.emailEvents));
    if (body.reviewStatus && typeof body.reviewStatus === 'object')
      writes.push(writeFile('review-status.json', body.reviewStatus));
    if (body.reviewStatusPatch && typeof body.reviewStatusPatch === 'object')
      writes.push(writeFileMerged('review-status.json', body.reviewStatusPatch));
    if (body.customVenues && typeof body.customVenues === 'object')
      writes.push(writeFile('custom-venues.json', body.customVenues));
    if (Array.isArray(body.hiddenTitles))
      writes.push(writeFile('hidden-titles.json', body.hiddenTitles));
    if (writes.length === 0 && !posterUrl) return { statusCode: 400, body: 'No data to save' };
    if (writes.length > 0) await Promise.all(writes);
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...(posterUrl ? { posterUrl } : {}) }) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
