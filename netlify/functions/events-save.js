// netlify/functions/events-save.js
// Saves manual events to JSONBin.io — simple key/value JSON storage.
// Required env vars: JSONBIN_BIN_ID, JSONBIN_API_KEY, ADMIN_SECRET

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

  const binId  = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) {
    return { statusCode: 500, body: 'Missing JSONBIN_BIN_ID or JSONBIN_API_KEY env vars' };
  }

  try {
    const resp = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
        'X-Bin-Versioning': 'false',
      },
      body: JSON.stringify({ events }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return { statusCode: 500, body: `JSONBin error: ${resp.status} ${txt}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, count: events.length }) };
  } catch (e) {
    return { statusCode: 500, body: `Error: ${e.message}` };
  }
};
