# Dr. Demo and Ava

Dr. Demo is the example website a practice owner explores before their own site carries their name. Ava, the talking guide, lives on it: she answers questions and takes people around. This page is the handover for whoever connects Ava (Joe), and the reference for whoever maintains the site.

Address once deployed: `https://flamingo-regenerative-revival.vercel.app/dr-demo/` (`/drdemo` redirects to it).

Who gets which link: `/dr-demo/` is for practice owners. `/demo/` (Northwind) and `/three/` are for colleagues and design review.

## What Dr. Demo is

- A complete build of the site at `dist/dr-demo/`, defined as `variants.drdemo` in `site.config.js`.
- One design look, Ecosystem, with no design switcher. Change `theme` in the variant for another. `?theme=onyx`, `sandstone`, `meridian` or `ivory` previews another look for that visit, which is how "show me another look" works.
- A made-up practice, "Dr. Demo Regenerative Care". Every name, number, price, review and story is a sample and is stamped SAMPLE on the page.
- Regenerative care only: stem cell therapy, Wharton's Jelly and exosomes. The NAD+, hormone and peptide programs are switched off, so their pages are not on this example (`modules` in the variant switches them).
- An owner's guide page, "How this website works" (`/dr-demo/site-guide`), linked from the note at the top of every page and from the footer. It holds in writing everything Ava can explain, for owners who would rather read.
- Crawlable on purpose, but out of search: pages carry `noindex`, `robots.txt` allows `/dr-demo/`, and `/dr-demo/sitemap.xml` lists every page.
- The program's own buyer overview and the design switcher are left out of this build.

## Connecting Ava: three steps

**1. Put her on the page.** Set these on the Vercel project and redeploy. They are read when the site is built.

| Variable | What it is |
| --- | --- |
| `AVA_EMBED_HTML` | Her embed snippet. It is printed untouched as the last thing in the body of every Dr. Demo page. Any shape works: a script tag, a custom element with its script, or an iframe. |
| `AVA_HEAD_HTML` | Only if part of her snippet must sit in the head. A snippet that sits only in the head counts as a live assistant too. |
| `AVA_MODE` | Leave unset when her snippet draws its own launcher. Set `panel` when it does not (a bare iframe): the site then draws the "Ask Ava" button and loads her snippet inside its own panel on the first tap, so nothing of hers loads, and no microphone is asked for, until the owner asks. |
| `AVA_ORIGINS` | Only if she runs in an iframe and talks to the page with messages: the origins allowed to send them, separated by commas (for example `https://app.example.com`). With none listed, a frame placed directly on the page is accepted. |
| `AVA_KEEP_ALIVE` | `0` switches off "she stays on screen while the pages change" (below). Leave unset unless her platform resumes a session by itself after a page load. |
| `GUIDE_STRICT` | `0` turns the checks on spoken answers and unfinished content into warnings, for an emergency. The safety checks always stop the build. |

Rules for the snippet:

- Public widget, agent or deployment ids only. This is page source. No API key, token or secret, ever: the build stops if the snippet looks as if it carries one.
- An iframe needs `allow="microphone"` (and `camera` only if she uses it), and must not be sandboxed without `allow-same-origin`.
- If her platform has a domain allow-list, add the production host, any preview hosts you test on, and later the custom domain.
- Until a snippet is set, a labelled placeholder ("Ask Ava · Not connected yet") holds her corner and offers the same tour by tapping. It never pretends to be her.

**2. Give her the brief.** Paste `guide/brief.md` in as her instructions, or `guide/brief-short.txt` if the box is small. The rules in it are not optional. Knowledge files are only looked up when a question seems to need them; the prompt is the one place in force on every turn. So the rules must be in the prompt, not only in the knowledge.

Set her platform to: no opening and no sound until tapped; no listening until the microphone is tapped; captions of what she says; typing always available; one greeting per visit.

**3. Give her the knowledge**, by whichever route her platform takes. `guide/manifest.json` carries this same table.

| Her platform takes | Give it |
| --- | --- |
| A system prompt or persona box | `guide/brief.md`, or `guide/brief-short.txt` (under 1,500 characters) |
| Pasted text, or an upload with a size limit | `guide/knowledge.txt`: the short form, about 60 thousand characters |
| One upload, no tight limit | `guide/knowledge-all.txt`: the complete form, every owner question included |
| One web address | `guide/knowledge.html`: the complete form as one page |
| Several small files | `guide/topics/*.txt` (each has a `.md` twin) |
| Question and answer rows | `guide/questions.csv` (her own voice), `guide/questions-simple.csv` (two columns) |
| A website to crawl | `https://…/dr-demo/` with `https://…/dr-demo/sitemap.xml` |
| Structured data | `guide/knowledge.json`, `guide/site-map.json`, `guide/facts.json`, `guide/checklist.json`, `guide/tours.json`, `guide/guardrails.json` |
| Tools she can run in the browser | `guide/tools.json` (below) |
| Every word on every page | `guide/knowledge.md` |

Not for her:

- `guide/questions-on-site.csv` holds the answers the website itself gives patients, word for word. Do not load them into a question-and-answer trainer as her answers: she would start answering patients' clinical questions in her own voice. She may say "the site tells a patient…" and show the place.
- `guide/tests.json` and `tests.csv` are for testing her.
- `guide/open-questions.json` is the team's to-do list (below).

If she is on GoHighLevel, which looks things up in a knowledge base only when a trigger sentence matches, use: "Use this knowledge base for any question about the Dr. Demo example website: what a page is for, where something is, how a patient books, what a practice replaces with its own details, and what must stay on the site."

Everything in `guide/` is rebuilt from the site on every build. `guide/manifest.json` carries `pack_sha1`: when it changes, her knowledge has changed, so load her again. The build log prints the same code. The files are served with open CORS headers and are never cached.

## What Ava can do on the page

Every Dr. Demo page loads `guide/guide.js`, which defines `window.SiteGuide`. `guide/tools.json` describes the same functions as tool definitions (name, description, JSON Schema parameters) to register as client-side tools. Four are marked `core`; if her platform works best with a few tools, register those.

| Tool | Runs | What happens |
| --- | --- | --- |
| `go_to` (core) | `SiteGuide.go({ page: "knees", section: "cost" })` | Goes to a page and section, scrolls to it and outlines it. `page` is one of the site's own pages, so she cannot invent an address |
| `show_section` (core) | `SiteGuide.show("cost")` | Outlines a section, a marked spot or a question on the page in view (a question opens) |
| `where_am_i` (core) | `SiteGuide.where()` | The page and section in view, and whether it is a phone layout |
| `point_at` (core) | `SiteGuide.point("menu:Where it hurts > Knees")` | Outlines a menu item, the booking button, the phone number or the practice name |
| `find_on_site` | `SiteGuide.find("price")` | The best places for a word or a question. It knows what a microphone tends to make of the site's words ("exit zones") |
| `read_section` | `SiteGuide.read("knees#cost")` | The words of a section, to quote exactly. Sample details stay marked "(sample)" |
| `show_samples` | `SiteGuide.samples(true)` | Outlines every sample detail on the page; returns how many |
| `start_tour` | `SiteGuide.tour("patient-path")` | The steps of a walk-through: a line to say and a place to show |
| `tour_step` | `SiteGuide.tourStep("patient-path", 2)` | Goes to one step, and returns its line and the number of the next step |
| `show_look` | `SiteGuide.look("sandstone")` | Shows the page in another of the five looks |
| `go_back` | `SiteGuide.back()` | Back to the page shown before. It only undoes moves made on this site, so it never leaves it |
| `list_pages` | `SiteGuide.pages()` | Every page with how to reach it |

Every call that moves the page answers in one shape:

```json
{ "ok": true, "page": "knees", "name": "Knees", "section": "cost", "label": "What it costs", "layout": "laptop",
  "say": "The Knees page is open at What it costs. The details shown there are samples." }
```

or, when it could not, `{ "ok": false, "reason": "…", "say": "I could not find that on this site.", "try": [closest places] }`. She should say she has shown something only when `ok` is true. After a move, a small caption on the page says what was shown ("Shown: Knees, What it costs"), so the owner knows why the page moved even with the sound off.

Targets are checked against the site's own page list. Nothing here can send a visitor off the site, and no tool fills in or sends a form.

### Four ways she can guide, from most to least capable

1. **Tools.** She says one short sentence, calls `go_to` or `show_section`, then confirms from the answer.
2. **Messages from an iframe.** She posts `{ type: "site-guide", action: "go", args: { page: "knees", section: "cost" }, ref: 1 }` to the parent page and receives `{ type: "site-guide:result", ref: 1, result }`. The actions are the names of the functions (`go`, `show`, `where`, `point`, `find`, `read`, `samples`, `tour`, `tourStep`, `look`, `back`, `pages`) and `args` carries the same names as the tool definitions. Messages are accepted from her frame when it sits in her corner of the page, or from the origins listed in `AVA_ORIGINS`.
3. **Links.** Every section has a ready link in `guide/site-map.json` and `guide/links.txt` (`…/knees?show=cost#cost`), which opens the page at that spot and outlines it. She puts the link in the chat and says so. `guide/links.txt` also works as a link allow-list on her platform.
4. **Words.** Every page in her knowledge has a "reach" for a laptop and one for a phone ("the menu at the top: choose Where it hurts, then Knees"). This always works, and her notes are written so that words alone are a complete answer.

The page also tells her where the visitor is: `<body data-guide-page="knees">`, a JSON block with id `site-guide-page`, and the events `siteguide:ready` and `siteguide:page` on `document`. They are context, never a cue to speak.

### Wiring tools on her platform

None of these could be tested here, because we do not know her platform. They follow each vendor's documentation as read in November 2026. Put the adapter in `AVA_EMBED_HTML` after her own snippet, and define the tools on her platform with the names and parameters in `guide/tools.json`.

ElevenLabs Agents (client tools, registered when the widget starts a call):

```html
<script>
document.addEventListener("elevenlabs-convai:call", function (event) {
  event.detail.config.clientTools = {
    go_to: function (p) { return JSON.stringify(SiteGuide.go(p)); },
    show_section: function (p) { return JSON.stringify(SiteGuide.show(p.section)); },
    where_am_i: function () { return JSON.stringify(SiteGuide.where()); },
    point_at: function (p) { return JSON.stringify(SiteGuide.point(p.what)); }
  };
});
</script>
```

Tavus (a tool-call event on the element; the page answers with a tool result):

```html
<script>
document.addEventListener("tavus:tool-call", function (event) {
  var d = event.detail, a = JSON.parse(d.arguments || "{}");
  var run = { go_to: function () { return SiteGuide.go(a); }, show_section: function () { return SiteGuide.show(a.section); }, where_am_i: function () { return SiteGuide.where(); }, point_at: function () { return SiteGuide.point(a.what); } }[d.name];
  if (!run) return;
  var result = run();
  // send { message_type: "conversation", event_type: "conversation.tool_result", properties: { tool_call_id: d.tool_call_id, result: JSON.stringify(result) } }
  // back to the conversation the way the Tavus embed you use documents it
});
</script>
```

Anything in an iframe (the message bridge above):

```js
parent.postMessage({ type: "site-guide", action: "go", args: { page: "knees", section: "cost" }, ref: 1 }, "*");
addEventListener("message", function (e) { if (e.data && e.data.type === "site-guide:result") { /* e.data.result */ } });
```

What we found for other platforms: Vapi's Web SDK delivers client tools as `tool-calls` messages, one way, with no result back to the model, and we could not confirm it for the drop-in widget. Anam documents client tools for its SDK, not its widget. GoHighLevel chat and Voice AI, D-ID Agents and the HeyGen LiveAvatar iframe document no way for the assistant to act on the page: on those she guides with links or words.

## She stays on screen while the pages change

A talking assistant is cut off when the page she lives on reloads. So on Dr. Demo a move to another page does not reload: the script shows the assistant-free copy of the target page (`view-<page>.html`) in a frame that fills the window, and keeps the address bar and the Back button in step. Ava's page never unloads, so she keeps talking and the microphone is asked for once. This covers her own `go_to`, the visitor's clicks on menu items and links (also links inside her chat box), and the form's thank-you redirect. A reload, or a link opened in a new tab, lands on the ordinary page and starts her afresh. While the next page is loading her tools wait for it, so a `go_to` followed at once by `show_section` lands on the new page, not the old one.

This helps even an Ava with no tools at all: the owner can click around while she keeps talking.

## Where she sits, and what makes room for her

- Laptop: the bottom right corner is hers. The payment-plans chip stays bottom left. The footer has extra space at the bottom so the legal links are never under her.
- Phone: she sits bottom right. The book and call bar stops 88px short of the right edge. If her launcher is wider than about 72px, tell us and we change one number (`--assistant-corner` in `src/assets/css/parts/29-guide.css`).
- The frame that shows the other pages sits on a low layer (z-index 10) and the page beneath it is hidden, so whatever her snippet adds to the page stays on top without needing a particular z-index. The site's own caption and placeholder use 2001.
- When she is live, one small line sits above her corner until closed: "Ava is an AI guide to this example website, not a clinician. Please do not share health details with her." Anything about recording or storage is added only in wording you give us.

## Testing her

`guide/tests.json` (also `tests.csv`, a pass sheet) holds the questions to try before any owner gets the link: what she should say, what she must never say, and where the page should end up. The groups: getting around, what each page is for, the patient's path, booking, what you replace, samples, what must stay, things she must refuse, and things she must admit she does not know. Ask them out loud on a phone speaker as well as typing on a laptop, and again after every change to her prompt or knowledge.

Also check by hand, on an iPhone and an Android phone, on the deployed site: Back, a reload, a link straight to a section, a form through to the thank-you page, and the phone menu, all while she is talking.

## Where the knowledge comes from

- The pages themselves, read after every build by `tools/site-guide.js`.
- Hand-written notes in `src/guide/`: one file per page in `pages/`, the cross-site parts in `parts/` (rules and refusal lines, owner questions, checklists and tours, tests, unknowns), what a microphone mishears in `site.json`, her brief in `brief.md` and `brief-short.txt`. Facts such as the phone number and prices are never typed into the notes; they are written as `{{site.phone}}` and filled from `site.config.js`.
- The build stops, naming the file and the fix, when:
  - a note, a tour step, a test or a button points at a page or section that does not exist;
  - a spoken answer breaks a rule: over 60 words, a web address or file name, a symbol, the word "free", a claim word, "FDA-approved" without "not", or a sample detail given without the word "sample";
  - her rules are thin (fewer than 8 rules, 8 refusal lines or 30 tests) or her brief has lost one of the fixed statements;
  - a patient page has lost the words "not FDA-approved", or the pages with stories have lost "results vary";
  - anything unfinished is visible on Dr. Demo (a bracket placeholder, a dummy figure, a developer note, a "free" consultation);
  - a section id she may have learned disappears. Ids are pinned in `src/guide/anchors.json`; to rename one on purpose, list it under `moved` and rebuild with `GUIDE_ANCHORS=update`;
  - her snippet looks as if it carries a secret.
- A failed check stops the whole build, so the site that is already live stays up.

## What nobody has told Ava yet

`guide/open-questions.json` lists the questions owners will ask that nothing on the site answers, each with who has to supply the answer and exactly what is missing. Today Ava says plainly that she does not have these and names who to ask. To teach her one, move the entry in `src/guide/parts/unknowns.json` to an ordinary question in `src/guide/parts/owner-questions.json` and rebuild.

The ones that matter most before owners get the link:

- Who is "your contact for the website"? She needs a real name and a phone number or an email address, and a rule for what she may say about the package, its price, timelines and contracts.
- Does an owner get Ava on their own site, and is she part of the package?
- What is recorded when someone talks to her, where it is kept, and what wording must sit beside her before the microphone opens?
- When the owner is a chiropractor or a physical therapist, who are the nurse practitioner, the physician and the medical group shown on their site, and who supplies them? Dr. Demo is dressed as a physician-led practice. This is the first thing its main audience will ask.
- What may she say about GoHighLevel: who connects the calendar, what the reminders say, what it costs?
- Does an owner choose among the five looks, or is one assigned?

## Questions for Joe

1. What platform is Ava on, and what does her embed look like: one script tag, a custom element plus a script, or an iframe? Does it need anything in the head? Does it draw in a shadow root or an iframe, and on which origin?
2. Does she draw her own launcher? What are its size and position on a phone and on a laptop, and her open size? Can it take a bottom offset on phones? Can she shrink to her face while she keeps talking, and does she show captions?
3. How does she learn: crawling an address, uploaded files (which types, what size, how many), question-and-answer rows, a system prompt (how long), or a mix?
4. If she crawls: does her crawler obey robots.txt and noindex, does it run JavaScript, and can it be limited to `/dr-demo/` or to one page?
5. How is she re-loaded after we rebuild the site: by herself, by a call we could make, or by hand? Who does it?
6. Can she run actions in the visitor's browser from the drop-in widget, and does she get a result back? If not, can her replies carry clickable links, and must our host be allow-listed for that?
7. Does a conversation survive a full page load? If her platform resumes by itself we can switch our own keep-alive off.
8. Can the page give her context (which page and section the visitor is on, that the site is a sample) at the start and during a session?
9. Is every id in the embed safe to publish in page source, and is it locked to our domains? Which origins should be registered?
10. When does she start listening? Does she ask for the camera as well? Can an owner use text only?
11. Can we set her whole system prompt, or only a persona field? Are there controls for blocked phrases and a fallback answer? Does she say she is an AI at the start?
12. Does her voice accept a pronunciation list (Wharton's Jelly, exosomes, GoHighLevel)? Can she be interrupted? English only, or Spanish as well?
13. Is Dr. Demo open to anyone with the link or shared privately, and is there a cost per conversation we should design around?
14. Can we get transcripts, or a list of questions she could not answer, to improve her notes? Can the tests be run through an API in text mode?
15. Is there a GoHighLevel sandbox calendar we may embed on Dr. Demo, so an owner can make a test booking and receive the real confirmation and reminders?

## Using this for a real practice

The same switches work for any variant: `guide: true` writes the knowledge pack for that practice's site from its own config, and `assistant: { … }` gives it the corner. Section ids do not contain the practice's name, so they are the same on every practice's site, and notes written for one carry over to the next.
