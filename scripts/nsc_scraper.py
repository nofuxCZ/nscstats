#!/usr/bin/env python3
"""
NSC Wiki Scraper — Replaces the Power BI data pipeline.

Scrapes all Nation Song Contest edition pages from the Miraheze wiki,
extracts results tables (semifinals + grand final), and produces:
  1. nsc_all_history.json   — every entry ever (SF1, SF2, GF, MPQ)
  2. nsc_all_history.xlsx   — same data as Excel (backward-compatible)
  3. nsc_nations.json       — computed per-nation statistics
  4. nsc_editions.json      — per-edition summary data
  5. nsc_records.json       — all-time records and leaderboards
  6. nsc_homepage.json      — aggregated data for the homepage widget

Designed to run on a 14-day cron schedule.
Usage:
    python nsc_scraper.py                    # scrape all editions
    python nsc_scraper.py --from 240         # scrape only edition 240+
    python nsc_scraper.py --editions 243 245 # scrape specific editions
    python nsc_scraper.py --max-edition 248  # override latest edition number
    python nsc_scraper.py --full-rebuild     # force re-scrape everything
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup, Tag

# ── Configuration ───────────────────────────────────────────────────
API_BASE = "https://nationsongcontest.miraheze.org/w/api.php"
WIKI_BASE = "https://nationsongcontest.miraheze.org/wiki"
OUTPUT_DIR = Path("./data")
REQUEST_DELAY = 0.5          # seconds between API calls (be polite)
MAX_RETRIES = 3
RETRY_DELAY = 5              # seconds between retries

# Section heading keywords (mirrors Power BI fxExtractNSCEdition logic)
SECTION_INCLUDE_KEYWORDS = ["semi", "final", "song", "participant", "microstate", "qualification"]
SECTION_EXCLUDE_KEYWORDS = ["winning song", "winner"]

# Caption → Subevent mapping (mirrors Power BI NSCHistory query)
SF1_CAPTIONS = {
    "SEMI-FINAL1", "SEMI-FINAL 1", "SEMIFINAL1", "SEMIFINAL 1",
    "SEMI FINAL1", "SEMI FINAL 1", "SEMI 1", "SEMI1", "SF 1",
    "SEMI-FINAL 1 (AKA ALE GALAXY)", "SEMIFINAL 1 (NEW BANDER STATE)",
    "PARTICIPANTS IN THE SEMIFINAL", "SEMIFINAL 1 (SEMI-TRANSITION ALKALI)",
    "PARTICIPANTS IN THE SEMI-FINAL", "SEMINAR ONE",
    "SEMI-FINAL 1 (SEMI-TRANSITION ALKALI)",
    # Early editions with single semifinal
    "SEMI-FINAL", "SEMIFINAL", "SEMI FINAL", "SEMI",
}
SF2_CAPTIONS = {
    "SEMI-FINAL2", "SEMI-FINAL 2", "SEMIFINAL2", "SEMIFINAL 2",
    "SEMI FINAL2", "SEMI FINAL 2", "SEMI 2", "SEMI2", "SF 2",
    "SEMI-FINAL 2*", "SEMIFINAL 2 (SEMI-REACTIVE METALS)",
    "SEMIFINAL 2 (RAHASIA-DIATI)", "SEMI-FINAL 2 (AKA BEER GALAXY)",
    "SEMINAR TWO", "SEMI-FINAL 2 (SEMI-REACTIVE METALS)",
}
GF_CAPTIONS = {
    "FINAL", "GRAND FINAL", "FINAL (AKA GRAND GALAXY)",
    "PARTICIPANTS IN THE FINAL", "SONGS", "ENTRIES",
    "PARTICIPANTS IN THE FINAL", "WINNING SONG",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("nsc_scraper")


# ── HTTP helpers ────────────────────────────────────────────────────

session = requests.Session()
session.headers.update({
    "User-Agent": "NSCStatsScraper/2.0 (nscstats.com; contact@nscstats.com)"
})


def api_get(params: dict, retries: int = MAX_RETRIES) -> dict:
    """Call the MediaWiki API with retry logic."""
    params.setdefault("format", "json")
    params.setdefault("formatversion", "2")

    for attempt in range(retries):
        try:
            resp = session.get(API_BASE, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, json.JSONDecodeError) as e:
            if attempt < retries - 1:
                wait = RETRY_DELAY * (attempt + 1)
                log.warning(f"  Attempt {attempt+1} failed: {e}. Retrying in {wait}s…")
                time.sleep(wait)
            else:
                log.error(f"  All {retries} attempts failed for params={params}")
                raise


# ── Discover editions ───────────────────────────────────────────────

def discover_latest_edition() -> int:
    """Scrape the main NSC page to find the highest edition number."""
    log.info("Discovering latest edition from main NSC page…")
    try:
        data = api_get({
            "action": "parse",
            "page": "Nation_Song_Contest",
            "prop": "text",
        })
        html = data["parse"]["text"]
        soup = BeautifulSoup(html, "lxml")

        # Find all links matching "Nation_Song_Contest_NNN"
        edition_nums = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            m = re.search(r"Nation_Song_Contest_(\d+)", href)
            if m:
                edition_nums.append(int(m.group(1)))

        if edition_nums:
            latest = max(edition_nums)
            log.info(f"  Found editions up to #{latest}")
            return latest
    except Exception as e:
        log.warning(f"  Could not auto-discover editions: {e}")

    return 247  # fallback


# ── Parse one edition ───────────────────────────────────────────────

def classify_subevent(caption_raw: str) -> str:
    """
    Classify a section caption into SF1, SF2, GF, or MICROSTATE QUALIFICATION.
    Mirrors the Power BI NSCHistory caption-replacement logic exactly.
    """
    if not caption_raw:
        return "GF"  # default for editions with no sections

    caption = caption_raw.strip()
    caption_clean = re.sub(r"\[edit[^\]]*\]", "", caption).strip()
    caption_upper = caption_clean.upper().strip()

    # Check microstate first
    if "MICROSTATE" in caption_upper or "MICRO STATE" in caption_upper:
        return "MICROSTATE QUALIFICATION"

    # Check SF1
    if caption_upper in SF1_CAPTIONS:
        return "SF1"

    # Check SF2
    if caption_upper in SF2_CAPTIONS:
        return "SF2"

    # Check GF
    if caption_upper in GF_CAPTIONS:
        return "GF"

    # Fuzzy fallback: look for keywords in the caption
    lower = caption_upper.lower()
    if "semi" in lower and "1" in lower:
        return "SF1"
    if "semi" in lower and "2" in lower:
        return "SF2"
    if "semi" in lower:
        # If it's just "semifinal" without a number, and we haven't
        # assigned SF1 yet, this might be the only semifinal or the first one.
        # We'll handle this in the caller by checking context.
        return "SF_UNKNOWN"
    if "final" in lower or "song" in lower or "entries" in lower or "participant" in lower:
        return "GF"

    return "GF"  # default fallback


def is_relevant_section(line: str) -> bool:
    """Check if a section heading is relevant (contains results tables)."""
    lower = line.lower()
    has_keyword = any(kw in lower for kw in SECTION_INCLUDE_KEYWORDS)
    has_exclude = any(kw in lower for kw in SECTION_EXCLUDE_KEYWORDS)
    return has_keyword and not has_exclude


def collapse_duplicate_sections(sections: list[dict]) -> list[dict]:
    """
    Remove redundant sub-sections like "Participants in the semifinal"
    that follow a "Semifinal 1" section. Mirrors the Power BI Collapsed step.
    """
    result = []
    for i, sec in enumerate(sections):
        lower = sec["line"].lower()
        prev_lower = sections[i - 1]["line"].lower() if i > 0 else ""

        skip = False
        if "participants in the semifinal" in lower and "semi" in prev_lower:
            skip = True
        if "participants in the semi-final" in lower and "semi" in prev_lower:
            skip = True
        if "participants in the final" in lower and "final" in prev_lower:
            skip = True

        if not skip:
            result.append(sec)

    return result


def parse_results_table(table: Tag) -> list[dict]:
    """
    Extract rows from a wiki results table.
    Returns list of dicts with: Draw, Nation, Artist, Song, Place, Points, YouTube.
    """
    rows = []
    # Find header row to determine column positions
    headers_raw = []
    thead = table.find("thead") or table.find("tr")
    if thead:
        for th in thead.find_all(["th"]):
            headers_raw.append(th.get_text(strip=True).lower())

    # Map column names to indices
    col_map = {}
    for i, h in enumerate(headers_raw):
        h_clean = h.replace("#", "").strip()
        if h_clean in ("draw", "d", "no", "no.", "#"):
            col_map["draw"] = i
        elif h_clean in ("nation", "country"):
            col_map["nation"] = i
        elif h_clean in ("artist", "singer", "performer"):
            col_map["artist"] = i
        elif h_clean in ("song", "title", "entry"):
            col_map["song"] = i
        elif h_clean in ("place", "pos", "position", "rank"):
            col_map["place"] = i
        elif h_clean in ("points", "pts", "total", "score"):
            col_map["points"] = i
        elif h_clean in ("link", "youtube", "yt", "video"):
            col_map["link"] = i

    # If no explicit header mapping, try positional (standard wiki table layout):
    #   Draw | Nation | Artist | Song | [Link] | Place | Points
    if not col_map:
        col_map = {"draw": 0, "nation": 1, "artist": 2, "song": 3, "place": -2, "points": -1}

    # Parse data rows
    all_trs = table.find_all("tr")
    for tr in all_trs:
        cells = tr.find_all(["td"])
        if not cells or len(cells) < 4:
            continue

        # Check if this row has header-like content (skip it)
        if tr.find("th"):
            continue

        try:
            row = {}

            # Draw
            draw_idx = col_map.get("draw", 0)
            draw_text = cells[draw_idx].get_text(strip=True) if draw_idx < len(cells) else ""
            draw_text = re.sub(r"[^\d]", "", draw_text)
            row["Draw"] = int(draw_text) if draw_text else None

            # Nation
            nation_idx = col_map.get("nation", 1)
            if nation_idx < len(cells):
                nation_cell = cells[nation_idx]
                # Use separator=" " to preserve space between link text and plain text
                # e.g. wiki markup [[Viola]] Per Sempre → "Viola" + " Per Sempre"
                nation_text = nation_cell.get_text(separator=" ", strip=True)
                # Collapse multiple spaces
                nation_text = re.sub(r"\s+", " ", nation_text).strip()
                # Clean up common artifacts
                nation_text = nation_text.replace("INK (Paperland)", "Paperland")
                row["Nation"] = nation_text if nation_text else None
            else:
                row["Nation"] = None

            # Artist
            artist_idx = col_map.get("artist", 2)
            if artist_idx < len(cells):
                artist_text = cells[artist_idx].get_text(separator=" ", strip=True)
                artist_text = re.sub(r"\s+", " ", artist_text).strip()
                row["Artist"] = artist_text or None
            else:
                row["Artist"] = None

            # Song — also extract YouTube link from this cell
            song_idx = col_map.get("song", 3)
            youtube_url = None
            if song_idx < len(cells):
                song_cell = cells[song_idx]
                song_text = song_cell.get_text(separator=" ", strip=True)
                song_text = re.sub(r"\s+", " ", song_text).strip()
                row["Song"] = song_text.strip('"').strip("\"").strip() or None

                # Look for YouTube/external link
                for a in song_cell.find_all("a", href=True):
                    href = a["href"]
                    if "youtube.com" in href or "youtu.be" in href:
                        youtube_url = href
                        break
                    elif href.startswith("http") and "miraheze" not in href:
                        youtube_url = href  # might be a link shortener
            else:
                row["Song"] = None

            # Also check a dedicated link column
            link_idx = col_map.get("link")
            if link_idx is not None and link_idx < len(cells):
                link_cell = cells[link_idx]
                for a in link_cell.find_all("a", href=True):
                    href = a["href"]
                    if "youtube.com" in href or "youtu.be" in href or href.startswith("http"):
                        youtube_url = href
                        break

            row["YouTube"] = youtube_url

            # Place
            place_idx = col_map.get("place")
            if place_idx is not None:
                if place_idx < 0:
                    place_idx = len(cells) + place_idx
                if 0 <= place_idx < len(cells):
                    place_text = cells[place_idx].get_text(strip=True)
                    place_text = place_text.replace("*", "").replace("X", "").replace("-", "")
                    place_text = place_text.replace("3/4", "3").strip()
                    place_text = re.sub(r"[^\d]", "", place_text)
                    row["Place"] = int(place_text) if place_text else None
                else:
                    row["Place"] = None
            else:
                row["Place"] = None

            # Points
            points_idx = col_map.get("points")
            if points_idx is not None:
                if points_idx < 0:
                    points_idx = len(cells) + points_idx
                if 0 <= points_idx < len(cells):
                    points_text = cells[points_idx].get_text(strip=True)
                    points_text = points_text.replace("*", "").replace("X", "").replace("-", "")
                    points_text = points_text.replace(".", ",").replace(",", ".").strip()
                    # Handle potential decimal points (some editions have 0.5 etc)
                    points_text = re.sub(r"[^\d.]", "", points_text)
                    row["Points"] = float(points_text) if points_text else None
                else:
                    row["Points"] = None
            else:
                row["Points"] = None

            # Only include rows that have at least Nation and Artist
            if row.get("Nation") and row.get("Artist"):
                rows.append(row)

        except (ValueError, IndexError) as e:
            log.debug(f"    Skipping malformed row: {e}")
            continue

    return rows


def scrape_edition(edition_no: int) -> list[dict]:
    """
    Scrape one NSC edition page and return all result rows.
    Each row has: Edition, Event, Subevent, Draw, Nation, Artist, Song, Place, Points, YouTube.
    """
    page_name = f"Nation_Song_Contest_{edition_no}"
    log.info(f"Scraping edition #{edition_no}…")

    try:
        data = api_get({
            "action": "parse",
            "page": page_name,
            "prop": "text|sections",
        })
    except Exception as e:
        log.error(f"  Failed to fetch edition #{edition_no}: {e}")
        return []

    if "parse" not in data:
        log.warning(f"  Edition #{edition_no}: page not found (no 'parse' key)")
        return []

    parsed = data["parse"]
    html = parsed["text"]
    sections = parsed.get("sections", [])

    soup = BeautifulSoup(html, "lxml")

    # ── Step 1: Filter relevant sections ──
    relevant_sections = [s for s in sections if is_relevant_section(s.get("line", ""))]
    relevant_sections = collapse_duplicate_sections(relevant_sections)

    # ── Step 2: Find sortable result tables ──
    sortable_tables = []
    for table in soup.find_all("table"):
        classes = table.get("class", [])
        class_str = " ".join(classes) if isinstance(classes, list) else str(classes)
        if "sortable" in class_str:
            sortable_tables.append(table)

    if not sortable_tables:
        # Fallback: try wikitable class
        for table in soup.find_all("table"):
            classes = table.get("class", [])
            class_str = " ".join(classes) if isinstance(classes, list) else str(classes)
            if "wikitable" in class_str:
                sortable_tables.append(table)

    if not sortable_tables:
        log.warning(f"  Edition #{edition_no}: no result tables found")
        return []

    # ── Step 3: Map tables to sections using heading proximity ──
    # For each sortable table, find the nearest heading above it in the HTML
    # and classify the subevent from that heading. This is more robust than
    # index-based mapping, especially for early editions (6-17) with a single
    # semifinal and optional microstate qualification tables.
    all_entries = []
    heading_to_subevent_count = {}  # track how many tables each heading has claimed

    for table_idx, table in enumerate(sortable_tables):
        # Strategy: walk backwards from the table to find the nearest heading
        caption_raw = ""

        # Method 1: Check previous headings in the HTML
        for tag in table.find_all_previous(["h2", "h3", "h4"]):
            heading_text = tag.get_text(strip=True)
            # Clean wiki edit links
            heading_text = re.sub(r"\[edit[^\]]*\]", "", heading_text).strip()
            if is_relevant_section(heading_text):
                caption_raw = heading_text
                break

        # Method 2: Fallback to index-based mapping if no heading found
        if not caption_raw and table_idx < len(relevant_sections):
            caption_raw = relevant_sections[table_idx].get("line", "")

        subevent = classify_subevent(caption_raw)

        # Handle ambiguous "SF_UNKNOWN" (single semifinal without a number)
        if subevent == "SF_UNKNOWN":
            # If we haven't seen SF1 yet, assign SF1; otherwise SF2
            seen = {e["Subevent"] for e in all_entries}
            subevent = "SF1" if "SF1" not in seen else "SF2"

        # Handle case where multiple tables share the same semifinal heading.
        # E.g. edition #15 has no "Final" heading — both the SF table and the
        # Final table sit under the "Semi-final" heading. If we already assigned
        # a SF1 table from this same heading, the next one is the GF.
        heading_key = caption_raw.upper().strip()
        heading_to_subevent_count[heading_key] = heading_to_subevent_count.get(heading_key, 0) + 1

        seen_subevents = {e["Subevent"] for e in all_entries}
        if subevent == "SF1" and "SF1" in seen_subevents and heading_to_subevent_count.get(heading_key, 0) > 1:
            subevent = "GF"
        elif subevent == "SF2" and "SF2" in seen_subevents and heading_to_subevent_count.get(heading_key, 0) > 1:
            subevent = "GF"

        # Parse the table rows
        rows = parse_results_table(table)

        if not rows:
            log.debug(f"  Edition #{edition_no}, table {table_idx}: no valid rows extracted")
            continue

        for row in rows:
            row["Edition"] = edition_no
            row["Event"] = "NSC"
            row["Subevent"] = subevent

        log.info(f"  {subevent}: {len(rows)} entries (caption: '{caption_raw[:60]}')")
        all_entries.extend(rows)

    # ── Step 4: Post-processing ──
    # Deduplicate (same nation in same subevent)
    seen_keys = set()
    deduped = []
    for entry in all_entries:
        key = (entry["Edition"], entry["Subevent"], entry["Nation"])
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(entry)

    return deduped


# ── Name normalization ──────────────────────────────────────────────

def normalize_names(all_data: list[dict]) -> list[dict]:
    """
    Unify case variants of Nation, Artist, and Song names.

    The wiki sometimes uses different capitalization across editions
    (e.g. "10 Regions of Mobius" vs "10 Regions Of Mobius",
     "Viola per Sempre" vs "Viola Per Sempre").

    Strategy: for each field, group by lowercased name and pick the
    most frequently used spelling as the canonical form.
    """
    for field in ["Nation", "Artist", "Song"]:
        # Count frequency of each exact spelling
        spelling_counts = defaultdict(Counter)
        for row in all_data:
            val = row.get(field)
            if val:
                key = val.lower().strip()
                spelling_counts[key][val] += 1

        # Build canonical mapping: lowercase → most frequent spelling
        canonical = {}
        unified_count = 0
        for key, variants in spelling_counts.items():
            if len(variants) > 1:
                # Pick the most common spelling
                best = variants.most_common(1)[0][0]
                canonical[key] = best
                unified_count += 1
            else:
                # Only one spelling — use it
                canonical[key] = next(iter(variants))

        # Apply canonical names
        for row in all_data:
            val = row.get(field)
            if val:
                key = val.lower().strip()
                if key in canonical:
                    row[field] = canonical[key]

        if unified_count > 0:
            log.info(f"  Name normalization [{field}]: unified {unified_count} variant groups")

    return all_data


def cleanup_entries(all_data: list[dict]) -> list[dict]:
    """
    Fix edge cases in scraped data:
    - Place/Points that are clearly invalid (e.g. 991) → set to None
    - Strip whitespace from text fields
    """
    for row in all_data:
        # Fix invalid Place values (wiki sometimes has non-numeric content
        # that gets partially parsed into large numbers)
        if row.get("Place") is not None and row["Place"] > 900:
            row["Place"] = None

        # Fix zero-point entries that should be null
        # (only if Place is also None — indicates a DQ or withdrawn entry)
        if row.get("Place") is None and row.get("Points") == 0.0:
            row["Points"] = None

        # Strip whitespace from text fields
        for field in ["Nation", "Artist", "Song"]:
            if row.get(field):
                row[field] = row[field].strip()

    return all_data


# ── Compute statistics ──────────────────────────────────────────────

def compute_nation_stats(all_data: list[dict]) -> dict:
    """Compute per-nation aggregate statistics."""
    nsc = [r for r in all_data if r["Event"] == "NSC"]
    gf = [r for r in nsc if r["Subevent"] == "GF"]
    sf = [r for r in nsc if r["Subevent"] in ("SF1", "SF2")]

    nations = {}

    # GF stats
    for r in gf:
        n = r["Nation"]
        if n not in nations:
            nations[n] = {
                "nation": n,
                "gfEntries": 0, "wins": 0, "top3": 0, "top5": 0, "top10": 0,
                "totalPoints": 0, "places": [], "bestPlace": None,
                "sfEntries": 0, "sfQualified": 0,
                "editions": [], "firstEdition": None, "lastEdition": None,
                "winEditions": [],
            }
        s = nations[n]
        s["gfEntries"] += 1
        s["totalPoints"] += (r["Points"] or 0)
        s["editions"].append(r["Edition"])

        if r["Place"]:
            s["places"].append(r["Place"])
            if s["bestPlace"] is None or r["Place"] < s["bestPlace"]:
                s["bestPlace"] = r["Place"]
            if r["Place"] == 1:
                s["wins"] += 1
                s["winEditions"].append(r["Edition"])
            if r["Place"] <= 3: s["top3"] += 1
            if r["Place"] <= 5: s["top5"] += 1
            if r["Place"] <= 10: s["top10"] += 1

    # SF stats
    for r in sf:
        n = r["Nation"]
        if n not in nations:
            nations[n] = {
                "nation": n,
                "gfEntries": 0, "wins": 0, "top3": 0, "top5": 0, "top10": 0,
                "totalPoints": 0, "places": [], "bestPlace": None,
                "sfEntries": 0, "sfQualified": 0,
                "editions": [], "firstEdition": None, "lastEdition": None,
                "winEditions": [],
            }
        s = nations[n]
        s["sfEntries"] += 1
        # Qualified if they also appear in GF for this edition
        gf_nations_this_ed = {e["Nation"] for e in gf if e["Edition"] == r["Edition"]}
        if n in gf_nations_this_ed:
            s["sfQualified"] += 1

    # Finalize
    for n, s in nations.items():
        s["avgPoints"] = round(s["totalPoints"] / s["gfEntries"], 1) if s["gfEntries"] > 0 else 0
        s["avgPlace"] = round(sum(s["places"]) / len(s["places"]), 1) if s["places"] else None
        s["qualificationRate"] = round(s["sfQualified"] / s["sfEntries"] * 100, 1) if s["sfEntries"] > 0 else None
        all_eds = sorted(s["editions"])
        s["firstEdition"] = all_eds[0] if all_eds else None
        s["lastEdition"] = all_eds[-1] if all_eds else None
        s["totalEditions"] = len(set(all_eds))
        # Clean up internal fields
        del s["places"]
        del s["totalPoints"]
        del s["editions"]

    return nations


def compute_edition_stats(all_data: list[dict]) -> list[dict]:
    """Compute per-edition summary data."""
    nsc = [r for r in all_data if r["Event"] == "NSC"]
    editions = sorted(set(r["Edition"] for r in nsc))
    result = []

    for ed in editions:
        ed_data = [r for r in nsc if r["Edition"] == ed]
        gf = sorted([r for r in ed_data if r["Subevent"] == "GF"],
                     key=lambda x: (x["Place"] or 999))
        sf1 = [r for r in ed_data if r["Subevent"] == "SF1"]
        sf2 = [r for r in ed_data if r["Subevent"] == "SF2"]

        winner = gf[0] if gf and gf[0].get("Place") == 1 else None

        result.append({
            "edition": ed,
            "winner": winner["Nation"] if winner else None,
            "winnerArtist": winner["Artist"] if winner else None,
            "winnerSong": winner["Song"] if winner else None,
            "winnerPoints": winner["Points"] if winner else None,
            "gfSize": len(gf),
            "sf1Size": len(sf1),
            "sf2Size": len(sf2),
            "gf": [{
                "draw": r.get("Draw"),
                "nation": r["Nation"],
                "artist": r["Artist"],
                "song": r["Song"],
                "place": r.get("Place"),
                "points": r.get("Points"),
                "youtube": r.get("YouTube"),
            } for r in gf],
            "sf1": [{
                "draw": r.get("Draw"),
                "nation": r["Nation"],
                "artist": r["Artist"],
                "song": r["Song"],
                "place": r.get("Place"),
                "points": r.get("Points"),
            } for r in sf1],
            "sf2": [{
                "draw": r.get("Draw"),
                "nation": r["Nation"],
                "artist": r["Artist"],
                "song": r["Song"],
                "place": r.get("Place"),
                "points": r.get("Points"),
            } for r in sf2],
        })

    return result


def compute_records(all_data: list[dict]) -> dict:
    """Compute all-time records and leaderboards."""
    nsc = [r for r in all_data if r["Event"] == "NSC"]
    gf = [r for r in nsc if r["Subevent"] == "GF"]

    # Highest scores
    gf_by_points = sorted(gf, key=lambda x: (x["Points"] or 0), reverse=True)
    highest_scores = [{
        "edition": r["Edition"], "nation": r["Nation"],
        "artist": r["Artist"], "song": r["Song"],
        "place": r["Place"], "points": r["Points"]
    } for r in gf_by_points[:20]]

    # Most sent artists
    artist_counts = Counter(r["Artist"] for r in gf if r["Artist"])
    top_artists = [{"artist": a, "count": c} for a, c in artist_counts.most_common(30)]

    # Winners list
    winners = sorted(
        [r for r in gf if r["Place"] == 1],
        key=lambda x: x["Edition"]
    )
    winners_list = [{
        "edition": w["Edition"], "nation": w["Nation"],
        "artist": w["Artist"], "song": w["Song"], "points": w["Points"]
    } for w in winners]

    # Win counts
    win_counts = Counter(w["Nation"] for w in winners)
    top_by_wins = [{"nation": n, "wins": c} for n, c in win_counts.most_common(30)]

    return {
        "highestScores": highest_scores,
        "topArtists": top_artists,
        "allWinners": winners_list,
        "topByWins": top_by_wins,
    }


def compute_homepage_data(all_data: list[dict], nation_stats: dict, records: dict) -> dict:
    """Compute aggregated homepage data."""
    nsc = [r for r in all_data if r["Event"] == "NSC"]
    gf = [r for r in nsc if r["Subevent"] == "GF"]
    sf = [r for r in nsc if r["Subevent"] in ("SF1", "SF2")]

    max_edition = max(r["Edition"] for r in nsc) if nsc else 0

    winners = sorted([r for r in gf if r["Place"] == 1], key=lambda x: x["Edition"])
    latest_winner = winners[-1] if winners else {}

    # Top nations
    top_nations = sorted(
        nation_stats.values(),
        key=lambda x: (-x["wins"], -x["top3"], x.get("avgPlace") or 999)
    )[:15]

    return {
        "summary": {
            "totalEditions": max_edition,
            "totalNations": len(set(r["Nation"] for r in nsc)),
            "totalGFEntries": len(gf),
            "totalSFEntries": len(sf),
            "uniqueArtists": len(set(r["Artist"] for r in gf if r["Artist"])),
            "uniqueSongs": len(set(r["Song"] for r in gf if r["Song"])),
            "highestScore": records["highestScores"][0]["points"] if records["highestScores"] else None,
            "highestScoreNation": records["highestScores"][0]["nation"] if records["highestScores"] else None,
            "highestScoreEdition": records["highestScores"][0]["edition"] if records["highestScores"] else None,
            "latestWinner": latest_winner.get("Nation"),
            "latestEdition": latest_winner.get("Edition"),
            "latestArtist": latest_winner.get("Artist"),
            "latestSong": latest_winner.get("Song"),
            "latestPoints": latest_winner.get("Points"),
        },
        "topNations": [{
            "nation": n["nation"], "wins": n["wins"],
            "entries": n["gfEntries"], "top3": n["top3"],
            "top5": n["top5"], "avgPoints": n["avgPoints"],
            "avgPlace": n.get("avgPlace"),
        } for n in top_nations],
        "recentWinners": [{
            "edition": w["edition"], "nation": w["nation"],
            "artist": w["artist"], "song": w["song"], "points": w["points"]
        } for w in records["allWinners"][-15:][::-1]],
        "topArtists": records["topArtists"][:15],
        "recordScores": records["highestScores"][:10],
    }


# ── Excel export ────────────────────────────────────────────────────

def export_xlsx(all_data: list[dict], filepath: Path):
    """Export all history to Excel (backward-compatible with NSC_all_basic_history.xlsx)."""
    try:
        import openpyxl
    except ImportError:
        log.warning("openpyxl not installed — skipping Excel export")
        return

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"

    headers = ["Subevent", "Draw", "Nation", "Artist", "Song", "Place", "Points", "Edition", "Event", "YouTube"]
    ws.append(headers)

    for row in all_data:
        ws.append([
            row.get("Subevent"),
            row.get("Draw"),
            row.get("Nation"),
            row.get("Artist"),
            row.get("Song"),
            row.get("Place"),
            row.get("Points"),
            row.get("Edition"),
            row.get("Event"),
            row.get("YouTube"),
        ])

    wb.save(filepath)
    log.info(f"  Excel exported: {filepath} ({len(all_data)} rows)")


# ── Incremental update logic ────────────────────────────────────────

def load_existing_data(filepath: Path) -> list[dict]:
    """Load previously scraped data from JSON."""
    if filepath.exists():
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        log.info(f"  Loaded {len(data)} existing rows from {filepath}")
        return data
    return []


def merge_data(existing: list[dict], new_entries: list[dict], scraped_editions: set[int]) -> list[dict]:
    """
    Merge new scraped data into existing data.
    For scraped editions, replace all data; for un-scraped editions, keep existing.
    """
    # Keep data from editions we didn't re-scrape
    kept = [r for r in existing if r["Edition"] not in scraped_editions]
    merged = kept + new_entries

    # Sort by Edition, then Subevent order, then Draw
    sub_order = {"SF1": 0, "SF2": 1, "MICROSTATE QUALIFICATION": 2, "GF": 3}
    merged.sort(key=lambda r: (
        r["Edition"],
        sub_order.get(r["Subevent"], 9),
        r.get("Draw") or 999
    ))

    return merged


# ── Main ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="NSC Wiki Scraper")
    parser.add_argument("--from", dest="from_edition", type=int, default=None,
                        help="Scrape from this edition number onward")
    parser.add_argument("--editions", nargs="+", type=int, default=None,
                        help="Scrape only specific edition numbers")
    parser.add_argument("--max-edition", type=int, default=None,
                        help="Override the latest edition number")
    parser.add_argument("--full-rebuild", action="store_true",
                        help="Force full re-scrape of all editions")
    parser.add_argument("--output", type=str, default="./data",
                        help="Output directory for JSON/Excel files")
    parser.add_argument("--delay", type=float, default=REQUEST_DELAY,
                        help="Delay between API requests in seconds")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable debug logging")
    args = parser.parse_args()

    if args.verbose:
        log.setLevel(logging.DEBUG)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    history_json = output_dir / "nsc_all_history.json"
    history_xlsx = output_dir / "nsc_all_history.xlsx"

    # ── Determine which editions to scrape ──
    if args.max_edition:
        latest = args.max_edition
    else:
        latest = discover_latest_edition()

    if args.editions:
        editions_to_scrape = sorted(args.editions)
    elif args.from_edition:
        editions_to_scrape = list(range(args.from_edition, latest + 1))
    elif args.full_rebuild:
        editions_to_scrape = list(range(1, latest + 1))
    else:
        # Default: full rebuild
        editions_to_scrape = list(range(1, latest + 1))

    log.info(f"Will scrape {len(editions_to_scrape)} editions: "
             f"#{editions_to_scrape[0]}–#{editions_to_scrape[-1]}")

    # ── Load existing data (for incremental mode) ──
    existing_data = []
    if not args.full_rebuild and history_json.exists():
        existing_data = load_existing_data(history_json)

    # ── Scrape ──
    new_entries = []
    failed_editions = []
    scraped_editions = set()

    for i, ed_no in enumerate(editions_to_scrape):
        try:
            entries = scrape_edition(ed_no)
            if entries:
                new_entries.extend(entries)
                scraped_editions.add(ed_no)
                log.info(f"  ✓ Edition #{ed_no}: {len(entries)} entries")
            else:
                log.warning(f"  ⚠ Edition #{ed_no}: 0 entries (page may be empty or missing)")
                scraped_editions.add(ed_no)  # still mark as scraped to clear stale data
        except Exception as e:
            log.error(f"  ✗ Edition #{ed_no}: {e}")
            failed_editions.append(ed_no)

        # Rate limiting
        if i < len(editions_to_scrape) - 1:
            time.sleep(args.delay)

    # ── Merge & save ──
    if existing_data and not args.full_rebuild:
        all_data = merge_data(existing_data, new_entries, scraped_editions)
    else:
        all_data = new_entries

    log.info(f"\n{'='*60}")
    log.info(f"Total entries: {len(all_data)}")
    log.info(f"Scraped editions: {len(scraped_editions)}")
    log.info(f"Failed editions: {len(failed_editions)}")
    if failed_editions:
        log.info(f"  Failed: {failed_editions}")

    # ── Normalize & clean ──
    log.info("Normalizing names and cleaning data…")
    all_data = cleanup_entries(all_data)
    all_data = normalize_names(all_data)

    # Save raw history
    with open(history_json, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=None, separators=(",", ":"))
    log.info(f"Saved {history_json} ({os.path.getsize(history_json) / 1024:.0f} KB)")

    # Excel export
    export_xlsx(all_data, history_xlsx)

    # ── Compute & save statistics ──
    log.info("Computing statistics…")

    nation_stats = compute_nation_stats(all_data)
    with open(output_dir / "nsc_nations.json", "w", encoding="utf-8") as f:
        json.dump(nation_stats, f, ensure_ascii=False, indent=2)
    log.info(f"  nsc_nations.json: {len(nation_stats)} nations")

    edition_stats = compute_edition_stats(all_data)
    with open(output_dir / "nsc_editions.json", "w", encoding="utf-8") as f:
        json.dump(edition_stats, f, ensure_ascii=False, indent=None, separators=(",", ":"))
    log.info(f"  nsc_editions.json: {len(edition_stats)} editions")

    records = compute_records(all_data)
    with open(output_dir / "nsc_records.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    log.info(f"  nsc_records.json: {len(records['highestScores'])} records")

    homepage = compute_homepage_data(all_data, nation_stats, records)
    with open(output_dir / "nsc_homepage.json", "w", encoding="utf-8") as f:
        json.dump(homepage, f, ensure_ascii=False, indent=2)
    log.info(f"  nsc_homepage.json: homepage data ready")

    log.info(f"\n{'='*60}")
    log.info("Done! All files written to: " + str(output_dir.resolve()))

    return 0 if not failed_editions else 1


if __name__ == "__main__":
    sys.exit(main())
