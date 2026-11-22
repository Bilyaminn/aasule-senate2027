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
2. Select up to five JPG/PNG/WebP photos for the project (up to 15 MB each). Images are resized (max 1400 px) and optimised for the web. You can add photos in batches until the project has five.
3. Add an image description and click **Add photos to this project**. The card displays a photo gallery with thumbnails, previous/next controls and a photo count. Drafts persist in your browser; use **Save backup** to keep an editable copy.
4. Click **Export website package (.zip)**. Unzip it into the site's main folder, beside `index.html`. It contains `project-photo-overrides.json` and up to five files per project in `assets/projects/`. Redeploy.

Projects without a photo show a neutral category tile (visitors never see an "add photo" prompt; the owner prompt appears only on localhost or with `?admin` in the URL). Clicking a photo opens an accessible lightbox. The manifest supports multiple `photos` per project (up to five) and still reads the older single-photo format. Photos are self-hosted under `assets/projects/`; clicking the main image opens the accessible lightbox.

## Review pass — fixes
- Poster: Premium template text/pill/watermark contrast fixed (dark text on gold, light watermark on dark); photo upload uses object URLs instead of base64 strings; `pointercancel` handled while dragging.
- Projects: embedded `data:` photo links (blocked by modern browsers) replaced with a lightbox; manifest cached with revalidation instead of `no-store`; manifest values validated; all external links get `rel="noopener noreferrer"`; broken photos fall back to a tile.
- Photo manager: client-side resize/WebP, ZIP export with real image files (no multi-megabyte JSON on the homepage), backup/restore, stricter import validation.
- Hosting: `.vercelignore` keeps the admin tool and docs out of production; `X-Robots-Tag: noindex` for the manager; sensible cache headers.


## Adding new projects later

You can add projects at any time without editing HTML manually:

1. Run the site locally with a local web server (do not open the manager as a standalone `file://` page).
2. Open `manage-project-photos.html`.
3. Use **Add a new project** to enter the title, location, category, status, date/year, description and optional source URL.
4. Select the new project in the project selector and add up to five photographs.
5. Choose **Export website package (.zip)**.
6. Unzip the downloaded package into the website's main folder beside `index.html`, replacing `project-photo-overrides.json` and adding/replacing the `assets/projects/` images.
7. Deploy the updated website. The new project card will then appear in the project register and its photos will display on the card.

New project records are stored in the `_projects` array inside `project-photo-overrides.json`; the website builds their cards automatically. Use **Save backup** to keep a separate editable backup of both custom projects and photo selections.


## Latest review — fixes
- **Photos missing on phones:** CSS/JS were cached for a day (plus 7 days "stale") so phones kept running old scripts. HTML now links `css`/`js` with a version query, scripts/styles/JSON are always revalidated (`vercel.json`), photo URLs carry a `_version` from the manifest, and galleries retry a failed image once and skip only the broken photo instead of replacing the whole gallery.
- **Delete a project:** manager → step 01B. Built-in projects are hidden (listed under "Deleted projects" with a Restore button); projects you added are removed permanently. Export the package and redeploy for it to go live (`_deleted` in `project-photo-overrides.json`).
- **Manager drafts:** a saved draft is now authoritative, so removed photos and deletions stay removed after reload. "Reset to published site" discards the browser draft.
- **Phones:** photo galleries use a slimmer layout (arrows + counter, no thumbnail strip).
- Removed unused `css/style.css`.

## Senate 2027 update
- Homepage reframed around the Nasarawa North Senate bid: new hero, "The case for the Senate" section (each claim linked to a source), updated title/meta tags and about-page label.
- Added the **New Nasarawa State Secretariat Complex** project (Lafia, commissioned 2025) and ranked it among the flagship projects.
- **Edit projects:** Project Photo Manager → step 01C. Works for built-in and added projects; edits are saved as `_edits` and applied on the live site after export + redeploy. Built-in projects can be reverted to the original wording.
- Reloading a page now returns to the top (back/forward navigation still restores your place).
- Poster call-to-action buttons hardened (decorative layers can no longer sit over them).


## Dashboard hero
- The homepage hero is now a dashboard-style "record at a glance": headline and calls to action on the left; portrait, live KPI tiles (projects documented, completed, in progress, locations) and a by-sector chart on the right. Figures come from the same live project data as the register (including edits/deletions), through the `register:stats` event in `js/projects.js` → `js/hero.js`; static numbers in the HTML are only a no-JavaScript fallback.
- "Nasarawa North" is no longer repeated across the hero, brand line and image captions; it appears once in the hero text. Styles: `css/hero-dashboard.css`.

## Sharing, SEO and CSS (latest)
**Share tags / sitemap.** Every public page has a canonical link, `og:url`, an absolute 1200×630 share image (`og-image.jpg`) and Twitter card tags; `sitemap.xml` and `robots.txt` are included. They contain the placeholder `__SITE_URL__`, which `tools/set-site-url.mjs` fills in:
- **On Vercel:** automatic (`vercel.json` → `buildCommand`). It uses the project's production domain, or the `SITE_URL` environment variable if you set one (do this when you add a custom domain). If no domain is available, the tags are left out instead of publishing placeholders.
- **Anywhere else / locally:** `node tools/set-site-url.mjs https://your-domain.com`
After deploying, open the page source and confirm the canonical link shows your real address, then test a link in the Facebook Sharing Debugger / WhatsApp. Social networks cache previews, so re-scrape after changes.

**One stylesheet.** `css/main.css` now serves the home, about and project-dashboard pages (it replaces `site`, `modern`, `upgrade`, `campaign-refresh`, `premium-home`, `hero-dashboard`, `dashboard` and `modern-data`). Rules that belong to one page are scoped with `:where(.page-home)` / `:where(.page-dashboard)` (zero extra specificity) so no page changed appearance; ~70 dead selectors (the old hero, etc.) were removed. The poster page keeps `css/generate.css` (its own app styles, now purged and including the few shared rules it used) and the admin tool keeps `css/project-photo-manager.css`. Before/after screenshots at three widths plus open dialogs matched within 0.06% of pixels.
