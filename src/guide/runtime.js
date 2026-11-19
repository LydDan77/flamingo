/* Site guide runtime. Loaded only on a site built with `guide: true`. It gives an assistant (or a person at the
   console) a few safe things to do on the page:

     SiteGuide.where()            which page and section the visitor is looking at
     SiteGuide.pages()            every page: slug, title, how to reach it, its sections
     SiteGuide.find("price")      the best places for a word or a question
     SiteGuide.go("knees#cost")   go to a page and section (scrolls and highlights; loads the page if needed)
     SiteGuide.show("cost")       highlight a section on this page
     SiteGuide.point("menu:Where it hurts")   show where something is in the header: a menu, "book", "call", "home"

   Targets are checked against the site's own page list, so nothing here can send a visitor off the site.
   An assistant inside an iframe can post { type: "site-guide", action: "go", target: "knees#cost", id: 1 } to the page
   and gets { type: "site-guide:result", id: 1, result } back. A link with ?show=<section> does the same on arrival. */
(function () {
  "use strict";
  var DATA = window.__SITE_GUIDE__ || { pages: [], qa: [], starters: [] };
  var doc = document, root = doc.documentElement;
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var here = (location.pathname.split("/").pop() || "").replace(/\.html$/, "") || "index";
  var bySlug = {};
  DATA.pages.forEach(function (p) { bySlug[p.s] = p; });

  function words(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9+ ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && !STOP[w]; }); }
  var STOP = { the: 1, and: 1, for: 1, how: 1, what: 1, where: 1, does: 1, can: 1, you: 1, your: 1, this: 1, that: 1, with: 1, are: 1, there: 1, page: 1, site: 1, website: 1, find: 1, show: 1, take: 1, see: 1, about: 1, get: 1, have: 1, from: 1, they: 1, will: 1, when: 1, who: 1, why: 1, into: 1, our: 1, its: 1, was: 1, has: 1, not: 1, any: 1, all: 1 };

  function parse(target) {
    if (target && typeof target === "object") return { page: String(target.page || here).replace(/\.html$/, ""), section: String(target.section || "") };
    var t = String(target || "").trim().replace(/^\.?\//, "");
    var bits = t.split("#");
    var pg = bits[0].split("?")[0].replace(/\.html$/, "");
    return { page: pg || (t.charAt(0) === "#" ? here : "index"), section: bits[1] || "" };
  }
  function urlOf(slug) { return slug === "index" ? "./" : slug + ".html"; }
  function known(t) {
    var p = bySlug[t.page];
    if (!p) return false;
    return !t.section || p.x.some(function (s) { return s[0] === t.section; });
  }

  var spotTimer = null;
  function spot(el, ms) {
    doc.querySelectorAll(".guide-spot").forEach(function (e) { e.classList.remove("guide-spot"); });
    if (!el) return;
    el.classList.add("guide-spot");
    clearTimeout(spotTimer);
    spotTimer = setTimeout(function () { el.classList.remove("guide-spot"); }, ms || 4500);
  }
  function show(id) {
    var el = doc.getElementById(String(id || "").replace(/^#/, ""));
    if (!el) return { ok: false, reason: "no section called " + id + " on this page" };
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    spot(el);
    return { ok: true, page: here, section: el.id };
  }
  function go(target) {
    var t = parse(target);
    if (!known(t)) return { ok: false, reason: "unknown target " + JSON.stringify(target) + "; use SiteGuide.find() or SiteGuide.pages()" };
    if (t.page === here) {
      if (t.section) return show(t.section);
      window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
      return { ok: true, page: here, section: "" };
    }
    var theme = new URLSearchParams(location.search).get("theme");
    var q = [];
    if (t.section) q.push("show=" + encodeURIComponent(t.section));
    if (theme) q.push("theme=" + encodeURIComponent(theme));
    location.href = urlOf(t.page) + (q.length ? "?" + q.join("&") : "") + (t.section ? "#" + t.section : "");
    return { ok: true, page: t.page, section: t.section, navigating: true };
  }

  function where() {
    var p = bySlug[here] || { s: here, t: doc.title, x: [] };
    var line = window.innerHeight * 0.35, cur = null;
    doc.querySelectorAll("[data-guide][id]").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom > 0) cur = el;
    });
    var sec = cur ? p.x.filter(function (s) { return s[0] === cur.id; })[0] : null;
    return { page: p.s, title: p.t, section: cur ? cur.id : "", section_label: sec ? sec[1] : "", sections: p.x.map(function (s) { return { id: s[0], label: s[1] }; }) };
  }
  function pages() {
    return DATA.pages.map(function (p) { return { page: p.s, title: p.t, reach: p.r, purpose: p.p, sections: p.x.map(function (s) { return { target: p.s + "#" + s[0], label: s[1] }; }) }; });
  }
  function find(query, limit) {
    var q = words(query), hits = {};
    if (!q.length) return [];
    function add(target, score, label) { if (score > 0 && (!hits[target] || hits[target].score < score)) hits[target] = { target: target, label: label, score: score }; }
    function overlap(text, weight) { var w = words(text), n = 0; q.forEach(function (x) { if (w.indexOf(x) >= 0 || w.some(function (y) { return y.indexOf(x) === 0 || x.indexOf(y) === 0; })) n++; }); return (n / q.length) * weight; }
    DATA.pages.forEach(function (p) {
      add(p.s, overlap(p.t, 3) + overlap(p.p, 1), p.t);
      p.x.forEach(function (s) { add(p.s + "#" + s[0], overlap(s[1], 3) + overlap(s[2], 1.2) + overlap(p.t, 0.8), p.t + " › " + s[1]); });
    });
    (DATA.qa || []).forEach(function (x) { var s = overlap(x[0], 3.4); if (s > 1.6) add(x[1], s, (hits[x[1]] || {}).label || x[1]); });
    return Object.keys(hits).map(function (k) { return hits[k]; }).sort(function (a, b) { return b.score - a.score; }).slice(0, limit || 5).map(function (h) { return { target: h.target, label: h.label, score: Math.round(h.score * 100) / 100 }; });
  }

  // Show where something lives in the header, the way a person would point at it.
  function point(what) {
    var w = String(what || "").trim(), el = null, low = w.toLowerCase();
    var phone = window.innerWidth < 1024;
    function openDrawer() { var b = doc.querySelector(".burger"); if (phone && b && !root.classList.contains("nav-open") && !doc.body.classList.contains("nav-open")) b.click(); }
    if (low === "book" || low === "booking") el = phone ? doc.querySelector(".sticky-cta .btn--primary, .site-header__cta") : doc.querySelector(".site-header__cta");
    else if (low === "call" || low === "phone") el = doc.querySelector(".site-header__call");
    else if (low === "home" || low === "logo") el = doc.querySelector(".site-header .brand");
    else if (low === "footer") el = doc.getElementById("footer");
    else {
      var bits = w.replace(/^menu:/i, "").split(/\s*>\s*|\s*,\s*then\s*/i);
      var tops = [].slice.call(doc.querySelectorAll(".nav__list > li"));
      var li = tops.filter(function (x) { var a = x.querySelector(".nav__link"); return a && a.textContent.trim().toLowerCase().indexOf(bits[0].trim().toLowerCase()) === 0; })[0];
      if (li) {
        openDrawer();
        el = li.querySelector(".nav__link");
        if (bits[1]) {
          var kid = [].slice.call(li.querySelectorAll("a")).filter(function (a) { return a !== el && a.textContent.trim().toLowerCase().indexOf(bits[1].trim().toLowerCase()) >= 0; })[0];
          if (kid) { li.classList.add("is-open", "guide-open"); el.focus({ preventScroll: true }); el = kid; setTimeout(function () { li.classList.remove("guide-open"); }, 6000); }
        }
      }
    }
    if (!el) return { ok: false, reason: "nothing in the header called " + what };
    if (el.id === "footer") el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    spot(el, 6000);
    return { ok: true, pointed_at: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60) };
  }

  var api = { where: where, pages: pages, find: find, go: go, show: show, point: point, starters: function () { return (DATA.starters || []).slice(); }, version: 1 };
  window.SiteGuide = api;

  // An assistant in an iframe talks to the page with messages. Only the six actions above exist; go() and show() only
  // accept the site's own pages and sections, so a message cannot send the visitor anywhere else.
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "site-guide" || typeof api[d.action] !== "function" || d.action === "version") return;
    var result;
    try { result = api[d.action](d.target !== undefined ? d.target : d.query, d.limit); } catch (err) { result = { ok: false, reason: String(err && err.message) }; }
    if (e.source && e.source.postMessage) { try { e.source.postMessage({ type: "site-guide:result", id: d.id, action: d.action, result: result }, "*"); } catch (err) {} }
  });

  // Buttons and links on the page can use the same thing: <button data-guide-go="knees#cost">.
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-guide-go]");
    if (!b) return;
    e.preventDefault();
    var t = b.getAttribute("data-guide-go");
    if (/^(menu:|book$|call$|home$|footer$)/i.test(t)) point(t); else go(t);
    var dock = doc.getElementById("assistant-dock");
    if (dock && dock.contains(b)) setDock(false);
  });

  // The placeholder that holds the assistant's corner until the real one is connected.
  function setDock(open) {
    var dock = doc.getElementById("assistant-dock");
    if (!dock) return;
    var panel = dock.querySelector(".assistant-dock__panel"), btn = dock.querySelector(".assistant-dock__button");
    dock.classList.toggle("is-open", open);
    if (panel) panel.hidden = !open;
    if (btn) btn.setAttribute("aria-expanded", String(open));
  }
  doc.addEventListener("click", function (e) {
    var dock = doc.getElementById("assistant-dock");
    if (!dock) return;
    if (e.target.closest(".assistant-dock__button")) setDock(!dock.classList.contains("is-open"));
    else if (e.target.closest(".assistant-dock__close") || !dock.contains(e.target)) setDock(false);
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setDock(false); });

  function arrive() {
    var id = new URLSearchParams(location.search).get("show");
    if (id && doc.getElementById(id)) setTimeout(function () { show(id); }, 350);
    try { doc.dispatchEvent(new CustomEvent("siteguide:ready", { detail: where() })); } catch (e) {}
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", arrive); else arrive();
})();
