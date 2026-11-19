# A.A. Sule 2027 website — upgrade notes

## Design direction
A hybrid of premium editorial presentation, modern interaction and institutional clarity. The existing green/cream identity, static deployment model, source links and independent-supporter disclosure have been retained.

## Implemented

### Experience and visual system
- Added a refined visual layer in `css/upgrade.css` rather than replacing the existing design system.
- Improved the homepage hero composition, spacing, typography, image framing, buttons and navigation polish.
- Refined the biography timeline and achievement-card presentation.
- Added responsive project search and filters for category, reported status and location.
- Added result counts, status labels and accessible project-detail dialogs.
- Project carousel autoplay is available with a visible pause/play control; it pauses on hover/focus and respects reduced-motion preferences.

### Poster creator
- Added JPG, PNG and WebP-only upload validation.
- Added a 12 MB file-size limit and a 40-megapixel decoded-image limit.
- Added image-read and image-decode error messages.
- Added a remove-photo action and clearer export feedback.
- Made the local-only photo-processing disclosure visible beside the export action.

### Performance and accessibility
- Added a WebP hero asset with JPEG fallback.
- Switched the biography portrait to WebP with JPEG fallback and made the poster renderer WebP-first with JPEG fallback.
- Added a skip link to the poster creator.
- Added missing mobile-navigation control relationships/current-page semantics.
- Preserved reduced-motion support, keyboard focus styling, image alternative text and external-link protections.

## Validation performed
- JavaScript syntax checks passed for `js/projects.js`, `js/site.js` and `script.js`.
- Browser DOM tests confirmed the 37 existing project cards load, keyword search works, status filtering works, reset restores all records, and project-detail dialogs open.
- Poster script test confirmed the canvas initializes, an image can be loaded, and the remove-photo action resets the editor without JavaScript errors.
- HTML parsing checks found no duplicate IDs, missing image alt attributes or broken in-page anchors in the three HTML pages.

## Important remaining work before public launch
1. **Project photography:** Add 3–5 licensed or self-owned photos per project with the Project Photo Manager (see README). The uploaded source archive contained an empty `project-photo-overrides.json` and no `assets/projects/` images; photos stored only in a previous browser session may be recoverable from that same browser profile, otherwise they must be reselected and exported.
2. **Map experience:** The current location filter uses the locations already written in project metadata. A trustworthy interactive Nasarawa LGA map requires an authoritative boundary/GeoJSON file and verified coordinates for each project. These were not present in the supplied project, so no guessed map pins or boundaries were added.
3. **Content verification:** Re-check every source URL, status, date and financial figure before publication. This site is not an independent audit.
4. **Deployment metadata:** Add the final canonical domain and absolute Open Graph image URLs once the production domain is known.
5. **Production testing:** Run Lighthouse and accessibility testing on the deployed domain, then test on real iOS and Android devices.

## Run locally
From this directory:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

The site remains static and can be deployed to Vercel, Netlify or GitHub Pages without a build step.

## Homepage hero enhancement
- Added a slow, restrained animated multi-layer atmospheric gradient behind the hero.
- Added staggered entrance motion for the eyebrow, headline, supporting copy, actions and footer metadata.
- Enhanced the portrait with a layered frame, soft cinematic lighting, depth and a restrained hover zoom.
- Added a subtle angled fade at the hero-to-biography transition.
- Strengthened the primary hero call-to-action with a larger tap target, clearer hierarchy, hover feedback and visible keyboard focus.
- Added responsive adjustments and a `prefers-reduced-motion` fallback. All motion is decorative; the page remains fully usable when motion is reduced.


## Biography visual leadership journey
- Reworked the biography page into distinct personal-background, education, corporate-career, public-service, photo-gallery and public-record sections.
- Added an accessible vertical career timeline with expandable milestones and category filters for corporate career and public service. Timeline entries remain readable without JavaScript.
- Added a local-photo gallery using only the portrait assets already supplied with the site; captions avoid asserting unverified event details.
- Split source-documented public records (federal commissioning, state-agency reports, investment tracking and budget records) from reported initiatives and projects in development (announcements, state programmes and pipeline proposals). Each item carries a concise attribution/status note distinguishing federal commissioning, state-government activity, NASIDA agency records and private investment.
- Strengthened the editorial note: linked publications are traceable sources, not an independent audit, and project status/figures may change.


## Poster generator and navigation enhancement
- Added three selectable poster design identities: Classic (traditional cream with green/red framing), Modern (the existing contemporary cream/red/green style), and Premium (deep green with restrained gold detailing).
- Template switching redraws the high-resolution canvas immediately while preserving the uploaded photo, crop, zoom and repositioning.
- Added a responsive template selector with selected-state and live status accessibility announcements.
- Preserved local-only photo handling, validation, drag-to-reposition, zoom and PNG export.
- Animated the mobile navigation disclosure, strengthened active-page indicators and added a persistent mobile poster-creator action on the main site pages.
- Improved project-card swipe snapping, progress feedback, current/total count and previous/next boundary states.
- Kept project navigation visitor-controlled; no autoplay timer is used.


## Key sectors and flagship-first project showcase (November 2026)
- Rebuilt the key sectors area to contain exactly four cards in the requested order: Investment & Enterprise; Infrastructure; Education & Health; Agriculture.
- Investment & Enterprise now briefly covers NASIDA, the Avatar Lithium and Diamond New Energy processing investments, the Gudi Industrial Hub, Nasarawa Technology Village and other investment opportunities.
- Increased the visual prominence and spacing of the project register, with a distinct flagship treatment for the first project.
- Reordered the project register to put major industrial investments first, followed by major transport and strategic infrastructure projects, then the wider portfolio.
- Restored project-carousel autoplay on horizontally scrolling layouts with a visible Pause/Play control. Autoplay advances every 5.2 seconds, loops to the beginning, pauses while the project rail is hovered or focused, and respects reduced-motion preferences. Visitors can still swipe or use the previous/next controls.
