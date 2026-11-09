#!/usr/bin/env node
// Patient words: a lint for the pages a patient reads. For each page it counts the words we ban in patient-facing
// copy (jargon and AI-draft filler) against the words a patient actually uses (body parts, situations), and says
// whether body words outnumber jargon. Run alone (node tools/patient-words.js [dist]) for the full table; build.js
// prints the one-line summary after every build. The rules live in docs/PATIENT-WORDS.md.
"use strict";
const fs = require("fs");
const path = require("path");

const PATIENT_PAGES = /^(index|knees|hips|shoulders|back-and-neck|after-an-injury|before-surgery|from-[a-z-]+|contact|services|financing|journal(-[a-z-]+)?)\.html$/;
const BANNED = ["protocol", "biologic", "msc", "mesenchymal", "vesicle", "lab-guided", "candidacy", "journey", "elevate", "holistic", "telehealth", "modality", "cutting-edge", "state-of-the-art", "synergy", "leverage", "seamless", "empower", "optimiz", "unlock", "transform"];
const BODY = ["knee", "hip", "shoulder", "back", "neck", "stairs", "walk", "sleep", "garden", "surgery", "surgeon", "pain", "injury", "chair", "reach", "lift", "home", "price", "cost"];

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .toLowerCase();
}
function count(text, word) {
  const re = new RegExp("\\b" + word.replace(/[-]/g, "\\-") + "[a-z]*", "g");
  return (text.match(re) || []).length;
}

function report(dist, opts = {}) {
  const files = fs.readdirSync(dist).filter((f) => PATIENT_PAGES.test(f)).sort();
  const rows = files.map((f) => {
    const text = textOf(fs.readFileSync(path.join(dist, f), "utf8"));
    const jargon = {}; let j = 0;
    for (const w of BANNED) { const c = count(text, w); if (c) { jargon[w] = c; j += c; } }
    let b = 0; for (const w of BODY) b += count(text, w);
    return { page: f.replace(/\.html$/, ""), jargon: j, body: b, top: Object.entries(jargon).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([w, c]) => `${w} ${c}`).join(", "), pass: b > j };
  });
  const passing = rows.filter((r) => r.pass).length;
  if (opts.summary) {
    const worst = rows.filter((r) => !r.pass).map((r) => `${r.page} (${r.top})`).slice(0, 4).join("; ");
    console.log(`patient words: ${passing}/${rows.length} patient pages read in the patient's words${worst ? "; still heavy: " + worst : ""}`);
    return rows;
  }
  console.log("page".padEnd(26) + "jargon".padStart(7) + "body".padStart(6) + "  " + "verdict".padEnd(9) + "heaviest terms");
  for (const r of rows) console.log(r.page.padEnd(26) + String(r.jargon).padStart(7) + String(r.body).padStart(6) + "  " + (r.pass ? "ok" : "HEAVY").padEnd(9) + r.top);
  console.log(`\n${passing}/${rows.length} pages pass (body words outnumber banned words). Rules: docs/PATIENT-WORDS.md`);
  return rows;
}

module.exports = { report, BANNED, BODY };
if (require.main === module) report(process.argv[2] || path.join(__dirname, "..", "dist"));
