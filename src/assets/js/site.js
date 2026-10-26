/* Flamingo site behaviour. No dependencies. Loaded with `defer`. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var THEMES = ["dark", "light", "warm", "bright", "elite"];
  var SPLIT_HERO = { light: 1, warm: 1, bright: 1 }; // themes whose photo hero is a half-width panel
  var THEME_COLORS = { dark: "#07090B", light: "#FFFFFF", warm: "#FBF6EE", bright: "#FFFFFF", elite: "#0C0B0A" };
  var PHOTOS = "assets/img/photos/";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = function () { return window.innerWidth < 900; };

  /* ------------------------------------------------------------ theme photos */
  // Every photo carries data-img (default slug) and optional data-img-<theme> / data-pos-<theme> overrides.
  function applyThemeImages(t) {
    doc.querySelectorAll("img[data-img]").forEach(function (img) {
      var base = img.getAttribute("data-img");
      var want = img.getAttribute("data-img-" + t) || base;
      var pos = img.getAttribute("data-pos-" + t) || img.getAttribute("data-pos") || "";
      img.style.objectPosition = pos;
      if (img.classList.contains("hero__img")) img.sizes = SPLIT_HERO[t] ? "(max-width: 899px) 100vw, 50vw" : "100vw";
      if (img.getAttribute("data-img-current") === want) return;
      if (img.hasAttribute("data-portrait")) {
        img.src = PHOTOS + want + "-portrait.webp";
      } else {
        img.srcset = PHOTOS + want + "-800.webp 800w, " + PHOTOS + want + "-1200.webp 1200w, " + PHOTOS + want + "-1920.webp 1920w";
        img.src = PHOTOS + want + "-1200.webp";
      }
      img.setAttribute("data-img-current", want);
    });
  }

  /* ------------------------------------------------------------------ theme */
  var fontLink = doc.querySelector("link[data-theme-fonts]");
  function setTheme(t, fromUser) {
    if (t === "playful") t = "bright";
    if (THEMES.indexOf(t) < 0) return;
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("flamingo-theme", t); } catch (e) {}
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[t]);
    if (fromUser && fontLink && window.FLAMINGO_FONTS && window.FLAMINGO_FONTS[t]) fontLink.href = window.FLAMINGO_FONTS[t];
    doc.querySelectorAll("[data-set-theme]").forEach(function (b) {
      var on = b.getAttribute("data-set-theme") === t;
      b.setAttribute("aria-checked", String(on));
      if (on) {
        var cur = doc.querySelector("[data-theme-current]"), sw = doc.querySelector("[data-theme-swatch]");
        if (cur) cur.textContent = b.getAttribute("data-theme-name") || t;
        if (sw) sw.className = "theme-switch__swatch theme-switch__swatch--" + t;
      }
    });
    applyThemeImages(t);
    // keep ?theme= on internal links so the chosen version follows you between pages
    doc.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return;
      var clean = href.replace(/([?&])theme=[^&#]*(&?)/, function (_, p, amp) { return amp ? p : ""; }).replace(/\?(#|$)/, "$1");
      var parts = clean.split("#");
      var base = parts[0], hash = parts[1] ? "#" + parts[1] : "";
      a.setAttribute("href", base + (base.indexOf("?") >= 0 ? "&" : "?") + "theme=" + t + hash);
    });
  }

  // Design switcher: compact trigger + upward menu
  var switcher = doc.getElementById("theme-switch");
  if (switcher) {
    var trigger = switcher.querySelector(".theme-switch__trigger");
    var menu = switcher.querySelector(".theme-switch__menu");
    var items = Array.prototype.slice.call(menu.querySelectorAll("[data-set-theme]"));
    function openMenu(open) {
      menu.hidden = !open;
      switcher.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        var current = items.filter(function (b) { return b.getAttribute("aria-checked") === "true"; })[0] || items[0];
        current.focus();
      }
    }
    trigger.addEventListener("click", function () { openMenu(menu.hidden); });
    items.forEach(function (b, i) {
      b.addEventListener("click", function () { setTheme(b.getAttribute("data-set-theme"), true); openMenu(false); trigger.focus(); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus(); }
      });
    });
    doc.addEventListener("click", function (e) { if (!menu.hidden && !switcher.contains(e.target)) openMenu(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { openMenu(false); trigger.focus(); } });
  }
  // On phones the switcher lives in the header bar; on larger screens it floats bottom-right.
  var headerActions = doc.querySelector(".site-header__actions");
  function placeSwitcher() {
    if (!switcher || !headerActions) return;
    var inHeader = switcher.parentElement === headerActions;
    if (window.innerWidth < 768 && !inHeader) headerActions.insertBefore(switcher, headerActions.firstChild);
    else if (window.innerWidth >= 768 && inHeader) doc.body.appendChild(switcher);
  }
  placeSwitcher();
  window.addEventListener("resize", placeSwitcher);
  setTheme(root.getAttribute("data-theme") || "dark", false);

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
  // [data-parallax="0.18"] moves at a fraction of scroll while in view (desktop, full-bleed heroes only).
  var pxEls = Array.prototype.slice.call(doc.querySelectorAll("[data-parallax]"));
  if (pxEls.length && !reduceMotion) {
    var ticking = false;
    function parallax() {
      ticking = false;
      var t = root.getAttribute("data-theme");
      if (isMobile() || SPLIT_HERO[t]) { pxEls.forEach(function (el) { el.style.transform = ""; }); return; }
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
    doc.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-set-theme]")) setTimeout(parallax, 0); });
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

  /* --------------------------------------------------------------- FAQ groups */
  // One answer open at a time within a .faq group (opening the next closes the previous).
  doc.querySelectorAll(".faq").forEach(function (group) {
    group.querySelectorAll("details").forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        group.querySelectorAll("details[open]").forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });

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

  /* ------------------------------------------------------------------ ticker */
  doc.querySelectorAll(".ticker__track").forEach(function (track) {
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
  // Appears once the hero has scrolled away, hides again near the footer. Never on the financing page itself.
  var chip = doc.getElementById("financing-chip");
  if (chip && !doc.body.classList.contains("page--financing")) {
    var dismissed = false;
    try { dismissed = sessionStorage.getItem("flamingo-financing-dismissed") === "1"; } catch (e) {}
    if (!dismissed) {
      var hero = doc.querySelector(".hero");
      var chipVisible = false, chipTicking = false;
      function placeChip() {
        chipTicking = false;
        var y = window.scrollY, vh = window.innerHeight;
        var past = hero ? y > hero.offsetTop + hero.offsetHeight - 80 : y > vh * 0.8;
        var nearEnd = y + vh > doc.documentElement.scrollHeight - 720;
        var show = past && !nearEnd && window.innerWidth >= 1024;
        if (show === chipVisible) return;
        chipVisible = show;
        if (show) { chip.hidden = false; requestAnimationFrame(function () { chip.classList.add("is-visible"); }); }
        else { chip.classList.remove("is-visible"); setTimeout(function () { if (!chipVisible) chip.hidden = true; }, 380); }
      }
      window.addEventListener("scroll", function () { if (!chipTicking) { chipTicking = true; requestAnimationFrame(placeChip); } }, { passive: true });
      window.addEventListener("resize", placeChip);
      chip.querySelector(".financing-chip__close").addEventListener("click", function () {
        chipVisible = false; chip.classList.remove("is-visible"); chip.hidden = true;
        try { sessionStorage.setItem("flamingo-financing-dismissed", "1"); } catch (e) {}
      });
      placeChip();
    }
  }

  /* ------------------------------------------------------------- partner view */
  // ?partner=1 switches on a partner-facing layer (header pill, numbered pins on sections tagged data-pin, a bottom bar).
  // It is remembered for the session only and never appears for ordinary visitors. ?partner=0 switches it off.
  var pq = new URLSearchParams(location.search).get("partner");
  var partnerOn = false;
  try {
    if (pq === "1") sessionStorage.setItem("flamingo-partner", "1");
    if (pq === "0") sessionStorage.removeItem("flamingo-partner");
    partnerOn = sessionStorage.getItem("flamingo-partner") === "1";
  } catch (e) { partnerOn = pq === "1"; }
  if (partnerOn) {
    doc.body.classList.add("partner-mode");
    var PARTNER_PAGE = "partner-overview.html";
    var pill = doc.querySelector(".partner-pill"); if (pill) { pill.hidden = false; pill.href = PARTNER_PAGE; }
    doc.querySelectorAll("[data-pin]").forEach(function (el) {
      var a = doc.createElement("a");
      a.className = "partner-pin";
      a.href = PARTNER_PAGE + (el.getAttribute("data-pin-target") ? "#" + el.getAttribute("data-pin-target") : "");
      a.innerHTML = "<b>" + el.getAttribute("data-pin") + "</b><span>" + (el.getAttribute("data-pin-label") || "") + "</span>";
      el.appendChild(a);
    });
    if (!doc.body.classList.contains("page--partner")) {
      var bar = doc.createElement("div");
      bar.className = "partner-bar";
      bar.innerHTML = "<span>Partner view</span><a href=\"" + PARTNER_PAGE + "\">Buyer overview &amp; stack</a><button type=\"button\">Hide</button>";
      bar.querySelector("button").addEventListener("click", function () {
        try { sessionStorage.removeItem("flamingo-partner"); } catch (e) {}
        doc.body.classList.remove("partner-mode"); bar.remove();
        doc.querySelectorAll(".partner-pin").forEach(function (p) { p.remove(); });
      });
      doc.body.appendChild(bar);
    }
    // keep partner=1 on internal links so the layer follows the tour
    doc.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href) || /[?&]partner=/.test(href)) return;
      var parts = href.split("#");
      a.setAttribute("href", parts[0] + (parts[0].indexOf("?") >= 0 ? "&" : "?") + "partner=1" + (parts[1] ? "#" + parts[1] : ""));
    });
  }

  /* ------------------------------------------------------------- scrollspy menus */
  // <nav data-spy> with #section links: the link for the section in view is marked .is-active and kept visible in a horizontal bar.
  doc.querySelectorAll("nav[data-spy]").forEach(function (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll("a[href^='#']"));
    var targets = links.map(function (a) { return doc.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
    if (!targets.length) return;
    function setActive(id) {
      links.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("is-active", on);
        if (on && nav.scrollWidth > nav.clientWidth) a.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
    function spy() {
      var line = window.innerHeight * 0.35, current = targets[0];
      targets.forEach(function (t) { if (t.getBoundingClientRect().top <= line) current = t; });
      if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 2) current = targets[targets.length - 1];
      setActive(current.id);
    }
    var spyTick = false;
    window.addEventListener("scroll", function () { if (!spyTick) { spyTick = true; requestAnimationFrame(function () { spyTick = false; spy(); }); } }, { passive: true });
    links.forEach(function (a) { a.addEventListener("click", function () { setActive(a.getAttribute("href").slice(1)); }); });
    spy();
  });

  /* ------------------------------------------------------------- planning tool */
  doc.querySelectorAll("[data-calc]").forEach(function (calc) {
    var fee = parseFloat(calc.getAttribute("data-fee")) || 0;
    var $ = function (k) { return calc.querySelector("[data-in='" + k + "']"); };
    var out = function (k, v) { var el = calc.querySelector("[data-out='" + k + "']"); if (el) el.textContent = v; };
    var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
    function update() {
      var clients = parseFloat($("clients").value) || 0, value = parseFloat($("value").value) || 0, costs = parseFloat($("costs").value) || 0;
      var revenue = clients * value, fees = fee + costs, net = revenue - fees;
      out("clientsLabel", clients); out("valueLabel", money(value));
      out("revenue", money(revenue)); out("fees", money(fees)); out("net", money(net)); out("annual", money(net * 12));
      out("formula", money(revenue) + " modeled revenue \u2212 " + money(fee) + " platform fee \u2212 " + money(costs) + " entered costs = " + money(net) + " before product and clinical costs");
    }
    calc.querySelectorAll("[data-in]").forEach(function (i) { i.addEventListener("input", update); });
    update();
  });

  /* ------------------------------------------------------------- motion layer */
  // Scroll progress line: --scroll on <html> (0..1), body.has-scrolled once the page has moved.
  var progress = doc.querySelector(".progress");
  if (progress) {
    var progTick = false;
    function setProgress() {
      progTick = false;
      var h = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll", (h > 0 ? Math.min(1, window.scrollY / h) : 0).toFixed(4));
      doc.body.classList.toggle("has-scrolled", window.scrollY > 8);
    }
    window.addEventListener("scroll", function () { if (!progTick) { progTick = true; requestAnimationFrame(setProgress); } }, { passive: true });
    window.addEventListener("resize", setProgress);
    setProgress();
  }

  // Pointer-aware surfaces (mouse only, motion allowed):
  //  - cards learn where the pointer is (--cx / --cy) so the spotlight themes can light that spot
  //  - buttons lean toward the pointer (--mgx / --mgy) in the themes that use a magnetic feel
  //  - the custom cursor: the dot tracks the pointer, the ring eases behind it and grows over anything clickable
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var MAGNET = { dark: 0.22, elite: 0.2, light: 0.14 };
    var INTERACTIVE = "a, button, [role='button'], summary, label, input, select, textarea, .tile, [data-tilt]";
    var cur = doc.querySelector(".cursor");
    var dot = cur && cur.querySelector(".cursor__dot"), ring = cur && cur.querySelector(".cursor__ring");
    var mx = -100, my = -100, rx = -100, ry = -100, ringRaf = null, cursorShown = false;
    function ringLoop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      if (Math.abs(mx - rx) > 0.2 || Math.abs(my - ry) > 0.2) ringRaf = requestAnimationFrame(ringLoop); else ringRaf = null;
    }
    doc.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var t = e.target, closest = t && t.closest ? function (s) { return t.closest(s); } : function () { return null; };
      var card = closest(".card");
      if (card) { var r = card.getBoundingClientRect(); card.style.setProperty("--cx", (e.clientX - r.left) + "px"); card.style.setProperty("--cy", (e.clientY - r.top) + "px"); }
      var btn = closest(".btn"), k = MAGNET[root.getAttribute("data-theme")] || 0;
      if (btn && k) { var b = btn.getBoundingClientRect(); btn.style.setProperty("--mgx", ((e.clientX - (b.left + b.width / 2)) * k).toFixed(1) + "px"); btn.style.setProperty("--mgy", ((e.clientY - (b.top + b.height / 2)) * k).toFixed(1) + "px"); }
      if (cur) {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
        if (!cursorShown) { cursorShown = true; rx = mx; ry = my; root.classList.add("has-cursor"); }
        cur.classList.toggle("is-link", !!closest(INTERACTIVE));
        cur.classList.toggle("is-text", !!closest("input, textarea, select"));
        if (!ringRaf) ringRaf = requestAnimationFrame(ringLoop);
      }
    }, { passive: true });
    doc.addEventListener("pointerout", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".btn") : null;
      if (btn && !(e.relatedTarget && btn.contains(e.relatedTarget))) { btn.style.removeProperty("--mgx"); btn.style.removeProperty("--mgy"); }
    }, { passive: true });
    if (cur) {
      doc.addEventListener("pointerdown", function () { cur.classList.add("is-down"); });
      doc.addEventListener("pointerup", function () { cur.classList.remove("is-down"); });
      root.addEventListener("mouseleave", function () { cur.classList.add("is-out"); });
      root.addEventListener("mouseenter", function () { cur.classList.remove("is-out"); });
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
