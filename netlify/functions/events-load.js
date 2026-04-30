// netlify/functions/events-load.js
// Reads manual-events.json and review-status.json from the `data` branch.
// Using raw.githubusercontent.com with the data branch ref.
exports.handler = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  if (!owner || !repo) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [], reviewStatus: {} }),
    };
  }
  // Read from `data` branch — never triggers a Netlify deploy
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/data`;
  async function fetchJson(path) {
    try {
      const resp = await fetch(`${base}/${path}`);
      if (resp.status === 404) return null;
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch {
      return null;
    }
  }
  const [eventsRaw, statusRaw] = await Promise.all([
    fetchJson('manual-events.json'),
    fetchJson('review-status.json'),
  ]);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({
      events:       Array.isArray(eventsRaw) ? eventsRaw : [],
      reviewStatus: (statusRaw && typeof statusRaw === 'object') ? statusRaw : {},
    }),
  };
};
