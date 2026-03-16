// netlify/functions/events-load.js
// Returns all manually added events from Netlify Blobs.
// Called on page load — no auth required (data is public).

const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const store  = getStore('kr-manual-events');
    const result = await store.get('events', { type: 'json' });
    const events = Array.isArray(result) ? result : [];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify(events),
    };
  } catch (e) {
    // If store is empty or doesn't exist yet, return empty array
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
    };
  }
};
