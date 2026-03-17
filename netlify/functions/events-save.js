// netlify/functions/events-save.js
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

  try {
    const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

    if (!siteId || !token) {
      return { statusCode: 500, body: 'Missing Netlify env vars (NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN)' };
    }

    const resp = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/blobs/kr-manual-events?context=production`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      }
    );

    if (!resp.ok) {
      const txt = await resp.text();
      return { statusCode: 500, body: `Blob PUT failed: ${resp.status} ${txt}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, count: events.length }) };
  } catch (e) {
    return { statusCode: 500, body: `Error: ${e.message}` };
  }
};
