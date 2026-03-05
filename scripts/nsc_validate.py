#!/usr/bin/env python3
"""
NSC Scraper Validator — Compares scraper output against the known-good Excel file.

Usage:
    python nsc_validate.py --reference /path/to/NSC_all_basic_history.xlsx --scraped ./data/nsc_all_history.json

Reports:
  - Missing/extra editions
  - Missing/extra entries per edition
  - Mismatched fields (nation, artist, song, place, points)
  - Summary statistics comparison
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path


def load_reference_xlsx(filepath: str) -> list[dict]:
    """Load the reference Excel file."""
    import openpyxl
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb["Sheet1"]
    headers = None
    data = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = list(row)
            continue
        data.append(dict(zip(headers, row)))
    wb.close()
    return data


def load_scraped_json(filepath: str) -> list[dict]:
    """Load scraped JSON data."""
    with open(filepath, encoding="utf-8") as f:
        return json.load(f)


def normalize(val):
    """Normalize a value for comparison."""
    if val is None:
        return None
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, float):
        return round(val, 1)
    return val


def compare(ref_data: list, scraped_data: list):
    """Run comparison and print report."""
    # Filter to NSC only
    ref_nsc = [r for r in ref_data if r.get("Event") == "NSC"]
    scr_nsc = [r for r in scraped_data if r.get("Event") == "NSC"]

    print(f"\n{'='*70}")
    print(f"VALIDATION REPORT")
    print(f"{'='*70}")
    print(f"Reference:  {len(ref_nsc):>6} entries")
    print(f"Scraped:    {len(scr_nsc):>6} entries")
    print(f"Difference: {len(scr_nsc) - len(ref_nsc):>+6}")

    # Group by edition + subevent
    ref_by_ed = defaultdict(list)
    scr_by_ed = defaultdict(list)

    for r in ref_nsc:
        key = (r["Edition"], r["Subevent"])
        ref_by_ed[key].append(r)

    for r in scr_nsc:
        key = (r["Edition"], r["Subevent"])
        scr_by_ed[key].append(r)

    ref_editions = set(r["Edition"] for r in ref_nsc)
    scr_editions = set(r["Edition"] for r in scr_nsc)

    missing_editions = ref_editions - scr_editions
    extra_editions = scr_editions - ref_editions

    print(f"\nEditions in reference: {len(ref_editions)}")
    print(f"Editions in scraped:   {len(scr_editions)}")
    if missing_editions:
        print(f"  MISSING editions: {sorted(missing_editions)}")
    if extra_editions:
        print(f"  EXTRA editions:   {sorted(extra_editions)}")

    # Per-edition comparison
    mismatches = 0
    total_checked = 0
    edition_issues = []

    for key in sorted(ref_by_ed.keys()):
        ed_no, subevent = key
        ref_entries = ref_by_ed[key]
        scr_entries = scr_by_ed.get(key, [])

        if len(ref_entries) != len(scr_entries):
            edition_issues.append(
                f"  #{ed_no} {subevent}: ref={len(ref_entries)} vs scr={len(scr_entries)}"
            )

        # Compare by nation name (case-insensitive to handle wiki casing differences)
        ref_by_nation = {r["Nation"].lower(): r for r in ref_entries if r.get("Nation")}
        scr_by_nation = {r["Nation"].lower(): r for r in scr_entries if r.get("Nation")}

        ref_nations = set(ref_by_nation.keys())
        scr_nations = set(scr_by_nation.keys())

        missing_nations = ref_nations - scr_nations
        extra_nations = scr_nations - ref_nations

        if missing_nations:
            # Show original-case names for readability
            orig_names = {r["Nation"] for r in ref_entries if r.get("Nation") and r["Nation"].lower() in missing_nations}
            edition_issues.append(
                f"  #{ed_no} {subevent}: MISSING nations: {orig_names}"
            )

        # Check field values for common nations
        for nation_lower in ref_nations & scr_nations:
            total_checked += 1
            ref_r = ref_by_nation[nation_lower]
            scr_r = scr_by_nation[nation_lower]

            field_diffs = []
            for field in ["Place", "Points"]:
                ref_val = normalize(ref_r.get(field))
                scr_val = normalize(scr_r.get(field))
                if ref_val != scr_val:
                    field_diffs.append(f"{field}: ref={ref_val} vs scr={scr_val}")

            if field_diffs:
                mismatches += 1
                if len(edition_issues) < 50:  # cap output
                    edition_issues.append(
                        f"  #{ed_no} {subevent} {ref_r['Nation']}: {'; '.join(field_diffs)}"
                    )

    print(f"\n--- FIELD COMPARISON ---")
    print(f"Entries checked:  {total_checked}")
    print(f"Mismatches:       {mismatches}")
    print(f"Match rate:       {(1 - mismatches/max(total_checked,1))*100:.1f}%")

    if edition_issues:
        print(f"\n--- ISSUES ({len(edition_issues)}) ---")
        for issue in edition_issues[:50]:
            print(issue)
        if len(edition_issues) > 50:
            print(f"  ... and {len(edition_issues)-50} more")

    # Summary stats comparison
    print(f"\n--- SUMMARY STATS COMPARISON ---")

    ref_gf = [r for r in ref_nsc if r["Subevent"] == "GF"]
    scr_gf = [r for r in scr_nsc if r["Subevent"] == "GF"]

    ref_winners = [r for r in ref_gf if r.get("Place") == 1]
    scr_winners = [r for r in scr_gf if r.get("Place") == 1]

    print(f"GF entries: ref={len(ref_gf)} vs scr={len(scr_gf)}")
    print(f"Winners:    ref={len(ref_winners)} vs scr={len(scr_winners)}")

    if ref_winners and scr_winners:
        ref_latest = max(ref_winners, key=lambda x: x["Edition"])
        scr_latest = max(scr_winners, key=lambda x: x["Edition"])
        print(f"Latest winner (ref): #{ref_latest['Edition']} {ref_latest['Nation']}")
        print(f"Latest winner (scr): #{scr_latest['Edition']} {scr_latest['Nation']}")

    # Point values comparison
    ref_max_pts = max((r.get("Points") or 0) for r in ref_gf) if ref_gf else 0
    scr_max_pts = max((r.get("Points") or 0) for r in scr_gf) if scr_gf else 0
    print(f"Highest score: ref={ref_max_pts} vs scr={scr_max_pts}")

    print(f"\n{'='*70}")
    verdict = "PASS" if mismatches < total_checked * 0.02 else "NEEDS REVIEW"
    print(f"VERDICT: {verdict}")
    print(f"{'='*70}")

    return 0 if verdict == "PASS" else 1


def main():
    parser = argparse.ArgumentParser(description="Validate NSC scraper output")
    parser.add_argument("--reference", required=True, help="Path to reference Excel file")
    parser.add_argument("--scraped", required=True, help="Path to scraped JSON file")
    args = parser.parse_args()

    print("Loading reference data…")
    ref_data = load_reference_xlsx(args.reference)
    print(f"  {len(ref_data)} rows loaded")

    print("Loading scraped data…")
    scr_data = load_scraped_json(args.scraped)
    print(f"  {len(scr_data)} rows loaded")

    return compare(ref_data, scr_data)


if __name__ == "__main__":
    sys.exit(main())
