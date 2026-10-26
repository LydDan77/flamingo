# Flamingo

A white-label website for a concierge regenerative medicine and longevity practice, built as a plain static site with **five switchable design versions**. Brand details, team members, testimonials, pricing, and legal copy are **placeholders** until the client provides them. Photography is licensed stock supplied by the client, processed into responsive WebP.

| Version | Look | Fonts |
| --- | --- | --- |
| `dark` (default) | Biohacker / athlete: near-black, acid lime and signal orange, HUD corner brackets, film grain, cinematic full-bleed photo heroes | Space Grotesk + Inter + JetBrains Mono |
| `light` | Clean and clinical: white, cool grays, teal-blue accents, hairline rules, graph-paper hero, split photo heroes | Manrope + Inter + DM Mono |
| `warm` | Warm and easy to read, for older adults: cream, terracotta and deep teal, 18px base type, larger buttons, calmer motion | Lora + Atkinson Hyperlegible |
| `bright` | Bold and eccentric, not goofy: white with violet, coral, citrus and aqua, marker highlights, hard offset shadows | Bricolage Grotesque + DM Sans + DM Mono |
| `elite` | Premium: warm black, champagne gold, serif numerals, wide-tracked labels, vignetted photography | Cormorant Garamond + Jost + DM Mono |

Switch versions with the floating **Design** control (bottom right; a compact menu that works on phones) or by adding `?theme=dark|light|warm|bright|elite` to any URL. The choice is remembered in the browser. Photos swap per version (for example the home hero shows a sprinter in `dark`, a nurse practitioner with a patient in `light`, a couple on an autumn hike in `warm`).

## Pages

Home · Services · Stem Cell Therapy · Wharton's Jelly · Why Exosomes · Concierge Care Model · NAD+ · For Providers · About · Founder · Why We're Different · Testimonials · Contact · Financing · Privacy · Terms · Disclaimer · 404

Optional (hidden by default): Hormones · Peptides. See **Optional modules** below.

## Run it locally

No dependencies to install. You need Node 18 or newer.

```bash
node build.js            # builds src/ into dist/ (CSS and JS minified)
node build.js --serve    # builds, watches for changes, serves at http://localhost:3000
```

## Optional modules (Hormones, Peptides)

The hormone and peptide pages are fully built but switched off. To publish one, open `site.config.js` and flip the flag:

```js
const modules = {
  hormones: false, // → true publishes hormones.html
  peptides: false, // → true publishes peptides.html
};
```

Rebuild, and everything appears at once: the page itself, its navigation and footer links, the service cards and tiles on Home and Services, the contact form options, the financing coverage list, the sitemap entry, and every sentence that lists the programs. While a module is off, none of that exists in the built site, so nothing points at a missing page.

Under the hood: pages carry `module: hormones` in their front matter, nav and footer links carry `module: "..."`, and templates wrap optional content in `{{#if module:peptides}} … {{/if}}`, `{{#unless module:hormones}} … {{/unless}}` or `{{#if any:hormones,peptides}} … {{/if}}`. Shared copy fragments such as `{{site.programsPhrase}}` change wording automatically.

## Partner overview and partner view

Program partners (buyers) have two things ordinary visitors never see:

- **`partner-overview.html`**: the buyer overview and the technology / marketing stack (offer, purchase scope, the eight platform components, what this site runs on, marketing funnel, optional modules, an illustrative planning tool, launch readiness). It carries `noindex, nofollow`, is left out of the sitemap, and is not linked from any public page. Share it by URL only. Figures live in `site.config.js` under `partner`.
- **Partner view**: open any page with `?partner=1` and the site gains a "Partner view" pill in the header, numbered pins on the home-page sections that map to the stack, and a bottom bar linking to the overview. It is remembered for the browser session only, follows internal links, and `Hide` (or `?partner=0`) switches it off. Without the link nothing partner-related is rendered or present in the HTML.

## Swap in the client's details

Everything that is waiting on the client is marked in one of three ways:

1. **`site.config.js`** holds the brand name, tagline, phone, email, address, hours, social links, navigation and footer links. Edit once; every page picks it up on the next build.
2. **Stand-in photos** are licensed stock. Replace a photo by dropping new files into `src/assets/img/photos/` named `<slug>-800.webp`, `<slug>-1200.webp`, `<slug>-1920.webp` (and `<slug>-portrait.webp` for portrait slots), then reference the slug in the page.
3. **"Client to provide" tags** and `[bracketed]` text mark copy that must be supplied: founder bio, team names and roles, testimonials, stats (`XX+`), accreditations, financing partner, and legal pages.

The logo is a generic SVG mark in `src/partials/logo.html`. Replace it with the client's logo (both the header and footer use the same partial). The favicon, Apple touch icon and social share image live in `src/assets/img/` and are generic placeholders too.

### Content rules

- **Testimonials:** every quote on the site is a labelled placeholder. Publish only verified reviews with written patient consent.
- **Clinician names and credentials:** placeholders only. The portraits are stock stand-ins; add real names, licensure and headshots once provided.
- **Photography:** the stock set deliberately avoids hospital, imaging and lab imagery that could imply diagnostic or in-house laboratory services the practice does not offer.
- **Numbers:** every statistic is `XX+` until the client supplies verified figures.
- **Legal pages:** generic templates with a "Template legal copy" notice. Have counsel review before launch.
- **Pricing:** program cards say "Pricing on consultation". Add prices only once the client confirms the catalog.

### Compliance notes

- **California stem cell notice.** `notices.californiaStemCell` in `site.config.js` (on by default) prints the statutory notice required by Cal. Health & Safety Code § 24185 on the regenerative therapy pages and the disclaimer page. Switch it off for practices outside California; counsel confirms applicability either way. The same notice must be posted in the clinic.
- **Claims.** Service copy describes what therapies are *studied for* and *aimed at*; it does not promise relief, repair or cures. Keep it that way when editing: no "treats", "cures", "heals", "restores", "guaranteed", "proven" or "#1".
- **Testimonials.** Every slot carries an "individual experience, results vary" line. Publish only verified reviews with written consent; material connections (discounts, free services) must be disclosed next to the quote.
- **Forms.** The consent checkbox carries TCPA language (frequency, rates, Reply STOP, privacy link). Keep it when connecting the form to a CRM.
- **Footer.** FDA, off-label, telehealth and compounding statements appear on every page; the disclaimer, privacy and terms pages are templates for counsel.

### Contact form

The contact page uses a native HTML form (`form[data-demo-form]`). It is **not connected** to anything yet: submitting shows a notice instead of posting. Point it at the client's CRM, form service or email handler before launch (`src/assets/js/site.js`, "demo contact forms" section).

## Edit it

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | One file per page. Front matter at the top (`title`, `description`, `nav`, optional `module`), then the page body. |
| `src/layout.html` | The shared HTML shell: head, theme bootstrap (design version, that version's fonts, hero photo preload), header, footer, scripts. |
| `src/partials/*.html` | Reusable blocks: header, footer, logo, CTA band, disclaimers, icon sprite, design switcher, financing nudge, inline SVG illustrations (`art-*.html`). |
| `src/assets/css/parts/*.css` | The stylesheet in ordered parts: `00` tokens and base, `10` components, `20` layout (header, hero, footer, floating controls), then one part per design version (`30` dark … `34` elite). `build.js` concatenates and minifies them into `dist/assets/css/site.css`. |
| `src/assets/js/site.js` | Design switcher, theme-specific photo swaps, navigation, tabs, tiles, reveal and stagger, parallax, count-up, financing nudge, demo form handling. No frameworks. |
| `src/assets/img/photos` | Responsive WebP photos (800 / 1200 / 1920 widths, plus 4:5 portrait crops). |
| `src/assets/img/products` | Transparent product renders (vials, droppers) as WebP at 400 / 800 widths, placed with `{{img:vial-nad|product|alt=…}}`. Labels currently carry the Regenerative Revival mark and formulation strengths; re-render for a new client. |
| `site.config.js` | Site-wide values: modules, brand name, contact details, booking link, navigation and footer links. |

Template helpers available inside pages and partials:

- `{{> name}}` includes `src/partials/name.html`
- `{{icon:name}}` inlines an SVG icon from `src/partials/icons.html` (`{{icon:name extra-class}}` adds a class)
- `{{img:slug|alt=…|sizes=…|pos=center 30%|dark=other-slug|warm=…|pos-dark=…|portrait|eager}}` renders a responsive photo with optional per-version swaps and focal points. `eager` marks the above-the-fold photo: it is preloaded from the `<head>` for the active version only and never downloads the other versions' photos.
- `{{site.key}}` reads from `site.config.js` (for example `{{site.phone}}`, `{{site.bookUrl}}`)
- `{{page.title}}` reads the page's front matter
- `{{#if module:x}} … {{/if}}` / `{{#unless …}}` / `{{#if any:x,y}}` conditional blocks

Motion helpers: `.reveal` (fade-up on scroll), `.reveal--stagger` (children in sequence), `.reveal--left` / `.reveal--right` (vertical on phones), `[data-parallax="0.1"]` (full-bleed heroes, desktop only), `.steps--line` (progress line draws across), `.timeline`, `.bars` + `[data-bar]` (animated comparison bars), `.chart` + `[data-draw]` (line chart draws on scroll), `.ticker`, `[data-count="12"]` (count-up numbers), `[data-tilt]` (pointer tilt).

Hero layouts: `.hero--image` is a cinematic full-bleed photo with a scrim in `dark` and `elite`, and becomes a split layout (headline left, photo panel bleeding off the right edge, stacked on phones) in `light`, `warm` and `bright`. `.hero--simple` pages (NAD+, Hormones, Peptides) use floating product vials; `.hero--center` and `.hero--plain` are for contact and legal pages.

Rebuild after editing (`node build.js`); with `--serve` or `--watch` it rebuilds automatically.

## Performance

- Only the active design version's web fonts are loaded (two or three families instead of eleven).
- The hero photo of the active version is preloaded from the `<head>` with `fetchpriority="high"`; every other photo is lazy-loaded and sized with `srcset`/`sizes` (half-width panels fetch the 800/1200 variants, not the 1920).
- CSS and JS are minified at build time and written with a content hash in the file name (`site.<hash>.css`), so Vercel can serve everything under `/assets/` with long-lived immutable caching while every new build is picked up immediately.
- Film grain, parallax and blur effects are skipped on phones; reduced-motion preferences disable all motion.
- The motion layer is CSS-driven: the only per-frame JavaScript is the cursor ring's easing, and it runs only while the pointer moves. Everything animates `transform`, `opacity` or `filter`.

## Motion and cursor

`src/assets/css/parts/15-motion.css` holds the shared plumbing; each version gives it a different character in its own file:

| Version | Cursor | Signature motion |
| --- | --- | --- |
| Dark | Lime dot with a dashed targeting ring that spins over anything clickable (replaces the native pointer) | Aurora glow behind headlines, a light sweep across photo heroes, a lime spotlight that follows the pointer inside cards, glowing duotone icons, blur-to-sharp reveals |
| Light | Thin blue ring trailing the native pointer | Soft orbs drifting behind the hero, rolling waves between sections, an accent line that draws across a card on hover |
| Warm | Soft peach pool trailing the native pointer | Blob-shaped icon tiles that morph on hover, a breathing blob behind the hero, deep waves between sections, paper grain. Slower and gentler for older readers. |
| Bright | Coral blob that inverts whatever it crosses (replaces the native pointer) | Highlighter sweep across the headline on load, zigzag section edges, sticker icons that wobble, a slow sunburst behind the hero |
| Elite | Fine gold ring and dot (replaces the native pointer) | Gold shimmer through highlighted words, hairlines that draw themselves in, film grain and a soft vignette, a warm spotlight inside cards |

Shared across versions: a scroll-progress line under the header, buttons that lean toward the pointer (dark, elite, light), a gloss sweep on primary buttons, image unveils when a section scrolls into view, and page-to-page transitions through the View Transitions API (Chrome 126+, Safari 18.2+; other browsers simply navigate).

The custom cursor appears only with a mouse (`hover: hover` and `pointer: fine`), never on touch screens, and form fields always keep the native pointer. `prefers-reduced-motion: reduce` switches the whole layer off.

## Accessibility

Every text/background pair in every version meets WCAG 2.1 AA contrast (4.5:1 for body text, 3:1 for large text), checked with a headless-browser audit across the main pages; no text is set below 12px. Keyboard focus is visible in all versions, the design switcher and FAQ are keyboard operable, and all motion honours `prefers-reduced-motion`.

## Deploy

`vercel.json` tells Vercel to run `node build.js` and serve `dist/`. Every push to `main` deploys automatically once the repo is linked to a Vercel project. Update `url` in `site.config.js` when the client's domain is attached so the sitemap and robots file point at it.

## Notes

- There is no analytics, cookie banner or tracking on this site yet.
- Icons are Phosphor Icons 2.1 (MIT licence) inlined as an SVG sprite in `src/partials/icons.html`: feature icons use the duotone weight (the back layer carries class `d`, tinted per version through `--duo` / `--duo-fill`), small UI glyphs use the regular and bold weights, and stars, play and the social marks are filled. The product vial is a custom symbol in the same file. The sprite is generated by `tools/build-icons.js` from the `@phosphor-icons/core` package (usage at the top of the script); add a name to its map to add an icon.
- Product vials and the orbit illustrations are inline SVG (`src/partials/icons.html` `#i-vial`, `src/partials/art-*.html`) and recolor automatically per version.
