#!/usr/bin/env python3
"""
Test suite for the NSC scraper parsing logic.
Tests table extraction, section classification, and data normalization
using sample HTML that mimics the wiki format.
"""

import sys
sys.path.insert(0, ".")
from nsc_scraper import (
    parse_results_table,
    classify_subevent,
    is_relevant_section,
    collapse_duplicate_sections,
)
from bs4 import BeautifulSoup

# ── Sample HTML that mimics a typical NSC wiki results table ────────

SAMPLE_TABLE_HTML = """
<table class="sortable wikitable">
<thead>
<tr>
<th>Draw</th>
<th>Nation</th>
<th>Artist</th>
<th>Song</th>
<th>Place</th>
<th>Points</th>
</tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>Reym-L-Dneurb</td>
<td>Christina Stürmer</td>
<td>Mama (Ana Ahabak)</td>
<td>7</td>
<td>23</td>
</tr>
<tr>
<td>2</td>
<td>Escotia</td>
<td>Rob Thomas</td>
<td>Lonely No More</td>
<td>2</td>
<td>39</td>
</tr>
<tr>
<td>3</td>
<td>Arjastan</td>
<td>Belén Arjona</td>
<td>No habrá más perdón</td>
<td>1</td>
<td>40</td>
</tr>
<tr>
<td>4</td>
<td>Gabriel</td>
<td>McFly</td>
<td>I'll Be OK</td>
<td>5</td>
<td>26</td>
</tr>
</tbody>
</table>
"""

SAMPLE_TABLE_WITH_LINK = """
<table class="sortable wikitable">
<thead>
<tr><th>Draw</th><th>Nation</th><th>Artist</th><th>Song</th><th>Place</th><th>Points</th></tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>Calypso</td>
<td>Lady Gaga</td>
<td><a href="https://www.youtube.com/watch?v=abc123">Bad Romance</a></td>
<td>1</td>
<td>200</td>
</tr>
<tr>
<td>2</td>
<td>Pigeon Island</td>
<td>Nightwish</td>
<td><a href="https://youtu.be/xyz789">Nemo</a></td>
<td>2</td>
<td>180</td>
</tr>
</tbody>
</table>
"""

# Table with asterisks and special characters (common in older editions)
SAMPLE_TABLE_MESSY = """
<table class="sortable wikitable">
<thead>
<tr><th>Draw</th><th>Nation</th><th>Artist</th><th>Song</th><th>Place</th><th>Points</th></tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>Belvist</td>
<td>Siddharta</td>
<td>Insane</td>
<td>1*</td>
<td>245</td>
</tr>
<tr>
<td>2</td>
<td>Noizeland</td>
<td>Florence + the Machine</td>
<td>Dog Days Are Over</td>
<td>3/4</td>
<td>199</td>
</tr>
<tr>
<td>X</td>
<td>TestNation</td>
<td>Some Artist</td>
<td>Some Song</td>
<td>-</td>
<td>-</td>
</tr>
</tbody>
</table>
"""


def test_parse_basic_table():
    """Test parsing a standard results table."""
    soup = BeautifulSoup(SAMPLE_TABLE_HTML, "lxml")
    table = soup.find("table")
    rows = parse_results_table(table)

    assert len(rows) == 4, f"Expected 4 rows, got {len(rows)}"

    # Check first entry
    assert rows[0]["Nation"] == "Reym-L-Dneurb"
    assert rows[0]["Artist"] == "Christina Stürmer"
    assert rows[0]["Draw"] == 1
    assert rows[0]["Place"] == 7
    assert rows[0]["Points"] == 23.0

    # Check winner
    winner = [r for r in rows if r["Place"] == 1][0]
    assert winner["Nation"] == "Arjastan"
    assert winner["Points"] == 40.0

    print("✓ test_parse_basic_table passed")


def test_parse_table_with_youtube():
    """Test YouTube link extraction."""
    soup = BeautifulSoup(SAMPLE_TABLE_WITH_LINK, "lxml")
    table = soup.find("table")
    rows = parse_results_table(table)

    assert len(rows) == 2
    assert rows[0]["YouTube"] == "https://www.youtube.com/watch?v=abc123"
    assert rows[1]["YouTube"] == "https://youtu.be/xyz789"
    assert rows[0]["Song"] == "Bad Romance"

    print("✓ test_parse_table_with_youtube passed")


def test_parse_messy_table():
    """Test handling of asterisks, dashes, and special characters."""
    soup = BeautifulSoup(SAMPLE_TABLE_MESSY, "lxml")
    table = soup.find("table")
    rows = parse_results_table(table)

    # Should get all 3 rows
    assert len(rows) == 3, f"Expected 3 rows, got {len(rows)}"

    # "1*" should become 1
    assert rows[0]["Place"] == 1
    assert rows[0]["Points"] == 245.0

    # "3/4" should become 3
    assert rows[1]["Place"] == 3

    # "-" should become None
    assert rows[2]["Place"] is None
    assert rows[2]["Points"] is None

    print("✓ test_parse_messy_table passed")


def test_classify_subevent():
    """Test section caption classification."""
    assert classify_subevent("Semi-Final 1") == "SF1"
    assert classify_subevent("SEMI-FINAL 1") == "SF1"
    assert classify_subevent("Semifinal 1") == "SF1"
    assert classify_subevent("SEMIFINAL 1 (NEW BANDER STATE)") == "SF1"
    assert classify_subevent("SEMINAR ONE") == "SF1"

    assert classify_subevent("Semi-Final 2") == "SF2"
    assert classify_subevent("SEMI-FINAL 2*") == "SF2"
    assert classify_subevent("SEMINAR TWO") == "SF2"

    assert classify_subevent("Final") == "GF"
    assert classify_subevent("Grand Final") == "GF"
    assert classify_subevent("FINAL (AKA GRAND GALAXY)") == "GF"
    assert classify_subevent("Songs") == "GF"
    assert classify_subevent("ENTRIES") == "GF"

    assert classify_subevent("Microstate Qualification") == "MICROSTATE QUALIFICATION"

    # Empty or None
    assert classify_subevent("") == "GF"
    assert classify_subevent(None) == "GF"

    print("✓ test_classify_subevent passed")


def test_is_relevant_section():
    """Test section relevance filtering."""
    assert is_relevant_section("Semi-Final 1") == True
    assert is_relevant_section("Final") == True
    assert is_relevant_section("Participants in the semifinal") == True
    assert is_relevant_section("Songs") == True
    assert is_relevant_section("Microstate qualification") == True

    assert is_relevant_section("Winning song") == False
    assert is_relevant_section("Winner") == False
    assert is_relevant_section("Background") == False
    assert is_relevant_section("Scoring") == False
    assert is_relevant_section("References") == False

    print("✓ test_is_relevant_section passed")


def test_collapse_duplicate_sections():
    """Test collapsing redundant sub-sections."""
    sections = [
        {"line": "Semi-Final 1"},
        {"line": "Participants in the semifinal"},  # should be removed
        {"line": "Semi-Final 2"},
        {"line": "Final"},
        {"line": "Participants in the final"},  # should be removed
    ]

    result = collapse_duplicate_sections(sections)
    assert len(result) == 3, f"Expected 3 sections, got {len(result)}"
    assert result[0]["line"] == "Semi-Final 1"
    assert result[1]["line"] == "Semi-Final 2"
    assert result[2]["line"] == "Final"

    print("✓ test_collapse_duplicate_sections passed")


def test_unicode_handling():
    """Test that unicode nation/artist names are handled correctly."""
    html = """
    <table class="sortable wikitable">
    <thead><tr><th>Draw</th><th>Nation</th><th>Artist</th><th>Song</th><th>Place</th><th>Points</th></tr></thead>
    <tbody>
    <tr><td>1</td><td>Hypjø</td><td>Aimūlli</td><td>Íorónta</td><td>1</td><td>199</td></tr>
    <tr><td>2</td><td>Dež Republic</td><td>Tautumeitas feat. Renārs Kaupers</td><td>Muoseņa</td><td>2</td><td>150</td></tr>
    </tbody>
    </table>
    """
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    rows = parse_results_table(table)

    assert len(rows) == 2
    assert rows[0]["Nation"] == "Hypjø"
    assert rows[0]["Artist"] == "Aimūlli"
    assert rows[0]["Song"] == "Íorónta"
    assert rows[1]["Nation"] == "Dež Republic"

    print("✓ test_unicode_handling passed")


if __name__ == "__main__":
    tests = [
        test_parse_basic_table,
        test_parse_table_with_youtube,
        test_parse_messy_table,
        test_classify_subevent,
        test_is_relevant_section,
        test_collapse_duplicate_sections,
        test_unicode_handling,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            failed += 1
            print(f"✗ {test.__name__} FAILED: {e}")

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*40}")

    sys.exit(0 if failed == 0 else 1)
