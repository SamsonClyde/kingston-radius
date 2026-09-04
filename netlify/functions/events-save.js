            // netlify/functions/events-save.js
// Writes to the `data` branch — never touches `main`, never triggers a deploy.
// Accepts any combination of: manualEvents, scrapedEvents, emailEvents, reviewStatus, customVenues
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

  try {
    const writes = [];
    if (Array.isArray(body.manualEvents))  writes.push(writeFile('manual-events.json',  body.manualEvents));
    if (Array.isArray(body.scrapedEvents)) writes.push(writeFile('scraped-events.json', body.scrapedEvents));
    if (Array.isArray(body.emailEvents))   writes.push(writeFile('email-events.json',   body.emailEvents));
    if (body.reviewStatus && typeof body.reviewStatus === 'object')
      writes.push(writeFile('review-status.json', body.reviewStatus));
    if (body.customVenues && typeof body.customVenues === 'object')
      writes.push(writeFile('custom-venues.json', body.customVenues));
    if (writes.length === 0) return { statusCode: 400, body: 'No data to save' };
    await Promise.all(writes);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
