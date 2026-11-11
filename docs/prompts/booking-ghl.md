# Prompt: booking provision for GoHighLevel clients

A reusable prompt, written from Seth's audio message of 10 November 2026. Paste the block below into Claude Code with a template pack's repository open, replace the bracketed parts, and let it run. It was first run against this repository (all versions, the Collection Three showcase included); the run log is at the end.

## The prompt

```
You are working in [repository], a static website template pack sold to regenerative-medicine practices.
Some buyers take the $997 package. They are not connected to Tyria; they are connected to GoHighLevel (GHL).
Seth is building the GHL "master snapshot" for those accounts: a booking calendar, appointment reminders,
no-show and cancellation sequences, and a basic database reactivation campaign. Joe reviews it. Chris will
automate the per-client set-up with Sanity.

Make the templates ready for that, in every version of the pack:

1. One booking destination. Every "Book" button, link and the phone-only bar point at one booking page.
2. A slot for the GHL calendar. On the booking page, a clearly marked slot that renders the GHL calendar
   embed (the iframe plus GHL's form_embed.js) when a calendar link is configured, and a raw-snippet override
   for any other "GHL-like" script or widget. The link and the snippet live in one config place and can also be
   supplied at build time by an environment variable, so a per-client deploy needs no code edit.
3. Honest when empty. With no calendar configured, the slot shows a visible placeholder that says what goes
   there and how to fill it, and the page still works: a native request-a-call-back form underneath.
4. A simple thank-you page. thank-you.html: a greeting, what happens next in three steps, how to change the
   time, a short prepare-for-your-call list, and the compliance line. Not indexed, not in the sitemap. The
   native forms land there too, and the GHL calendar's confirmation redirect is pointed at it.
5. An optional head script. A slot before </head> for a tracking or chat snippet, from the same config.
6. Keep the rules. Patient words, no "free" consultation, not FDA-approved and investigational for most uses,
   no promised outcomes, placeholder tags where the client must supply something, and no secrets in the
   client bundle (calendar links and widget IDs are public; API keys never are).
7. Prove it. Build every variant, run the plain-language lint, run the layout check on the booking, thank-you
   and contact pages across the versions at desktop and phone, test the form-to-thank-you flow in a browser,
   and test a build with the calendar variable set. Document the config in the README. Ship to main and verify
   the live pages.

Deliver: the config keys and their names, the two pages, the slot renderer, the live booking page link in each
version, and a one-paragraph handover for Seth: what to paste where, and which GHL calendar setting to point at
the thank-you page.
```

## Run log

**11 November 2026, this repository, all versions (root, `/regen/`, `/three/`, `/demo/`).**

- Config: `booking` in `site.config.js` (`provider`, `calendarUrl`, `embedScript`, `embedHtml`, `headScript`, `thankYouUrl`); environment variables `GHL_BOOKING_URL`, `BOOKING_EMBED_HTML`, `SITE_HEAD_SCRIPT`, `BOOKING_PROVIDER` override it at build time. `bookUrl` is now `book.html`.
- Pages: `book.html` (the slot, the call-back form while no calendar is connected, who answers the phone, what happens on the call, the honesty line) and `thank-you.html` (noindex, out of the sitemap, greets by first name when a form passes one along).
- Builder: `{{bookingEmbed}}`, `{{headScript}}`, the `booking:calendar | custom | slot | form` condition; the patient form moved to `src/partials/form-patient.html` and is shared by the contact and booking pages; native forms redirect to the thank-you page (`data-thanks`); `28-booking.css`.
- Checks: plain-language lint 23 of 23 patient pages; a build with the calendar variable set renders the iframe, the resizer script and the head snippet and hides the native form; the form flow lands on `thank-you.html?first=Carol`; layout check on book, thank-you and contact across all sixteen versions at both viewports.

**Handover for Seth.** In GoHighLevel, open the client's calendar, copy the embed link (`https://api.leadconnectorhq.com/widget/booking/…`), and either paste it into `booking.calendarUrl` in `site.config.js` or set `GHL_BOOKING_URL` on the Vercel project and redeploy. In the calendar's Confirmation settings choose "redirect to a custom URL" and enter `https://<the practice's domain>/thank-you.html`. Reminders, no-show and cancellation sequences run in GHL as you build them; the site needs nothing else. A GHL form, chat widget or tracking snippet goes in `BOOKING_EMBED_HTML` or `SITE_HEAD_SCRIPT`. Never put an API key in either.
