# NSC Stats

Nation Song Contest Statistics — a modern React website for browsing 247+ editions of NSC results, nation profiles, records, and voting analysis.

Live at [nscstats.com](https://nscstats.com)

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build & Deploy

```bash
npm run build    # Output to dist/
```

Vercel auto-deploys on push to main. Data files in `public/data/` are copied to `dist/data/` during build.

## Data Pipeline

Data is scraped from the [NSC Wiki](https://nationsongcontest.miraheze.org) every 14 days via GitHub Actions:

1. `scripts/nsc_scraper.py` — Scrapes all edition pages
2. `scripts/generate_site_data.py` — Generates compact JSON for the site
3. GitHub Actions commits updated `public/data/*.json`
4. Vercel auto-deploys

## Project Structure

```
├── public/data/          # JSON data files (auto-updated)
│   ├── homepage.json     # Dashboard stats & top nations
│   ├── database.json     # All 18,807 entries
│   ├── editions.json     # Per-edition results (GF/SF1/SF2/MPQ)
│   ├── nations.json      # 306 nation profiles with history
│   └── voting.json       # Voting records for similarity analysis
├── src/
│   ├── components/       # Layout, Nav, Shared utilities
│   ├── pages/            # 5 page components
│   ├── hooks/            # useTheme
│   ├── data/             # Data loader
│   └── styles/           # CSS with dark/light themes
├── scripts/              # Python scraper & data generator
└── .github/workflows/    # Automated data updates
```

## Pages

- **Overview** — Latest winner, key stats, top nations, recent winners
- **Database** — Search/sort/filter all 18,807 entries, CSV export
- **Editions** — Browse all editions with GF/SF1/SF2/MPQ tabs
- **Nations** — Nation profiles with full edition history
- **Voting** — Voting similarity analysis (cosine similarity, computed client-side)

## Features

- Dark/light theme with remembered preference
- Lazy-loaded pages
- Client-side voting similarity computation
- CSV export for database and voting data
- Mobile responsive
