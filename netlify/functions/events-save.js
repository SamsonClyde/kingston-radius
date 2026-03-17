// netlify/functions/events-save.js
// Saves manual events to a separate manual-events.json file in GitHub repo.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret || event.headers['x-admin-secret'] !== secret) {
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
    return { statusCode: 500, body: 'Missing GITHUB_TOKEN, GITHUB_OWNER or GITHUB_REPO env vars' };
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/manual-events.json`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'KingstonRadius/1.0',
    'Content-Type': 'application/json',
  };

  // Get current SHA (needed for update)
  let sha = null;
  const getResp = await fetch(apiUrl, { headers });
  if (getResp.ok) {
    const data = await getResp.json();
    sha = data.sha;
  }

  // Write the file
  const content = Buffer.from(JSON.stringify(events, null, 2)).toString('base64');
  const body = { message: '[admin] Update manual events', content };
  if (sha) body.sha = sha;

  let putResp = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });

  // Retry once on SHA conflict
  if (putResp.status === 409) {
    const retry = await fetch(apiUrl, { headers });
    const retryData = await retry.json();
    body.sha = retryData.sha;
    putResp = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
  }

  if (putResp.ok) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, count: events.length }) };
  } else {
    const txt = await putResp.text();
    return { statusCode: 500, body: `GitHub write failed: ${putResp.status} ${txt}` };
  }
};
