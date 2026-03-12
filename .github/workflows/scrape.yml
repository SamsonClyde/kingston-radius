import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; KingstonRadius/1.0)"
}

def clean(text):
    return re.sub(r'\s+', ' ', text).strip() if text else ""

def fmt_date(month, day, year=None):
    if not year:
        year = datetime.now().year
    try:
        months = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,
                  "jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}
        m = months.get(month[:3].lower())
        if m:
            return f"{year}-{m:02d}-{int(day):02d}"
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
                title = clean(block.select_one(".eventlist-title").get_text())
                date_el = block.select_one("time")
                date_str = date_el["datetime"][:10] if date_el and date_el.get("datetime") else ""
                time_el = block.select_one(".event-time-12hr-start")
                time_str = clean(time_el.get_text()) if time_el else ""
                link_el = block.select_one("a.eventlist-title-link")
                event_url = "https://www.tubbyskingston.com" + link_el["href"] if link_el else "https://www.tubbyskingston.com/calendar"
                if title and date_str:
                    events.append({
                        "title": title,
                        "date": date_str,
                        "time": time_str,
                        "venue": "Tubby's",
                        "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=Tubby%27s+31+Broadway+Kingston+NY",
                        "price": "See website",
                        "free": False
                    })
            except Exception as e:
                print(f"Tubby's event error: {e}")
    except Exception as e:
        print(f"Tubby's scrape error: {e}")
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
                title = clean(block.select_one(".eventlist-title").get_text())
                date_el = block.select_one("time")
                date_str = date_el["datetime"][:10] if date_el and date_el.get("datetime") else ""
                time_el = block.select_one(".event-time-12hr-start")
                time_str = clean(time_el.get_text()) if time_el else ""
                link_el = block.select_one("a.eventlist-title-link")
                event_url = "https://www.assemblykingston.com" + link_el["href"] if link_el else "https://www.assemblykingston.com"
                # price
                desc = clean(block.get_text())
                price = "See website"
                free = False
                if "free" in desc.lower():
                    price = "Free"
                    free = True
                if title and date_str:
                    events.append({
                        "title": title,
                        "date": date_str,
                        "time": time_str,
                        "venue": "Assembly Kingston",
                        "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=236+Wall+Street+Kingston+NY",
                        "price": price,
                        "free": free
                    })
            except Exception as e:
                print(f"Assembly event error: {e}")
    except Exception as e:
        print(f"Assembly scrape error: {e}")
    print(f"Assembly: {len(events)} events")
    return events

# ─── BEARSVILLE THEATER ───────────────────────────────────────────────────────
def scrape_bearsville():
    events = []
    try:
        r = requests.get("https://bearsvilletheater.com/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article.type-tribe_events, .tribe-event, .tribe_events_cat"):
            try:
                title_el = block.select_one(".tribe-event-url, .tribe-events-calendar-list__event-title-link, h3 a, h2 a")
                title = clean(title_el.get_text()) if title_el else ""
                event_url = title_el["href"] if title_el and title_el.get("href") else "https://bearsvilletheater.com"
                date_el = block.select_one("time, .tribe-event-date-start, abbr")
                date_str = ""
                if date_el and date_el.get("datetime"):
                    date_str = date_el["datetime"][:10]
                time_str = ""
                time_el = block.select_one(".tribe-event-time, .tribe-events-calendar-list__event-date-tag-datetime")
                if time_el:
                    time_str = clean(time_el.get_text())
                if title and date_str:
                    events.append({
                        "title": title,
                        "date": date_str,
                        "time": time_str,
                        "venue": "Bearsville Theater",
                        "venueUrl": event_url,
                        "location": "Woodstock, NY",
                        "mapsUrl": "https://maps.google.com/?q=291+Tinker+St+Woodstock+NY",
                        "price": "See website",
                        "free": False
                    })
            except Exception as e:
                print(f"Bearsville event error: {e}")
        # fallback: parse the show blocks directly
        if not events:
            for block in soup.select(".show-block, .event-block, .wp-block-group"):
                title_el = block.select_one("h2, h3, h4")
                if title_el:
                    title = clean(title_el.get_text())
                    link_el = block.select_one("a")
                    event_url = link_el["href"] if link_el else "https://bearsvilletheater.com"
                    events.append({
                        "title": title,
                        "date": "",
                        "time": "See website",
                        "venue": "Bearsville Theater",
                        "venueUrl": event_url,
                        "location": "Woodstock, NY",
                        "mapsUrl": "https://maps.google.com/?q=291+Tinker+St+Woodstock+NY",
                        "price": "See website",
                        "free": False
                    })
    except Exception as e:
        print(f"Bearsville scrape error: {e}")
    print(f"Bearsville: {len(events)} events")
    return events

# ─── BASILICA HUDSON ──────────────────────────────────────────────────────────
def scrape_basilica():
    events = []
    try:
        r = requests.get("https://basilicahudson.org/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for link in soup.select(".upcoming-events a, .events-list a, h2 a, h3 a"):
            try:
                title = clean(link.get_text())
                if not title or len(title) < 3:
                    continue
                event_url = link["href"] if link.get("href") else "https://basilicahudson.org/events/"
                # Try to get date from parent
                parent = link.find_parent()
                date_str = ""
                date_el = parent.find("time") if parent else None
                if date_el and date_el.get("datetime"):
                    date_str = date_el["datetime"][:10]
                events.append({
                    "title": title,
                    "date": date_str,
                    "time": "See website",
                    "venue": "Basilica Hudson",
                    "venueUrl": event_url,
                    "location": "Hudson, NY",
                    "mapsUrl": "https://maps.google.com/?q=110+South+Front+Street+Hudson+NY",
                    "price": "See website",
                    "free": False
                })
            except Exception as e:
                print(f"Basilica event error: {e}")
    except Exception as e:
        print(f"Basilica scrape error: {e}")
    print(f"Basilica: {len(events)} events")
    return events

# ─── THE FALCON ───────────────────────────────────────────────────────────────
def scrape_falcon():
    events = []
    try:
        r = requests.get("https://www.liveatthefalcon.com/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        # The Falcon lists events as plain text: "Artist Name - Mar 12, 2026"
        for el in soup.find_all(string=re.compile(r"- (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+")):
            try:
                text = clean(str(el))
                match = re.match(r"^(.+?)\s+-\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+),\s+(\d{4})", text)
                if match:
                    title = match.group(1).strip()
                    month = match.group(2)
                    day = match.group(3)
                    year = match.group(4)
                    date_str = fmt_date(month, day, year)
                    if title and date_str:
                        events.append({
                            "title": title,
                            "date": date_str,
                            "time": "See website",
                            "venue": "The Falcon",
                            "venueUrl": "https://www.liveatthefalcon.com",
                            "location": "Marlboro, NY",
                            "mapsUrl": "https://maps.google.com/?q=1348+Route+9W+Marlboro+NY",
                            "price": "See website",
                            "free": False
                        })
            except Exception as e:
                print(f"Falcon event error: {e}")
    except Exception as e:
        print(f"Falcon scrape error: {e}")
    print(f"Falcon: {len(events)} events")
    return events

# ─── KEEGAN ALES ──────────────────────────────────────────────────────────────
def scrape_keegan():
    events = []
    try:
        r = requests.get("https://www.keeganales.com/events/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select(".tribe-event, article.type-tribe_events, .tribe-events-calendar-list__event"):
            try:
                title_el = block.select_one("h2 a, h3 a, .tribe-event-url")
                title = clean(title_el.get_text()) if title_el else ""
                event_url = title_el["href"] if title_el and title_el.get("href") else "https://www.keeganales.com/events/"
                date_el = block.select_one("time, abbr.tribe-events-abbr")
                date_str = date_el["datetime"][:10] if date_el and date_el.get("datetime") else ""
                time_el = block.select_one(".tribe-event-time")
                time_str = clean(time_el.get_text()) if time_el else ""
                desc = clean(block.get_text())
                free = "free" in desc.lower()
                price = "Free" if free else "See website"
                if title and date_str:
                    events.append({
                        "title": title,
                        "date": date_str,
                        "time": time_str,
                        "venue": "Keegan Ales",
                        "venueUrl": event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=20+Saint+James+Street+Kingston+NY",
                        "price": price,
                        "free": free
                    })
            except Exception as e:
                print(f"Keegan event error: {e}")
    except Exception as e:
        print(f"Keegan scrape error: {e}")
    print(f"Keegan: {len(events)} events")
    return events

# ─── BARDAVON / UPAC ──────────────────────────────────────────────────────────
def scrape_bardavon():
    events = []
    try:
        r = requests.get("https://www.bardavon.org/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article, .event-item, .show-item"):
            try:
                title_el = block.select_one("h2, h3, h2 a, h3 a")
                title = clean(title_el.get_text()) if title_el else ""
                link_el = block.select_one("a")
                event_url = link_el["href"] if link_el and link_el.get("href") else "https://www.bardavon.org"
                if not event_url.startswith("http"):
                    event_url = "https://www.bardavon.org" + event_url
                date_el = block.select_one("time")
                date_str = date_el["datetime"][:10] if date_el and date_el.get("datetime") else ""
                # Try to parse date from text like "Friday, Mar 13 at 8:00 pm"
                if not date_str:
                    text = block.get_text()
                    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)", text)
                    if m:
                        date_str = fmt_date(m.group(1), m.group(2))
                time_str = ""
                m = re.search(r"(\d+:\d+\s*[ap]m)", block.get_text(), re.I)
                if m:
                    time_str = m.group(1)
                # Detect venue (Bardavon or UPAC)
                text = block.get_text()
                venue_name = "UPAC" if "upac" in text.lower() else "Bardavon"
                maps_q = "601+Broadway+Kingston+NY" if venue_name == "UPAC" else "35+Market+Street+Poughkeepsie+NY"
                venue_url_base = "https://www.bardavon.org/box-office/upac-information/" if venue_name == "UPAC" else "https://www.bardavon.org/box-office/bardavon-information/"
                if title and len(title) > 3:
                    events.append({
                        "title": title,
                        "date": date_str,
                        "time": time_str,
                        "venue": venue_name,
                        "venueUrl": event_url,
                        "location": "Kingston, NY" if venue_name == "UPAC" else "Poughkeepsie, NY",
                        "mapsUrl": f"https://maps.google.com/?q={maps_q}",
                        "price": "See website",
                        "free": False
                    })
            except Exception as e:
                print(f"Bardavon event error: {e}")
    except Exception as e:
        print(f"Bardavon scrape error: {e}")
    # Deduplicate by title
    seen = set()
    unique = []
    for e in events:
        if e["title"] not in seen and len(e["title"]) > 3:
            seen.add(e["title"])
            unique.append(e)
    print(f"Bardavon: {len(unique)} events")
    return unique

# ─── UNICORN BAR ──────────────────────────────────────────────────────────────
def scrape_unicorn():
    events = []
    try:
        r = requests.get("https://unicornkingston.com/calendar", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select(".event-card, article, .calendar-event"):
            try:
                title_el = block.select_one("h2, h3, h4, .event-title")
                title = clean(title_el.get_text()) if title_el else ""
                link_el = block.select_one("a")
                event_url = link_el["href"] if link_el and link_el.get("href") else "https://unicornkingston.com/calendar"
                date_el = block.select_one("time")
                date_str = date_el["datetime"][:10] if date_el and date_el.get("datetime") else ""
                if not date_str:
                    text = block.get_text()
                    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)", text)
                    if m:
                        date_str = fmt_date(m.group(1), m.group(2))
                time_el = block.select_one(".event-time, time")
                text = block.get_text()
                tm = re.search(r"(\d+:\d+\s*[AP]M)", text, re.I)
                time_str = tm.group(1) if tm else ""
                free = "free" in text.lower()
                if title and date_str:
                    events.append({
                        "title": title,
                        "date": date_str,
                        "time": time_str,
                        "venue": "Unicorn Bar",
                        "venueUrl": event_url if event_url.startswith("http") else "https://unicornkingston.com" + event_url,
                        "location": "Kingston, NY",
                        "mapsUrl": "https://maps.google.com/?q=168+Albany+Ave+Kingston+NY",
                        "price": "Free" if free else "See website",
                        "free": free
                    })
            except Exception as e:
                print(f"Unicorn event error: {e}")
    except Exception as e:
        print(f"Unicorn scrape error: {e}")
    print(f"Unicorn: {len(events)} events")
    return events

# ─── ROSENDALE THEATRE ────────────────────────────────────────────────────────
def scrape_rosendale():
    events = []
    try:
        r = requests.get("https://www.rosendaletheatre.org/calendar/", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(r.text, "html.parser")
        for block in soup.select("article.type-tribe_events, .tribe-events-calendar-list__event, .tribe-event"):
            try:
                title_el = block.select_one("h2 a, h3 a, .tribe-event-url")
                title = clean(title_el.get_text()) if title_el else ""
                event_url = title_el["href"] if title_el and title_el.get("href") else "https://www.rosendaletheatre.org/calendar/"
                date_el = block.select_one("time, abbr")
                date_str = date_el["datetime"][:10] if date_el and date_el.get("datetime") else ""
                time_el = block.select_one(".tribe-event-time")
                time_str = clean(time_el.get_text()) if time_el else ""
                if title and date_str:
                    events.append({
                        "title": title,
                        "date": date_str,
                        "time": time_str,
                        "venue": "Rosendale Theatre",
                        "venueUrl": event_url,
                        "location": "Rosendale, NY",
                        "mapsUrl": "https://maps.google.com/?q=408+Main+St+Rosendale+NY",
                        "price": "See website",
                        "free": False
                    })
            except Exception as e:
                print(f"Rosendale event error: {e}")
    except Exception as e:
        print(f"Rosendale scrape error: {e}")
    print(f"Rosendale: {len(events)} events")
    return events

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    all_events = []
    all_events += scrape_tubbys()
    all_events += scrape_assembly()
    all_events += scrape_bearsville()
    all_events += scrape_basilica()
    all_events += scrape_falcon()
    all_events += scrape_keegan()
    all_events += scrape_bardavon()
    all_events += scrape_unicorn()
    all_events += scrape_rosendale()

    # Filter out events with no date, sort by date
    dated = [e for e in all_events if e.get("date")]
    undated = [e for e in all_events if not e.get("date")]
    dated.sort(key=lambda e: e["date"])
    all_events = dated + undated

    # Assign IDs
    for i, e in enumerate(all_events):
        e["id"] = i + 1

    # Write events.js
    lines = []
    for e in all_events:
        title = e['title'].replace('"', '\\"')
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

    print(f"\nTotal events written: {len(all_events)}")
    print("events.js updated successfully.")

if __name__ == "__main__":
    main()
