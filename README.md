# A.A. Sule 2027 supporter website

A redesigned, responsive static website with a home page, biography, sourced public-record/achievements page and browser-based supporter poster creator.

## Run locally
Open `index.html` or serve this folder:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

## Deploy
Deploy this folder as a static site on Vercel, Netlify or GitHub Pages. No build step is required.

## Files
- `index.html` — redesigned landing page and selected public record, including lithium investments, the Gudi cassava project and NASIDA
- `about.html` — biography, career timeline and sourced achievements
- `generate.html` — poster creator
- `manage-project-photos.html` — private-use tool to add/replace project photos and export the local photo manifest
- `css/modern.css` — modern layer (tokens, a11y, motion)
- `css/site.css` — shared site design system and responsive styles
- `css/generate.css` — poster creator styles
- `js/site.js` — mobile navigation
- `script.js` — poster canvas, photo crop and download logic
- `candidate.jpg` — clean candidate portrait used across the site and campaign poster; the logo/favicon are tightly cropped to face and neck
- `candidate-logo.png` — circular candidate portrait used in navigation, generator header, footer and app icon
- `favicon.png` — candidate portrait favicon

## Editorial note
This is independent supporter-created material, not an official campaign or party publication. Achievement summaries are attributed to the sources linked on the pages and are not an independent audit. The HEARTS Agenda is intentionally excluded.


## Expanded projects and achievements register
The homepage now includes a filterable project register with 37 project/investment entries across infrastructure, industry, health, education, agriculture and environment. Each card links to a public report or government record. Project status is labelled as completed, commissioned, ongoing, proposed, budgeted or announced where the source supports that distinction.

Project photos are owner-managed and self-hosted through the Project Photo Manager. Project report links remain separate from photographs.


## Changelog (code review pass)
- **script.js**: removed a ~290 KB base64 logo (now loads `candidate-logo.png`), removed dead `openFallback` code, fixed escaped-quote font strings, preloads canvas-only fonts so downloaded posters never fall back to default fonts, rAF-throttled redraw, download filename includes supporter name.
- **generate.html**: `<script>` moved inside `<body>` (was after `</body>`), added labels / alt / aria, meta description and Open Graph tags.
- **index/about**: skip link, `aria-pressed` filters + live result count, placeholder cards are no longer `href="#" target="_blank"` links, contradictory aria-labels removed, `referrerpolicy` on hotlinked images, hero image dimensions to stop layout shift, OG/Twitter tags, wording fix ("taken off" → "put into operation").
- **Images**: logo 512→192 px (306 KB→51 KB), portrait recompressed (419 KB→191 KB) + WebP copy.
- **CSS**: new `css/modern.css` (tokens, sticky blurred header, focus rings, reveal-on-scroll, reduced-motion, print), removed duplicated rule blocks, `vercel.json` security headers.
- Project photos are now local-first; the manager exports a same-site photo manifest instead of relying on third-party image hosts.

- Homepage hero uses `hero.jpg`. The poster has no name field; "The Architect of Modern Nasarawa" sits above the candidate's head on the poster photo.

## Upgrade pass — November 2026
- Added multi-field project discovery: keyword search, category, reported status and location filters.
- Added accessible project detail dialogs that reuse each card's existing description, location/status label and source link.
- Removed automatic mobile project-carousel movement; visitors control navigation themselves.
- Added project status labels and live result counts.
- Added a refined hybrid editorial/institutional visual layer in `css/upgrade.css`.
- Improved poster photo validation (image MIME type and 12 MB limit), file-read errors, and photo removal.
- Added clear in-browser photo-processing disclosure and export feedback.
- Added a WebP hero image with JPEG fallback and WebP-first candidate portrait loading.
- Kept the site static: no framework, database or build step required.

Project location/status filters are derived from the text already present in the project register. They are discovery aids, not an independently verified geospatial dataset.


## Add your own project photos
1. Run the site locally (`python -m http.server 8000`) and open `http://localhost:8000/manage-project-photos.html`. (The manager is excluded from deployment by `.vercelignore` on purpose.)
2. Pick a project, choose a JPG/PNG/WebP image (up to 15 MB). It is automatically resized (max 1400 px) and converted to WebP, so typical files are 60–200 KB.
3. Add alt text and save. Repeat for other projects. Drafts persist in your browser; use **Save backup** to keep an editable copy.
4. Click **Export website package (.zip)**. Unzip it into the site's main folder, beside `index.html`. It contains `project-photo-overrides.json` and `assets/projects/*.webp`. Redeploy.

Projects without a photo show a neutral category tile (visitors never see an "add photo" prompt; the owner prompt appears only on localhost or with `?admin` in the URL). Clicking a photo opens an accessible lightbox. Manifest entries may use `src` (preferred, a path under `assets/projects/`) or a legacy embedded `dataUrl`; both are validated before use.

## Review pass — fixes
- Poster: Premium template text/pill/watermark contrast fixed (dark text on gold, light watermark on dark); photo upload uses object URLs instead of base64 strings; `pointercancel` handled while dragging.
- Projects: embedded `data:` photo links (blocked by modern browsers) replaced with a lightbox; manifest cached with revalidation instead of `no-store`; manifest values validated; all external links get `rel="noopener noreferrer"`; broken photos fall back to a tile.
- Photo manager: client-side resize/WebP, ZIP export with real image files (no multi-megabyte JSON on the homepage), backup/restore, stricter import validation.
- Hosting: `.vercelignore` keeps the admin tool and docs out of production; `X-Robots-Tag: noindex` for the manager; sensible cache headers.
