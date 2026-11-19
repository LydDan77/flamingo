# Prompt: an example site a talking guide can learn

A reusable prompt, written from Lydia's request of 19 November 2026: Joe is adding his AI guide, Ava, to a "Dr. Demo" sample site, so that partners who get the new website have an example where they can ask questions and be shown around. Paste the block below into Claude Code with the template pack's repository open, replace the bracketed parts, and let it run. It was first run against this repository; the result is `/dr-demo/` and `docs/AVA-DR-DEMO.md`.

The same prompt builds a guide for a real practice's own site: name that practice's variant instead of a sample one, and leave out the sample dressing.

## The prompt

```
You are working in [repository], a static website template pack for regenerative-medicine practices.
[Name] is adding an AI guide called [Ava] to an example site. She is an AI-generated person who pops up with a
chat box; she talks and listens. Practice owners who are getting this website will use the example to ask
questions and be shown around. We do not yet know which platform she runs on.

Build the example site and everything she needs to learn it:

1. One more build of the site, from the latest templates, as a made-up practice called [Dr. Demo]. One fixed
   design look, no design switcher, nothing remembered. Every name, number, price, review and story is made up,
   says so on the page, and cannot be mistaken for a real practice (a reserved phone range, an example email
   domain). Nothing unfinished is visible: no bracket placeholders, no dummy figures, no developer notes.
   Leave the other builds byte-for-byte alone unless a fix is a compliance fix.
2. A corner for her. A slot at the end of every page that takes her embed snippet untouched, whatever its shape
   (a script, a custom element, an iframe), from one config key or an environment variable. A second mode in
   which the site draws the launcher and loads her snippet on the first tap. Until she is connected, an honest
   labelled placeholder that offers the same tour by tapping. Public ids only; stop the build on anything that
   looks like a secret.
3. Knowledge in every form a platform might take, generated from the built pages plus hand-written notes, so
   it cannot fall behind the site: a brief for her system prompt (and a short one), one short document, one
   complete document, the same as one web page, small topic files, question-and-answer rows, a site map with
   every page and section and how to reach each in words (laptop and phone), the facts marked sample, what a
   practice replaces, what must stay, walk-throughs, tool definitions, tests for whoever checks her, and a list
   of what nobody has told her yet with who must answer. A manifest that says which file suits which way of
   learning and changes when she needs loading again.
4. Notes written to be spoken. One note per page (what it is for, who reads it, what to replace, what to keep,
   a line per section, the questions an owner asks) and the cross-site parts (rules, refusal lines, owner
   questions, checklists, tours, tests, unknowns). Two or three short sentences, everyday words, no web
   addresses, no symbols, "sample" beside every made-up detail. Facts come from the config by token, never
   typed. What is not on the site is an honest "I don't have that", never a guess.
5. A way to act on the page that works on any platform: a small script on every page with go to a section,
   outline it, point at a menu item, read a section, outline the samples, run a tour. Every call answers with
   ok and a sentence she can say. Offer it four ways: as browser tools, as messages from an iframe, as ready
   links per section, and as directions in words, which must always be a complete answer.
6. Do not cut her off. A page load ends a spoken session, so moving to another page must not reload the page
   she lives on.
7. An owner's guide page in writing, for people who would rather read: a short tour, every page and what it
   is for, what you replace, what stays, how booking works, what the example cannot tell you.
8. Keep the rules, on the pages and in her mouth: not FDA-approved and investigational for most uses, results
   vary, a clinician decides who is a candidate, no promised outcomes, no medical advice, never a "free"
   consultation, patient words on patient pages. She is an AI guide, not a clinician, and says so.
9. Make it fail safely. The build stops, naming the file and the fix, when a note points at something that
   does not exist, when a spoken line breaks a rule, when her rules are thin, when a page loses its honest
   wording, when anything unfinished is visible, or when a section id she may have learned disappears.
10. Prove it. Build every variant and compare the other builds before and after. Test in a browser, laptop and
    phone: moving between pages without a reload, Back and Forward, a form through to the thank-you page, the
    placeholder, a build with a test snippet in each mode. Have reviewers check every spoken answer against
    the pages, play her from her knowledge alone against the tests, and walk the site as an owner would;
    have each finding challenged before it is accepted. Run the layout check. Then publish.

Deliver: the address of the example, the handover for [Name] (how to connect her in three steps, which file
for which way of learning, the tools, where she sits, how to test her, the questions only [Name] can answer),
and the list of what nobody has told her yet.
```

## Run log

First run, 19 to 20 November 2026, against this repository.

- **Design.** Three designs were drafted from different seats (the assistant learning the site, the owner using it, the person maintaining the build), scored by three judges, and merged. Research first: how seven avatar and voice platforms take embeds, knowledge and browser tools.
- **Built.** `variants.drdemo` (`/dr-demo/`), `tools/site-guide.js`, `src/guide/` (runtime, brief, notes), `src/partials/assistant.html`, `src/pages/site-guide.html`, `29-guide.css`. Three locked files changed (Round 10 in `docs/COLLECTION-ONE-LOCK.md`).
- **Notes.** One per page, plus rules, refusal lines, owner questions, checklists, five tours, tests and unknowns, written by a team of authors working from the built pages and a bank of questions owners would ask, each validated against the site before it was accepted.
- **Found on the way.** The authors read every page closely and reported what did not add up: claim-like lines on the treatment pages, two patient pages without their own not-FDA-approved line, page names that differed between menu and footer, a menu listing pages of switched-off programs. Those were fixed in the templates for every build.
- **Notes brought in line.** After the copy fixes, a second team re-checked every note against the rebuilt pages and made about 190 corrections.
- **Checked.** Every note, tour step, test and button resolves to a real page and section; every spoken line passes the speaking rules (the build enforces both). Browser tests on laptop and phone: moving between pages without a reload, Back and Forward, a form through to the thank-you page, the placeholder, the caption, tour steps, the message bridge, and a stand-in snippet in widget mode and in panel mode. Layout check on all Dr. Demo pages. A code review of the page script found eleven defects (history after a reload, calls landing on the outgoing page, links opened in a new tab, the phone menu left open, focus, quoting, the message format); all are fixed.
- **NAD+ taken off.** On Lydia's word (20 November), Dr. Demo carries regenerative care only: 36 pages. The notes were corrected to match, and three template lines that still spoke of longevity with the program off were fixed for every regenerative-only build.
- **Not done.** An independent review of her 400 answers for compliance and for how they sound aloud, a run in which she answers the tests from her knowledge alone, and a walk through the site as an owner were started and cut off by the account's usage limit. A word scan of every answer in her own voice for claim words found none. Run those three before owners get the link, and the hand tests in `docs/AVA-DR-DEMO.md` once Ava is connected.
