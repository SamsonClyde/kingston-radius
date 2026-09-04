// netlify/functions/events-load.js
// Uses Git Blobs API for large files (>1MB) and Contents API for small ones.
exports.handler = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualEvents: [], scrapedEvents: [], emailEvents: [], reviewStatus: {}, customVenues: {} }),
    };
  }

  const apiHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'KingstonRadius/1.0',
    'Cache-Control': 'no-cache',
  };

  // Get the SHA of the data branch tree
  async function getBranchTree() {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/data?recursive=0`;
    const resp = await fetch(url, { headers: apiHeaders });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.tree || [];
  }

  // Fetch a file by its blob SHA (handles files of any size)
  async function fetchBlob(sha) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
    const resp = await fetch(url, { headers: apiHeaders });
    if (!resp.ok) return null;
    const data = await resp.json();
    // content is base64 encoded
    const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  try {
    const tree = await getBranchTree();
    if (!tree) throw new Error('Could not get branch tree');

    // Build a map of filename -> sha
    const fileMap = {};
    for (const item of tree) {
      fileMap[item.path] = item.sha;
    }

    const files = ['manual-events.json', 'scraped-events.json', 'email-events.json', 'review-status.json', 'custom-venues.json'];
    const results = await Promise.all(
      files.map(f => fileMap[f] ? fetchBlob(fileMap[f]) : Promise.resolve(null))
    );

    const [manualRaw, scrapedRaw, emailRaw, statusRaw, customVenuesRaw] = results;

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
        customVenues:  (customVenuesRaw && typeof customVenuesRaw === 'object') ? customVenuesRaw : {},
      }),
    };
  } catch (e) {
    console.log('events-load error:', e.message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualEvents: [], scrapedEvents: [], emailEvents: [], reviewStatus: {}, customVenues: {} }),
    };
  }
};
