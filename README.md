# Flamingo

A white-label website for a concierge regenerative medicine and longevity practice, built as a plain static site with **three switchable design versions**. All brand assets, company details, team members, testimonials, pricing, and legal copy are **placeholders** until the client provides them.

| Version | Look | Fonts |
| --- | --- | --- |
| `dark` (default) | "Lab noir": near-black green, mint and amber accents, film-grain overlay, animated cell illustrations | Sora + DM Sans + DM Mono |
| `light` | "Clinical editorial": warm paper, ink rules, forest green and ochre, serif headlines | Newsreader + Inter + DM Mono |
| `playful` | Warm cream, coral, mango, teal, blob shapes, stickers | Fraunces + Nunito |

Switch versions with the floating **Design** control (bottom right) or by adding `?theme=dark`, `?theme=light` or `?theme=playful` to any URL. The choice is remembered in the browser.

## Pages

Home · Services · Stem Cell Therapy · Wharton's Jelly · Why Exosomes · Concierge Care Model · Hormones · Peptides · NAD+ · For Providers · About · Founder · Why We're Different · Testimonials · Contact · Financing · Privacy · Terms · Disclaimer · 404

## Run it locally

No dependencies to install. You need Node 18 or newer.

```bash
node build.js            # builds src/ into dist/
node build.js --serve    # builds, watches for changes, serves at http://localhost:3000
```

## Swap in the client's details

Everything that is waiting on the client is marked in one of three ways:

1. **`site.config.js`** holds the brand name, tagline, phone, email, address, hours, social links, navigation and footer links. Edit once; every page picks it up on the next build.
2. **Placeholder blocks** (`.ph`, dashed outline with a label like "Client image") mark every image, logo, headshot and video slot. Replace the block with an `<img>` or `<video>` tag.
3. **"Client to provide" tags** and `[bracketed]` text mark copy that must be supplied: founder bio, team names and roles, testimonials, stats (`XX+`), accreditations, financing partner, and legal pages.

The logo is a generic SVG mark in `src/partials/logo.html`. Replace it with the client's logo (both the header and footer use the same partial). The favicon, Apple touch icon and social share image live in `src/assets/img/` and are generic placeholders too.

### Content rules

- **Testimonials:** every quote on the site is a labelled placeholder. Publish only verified reviews with written patient consent.
- **Clinician names and credentials:** placeholders only. Add real names, licensure and portraits once provided.
- **Numbers:** every statistic is `XX+` until the client supplies verified figures.
- **Legal pages:** generic templates with a "Template legal copy" notice. Have counsel review before launch.
- **Pricing:** program cards say "Pricing on consultation". Add prices only once the client confirms the catalog.

### Contact form

The contact page uses a native HTML form (`form[data-demo-form]`). It is **not connected** to anything yet: submitting shows a notice instead of posting. Point it at the client's CRM, form service or email handler before launch (`src/assets/js/site.js`, "demo contact forms" section).

## Edit it

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | One file per page. Front matter at the top (`title`, `description`, `nav`), then the page body. |
| `src/layout.html` | The shared HTML shell (head, fonts, header, footer, scripts). |
| `src/partials/*.html` | Reusable blocks: header, footer, logo, CTA band, disclaimers, icon sprite, theme switcher, inline SVG illustrations (`art-*.html`), image placeholder. |
| `src/assets/css/site.css` | All styling. Theme tokens are at the top; per-theme overrides are at the bottom. |
| `src/assets/js/site.js` | Navigation, theme switching, tabs, tiles, reveal-on-scroll, demo form handling. No frameworks. |
| `src/assets/img` | Generic favicon, touch icon and share image. |
| `site.config.js` | Site-wide values: brand name, contact details, booking link, navigation and footer links. |

Template helpers available inside pages and partials:

- `{{> name}}` includes `src/partials/name.html`
- `{{icon:name}}` inlines an SVG icon from `src/partials/icons.html`
- `{{site.key}}` reads from `site.config.js` (for example `{{site.phone}}`, `{{site.bookUrl}}`)
- `{{page.title}}` reads the page's front matter

Rebuild after editing (`node build.js`); with `--serve` or `--watch` it rebuilds automatically.

## Deploy

`vercel.json` tells Vercel to run `node build.js` and serve `dist/`. Every push to `main` deploys automatically once the repo is linked to a Vercel project. Update `url` in `site.config.js` when the client's domain is attached so the sitemap and robots file point at it.

## Notes

- There is no analytics, cookie banner or tracking on this site yet.
- Product vials and the hero illustrations are inline SVG (`src/partials/icons.html` `#i-vial`, `src/partials/art-*.html`) and recolor automatically per theme.
