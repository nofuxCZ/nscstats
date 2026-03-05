# NSC Statistics — Complete Setup Guide

## What you'll end up with:
- Your site at **nscstats.com** hosted on Vercel (free, fast, global CDN)
- Data auto-updates every 14 days via GitHub Actions (free)
- All code and data in a GitHub repository you control

---

## STEP 1: Install Git (if you don't have it)

1. Download from https://git-scm.com/download/win
2. Install with default settings
3. After install, open **Git Bash** (search for it in Start menu)

---

## STEP 2: Create a GitHub account (if you don't have one)

1. Go to https://github.com and sign up
2. Verify your email

---

## STEP 3: Create the repository on GitHub

1. Go to https://github.com/new
2. Repository name: `nsc-stats`
3. Description: `NSC Statistics — Nation Song Contest Database`
4. Select **Public**
5. Do NOT check any boxes (no README, no .gitignore)
6. Click **Create repository**
7. Keep this page open — you'll need the URL

---

## STEP 4: Push the site to GitHub

1. Download the `nsc-stats.zip` I gave you
2. Unzip it to `C:\Users\Vut\Documents\nsc-stats`
3. Open **Git Bash** and run these commands one by one:

```bash
cd /c/Users/Vut/Documents/nsc-stats

git init
git add .
git commit -m "Initial NSC Stats site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nsc-stats.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

It will ask for your GitHub credentials. If it asks for a token instead of password:
- Go to https://github.com/settings/tokens/new
- Note: `git push`
- Check `repo` scope
- Generate token, copy it, paste as password

---

## STEP 5: Deploy on Vercel

1. Go to https://vercel.com
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel
4. Click **Add New Project**
5. Find and import your `nsc-stats` repository
6. In the settings:
   - **Framework Preset**: select `Other`
   - **Output Directory**: type `public`
7. Click **Deploy**
8. Wait ~30 seconds — your site is now live at `nsc-stats.vercel.app`!

---

## STEP 6: Connect your domain (nscstats.com)

1. In Vercel: go to your project → **Settings** → **Domains**
2. Type `nscstats.com` and click **Add**
3. Vercel will show you DNS records to add. You'll see something like:
   - Add an **A record** pointing to `76.76.21.21`
   - Or add a **CNAME record** pointing to `cname.vercel-dns.com`

4. Go to your WEDOS admin panel → DNS management for nscstats.com
5. Remove the old A record pointing to WEDOS
6. Add the new record Vercel told you
7. Wait 5-30 minutes for DNS propagation
8. Back in Vercel, click **Verify** — once it turns green, you're done!

Now https://nscstats.com shows your new site.

---

## STEP 7: Set up automated data updates

The GitHub Actions workflow is already included. It runs automatically on the 1st and 15th of each month. To verify:

1. Go to your GitHub repo → **Actions** tab
2. You should see the "Update NSC Data" workflow
3. Click it → **Run workflow** → **Run workflow** (to test it manually)
4. Watch it run — it scrapes the wiki and commits updated data
5. Vercel detects the commit and auto-deploys within 60 seconds

That's it — fully automated!

---

## Manual updates (when you don't want to wait)

### After a new edition finishes:

```bash
cd C:\Users\Vut\Documents\nsc-stats\scripts

# 1. Scrape the wiki (gets the latest edition)
python nsc_scraper.py --full-rebuild --output ./scraper_output

# 2. Regenerate site data
python generate_site_data.py --history ./scraper_output/nsc_all_history.json --output ../public/data/

# 3. Push to GitHub (Vercel auto-deploys)
cd ..
git add public/data/
git commit -m "Update data for edition 248"
git push
```

### To add new voting data:

```bash
cd C:\Users\Vut\Documents\nsc-stats\scripts

# Convert host's Excel file
python nsc_votes_converter.py "path\to\NSC248.xlsx" --edition 248 --append NSC_Votes_Unpivot.xlsx

# Regenerate with voting data included
python generate_site_data.py --history ./scraper_output/nsc_all_history.json --votes NSC_Votes_Unpivot.xlsx --output ../public/data/

# Push
cd ..
git add public/data/
git commit -m "Add voting data for edition 248"
git push
```

---

## Project structure

```
nsc-stats/
├── public/                    ← This is what Vercel serves
│   ├── index.html             ← The complete website (45 KB)
│   └── data/
│       ├── database.json      ← Full 18,807-entry history
│       ├── homepage.json      ← Homepage stats
│       ├── editions.json      ← All 247 editions with results
│       ├── nations.json       ← 306 nation profiles
│       └── voting.json        ← Voting vectors for similarity
├── scripts/                   ← Python tools (not deployed)
│   ├── nsc_scraper.py         ← Wiki scraper
│   ├── nsc_validate.py        ← Scraper validator
│   ├── nsc_votes_converter.py ← Host Excel → unpivoted format
│   ├── generate_site_data.py  ← Regenerate site JSONs
│   └── requirements.txt       ← Python dependencies
├── .github/workflows/
│   └── update-data.yml        ← Automated 14-day scraping
├── vercel.json                ← Vercel configuration
└── README.md                  ← This file
```

---

## Costs

Everything is free:
- **Vercel**: Free tier (100 GB bandwidth/month — more than enough)
- **GitHub**: Free for public repos
- **GitHub Actions**: 2,000 minutes/month free (scraping uses ~5 min per run)

---

## Troubleshooting

**Site shows blank page**: Open browser console (F12 → Console) and check for errors. Most likely a JSON file failed to load.

**"Permission denied" on git push**: You need a Personal Access Token. Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token.

**Data not updating after push**: Check Vercel dashboard — deployments tab shows the build status. Click on the latest deployment to see logs.

**DNS not working after domain change**: DNS propagation can take up to 48 hours, but usually works within 30 minutes. Check at https://dnschecker.org
