// netlify/functions/events-save.js
// Writes manual-events.json and/or review-status.json to the `data` branch.
// Using a separate branch means admin saves never trigger a Netlify deploy.
// Accepts: { events: [...] } and/or { reviewStatus: {...} }
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
    return { statusCode: 500, body: 'Missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO' };
  }
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'KingstonRadius/1.0',
    'Content-Type': 'application/json',
  };

  // Write to the `data` branch so Netlify (watching `main`) never redeploys
  const DATA_BRANCH = 'data';

  async function writeFile(path, data) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${DATA_BRANCH}`;
    // Get current SHA if file exists on data branch
    let sha = null;
    try {
      const getResp = await fetch(apiUrl, { headers });
      if (getResp.ok) {
        const existing = await getResp.json();
        sha = existing.sha;
      }
    } catch {}
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const putBody = JSON.stringify({
      message: `[admin] Update ${path}`,
      content,
      branch: DATA_BRANCH,
      ...(sha ? { sha } : {}),
    });
    const putApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    let putResp = await fetch(putApiUrl, { method: 'PUT', headers, body: putBody });
    // Retry once on SHA conflict
    if (putResp.status === 409) {
      const retryGet = await fetch(apiUrl, { headers });
      const retryData = await retryGet.json();
      const retryBody = JSON.stringify({
        message: `[admin] Update ${path}`,
        content,
        branch: DATA_BRANCH,
        sha: retryData.sha,
      });
      putResp = await fetch(putApiUrl, { method: 'PUT', headers, body: retryBody });
    }
    if (!putResp.ok) {
      const txt = await putResp.text();
      throw new Error(`GitHub write failed for ${path}: ${putResp.status} ${txt}`);
    }
  }

  try {
    const writes = [];
    if (Array.isArray(body.events)) {
      writes.push(writeFile('manual-events.json', body.events));
    }
    if (body.reviewStatus && typeof body.reviewStatus === 'object') {
      writes.push(writeFile('review-status.json', body.reviewStatus));
    }
    if (writes.length === 0) {
      return { statusCode: 400, body: 'No data to save' };
    }
    await Promise.all(writes);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
