# Kingston Radius

Live music within 90 minutes of Kingston, NY.

## Files

- `index.html` — the main site
- `events.js` — all your event data (edit this to add/update events)

## How to Add Events

### Option 1 — Use the site (easiest)
1. Open `index.html` in your browser
2. Click the **+ Add Event** button in the bottom right
3. Fill in the form and click Add Event
4. Click **Download events.js backup** to save your updated data
5. Replace the old `events.js` with the downloaded one
6. Re-upload to Netlify

### Option 2 — Edit events.js directly
Open `events.js` and copy/paste an existing event block, then update the fields:

```js
{
  id: 999,                          // any unique number
  date: "2026-04-15",               // YYYY-MM-DD format
  title: "Artist Name",
  venue: "Venue Name",
  venueUrl: "https://venue.com",    // venue website
  location: "City, NY",
  mapsUrl: "https://maps.google.com/?q=Venue+Name+City+NY",
  time: "8:00 PM",
  price: "$20",                     // or "Free"
  free: false                       // true if free
}
```

## Deploy to Netlify (Free)

1. Go to [netlify.com](https://netlify.com) and create a free account
2. Click **Add new site** → **Deploy manually**
3. Drag and drop the entire `kingston-radius` folder onto the page
4. Your site is live instantly at a free URL like `kingston-radius.netlify.app`

### To update the site after adding events:
1. Make your changes to `events.js`
2. Go to your Netlify site dashboard
3. Drag and drop the updated folder again — it redeploys in seconds

## Future Plans
- Movie listings page
- Comedy shows page
- Art shows page
- Automated scrapers for venue websites
