import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; KingstonRadius/1.0)"
}

MONTHS = {
    "jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,
    "jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12
}

def clean(text):
    return re.sub(r'\s+', ' ', text).strip() if text else ""

def fmt_date(month, day, year=None):
    if not year:
        year = datetime.now().year
    try:
        m = MONTHS.get(month[:3].lower())
        if m:
            d = int(day)
            # If month already passed this year, assume next year
            now = datetime.now()
            if year == now.year and m < now.month:
                year += 1
            return f"{year}-{m:02d}-{d:02d}"
    except:
        pass
    return None

# ─── TUBBY'S ─────────────────────────────────────────────────────────────────
def scrape_tubbys():
    events = []
    try:
        r = requests.get("https://www.tubbyskingston.com/calendar", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select(".eventlist-event"):
            try:
                title_el = block.select_one(".eventlist-title")
                title = clean(title_el.get_text()) if title_el else ""
                date_el = block.select_one("time[datetime]")
                date_str = date_el["datetime"][:10] if date_el else ""
                time_el = block.select_one(".event-time-12hr-start")
                time_str = clean(time_el.get_text()) if time_el else ""
                link_el = block.select_one("a.eventlist-title-link")
                event_url = "https://www.tubbyskingston.com" + link_el["href"] if link_el else "https://www.tubbyskingston.com/calendar"
                desc = clean(block.get_text())
                free = "free" in desc.lower()
                price = "Free" if free else "See website"
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Tubby's", "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=31+Broadway+Kingston+NY",
                        "price": price, "free": free})
            except Exception as e:
                print(f"  Tubby's item error: {e}")
    except Exception as e:
        print(f"Tubby's error: {e}")
    print(f"Tubby's: {len(events)} events")
    return events

# ─── ASSEMBLY KINGSTON ────────────────────────────────────────────────────────
def scrape_assembly():
    events = []
    try:
        r = requests.get("https://www.assemblykingston.com/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select(".eventlist-event"):
            try:
                title_el = block.select_one(".eventlist-title")
                title = clean(title_el.get_text()) if title_el else ""
                date_el = block.select_one("time[datetime]")
                date_str = date_el["datetime"][:10] if date_el else ""
                time_el = block.select_one(".event-time-12hr-start")
                time_str = clean(time_el.get_text()) if time_el else ""
                link_el = block.select_one("a.eventlist-title-link")
                event_url = "https://www.assemblykingston.com" + link_el["href"] if link_el else "https://www.assemblykingston.com"
                desc = clean(block.get_text())
                free = "free" in desc.lower()
                price = "Free" if free else "See website"
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Assembly Kingston", "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=236+Wall+Street+Kingston+NY",
                        "price": price, "free": free})
            except Exception as e:
                print(f"  Assembly item error: {e}")
    except Exception as e:
        print(f"Assembly error: {e}")
    print(f"Assembly: {len(events)} events")
    return events

# ─── THE FALCON ───────────────────────────────────────────────────────────────
def scrape_falcon():
    events = []
    try:
        r = requests.get("https://www.liveatthefalcon.com/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for el in soup.find_all(string=re.compile(r"- (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+")):
            try:
                text = clean(str(el))
                match = re.match(r"^(.+?)\s+-\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+),\s+(\d{4})", text)
                if match:
                    title = match.group(1).strip()
                    date_str = fmt_date(match.group(2), match.group(3), int(match.group(4)))
                    if title and date_str:
                        events.append({"title": title, "date": date_str, "time": "See website",
                            "venue": "The Falcon", "venueUrl": "https://www.liveatthefalcon.com",
                            "location": "Marlboro, NY",
                            "mapsUrl": "https://maps.google.com/?q=1348+Route+9W+Marlboro+NY",
                            "price": "See website", "free": False})
            except Exception as e:
                print(f"  Falcon item error: {e}")
    except Exception as e:
        print(f"Falcon error: {e}")
    print(f"Falcon: {len(events)} events")
    return events

# ─── BASILICA HUDSON ──────────────────────────────────────────────────────────
# Structure: "## Upcoming Events" section, each event is a link like:
# [March 19\n\nEVEN THE GOOD GIRLS...](url)
def scrape_basilica():
    events = []
    try:
        r = requests.get("https://basilicahudson.org/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # Find the upcoming events section
        upcoming_heading = soup.find(lambda t: t.name in ["h2","h3"] and "upcoming" in t.get_text().lower())
        if upcoming_heading:
            # Walk siblings until we hit "Past Events"
            for sibling in upcoming_heading.find_next_siblings():
                if sibling.name in ["h2","h3"] and "past" in sibling.get_text().lower():
                    break
                for link in sibling.find_all("a", href=True):
                    try:
                        text = clean(link.get_text())
                        # Text format: "March 19 EVENT TITLE" or just "EVENT TITLE"
                        m = re.match(r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+)\s+(.+)$", text, re.S)
                        if m:
                            date_str = fmt_date(m.group(1), m.group(2))
                            title = clean(m.group(3))
                        else:
                            date_str = ""
                            title = text
                        if title and len(title) > 3:
                            events.append({"title": title, "date": date_str or "", "time": "See website",
                                "venue": "Basilica Hudson", "venueUrl": link["href"],
                                "location": "Hudson, NY",
                                "mapsUrl": "https://maps.google.com/?q=110+South+Front+Street+Hudson+NY",
                                "price": "See website", "free": False})
                    except Exception as e:
                        print(f"  Basilica item error: {e}")
    except Exception as e:
        print(f"Basilica error: {e}")
    print(f"Basilica: {len(events)} events")
    return events

# ─── KEEGAN ALES ──────────────────────────────────────────────────────────────
# Structure: Month abbr + day number in separate divs, then h1 for title
def scrape_keegan():
    events = []
    try:
        r = requests.get("https://www.keeganales.com/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # Each event has a date block like "Mar\n13\n7:30pm" and then h1 title
        # Look for the event list items
        for block in soup.select(".eventlist-event, .event-item, article"):
            try:
                title_el = block.select_one("h1, h2, h3")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 2:
                    continue
                text = clean(block.get_text())
                # Parse date from text like "Mar 13 7:30pm"
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)", text)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                # Parse time
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1).upper() if tm else ""
                link_el = block.select_one("a[href*='/event/']")
                event_url = link_el["href"] if link_el else "https://www.keeganales.com/events/"
                free = "free" in text.lower()
                price = "Free" if free else "See website"
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Keegan Ales", "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=20+Saint+James+Street+Kingston+NY",
                        "price": price, "free": free})
            except Exception as e:
                print(f"  Keegan item error: {e}")
    except Exception as e:
        print(f"Keegan error: {e}")
    # Deduplicate
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Keegan: {len(unique)} events")
    return unique

# ─── BARDAVON / UPAC ──────────────────────────────────────────────────────────
# Structure: date in small divs "Mar\n13\n8:00 pm", then h2 for title
def scrape_bardavon():
    events = []
    try:
        r = requests.get("https://www.bardavon.org/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # Bardavon events have an img, then date divs, then h2 title, then venue line like "@ UPAC"
        for block in soup.select("article, .show, .event"):
            try:
                title_el = block.select_one("h2, h3")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                if title.lower() in ["main navigation", "upcoming events", "box office", "support", "bardavon presents"]:
                    continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)", text)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href*='/shows/'], a[href*='/events/']")
                event_url = link_el["href"] if link_el else "https://www.bardavon.org"
                if not event_url.startswith("http"):
                    event_url = "https://www.bardavon.org" + event_url
                # Detect venue — Bardavon page lists "@ UPAC" or "@ Bardavon"
                is_upac = bool(re.search(r"@\s*upac", text, re.I))
                venue_name = "UPAC" if is_upac else "Bardavon"
                location = "Kingston, NY" if is_upac else "Poughkeepsie, NY"
                maps = "https://maps.google.com/?q=601+Broadway+Kingston+NY" if is_upac else "https://maps.google.com/?q=35+Market+Street+Poughkeepsie+NY"
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": venue_name, "venueUrl": event_url,
                        "location": location, "mapsUrl": maps,
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Bardavon item error: {e}")
    except Exception as e:
        print(f"Bardavon error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Bardavon: {len(unique)} events")
    return unique

# ─── UNICORN BAR ──────────────────────────────────────────────────────────────
# Structure: h3 title, then "Thursday, Mar 12|7:00 PM" on next line, then link
def scrape_unicorn():
    events = []
    try:
        r = requests.get("https://unicornkingston.com/calendar", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # Find all h3 headings — each is an event title
        for h3 in soup.find_all("h3"):
            try:
                title = clean(h3.get_text())
                if not title or len(title) < 3:
                    continue
                # The date/time is in the next sibling text: "Thursday, Mar 12|7:00 PM"
                # Walk the parent for the date/time pattern
                parent_text = clean(h3.parent.get_text()) if h3.parent else ""
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)\|(\d+:\d+\s*[AP]M)", parent_text, re.I)
                if not m:
                    # Try broader match
                    m2 = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)", parent_text, re.I)
                    date_str = fmt_date(m2.group(1), m2.group(2)) if m2 else ""
                    tm2 = re.search(r"(\d+:\d+\s*[AP]M)", parent_text, re.I)
                    time_str = tm2.group(1) if tm2 else ""
                else:
                    date_str = fmt_date(m.group(1), m.group(2)) or ""
                    time_str = m.group(3)
                link_el = h3.parent.find("a", href=True) if h3.parent else None
                event_url = link_el["href"] if link_el else "https://unicornkingston.com/calendar"
                free = "free" in parent_text.lower()
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Unicorn Bar", "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=168+Albany+Ave+Kingston+NY",
                        "price": "Free" if free else "See website", "free": free})
            except Exception as e:
                print(f"  Unicorn item error: {e}")
    except Exception as e:
        print(f"Unicorn error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Unicorn: {len(unique)} events")
    return unique

# ─── ROSENDALE THEATRE ────────────────────────────────────────────────────────
def scrape_rosendale():
    events = []
    try:
        r = requests.get("https://www.rosendaletheatre.org/calendar/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .tribe-events-calendar-list__event, .type-tribe_events"):
            try:
                title_el = block.select_one("h2 a, h3 a, .tribe-event-url, .tribe-events-calendar-list__event-title-link")
                title = clean(title_el.get_text()) if title_el else ""
                event_url = title_el["href"] if title_el and title_el.get("href") else "https://www.rosendaletheatre.org/calendar/"
                date_el = block.select_one("time[datetime], abbr[title]")
                date_str = ""
                if date_el:
                    dt = date_el.get("datetime") or date_el.get("title", "")
                    date_str = dt[:10] if dt else ""
                if not date_str:
                    text = block.get_text()
                    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d+)", text)
                    if m:
                        date_str = fmt_date(m.group(1), m.group(2)) or ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", block.get_text(), re.I)
                time_str = tm.group(1) if tm else ""
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Rosendale Theatre", "venueUrl": event_url,
                        "location": "Rosendale, NY",
                        "mapsUrl": "https://maps.google.com/?q=408+Main+St+Rosendale+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Rosendale item error: {e}")
    except Exception as e:
        print(f"Rosendale error: {e}")
    print(f"Rosendale: {len(events)} events")
    return events

# ─── BEARSVILLE THEATER ───────────────────────────────────────────────────────
def scrape_bearsville():
    events = []
    try:
        r = requests.get("https://bearsvilletheater.com/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select(".show, .event, article"):
            try:
                title_el = block.select_one("h2, h3, h4")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                link_el = block.select_one("a[href*='/event/']")
                event_url = link_el["href"] if link_el else "https://bearsvilletheater.com"
                if not event_url.startswith("http"):
                    event_url = "https://bearsvilletheater.com" + event_url
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d+)", text)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[AP]M)", text, re.I)
                time_str = tm.group(1) if tm else ""
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Bearsville Theater", "venueUrl": event_url,
                        "location": "Woodstock, NY",
                        "mapsUrl": "https://maps.google.com/?q=291+Tinker+St+Woodstock+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Bearsville item error: {e}")
    except Exception as e:
        print(f"Bearsville error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Bearsville: {len(unique)} events")
    return unique

# ─── LEVON HELM STUDIOS ───────────────────────────────────────────────────────
# Squarespace — each show block has: date link, h1 title link, optional h3 subtitle, detail list
def scrape_levon_helm():
    events = []
    try:
        r = requests.get("https://levonhelm.com/shows", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # Each show: h1 with an <a href="/shows/YYYY/..."> inside it
        for h1 in soup.find_all("h1"):
            try:
                a = h1.find("a", href=re.compile(r"/shows/\d{4}/"))
                if not a:
                    continue
                href = a.get("href", "")
                main_title = clean(a.get_text())
                if not main_title or len(main_title) < 3:
                    continue
                # Look for h3 subtitle immediately after this h1 (sibling or nearby)
                subtitle = ""
                for sib in h1.find_next_siblings():
                    tag = sib.name
                    if tag in ("h1", "h2"):
                        break
                    if tag == "h3":
                        subtitle = clean(sib.get_text())
                        break
                full_title = f"{main_title} / {subtitle}" if subtitle else main_title
                # Extract date from URL: /shows/2026/03-21/slug
                m = re.search(r"/shows/(\d{4})/(\d{2})-(\d{2})", href)
                if not m:
                    # fallback: /shows/2026/slug (no day) — skip
                    m2 = re.search(r"/shows/(\d{4})/(?!(\d{2}-\d{2}))(\w+)", href)
                    if not m2:
                        continue
                    # Try to get date from nearby text
                    block_text = clean(h1.parent.get_text() if h1.parent else "")
                    dm = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+),\s+(\d{4})", block_text)
                    date_str = fmt_date(dm.group(1)[:3], dm.group(2), int(dm.group(3))) if dm else ""
                else:
                    date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                event_url = "https://levonhelm.com" + href if href.startswith("/") else href
                if full_title and date_str:
                    events.append({"title": full_title, "date": date_str, "time": "8:00 PM",
                        "venue": "Levon Helm Studios", "venueUrl": "https://levonhelm.com/shows",
                        "location": "Woodstock, NY",
                        "mapsUrl": "https://maps.google.com/?q=160+Plochmann+Lane+Woodstock+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Levon Helm item error: {e}")
    except Exception as e:
        print(f"Levon Helm error: {e}")
    # Deduplicate by date
    seen = set()
    unique = []
    for e in events:
        if e["date"] not in seen:
            seen.add(e["date"])
            unique.append(e)
    print(f"Levon Helm: {len(unique)} events")
    return unique

# ─── HUTTON BRICKYARDS ────────────────────────────────────────────────────────
# Venue has concerts/festivals page — static HTML with event listings
def scrape_hutton():
    events = []
    try:
        r = requests.get("https://www.huttonbrickyards.com/events-happenings", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .eventitem, .summary-item, .sqs-block-content"):
            try:
                title_el = block.select_one("h1, h2, h3")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.huttonbrickyards.com/events-happenings"
                if not event_url.startswith("http"):
                    event_url = "https://www.huttonbrickyards.com" + event_url
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": "",
                        "venue": "Hutton Brickyards", "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=200+North+St+Kingston+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Hutton item error: {e}")
    except Exception as e:
        print(f"Hutton error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Hutton: {len(unique)} events")
    return unique

# ─── DARYL'S HOUSE ────────────────────────────────────────────────────────────
# Their show page uses JS ("Loading Shows") — not scrapeable. Skip.
# def scrape_daryls(): return []

# ─── BETHEL WOODS ─────────────────────────────────────────────────────────────
# Ticketmaster-powered — scrape their pavilion concerts page
def scrape_bethel_woods():
    events = []
    try:
        r = requests.get("https://www.bethelwoodscenter.org/events/pavilion", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .eventlist-event, .summary-item"):
            try:
                title_el = block.select_one("h1, h2, h3, .eventlist-title, .summary-title")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.bethelwoodscenter.org/events"
                if not event_url.startswith("http"):
                    event_url = "https://www.bethelwoodscenter.org" + event_url
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Bethel Woods", "venueUrl": event_url,
                        "location": "Bethel, NY",
                        "mapsUrl": "https://maps.google.com/?q=200+Hurd+Rd+Bethel+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Bethel Woods item error: {e}")
    except Exception as e:
        print(f"Bethel Woods error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Bethel Woods: {len(unique)} events")
    return unique

# ─── THE OUTLIER INN ──────────────────────────────────────────────────────────
# Squarespace events page — static HTML
def scrape_outlier():
    events = []
    try:
        r = requests.get("https://www.outlierinn.com/events", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select(".eventlist-event, .summary-item, article"):
            try:
                title_el = block.select_one("h1, h2, h3, .eventlist-title, .summary-title")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.outlierinn.com/events"
                if not event_url.startswith("http"):
                    event_url = "https://www.outlierinn.com" + event_url
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "The Outlier Inn", "venueUrl": event_url,
                        "location": "Woodridge, NY",
                        "mapsUrl": "https://maps.google.com/?q=307+Mountaindale+Rd+Woodridge+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Outlier item error: {e}")
    except Exception as e:
        print(f"Outlier error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Outlier Inn: {len(unique)} events")
    return unique

# ─── SPOTTY DOG ───────────────────────────────────────────────────────────────
# Their events page is minimal — scrape main page for event mentions
def scrape_spotty_dog():
    events = []
    try:
        r = requests.get("https://www.thespottydog.com/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .eventlist-event, .sqs-block-content, section"):
            try:
                title_el = block.select_one("h1, h2, h3")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m|\d+\s*[AP]M)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.thespottydog.com"
                if not event_url.startswith("http"):
                    event_url = "https://www.thespottydog.com" + event_url
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Spotty Dog Books & Ale", "venueUrl": event_url,
                        "location": "Hudson, NY",
                        "mapsUrl": "https://maps.google.com/?q=440+Warren+St+Hudson+NY",
                        "price": "Free", "free": True})
            except Exception as e:
                print(f"  Spotty Dog item error: {e}")
    except Exception as e:
        print(f"Spotty Dog error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Spotty Dog: {len(unique)} events")
    return unique

# ─── TOMPKINS CORNERS CULTURAL CENTER ────────────────────────────────────────
# Simple Wix-based site with a calendar.html page — static HTML
def scrape_tompkins():
    events = []
    try:
        r = requests.get("https://www.tompkinscorners.org/calendar.html", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("p, div, li, td"):
            try:
                text = clean(block.get_text())
                if len(text) < 10:
                    continue
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                if not m:
                    continue
                date_str = fmt_date(m.group(1), m.group(2)) or ""
                # Title heuristic: bold or first line before pipe/dash
                title_el = block.select_one("strong, b, a")
                title = clean(title_el.get_text()) if title_el else text[:60]
                if not title or len(title) < 3:
                    continue
                tm = re.search(r"(\d+:\d+\s*[ap]m|\d+\s*[AP]M)", text, re.I)
                time_str = tm.group(1) if tm else "7:30 PM"
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.tompkinscorners.org/calendar.html"
                if not event_url.startswith("http"):
                    event_url = "https://www.tompkinscorners.org" + event_url
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Tompkins Corners Cultural Center", "venueUrl": event_url,
                        "location": "Putnam Valley, NY",
                        "mapsUrl": "https://maps.google.com/?q=729+Peekskill+Hollow+Rd+Putnam+Valley+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Tompkins item error: {e}")
    except Exception as e:
        print(f"Tompkins error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Tompkins Corners: {len(unique)} events")
    return unique

# ─── CRANDELL THEATRE ─────────────────────────────────────────────────────────
# WordPress site — scrape special events / live performance pages
def scrape_crandell():
    events = []
    try:
        r = requests.get("https://crandelltheatre.org/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .entry, .type-post"):
            try:
                title_el = block.select_one("h1, h2, h3, .entry-title")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://crandelltheatre.org"
                if not event_url.startswith("http"):
                    event_url = "https://crandelltheatre.org" + event_url
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "Crandell Theatre", "venueUrl": event_url,
                        "location": "Chatham, NY",
                        "mapsUrl": "https://maps.google.com/?q=48+Main+St+Chatham+NY",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  Crandell item error: {e}")
    except Exception as e:
        print(f"Crandell error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Crandell: {len(unique)} events")
    return unique

# ─── MASS MoCA ────────────────────────────────────────────────────────────────
# WordPress site with /performances/ listing page — static HTML
def scrape_massmoca():
    events = []
    try:
        r = requests.get("https://massmoca.org/performances/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .tribe-event, .type-tribe_events, .tribe-events-calendar-list__event"):
            try:
                title_el = block.select_one("h1, h2, h3, .tribe-event-url, a")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                text = clean(block.get_text())
                # Try time[datetime] first
                date_el = block.select_one("time[datetime]")
                if date_el:
                    dt = date_el.get("datetime", "")
                    date_str = dt[:10] if dt else ""
                else:
                    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                    date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://massmoca.org/performances/"
                if not event_url.startswith("http"):
                    event_url = "https://massmoca.org" + event_url
                if title and date_str:
                    events.append({"title": title, "date": date_str, "time": time_str,
                        "venue": "MASS MoCA", "venueUrl": event_url,
                        "location": "North Adams, MA",
                        "mapsUrl": "https://maps.google.com/?q=1040+Mass+MoCA+Way+North+Adams+MA",
                        "price": "See website", "free": False})
            except Exception as e:
                print(f"  MASS MoCA item error: {e}")
    except Exception as e:
        print(f"MASS MoCA error: {e}")
    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"MASS MoCA: {len(unique)} events")
    return unique

# ─── HUDSON BREWING CO ────────────────────────────────────────────────────────
# Website under construction — skip for now, add manually
# def scrape_hudson_brewing(): return []

# ─── OPUS 40 ──────────────────────────────────────────────────────────────────
def scrape_opus40():
    events = []
    try:
        r = requests.get("https://opus40.org/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .tribe-event, .type-tribe_events, .eventlist-event"):
            try:
                title_el = block.select_one("h1,h2,h3,a")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3: continue
                text = clean(block.get_text())
                date_el = block.select_one("time[datetime]")
                if date_el:
                    date_str = date_el.get("datetime","")[:10]
                else:
                    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                    date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://opus40.org/events/"
                if not event_url.startswith("http"): event_url = "https://opus40.org" + event_url
                if title and date_str:
                    events.append({"title":title,"date":date_str,"time":time_str,
                        "venue":"Opus 40","venueUrl":event_url,"location":"Saugerties, NY",
                        "mapsUrl":"https://maps.google.com/?q=50+Fite+Rd+Saugerties+NY",
                        "price":"See website","free":False})
            except Exception as e: print(f"  Opus40 item error: {e}")
    except Exception as e: print(f"Opus40 error: {e}")
    seen=set(); unique=[e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Opus 40: {len(unique)} events"); return unique

# ─── BARD FISHER CENTER ───────────────────────────────────────────────────────
def scrape_fisher_center():
    events = []
    try:
        r = requests.get("https://fishercenter.bard.edu/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .event-item, .tribe-event, .type-tribe_events"):
            try:
                title_el = block.select_one("h1,h2,h3,.event-title")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3: continue
                text = clean(block.get_text())
                date_el = block.select_one("time[datetime]")
                if date_el:
                    date_str = date_el.get("datetime","")[:10]
                else:
                    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                    date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://fishercenter.bard.edu/events/"
                if not event_url.startswith("http"): event_url = "https://fishercenter.bard.edu" + event_url
                if title and date_str:
                    events.append({"title":title,"date":date_str,"time":time_str,
                        "venue":"Bard Fisher Center","venueUrl":event_url,
                        "location":"Annandale-on-Hudson, NY",
                        "mapsUrl":"https://maps.google.com/?q=60+Manor+Ave+Annandale-on-Hudson+NY",
                        "price":"See website","free":False})
            except Exception as e: print(f"  Fisher Center item error: {e}")
    except Exception as e: print(f"Fisher Center error: {e}")
    seen=set(); unique=[e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Fisher Center: {len(unique)} events"); return unique

# ─── CATSKILL MOUNTAIN FOUNDATION ─────────────────────────────────────────────
def scrape_catskill_mtn():
    events = []
    try:
        r = requests.get("https://catskillmtn.org/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .type-tribe_events, .tribe-event"):
            try:
                title_el = block.select_one("h1,h2,h3,.tribe-event-url,a")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3: continue
                text = clean(block.get_text())
                date_el = block.select_one("time[datetime]")
                if date_el:
                    date_str = date_el.get("datetime","")[:10]
                else:
                    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                    date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://catskillmtn.org/events/"
                if not event_url.startswith("http"): event_url = "https://catskillmtn.org" + event_url
                if title and date_str:
                    events.append({"title":title,"date":date_str,"time":time_str,
                        "venue":"Catskill Mountain Foundation","venueUrl":event_url,
                        "location":"Hunter, NY",
                        "mapsUrl":"https://maps.google.com/?q=Main+St+Hunter+NY",
                        "price":"See website","free":False})
            except Exception as e: print(f"  CMF item error: {e}")
    except Exception as e: print(f"Catskill Mtn Foundation error: {e}")
    seen=set(); unique=[e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Catskill Mtn Foundation: {len(unique)} events"); return unique

# ─── BRIDGE STREET THEATRE ────────────────────────────────────────────────────
def scrape_bridge_street():
    events = []
    try:
        r = requests.get("https://www.bridgestreettheatre.com/performances", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .eventlist-event, .summary-item"):
            try:
                title_el = block.select_one("h1,h2,h3,.eventlist-title,.summary-title")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3: continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.bridgestreettheatre.com"
                if not event_url.startswith("http"): event_url = "https://www.bridgestreettheatre.com" + event_url
                if title and date_str:
                    events.append({"title":title,"date":date_str,"time":time_str,
                        "venue":"Bridge Street Theatre","venueUrl":event_url,
                        "location":"Catskill, NY",
                        "mapsUrl":"https://maps.google.com/?q=44+West+Bridge+St+Catskill+NY",
                        "price":"See website","free":False})
            except Exception as e: print(f"  Bridge Street item error: {e}")
    except Exception as e: print(f"Bridge Street error: {e}")
    seen=set(); unique=[e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Bridge Street Theatre: {len(unique)} events"); return unique

# ─── ROSENDALE CAFÉ ───────────────────────────────────────────────────────────
def scrape_rosendale_cafe():
    events = []
    try:
        r = requests.get("https://www.rosendalecafe.com/events", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .eventlist-event, .tribe-event, .summary-item, p"):
            try:
                title_el = block.select_one("h1,h2,h3,strong,b")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3: continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.rosendalecafe.com/events"
                if not event_url.startswith("http"): event_url = "https://www.rosendalecafe.com" + event_url
                free = "free" in text.lower() or "no cover" in text.lower()
                if title and date_str:
                    events.append({"title":title,"date":date_str,"time":time_str,
                        "venue":"Rosendale Café","venueUrl":event_url,
                        "location":"Rosendale, NY",
                        "mapsUrl":"https://maps.google.com/?q=434+Main+St+Rosendale+NY",
                        "price":"Free" if free else "See website","free":free})
            except Exception as e: print(f"  Rosendale Café item error: {e}")
    except Exception as e: print(f"Rosendale Café error: {e}")
    seen=set(); unique=[e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Rosendale Café: {len(unique)} events"); return unique

# ─── CATSKILL BREWERY ─────────────────────────────────────────────────────────
def scrape_catskill_brewery():
    events = []
    try:
        r = requests.get("https://www.catskillbrewery.com/events", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .eventlist-event, .tribe-event, .summary-item"):
            try:
                title_el = block.select_one("h1,h2,h3,.eventlist-title,.summary-title")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3: continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.catskillbrewery.com/events"
                if not event_url.startswith("http"): event_url = "https://www.catskillbrewery.com" + event_url
                if title and date_str:
                    events.append({"title":title,"date":date_str,"time":time_str,
                        "venue":"Catskill Brewery","venueUrl":event_url,
                        "location":"Livingston Manor, NY",
                        "mapsUrl":"https://maps.google.com/?q=672+Old+Rte+17+Livingston+Manor+NY",
                        "price":"See website","free":False})
            except Exception as e: print(f"  Catskill Brewery item error: {e}")
    except Exception as e: print(f"Catskill Brewery error: {e}")
    seen=set(); unique=[e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Catskill Brewery: {len(unique)} events"); return unique

# ─── KINGSTON HAPPENINGS ──────────────────────────────────────────────────────
# Paginated music category — scrape listing pages then fetch each event detail
def scrape_kingston_happenings():
    events = []
    base = "https://kingstonhappenings.org"
    seen_urls = set()
    event_links = []

    # Collect links from up to 5 pages of the music category
    for page in range(1, 6):
        url = f"{base}/events/categories/music/" if page == 1 else f"{base}/events/categories/music/page/{page}/"
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code != 200:
                break
            soup = BeautifulSoup(r.text, "html.parser")
            links = soup.select("h3 a[href*='/events/']")
            if not links:
                break
            for a in links:
                href = a.get("href","")
                if href and href not in seen_urls:
                    seen_urls.add(href)
                    event_links.append((clean(a.get_text()), href))
        except Exception as e:
            print(f"  KH listing page {page} error: {e}")
            break

    print(f"  Kingston Happenings: found {len(event_links)} event links, fetching details...")

    for title_hint, href in event_links:
        try:
            r = requests.get(href, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(r.text, "html.parser")

            # Title: h1
            title_el = soup.select_one("h1")
            title = clean(title_el.get_text()) if title_el else title_hint
            if not title or len(title) < 3:
                continue

            # Date: look for "Fri, Mar 13, 2026" pattern
            text = clean(soup.get_text())
            date_str = ""
            m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d+),\s+(\d{4})", text)
            if m:
                date_str = fmt_date(m.group(1), m.group(2), int(m.group(3))) or ""

            # Time
            tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
            time_str = tm.group(1) if tm else ""

            # Venue: prefer external venue website link, fall back to location page
            venue_name = ""
            venue_url = href
            loc_el = soup.select_one("a[href*='/locations/']")
            if loc_el:
                venue_name = clean(loc_el.get_text())
                # Try to find an external website link for this venue on the event page
                # Look for links that aren't kingstonhappenings.org or social media
                for a in soup.select("a[href^='http']"):
                    link_href = a.get("href","")
                    if ("kingstonhappenings.org" not in link_href and
                        "facebook.com" not in link_href and
                        "instagram.com" not in link_href and
                        "google.com" not in link_href and
                        "twitter.com" not in link_href and
                        "youtube.com" not in link_href and
                        "tixr.com" not in link_href and
                        "eventbrite.com" not in link_href and
                        "calendar" not in link_href.lower() and
                        "ical" not in link_href.lower()):
                        venue_url = link_href
                        break
                # If no external link found, use the KH location page
                if venue_url == href:
                    venue_url = loc_el.get("href", href)

            if not venue_name:
                wm = re.search(r"Where\s+(.+?)(?:\n|When|$)", text)
                venue_name = clean(wm.group(1)) if wm else "Kingston Area"

            location = "Kingston, NY"
            maps_url = f"https://maps.google.com/?q={requests.utils.quote(venue_name+' Kingston NY')}"

            # Skip non-music / non-concert events (karaoke, fitness, community)
            cats_els = soup.select("a[href*='/events/categories/']")
            cats = [clean(c.get_text()).lower() for c in cats_els]
            music_cats = {"music", "nightlife and entertainment"}
            if not any(c in music_cats for c in cats):
                continue

            if title and date_str:
                events.append({"title": title, "date": date_str, "time": time_str,
                    "venue": venue_name or "Kingston Area", "venueUrl": venue_url,
                    "location": location, "mapsUrl": maps_url,
                    "price": "See website", "free": False})
        except Exception as e:
            print(f"  KH event error ({href}): {e}")

    seen = set()
    unique = [e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Kingston Happenings: {len(unique)} events")
    return unique

# ─── LIVELY ARTS AT CHATHAM ───────────────────────────────────────────────────
def scrape_lively_arts():
    events = []
    try:
        r = requests.get("https://www.livelyartsatchatham.org/events", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .eventlist-event, .tribe-event, .sqs-block-content, p"):
            try:
                title_el = block.select_one("h1,h2,h3,strong,.eventlist-title")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3: continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d+)", text, re.I)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://www.livelyartsatchatham.org"
                if not event_url.startswith("http"): event_url = "https://www.livelyartsatchatham.org" + event_url
                if title and date_str:
                    events.append({"title":title,"date":date_str,"time":time_str,
                        "venue":"Lively Arts at Chatham","venueUrl":event_url,
                        "location":"Chatham, NY",
                        "mapsUrl":"https://maps.google.com/?q=Chatham+NY",
                        "price":"See website","free":False})
            except Exception as e: print(f"  Lively Arts item error: {e}")
    except Exception as e: print(f"Lively Arts error: {e}")
    seen=set(); unique=[e for e in events if e["title"] not in seen and not seen.add(e["title"])]
    print(f"Lively Arts at Chatham: {len(unique)} events"); return unique

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    all_events = []
    all_events += scrape_tubbys()
    all_events += scrape_assembly()
    all_events += scrape_falcon()
    all_events += scrape_basilica()
    all_events += scrape_keegan()
    all_events += scrape_bardavon()
    all_events += scrape_unicorn()
    all_events += scrape_bearsville()
    all_events += scrape_levon_helm()
    all_events += scrape_hutton()
    all_events += scrape_bethel_woods()
    all_events += scrape_outlier()
    all_events += scrape_spotty_dog()
    all_events += scrape_tompkins()
    all_events += scrape_crandell()
    all_events += scrape_massmoca()
    all_events += scrape_opus40()
    all_events += scrape_fisher_center()
    all_events += scrape_catskill_mtn()
    all_events += scrape_bridge_street()
    all_events += scrape_rosendale_cafe()
    all_events += scrape_catskill_brewery()
    all_events += scrape_lively_arts()
    all_events += scrape_kingston_happenings()

    # Deduplicate: one event per (venue, date) — keep first occurrence
    seen_slots = set()
    deduped = []
    for e in all_events:
        slot = (e.get("venue",""), e.get("date",""))
        if slot not in seen_slots:
            seen_slots.add(slot)
            deduped.append(e)
    all_events = deduped

    dated = sorted([e for e in all_events if e.get("date")], key=lambda e: e["date"])
    undated = [e for e in all_events if not e.get("date")]
    all_events = dated + undated

    for i, e in enumerate(all_events):
        e["id"] = i + 1

    lines = []
    for e in all_events:
        title = e['title'].replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f"""  {{
    id: {e['id']},
    date: "{e['date']}",
    title: "{title}",
    venue: "{e['venue']}",
    venueUrl: "{e['venueUrl']}",
    location: "{e['location']}",
    mapsUrl: "{e['mapsUrl']}",
    time: "{e['time']}",
    price: "{e['price']}",
    free: {'true' if e['free'] else 'false'}
  }}""")

    output = "const EVENTS = [\n" + ",\n".join(lines) + "\n];\n"
    with open("events.js", "w") as f:
        f.write(output)

    print(f"\nTotal: {len(all_events)} events written to events.js")

if __name__ == "__main__":
    main()
