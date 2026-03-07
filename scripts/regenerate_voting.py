#!/usr/bin/env python3
"""
Regenerate voting.json from NSC_Votes_Unpivot.xlsx

Usage (from the scripts/ directory):
    python regenerate_voting.py

Or with custom paths:
    python regenerate_voting.py --history data/nsc_all_history.json --votes ../Scoreboards/NSC_Votes_Unpivot.xlsx --output ../public/data/

This is a focused alternative to running the full generate_site_data.py
when only the voting data has changed (e.g. after re-converting scoreboards).
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

def main():
    parser = argparse.ArgumentParser(description="Regenerate voting.json")
    parser.add_argument("--history", default="data/nsc_all_history.json",
                        help="Path to nsc_all_history.json from scraper")
    parser.add_argument("--votes", default="../Scoreboards/NSC_Votes_Unpivot.xlsx",
                        help="Path to NSC_Votes_Unpivot.xlsx")
    parser.add_argument("--output", default="../public/data/",
                        help="Output directory")
    args = parser.parse_args()

    # ── Load history for participant detection ──
    print(f"Loading history from: {args.history}")
    if not os.path.exists(args.history):
        print(f"ERROR: History file not found: {args.history}")
        sys.exit(1)

    with open(args.history, encoding="utf-8") as f:
        raw = json.load(f)
    nsc = raw if isinstance(raw, list) else raw.get("data", raw.get("results", []))
    print(f"  Loaded {len(nsc)} history records")

    # Build participant set: (edition, subevent, nation)
    part_set = set()
    for r in nsc:
        part_set.add((r["Edition"], r["Subevent"], r["Nation"]))

    # Build set of known short nation names from database
    known_short = set(
        r.get("Nation", "").lower()
        for r in nsc
        if r.get("Nation") and len(r["Nation"]) <= 2
    )

    # ── Load votes ──
    print(f"Loading votes from: {args.votes}")
    if not os.path.exists(args.votes):
        print(f"ERROR: Votes file not found: {args.votes}")
        sys.exit(1)

    import openpyxl
    wb = openpyxl.load_workbook(args.votes, read_only=True)
    ws = wb["Sheet1"]
    votes_raw = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue
        if row[0] is None:
            continue
        try:
            votes_raw.append((
                int(row[0]),
                str(row[1] or "").strip(),
                str(row[2] or "").strip(),
                str(row[3] or "").strip(),
                int(row[4]) if row[4] else 0,
            ))
        except (ValueError, TypeError):
            continue
    wb.close()
    print(f"  Loaded {len(votes_raw)} raw vote records")

    # ── Junk filter ──
    junk_patterns = [
        r"^#\s*voters?$", r"^\d+s$", r"^\d+\s*points?$", r"^sum\b", r"^count\b",
        r"^values?\s*ok$", r"^tiebreak", r"^tie[\s-]?break", r"^bonus",
        r"^total$", r"^points?$", r"^place$", r"^rank", r"^draw$",
        r"^result", r"^=", r"^\d+$", r"^check", r"^valid", r"^recap",
        r"^voters?$", r"^entries$", r"^no\.?\s*of\s*voters?",
        r"^higher\s*score", r"^bonus\s*stars?",
        r"^waiting\s*list\s*jury\s*points?$",
        r"https?://", r"youtu\.?be", r"\.com/", r"\.be/",
        r"^column\s*\d+$",
    ]

    def _is_junk(name):
        if not name:
            return True
        nl = name.lower().strip()
        if nl in known_short:
            return False
        if len(name) < 2:
            return True
        return any(re.search(p, nl) for p in junk_patterns)

    votes_raw = [
        (ed, sub, voter, nation, pts)
        for ed, sub, voter, nation, pts in votes_raw
        if not _is_junk(voter) and not _is_junk(nation) and pts > 0
    ]
    print(f"  After junk filter: {len(votes_raw)} vote records")

    # ── Subevent codes ──
    sub_code = {"GF": 0, "S1": 1, "S2": 2, "WL": 3, "R1": 4, "R2": 5}
    sub_v2h = {"GF": "GF", "S1": "SF1", "S2": "SF2", "WL": "GF", "R1": "SF1", "R2": "SF2"}

    # ── Name normalization ──
    # Build canonical name map from history
    canon = {}
    for r in nsc:
        n = r.get("Nation", "")
        if n:
            canon[n.lower()] = n

    # Fuzzy map: strip diacritics + hyphens + spaces
    def _strip(s):
        return ''.join(
            c for c in unicodedata.normalize('NFD', s.lower())
            if unicodedata.category(c) != 'Mn'
        ).replace('-', '').replace(' ', '').replace("'", "")

    fuzzy = {}
    for n in canon.values():
        k = _strip(n)
        if k not in fuzzy:
            fuzzy[k] = n

    # Manual aliases
    _aliases = {
        "gd strenci": "Grand Duchy of Strenci",
        "grand duchy of strenc": "Grand Duchy of Strenci",
        "uk destrion": "United Kingdom of Destrion",
        "uk of destrion": "United Kingdom of Destrion",
        "ukod": "United Kingdom of Destrion",
        "rld": "Reym-L-Dneurb",
        "fr meridia": "Federal Republic of Meridia",
        "federal republic of meridia": "Federal Republic of Meridia",
        "balearica islands": "Balearica Island",
        "kordavian island": "Kordavian Islands",
        "dez reublic": "Dež Republic",
        "papedink": "Papendink",
        "roseland]": "Roseland",
        "waiting iist": "Waiting Iist of Shelley & Nici",
        "waiting iist of shelly & nici": "Waiting Iist of Shelley & Nici",
        "whispering isles": "Whispering Isles",
        "whispering isles (wl)": "Whispering Isles",
        "wi": "Whispering Isles",
        "strenci": "Grand Duchy of Strenci",
        "meridia": "Federal Republic of Meridia",
    }
    for k, v in _aliases.items():
        canon[k] = v

    # WL voter name normalization
    _wl_exact = {"waiting list", "wl", "waliju", "waiting list jury"}

    def _is_wl_name(name):
        nl = name.lower().strip()
        if nl in _wl_exact:
            return True
        if re.match(r"^wl\s*votes?\b", nl):
            return True
        if re.match(r"^waiting\s*list$", nl):
            return True
        return False

    def norm(name):
        if not name:
            return name
        if _is_wl_name(name):
            return "Waiting List"
        nl = name.lower().strip()
        if nl in canon:
            return canon[nl]
        fk = _strip(name)
        if fk in fuzzy:
            return fuzzy[fk]
        return name

    # Normalize all names
    votes_raw = [
        (ed, sub, norm(voter), norm(nation), pts)
        for ed, sub, voter, nation, pts in votes_raw
    ]

    # ── Build voting structures ──
    vote_names = sorted(
        set(v[2] for v in votes_raw if v[2] != "Bonus") |
        set(v[3] for v in votes_raw if v[2] != "Bonus")
    )
    vn2i = {n: i for i, n in enumerate(vote_names)}
    print(f"  {len(vote_names)} unique nation names in voting data")

    # Group votes by (edition, subevent, voter)
    vg = defaultdict(list)
    for ed, sub, voter, nation, pts in votes_raw:
        if voter == "Bonus":
            continue
        vg[(ed, sub, voter)].append((nation, pts))

    # Build rounds: [edition, cat_code, voter_idx, [ni, pts, ni, pts, ...], is_participant]
    rounds = []
    for (ed, sub, voter), vl in vg.items():
        hs = sub_v2h.get(sub, sub)
        isp = (ed, hs, voter) in part_set
        cat = sub_code.get(sub, 0)
        vi = vn2i.get(voter, -1)
        if vi < 0:
            continue
        pairs = []
        for nation, pts in vl:
            ni = vn2i.get(nation, -1)
            if ni >= 0 and pts > 0:
                pairs.extend([ni, pts])
        if pairs:
            rounds.append([ed, cat, vi, pairs, 1 if isp else 0])

    # Build love lists (top mutual point exchanges)
    love = defaultdict(lambda: [0, 0])
    for ed, sub, voter, nation, pts in votes_raw:
        if voter == "Bonus" or pts <= 0:
            continue
        vi = vn2i.get(voter, -1)
        ni = vn2i.get(nation, -1)
        if vi >= 0 and ni >= 0:
            love[(vi, ni)][0] += pts
            love[(vi, ni)][1] += 1

    love_list = sorted(
        [[k[0], k[1], v[0], v[1]] for k, v in love.items() if v[1] >= 3],
        key=lambda x: -x[2]
    )[:300]

    ed_range = [min(v[0] for v in votes_raw), max(v[0] for v in votes_raw)]

    # ── Load roster for owner groups (optional) ──
    owner_groups = []
    roster_path = os.path.join(args.output, "roster.json")
    if os.path.exists(roster_path):
        with open(roster_path, encoding="utf-8") as f:
            roster_data = json.load(f)
        # Build owner -> nations
        owner_nations = defaultdict(list)
        for r in roster_data.get("r", []):
            if r.get("o"):
                owner_nations[r["o"]].append(r["n"])
        for owner, nations in owner_nations.items():
            indices = [vn2i[n] for n in nations if n in vn2i]
            if len(indices) > 1:
                owner_groups.append(indices)
        print(f"  {len(owner_groups)} owner groups from roster")

    # ── Write voting.json ──
    output_path = os.path.join(args.output, "voting.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            {"r": rounds, "n": vote_names, "l": love_list, "e": ed_range, "og": owner_groups},
            f, ensure_ascii=False, separators=(",", ":")
        )

    print(f"\n  voting.json written to: {output_path}")
    print(f"  {len(rounds)} rounds, {len(vote_names)} nations, editions {ed_range[0]}-{ed_range[1]}")
    print(f"  {len(love_list)} love list entries, {len(owner_groups)} owner groups")


if __name__ == "__main__":
    main()
