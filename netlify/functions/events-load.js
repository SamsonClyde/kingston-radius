// netlify/functions/events-load.js
exports.handler = async () => {
  try {
    const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

    if (!siteId || !token) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
    }

    // Get the pre-signed URL
    const metaResp = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/kr-manual-events?context=production`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (metaResp.status === 404) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
    }

    const meta = await metaResp.json();

    // If we got a pre-signed URL, follow it to get the actual data
    if (meta.url) {
      const dataResp = await fetch(meta.url);
      const text = await dataResp.text();
      // Validate it's actually JSON array
      try {
        const parsed = JSON.parse(text);
        const events = Array.isArray(parsed) ? parsed : [];
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify(events),
        };
      } catch {
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
      }
    }

    // Direct response (no pre-signed URL)
    const text = await metaResp.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: text,
    };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  }
};
