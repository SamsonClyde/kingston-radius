// netlify/functions/events-load.js
// Reads manual-events.json directly from the GitHub repo (raw content).

exports.handler = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  }

  try {
    // Use raw.githubusercontent.com — no auth needed for public repos
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/manual-events.json`;
    const resp = await fetch(url);

    if (resp.status === 404) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
    }

    const text = await resp.text();
    // Validate JSON
    const parsed = JSON.parse(text);
    const events = Array.isArray(parsed) ? parsed : [];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(events),
    };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  }
};
