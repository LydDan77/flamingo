# Flamingo

A standalone redesign of the [Regenerative Revival](https://regenerativerevival.com) website.
Same pages and information as the live site, rebuilt as a plain static site with **three switchable design versions**:

| Version | Look | Fonts |
| --- | --- | --- |
| `dark` (default) | Premium midnight: deep navy, amethyst/lazuli glows, closest to the current site | Poppins |
| `light` | Clean and modern: white, lots of air, one accent colour | Manrope + Inter |
| `playful` | Warm and playful: cream, coral, mango, teal, blob photos, stickers | Fraunces + Nunito |

Switch versions with the floating **Design** control (bottom right) or by adding `?theme=dark`, `?theme=light` or `?theme=playful` to any URL. The choice is remembered in the browser.

## Pages

Home · Services · Stem Cell Therapy · Wharton's Jelly · Why Exosomes · Concierge Care Model · Hormones · Peptides · NAD+ · For Providers · About · Founder · Why We're Different · Testimonials · Contact · Financing · Privacy · Terms · Disclaimer · 404

## Run it locally

No dependencies to install. You need Node 18 or newer.

```bash
node build.js            # builds src/ into dist/
node build.js --serve    # builds, watches for changes, serves at http://localhost:3000
```

You can also just open `dist/index.html` in a browser after a build.

## Edit it

Everything you'd normally touch lives in `src/`:

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | One file per page. Front matter at the top (`title`, `description`, `nav`), then the page body. |
| `src/layout.html` | The shared HTML shell (head, header, footer, scripts). |
| `src/partials/*.html` | Reusable blocks: header, footer, CTA band, disclaimers, icon sprite, theme switcher. |
| `src/assets/css/site.css` | All styling. Theme tokens are at the top; per-theme overrides are at the bottom. |
| `src/assets/js/site.js` | Navigation, theme switching, tabs, reveal-on-scroll, marquee. No frameworks. |
| `src/assets/img`, `src/assets/video` | Compressed images and clips. |
| `site.config.js` | Site-wide values: phone, email, booking link, navigation and footer links. |

Template helpers available inside pages and partials:

- `{{> name}}` includes `src/partials/name.html`
- `{{icon:name}}` inlines an SVG icon from `src/partials/icons.html`
- `{{site.key}}` reads from `site.config.js` (for example `{{site.phone}}`, `{{site.bookUrl}}`)
- `{{page.title}}` reads the page's front matter

Rebuild after editing (`node build.js`); with `--serve` or `--watch` it rebuilds automatically.

## Deploy

`vercel.json` tells Vercel to run `node build.js` and serve `dist/`. Every push to `main` deploys automatically once the repo is linked to a Vercel project.

## Notes on content

- Copy, team, testimonials, pricing and FAQs were ported from the live Regenerative Revival site as of October 2026.
- The contact page embeds the same TyriaCore intake form the live site uses, so leads land in the same place.
- "View & order" buttons on the Peptides and NAD+ pages link to the existing product pages on regenerativerevival.com. The 2-minute quiz link also points at the live site.
- Team headshots that live in the Regenerative Revival Vercel Blob store are hot-linked; the rest are bundled locally.
- There is no analytics, cookie banner or tracking on this site yet.
