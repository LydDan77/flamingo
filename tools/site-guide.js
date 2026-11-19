#!/usr/bin/env node
// Site guide: makes a built site learnable and steerable by a talking assistant (Ava on the Dr. Demo site).
// build.js calls annotate() on every page of a variant that has `guide: true`, then write() once for that variant.
//   annotate()  gives every section a stable id and records what is on the page: headings, questions, buttons, text.
//   write()     merges that record with the hand-written notes in src/guide/ (site.json, pages/<slug>.json, brief.md)
//               and writes the knowledge pack to dist/<variant>/guide/, plus llms.txt at the variant root. It stops
//               the build when a note points at a page or a section that does not exist, so the pack cannot drift.
// Facts such as the phone number, names and prices are never typed into the notes: they are written as {{site.phone}}
// and resolved from site.config.js here. The format of every file is described in docs/AVA-DR-DEMO.md.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "guide");
const registry = new Map(); // outDir -> { pages: [] }

// ---------------------------------------------------------------------------------------------------------- text
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", sect: "§", copy: "©", rarr: "→", times: "×" };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : " "; }
  return Object.prototype.hasOwnProperty.call(ENT, e.toLowerCase()) ? ENT[e.toLowerCase()] : " ";
});
const strip = (h) => decode(String(h || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, " ").replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/summary|\/dt|\/dd|\/tr)\b[^>]*>/gi, " $& ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").replace(/ ([.,;:!?])/g, "$1").trim();
const slugify = (s, words = 6) => strip(s).toLowerCase().replace(/['’]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").filter(Boolean).slice(0, words).join("-");
const first = (html, re) => { const m = html.match(re); return m ? strip(m[1]) : ""; };
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)).replace(/[,;:]$/, "") + "…");
const getPath = (obj, dotted) => dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
// The fictional figures on a sample site are wrapped in a SAMPLE stamp; the stamp is page furniture, not content.
const STAMP = /<span class="(?:sample|ph-tag)"[^>]*>[\s\S]*?<\/span>/gi;

// ------------------------------------------------------------------------------------------------------ annotate
/** Give every section of a built page a stable id, mark it for the guide, and record the page. Returns the new HTML. */
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
    const clean = inner.replace(STAMP, " ");
    const label = first(clean, /<(?:span|p)\b[^>]*class="[^"]*\b(?:eyebrow|hero__kicker)\b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|p)>/);
    const heading = first(clean, /<h1\b[^>]*>([\s\S]*?)<\/h1>/) || first(clean, /<h2\b[^>]*>([\s\S]*?)<\/h2>/) || first(clean, /<h3\b[^>]*>([\s\S]*?)<\/h3>/);
    let id = (attrs.match(/\bid="([^"]*)"/) || [])[1];
    if (!id) {
      id = claim(kind === "section" ? slugify(label || heading) || slugify(strip(clean), 4) || "more" : kind);
      attrs = attrs.replace(/\s*$/, "") + ` id="${id}"`;
    }
    const faqs = [];
    clean.replace(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g, (_, q, a) => { const qq = strip(q), aa = strip(a); if (qq && aa) faqs.push({ q: qq, a: aa }); return ""; });
    const buttons = [];
    clean.replace(/<a\b([^>]*\bclass="[^"]*\b(?:btn|link-arrow|pill)\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g, (_, a, t) => { const href = (a.match(/\bhref="([^"]*)"/) || [])[1]; const text = strip(t); if (href && text && !buttons.some((b) => b.href === href && b.text === text)) buttons.push({ text, href }); return ""; });
    const items = [];
    clean.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g, (_, t) => { const s = strip(t); if (s && s !== heading && items.length < 14) items.push(s); return ""; });
    const lead = first(clean, /<p\b[^>]*class="[^"]*\blead\b[^"]*"[^>]*>([\s\S]*?)<\/p>/) || first(clean, /<p\b(?![^>]*class="[^"]*\b(?:hero__kicker|eyebrow|small)\b)[^>]*>([\s\S]*?)<\/p>/);
    const named = label || (kind === "small-print" ? "The small print" : kind === "next-step" ? "The next step" : "");
    sections.push({ id, kind, label: named, heading: heading || named || clip(strip(clean), 60), summary: clip(lead, 320), items, faqs, buttons, form: /<form\b/.test(inner), text: strip(clean) });
    return `<section${attrs} data-guide="${kind}">${inner}</section>`;
  });
  // The few top-level blocks that are not sections but are worth pointing at.
  for (const [cls, id, label] of [["reviews", "reviews", "Patient reviews"], ["stats-band", "numbers", "The practice in numbers"]]) {
    main = main.replace(new RegExp(`<div class="${cls}\\b([^"]*)"((?:(?!\\bid=)[^>])*)>`), (all, rest, attrs) => {
      if (used.has(id)) return all;
      used.add(id);
      sections.push({ id, kind: "section", label, heading: label, summary: "", items: [], faqs: [], buttons: [], form: false, text: "" });
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

/** Where a page sits in the menus, in words a person can follow ("Where it hurts, then Knees"). */
function menuPaths(site) {
  const on = (i) => !i.module || (site.modules && site.modules[i.module]);
  const paths = {};
  const put = (href, text) => { const slug = String(href || "").split(/[?#]/)[0].replace(/\.html$/, ""); if (slug && !/[?#]/.test(String(href)) && !paths[slug]) paths[slug] = text; };
  for (const item of (site.nav || []).filter(on)) {
    for (const c of (item.children || []).filter(on)) put(c.href, `the top menu: ${item.label}, then ${c.label}`);
    if (!(item.children || []).length) put(item.href, `the top menu: ${item.label}`);
  }
  put("book.html", `the ${site.bookLabel} button at the top right of every page`);
  for (const col of site.footer || []) for (const l of (col.links || []).filter(on)) put(l.href, `the footer, under ${col.title}: ${l.label}`);
  for (const [href, label] of [["privacy-policy.html", "Privacy Policy"], ["terms-conditions.html", "Terms of Service"], ["disclaimer.html", "Disclaimer"]]) put(href, `the bottom line of the footer: ${label}`);
  put("index.html", "the practice name at the top left of every page");
  return paths;
}

// --------------------------------------------------------------------------------------------------------- write
function write({ outDir, site, variant, baseUrl }) {
  const reg = registry.get(outDir) || { pages: [] };
  registry.delete(outDir);
  const pages = reg.pages.filter((p) => p.slug !== "404").sort((a, b) => (a.slug === "index" ? -1 : b.slug === "index" ? 1 : a.slug.localeCompare(b.slug)));
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const base = baseUrl.replace(/\/$/, "") + "/";
  const notes = readJson(path.join(SRC, "site.json"), site) || {};
  const paths = menuPaths(site);
  const problems = [];
  const name = (site.assistant && site.assistant.name) || "the assistant";

  /** "knees#cost" | "knees" | "#cost" (with a page for context) -> { page, section } or null, recording why not. */
  const resolve = (target, where, ctxSlug) => {
    if (!target) return null;
    const [pg, sec] = String(target).split("#");
    const slug = (pg || ctxSlug || "").replace(/\.html$/, "") || "index";
    const page = bySlug.get(slug);
    if (!page) { problems.push(`${where}: "${target}" names a page that is not in this build`); return null; }
    if (sec && !page.sections.some((s) => s.id === sec)) { problems.push(`${where}: "${target}" names a section that is not on ${slug} (it has: ${page.sections.map((s) => s.id).join(", ")})`); return null; }
    return { page: slug, section: sec || "" };
  };
  const targetOf = (t) => (t ? t.page + (t.section ? "#" + t.section : "") : "");
  const linkOf = (t) => (t ? base + (t.page === "index" ? "" : t.page) + (t.section ? `?show=${t.section}#${t.section}` : "") : "");

  // ---- pages: the record from the build plus the hand-written note for each
  const qa = [];
  const addQa = (item, where, ctxSlug) => {
    if (!item || !item.q || !(item.say || item.text)) { problems.push(`${where}: a question needs "q" and "say"`); return; }
    const t = resolve(item.show, `${where} (“${clip(item.q, 50)}”)`, ctxSlug);
    qa.push({
      id: `q${String(qa.length + 1).padStart(3, "0")}`,
      audience: item.audience || "partner",
      topic: item.topic || "",
      q: item.q,
      also_asked: item.alt || [],
      say: item.say || item.text,
      text: item.text || item.say,
      show: targetOf(t),
      link: linkOf(t),
      source: item.source || (ctxSlug ? `page:${ctxSlug}` : "site"),
      sample: !!item.sample,
    });
  };
  const outPages = pages.map((p) => {
    const note = readJson(path.join(SRC, "pages", `${p.slug}.json`), site) || {};
    const reach = note.reach || paths[p.slug] || (() => { const from = pages.filter((o) => o.slug !== p.slug && o.links.includes(p.slug)).slice(0, 3).map((o) => o.title); return from.length ? `a link on: ${from.join("; ")}` : "a direct link only (it is not in the menus)"; })();
    for (const q of note.questions || []) addQa(q, `src/guide/pages/${p.slug}.json`, p.slug);
    const sectionNotes = note.sections || {};
    for (const id of Object.keys(sectionNotes)) if (!p.sections.some((s) => s.id === id)) problems.push(`src/guide/pages/${p.slug}.json: sections.${id} is not on the page (it has: ${p.sections.map((s) => s.id).join(", ")})`);
    return {
      slug: p.slug,
      url: base + p.url,
      title: p.title,
      description: p.description,
      heading: p.h1,
      purpose: note.purpose || p.description,
      audience: note.audience || "patients",
      reach,
      owner_notes: note.owner_notes || [],
      replace: note.replace || [],
      keep: note.keep || [],
      in_menus: !!paths[p.slug],
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
        buttons: s.buttons,
        has_form: s.form,
        questions_on_page: s.faqs,
        text: s.text,
      })),
    };
  });
  // The site's own questions and answers (the FAQ blocks patients read) are knowledge too.
  for (const p of outPages) for (const s of p.sections) for (const f of s.questions_on_page) addQa({ audience: "patient", topic: "on the site", q: f.q, say: clip(f.a, 420), text: f.a, show: s.target, source: `faq:${p.slug}` }, `faq on ${p.slug}`, p.slug);
  for (const q of notes.questions || []) addQa(q, "src/guide/site.json");
  // One "where is it" answer per page, so the pack always covers getting around.
  for (const p of outPages) {
    if (qa.some((x) => x.topic === "getting around" && x.show === p.slug)) continue;
    addQa({ audience: "both", topic: "getting around", q: `Where is the ${p.title} page?`, alt: [`How do I get to ${p.title}?`, `Take me to ${p.title}.`], say: `You get there from ${p.reach}. I can take you there now.`, show: p.slug, source: "generated" }, "generated", p.slug);
  }
  const tests = (notes.tests || []).map((t, i) => { const r = resolve(t.expect_show, `src/guide/site.json tests[${i}]`); return { id: `t${String(i + 1).padStart(2, "0")}`, ask: t.ask, expect_show: targetOf(r), expect_says: t.expect_says || [], must_not_say: t.must_not_say || [], audience: t.audience || "partner" }; });
  for (const p of pages) if (!fs.existsSync(path.join(SRC, "pages", `${p.slug}.json`)) && fs.existsSync(path.join(SRC, "pages")) && fs.readdirSync(path.join(SRC, "pages")).length) problems.push(`src/guide/pages/${p.slug}.json is missing (every page needs a note)`);
  if (fs.existsSync(path.join(SRC, "pages"))) for (const f of fs.readdirSync(path.join(SRC, "pages"))) if (f.endsWith(".json") && !bySlug.has(f.replace(/\.json$/, "")) && !(variant.guideOptionalPages || []).includes(f.replace(/\.json$/, ""))) problems.push(`src/guide/pages/${f} has no page in this build`);
  if (problems.length) throw new Error(`site guide (${variant.path || "root"}): ${problems.length} problem(s)\n  - ${problems.join("\n  - ")}`);

  // ---- the practice, straight from the config (every figure on a sample site is fictional and says so)
  const practice = {
    name: site.name,
    sample: !!site.sample,
    phone: site.phone,
    email: site.email,
    address: site.address,
    hours: site.hours,
    town: site.town || "",
    who_answers_the_phone: site.coordinator ? `${site.coordinator.first}, ${site.coordinator.role}` : "",
    team: Object.values(site.team || {}).map((t) => `${t.name}, ${t.title}`),
    price_range_single_joint: site.pricing ? `${site.pricing.from} to ${site.pricing.to}` : "",
    booking: { page: base + "book", after_booking: base + "thank-you", calendar_connected: !!(site.booking && (site.booking.calendarUrl || site.booking.embedHtml)), provider: (site.booking && site.booking.provider) || "" },
    programs: Object.entries(site.modules || {}).filter(([, v]) => v).map(([k]) => k),
  };
  const meta = { site: site.name, base, variant: variant.path || "", design_version: site.fixedTheme || "", sample: !!site.sample, generated: new Date().toISOString().slice(0, 10), pages: outPages.length, sections: outPages.reduce((n, p) => n + p.sections.length, 0), questions: qa.length };
  const menu = (site.nav || []).filter((i) => !i.module || site.modules[i.module]).map((i) => ({ label: i.label, target: String(i.href).replace(/\.html$/, ""), items: (i.children || []).filter((c) => !c.module || site.modules[c.module]).map((c) => ({ label: c.label, target: String(c.href).replace(/\.html$/, "").replace(/\.html#/, "#") })) }));
  const light = (p) => ({ slug: p.slug, url: p.url, title: p.title, heading: p.heading, purpose: p.purpose, audience: p.audience, reach: p.reach, sections: p.sections.map((s) => ({ id: s.id, target: s.target, link: s.link, label: s.label, heading: s.heading, summary: s.summary })) });

  const dir = path.join(outDir, "guide");
  fs.mkdirSync(dir, { recursive: true });
  const put = (file, body) => fs.writeFileSync(path.join(dir, file), typeof body === "string" ? body : JSON.stringify(body, null, 1) + "\n");
  put("site-map.json", { meta, how_to_point: `Every section has a target such as "knees#cost". Call SiteGuide.go(target) on the page, or send the visitor the "link", which opens the page at that section and highlights it.`, header: { menu, always_visible: [`${site.bookLabel} button (top right) opens the booking page`, `the phone number ${site.phone} (top right; a round phone button on small screens)`, "the practice name (top left) goes to the home page"] }, pages: outPages.map(light) });
  put("knowledge.json", { meta, practice, rules: notes.rules || [], glossary: notes.glossary || [], say_it_like_this: notes.pronunciation || [], header: { menu }, pages: outPages, questions: qa });
  put("questions.json", { meta, questions: qa });
  put("questions.csv", "id,audience,topic,question,spoken_answer,show,link\n" + qa.map((x) => [x.id, x.audience, x.topic, x.q, x.say, x.show, x.link].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n") + "\n");
  put("tests.json", { meta, how_to_use: `Ask ${name} each question out loud or in the chat box. A pass: she says the things in expect_says, says none of must_not_say, and (if she can act on the page) lands on expect_show.`, tests });
  put("pages.txt", outPages.map((p) => p.url).join("\n") + "\n");

  // ---- one document for assistants that learn from a single upload
  const md = [];
  md.push(`# ${site.name}: everything on this website`, "", `Generated ${meta.generated} from the site itself. ${meta.pages} pages, ${meta.sections} sections, ${meta.questions} questions.`, "");
  if (site.sample) md.push(`**This is a sample site.** ${site.name} is a fictional practice. Its names, phone number, address, prices, figures, reviews and patient stories are invented so the site looks finished. Never present them as real. A partner's own site carries the partner's real details in the same places.`, "");
  md.push("## The practice at a glance", "", ...Object.entries({ Name: practice.name, Phone: practice.phone, Email: practice.email, Address: practice.address, Hours: practice.hours, "Who answers the phone": practice.who_answers_the_phone, Team: practice.team.join("; "), "Price range for a single joint": practice.price_range_single_joint, "Booking page": practice.booking.page }).filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}${site.sample && !/Booking/.test(k) ? " (sample)" : ""}`), "");
  if ((notes.rules || []).length) md.push("## Rules for the assistant", "", ...notes.rules.map((r) => `- ${r}`), "");
  md.push("## Getting around", "", "The header is on every page. From left to right: the practice name (goes home), the menu, the phone number, and the booking button.", "", ...menu.map((i) => `- **${i.label}**${i.items.length ? ": " + i.items.map((c) => c.label).join(", ") : ""}`), "");
  for (const p of outPages) {
    md.push(`## Page: ${p.title}`, "", `- Address: ${p.url}`, `- How to get there: ${p.reach}`, `- What it is for: ${p.purpose}`, `- Who reads it: ${p.audience}`);
    if (p.owner_notes.length) md.push(...p.owner_notes.map((n) => `- For the practice owner: ${n}`));
    if (p.replace.length) md.push(...p.replace.map((n) => `- The practice replaces: ${n}`));
    if (p.keep.length) md.push(...p.keep.map((n) => `- Must stay: ${n}`));
    md.push("");
    for (const s of p.sections) md.push(`### ${p.title} › ${s.label || s.heading || s.id} (${s.target})`, "", s.heading && s.heading !== s.label ? `Heading: ${s.heading}` : "", s.text || s.summary, "");
  }
  md.push("## Questions and answers", "");
  for (const x of qa) md.push(`**${x.q}**${x.also_asked.length ? ` (also: ${x.also_asked.join(" / ")})` : ""}`, "", x.text, x.show ? `Show: ${x.show}` : "", "");
  if ((notes.glossary || []).length) md.push("## Words", "", ...notes.glossary.map((g) => `- **${g.term}**: ${g.plain}${g.say ? ` (say: ${g.say})` : ""}`), "");
  put("knowledge.md", md.filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n") + "\n");

  // ---- the brief for whoever configures the assistant, and the runtime the assistant can call
  const briefSrc = path.join(SRC, "brief.md");
  if (fs.existsSync(briefSrc)) put("brief.md", fill(fs.readFileSync(briefSrc, "utf8"), Object.assign({}, site, { guideBase: base + "guide/", siteBase: base }), "src/guide/brief.md"));
  const compact = { base, name: site.name, assistant: name, pages: outPages.map((p) => ({ s: p.slug, t: p.title, r: p.reach, p: clip(p.purpose, 160), x: p.sections.map((s) => [s.id, s.label || s.heading, clip([s.heading, s.items.join(" "), s.summary].join(" "), 220)]) })), qa: qa.filter((x) => x.show).map((x) => [x.q + " " + x.also_asked.join(" "), x.show]), starters: notes.starters || [] };
  const runtime = fs.readFileSync(path.join(SRC, "runtime.js"), "utf8");
  put("guide.js", `window.__SITE_GUIDE__=${JSON.stringify(compact)};\n${runtime}`);

  // ---- llms.txt at the root of the variant: the short index, with the long form beside it
  const llms = [`# ${site.name}${site.sample ? " (sample site)" : ""}`, "", `> ${notes.summary || site.description || ""}`, "", site.sample ? "Everything about this practice is fictional. Names, numbers, prices, reviews and stories are samples." : "", "", "## Pages", "", ...outPages.map((p) => `- [${p.title}](${p.url}): ${clip(p.purpose, 180)}`), "", "## For an assistant", "", `- [Everything in one document](${base}guide/knowledge.md)`, `- [Site map with every section](${base}guide/site-map.json)`, `- [Questions and spoken answers](${base}guide/questions.json)`, `- [Brief and rules](${base}guide/brief.md)`, `- [Test questions](${base}guide/tests.json)`, ""];
  fs.writeFileSync(path.join(outDir, "llms.txt"), llms.filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n"));
  fs.writeFileSync(path.join(outDir, "llms-full.txt"), fs.readFileSync(path.join(dir, "knowledge.md")));

  // ---- the owner's guide page lists the pages and a few questions from the same record
  const guidePage = path.join(outDir, "site-guide.html");
  if (fs.existsSync(guidePage)) {
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const groups = [["patients", "Pages a patient reads"], ["patients sent by a provider", "Pages for a patient sent by a provider"], ["providers", "Pages for providers and partners"], ["practice owner", "Pages for you, the owner"], ["everyone", "Small print"]];
    const rows = (list) => list.map((p) => `<tr><td><a href="${p.slug === "index" ? "./" : p.slug + ".html"}"><b>${esc(p.title)}</b></a></td><td>${esc(p.purpose)}</td><td>${esc(p.reach.charAt(0).toUpperCase() + p.reach.slice(1))}</td></tr>`).join("");
    const known = new Set(groups.map((g) => g[0]));
    const tables = groups.map(([aud, title]) => { const list = outPages.filter((p) => (known.has(p.audience) ? p.audience : "patients") === aud); return list.length ? `<h3 class="guide-table__title">${title}</h3><div class="guide-table"><table><thead><tr><th>Page</th><th>What it is for</th><th>How to get there</th></tr></thead><tbody>${rows(list)}</tbody></table></div>` : ""; }).join("");
    const asks = (notes.starters || []).map((s) => `<li><button type="button" class="guide-ask" data-guide-go="${esc(s.show)}"><span>${esc(s.q)}</span></button></li>`).join("");
    let page = fs.readFileSync(guidePage, "utf8");
    page = page.replace("<!--guide:pages-->", () => tables).replace("<!--guide:starters-->", () => asks).replace(/<!--guide:count:(\w+)-->/g, (_, k) => String(meta[k] ?? ""));
    fs.writeFileSync(guidePage, page);
  }
  return `${variant.path || "root"}/guide: ${meta.pages} pages, ${meta.sections} sections, ${meta.questions} questions, ${tests.length} tests`;
}

module.exports = { annotate, write, strip, slugify };
