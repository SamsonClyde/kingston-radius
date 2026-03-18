// netlify/functions/events-load.js
// Returns both manual events and review status from JSONBin.

exports.handler = async () => {
  const binId  = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;

  if (!binId || !apiKey) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [], reviewStatus: {} }),
    };
  }

  try {
    const resp = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey },
    });

    if (!resp.ok) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [], reviewStatus: {} }),
      };
    }

    const data = await resp.json();
    const record = data.record || {};
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({
        events:       Array.isArray(record.events) ? record.events : [],
        reviewStatus: (record.reviewStatus && typeof record.reviewStatus === 'object') ? record.reviewStatus : {},
      }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [], reviewStatus: {} }),
    };
  }
};
