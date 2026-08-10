// netlify/functions/events-load.js
exports.handler = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  console.log('owner:', owner, 'repo:', repo, 'token:', token ? token.slice(0,8)+'...' : 'MISSING');

  if (!owner || !repo || !token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing env vars', owner: !!owner, repo: !!repo, token: !!token, manualEvents: [], scrapedEvents: [], emailEvents: [], reviewStatus: {} }),
    };
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3.raw',
    'User-Agent': 'KingstonRadius/1.0',
    'Cache-Control': 'no-cache',
  };

  async function fetchJson(path) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=data`;
    console.log('Fetching:', apiUrl);
    try {
      const resp = await fetch(apiUrl, { headers });
      console.log(`${path}: HTTP ${resp.status}`);
      if (resp.status === 404) return null;
      if (!resp.ok) {
        const txt = await resp.text();
        console.log(`${path} error body:`, txt.slice(0, 200));
        return null;
      }
      const data = await resp.json();
      console.log(`${path}: content length ${data.content?.length}, sha ${data.sha?.slice(0,8)}`);
      const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      console.log(`${path}: parsed ${Array.isArray(parsed) ? parsed.length + ' items' : typeof parsed}`);
      return parsed;
    } catch (e) {
      console.log(`${path} exception:`, e.message);
      return null;
    }
  }

  const [manualRaw, scrapedRaw, emailRaw, statusRaw] = await Promise.all([
    fetchJson('manual-events.json'),
    fetchJson('scraped-events.json'),
    fetchJson('email-events.json'),
    fetchJson('review-status.json'),
  ]);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    body: JSON.stringify({
      manualEvents:  Array.isArray(manualRaw)  ? manualRaw  : [],
      scrapedEvents: Array.isArray(scrapedRaw) ? scrapedRaw : [],
      emailEvents:   Array.isArray(emailRaw)   ? emailRaw   : [],
      reviewStatus:  (statusRaw && typeof statusRaw === 'object') ? statusRaw : {},
    }),
  };
};
