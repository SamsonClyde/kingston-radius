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
        for block in soup.select("article, .show, .event"):
            try:
                title_el = block.select_one("h2, h3")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                # Skip navigation/boilerplate headings
                if title.lower() in ["main navigation", "upcoming events", "box office", "support"]:
                    continue
                text = clean(block.get_text())
                # Parse "Friday, Mar 13 at 8:00 pm" or just "Mar 13"
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)", text)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[ap]m)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href*='/shows/'], a[href*='/events/']")
                event_url = link_el["href"] if link_el else "https://www.bardavon.org"
                if not event_url.startswith("http"):
                    event_url = "https://www.bardavon.org" + event_url
                venue_name = "UPAC" if "@ upac" in text.lower() else "Bardavon"
                location = "Kingston, NY" if venue_name == "UPAC" else "Poughkeepsie, NY"
                maps = "https://maps.google.com/?q=601+Broadway+Kingston+NY" if venue_name == "UPAC" else "https://maps.google.com/?q=35+Market+Street+Poughkeepsie+NY"
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
# Structure: month/day header + h3 title + time span
def scrape_unicorn():
    events = []
    try:
        r = requests.get("https://unicornkingston.com/calendar", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # Each event is in a section with a date like "Mar 12" and h3 title
        for block in soup.select("section, article, .event, li"):
            try:
                title_el = block.select_one("h2, h3, h4")
                title = clean(title_el.get_text()) if title_el else ""
                if not title or len(title) < 3:
                    continue
                text = clean(block.get_text())
                m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)", text)
                date_str = fmt_date(m.group(1), m.group(2)) if m else ""
                tm = re.search(r"(\d+:\d+\s*[AP]M)", text, re.I)
                time_str = tm.group(1) if tm else ""
                link_el = block.select_one("a[href]")
                event_url = link_el["href"] if link_el else "https://unicornkingston.com/calendar"
                if not event_url.startswith("http"):
                    event_url = "https://unicornkingston.com" + event_url
                free = "free" in text.lower()
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
    all_events += scrape_rosendale()
    all_events += scrape_bearsville()

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
