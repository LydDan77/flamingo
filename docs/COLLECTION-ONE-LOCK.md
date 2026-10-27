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

## Restoring Collection One exactly

```
git checkout collection-one-locked        # inspect
git checkout -b hotfix collection-one-locked
```

Or deploy the frozen build URL above; it never changes.
