// netlify/functions/events-save.js
// Saves the full manual events array to Netlify Blobs.
// Requires X-Admin-Secret header matching ADMIN_SECRET env var.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Auth check
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
    const store = getStore('kr-manual-events');
    await store.set('events', events);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, count: events.length }),
    };
  } catch (e) {
    return { statusCode: 500, body: `Storage error: ${e.message}` };
  }
};
