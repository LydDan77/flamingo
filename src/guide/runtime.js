/* Site guide runtime. Loaded only on a site built with `guide: true`. It gives an assistant (or a person at the
   console) a few safe things to do on the page:

     SiteGuide.where()            which page and section the visitor is looking at
     SiteGuide.pages()            every page: slug, title, how to reach it, its sections
     SiteGuide.find("price")      the best places for a word or a question
     SiteGuide.go("knees#cost")   go to a page and section (scrolls and highlights)
     SiteGuide.show("cost")       highlight a section, a marked spot or a question of the page in view
     SiteGuide.point("menu:Where it hurts")   show where something is in the header: a menu, "book", "call", "home"
     SiteGuide.read("knees#cost") the words of a section, to quote them
     SiteGuide.samples(true)      outline every sample detail on the page in view; returns how many
     SiteGuide.tour("patient-path")           the steps of a walk-through: a line to say and a place to show
     SiteGuide.tourStep("patient-path", 1)    go to one step of a walk-through and get its line
     SiteGuide.look("sandstone")  show the page in view in another of the five design looks
     SiteGuide.back()             back to what the visitor was looking at before

   Targets are checked against the site's own page list, so nothing here can send a visitor off the site.
   Every call that moves the page answers in one shape: { ok, page, name, section, label, layout, say } and, when it
   could not, { ok: false, reason, try } with the closest places. "say" is a finished sentence the assistant may speak;
   she should say she has shown something only when ok is true.

   Staying put. A talking assistant is cut off when the page it lives on reloads. So when a visitor (or the assistant)
   moves to another page, this script does not reload: it shows the assistant-free copy of that page, view-<page>.html,
   in a frame that fills the window, and updates the address bar and the Back button to match. The assistant's page
   never unloads, so she keeps talking. A reload, or a link opened in a new tab, lands on the ordinary page.

   An assistant inside an iframe can post { type: "site-guide", action: "go", args: { page: "knees", section: "cost" },
   ref: 1 } to the page and gets { type: "site-guide:result", ref: 1, result } back. The arguments carry the names the
   tool definitions use. Messages are taken from this site, from the origins the site lists for its assistant, or (when
   it lists none) from a frame in the assistant's own corner.
   A link with ?show=<section> highlights on arrival; ?samples=1 outlines the sample details. */
(function () {
  "use strict";
  var DATA = window.__SITE_GUIDE__ || { pages: [], qa: [], starters: [] };
  var doc = document, root = doc.documentElement;
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var framed = false;
  try { framed = window.self !== window.top && !!window.parent.SiteGuide; } catch (e) { framed = false; }
  function slugOf(pathname) { var f = (String(pathname).split("/").pop() || "").replace(/\.html$/, "").replace(/^view-/, ""); return f || "index"; }
  var own = slugOf(location.pathname);
  // a local file server needs .html in its addresses; the live site uses clean ones
  var dotHtml = /\.html$/.test(location.pathname) || /^(localhost|127\.|\[::1\])/.test(location.hostname);
  // An assistant-free copy opened on its own (a new tab, a copied link) is not a page to stay on: go to the real one.
  if (root.hasAttribute("data-view") && window.top === window.self) { location.replace((own === "index" ? "./" : own + (dotHtml ? ".html" : "")) + location.search + location.hash); return; }
  var bySlug = {};
  DATA.pages.forEach(function (p) { bySlug[p.s] = p; });

  var STOP = { the: 1, and: 1, for: 1, how: 1, what: 1, where: 1, does: 1, can: 1, you: 1, your: 1, this: 1, that: 1, with: 1, are: 1, there: 1, page: 1, site: 1, website: 1, find: 1, show: 1, take: 1, see: 1, about: 1, get: 1, have: 1, from: 1, they: 1, will: 1, when: 1, who: 1, why: 1, into: 1, our: 1, its: 1, was: 1, has: 1, not: 1, any: 1, all: 1 };
  function words(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9+ ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && !STOP[w]; }); }

  /* ------------------------------------------------------------------ the stage: other pages, without a reload */
  var keepAlive = !framed && DATA.keepAlive !== false;
  var stage = null, frame = null, staged = false, stagedSlug = "", frameReady = false, wantFocus = false, ownTitle = doc.title, pendingShow = "";
  var curLook = ""; // a design look chosen for this visit (other than the site's own), carried from page to page
  try { curLook = new URLSearchParams(location.search).get("theme") || ""; if (curLook === (window.FLAMINGO_FIXED_THEME || "")) curLook = ""; } catch (e) {}
  function sameDir(p) { var d = function (x) { return x.slice(0, x.lastIndexOf("/") + 1); }; return d(p) === d(location.pathname); }
  /** The page the frame is really showing right now ("" while it is elsewhere or cannot be read). */
  function frameSlug() { try { var m = (frame.contentWindow.location.pathname.split("/").pop() || "").match(/^view-([a-z0-9-]+)(?:\.html)?$/); return m ? m[1] : ""; } catch (e) { return ""; } }
  /** The guide of the page in the frame, once that page has finished loading. Never the page it is leaving. */
  function inner() { try { return staged && frameReady && frame && frame.contentWindow && frame.contentWindow.SiteGuide && frameSlug() === stagedSlug ? frame.contentWindow.SiteGuide : null; } catch (e) { return null; } }
  function here() { return staged ? stagedSlug : own; }
  function viewUrl(slug, section, query) {
    var q = [];
    if (section) q.push("show=" + encodeURIComponent(section));
    String(query || "").replace(/^\?/, "").split("&").forEach(function (kv) { if (kv && !/^show=/.test(kv)) q.push(kv); });
    return "view-" + slug + (dotHtml ? ".html" : "") + (q.length ? "?" + q.join("&") : "") + (section ? "#" + section : "");
  }
  function realUrl(slug, hash) { return (slug === "index" ? "./" : slug + (dotHtml ? ".html" : "")) + (hash || ""); }
  // What belongs to the page under the stage. Only these are switched off while another page is shown: anything the
  // assistant's own snippet has put on the page is left alone.
  var OUTER = "body > .skip-link, #site-header, #main, #footer, body > .site-footer, body > .sticky-cta, body > .financing-chip, body > .sample-banner";
  function setStaged(on) {
    staged = on;
    if (stage) stage.hidden = !on;
    root.classList.toggle("is-staged", on);
    doc.querySelectorAll(OUTER).forEach(function (el) { if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert"); });
    if (!on) { doc.title = ownTitle; root.classList.toggle("guide-samples", samplesOn); }
    else if (frameReady) { try { doc.title = frame.contentDocument.title; } catch (e) {} }
  }
  function closeDrawer() {
    if (!doc.body.classList.contains("nav-open")) return;
    var b = doc.querySelector(".burger");
    if (b) b.click(); else doc.body.classList.remove("nav-open");
  }
  /** The frame went somewhere that is not a page of this site (an error page, a file): forget it, so the next move starts clean. */
  function stageLost() { frameReady = false; stagedSlug = ""; }
  function onFrameLoad() {
    var loc, d;
    try { loc = frame.contentWindow.location; d = frame.contentDocument; if (!loc || loc.href === "about:blank") return; } catch (e) { stageLost(); return; }
    var file = loc.pathname.split("/").pop() || "";
    var m = file.match(/^view-([a-z0-9-]+)(?:\.html)?$/);
    if (!m) { // the frame reached an ordinary page: swap in its assistant-free copy
      var s = slugOf(loc.pathname);
      if (bySlug[s] && sameDir(loc.pathname)) loc.replace(viewUrl(s, "", loc.search) + loc.hash); else stageLost();
      return;
    }
    if (!d || !d.documentElement.hasAttribute("data-view")) { // the copy is missing: show the real page instead
      frameReady = false;
      if (bySlug[m[1]]) location.assign(realUrl(m[1], loc.hash)); else stageLost();
      return;
    }
    stagedSlug = m[1];
    frameReady = true;
    try { frame.contentWindow.addEventListener("pagehide", function () { frameReady = false; }); } catch (e) {}
    try { doc.title = d.title; frame.title = d.title; } catch (e) {}
    if (staged) { try { history.replaceState({ guideStage: 1, slug: stagedSlug }, "", realUrl(stagedSlug, loc.hash)); } catch (e) {} }
    // After the visitor's own click, the keyboard and a screen reader follow them into the new page. After the
    // assistant's move they stay where they are, so a chat box does not lose its cursor.
    if (staged && wantFocus) { wantFocus = false; try { frame.contentWindow.focus(); var mn = d.getElementById("main"); if (mn && !loc.hash) { mn.setAttribute("tabindex", "-1"); mn.focus({ preventScroll: true }); } } catch (e) {} }
    // A click inside the page closes the placeholder panel, as a click beside it does on the first page.
    try { d.addEventListener("pointerdown", function () { var dock = doc.getElementById("assistant-dock"); if (dock && !dock.hasAttribute("data-live")) setDock(false); }); } catch (e) {}
    if (pendingShow) { var id = pendingShow; pendingShow = ""; var g = inner(); if (g) setTimeout(function () { g.show(id); }, 250); }
    if (samplesOn) { var g2 = inner(); if (g2) g2.samples(true); }
    announce();
  }
  function ensureFrame() {
    if (frame) return;
    stage = doc.createElement("div");
    stage.id = "guide-stage";
    stage.hidden = true;
    frame = doc.createElement("iframe");
    frame.title = DATA.name || "Website";
    frame.addEventListener("load", onFrameLoad);
    stage.appendChild(frame);
    doc.body.appendChild(stage);
  }
  function frameTo(url, add) {
    frameReady = false;
    if (!frame.getAttribute("src")) { frame.setAttribute("src", url); return; }
    try { if (add) frame.contentWindow.location.assign(url); else frame.contentWindow.location.replace(url); } catch (e) { frame.setAttribute("src", url); }
  }
  function openStage(slug, section, query) {
    ensureFrame();
    closeDrawer();
    var url = viewUrl(slug, section, query);
    stagedSlug = slug;
    if (!staged) {
      try { history.pushState({ guideStage: 1, slug: slug }, "", realUrl(slug, section ? "#" + section : "")); } catch (e) { location.href = realUrl(slug, section ? "#" + section : ""); return; }
      frameTo(url, false);
      setStaged(true);
    } else {
      frameTo(url, true);
    }
  }
  if (keepAlive) {
    // A page that was reloaded while it was being shown in the stage is an ordinary page now: drop the old marker.
    try { if (history.state && history.state.guideStage) history.replaceState(null, "", location.href); } catch (e) {}
    // Back and Forward: the address says which page should be on screen.
    window.addEventListener("popstate", function () {
      var slug = slugOf(location.pathname);
      if (slug === own || !bySlug[slug]) setStaged(false);
      else {
        ensureFrame();
        if (frameSlug() !== slug) { stagedSlug = slug; frameTo(viewUrl(slug, "", curLook ? "theme=" + curLook : "") + location.hash, false); }
        else stagedSlug = slug;
        setStaged(true);
      }
      announce();
    });
    // The visitor's own clicks on links to other pages take the same route, so the assistant is not cut off.
    doc.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // composedPath sees a link inside an open shadow root (a chat box), which e.target does not
      var a = null, trail = e.composedPath ? e.composedPath() : [];
      for (var i = 0; i < trail.length && !a; i++) if (trail[i] && trail[i].tagName === "A" && trail[i].hasAttribute && trail[i].hasAttribute("href")) a = trail[i];
      if (!a) a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-guide-go")) return;
      var u;
      try { u = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
      if (u.origin !== location.origin) return;
      if (!sameDir(u.pathname)) return;
      var slug = slugOf(u.pathname);
      if (!bySlug[slug]) return; // not a page of this site: the browser handles it
      if (slug === own) {
        // A link to the page the assistant lives on. A jump within the page in view is the browser's own business.
        // Anything else would be a full load, so it is done here: come back from the stage, or just scroll.
        if (!staged && (u.pathname === location.pathname || u.search)) return;
        e.preventDefault();
        closeDrawer();
        if (staged) { try { history.pushState(null, "", realUrl(own, u.hash)); } catch (err) {} setStaged(false); }
        var to = u.hash ? doc.getElementById(u.hash.slice(1)) : null;
        if (to) to.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" }); else window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
        announce();
        return;
      }
      e.preventDefault();
      var dock = doc.getElementById("assistant-dock");
      if (dock && !dock.hasAttribute("data-live") && dock.contains(a)) setDock(false);
      wantFocus = true;
      openStage(slug, u.hash.slice(1), u.search || (curLook ? "theme=" + curLook : ""));
    });
  }

  /* ------------------------------------------------------------------------------------------------ the guide */
  function parse(target) {
    if (target && typeof target === "object") return { page: slugOf(target.page || here()), section: String(target.section || "").replace(/^#/, "") };
    var t = String(target || "").trim().replace(/^\.?\//, "");
    var bits = t.split("#");
    var pg = bits[0].split("?")[0];
    return { page: pg ? slugOf(pg) : (t.charAt(0) === "#" ? here() : "index"), section: bits[1] || "" };
  }
  function known(t) {
    var p = bySlug[t.page];
    return !!p && (!t.section || p.x.some(function (s) { return s[0] === t.section; }) || (p.m || []).some(function (s) { return s[0] === t.section; }));
  }
  /** An id the assistant learned before it was renamed still works (the build keeps the list). */
  function current(t) {
    var to = (DATA.moved || {})[t.page + (t.section ? "#" + t.section : "")];
    if (!to) return t;
    var b = String(to).split("#");
    return { page: b[0], section: b[1] || "" };
  }

  /* One shape for every answer, with a sentence the assistant can say. */
  function layoutNow() { return window.innerWidth < 1024 ? "phone" : "laptop"; }
  function labelOf(page, section) {
    var p = bySlug[page] || {}, lab = "", sample = false;
    if (section) (p.x || []).forEach(function (s) { if (s[0] === section) { lab = s[1]; sample = !!s[3]; } });
    if (section && !lab) (p.m || []).forEach(function (s) { if (s[0] === section) lab = s[1]; });
    return { name: p.n || p.t || page, label: lab, sample: sample };
  }
  function pageWords(name) { name = String(name || ""); return /^the /i.test(name) || /\bpage$/i.test(name) ? name.charAt(0).toUpperCase() + name.slice(1) : "The " + name + " page"; }
  function done(page, section, extra) {
    var l = labelOf(page, section);
    var at = section === "top" ? "" : l.label.replace(/[.?!]+$/, "");
    var r = { ok: true, page: page, name: l.name, section: section || "", label: l.label, layout: layoutNow(), say: pageWords(l.name) + " is open" + (at ? " at " + at : section === "top" ? " at the top" : "") + "." + (l.sample ? " The details shown there are samples." : "") };
    for (var k in extra || {}) r[k] = extra[k];
    return r;
  }
  function fail(reason, query) {
    var r = { ok: false, reason: reason, layout: layoutNow(), say: "I could not find that on this site." };
    if (query) { var near = find(String(query).replace(/[#>:_-]+/g, " "), 3); if (near.length) r["try"] = near; }
    return r;
  }
  /* A small card that says what was just shown, so the visitor knows why the page moved even with the sound off. */
  var capTimer = null;
  function caption(r) {
    if (framed || !r || !r.ok || !doc.body) return r;
    var el = doc.getElementById("guide-caption");
    if (!el) { el = doc.createElement("div"); el.id = "guide-caption"; el.className = "guide-caption"; el.setAttribute("role", "status"); doc.body.appendChild(el); }
    el.textContent = "";
    var b = doc.createElement("b"); b.textContent = "Shown: "; el.appendChild(b);
    el.appendChild(doc.createTextNode(r.name + (r.label && r.section !== "top" ? ", " + r.label : "") + (r.note ? ". " + r.note : "")));
    el.classList.add("is-on");
    clearTimeout(capTimer);
    capTimer = setTimeout(function () { el.classList.remove("is-on"); }, 6000);
    return r;
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
    id = String(id || "").replace(/^#/, "");
    if (staged) {
      var g = inner();
      if (!g) { pendingShow = id; return caption(done(stagedSlug, id, { loading: true })); }
      var r = g.show(id);
      return r && r.ok ? caption(r) : fail("no section called " + id + " on the " + labelOf(stagedSlug).name + " page", id);
    }
    var el = id === "footer" || known({ page: own, section: id }) ? doc.getElementById(id) : null;
    if (!el) return fail("no section called " + id + " on this page", id);
    if (el.tagName === "DETAILS") el.open = true; // a question: open it
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: el.tagName === "DETAILS" ? "center" : "start" });
    spot(el);
    return caption(done(own, el.id));
  }
  function go(target) {
    if (target === undefined || target === null || target === "" || (typeof target === "object" && !target.page && !target.section)) return fail("no page or section was named");
    var t = current(parse(target));
    if (!known(t)) return fail("there is no page or section called " + (typeof target === "string" ? target : JSON.stringify(target)) + " on this site", typeof target === "string" ? target : (target && (target.section || target.page)) || "");
    if (t.page === here()) {
      if (t.section) return show(t.section);
      var w = staged && frame ? frame.contentWindow : window;
      try { w.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); } catch (e) {}
      return caption(done(t.page, ""));
    }
    var theme = curLook;
    if (keepAlive) { openStage(t.page, t.section, theme ? "theme=" + theme : ""); return caption(done(t.page, t.section, { title: bySlug[t.page].t })); }
    var q = [];
    if (t.section) q.push("show=" + encodeURIComponent(t.section));
    if (theme) q.push("theme=" + encodeURIComponent(theme));
    location.href = (framed ? "view-" : "") + (t.page === "index" && !framed ? "./" : t.page + ".html") + (q.length ? "?" + q.join("&") : "") + (t.section ? "#" + t.section : "");
    return done(t.page, t.section, { navigating: true });
  }
  /** Follow an address of this site (used by the form's thank-you redirect) without cutting the assistant off. */
  function visit(url) {
    var u;
    try { u = new URL(url, location.href); } catch (e) { location.href = url; return; }
    var slug = slugOf(u.pathname);
    if (keepAlive && u.origin === location.origin && bySlug[slug] && slug !== here()) openStage(slug, u.hash.slice(1), u.search);
    else location.href = url;
  }

  function where() {
    if (staged) { var g = inner(); if (g) return g.where(); var sp = bySlug[stagedSlug] || { t: "", x: [] }; return { ok: true, page: stagedSlug, name: sp.n || sp.t, title: sp.t, reach: sp.r || "", reach_phone: sp.rp || sp.r || "", section: "", section_label: "", label: "", layout: layoutNow(), sample: !!DATA.sample, sections: sp.x.map(function (s) { return { id: s[0], label: s[1] }; }) }; }
    var p = bySlug[own] || { s: own, t: doc.title, x: [] };
    var line = window.innerHeight * 0.35, cur = null;
    doc.querySelectorAll('#main [data-guide][id]:not([data-guide="question"])').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom > 0) cur = el;
    });
    var sec = cur ? p.x.filter(function (s) { return s[0] === cur.id; })[0] : null;
    return { ok: true, page: own, name: p.n || p.t, title: p.t, reach: p.r || "", reach_phone: p.rp || p.r || "", section: cur ? cur.id : "", section_label: sec ? sec[1] : "", label: sec ? sec[1] : "", layout: layoutNow(), sample: !!DATA.sample, say: "You are on " + pageWords(p.n || p.t).replace(/^The /, "the ") + (sec ? (sec[0] === "top" ? ", at the top" : ", at " + String(sec[1]).replace(/[.?!]+$/, "")) : "") + ".", sections: p.x.map(function (s) { return { id: s[0], label: s[1] }; }) };
  }
  function pages() {
    return DATA.pages.map(function (p) { return { page: p.s, name: p.n || p.t, title: p.t, reach: p.r, reach_phone: p.rp || p.r, purpose: p.p, sections: p.x.map(function (s) { return { target: p.s + "#" + s[0], label: s[1] }; }) }; });
  }
  /** The words of a section as they are on the page, so they can be quoted exactly. */
  function read(target) {
    var bare = String(target || "").replace(/^#/, "");
    var t = current(parse(bare && bare.indexOf("#") < 0 && known({ page: here(), section: bare }) ? "#" + bare : target));
    if (!known(t)) return fail("there is no section called " + String(target) + " on this site", String(target));
    if (t.page !== here()) { var p = bySlug[t.page], s = p.x.filter(function (x) { return x[0] === t.section; })[0]; return { ok: true, page: t.page, section: t.section, text: (s ? s[2] : p.p) + (s && s[3] ? " (The details shown in this section are samples.)" : ""), summary_only: true }; }
    if (staged) { var g = inner(); if (g) return g.read("#" + t.section); var sp = bySlug[t.page], ss = sp.x.filter(function (x) { return x[0] === t.section; })[0]; return { ok: true, page: t.page, section: t.section, text: ss ? ss[2] : sp.p, summary_only: true, loading: true }; }
    var el = t.section ? doc.getElementById(t.section) : doc.getElementById("main");
    if (!el) return { ok: false, reason: "not on this page" };
    var c = el.cloneNode(true);
    c.querySelectorAll("script, style, svg, noscript, template, .ph-tag").forEach(function (x) { x.remove(); });
    c.querySelectorAll("p, li, h1, h2, h3, h4, summary, div, br, td, th, button").forEach(function (x) { x.appendChild(doc.createTextNode(" ")); });
    c.querySelectorAll(".sample").forEach(function (x) { x.textContent = " (sample) "; }); // a made-up detail stays marked when it is quoted
    return { ok: true, page: t.page, section: t.section, text: (c.textContent || "").replace(/\s+/g, " ").trim().slice(0, 4000) };
  }
  /** Outline every sample detail on the page in view, so an owner can see what they will replace. */
  var samplesOn = false; // kept for the visit, so the outlines follow the visitor from page to page
  function samples(on) {
    on = on === "toggle" ? !samplesOn : on !== false;
    if (!framed) samplesOn = on;
    if (staged) { var g = inner(); if (g) return g.samples(on); }
    root.classList.toggle("guide-samples", on);
    var n = doc.querySelectorAll("#main .sample").length;
    return { ok: true, on: on, count: n, page: own, name: labelOf(own).name, layout: layoutNow(), say: on ? (n ? "I have outlined " + (n === 1 ? "the one sample detail" : "the " + n + " sample details") + " on this page. Those are the places where your own details go." : "There are no sample details on this page.") : "The outlines are off." };
  }
  function tours() { return (DATA.tours || []).map(function (t) { return { id: t.id, title: t.title, steps: t.steps.length }; }); }
  function tour(id) {
    var t = (DATA.tours || []).filter(function (x) { return x.id === id; })[0];
    return t ? { ok: true, id: t.id, title: t.title, steps: t.steps } : { ok: false, reason: "no tour called " + id, tours: tours() };
  }
  /** Go to step n (counting from 1) of a walk-through. The answer carries the line to say and whether there is another step. */
  function tourStep(id, n) {
    var t = tour(id);
    if (!t.ok) return t;
    n = Math.max(1, Math.min(t.steps.length, parseInt(n, 10) || 1));
    var st = t.steps[n - 1], r = st.show ? go(st.show) : { ok: true };
    r.tour = t.id; r.step = n; r.of = t.steps.length; r.line = st.say; r.next = n < t.steps.length ? n + 1 : 0;
    return r;
  }
  /** Back to the page shown before. Only steps the guide itself made can be undone, so this never leaves the site. */
  function back() {
    if (!staged) return { ok: false, reason: "there is nothing to go back to on this site", layout: layoutNow(), say: "There is nothing to go back to." };
    history.back();
    return { ok: true, layout: layoutNow(), say: "I have gone back." };
  }
  /** Show the page in view in another design look, without reloading the assistant's page. */
  var LOOKS = ["ecosystem", "onyx", "sandstone", "meridian", "ivory"];
  function look(name) {
    name = String(name || "").toLowerCase().trim();
    if (LOOKS.indexOf(name) < 0) return { ok: false, reason: "no look called " + name, looks: LOOKS };
    curLook = name === (window.FLAMINGO_FIXED_THEME || "") ? "" : name; // the site's own look needs no mention in the address
    var slug = here();
    if (!keepAlive) { location.search = "theme=" + name; return { ok: true, look: name, navigating: true }; }
    if (staged) { try { var loc = frame.contentWindow.location; loc.replace("view-" + slug + ".html?theme=" + name + loc.hash); } catch (e) { return { ok: false, reason: "the page is still loading" }; } }
    else openStage(slug, "", "theme=" + name);
    return { ok: true, look: name, page: slug, name: labelOf(slug).name, looks: LOOKS, layout: layoutNow(), say: "This is the same page in the look called " + name.charAt(0).toUpperCase() + name.slice(1) + "." };
  }
  function find(query, limit) {
    var heard = String(query || "").toLowerCase();
    (DATA.heard || []).forEach(function (h) { if (heard.indexOf(h[0]) >= 0) heard = heard.split(h[0]).join(h[1]); }); // what a microphone tends to make of the site's words
    var q = words(heard), hits = {};
    if (!q.length) return [];
    function add(target, score, label) { if (score > 0 && (!hits[target] || hits[target].score < score)) hits[target] = { target: target, label: label, score: score }; }
    function overlap(text, weight) { var w = words(text), n = 0; q.forEach(function (x) { if (w.indexOf(x) >= 0 || w.some(function (y) { return y.length > 3 && x.length > 3 && (y.indexOf(x) === 0 || x.indexOf(y) === 0); })) n++; }); return (n / q.length) * weight; }
    DATA.pages.forEach(function (p) {
      add(p.s, overlap(p.t, 3) + overlap(p.p, 1), p.t);
      p.x.forEach(function (s) { add(p.s + "#" + s[0], overlap(s[1], 3) + overlap(s[2], 1.2) + overlap(p.t, 0.8), p.t + " › " + s[1]); });
    });
    (DATA.qa || []).forEach(function (x) { var s = overlap(x[0], 3.4); if (s > 1.6) { var b = String(x[1]).split("#"), l = labelOf(b[0], b[1] || ""); add(x[1], s, (hits[x[1]] || {}).label || l.name + (l.label ? " › " + l.label : "")); } });
    return Object.keys(hits).map(function (k) { return hits[k]; }).sort(function (a, b) { return b.score - a.score; }).slice(0, limit || 5).map(function (h) { return { target: h.target, label: h.label, score: Math.round(h.score * 100) / 100 }; });
  }

  // Show where something lives in the header, the way a person would point at it.
  function point(what) {
    if (staged) { var g = inner(); if (g) return g.point(what); return { ok: false, reason: "the page is still loading", layout: layoutNow(), say: "One moment, the page is still loading." }; }
    var w = String(what || "").trim(), el = null, low = w.toLowerCase();
    var phone = window.innerWidth < 1024;
    function openDrawer() { var b = doc.querySelector(".burger"); if (phone && b && !doc.body.classList.contains("nav-open")) b.click(); }
    if (low === "book" || low === "booking") el = phone ? (doc.querySelector(".sticky-cta .btn--primary") || doc.querySelector(".site-header__cta")) : doc.querySelector(".site-header__cta");
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
          if (kid) el = kid;
        }
        if (li.querySelector(".menu")) { li.classList.add("is-open", "guide-open"); setTimeout(function () { li.classList.remove("guide-open"); }, 6500); }
      }
    }
    if (!el) return { ok: false, reason: "nothing in the header called " + what, layout: layoutNow(), say: "I could not find that in the menu." };
    if (el.id === "footer") el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    spot(el, 6500);
    var at = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
    return { ok: true, pointed_at: at, page: own, layout: layoutNow(), say: el.id === "footer" ? "That is the footer, at the bottom of every page." : "I have outlined " + (at || "it") + (phone ? " for you." : " at the top of the page.") };
  }

  var api = { where: where, pages: pages, find: find, go: go, show: show, point: point, read: read, samples: samples, tours: tours, tour: tour, tourStep: tourStep, back: back, look: look, visit: visit, starters: function () { return (DATA.starters || []).slice(); }, version: 2 };
  window.SiteGuide = api;
  function announce() { try { doc.dispatchEvent(new CustomEvent("siteguide:page", { detail: where() })); } catch (e) {} }

  // An assistant in an iframe talks to the page with messages. Only the actions below exist; go() and show() accept the
  // site's own pages and sections and nothing else, so a message cannot send the visitor anywhere else.
  var OPEN = { where: 1, pages: 1, find: 1, go: 1, show: 1, point: 1, read: 1, samples: 1, tours: 1, tour: 1, tourStep: 1, back: 1, look: 1, starters: 1 };
  var ORIGINS = DATA.origins || [];
  /** Who may send the page a message: this site, an origin the site lists for its assistant, or, when it lists none,
      a frame that sits in the assistant's own corner. A booking calendar or a video elsewhere on the page may not. */
  function trusted(e) {
    if (e.origin === location.origin || ORIGINS.indexOf(e.origin) >= 0) return true;
    if (ORIGINS.length) return false;
    var mine = doc.querySelectorAll(".assistant-slot iframe, .assistant-dock__embed iframe");
    for (var i = 0; i < mine.length; i++) if (mine[i].contentWindow === e.source) return true;
    return false;
  }
  /** The arguments of an action, by the names the tool definitions use. "target" still works for all of them. */
  function argsFor(action, d) {
    var x = d.args && typeof d.args === "object" ? d.args : d;
    var pick = function () { for (var i = 0; i < arguments.length; i++) if (x[arguments[i]] !== undefined) return x[arguments[i]]; };
    switch (action) {
      case "go": return [x.target !== undefined ? x.target : (x.page || x.section ? { page: x.page, section: x.section } : undefined)];
      case "show": return [pick("section", "target")];
      case "point": return [pick("what", "target")];
      case "find": return [pick("query", "target"), x.limit];
      case "read": return [pick("target", "section")];
      case "samples": return [pick("on", "id_or_on")];
      case "tour": return [d.args ? pick("id", "tour") : pick("tour", "target")];
      case "tourStep": return [d.args ? pick("id", "tour") : pick("tour", "target"), x.step];
      case "look": return [pick("name", "target")];
      default: return [];
    }
  }
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "site-guide" || !Object.prototype.hasOwnProperty.call(OPEN, d.action) || !trusted(e)) return;
    var result;
    try { result = api[d.action].apply(null, argsFor(d.action, d)); } catch (err) { result = { ok: false, reason: String(err && err.message) }; }
    var ref = d.ref !== undefined ? d.ref : d.id;
    if (e.source && e.source.postMessage) { try { e.source.postMessage({ type: "site-guide:result", ref: ref, id: ref, action: d.action, result: result }, e.origin && e.origin !== "null" ? e.origin : "*"); } catch (err) {} }
  });

  // Buttons and links on the page can use the same thing: <button data-guide-go="knees#cost">.
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-guide-go]");
    if (!b) return;
    e.preventDefault();
    var t = b.getAttribute("data-guide-go");
    var top = framed ? window.parent.SiteGuide : api; // inside the stage, the outer page does the moving
    if (/^look:/i.test(t)) top.look(t.slice(5)); else if (/^samples$/i.test(t)) top.samples("toggle"); else if (/^(menu:|book$|call$|home$|footer$)/i.test(t)) top.point(t); else top.go(t);
    var dock = doc.getElementById("assistant-dock");
    if (dock && dock.contains(b)) setDock(false);
  });

  // Panel mode: the assistant's own snippet waits in a <template> and is put on the page the first time the visitor
  // opens the corner, so nothing of hers loads, and no microphone is asked for, until they ask.
  function mount(dock) {
    var tpl = dock.querySelector("template"), host = dock.querySelector(".assistant-dock__embed");
    if (!tpl || !host || dock.getAttribute("data-mounted")) return;
    dock.setAttribute("data-mounted", "1");
    var frag = tpl.content.cloneNode(true);
    // Scripts copied from a template do not run, so each is made again, in order: one that is fetched finishes before the next starts.
    var waiting = [].slice.call(frag.querySelectorAll("script")).map(function (old) { var mark = doc.createComment("script"); old.parentNode.replaceChild(mark, old); return [mark, old]; });
    host.appendChild(frag);
    (function next() {
      var item = waiting.shift();
      if (!item) return;
      var sc = doc.createElement("script");
      [].slice.call(item[1].attributes).forEach(function (a) { sc.setAttribute(a.name, a.value); });
      sc.text = item[1].text;
      if (sc.src && !sc.hasAttribute("async")) { sc.onload = next; sc.onerror = next; item[0].parentNode.replaceChild(sc, item[0]); }
      else { item[0].parentNode.replaceChild(sc, item[0]); next(); }
    })();
  }
  // The placeholder that holds the assistant's corner until the real one is connected (and her launcher in panel mode).
  function setDock(open) {
    var dock = doc.getElementById("assistant-dock");
    if (!dock) return;
    var panel = dock.querySelector(".assistant-dock__panel"), btn = dock.querySelector(".assistant-dock__button");
    dock.classList.toggle("is-open", open);
    if (open) mount(dock);
    if (panel) panel.hidden = !open;
    if (btn) btn.setAttribute("aria-expanded", String(open));
  }
  doc.addEventListener("click", function (e) {
    var dock = doc.getElementById("assistant-dock");
    if (!dock) return;
    if (e.target.closest(".assistant-dock__button")) setDock(!dock.classList.contains("is-open"));
    else if (e.target.closest(".assistant-dock__close") || (!dock.contains(e.target) && !dock.hasAttribute("data-live"))) setDock(false);
  });
  doc.addEventListener("keydown", function (e) { var dock = doc.getElementById("assistant-dock"); if (e.key === "Escape" && dock && !dock.hasAttribute("data-live")) setDock(false); });
  // The one line shown beside a live assistant on the first page of a visit.
  doc.addEventListener("click", function (e) { var x = e.target.closest && e.target.closest(".assistant-note__close"); if (x && x.parentNode) x.parentNode.hidden = true; });

  function arrive() {
    var id = new URLSearchParams(location.search).get("show");
    if (id && doc.getElementById(id)) setTimeout(function () { show(id); }, 350);
    if (new URLSearchParams(location.search).get("samples") === "1") samples(true);
    try { doc.dispatchEvent(new CustomEvent("siteguide:ready", { detail: where() })); } catch (e) {}
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", arrive); else arrive();
})();
