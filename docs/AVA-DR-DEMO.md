# Dr. Demo and Ava

Dr. Demo is the example website a practice owner explores before their own site carries their name. Ava, the talking guide, lives on it: she answers questions and takes people around. This page is the handover for whoever connects Ava (Joe), and the reference for whoever maintains the site.

Live address once deployed: `https://flamingo-regenerative-revival.vercel.app/dr-demo/`

## What Dr. Demo is

- A complete build of the site at `dist/dr-demo/`, defined as `variants.drdemo` in `site.config.js`.
- One design look, Ecosystem, with no design switcher. Change `theme` in the variant to `onyx`, `sandstone`, `meridian` or `ivory` for another. `?theme=<name>` still previews any of them.
- A fictional practice, "Dr. Demo Regenerative Care". Every name, number, price, review and story is a sample and is stamped SAMPLE on the page. The build fails if anything unfinished (a bracket placeholder, a dummy figure, a developer note, a "free" consultation) is visible on Dr. Demo.
- Crawlable on purpose, but out of search: pages carry `noindex`, `robots.txt` allows `/dr-demo/`, and `/dr-demo/sitemap.xml` lists every page.
- The program's own buyer overview is left out of this build.

## Connecting Ava (three steps)

1. **Put her on the page.** Paste Ava's embed snippet into `assistant.embedHtml` of `variants.drdemo` in `site.config.js`, or set the environment variable `AVA_EMBED_HTML` on the Vercel project and redeploy. A part that must sit in the head goes in `AVA_HEAD_HTML`. The snippet is inserted untouched at the end of the body of every Dr. Demo page. Any shape works: a script tag, a custom element with a script, or an iframe. Until a snippet is set, a labelled placeholder ("Ask Ava · not connected yet") holds her corner.
   - Only public ids and public keys belong in a snippet. Never an API key.
   - If the snippet is an iframe it needs `allow="microphone"` (and `camera` only if she uses it).
   - If her platform has a domain allow-list, add `flamingo-regenerative-revival.vercel.app` (and the practice's own domain later).
2. **Give her the brief.** Paste `guide/brief.md` in as her instructions (or `guide/brief-short.txt` if the box is small). The rules in it are not optional: no medical advice, no promised results, the not-FDA-approved wording, never "free", every Dr. Demo detail is a sample.
3. **Give her the knowledge**, by whichever route her platform takes:

| Her platform takes | Give it |
| --- | --- |
| A website address to crawl | `https://…/dr-demo/` (the sitemap lists every page), and the owner's guide page `https://…/dr-demo/site-guide` |
| One uploaded document | `guide/knowledge.txt` (the short form, about 40 to 60 thousand characters). `guide/knowledge.md` is every word on every page |
| A few small files | `guide/topics/*.md` (each has a `.txt` twin) |
| Question and answer rows | `guide/questions.csv` (her own voice), `guide/questions-simple.csv` (two columns), `guide/questions-on-site.csv` (the site's own patient answers, to quote word for word) |
| Structured data | `guide/knowledge.json`, `guide/site-map.json`, `guide/facts.json`, `guide/checklist.json`, `guide/tours.json`, `guide/guardrails.json` |
| Tools she can run in the browser | `guide/tools.json` (see below) |

Everything in `guide/` is rebuilt from the site on every build, so it cannot fall behind the pages. `guide/manifest.json` lists every file with its size and checksum; re-ingest when it changes. The files are served with open CORS headers and are never cached.

## What Ava can do on the page

Every Dr. Demo page loads `guide/guide.js`, which defines `window.SiteGuide`. `guide/tools.json` describes the same functions as tool definitions (name, description, JSON Schema parameters) to register as client-side tools.

| Tool | Runs | What happens |
| --- | --- | --- |
| `go_to` | `SiteGuide.go("knees#cost")` | Goes to a page and section, scrolls to it and highlights it |
| `show_section` | `SiteGuide.show("cost")` | Highlights a section, a marked spot or a question on the page in view (a question opens) |
| `where_am_i` | `SiteGuide.where()` | The page and section in view, and whether it is a phone layout |
| `find_on_site` | `SiteGuide.find("price")` | The best places for a word or a question |
| `point_at` | `SiteGuide.point("menu:Where it hurts > Knees")` | Highlights a menu item, the booking button, the phone number or the practice name |
| `read_section` | `SiteGuide.read("knees#cost")` | The words of a section, to quote exactly |
| `show_samples` | `SiteGuide.samples(true)` | Outlines every sample detail on the page; returns how many |
| `start_tour` | `SiteGuide.tour("patient-path")` | The steps of a walk-through: a line to say and a place to show |
| `show_look` | `SiteGuide.look("sandstone")` | Shows the page in another of the five looks |
| `go_back` | `SiteGuide.back()` | Back to the previous view |
| `list_pages` | `SiteGuide.pages()` | Every page with how to reach it |

- Targets are checked against the site's own page list. Nothing here can send a visitor off the site.
- If Ava runs inside an iframe she can post `{ type: "site-guide", action: "go", target: "knees#cost", id: 1 }` to the parent page and receives `{ type: "site-guide:result", id: 1, result }`.
- If her platform cannot run tools at all, she still guides in words: every page in the knowledge has a "reach" ("the menu at the top: choose Where it hurts, then Knees"), and every section has a ready link (`…/knees?show=cost#cost`) that opens the page at that spot and highlights it.
- The page tells her where the visitor is: `<body data-guide-page="knees">`, a JSON block with id `site-guide-page`, and the events `siteguide:ready` and `siteguide:page`.
- Say the sentence first, then act, then say what is now on screen. Only claim to have shown something after the tool returns `ok: true`.

## She stays on screen while the pages change

A talking assistant is cut off when the page she lives on reloads. So on Dr. Demo a move to another page does not reload: the script shows the assistant-free copy of the target page (`view-<page>.html`) in a frame that fills the window, and keeps the address bar and the Back button in step. Ava's page never unloads, so she keeps talking. This covers her own `go_to`, the visitor's clicks on menu items and links, and the form's thank-you redirect. A reload, or a link opened in a new tab, lands on the ordinary page and starts her afresh.

To switch this off, set `keepAlive: false` in the variant's `assistant` block.

## Testing her

`guide/tests.json` (also `tests.csv`) holds the questions to try before any owner gets the link: what she should say, what she must never say, and where the page should end up. Ask them out loud on a phone as well as typing on a laptop.

## Where the knowledge comes from

- The pages themselves, read after every build by `tools/site-guide.js`.
- Hand-written notes in `src/guide/`: one file per page in `pages/`, the cross-site parts in `parts/`, her brief in `brief.md` and `brief-short.txt`. Facts such as the phone number and prices are never typed into the notes; they are written as `{{site.phone}}` and filled from `site.config.js`.
- The build stops, naming the file, when a note points at a page or section that does not exist, when a spoken answer breaks a rule (too long, a web address, the word "free", a claim word), or when a section id she may have learned disappears. Section ids are pinned in `src/guide/anchors.json`; to rename one on purpose, list it under `moved` and rebuild with `GUIDE_ANCHORS=update`.

## What nobody has told Ava yet

`src/guide/parts/unknowns.json` lists the questions owners will ask that nothing on the site answers (support, timelines, what the package includes, where form messages go, and so on). For each, Ava says plainly that she does not have it and who to ask. Each entry names who can supply the answer and exactly what is missing. Fill them in there and rebuild.

## Using this for a real practice

The same switches work for any variant: `guide: true` writes the knowledge pack for that practice's site from its own config, and `assistant: { … }` gives it the corner. Section ids do not contain the practice's name, so they are the same on every practice's site.
