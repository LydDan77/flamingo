/* Flamingo site behaviour. No dependencies. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var THEMES = ["dark", "light", "playful"];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ theme */
  function setTheme(t) {
    if (THEMES.indexOf(t) < 0) return;
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("flamingo-theme", t); } catch (e) {}
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", { dark: "#0B0E16", light: "#FFFFFF", playful: "#FFF8F0" }[t]);
    doc.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-theme") === t));
    });
    // keep ?theme= on internal links so the chosen version follows you between pages
    doc.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return;
      var clean = href.replace(/([?&])theme=[^&#]*(&?)/, function (_, p, amp) { return amp ? p : ""; }).replace(/\?(#|$)/, "$1");
      var parts = clean.split("#");
      var base = parts[0], hash = parts[1] ? "#" + parts[1] : "";
      a.setAttribute("href", base + (base.indexOf("?") >= 0 ? "&" : "?") + "theme=" + t + hash);
    });
  }
  doc.querySelectorAll("[data-set-theme]").forEach(function (b) {
    b.addEventListener("click", function () { setTheme(b.getAttribute("data-set-theme")); });
  });
  setTheme(root.getAttribute("data-theme") || "dark");

  /* ----------------------------------------------------------- external links */
  doc.querySelectorAll('a[href^="http"]').forEach(function (a) {
    if (a.hostname !== location.hostname) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    }
  });

  /* ----------------------------------------------------------------- header */
  var header = doc.getElementById("site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = doc.querySelector(".burger");
  var nav = doc.getElementById("primary-nav");
  function closeNav() {
    doc.body.classList.remove("nav-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = !doc.body.classList.contains("nav-open");
      doc.body.classList.toggle("nav-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1024) closeNav(); });
  }

  // Dropdowns: hover/focus on desktop (CSS), tap-to-toggle on mobile.
  doc.querySelectorAll(".nav__item--has-menu > .nav__link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      if (window.innerWidth < 1024) {
        e.preventDefault();
        var item = link.parentElement;
        var open = item.classList.toggle("is-open");
        link.setAttribute("aria-expanded", String(open));
      }
    });
  });

  /* ------------------------------------------------------------ reveal on scroll */
  var revealEls = doc.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in-view"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------- video */
  doc.querySelectorAll("video[autoplay]").forEach(function (v) {
    if (reduceMotion) { v.removeAttribute("autoplay"); v.pause(); return; }
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  });

  /* ---------------------------------------------------- featured service tiles */
  doc.querySelectorAll("[data-tiles]").forEach(function (wrap) {
    var panelImg = wrap.querySelector(".tiles__img");
    var panelNum = wrap.querySelector(".tiles__num");
    var panelTitle = wrap.querySelector(".tiles__title");
    var panelText = wrap.querySelector(".tiles__text");
    var panelLink = wrap.querySelector(".tiles__link");
    var panelIcon = wrap.querySelector(".tiles__icon use");
    var tiles = wrap.querySelectorAll(".tile");
    function activate(tile) {
      tiles.forEach(function (t) { t.classList.toggle("is-active", t === tile); t.setAttribute("aria-selected", String(t === tile)); });
      if (panelImg) {
        panelImg.classList.add("is-switching");
        var src = tile.getAttribute("data-image");
        if (src && panelImg.getAttribute("src") !== src) {
          var img = new Image();
          img.onload = function () { panelImg.src = src; panelImg.style.objectPosition = tile.getAttribute("data-position") || "center"; panelImg.classList.remove("is-switching"); };
          img.src = src;
        } else { panelImg.classList.remove("is-switching"); }
      }
      if (panelNum) panelNum.textContent = tile.getAttribute("data-num") || "";
      if (panelTitle) panelTitle.textContent = tile.getAttribute("data-title") || tile.textContent.trim();
      if (panelText) panelText.textContent = tile.getAttribute("data-text") || "";
      if (panelLink) panelLink.setAttribute("href", tile.getAttribute("data-href") || "#");
      if (panelIcon) panelIcon.setAttribute("href", "#i-" + (tile.getAttribute("data-icon") || "sparkles"));
    }
    tiles.forEach(function (tile) {
      tile.addEventListener("mouseenter", function () { if (window.innerWidth >= 1024) activate(tile); });
      tile.addEventListener("focus", function () { activate(tile); });
      tile.addEventListener("click", function (e) {
        if (!tile.classList.contains("is-active") && window.innerWidth < 1024) { e.preventDefault(); activate(tile); }
        else if (window.innerWidth < 1024 && tile.getAttribute("data-href")) { location.href = tile.getAttribute("data-href"); }
      });
    });
    if (tiles.length) activate(tiles[0]);
  });

  /* -------------------------------------------------------------------- tabs */
  doc.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = group.querySelectorAll("[data-tab]");
    var panels = group.querySelectorAll("[data-panel]");
    function show(id, focusTab) {
      var found = false;
      panels.forEach(function (p) { var on = p.getAttribute("data-panel") === id; p.hidden = !on; if (on) found = true; });
      if (!found) return false;
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === id;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
        if (on && focusTab) t.focus();
      });
      return true;
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.getAttribute("data-tab")); }); });
    group.show = show;
    var first = tabs[0] && tabs[0].getAttribute("data-tab");
    var hashId = location.hash.replace("#", "");
    if (!(hashId && show(hashId))) show(first);
  });

  // in-page links that target a tab panel (e.g. goal tiles, nav sub-links)
  function openTabForHash(hash, scroll) {
    var id = (hash || "").replace("#", "");
    if (!id) return;
    var panel = doc.querySelector('[data-panel="' + id + '"]');
    if (!panel) return;
    var group = panel.closest("[data-tabs]");
    if (group && group.show) group.show(id);
    if (scroll) {
      var anchor = group.querySelector(".tabs__nav") || group;
      anchor.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }
  doc.querySelectorAll('a[href*="#"]').forEach(function (a) {
    var href = a.getAttribute("href");
    var hash = href.slice(href.indexOf("#"));
    var samePage = href.indexOf("#") === 0 || href.split("#")[0].replace(/\?.*$/, "") === location.pathname.split("/").pop();
    if (!samePage) return;
    a.addEventListener("click", function (e) {
      if (doc.querySelector('[data-panel="' + hash.slice(1) + '"]')) { e.preventDefault(); history.replaceState(null, "", hash); openTabForHash(hash, true); }
    });
  });
  window.addEventListener("hashchange", function () { openTabForHash(location.hash, false); });

  /* ------------------------------------------------------------ bio clamping */
  doc.querySelectorAll(".member__bio").forEach(function (bio) {
    if (bio.scrollHeight > bio.clientHeight + 2) {
      var btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "member__more";
      btn.textContent = "Read more";
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var open = bio.classList.toggle("is-open");
        btn.textContent = open ? "Read less" : "Read more";
        btn.setAttribute("aria-expanded", String(open));
      });
      bio.after(btn);
    }
  });

  /* ------------------------------------------------------------------ marquee */
  doc.querySelectorAll(".marquee__track").forEach(function (track) {
    if (reduceMotion) { track.classList.add("is-static"); return; }
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.parentElement.appendChild(clone);
  });

  /* ------------------------------------------------------------- financing chip */
  var chip = doc.getElementById("financing-chip");
  if (chip) {
    var dismissed = false;
    try { dismissed = sessionStorage.getItem("flamingo-financing-dismissed") === "1"; } catch (e) {}
    if (!dismissed && !doc.body.classList.contains("page--financing")) {
      setTimeout(function () { chip.hidden = false; }, 1400);
      chip.querySelector(".financing-chip__close").addEventListener("click", function () {
        chip.hidden = true;
        try { sessionStorage.setItem("flamingo-financing-dismissed", "1"); } catch (e) {}
      });
    }
  }

  /* ------------------------------------------------------------- contact path */
  // for-providers links to contact.html?path=provider: preselect the provider tab
  var params = new URLSearchParams(location.search);
  if (params.get("path") === "provider") {
    var g = doc.querySelector("[data-tabs='contact']");
    if (g && g.show) g.show("provider");
  }
})();
