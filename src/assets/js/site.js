/* Flamingo site behaviour. No dependencies. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var THEMES = ["dark", "light", "warm", "bright", "elite"];
  var THEME_COLORS = { dark: "#07090B", light: "#FFFFFF", warm: "#FBF6EE", bright: "#FFFFFF", elite: "#0C0B0A" };
  var PHOTOS = "assets/img/photos/";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = function () { return window.innerWidth < 900; };

  /* ------------------------------------------------------------ theme photos */
  function applyThemeImages(t) {
    doc.querySelectorAll("img[data-img]").forEach(function (img) {
      var base = img.getAttribute("data-img");
      var want = img.getAttribute("data-img-" + t) || base;
      if ((img.getAttribute("data-img-current") || base) === want) return;
      if (img.hasAttribute("data-portrait")) { img.src = PHOTOS + want + "-portrait.webp"; }
      else {
        img.srcset = PHOTOS + want + "-800.webp 800w, " + PHOTOS + want + "-1200.webp 1200w, " + PHOTOS + want + "-1920.webp 1920w";
        img.src = PHOTOS + want + "-1200.webp";
      }
      img.setAttribute("data-img-current", want);
    });
  }

  /* ------------------------------------------------------------------ theme */
  function setTheme(t) {
    if (t === "playful") t = "bright";
    if (THEMES.indexOf(t) < 0) return;
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("flamingo-theme", t); } catch (e) {}
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[t]);
    doc.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-theme") === t));
    });
    applyThemeImages(t);
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
  var revealEls = doc.querySelectorAll(".reveal, [data-draw], [data-bar], [data-count], .steps--line, .timeline");
  function activate(el) {
    el.classList.add("in-view");
    if (el.hasAttribute("data-count")) countUp(el);
  }
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in-view"); if (el.hasAttribute("data-count")) el.textContent = el.getAttribute("data-count"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { activate(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------------------- count-up */
  // <strong data-count="12" data-suffix="+">0</strong>  (non-numeric placeholders like XX are left alone)
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var suffix = el.getAttribute("data-suffix") || "", prefix = el.getAttribute("data-prefix") || "";
    var decimals = (String(el.getAttribute("data-count")).split(".")[1] || "").length;
    var dur = 1400, start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- parallax */
  // [data-parallax="0.18"] moves at a fraction of scroll while in view (desktop only).
  var pxEls = Array.prototype.slice.call(doc.querySelectorAll("[data-parallax]"));
  if (pxEls.length && !reduceMotion) {
    var ticking = false;
    function parallax() {
      ticking = false;
      if (isMobile()) { pxEls.forEach(function (el) { el.style.transform = ""; }); return; }
      var vh = window.innerHeight;
      pxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var f = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        var center = r.top + r.height / 2 - vh / 2;
        el.style.transform = "translate3d(0," + (-center * f).toFixed(1) + "px,0)";
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    window.addEventListener("resize", parallax);
    parallax();
  }

  /* ------------------------------------------------------------------- video */
  doc.querySelectorAll("video[autoplay]").forEach(function (v) {
    if (reduceMotion) { v.removeAttribute("autoplay"); v.pause(); return; }
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  });

  /* ---------------------------------------------------- featured service tiles */
  doc.querySelectorAll("[data-tiles]").forEach(function (wrap) {
    var panel = wrap.querySelector(".tiles__panel");
    var panelImg = wrap.querySelector(".tiles__img");
    var panelNum = wrap.querySelector(".tiles__num");
    var panelTitle = wrap.querySelector(".tiles__title");
    var panelText = wrap.querySelector(".tiles__text");
    var panelLink = wrap.querySelector(".tiles__link");
    var panelIcon = wrap.querySelector(".tiles__icon use");
    var tiles = wrap.querySelectorAll(".tile");
    function activateTile(tile) {
      tiles.forEach(function (t) { t.classList.toggle("is-active", t === tile); t.setAttribute("aria-selected", String(t === tile)); });
      if (panel) panel.setAttribute("data-tint", tile.getAttribute("data-tint") || "1");
      if (panelImg) {
        var slug = tile.getAttribute("data-image");
        if (slug && panelImg.getAttribute("data-img-current") !== slug) {
          panelImg.classList.add("is-switching");
          var next = new Image();
          next.onload = function () {
            panelImg.src = PHOTOS + slug + "-1200.webp";
            panelImg.srcset = PHOTOS + slug + "-800.webp 800w, " + PHOTOS + slug + "-1200.webp 1200w, " + PHOTOS + slug + "-1920.webp 1920w";
            panelImg.setAttribute("data-img-current", slug);
            panelImg.classList.remove("is-switching");
          };
          next.src = PHOTOS + slug + "-1200.webp";
        }
      }
      if (panelNum) panelNum.textContent = tile.getAttribute("data-num") || "";
      if (panelTitle) panelTitle.textContent = tile.getAttribute("data-title") || tile.textContent.trim();
      if (panelText) panelText.textContent = tile.getAttribute("data-text") || "";
      if (panelLink) panelLink.setAttribute("href", tile.getAttribute("data-href") || "#");
      if (panelIcon) panelIcon.setAttribute("href", "#i-" + (tile.getAttribute("data-icon") || "sparkles"));
    }
    tiles.forEach(function (tile) {
      tile.addEventListener("mouseenter", function () { if (window.innerWidth >= 1024) activateTile(tile); });
      tile.addEventListener("focus", function () { activateTile(tile); });
      tile.addEventListener("click", function (e) {
        if (!tile.classList.contains("is-active") && window.innerWidth < 1024) { e.preventDefault(); activateTile(tile); }
        else if (window.innerWidth < 1024 && tile.getAttribute("data-href")) { location.href = tile.getAttribute("data-href"); }
      });
    });
    if (tiles.length) activateTile(tiles[0]);
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

  /* ------------------------------------------------------- marquee + ticker */
  doc.querySelectorAll(".marquee__track, .ticker__track").forEach(function (track) {
    if (reduceMotion) { track.classList.add("is-static"); return; }
    var clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.parentElement.appendChild(clone);
  });

  /* ------------------------------------------------------ pointer-tilt cards */
  // [data-tilt] cards tilt slightly toward the pointer (desktop, no reduced motion).
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    doc.querySelectorAll("[data-tilt]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--tx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--ty", (y * 100).toFixed(1) + "%");
        el.style.transform = "perspective(900px) rotateX(" + (-y * 6).toFixed(2) + "deg) rotateY(" + (x * 6).toFixed(2) + "deg) translateY(-3px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* -------------------------------------------------------- demo contact forms */
  // Native forms are not wired to a CRM yet. Submitting shows the notice instead
  // of posting anywhere. Replace this with the client's form handler when ready.
  doc.querySelectorAll("form[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.reportValidity && !form.reportValidity()) return;
      var notice = form.querySelector(".form__notice");
      if (notice) { notice.classList.add("is-visible"); notice.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" }); }
    });
  });

  /* ------------------------------------------------------------- financing chip */
  var chip = doc.getElementById("financing-chip");
  if (chip) {
    var dismissed = false;
    try { dismissed = sessionStorage.getItem("flamingo-financing-dismissed") === "1"; } catch (e) {}
    if (!dismissed && !doc.body.classList.contains("page--financing")) {
      var shown = false;
      function maybeShowChip() {
        if (shown || window.scrollY < window.innerHeight * 0.6) return;
        shown = true; chip.hidden = false;
      }
      window.addEventListener("scroll", maybeShowChip, { passive: true });
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
