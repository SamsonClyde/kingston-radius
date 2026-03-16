// ============================================================
//  KINGSTON RADIUS — EMAIL NEWSLETTER EVENT EXTRACTOR
//  Google Apps Script
//
//  SETUP INSTRUCTIONS (do this once):
//
//  1. Go to https://script.google.com
//  2. Click "New project", paste this entire file
//  3. Click the gear icon (Project Settings) → check
//     "Show 'appsscript.json' in editor"
//  4. Fill in the CONFIG section below
//  5. Run setupTrigger() once manually (Run → setupTrigger)
//     — it will ask for Gmail + internet permissions, click Allow
//  6. That's it. The script runs automatically every 6 hours.
//
//  TO ADD A NEW VENUE NEWSLETTER:
//  Just add its sender address to VENUE_SENDERS below and
//  re-run setupTrigger() once to re-save the config.
// ============================================================

// ── CONFIG ───────────────────────────────────────────────────
const CONFIG = {

  // Your Anthropic API key
  // Get one at console.anthropic.com → API Keys
  ANTHROPIC_API_KEY: "YOUR_ANTHROPIC_API_KEY_HERE",

  // GitHub personal access token (repo scope)
  // github.com → Settings → Developer settings →
  // Personal access tokens → Tokens (classic) → Generate new token
  // Check the "repo" scope box
  GITHUB_TOKEN: "YOUR_GITHUB_TOKEN_HERE",

  // Your GitHub username and repo name
  GITHUB_OWNER: "SamsonClyde",
  GITHUB_REPO:  "kingston-radius",

  // Path to events.js in your repo
  EVENTS_FILE_PATH: "events.js",

  // How many days ahead to look for events in newsletters
  DAYS_AHEAD: 120,

  // Label name created in Gmail to tag processed emails
  PROCESSED_LABEL: "KR-Processed",

  // ── VENUE SENDERS ──────────────────────────────────────────
  // Add any email address or domain that sends venue newsletters.
  // These are matched against the FROM field of incoming emails.
  // You can use full addresses OR just domain names.
  //
  // To find a venue's sender: open one of their newsletters,
  // look at the From: field, copy the email address.
  //
  // Format: "display name or address to match" : "Venue Name as shown on site"
  VENUE_SENDERS: {
    // ── Kingston ──
    "tubbyskingston@gmail.com":          "Tubby's",
    "tubbyskingston.com":                "Tubby's",
    "assemblykingston.com":              "Assembly Kingston",
    "unicornkingston.com":               "Unicorn Bar",
    "lisa@keeganales.com":               "Keegan Ales",
    "keeganales.com":                    "Keegan Ales",
    "huttonbrickyards.com":              "Hutton Brickyards",
    "nightswimkingston@gmail.com":       "Night Swim",
    "nightswim":                         "Night Swim",
    "leftbankciders":                    "Left Bank Ciders",
    "utilitybicycleworks":               "Utility Bicycle Works",
    "monumenthv.net":                    "MONUMENT hv",
    "229greenkill@greenkill.org":        "Green Kill",
    "greenkill.org":                     "Green Kill",
    "rehercenter.org":                   "Reher Center for Immigrant Culture and History",
    "info@tempokingston.org":            "Tempo Arts",
    "tempokingston.org":                 "Tempo Arts",
    "wearewildarts.org":                 "WildHeart: Center for Performance and Embodiment Practice",
    "kidbusy@gmail.com":                 "Kingston Artist Collective",
    "laura@opositivefestival.org":       "O+ Exchange Clinic",
    // ── Woodstock ──
    "bearsvilletheater.com":             "Bearsville Theater",
    "levonhelm.com":                     "Levon Helm Studios",
    "booking1@colonywoodstock.com":      "The Colony",
    "colonywoodstock.com":               "The Colony",
    "woodstockplayhouse.org":            "Woodstock Playhouse",
    "booking@stationbarandcurio.com":    "Station Bar & Curio",
    "stationbarandcurio.com":            "Station Bar & Curio",
    "booking@tinkerstreettavern.com":    "Tinker Street Tavern",
    "tinkerstreettavern.com":            "Tinker Street Tavern",
    // ── Beacon ──
    "bookquinns@gmail.com":              "Quinn's",
    "quinnsinbeacon.com":                "Quinn's",
    "info@townecrier":                   "Towne Crier Café",
    "townecrier.com":                    "Towne Crier Café",
    // ── Catskill ──
    "info@theavalonlounge.com":          "Avalon Lounge",
    "theavalonlounge.com":               "Avalon Lounge",
    // ── Croton ──
    "thegrandcroton.com":                "The Grand",
    // ── Ellenville ──
    "upstatemodhouse@gmail.com":         "Love, Velma",
    // ── Highland ──
    "info@badseedhardcider.com":         "Bad Seed Hard Cider",
    "badseedhardcider.com":              "Bad Seed Hard Cider",
    // ── Hudson ──
    "info@parktheaterhudson.com":        "Park Theater Hudson",
    "parktheaterhudson.com":             "Park Theater Hudson",
    "helsinkihudson.com":                "Helsinki Hudson",
    "thespottydog.com":                  "Spotty Dog Books & Ale",
    "basilicahudson.org":                "Basilica Hudson",
    // ── Kerhonkson ──
    "kerhonkytonk@gmail.com":            "Outpost BBQ",
    // ── Marlboro ──
    "liveatthefalcon.com":               "The Falcon",
    // ── Mountain Dale ──
    "highvoltagecoffee.com":             "High Voltage Kitchen & Bar",
    // ── New Paltz ──
    "bacchus462@aol.com":                "Bacchus",
    "snugharbornewpaltz@gmail.com":      "Snugs",
    "thelemonsqueezenewpaltz.com":       "The Lemon Squeeze",
    // ── Pine Plains ──
    "info@thestissingcenter.org":        "Stissing Center",
    "stissingcenter.org":                "Stissing Center",
    // ── Poughkeepsie ──
    "booking@darksiderecords.com":       "Darkside Records",
    "darksiderecords.com":               "Darkside Records",
    // ── Rosendale ──
    "rosendalecafe.com":                 "Rosendale Café",
    // ── Hudson Valley / general ──
    "fishercenter.bard.edu":             "Bard Fisher Center",
    "outlierinn.com":                    "The Outlier Inn",
    "catskillbrewery.com":               "Catskill Brewery",
    "tompkinscorners.org":               "Tompkins Corners Cultural Center",
    "bridgestreettheatre.com":           "Bridge Street Theatre",
    "catskillmtn.org":                   "Catskill Mountain Foundation",
    "massmoca.org":                      "MASS MoCA",
    "bethelwoodscenter.org":             "Bethel Woods",
    "ashokancenter.org":                 "The Ashokan Center",
    "opus40.org":                        "Opus 40",
    "bardavon.org":                      "Bardavon",
    // ── Peekskill / Poughkeepsie / Newburgh ──
    "paramounthudsonvalley.com":         "Paramount Hudson Valley",
    "citywinery.com":                    "City Winery Hudson Valley",
    "silkfcty.com":                      "Silk Factory",
    "newburghbrewing.com":               "Newburgh Brewing Company",
    // ── Add more here ──
    // "example@venuedomain.com":        "Venue Name",
  },
};

// ── MAPS for venue → location / mapsUrl (used when writing events) ──────────
const VENUE_META = {
  // Kingston
  "Tubby's":                { location: "Kingston, NY",            maps: "https://maps.google.com/?q=586+Broadway+Kingston+NY" },
  "Assembly Kingston":      { location: "Kingston, NY",            maps: "https://maps.google.com/?q=Assembly+Kingston+NY" },
  "Unicorn Bar":            { location: "Kingston, NY",            maps: "https://maps.google.com/?q=168+Albany+Ave+Kingston+NY" },
  "Keegan Ales":            { location: "Kingston, NY",            maps: "https://maps.google.com/?q=20+St+James+St+Kingston+NY" },
  "Hutton Brickyards":      { location: "Kingston, NY",            maps: "https://maps.google.com/?q=200+North+St+Kingston+NY" },
  "Night Swim":             { location: "Kingston, NY",            maps: "https://maps.google.com/?q=Night+Swim+Kingston+NY" },
  "Left Bank Ciders":       { location: "Kingston, NY",            maps: "https://maps.google.com/?q=Left+Bank+Ciders+Kingston+NY" },
  "Utility Bicycle Works":  { location: "Kingston, NY",            maps: "https://maps.google.com/?q=Utility+Bicycle+Works+Kingston+NY" },
  "MONUMENT hv":            { location: "Kingston, NY",            maps: "https://maps.app.goo.gl/aK923p8uugECAban6" },
  "Green Kill":             { location: "Kingston, NY",            maps: "https://maps.google.com/?q=229+Green+Kill+Ave+Kingston+NY" },
  "Tempo Arts":             { location: "Kingston, NY",            maps: "https://maps.google.com/?q=Tempo+Kingston+NY" },
  "Kingston Artist Collective": { location: "Kingston, NY",        maps: "https://maps.google.com/?q=Kingston+NY" },
  "O+ Exchange Clinic":     { location: "Kingston, NY",            maps: "https://maps.google.com/?q=Kingston+NY" },
  // Woodstock
  "Bearsville Theater":     { location: "Bearsville, NY",          maps: "https://maps.google.com/?q=291+Tinker+St+Bearsville+NY" },
  "Levon Helm Studios":     { location: "Woodstock, NY",           maps: "https://maps.google.com/?q=160+Plochmann+Lane+Woodstock+NY" },
  "The Colony":             { location: "Woodstock, NY",           maps: "https://maps.google.com/?q=22+Rock+City+Rd+Woodstock+NY" },
  "Colony Woodstock":       { location: "Woodstock, NY",           maps: "https://maps.google.com/?q=22+Rock+City+Rd+Woodstock+NY" },
  "Woodstock Playhouse":    { location: "Woodstock, NY",           maps: "https://maps.app.goo.gl/C2RVThJ4DH67hQjG9" },
  "Station Bar & Curio":    { location: "Woodstock, NY",           maps: "https://maps.google.com/?q=Station+Bar+Curio+Woodstock+NY" },
  "Tinker Street Tavern":   { location: "Woodstock, NY",           maps: "https://maps.google.com/?q=Tinker+Street+Tavern+Woodstock+NY" },
  // Beacon
  "Quinn's":                { location: "Beacon, NY",              maps: "https://maps.google.com/?q=330+Main+St+Beacon+NY" },
  "Towne Crier Café":       { location: "Beacon, NY",              maps: "https://maps.google.com/?q=379+Main+St+Beacon+NY" },
  // Catskill
  "Avalon Lounge":          { location: "Catskill, NY",            maps: "https://maps.google.com/?q=29+Church+St+Catskill+NY" },
  // Croton
  "The Grand":              { location: "Croton-on-Hudson, NY",    maps: "https://maps.google.com/?q=The+Grand+Croton-on-Hudson+NY" },
  // Ellenville
  "Love, Velma":            { location: "Ellenville, NY",          maps: "https://maps.google.com/?q=Ellenville+NY" },
  // Highland
  "Bad Seed Hard Cider":    { location: "Highland, NY",            maps: "https://maps.google.com/?q=87+Burroughs+Dr+Highland+NY" },
  // Hudson
  "Park Theater Hudson":    { location: "Hudson, NY",              maps: "https://maps.google.com/?q=337+Warren+St+Hudson+NY" },
  "Helsinki Hudson":        { location: "Hudson, NY",              maps: "https://maps.google.com/?q=405+Columbia+St+Hudson+NY" },
  "Spotty Dog Books & Ale": { location: "Hudson, NY",              maps: "https://maps.google.com/?q=440+Warren+St+Hudson+NY" },
  "Basilica Hudson":        { location: "Hudson, NY",              maps: "https://maps.google.com/?q=110+S+Front+St+Hudson+NY" },
  // Kerhonkson
  "Outpost BBQ":            { location: "Kerhonkson, NY",          maps: "https://maps.google.com/?q=Outpost+BBQ+Kerhonkson+NY" },
  // Marlboro
  "The Falcon":             { location: "Marlboro, NY",            maps: "https://maps.google.com/?q=1348+Rte+9W+Marlboro+NY" },
  // Mountain Dale
  "High Voltage Kitchen & Bar": { location: "Mountain Dale, NY",   maps: "https://maps.google.com/?q=High+Voltage+Mountain+Dale+NY" },
  // New Paltz
  "Bacchus":                { location: "New Paltz, NY",           maps: "https://maps.google.com/?q=Bacchus+New+Paltz+NY" },
  "Snugs":                  { location: "New Paltz, NY",           maps: "https://maps.google.com/?q=Snugs+New+Paltz+NY" },
  "The Lemon Squeeze":      { location: "New Paltz, NY",           maps: "https://maps.app.goo.gl/gF18nSCWjJQgxY4s6" },
  // Pine Plains
  "Stissing Center":        { location: "Pine Plains, NY",         maps: "https://maps.google.com/?q=3023+Route+199+Pine+Plains+NY" },
  // Poughkeepsie
  "Darkside Records":       { location: "Poughkeepsie, NY",        maps: "https://maps.google.com/?q=Darkside+Records+Poughkeepsie+NY" },
  "Bardavon":               { location: "Poughkeepsie, NY",        maps: "https://maps.google.com/?q=35+Market+St+Poughkeepsie+NY" },
  // Rosendale
  "Rosendale Café":         { location: "Rosendale, NY",           maps: "https://maps.google.com/?q=434+Main+St+Rosendale+NY" },
  // Other Hudson Valley
  "The Ashokan Center":     { location: "Olivebridge, NY",         maps: "https://maps.app.goo.gl/dA1kEJHCycFXjV6DA" },
  "Opus 40":                { location: "Saugerties, NY",          maps: "https://maps.google.com/?q=50+Fite+Rd+Saugerties+NY" },
  "The Outlier Inn":        { location: "Woodridge, NY",           maps: "https://maps.google.com/?q=307+Mountaindale+Rd+Woodridge+NY" },
  "Catskill Brewery":       { location: "Livingston Manor, NY",    maps: "https://maps.google.com/?q=672+Old+Rte+17+Livingston+Manor+NY" },
  "Tompkins Corners Cultural Center": { location: "Putnam Valley, NY", maps: "https://maps.google.com/?q=729+Peekskill+Hollow+Rd+Putnam+Valley+NY" },
  "Bridge Street Theatre":  { location: "Catskill, NY",            maps: "https://maps.google.com/?q=44+West+Bridge+St+Catskill+NY" },
  "Catskill Mountain Foundation": { location: "Hunter, NY",        maps: "https://maps.google.com/?q=Main+St+Hunter+NY" },
  "Bard Fisher Center":     { location: "Annandale-on-Hudson, NY", maps: "https://maps.google.com/?q=60+Manor+Ave+Annandale-on-Hudson+NY" },
  "Glen Falls House":       { location: "Round Top, NY",           maps: "https://maps.google.com/?q=810+Route+296+Round+Top+NY" },
  "Bethel Woods":           { location: "Bethel, NY",              maps: "https://maps.google.com/?q=200+Hurd+Rd+Bethel+NY" },
  "MASS MoCA":              { location: "North Adams, MA",         maps: "https://maps.google.com/?q=1040+Mass+MoCA+Way+North+Adams+MA" },
  "Paramount Hudson Valley":{ location: "Peekskill, NY",           maps: "https://maps.google.com/?q=1008+Brown+St+Peekskill+NY" },
  "City Winery Hudson Valley": { location: "Newburgh, NY",         maps: "https://maps.google.com/?q=23+S+Water+St+Newburgh+NY" },
  "Silk Factory":           { location: "Newburgh, NY",            maps: "https://maps.google.com/?q=299+Washington+St+Newburgh+NY" },
};

// ─────────────────────────────────────────────────────────────
//  MAIN ENTRY POINT — called by time-based trigger
// ─────────────────────────────────────────────────────────────
function processNewsletters() {
  Logger.log("=== Kingston Radius Email Processor starting ===");

  const label     = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
  const newEvents = [];
  let   emailsProcessed = 0;

  // Search unread emails from any known sender
  const senderKeys  = Object.keys(CONFIG.VENUE_SENDERS);
  const fromQueries = senderKeys.map(k => `from:${k}`).join(" OR ");
  const query       = `(${fromQueries}) -label:${CONFIG.PROCESSED_LABEL} is:unread`;

  Logger.log(`Searching Gmail: ${query.substring(0, 120)}...`);
  const threads = GmailApp.search(query, 0, 50); // max 50 threads per run
  Logger.log(`Found ${threads.length} unread newsletter thread(s)`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const msg of messages) {
      if (msg.isUnread()) {
        const from    = msg.getFrom();
        const subject = msg.getSubject();
        const venue   = matchVenue(from);
        if (!venue) continue;

        Logger.log(`Processing: "${subject}" from ${from} → ${venue}`);
        try {
          const body   = getEmailText(msg);
          const events = extractEventsWithClaude(body, venue, subject);
          if (events.length > 0) {
            Logger.log(`  Extracted ${events.length} event(s)`);
            newEvents.push(...events);
          } else {
            Logger.log(`  No events found in this email`);
          }
          emailsProcessed++;
        } catch (err) {
          Logger.log(`  ERROR processing email: ${err}`);
        }
        msg.markRead();
      }
    }
    thread.addLabel(label);
  }

  Logger.log(`Processed ${emailsProcessed} emails, found ${newEvents.length} total events`);

  if (newEvents.length > 0) {
    mergeAndPushToGitHub(newEvents);
  } else {
    Logger.log("No new events to push.");
  }

  Logger.log("=== Done ===");
}

// ─────────────────────────────────────────────────────────────
//  MATCH email FROM address to a venue name
// ─────────────────────────────────────────────────────────────
function matchVenue(from) {
  const fromLower = from.toLowerCase();
  for (const [key, venueName] of Object.entries(CONFIG.VENUE_SENDERS)) {
    if (fromLower.includes(key.toLowerCase())) {
      return venueName;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
//  GET PLAIN TEXT from email (prefer plain, fall back to HTML→text)
// ─────────────────────────────────────────────────────────────
function getEmailText(msg) {
  let body = msg.getPlainBody();
  if (!body || body.trim().length < 50) {
    // Fall back to HTML body stripped of tags
    body = msg.getBody()
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  // Truncate to ~6000 chars to stay within API limits
  return body.substring(0, 6000);
}

// ─────────────────────────────────────────────────────────────
//  CALL CLAUDE to extract events from email text
// ─────────────────────────────────────────────────────────────
function extractEventsWithClaude(emailBody, venueName, subject) {
  const today    = new Date();
  const cutoff   = new Date();
  cutoff.setDate(today.getDate() + CONFIG.DAYS_AHEAD);
  const todayStr  = formatDateYMD(today);
  const cutoffStr = formatDateYMD(cutoff);

  const prompt = `You are extracting concert and live music event listings from a venue newsletter email.

Venue: ${venueName}
Email subject: ${subject}
Today's date: ${todayStr}
Only include events between ${todayStr} and ${cutoffStr}.

Extract every distinct live music or performance event mentioned. Ignore non-event content (menus, store hours, donation appeals, general announcements).

Return ONLY a JSON array — no explanation, no markdown, no code fences. If no events found, return [].

Each event object must have these exact fields:
{
  "title": "Artist or Event Name",
  "date": "YYYY-MM-DD",
  "time": "8:00 PM",
  "price": "Free" or "$15" or "See website",
  "free": true or false
}

Rules:
- If only a month and day are given with no year, assume ${today.getFullYear()} unless the month has already passed, then use ${today.getFullYear() + 1}
- If time is not mentioned, use ""
- If price is not mentioned, use "See website"
- If the event is explicitly free or no-cover, set free to true
- Do not invent events not mentioned in the email
- Strip any trailing day-of-week or year from the title

Email content:
---
${emailBody}
---

JSON array:`;

  const payload = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": CONFIG.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", options);
  const code     = response.getResponseCode();

  if (code !== 200) {
    Logger.log(`  Claude API error ${code}: ${response.getContentText().substring(0, 200)}`);
    return [];
  }

  const data    = JSON.parse(response.getContentText());
  const rawText = data.content[0].text.trim();

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let extracted = [];
  try {
    extracted = JSON.parse(cleaned);
    if (!Array.isArray(extracted)) extracted = [];
  } catch (e) {
    Logger.log(`  Failed to parse Claude response: ${e}\n  Raw: ${cleaned.substring(0, 200)}`);
    return [];
  }

  // Validate and enrich each event
  const meta   = VENUE_META[venueName] || { location: "Kingston, NY", maps: "" };
  const venueUrl = getVenueUrl(venueName);
  const valid  = [];

  for (const e of extracted) {
    if (!e.title || !e.date) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    if (e.date < todayStr || e.date > cutoffStr) continue;

    valid.push({
      id:       0, // will be assigned when merging
      date:     e.date,
      title:    String(e.title).replace(/"/g, '\\"'),
      venue:    venueName,
      venueUrl: venueUrl,
      location: meta.location,
      mapsUrl:  meta.maps,
      time:     e.time  || "",
      price:    e.price || "See website",
      free:     !!e.free,
      _source:  "email",
    });
  }

  return valid;
}

// ─────────────────────────────────────────────────────────────
//  MERGE new events into events.js and push to GitHub
// ─────────────────────────────────────────────────────────────
function mergeAndPushToGitHub(newEvents) {
  Logger.log(`Fetching current events.js from GitHub...`);

  const apiBase = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${CONFIG.EVENTS_FILE_PATH}`;
  const headers = {
    "Authorization": `token ${CONFIG.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "KingstonRadius-EmailBot/1.0",
  };

  // GET current file
  const getResp = UrlFetchApp.fetch(apiBase, { headers, muteHttpExceptions: true });
  if (getResp.getResponseCode() !== 200) {
    Logger.log(`GitHub GET failed: ${getResp.getResponseCode()} ${getResp.getContentText().substring(0, 200)}`);
    return;
  }

  const fileData  = JSON.parse(getResp.getContentText());
  const sha       = fileData.sha;
  const rawBase64 = fileData.content.replace(/\n/g, '');
  const decoded   = Utilities.newBlob(Utilities.base64Decode(rawBase64)).getDataAsString();

  // Parse existing events array from JS
  const existingEvents = parseEventsJs(decoded);
  Logger.log(`Current events.js has ${existingEvents.length} events`);

  // Deduplicate: key = venue + date
  const seen    = new Map();
  const allEvts = [...existingEvents, ...newEvents];
  for (const e of allEvts) {
    const key = `${e.venue}||${e.date}`;
    if (!seen.has(key)) seen.set(key, e);
  }

  const merged  = [...seen.values()]
    .filter(e => e.date >= formatDateYMD(new Date()))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Reassign IDs
  merged.forEach((e, i) => { e.id = i + 1; });

  Logger.log(`Merged: ${existingEvents.length} existing + ${newEvents.length} new = ${merged.length} total (after dedup & past-event removal)`);

  // Serialize back to events.js format
  const lines = merged.map(e => {
    const t = (e.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `  {\n    id: ${e.id},\n    date: "${e.date}",\n    title: "${t}",\n    venue: "${e.venue}",\n    venueUrl: "${e.venueUrl || ''}",\n    location: "${e.location || ''}",\n    mapsUrl: "${e.mapsUrl || ''}",\n    time: "${e.time || ''}",\n    price: "${e.price || 'See website'}",\n    free: ${e.free ? 'true' : 'false'}\n  }`;
  });
  const newContent = `const EVENTS = [\n${lines.join(',\n')}\n];\n`;

  // Push to GitHub
  const encoded = Utilities.base64Encode(Utilities.newBlob(newContent).getBytes());
  const addedCount = newEvents.length;
  const putPayload = JSON.stringify({
    message: `[email-bot] Add ${addedCount} event(s) from venue newsletters`,
    content: encoded,
    sha:     sha,
  });

  const putResp = UrlFetchApp.fetch(apiBase, {
    method:  "put",
    headers: { ...headers, "Content-Type": "application/json" },
    payload: putPayload,
    muteHttpExceptions: true,
  });

  if (putResp.getResponseCode() === 200 || putResp.getResponseCode() === 201) {
    Logger.log(`✓ Pushed successfully. ${addedCount} new event(s) added to events.js.`);
  } else {
    Logger.log(`✗ GitHub PUT failed: ${putResp.getResponseCode()} ${putResp.getContentText().substring(0, 300)}`);
  }
}

// ─────────────────────────────────────────────────────────────
//  PARSE events.js content → array of event objects
// ─────────────────────────────────────────────────────────────
function parseEventsJs(jsContent) {
  // Extract the array literal between [ and the final ]
  const match = jsContent.match(/const\s+EVENTS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    Logger.log("Could not parse events.js — EVENTS array not found");
    return [];
  }
  try {
    // Use a sandboxed eval-like approach: wrap in a function and call it
    // Apps Script allows this safely since we control the source
    const fn  = new Function(`return ${match[1]};`);
    const arr = fn();
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    Logger.log(`Error parsing EVENTS array: ${e}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
function formatDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getOrCreateLabel(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
    Logger.log(`Created Gmail label: ${name}`);
  }
  return label;
}

function getVenueUrl(venueName) {
  const urls = {
    "Tubby's":               "https://www.tubbyskingston.com/calendar",
    "Assembly Kingston":     "https://www.assemblykingston.com/",
    "Unicorn Bar":           "https://unicornkingston.com/calendar",
    "Keegan Ales":           "https://www.keeganales.com/events/",
    "Bearsville Theater":    "https://bearsvilletheater.com/",
    "Levon Helm Studios":    "https://levonhelm.com/shows",
    "Colony Woodstock":      "https://www.colonywoodstock.com/shows",
    "The Falcon":            "https://www.liveatthefalcon.com/",
    "Basilica Hudson":       "https://basilicahudson.org/events/",
    "Bardavon":              "https://www.bardavon.org/",
    "Opus 40":               "https://opus40.org/events/",
    "The Ashokan Center":    "https://ashokancenter.org/events/",
    "The Lemon Squeeze":     "https://thelemonsqueezenewpaltz.com/events/",
    "Towne Crier Café":      "https://townecrier.com/",
    "MONUMENT hv":           "https://monumenthv.net/",
    "Night Swim":            "https://www.instagram.com/nightswimkingston/",
    "Left Bank Ciders":      "https://www.instagram.com/leftbankciders/",
    "Utility Bicycle Works": "https://www.instagram.com/utilitybicycleworks/",
    "Bethel Woods":          "https://www.bethelwoodscenter.org/events",
    "MASS MoCA":             "https://massmoca.org/performances/",
    "Paramount Hudson Valley":"https://paramounthudsonvalley.com/events/",
    "City Winery Hudson Valley":"https://citywinery.com/hudsonvalley/",
    "Silk Factory":          "https://silkfcty.com/live-entertainment/",
  };
  return urls[venueName] || "#";
}

// ─────────────────────────────────────────────────────────────
//  SETUP: creates a time-based trigger to run every 6 hours
//  Run this function ONCE manually from the Apps Script editor
// ─────────────────────────────────────────────────────────────
function setupTrigger() {
  // Delete any existing triggers for this function to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processNewsletters') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new trigger: every 6 hours
  ScriptApp.newTrigger('processNewsletters')
    .timeBased()
    .everyHours(6)
    .create();

  Logger.log("✓ Trigger created: processNewsletters() will run every 6 hours");
  Logger.log("✓ Make sure ANTHROPIC_API_KEY and GITHUB_TOKEN are filled in CONFIG above");
}

// ─────────────────────────────────────────────────────────────
//  TEST: run this manually to test a single email by subject
//  Change the subject string to match an email in your inbox
// ─────────────────────────────────────────────────────────────
function testSingleEmail() {
  const subject  = "This Week at Bearsville Theater"; // ← change this
  const threads  = GmailApp.search(`subject:"${subject}"`, 0, 1);
  if (threads.length === 0) {
    Logger.log(`No email found with subject: ${subject}`);
    return;
  }
  const msg    = threads[0].getMessages()[0];
  const from   = msg.getFrom();
  const venue  = matchVenue(from);
  Logger.log(`From: ${from} → Venue: ${venue || "NOT MATCHED"}`);
  if (!venue) return;

  const body   = getEmailText(msg);
  Logger.log(`Email body (first 500 chars): ${body.substring(0, 500)}`);

  const events = extractEventsWithClaude(body, venue, subject);
  Logger.log(`Extracted ${events.length} event(s):`);
  events.forEach(e => Logger.log(`  ${e.date} | ${e.title} | ${e.time} | ${e.price}`));
}
