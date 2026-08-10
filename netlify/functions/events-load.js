// netlify/functions/events-load.js
// Loads manual-events.json, scraped-events.json, email-events.json, review-status.json
// from the `data` branch. Uses GitHub API to bypass CDN caching.
exports.handler = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  if (!owner || !repo) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualEvents: [], scrapedEvents: [], emailEvents: [], reviewStatus: {} }),
    };
  }

  const token = process.env.GITHUB_TOKEN;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3.raw',
    'User-Agent': 'KingstonRadius/1.0',
    'Cache-Control': 'no-cache',
  };

  async function fetchJson(path, branch = 'data') {
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      const resp = await fetch(apiUrl, { headers });
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
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
      manualEvents:  Array.isArray(manualRaw)   ? manualRaw   : [],
      scrapedEvents: Array.isArray(scrapedRaw)  ? scrapedRaw  : [],
      emailEvents:   Array.isArray(emailRaw)    ? emailRaw    : [],
      reviewStatus:  (statusRaw && typeof statusRaw === 'object') ? statusRaw : {},
    }),
  };
};
