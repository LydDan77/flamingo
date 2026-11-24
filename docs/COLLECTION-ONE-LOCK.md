# Collection One: locked

Collection One is the five design versions shipped in Round 1 (Dark, Light, Warm, Bright, Elite) together with everything they run on: the motion layer, the Phosphor duotone icon sprite, the compliance pass and the partner overview / partner view.

## Where it lives

| What | Where |
| --- | --- |
| Commit | `0ec4f91` on `main` |
| Locked branch | `collection-one-locked` on GitHub (never receives Round 2 work); this is the server-side lock |
| Tag | `v1.0-collection-one` at the same commit. Tags cannot be pushed from the automated session, so create it once on GitHub: Releases → "Draft a new release" → tag `v1.0-collection-one`, target `collection-one-locked`. The lock file pins the commit either way. |
| Frozen live build | https://flamingo-foruxo8dw-regenerative-revival.vercel.app (immutable deployment of that commit; `?theme=dark|light|warm|bright|elite`) |
| Moving live build | https://flamingo-regenerative-revival.vercel.app (follows `main`, will gain Collection Two) |
| Template archive | `git archive --format=zip --prefix=flamingo-v1.0-template/ -o flamingo-v1.0-template.zip v1.0-collection-one` |
| Lock file | `docs/collection-one.lock.json` (content hashes of the locked files) |

## What "locked" means

The files below are frozen at their Collection One content. `node tools/check-lock.js` fails if any of them changed; run it before every Round 2 commit (and `--update` only after an approved, re-QA'd change).

- The five theme parts: `src/assets/css/parts/30-theme-dark.css` … `34-theme-elite.css`
- Shared CSS: `00-tokens-base.css`, `10-components.css`, `12-partner.css`, `15-motion.css`, `20-layout.css`
- `src/assets/js/site.js`, `src/layout.html`, `src/partials/icons.html`, `src/partials/theme-switch.html`, `build.js`

Pages, partials, content and `site.config.js` are not locked: Round 2 content modules will touch them, and the Collection One themes must keep rendering that content correctly (the layout regression covers both collections).

## How Collection Two plugs in without touching the lock

Round 2 adds files and extends lists; it does not rewrite. A new theme is:

1. A new CSS part `src/assets/css/parts/4x-theme-<name>.css` (parts concatenate in file order, so `4x` loads after Collection One and can override anything).
2. Its fonts in the bootstrap map in `src/layout.html` (`FLAMINGO_FONTS`) and its page colour in the `theme-color` map there. Self-hosted fonts get a `@font-face` block in the new part instead.
3. Its name in the three theme lists (`THEMES` in `build.js` and `src/assets/js/site.js`, `ok` in `src/layout.html`), plus `SPLIT_HERO` / `THEME_COLORS` in `site.js` if it uses the split photo hero.
4. A menu item in `src/partials/theme-switch.html` under a "Collection Two" heading.
5. Theme-specific photo picks through the existing `{{img:slug|<theme>=…}}` helper.
6. Its row in the QA scripts' theme lists.

Steps 2 to 4 are list extensions inside locked files. That is the one sanctioned kind of edit: append-only, verified by re-running the Collection One QA sheet, then `node tools/check-lock.js --update` with the change called out in the commit message.

## Round 2 edits to locked files (sanctioned list extensions)

Collection Two touched five locked files, append-only, and the Collection One regression and contrast audit were re-run before the lock was updated:

- `build.js`, `src/assets/js/site.js`, `src/layout.html`: the five new names added to the theme lists, their fonts and page colours added to the bootstrap maps, `SPLIT_HERO` / `THEME_COLORS` extended.
- `src/partials/theme-switch.html`: "Collection One" / "Collection Two" headings and the five new entries.
- `src/assets/css/parts/20-layout.css`: the four new split-hero versions added to the existing `:is([data-theme=…])` selector lists (no rule bodies changed).

Everything else in Round 2 is new files: `05-fonts.css`, `25-collection-two.css`, `40-44-theme-*.css`, the content-module partials and `src/assets/fonts/`.

## Round 3 edits to locked files (Blush and the regenerative-only build)

Round 3 touched the same five files again, and the Collection One regression and contrast audit were re-run before the lock was updated:

- `build.js`: `blush` added to `THEMES`; the build now loops over the site variants in `site.config.js` (root plus `dist/regen/`), renders `{{variantSwitch}}` / `{{variantBadge}}` for the design switcher, and renders `{{site.x}}` and conditionals inside front-matter titles and descriptions. Collection One pages build exactly as before at the root.
- `src/assets/js/site.js`, `src/layout.html`: `blush` added to the theme lists, fonts and page-colour maps (and to `MAGNET`).
- `src/partials/theme-switch.html`: the Blush entry and the "Programs" group.
- `src/assets/css/parts/20-layout.css`: `blush` added to the split-hero selector lists (no rule bodies changed).

New files: `45-theme-blush.css`. `site.config.js` (not locked) became a factory so each variant gets its own module set.

## Round 4 edits to locked files (Collection Three, new default)

List extensions only, re-verified with the Collection One regression before the lock was updated:

- `build.js`, `src/assets/js/site.js`, `src/layout.html`: the five Collection Three names added to the theme lists, fonts and page-colour maps, `SPLIT_HERO` and `MAGNET`.
- `src/layout.html`, `src/assets/js/site.js`, `src/partials/theme-switch.html`: the default version is now `ecosystem` (the `<html data-theme>` attribute, the bootstrap fallbacks, the no-script font link, the switcher's default swatch and label). Collection One still renders identically when selected or when a stored preference points at it.
- `src/partials/theme-switch.html`: the "Collection Three" group, listed first.
- `src/assets/css/parts/20-layout.css`: the five names added to the split-hero selector lists (no rule bodies changed).

New files: `55-collection-three.css`, `60-64-theme-*.css`, `src/partials/short-version.html` (rendered on the home page by every version).

## Round 5 edits to locked files (scorecard feedback and the showcase link)

- `build.js`: the `{{#if collection:x}}` condition, hidden variants left out of the Programs list, `noindex` and `Disallow: /` while `site.indexable` is false, and a placeholder count after every build.
- `src/partials/theme-switch.html`: the collection groups wrapped in `{{#if collection:…}}` so the `/three/` build lists only Collection Three and the partner entries.

New files: `26-trust.css`, `src/partials/reviews.html`, `journal.html` and six `journal-*.html` articles. The header partial (not locked) gained the tap-to-call link.

## Round 6 edits to locked files (the patient path)

- `build.js`: generated pages from `src/templates/*.html` (one referral page per entry in `site.referrers`), the `sample` condition for the dressed demo variant, brand overrides passed to the config factory, and the patient-words summary after every build. Regular pages build exactly as before.

New files: `27-patient.css`, `src/templates/referral.html`, `src/partials/where-it-hurts.html`, `src/partials/cost-line.html`, the six condition pages, `tools/patient-words.js`, `docs/PATIENT-WORDS.md`, `docs/PATIENT-TEST-KIT.md`.

## Round 7 edits to locked files (a calmer header)

- `build.js`: one line after the variant's config is made: `site.brandClass` is `brand--long` when the practice name is longer than eighteen characters, so phones can drop the logo mark and give the name the room (`27-patient.css`). Nothing else in the build changed.

The nav itself lives in `site.config.js` (not locked): four items now, "Where it hurts", "Treatments", "About", "Contact", with NAD+, hormones, peptides and "How care works" inside Treatments and the journal and provider pages inside About.

## Round 8 edits to locked files (booking, ready for GoHighLevel)

- `build.js`: the `booking:` condition, `{{bookingEmbed}}` (the calendar iframe, a custom snippet, or the honest placeholder) and `{{headScript}}`, rendered right after partial includes so icons inside them still resolve. Regular pages build exactly as before.
- `src/layout.html`: `{{headScript}}` on the line before `</head>`; empty unless `site.booking.headScript` is set.
- `src/assets/js/site.js`: demo forms with `data-thanks` redirect to the thank-you page instead of showing the inline notice; forms without it behave as before.

New files: `src/pages/book.html`, `src/pages/thank-you.html`, `src/partials/form-patient.html`, `28-booking.css`, `docs/prompts/booking-ghl.md`.

## Round 9 edits to locked files (sharper photos on high-density screens)

- `build.js`: `XL_PHOTOS` (the slugs that have a `<slug>-2880.webp`), `PHOTO_SET` adds that file to the `srcset` when it exists, and `PHOTO_SET_SCRIPT` defines `window.FLAMINGO_SET(dir, slug)` in the head of every page so the scripts build the same `srcset`. Photos without a 2880 file render exactly as before.
- `src/layout.html`: the end-of-body photo swap calls `window.FLAMINGO_SET` instead of spelling the three widths out.
- `src/assets/js/site.js`: the version switch and the tiles panel call `window.FLAMINGO_SET`; `TALL_HERO` makes the switch declare a full-width hero for the five Collection Three versions, matching what the page already declares on first load.

Not locked, same round: twenty-seven `-2880` renditions from the licensed masters, the product renders re-cut without their baked shadow (`vial-*-2-*`), focal points on fifteen Collection Three heroes, and `sizes` corrected on twelve tall photo slots.

## Round 9a edit to a locked file (menu fix)

- `build.js`: the header menu filters its child links by module, the way the top-level items and the footer already do. Since the menu was cut to four items, "Hormones" and "Peptide programs" sat inside Treatments with a `module` key that was not being read, so they were listed, and led to a page-not-found, while those modules were off.
## Round 10 edits to locked files (Dr. Demo and the assistant)

All of it is switched per variant and off in an ordinary build. The ordinary builds were compared page by page before and after: the only difference in their HTML is the menu fix of Round 9a.

- `build.js`: per-variant switches set on the site object (`fixedTheme`, `noSwitcher`, `guide`, `assistant`, `sampleNote`); the `site:` condition; front matter `only:` and `unless:` to build a page for some variants only; the hooks into `tools/site-guide.js` (section ids after a page is rendered, the knowledge pack after a variant is built); `{{assistantEmbed}}`, put in after every template pass so a vendor's snippet is never read as a template tag; `noindex` without `nofollow`, a robots.txt `Allow` line and sitemap for guide builds; a sample calendar in the booking slot of a sample practice; the assistant's two modes (`assistantWidget`, `assistantPanel`); a robots.txt `Disallow` for the assistant-free page copies (`view-…`); defaults for the fields the referral template reads (`shortStart`, `stampHtml`, `alt`), so a list of referrers written before them still builds; the guide script minified like the site's own.
- `src/layout.html`: the theme bootstrap honours a variant's fixed design version (it ignores the remembered choice; `?theme=` still previews another); the design switcher is left out where `noSwitcher` is set; the guide script is loaded on a guide build; the assistant partial is included where a variant has one.
- `src/assets/js/site.js`: with a fixed design version nothing is remembered and links stay clean; the form's thank-you redirect and the second tap on a treatment tile (phones) go through `SiteGuide.visit` when the guide is present; the buyer layer (`?partner=1`, typing "partner") is off on a guide build.

New files: `tools/site-guide.js`, `src/guide/` (runtime, brief, notes), `src/partials/assistant.html`, `src/pages/site-guide.html`, `29-guide.css`, `docs/AVA-DR-DEMO.md`.

## Round 11 edits to locked files (dark versions of Collection Three)

Each Collection Three look gains a dark version in the Got Stem Cells palette. A dark version is the look plus a tone (`<html data-theme="ivory" data-tone="night">`, chosen as `ivory-night`), so no look was renamed or added and every existing rule, photo and font carries over. Collection One renders exactly as before.

- `src/layout.html`: the bootstrap accepts `<look>-night` for the five Collection Three looks (from `?theme=`, the remembered choice, or a variant's fixed look), sets `data-tone="night"` beside `data-theme`, and uses the dark page colour for the browser's theme colour.
- `src/assets/js/site.js`: `setTheme` does the same when a look is chosen from the menu, remembers and carries the full name (`ivory-night`) on links, and clears the tone when a light look is chosen.
- `src/partials/theme-switch.html`: a "Collection Three · Dark" group with the five dark versions (shown where a build lists the `night` collection).

New files: `src/assets/css/parts/70-collection-three-night.css`. New link: `/dark/` (`variants.dark`).

## Round 12 edits to locked files (pictures for the dark versions)

The dark versions were showing the light looks' pictures, including two cell illustrations on a pure white ground that sat on the dark pages as white slabs. A picture can now name the photo it shows in a dark version, and the build and the page scripts read that choice. Collection One renders as before, with one exception noted below.

- `build.js`: `{{img:…}}` accepts `night=<photo>` (every dark version) and `<look>-night=<photo>` (one of them), written as `data-img-night` and `data-img-<look>-night`. The page head gains `window.FLAMINGO_PICK(img, look)`, the one place that decides which photo a picture shows; the hero preload and the inline script after an eager picture use the same order (the look's dark choice, the shared dark choice, the look's own choice, the default).
- `src/layout.html`: the script that points lazy pictures at the look's photo before they load asks `FLAMINGO_PICK`.
- `src/assets/js/site.js`: `applyThemeImages` asks `FLAMINGO_PICK`, so changing between a look and its dark version swaps the pictures as well as the colours.

One picture was retired in every look, Collection One included: `certificates-check` (certificates under a magnifying glass) carried garbled lettering. Its five uses now show `notebook-desk` (the "reading claims" article and its two cards), `clinician-home-visit` (the partner page) and `np-patient-consult` (the "why we are different" hero). Checked: the eleven older looks show the same photo as before in every other spot (1,265 pictures compared across 33 pages).

## Round 13 edits to locked files (focal points for the dark versions; the service panel on a look switch)

A second independent look at the dark versions found pictures whose subject fell out of frame once the dark photo replaced the light one, and a service panel that showed the first row's photo after a look switch. Collection One renders as before, with the template changes noted below.

- `build.js`: `{{img:…}}` accepts `pos-night=<focal point>` (every dark version) and `pos-<look>-night=<focal point>` (one of them), written as `data-pos-night` and `data-pos-<look>-night`. The page head gains `window.FLAMINGO_POS(img, look)`, which reads them in the same order as `FLAMINGO_PICK` reads photos; the inline script after an eager picture uses it.
- `src/layout.html`: the script that points lazy pictures at the look's photo asks `FLAMINGO_POS` for the focal point.
- `src/assets/js/site.js`: `applyThemeImages` asks `FLAMINGO_POS`, and leaves the service panel's photo (`.tiles__img`) alone, because that photo follows the active service row, not the look.

Template changes that reach every look, Collection One included (none of them in a locked file):

- Size hints. Card pictures said they were half the screen wide on phones, where the cards are one full-width column, so phones loaded a file too small and stretched it. They now say `100vw` under 640px. Pictures in tall frames (the home pillars, the 4:5 frames, photo cards) state the width their crop really needs on a phone. Layout is unchanged; phones load a larger file where the old one went soft.
- `np-patient-consult` is now `np-patient-consult-2`: the wall screen in that photo showed a readable (invented) patient name and diagnosis, and the report panel is softened so nothing can be read. New file name because `/assets/` is cached for a year.
- The NAD page showed the same vial three times. The "Injection vs sublingual" block now shows the laptop-and-stethoscope photo; the vial stays in the hero and the first program card.
- Product pictures in page heroes said `1px` wide on phones; they say `200px` (`140px` for the second vial on the peptides page), so a 3x phone loads the sharper file.

## Restoring Collection One exactly

```
git checkout collection-one-locked        # inspect
git checkout -b hotfix collection-one-locked
```

Or deploy the frozen build URL above; it never changes.
