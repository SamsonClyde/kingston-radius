// netlify/functions/events-load.js
exports.handler = async () => {
  try {
    const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

    if (!siteId || !token) {
      // No Blobs config — return empty array gracefully
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
    }

    const resp = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/kr-manual-events?context=production`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (resp.status === 404) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
    }

    const text = await resp.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: text,
    };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  }
};
