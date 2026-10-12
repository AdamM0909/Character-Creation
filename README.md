# Character Vault

A private codex for writers, hosted free on GitHub Pages. No server, no account: everything is stored in your browser.

## What it holds
Characters, **places**, **factions** and **items**, each with profile fields, background, timeline, scenes, notes, photos and connections. Characters also get a **Voice** tab and a character **Arc** builder.

## Features
- **Dashboard** with stats, a daily word goal and streak, a prompt of the day, a story clock and completeness nudges
- **Browse** as cards or a sortable table; filter by type, story, kind, tag or favorites
- **Stories** (folders): group entries by book, series or world; favorites; drag-to-reorder notes, events, beats and photos
- **Completeness meter** on every entry showing what is still missing
- **Master timeline**, **scenes and chapters** tracker, **relationship web** (draggable), **family tree**, **maps with pins**
- **Story year and ages:** set birth years and ages follow the story year everywhere
- **Compare and merge** entries, with duplicate detection
- **Photos:** upload, drop, paste or add from a link; crop, rotate, mood-board layout, lightbox
- **Notes:** typed and color coded, Markdown with preview, focus mode, pinning
- **Writing tools:** writing prompts, name generator, custom fields and templates, spell check toggle, find and replace across everything
- **Search everything** and run commands with Ctrl/Cmd+K; keyboard shortcuts (press `?`)
- **Safety:** version history snapshots, a 30-day Trash for entries, notes, photos and maps, backup reminders, optional auto-backup file (Chrome/Edge), password-encrypted (AES-256) exports, merge-safe imports
- **Share:** export a polished HTML page, PDF (via print) or Markdown, with Secret notes left out by default
- **Look:** 7 themes, custom accent color, serif or sans headings, compact density, hideable tabs and fields
- **Installable app (PWA)** that works offline

## Publish on GitHub Pages
1. In the repo go to **Settings > Pages** and set **Source** to **GitHub Actions**.
2. In **Settings > Environments > github-pages**, make sure `main` is allowed to deploy.
3. Merging to `main` runs the included workflow and publishes the site.

## Important
Data lives in the browser you use (IndexedDB), not on GitHub, and there is no cloud sync. Use **Export** regularly (or link an auto-backup file) and **Import** to move between devices. An encrypted backup cannot be opened without its password.

## Run locally
Open `index.html`, or run `python3 -m http.server`.
