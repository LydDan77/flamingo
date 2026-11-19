#!/usr/bin/env node
// Site guide: makes a built site learnable and steerable by a talking assistant (Ava on the Dr. Demo site).
// build.js calls annotate() on every page of a variant that has `guide: true`, then write() once for that variant.
//   annotate()  gives every section, question and marked spot a stable id and records what is on the page.
//   write()     merges that record with the hand-written notes in src/guide/ (site.json, pages/<slug>.json, brief.md)
//               and writes the knowledge pack to dist/<variant>/guide/, llms.txt, a complete sitemap, and an
//               assistant-free copy of every page (view-<page>.html) for the runtime's stage. It stops the build
//               when a note points at a page or section that does not exist, when a spoken answer breaks a rule, or
//               when a section id that the assistant may have learned disappears (src/guide/anchors.json).
// Facts such as the phone number, names and prices are never typed into the notes: they are written as {{site.phone}}
// and resolved from site.config.js here. Every file in the pack is described in docs/AVA-DR-DEMO.md.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "guide");
const registry = new Map(); // outDir -> { pages: [] }

// ---------------------------------------------------------------------------------------------------------- text
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", sect: "§", copy: "©", rarr: "→", times: "×" };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : " "; }
  return Object.prototype.hasOwnProperty.call(ENT, e.toLowerCase()) ? ENT[e.toLowerCase()] : " ";
});
const strip = (h) => decode(String(h || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, " ").replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/summary|\/dt|\/dd|\/tr|\/button|\/option)\b[^>]*>/gi, " $& ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").replace(/ ([.,;:!?])/g, "$1").trim();
const slugify = (s, words = 6) => strip(s).toLowerCase().replace(/['’]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").filter(Boolean).slice(0, words).join("-");
const first = (html, re) => { const m = html.match(re); return m ? strip(m[1]) : ""; };
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)).replace(/[,;:]$/, "") + "…");
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const getPath = (obj, dotted) => dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// The SAMPLE stamp and the "Client to provide" tag are page furniture, not content.
const STAMP = /<span class="(?:sample|ph-tag)"[^>]*>[\s\S]*?<\/span>/gi;

// ------------------------------------------------------------------------------------------------------ annotate
/** Give every section, question and marked spot of a built page a stable id, and record the page. Returns the new HTML. */
function annotate(html, info) {
  const m = html.match(/<main id="main">([\s\S]*)<\/main>/);
  if (!m) return html;
  const used = new Set();
  html.replace(/\bid="([^"]+)"/g, (_, id) => (used.add(id), ""));
  const sections = [];
  const claim = (base) => { let id = base || "section", n = 2; while (used.has(id)) id = `${base}-${n++}`; used.add(id); return id; };

  let main = m[1].replace(/<section\b([^>]*)>([\s\S]*?)<\/section>/g, (all, attrs, inner) => {
    const cls = (attrs.match(/\bclass="([^"]*)"/) || [, ""])[1];
    const kind = /\bhero\b/.test(cls) ? "top" : /\bcta-band\b/.test(cls) ? "next-step" : /\bdisclaimer-band\b/.test(cls) ? "small-print" : "section";
    // every question in an accordion gets its own id, so an answer can point at it and open it
    const faqs = [];
    inner = inner.replace(/<details\b([^>]*)>(\s*<summary\b[^>]*>)([\s\S]*?)(<\/summary>)([\s\S]*?)<\/details>/g, (d, dattrs, open, q, close, a) => {
      const qq = strip(q.replace(STAMP, " ")), aa = strip(a.replace(STAMP, " "));
      if (!qq || !aa) return d;
      let id = (dattrs.match(/\bid="([^"]*)"/) || [])[1];
      if (!id) { id = claim("q-" + (slugify(qq, 6) || "question")); dattrs = dattrs.replace(/\s*$/, "") + ` id="${id}"`; }
      faqs.push({ id, q: qq, a: aa });
      return `<details${dattrs} data-guide="question">${open}${q}${close}${a}</details>`;
    });
    const clean = inner.replace(STAMP, " ");
    const label = first(clean, /<(?:span|p)\b[^>]*class="[^"]*\b(?:eyebrow|hero__kicker)\b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|p)>/);
    const heading = first(clean, /<h1\b[^>]*>([\s\S]*?)<\/h1>/) || first(clean, /<h2\b[^>]*>([\s\S]*?)<\/h2>/) || first(clean, /<h3\b[^>]*>([\s\S]*?)<\/h3>/);
    let id = (attrs.match(/\bid="([^"]*)"/) || [])[1];
    if (!id) {
      id = claim(kind === "section" ? slugify(label || heading) || slugify(strip(clean), 4) || "more" : kind);
      attrs = attrs.replace(/\s*$/, "") + ` id="${id}"`;
    }
    // spots inside a section that the templates mark for the guide: <div id="calendar" data-guide-mark="The booking calendar">
    const marks = [];
    inner.replace(/<[a-z0-9]+\b([^>]*\bdata-guide-mark="([^"]*)"[^>]*)>/g, (_, a, lbl) => { const mid = (a.match(/\bid="([^"]*)"/) || [])[1]; if (mid) marks.push({ id: mid, label: decode(lbl) }); return ""; });
    const buttons = [];
    clean.replace(/<a\b([^>]*\bclass="[^"]*\b(?:btn|link-arrow|pill)\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g, (_, a, t) => { const href = (a.match(/\bhref="([^"]*)"/) || [])[1]; const text = strip(t); if (href && text && !buttons.some((b) => b.href === href && b.text === text)) buttons.push({ text, href }); return ""; });
    const items = [];
    clean.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g, (_, t) => { const s = strip(t); if (s && s !== heading && items.length < 14) items.push(s); return ""; });
    const lead = first(clean, /<p\b[^>]*class="[^"]*\blead\b[^"]*"[^>]*>([\s\S]*?)<\/p>/) || first(clean, /<p\b(?![^>]*class="[^"]*\b(?:hero__kicker|eyebrow|small)\b)[^>]*>([\s\S]*?)<\/p>/);
    const named = label || (kind === "small-print" ? "The small print" : kind === "next-step" ? "The next step" : "");
    sections.push({ id, kind, label: named, heading: heading || named || clip(strip(clean), 60), summary: clip(lead, 320), items, faqs, marks, buttons, form: /<form\b/.test(inner), text: strip(clean) });
    return `<section${attrs} data-guide="${kind}">${inner}</section>`;
  });
  // The few top-level blocks that are not sections but are worth pointing at.
  for (const [cls, id, label] of [["reviews", "reviews", "Patient reviews"], ["stats-band", "numbers", "The practice in numbers"]]) {
    main = main.replace(new RegExp(`<div class="${cls}\\b([^"]*)"((?:(?!\\bid=)[^>])*)>`), (all, rest, attrs) => {
      if (used.has(id)) return all;
      used.add(id);
      sections.push({ id, kind: "section", label, heading: label, summary: "", items: [], faqs: [], marks: [], buttons: [], form: false, text: "" });
      return `<div class="${cls}${rest}"${attrs} id="${id}" data-guide="section">`;
    });
  }
  let out = html.replace(m[0], () => `<main id="main">${main}</main>`);
  if (!used.has("footer")) out = out.replace('<footer class="site-footer">', '<footer class="site-footer" id="footer" data-guide="footer">');

  const links = new Set();
  main.replace(/<a\b[^>]*\bhref="([^"#?]+\.html)(?:[?#][^"]*)?"/g, (_, h) => (links.add(h.replace(/\.html$/, "")), ""));
  if (!registry.has(info.outDir)) registry.set(info.outDir, { pages: [] });
  registry.get(info.outDir).pages.push({
    slug: info.slug,
    file: info.file,
    url: info.slug === "index" ? "" : info.slug,
    title: decode(info.page.title || ""),
    description: decode(info.page.description || ""),
    group: info.page.nav || "",
    noindex: !!info.noindex,
    h1: (sections.find((s) => s.kind === "top") || sections[0] || {}).heading || "",
    sections,
    links: [...links],
    visible: strip(main.replace(STAMP, " ")),
  });
  return out;
}

// --------------------------------------------------------------------------------------------------------- notes
/** Resolve {{site.x.y}} in a hand-written note; an unknown key stops the build so a typo cannot ship. */
function fill(value, site, where) {
  if (typeof value === "string") return value.replace(/\{\{site\.([\w.]+)\}\}/g, (m, k) => { const v = getPath(site, k); if (v === undefined || v === null || typeof v === "object") throw new Error(`site guide: ${where} uses ${m}, which site.config.js does not define as text`); return String(v); });
  if (Array.isArray(value)) return value.map((v) => fill(v, site, where));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, site, where)]));
  return value;
}
function readJson(file, site) {
  if (!fs.existsSync(file)) return null;
  let data;
  try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { throw new Error(`site guide: ${path.relative(ROOT, file)} is not valid JSON (${e.message})`); }
  return fill(data, site, path.relative(ROOT, file));
}

/** For each page in the menus: the name the menu gives it, and how to reach it in words a person can follow. */
function menuMap(site) {
  const on = (i) => !i.module || (site.modules && site.modules[i.module]);
  const map = {};
  const put = (href, name, reach) => { const h = String(href || ""); const slug = h.split(/[?#]/)[0].replace(/\.html$/, ""); if (slug && !/[?#]/.test(h) && !map[slug]) map[slug] = { name, reach }; };
  for (const item of (site.nav || []).filter(on)) {
    for (const c of (item.children || []).filter(on)) put(c.href, c.label, `the menu at the top: choose ${item.label}, then ${c.label}`);
    if (!(item.children || []).length) put(item.href, item.label, `the menu at the top: choose ${item.label}`);
  }
  put("book.html", "Booking", `the ${site.bookLabel} button at the top right of every page`);
  for (const col of site.footer || []) for (const l of (col.links || []).filter(on)) put(l.href, l.label, `the footer at the bottom of every page, under ${col.title}: ${l.label}`);
  for (const [href, label] of [["privacy-policy.html", "Privacy Policy"], ["terms-conditions.html", "Terms of Service"], ["disclaimer.html", "Disclaimer"]]) put(href, label, `the last line of the footer: ${label}`);
  map.index = { name: "Home", reach: "the practice name at the top left of every page" };
  return map;
}

// Rules every spoken answer must pass. An answer is read aloud, so no addresses, no symbols, and nothing the site may not claim.
const SAY_MAX_WORDS = 70;
const SAY_BANNED = [
  [/\bfree\b(?! of\b| from\b)/i, 'says "free"'],
  [/https?:|www\.|\.html\b|\.json\b|\.js\b|\.md\b/i, "reads out a web address or a file name"],
  [/[#{}<>|\\]|\/(?!\s)/, "contains a symbol that cannot be spoken"],
  [/\b(guaranteed?|cures?|cured|proven|miracle|risk-free|painless|permanent(ly)?)\b/i, "uses a claim word"],
  [/(?<!not )(?<!is not )(?<!are not )(?<!isn't )(?<!aren't )\bFDA[- ]approved\b/i, 'says "FDA-approved" without "not"'],
  [/\bsafe and effective\b|\bmost effective\b|\bworks for everyone\b/i, "makes an efficacy claim"],
];

// What must never be visible on a guide build: unfinished placeholders, developer notes, and the one banned promise.
const PAGE_GATE = [
  [/\[[A-Z][^\]{}]{1,40}\]/, "a bracket placeholder"],
  [/\bX{1,2},X{3}\+?|\bXX\+?(?![A-Za-z])|\bYYYY\b|\(000\) 000-0000/, "a dummy figure"],
  [/Client to (?:provide|confirm)/, 'a "Client to provide" tag'],
  [/goes here|once the client provides|\b[Pp]laceholder\b|Template legal copy/, "placeholder wording"],
  [/site\.config\.js|build\.js|booking\.calendarUrl|GHL_BOOKING_URL/, "a developer file or setting name"],
  [/\bfree (?:consultation|video call|call|visit)\b/i, 'a "free" consultation'],
];

// --------------------------------------------------------------------------------------------------------- write
function write({ outDir, site, variant, baseUrl }) {
  const reg = registry.get(outDir) || { pages: [] };
  registry.delete(outDir);
  const pages = reg.pages.filter((p) => p.slug !== "404").sort((a, b) => (a.slug === "index" ? -1 : b.slug === "index" ? 1 : a.slug.localeCompare(b.slug)));
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const base = baseUrl.replace(/\/$/, "") + "/";
  const notes = readJson(path.join(SRC, "site.json"), site) || {};
  const menus = menuMap(site);
  const problems = [], warnings = [];
  const name = (site.assistant && site.assistant.name) || "the assistant";
  const pagesDir = path.join(SRC, "pages");
  const hasNotes = fs.existsSync(pagesDir) && fs.readdirSync(pagesDir).some((f) => f.endsWith(".json"));

  /** Every id on a page that can be pointed at: sections, marked spots, questions. */
  const idsOf = (p) => p.sections.flatMap((s) => [s.id, ...s.marks.map((x) => x.id), ...s.faqs.map((x) => x.id)]);
  /** "knees#cost" | "knees" | "#cost" (with a page for context) -> { page, section } or null, recording why not. */
  const resolve = (target, where, ctxSlug) => {
    if (!target) return null;
    const [pg, sec] = String(target).split("#");
    const slug = (pg || ctxSlug || "").replace(/\.html$/, "") || "index";
    const page = bySlug.get(slug);
    if (!page) { problems.push(`${where}: "${target}" names a page that is not in this build`); return null; }
    if (sec && !idsOf(page).includes(sec)) { problems.push(`${where}: "${target}" names a section that is not on ${slug} (it has: ${page.sections.map((s) => s.id).join(", ")})`); return null; }
    return { page: slug, section: sec || "" };
  };
  const targetOf = (t) => (t ? t.page + (t.section ? "#" + t.section : "") : "");
  const linkOf = (t) => (t ? base + (t.page === "index" ? "" : t.page) + (t.section ? `?show=${t.section}#${t.section}` : "") : "");
  const lintSay = (say, where) => {
    const n = say.split(/\s+/).filter(Boolean).length;
    if (n > SAY_MAX_WORDS) problems.push(`${where}: the spoken answer is ${n} words (keep it to ${SAY_MAX_WORDS})`);
    for (const [re, why] of SAY_BANNED) if (re.test(say)) problems.push(`${where}: the spoken answer ${why}: “${clip(say, 90)}”`);
  };

  // ---- pages: the record from the build plus the hand-written note for each
  const qa = [];
  const addQa = (item, where, ctxSlug, opts = {}) => {
    if (!item || !item.q || !(item.say || item.text)) { problems.push(`${where}: a question needs "q" and "say"`); return; }
    const label = `${where} (“${clip(item.q, 50)}”)`;
    const t = resolve(item.show, label, ctxSlug);
    if (!opts.quote) lintSay(item.say || item.text, label);
    qa.push({
      id: `q${String(qa.length + 1).padStart(3, "0")}`,
      audience: item.audience || "owner",
      topic: item.topic || "",
      voice: opts.quote ? "quote" : "own",
      q: item.q,
      also_asked: item.alt || [],
      say: item.say || item.text,
      text: item.text || item.say,
      show: targetOf(t),
      link: linkOf(t),
      source: item.source || (ctxSlug ? `page:${ctxSlug}` : "site"),
    });
  };
  const outPages = pages.map((p) => {
    const note = readJson(path.join(pagesDir, `${p.slug}.json`), site) || {};
    const menu = menus[p.slug];
    const pname = note.name || (menu && menu.name) || p.title;
    const reach = note.reach || (menu && menu.reach) || (() => { const from = pages.filter((o) => o.slug !== p.slug && o.links.includes(p.slug)).slice(0, 2).map((o) => (menus[o.slug] && menus[o.slug].name) || o.title); return from.length ? `a link on the ${from.join(" page and the ")} page` : "a direct link only; it is not in the menus"; })();
    const sectionNotes = note.sections || {};
    for (const id of Object.keys(sectionNotes)) if (!p.sections.some((s) => s.id === id)) problems.push(`src/guide/pages/${p.slug}.json: sections.${id} is not on the page (it has: ${p.sections.map((s) => s.id).join(", ")})`);
    if (hasNotes && !note.purpose) problems.push(`src/guide/pages/${p.slug}.json: every page needs a hand-written "purpose"`);
    return {
      slug: p.slug,
      name: pname,
      url: base + p.url,
      title: p.title,
      description: p.description,
      heading: p.h1,
      purpose: note.purpose || p.description,
      audience: note.audience || "patients",
      reach,
      in_menus: !!menu,
      owner_notes: note.owner_notes || [],
      replace: note.replace || [],
      keep: note.keep || [],
      _questions: note.questions || [],
      sections: p.sections.map((s) => ({
        id: s.id,
        target: `${p.slug}#${s.id}`,
        link: linkOf({ page: p.slug, section: s.id }),
        kind: s.kind,
        label: s.label,
        heading: s.heading,
        summary: (sectionNotes[s.id] && sectionNotes[s.id].summary) || s.summary,
        say: (sectionNotes[s.id] && sectionNotes[s.id].say) || "",
        items: s.items,
        spots: s.marks.map((x) => ({ id: x.id, target: `${p.slug}#${x.id}`, label: x.label })),
        buttons: s.buttons,
        has_form: s.form,
        questions_on_page: s.faqs.map((f) => ({ id: f.id, target: `${p.slug}#${f.id}`, q: f.q, a: f.a })),
        text: s.text,
      })),
    };
  });
  for (const p of outPages) { for (const q of p._questions) addQa(q, `src/guide/pages/${p.slug}.json`, p.slug); delete p._questions; for (const s of p.sections) if (s.say) lintSay(s.say, `src/guide/pages/${p.slug}.json sections.${s.id}.say`); }
  for (const q of notes.questions || []) addQa(q, "src/guide/site.json questions");
  // What nobody has told the assistant yet: an honest "I don't have that", never a guess.
  for (const u of notes.unknowns || []) addQa({ audience: "owner", topic: "not on this site", q: u.q, alt: u.alt, say: u.say, source: "unknown" }, "src/guide/site.json unknowns");
  // One "where is it" answer per page, so the pack always covers getting around.
  for (const p of outPages) addQa({ audience: "both", topic: "getting around", q: `Where is the ${p.name} page?`, alt: [`How do I get to the ${p.name} page?`, `Take me to ${p.name}.`], say: `You reach the ${p.name} page from ${p.reach}. I can take you there now.`, show: p.slug, source: "generated" }, `generated (${p.slug})`, p.slug);
  // The questions the site itself answers for patients. They are the site's words: quote them, do not rephrase.
  for (const p of outPages) for (const s of p.sections) for (const f of s.questions_on_page) addQa({ audience: "patient", topic: "on the site", q: f.q, say: f.a, show: f.target, source: `faq:${p.slug}` }, `faq on ${p.slug}`, p.slug, { quote: true });

  const checklist = (list, where) => (list || []).map((x, i) => { const at = (x.where || []).map((w) => targetOf(resolve(w, `${where}[${i}].where`))).filter(Boolean); if (x.say) lintSay(x.say, `${where}[${i}].say`); return { id: x.id || `${where.slice(-1) === "e" ? "R" : "K"}${i + 1}`, item: x.item, say: x.say || x.item, where: at, links: at.map((w) => { const [pg, sec] = w.split("#"); return linkOf({ page: pg, section: sec || "" }); }) }; });
  const replaceList = checklist(notes.replace, "src/guide/site.json replace");
  const keepList = checklist(notes.keep, "src/guide/site.json keep");
  const tours = (notes.tours || []).map((t, i) => ({ id: t.id || `tour-${i + 1}`, title: t.title, ask: t.ask || [], steps: (t.steps || []).map((s, j) => { lintSay(s.say, `src/guide/site.json tours[${i}].steps[${j}]`); return { say: s.say, show: targetOf(resolve(s.show, `src/guide/site.json tours[${i}].steps[${j}]`)) }; }) }));
  const starters = (notes.starters || []).map((s, i) => ({ q: s.q, show: /^(menu:|book$|call$|home$|footer$)/i.test(s.show) ? s.show : targetOf(resolve(s.show, `src/guide/site.json starters[${i}]`)) }));
  const tests = (notes.tests || []).map((t, i) => ({ id: `t${String(i + 1).padStart(2, "0")}`, group: t.group || "", audience: t.audience || "owner", ask: t.ask, expect_show: targetOf(resolve(t.expect_show, `src/guide/site.json tests[${i}]`)), expect_says: t.expect_says || [], must_not_say: t.must_not_say || [] }));
  if (hasNotes) for (const p of pages) if (!fs.existsSync(path.join(pagesDir, `${p.slug}.json`))) problems.push(`src/guide/pages/${p.slug}.json is missing (every page needs a note)`);
  if (fs.existsSync(pagesDir)) for (const f of fs.readdirSync(pagesDir)) if (f.endsWith(".json") && !bySlug.has(f.replace(/\.json$/, ""))) problems.push(`src/guide/pages/${f} has no page in this build`);

  // ---- nothing unfinished may be visible on a guide build (the assistant would read it out)
  for (const p of pages) for (const [re, why] of PAGE_GATE) { const hit = p.visible.match(re); if (hit) (variant.guideStrict === false ? warnings : problems).push(`${p.slug}.html shows ${why}: “${clip(p.visible.slice(Math.max(0, hit.index - 30), hit.index + 50), 90)}”`); }

  // ---- section ids the assistant may already have learned must not disappear (src/guide/anchors.json)
  const anchorsFile = path.join(SRC, "anchors.json");
  const current = Object.fromEntries(pages.map((p) => [p.slug, p.sections.map((s) => s.id)]));
  if (process.env.GUIDE_ANCHORS === "update" || !fs.existsSync(anchorsFile)) {
    const prev = fs.existsSync(anchorsFile) ? JSON.parse(fs.readFileSync(anchorsFile, "utf8")) : {};
    fs.writeFileSync(anchorsFile, JSON.stringify({ about: "Section ids per page, as the assistant has learned them. The build fails if one disappears. To rename one on purpose, list it under moved (old target -> new target) and rebuild with GUIDE_ANCHORS=update.", moved: prev.moved || {}, pages: current }, null, 1) + "\n");
  } else {
    const lock = JSON.parse(fs.readFileSync(anchorsFile, "utf8"));
    for (const [slug, ids] of Object.entries(lock.pages || {})) for (const id of ids) {
      const key = `${slug}#${id}`;
      if ((current[slug] || []).includes(id) || (lock.moved || {})[key]) continue;
      problems.push(`section ${key} has gone (the assistant may have learned it). Restore the id, or add it to "moved" in src/guide/anchors.json and rebuild with GUIDE_ANCHORS=update`);
    }
    for (const [from, to] of Object.entries(lock.moved || {})) resolve(to, `src/guide/anchors.json moved["${from}"]`);
  }
  const moved = fs.existsSync(anchorsFile) ? JSON.parse(fs.readFileSync(anchorsFile, "utf8")).moved || {} : {};

  if (problems.length) throw new Error(`site guide (${variant.path || "root"}): ${problems.length} problem(s)\n  - ${problems.join("\n  - ")}`);

  // ---- the facts, straight from the config. On a sample site every one of them is fictional and says so.
  const status = site.sample ? "sample" : "real";
  const fact = (id, label, value, say) => ({ id, label, value, status, say: say || `${label}: ${value}${site.sample ? ". That is a sample." : "."}` });
  const facts = [
    fact("practice-name", "Practice name", site.name, `The practice on this ${site.sample ? "example " : ""}site is called ${site.name}.${site.sample ? " It is not a real practice." : ""}`),
    fact("phone", "Phone number", site.phone),
    fact("email", "Email", site.email),
    fact("address", "Address", site.address),
    fact("hours", "Opening hours", site.hours),
    site.coordinator && fact("coordinator", "Who answers the phone", `${site.coordinator.first}, the ${site.coordinator.role}`),
    ...Object.entries(site.team || {}).map(([k, t]) => fact(`team-${k}`, t.title, t.name)),
    site.pricing && fact("price-range", "Price range for a plan for one joint", `${site.pricing.from} to ${site.pricing.to}`, `On this ${site.sample ? "example " : ""}site a plan for one joint runs from ${site.pricing.from} to ${site.pricing.to}.${site.sample ? " That is a sample. Each practice shows its own range." : ""}`),
    site.reviews && fact("reviews", "Review score", `${site.reviews.score} from ${site.reviews.count} reviews`),
    ...Object.entries(site.stats || {}).map(([k, v]) => fact(`figure-${k}`, `Figure shown for ${k}`, v)),
    ...(site.referrers || []).map((r) => fact(`referrer-${r.slug}`, "Referring provider with a private page", `${r.name}${r.practice ? ", " + r.practice : ""}`)),
  ].filter(Boolean);
  facts.push({ id: "booking", label: "Booking calendar", value: site.booking && (site.booking.calendarUrl || site.booking.embedHtml) ? "connected" : "not connected; the booking page shows a sample calendar and a call-back form", status: "real", say: site.booking && (site.booking.calendarUrl || site.booking.embedHtml) ? "The booking calendar on this site is connected." : "The calendar on this example is a sample. On a real site the practice's own calendar sits in that spot." });
  facts.push({ id: "programs", label: "Programs switched on", value: Object.entries(site.modules || {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "regenerative care only", status: "real", say: "" });

  const meta = { site: site.name, base, variant: variant.path || "", design_version: site.fixedTheme || "", sample: !!site.sample, generated: new Date().toISOString().slice(0, 10), pages: outPages.length, sections: outPages.reduce((n, p) => n + p.sections.length, 0), questions: qa.length };
  const on = (i) => !i.module || (site.modules && site.modules[i.module]);
  const menu = (site.nav || []).filter(on).map((i) => ({ label: i.label, target: String(i.href).replace(/\.html$/, ""), items: (i.children || []).filter(on).map((c) => ({ label: c.label, target: String(c.href).replace(/\.html(?=#|$)/, "") })) }));
  const header = { menu, always_visible: [`the ${site.bookLabel} button at the top right opens the booking page`, `the phone number ${site.phone} at the top right (a round phone button on small screens)`, "the practice name at the top left goes to the home page"], on_a_phone: "the menu is behind the three-line button at the top right, and a bar at the bottom of the screen has the booking button and a call button" };
  const light = (p) => ({ slug: p.slug, name: p.name, url: p.url, title: p.title, heading: p.heading, purpose: p.purpose, audience: p.audience, reach: p.reach, sections: p.sections.map((s) => ({ id: s.id, target: s.target, link: s.link, label: s.label, heading: s.heading, summary: s.summary, spots: s.spots, questions: s.questions_on_page.map((f) => ({ id: f.id, target: f.target, q: f.q })) })) });
  const guardrails = Object.assign({ never_say: [], always: [], refusals: [] }, notes.guardrails || {});
  const sampleLine = site.sample ? `${site.name} is a fictional sample practice. Its names, phone number, address, prices, figures, reviews and patient stories are invented so the example site looks finished. They are samples, never facts.` : "";

  const dir = path.join(outDir, "guide");
  fs.mkdirSync(path.join(dir, "topics"), { recursive: true });
  const written = [];
  const put = (file, body, what) => { const text = typeof body === "string" ? body : JSON.stringify(body, null, 1) + "\n"; fs.writeFileSync(path.join(dir, file), text); written.push({ file: "guide/" + file, what, bytes: Buffer.byteLength(text), sha1: crypto.createHash("sha1").update(text).digest("hex") }); };
  const csv = (rows) => rows.map((r) => r.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
  const ownQa = qa.filter((x) => x.voice === "own"), quoteQa = qa.filter((x) => x.voice === "quote");

  put("site-map.json", { meta, how_to_point: `Every section has a target such as "knees#cost". Run SiteGuide.go(target) on the page, or give the visitor the "link", which opens the page at that section and highlights it. In speech, use "reach": it says where the page is in words.`, moved, header, pages: outPages.map(light) }, "Every page, section, marked spot and on-page question, with the address that opens it");
  put("facts.json", { meta, note: sampleLine, facts }, "One record per fact (phone, names, prices, figures), each marked sample or real, with a sentence to say");
  put("checklist.json", { meta, the_practice_replaces: replaceList, must_stay: keepList }, "What a practice supplies or replaces, and what must never come off the site");
  put("guardrails.json", { meta, rules: notes.rules || [], ...guardrails }, "Rules, phrases never to say, lines to say, and what to say when declining");
  put("tours.json", { meta, how_to_use: `A tour is a walk through the site. Say each line, then show its target (SiteGuide.go), then wait for the visitor before the next step.`, tours }, "Spoken walk-throughs, one line and one place per step");
  put("questions.json", { meta, voices: { own: `Answers in ${name}'s own voice, written to be spoken.`, quote: "Answers the website itself gives patients. Quote them; do not rephrase or add to them." }, questions: qa }, "Every question and answer, with where to show it");
  put("questions.csv", csv([["id", "audience", "topic", "question", "spoken_answer", "show", "link"], ...ownQa.map((x) => [x.id, x.audience, x.topic, x.q, x.say, x.show, x.link])]), `Questions in ${name}'s own voice, one per row`);
  put("questions-simple.csv", csv([["question", "answer"], ...ownQa.map((x) => [x.q, x.say])]), "The same, two columns, for importers that take only a question and an answer");
  put("questions-on-site.csv", csv([["id", "question", "answer_as_written_on_the_site", "show", "link"], ...quoteQa.map((x) => [x.id, x.q, x.say, x.show, x.link])]), "The questions the website answers for patients, word for word");
  put("tests.json", { meta, how_to_use: `Ask ${name} each question out loud or in the chat box. A pass: she says the things in expect_says, says none of must_not_say, and (if she can act on the page) lands on expect_show.`, tests }, "Questions to try the assistant with, and what a pass looks like");
  put("tests.csv", csv([["id", "group", "ask", "expect_show", "expect_says", "must_not_say"], ...tests.map((t) => [t.id, t.group, t.ask, t.expect_show, t.expect_says.join(" | "), t.must_not_say.join(" | ")])]), "The same tests as a sheet");
  put("pages.txt", outPages.map((p) => p.url).join("\n") + "\n", "The address of every page, one per line");
  put("links.txt", outPages.flatMap((p) => [`${p.name}\t${p.url}`, ...p.sections.map((s) => `${p.name} › ${s.label || s.heading}\t${s.link}`)]).join("\n") + "\n", "A ready link for every section of every page");

  // ---- every word on every page, once. Blocks that repeat across pages (the small print, the closing band) are
  //      printed where they first appear and referred to afterwards, so a learner does not weigh them thirty times.
  const md = [`# ${site.name}: every page of this website`, "", `Generated ${meta.generated} from the site itself. ${meta.pages} pages, ${meta.sections} sections.`, "", sampleLine ? `**${sampleLine}**` : "", ""];
  const seen = new Map();
  for (const p of outPages) {
    md.push(`## The ${p.name} page`, "", `- Address: ${p.url}`, `- How to get there: ${cap(p.reach)}.`, `- What it is for: ${p.purpose}`, `- Who reads it: ${p.audience}`, "");
    for (const s of p.sections) {
      const body = s.text || s.summary;
      const key = crypto.createHash("sha1").update(body).digest("hex");
      md.push(`### ${p.name} › ${s.label || s.heading || s.id} (${s.target})`, "");
      if (body.length > 200 && seen.has(key)) md.push(`The same text as ${seen.get(key)}.`, "");
      else { if (body.length > 200) seen.set(key, `${p.name} › ${s.label || s.heading || s.id}`); md.push(s.heading && s.heading !== s.label ? `Heading: ${s.heading}` : "", body, ""); }
    }
  }
  put("knowledge.md", md.filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n") + "\n", "Every word on every page, in one Markdown document");

  // ---- small topic files (Markdown, each with a .txt twin) and one compact document made of them. Some assistants
  //      take a handful of short files, some take one upload, some take pasted text: these cover all three.
  const topics = [];
  const topic = (file, title, lines) => topics.push({ file, title, body: lines.filter((x, i, a) => x !== null && x !== undefined && !(x === "" && a[i - 1] === "")).join("\n").trim() });
  topic("about-this-site", `About the ${site.name} website`, [notes.summary || "", "", sampleLine, "", ...(notes.about || []).flatMap((x) => [x, ""]), "The facts shown on this site:", ...facts.filter((f) => f.status === "sample").map((f) => `- ${f.label}: ${f.value} (sample)`)]);
  topic("getting-around", `Getting around the ${site.name} website`, [
    "The header is at the top of every page. From left to right it has the practice name, which goes to the home page; the menu; the phone number; and the booking button.", "",
    ...menu.map((i) => `The menu item "${i.label}"${i.items.length ? ` opens a list: ${i.items.map((c) => c.label).join(", ")}.` : " goes straight to its page."}`), "",
    `On a phone ${header.on_a_phone}.`, "", ...(notes.getting_around || []).flatMap((x) => [x, ""]),
    "Where each page is:", ...outPages.map((p) => `- The ${p.name} page: ${p.reach}.`),
  ]);
  topic("pages", `What each page of the ${site.name} website is for`, outPages.flatMap((p) => [`The ${p.name} page. ${p.purpose} It is read by ${p.audience}. You reach it from ${p.reach}. Its parts, in order: ${p.sections.filter((x) => x.kind === "section" || x.kind === "top").map((x) => x.label || x.heading).filter(Boolean).join("; ")}.`, ...p.owner_notes.map((n) => `For the owner: ${n}`), ""]));
  for (const t of notes.topics || []) topic(t.file, t.title, [].concat(t.body || []).flatMap((x) => [x, ""]));
  if (tours.length) topic("tours", "Walk-throughs of the website", tours.flatMap((t) => [`${t.title}:`, ...t.steps.map((s, i) => `${i + 1}. ${s.say}`), ""]));
  const replaceRows = outPages.flatMap((p) => p.replace.map((r) => `- On the ${p.name} page: ${r}`));
  if (replaceList.length || replaceRows.length) topic("what-the-practice-replaces", "What a practice replaces with its own details", [...replaceList.map((r) => `- ${r.id}. ${r.item}. ${r.say !== r.item ? r.say : ""}`), "", ...replaceRows]);
  const keepRows = outPages.flatMap((p) => p.keep.map((r) => `- On the ${p.name} page: ${r}`));
  if (keepList.length || keepRows.length) topic("what-must-stay", "What must stay on the website", [...keepList.map((r) => `- ${r.id}. ${r.item}. ${r.say !== r.item ? r.say : ""}`), "", ...keepRows]);
  const ownerQa = ownQa.filter((x) => x.source !== "generated");
  if (ownerQa.length) topic("questions-from-owners", "Questions practice owners ask about the website", ownerQa.flatMap((x) => [`Question: ${x.q}`, `Answer: ${x.say}${x.show ? ` (On the site: the ${(outPages.find((p) => p.slug === x.show.split("#")[0]) || {}).name || x.show} page.)` : ""}`, ""]));
  if (quoteQa.length) topic("questions-on-the-site", "Questions the website itself answers for patients (quote these as written)", quoteQa.flatMap((x) => [`Question: ${x.q}`, `The site's answer: ${x.say}`, ""]));
  if ((notes.glossary || []).length || (notes.pronunciation || []).length) topic("words", "Words used on the website, in plain language", [...(notes.glossary || []).map((g) => `- ${g.term}: ${g.plain}`), "", ...(notes.pronunciation || []).map((g) => `- Say "${g.word}" as: ${g.say}`)]);
  if ((notes.rules || []).length) topic("rules", `Rules for ${name}`, [...notes.rules.map((r) => `- ${r}`), "", ...guardrails.refusals.map((r) => `- When ${r.when}: say "${r.say}"`)]);
  const plainText = (t) => t.replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/^- /gm, "• ");
  for (const t of topics) {
    const doc = `# ${t.title}\n\n${t.body}\n`;
    put(`topics/${t.file}.md`, doc, t.title);
    put(`topics/${t.file}.txt`, plainText(doc), t.title + " (plain text)");
  }
  // The short form: everything except the word-for-word patient questions, which live in their own file.
  const compactDoc = [`${site.name}: the website, for ${name}`, `Generated ${meta.generated}. This one document is the short form of what ${name} needs to know about the site.`, sampleLine, ...topics.filter((t) => t.file !== "questions-on-the-site").map((t) => `\n==== ${t.title.toUpperCase()} ====\n\n${plainText(t.body)}`)].filter(Boolean).join("\n\n") + "\n";
  put("knowledge.txt", compactDoc, "The short form of everything, in one plain document");
  put("knowledge.json", { meta, facts, rules: notes.rules || [], guardrails, glossary: notes.glossary || [], say_it_like_this: notes.pronunciation || [], header, the_practice_replaces: replaceList, must_stay: keepList, tours, pages: outPages, questions: qa }, "Everything as data");

  // ---- tool definitions for assistants that can act on the page (JSON Schema, the shape most platforms use)
  put("tools.json", {
    meta,
    how_to_use: "Each tool maps to a function on window.SiteGuide, which is on every page of the site. Register them as client-side (browser) tools on the assistant and call the function named in \"runs\". They only move the visitor around this site. If the platform cannot run client tools, the assistant gives directions in words (the \"reach\" of each page) or sends the \"link\" from site-map.json. Say the sentence first, then act, then say what is now on screen.",
    tools: [
      { name: "go_to", runs: "SiteGuide.go(target)", description: "Take the visitor to a page of this website, and to one section of it if given. Use it when the visitor asks where something is or asks to be shown something. The assistant stays on screen while the page changes.", parameters: { type: "object", properties: { target: { type: "string", description: "A page slug, or page#section. Page slugs: " + outPages.map((p) => p.slug).join(", ") + ". Section ids are listed per page in site-map.json. Examples: knees, knees#cost, book#calendar." } }, required: ["target"] } },
      { name: "show_section", runs: "SiteGuide.show(section)", description: "Scroll to a section, a marked spot or a question on the page the visitor is on, and highlight it for a few seconds. A question opens.", parameters: { type: "object", properties: { section: { type: "string", description: "An id on the current page, for example cost." } }, required: ["section"] } },
      { name: "where_am_i", runs: "SiteGuide.where()", description: "Find out which page and which section the visitor is looking at right now, whether they are on a phone layout, and what other sections that page has.", parameters: { type: "object", properties: {} } },
      { name: "find_on_site", runs: "SiteGuide.find(query)", description: "Look up the best places on the site for a word or a question. Returns targets that go_to accepts.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
      { name: "point_at", runs: "SiteGuide.point(what)", description: "Show where something is in the header by highlighting it: a menu item, the booking button, the phone number, or the practice name.", parameters: { type: "object", properties: { what: { type: "string", description: "One of: book, call, home, footer, or menu:<label> such as menu:Where it hurts, or menu:Where it hurts > Knees." } }, required: ["what"] } },
      { name: "read_section", runs: "SiteGuide.read(target)", description: "Get the words of a section as they appear on the page, to quote them accurately.", parameters: { type: "object", properties: { target: { type: "string", description: "page#section, or a section id on the current page." } }, required: ["target"] } },
      { name: "show_samples", runs: "SiteGuide.samples(on)", description: "Outline every sample detail on the page in view, so the owner can see what they will replace with their own. Returns how many there are.", parameters: { type: "object", properties: { on: { type: "boolean" } }, required: ["on"] } },
      { name: "start_tour", runs: "SiteGuide.tour(id)", description: "Get the steps of a walk-through: for each step a line to say and a place to show. Tour ids: " + (tours.map((t) => t.id).join(", ") || "none yet") + ".", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
      { name: "go_back", runs: "SiteGuide.back()", description: "Go back to what the visitor was looking at before.", parameters: { type: "object", properties: {} } },
      { name: "list_pages", runs: "SiteGuide.pages()", description: "List every page of the site with how to reach it and its sections.", parameters: { type: "object", properties: {} } },
    ],
  }, "The actions the assistant can take on the page, as tool definitions");

  // ---- the brief for whoever configures the assistant
  const briefSrc = path.join(SRC, "brief.md");
  const extra = Object.assign({}, site, { guideBase: base + "guide/", siteBase: base });
  const briefParts = (text) => text.replace("{{rules}}", () => (notes.rules || []).map((r) => `- ${r}`).join("\n")).replace("{{refusals}}", () => guardrails.refusals.map((r) => `- When ${r.when}: "${r.say}"`).join("\n")).replace("{{tours}}", () => tours.map((t) => `- ${t.id}: ${t.title}`).join("\n"));
  if (fs.existsSync(briefSrc)) put("brief.md", fill(briefParts(fs.readFileSync(briefSrc, "utf8")), extra, "src/guide/brief.md"), "Who the assistant is, how she speaks, what she must never say: her instructions");
  const shortSrc = path.join(SRC, "brief-short.txt");
  if (fs.existsSync(shortSrc)) put("brief-short.txt", fill(briefParts(fs.readFileSync(shortSrc, "utf8")), extra, "src/guide/brief-short.txt"), "The same brief in under 1,500 characters, for a small instructions box");

  // ---- the runtime the assistant can call, with a compact copy of the map inside it
  const compact = { base, name: site.name, assistant: name, keepAlive: !(site.assistant && site.assistant.keepAlive === false), moved, pages: outPages.map((p) => ({ s: p.slug, n: p.name, t: p.title, r: p.reach, p: clip(p.purpose, 160), x: p.sections.map((s) => [s.id, s.label || s.heading, clip([s.heading, s.items.join(" "), s.summary].join(" "), 220)]), m: p.sections.flatMap((s) => [...s.spots.map((x) => [x.id, x.label]), ...s.questions_on_page.map((f) => [f.id, f.q])]) })), qa: qa.filter((x) => x.show).map((x) => [x.q + " " + x.also_asked.join(" "), x.show]), starters, tours: tours.map((t) => ({ id: t.id, title: t.title, steps: t.steps })) };
  put("guide.js", `window.__SITE_GUIDE__=${JSON.stringify(compact)};\n${fs.readFileSync(path.join(SRC, "runtime.js"), "utf8")}`, "The script on every page that lets the assistant move the visitor around (window.SiteGuide)");

  // ---- every page says what it is (for an assistant reading the page it is on), and gets an assistant-free copy,
  //      view-<page>.html, which the runtime shows inside a frame so the assistant stays put while the site changes
  //      underneath her. In the copies, links between pages point at the other copies.
  const known = new Set(outPages.map((p) => p.slug));
  for (const p of outPages) {
    const file = path.join(outDir, `${p.slug}.html`);
    if (!fs.existsSync(file)) continue;
    const ctx = { page: p.slug, name: p.name, title: p.title, purpose: p.purpose, audience: p.audience, reach: p.reach, sample: !!site.sample, sections: p.sections.map((x) => ({ id: x.id, label: x.label || x.heading })) };
    const html = fs.readFileSync(file, "utf8")
      .replace("</head>", () => `<meta name="guide:page" content="${p.slug}">\n  <script type="application/json" id="site-guide-page">${JSON.stringify(ctx).replace(/</g, "\\u003c")}</script>\n</head>`)
      .replace(/<body class="/, `<body data-guide-page="${p.slug}"${site.sample ? ' data-guide-sample="1"' : ""} class="`);
    fs.writeFileSync(file, html);
    const view = html
      .replace(/<!--assistant:start-->[\s\S]*?<!--assistant:end-->/g, "")
      .replace('<html lang="en"', '<html lang="en" data-view="1"')
      .replace("</head>", () => `<link rel="canonical" href="${p.url}">\n</head>`)
      .replace(/\b(href|data-thanks)="(\.\/|[a-z0-9-]+\.html)([?#][^"]*)?"/g, (m, attr, f, rest) => { const slug = f === "./" ? "index" : f.replace(/\.html$/, ""); return known.has(slug) ? `${attr}="view-${slug}.html${rest || ""}"` : m; });
    fs.writeFileSync(path.join(outDir, `view-${p.slug}.html`), view);
  }
  // The assistant's crawler should find every page, including the ones kept out of an ordinary sitemap.
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${outPages.map((p) => `  <url><loc>${p.url}</loc></url>`).join("\n")}\n</urlset>\n`);

  // ---- llms.txt at the root of the variant: the short index, with the long form beside it
  const llms = [`# ${site.name}${site.sample ? " (sample site)" : ""}`, "", `> ${notes.summary || site.description || ""}`, "", sampleLine, "", "## Pages", "", ...outPages.map((p) => `- [${p.name}](${p.url}): ${clip(p.purpose, 180)}`), "", "## For an assistant", "", `- [Brief and rules](${base}guide/brief.md)`, `- [The short form, one document](${base}guide/knowledge.txt)`, ...topics.map((t) => `- [${t.title}](${base}guide/topics/${t.file}.md)`), `- [Questions and spoken answers](${base}guide/questions.json)`, `- [Site map with every section](${base}guide/site-map.json)`, `- [Tools the assistant can call](${base}guide/tools.json)`, `- [Test questions](${base}guide/tests.json)`, "", "## Optional", "", `- [Every word on every page](${base}guide/knowledge.md)`, ""];
  fs.writeFileSync(path.join(outDir, "llms.txt"), llms.filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n"));
  fs.writeFileSync(path.join(outDir, "llms-full.txt"), compactDoc + "\n" + fs.readFileSync(path.join(dir, "knowledge.md"), "utf8"));
  put("manifest.json", { meta, files: written.concat([{ file: "llms.txt", what: "The index of the pack" }, { file: "llms-full.txt", what: "The short form followed by every page" }, { file: "sitemap.xml", what: "Every page, for a crawler" }]) }, "What is in the pack");

  // ---- the owner's guide page lists the pages and a few questions from the same record
  for (const f of ["site-guide.html", "view-site-guide.html"]) {
    const guidePage = path.join(outDir, f);
    if (!fs.existsSync(guidePage)) continue;
    const pre = f.startsWith("view-") ? "view-" : "";
    const groups = [["patients", "Pages a patient reads"], ["patients sent by a provider", "Pages for a patient sent by a provider"], ["providers", "Pages for providers who refer or partner"], ["practice owner", "Pages for you, the owner"], ["everyone", "The small print"]];
    const knownAud = new Set(groups.map((g) => g[0]));
    const rows = (list) => list.map((p) => `<tr><td><a href="${pre}${p.slug}.html"><b>${esc(p.name)}</b></a></td><td>${esc(p.purpose)}</td><td>${esc(cap(p.reach))}.</td></tr>`).join("");
    const tables = groups.map(([aud, title]) => { const list = outPages.filter((p) => (knownAud.has(p.audience) ? p.audience : "patients") === aud); return list.length ? `<h3 class="guide-table__title">${title}</h3><div class="guide-table"><table><thead><tr><th>Page</th><th>What it is for</th><th>How to get there</th></tr></thead><tbody>${rows(list)}</tbody></table></div>` : ""; }).join("");
    const asks = starters.map((s) => `<li><button type="button" class="guide-ask" data-guide-go="${esc(s.show)}"><span>${esc(s.q)}</span></button></li>`).join("");
    const list = (items) => items.map((r) => `<li><b>${esc(r.item)}</b><span>${esc(r.say !== r.item ? r.say : "")}</span>${r.where.length ? `<button type="button" class="link-arrow" data-guide-go="${esc(r.where[0])}">Show me</button>` : ""}</li>`).join("");
    let page = fs.readFileSync(guidePage, "utf8");
    page = page.replace("<!--guide:pages-->", () => tables).replace("<!--guide:starters-->", () => asks).replace("<!--guide:replace-->", () => list(replaceList)).replace("<!--guide:keep-->", () => list(keepList)).replace(/<!--guide:count:(\w+)-->/g, (_, k) => String(meta[k] ?? ""));
    fs.writeFileSync(guidePage, page);
  }
  for (const w of warnings) console.warn("site guide warning: " + w);
  return `${variant.path || "root"}/guide: ${meta.pages} pages, ${meta.sections} sections, ${ownQa.length} spoken answers + ${quoteQa.length} quoted from the site, ${tours.length} tours, ${tests.length} tests, ${topics.length} topic files, short form ${Math.round(compactDoc.length / 1000)}k characters${warnings.length ? `, ${warnings.length} WARNINGS` : ""}`;
}

module.exports = { annotate, write, strip, slugify };
