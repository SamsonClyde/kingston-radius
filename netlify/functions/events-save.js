// netlify/functions/events-save.js
// Saves manual events and/or review status to JSONBin.
// Accepts: { events: [...] } or { reviewStatus: {...} } or both.

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

  const binId  = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) {
    return { statusCode: 500, body: 'Missing JSONBIN_BIN_ID or JSONBIN_API_KEY' };
  }

  try {
    // First read current data so we can merge
    const getResp = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey },
    });

    let current = { events: [], reviewStatus: {} };
    if (getResp.ok) {
      const data = await getResp.json();
      current = data.record || current;
    }

    // Merge incoming fields over current data
    const merged = {
      events:       Array.isArray(body.events) ? body.events : (current.events || []),
      reviewStatus: (body.reviewStatus && typeof body.reviewStatus === 'object')
                    ? body.reviewStatus
                    : (current.reviewStatus || {}),
    };

    const putResp = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
        'X-Bin-Versioning': 'false',
      },
      body: JSON.stringify(merged),
    });

    if (!putResp.ok) {
      const txt = await putResp.text();
      return { statusCode: 500, body: `JSONBin error: ${putResp.status} ${txt}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: `Error: ${e.message}` };
  }
};
