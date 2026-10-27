#!/usr/bin/env node
/*
 * Flamingo static site builder. Zero dependencies.
 *
 *   node build.js            build src/ -> dist/ (CSS and JS are minified)
 *   node build.js --watch    rebuild whenever src/ changes
 *   node build.js --serve    build, watch, and serve dist/ on http://localhost:3000
 *
 * Template syntax (used in src/layout.html, src/partials/*.html, src/pages/*.html):
 *   {{> name}}                     include src/partials/name.html
 *   {{icon:name}}                  inline SVG icon from the sprite (see src/partials/icons.html); {{icon:name extra-class}}
 *   {{img:slug|opt=…|…}}           responsive photo, see imgTag() below
 *   {{site.key}}                   value from site.config.js
 *   {{page.key}}                   value from the page's front matter
 *   {{nav}} {{footer}} {{year}}    generated navigation, footer columns, current year
 *   {{#if module:x}} … {{/if}}     conditional blocks (also {{#unless …}}, any:a,b and all:a,b)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const PAGES = path.join(SRC, "pages");
const PARTIALS = path.join(SRC, "partials");
const ASSETS = path.join(SRC, "assets");
const LAYOUT = path.join(SRC, "layout.html");

const site = require("./site.config.js");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(from, to, skip) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (skip && skip(a)) continue;
    if (entry.isDirectory()) copyDir(a, b, skip);
    else fs.copyFileSync(a, b);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Parse a `---` front matter block of simple `key: value` lines. */
function parseFrontMatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    data[key] = value;
  }
  return { data, body: raw.slice(m[0].length) };
}

function getPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// ---------------------------------------------------------------------------
// minifiers (conservative, dependency-free)
// ---------------------------------------------------------------------------

/** Strips comments and collapses whitespace. Strings and url(...) are copied verbatim; spaces inside parentheses are kept (calc, clamp). */
function minifyCss(css) {
  let out = "";
  let i = 0;
  let paren = 0;
  const n = css.length;
  while (i < n) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const e = css.indexOf("*/", i + 2);
      i = e < 0 ? n : e + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let e = css.indexOf(c, i + 1);
      if (e < 0) e = n - 1;
      out += css.slice(i, e + 1);
      i = e + 1;
      continue;
    }
    if (css.startsWith("url(", i)) {
      // url("…") / url('…') may contain ")" inside the quotes (SVG data URIs); unquoted url(…) ends at the first ")".
      let j = i + 4;
      const q = css[j];
      let e;
      if (q === '"' || q === "'") {
        const qe = css.indexOf(q, j + 1);
        e = qe < 0 ? n - 1 : css.indexOf(")", qe);
      } else {
        e = css.indexOf(")", j);
      }
      if (e < 0) e = n - 1;
      out += css.slice(i, e + 1);
      i = e + 1;
      continue;
    }
    if (/\s/.test(c)) {
      let j = i;
      while (j < n && /\s/.test(css[j])) j++;
      const prev = out[out.length - 1];
      const next = css[j];
      if (prev && next) {
        if (paren > 0) {
          if (!/[(,]/.test(prev) && next !== ")") out += " ";
        } else if (!/[{};:,>]/.test(prev) && !/[{};,>]/.test(next)) {
          out += " ";
        }
      }
      i = j;
      continue;
    }
    if (c === "(") paren++;
    if (c === ")") paren = Math.max(0, paren - 1);
    if (c === ";") {
      let j = i + 1;
      while (j < n && /\s/.test(css[j])) j++;
      if (css[j] === "}") {
        i++;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out.trim();
}

/** Drops block comments and whole-line // comments, trims indentation, removes blank lines. Code is otherwise untouched. */
function minifyJs(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"))
    .join("\n");
}

// ---------------------------------------------------------------------------
// navigation + footer generation
// ---------------------------------------------------------------------------

function icon(name, cls) {
  return `<svg class="icon${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
}

/**
 * {{img:slug|class=hero__img|alt=...|sizes=...|pos=center 30%|eager|portrait|dark=other-slug|warm=...|pos-dark=center top}}
 * Renders a responsive <img> from src/assets/img/photos/<slug>-{800,1200,1920}.webp (or <slug>-portrait.webp).
 *   dark= light= warm= bright= elite=   photo to show in that design version instead of `slug`
 *   pos= / pos-<theme>=                 object-position (focal point), overall or per version
 *   eager                               above-the-fold photo: fetched with high priority for the active version only
 *                                       (the <img> gets its src from an inline script right after it, plus a <noscript> fallback)
 *   portrait                            use the 4:5 crop (team portraits)
 * Theme swaps for lazy photos are applied by the inline script at the end of <body> and by site.js on every switch.
 */
const PHOTO_DIR = "assets/img/photos";
const PRODUCT_DIR = "assets/img/products";
const PRODUCT_H = 1000; // product renders are trimmed to a 4:5 box (800x1000) so the intrinsic size is known before load
const THEMES = ["dark", "light", "warm", "bright", "elite", "atelier", "obsidian", "sanctuary", "monolith", "aurora"];
const PHOTO_SET = (s) => `${PHOTO_DIR}/${s}-800.webp 800w, ${PHOTO_DIR}/${s}-1200.webp 1200w, ${PHOTO_DIR}/${s}-1920.webp 1920w`;
function imgTag(spec, ctx) {
  const parts = spec.split("|").map((s) => s.trim()).filter(Boolean);
  const slug = parts.shift();
  const opt = { class: "", alt: "", sizes: "(max-width: 899px) 100vw, 50vw", pos: "", eager: false, portrait: false, product: false };
  const themeSrc = {};
  const themePos = {};
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i === -1) { opt[p] = true; continue; }
    const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim();
    if (THEMES.includes(k)) themeSrc[k] = v;
    else if (k.startsWith("pos-") && THEMES.includes(k.slice(4))) themePos[k.slice(4)] = v;
    else opt[k] = v;
  }
  if (opt.product) {
    // Product render (transparent WebP): src/assets/img/products/<slug>-400.webp and -800.webp. Not themed, not filtered.
    const f = path.join(ASSETS, "img", "products", `${slug}-800.webp`);
    if (!fs.existsSync(f)) throw new Error(`Missing product render: ${f}`);
    const sizes = opt.sizes === "(max-width: 899px) 100vw, 50vw" ? "(max-width: 899px) 40vw, 260px" : opt.sizes;
    return `<img class="product${opt.class ? " " + opt.class : ""}" src="${PRODUCT_DIR}/${slug}-800.webp" srcset="${PRODUCT_DIR}/${slug}-400.webp 400w, ${PRODUCT_DIR}/${slug}-800.webp 800w" sizes="${sizes}" alt="${escapeHtml(opt.alt)}" loading="${opt.eager ? "eager" : "lazy"}" decoding="async" width="800" height="${PRODUCT_H}">`;
  }
  const check = (s) => {
    const f = path.join(ASSETS, "img", "photos", `${s}-${opt.portrait ? "portrait" : "1200"}.webp`);
    if (!fs.existsSync(f)) throw new Error(`Missing photo: ${f}`);
  };
  check(slug);
  Object.values(themeSrc).forEach(check);

  const src = (s) => (opt.portrait ? `${PHOTO_DIR}/${s}-portrait.webp` : `${PHOTO_DIR}/${s}-1200.webp`);
  let attrs = `class="img${opt.class ? " " + opt.class : ""}"`;
  if (!opt.eager) {
    attrs += ` src="${src(slug)}"`;
    if (!opt.portrait) attrs += ` srcset="${PHOTO_SET(slug)}" sizes="${opt.sizes}"`;
  }
  attrs += ` alt="${escapeHtml(opt.alt)}" loading="${opt.eager ? "eager" : "lazy"}" decoding="async" data-img="${slug}"`;
  if (opt.portrait) attrs += ` data-portrait="1"`;
  if (opt.eager) attrs += ` fetchpriority="high" data-eager="1"`;
  if (opt.pos) attrs += ` data-pos="${escapeHtml(opt.pos)}" style="object-position:${escapeHtml(opt.pos)}"`;
  for (const [t, s] of Object.entries(themeSrc)) attrs += ` data-img-${t}="${s}"`;
  for (const [t, p] of Object.entries(themePos)) attrs += ` data-pos-${t}="${escapeHtml(p)}"`;
  let html = `<img ${attrs}>`;

  if (opt.eager) {
    // Set src for the active version only (no wasted download of the default photo), then a no-JS fallback.
    const isHero = /\bhero__img\b/.test(opt.class);
    html +=
      `<script>(function(i,t){var d="${PHOTO_DIR}/",s=i.getAttribute("data-img-"+t)||i.getAttribute("data-img"),p=i.getAttribute("data-pos-"+t);` +
      `if(p)i.style.objectPosition=p;` +
      (isHero ? `i.sizes=/^(light|warm|bright)$/.test(t)?"(max-width: 899px) 100vw, 50vw":"100vw";` : `i.sizes=${JSON.stringify(opt.sizes)};`) +
      `i.srcset=d+s+"-800.webp 800w, "+d+s+"-1200.webp 1200w, "+d+s+"-1920.webp 1920w";i.src=d+s+"-1200.webp";i.setAttribute("data-img-current",s)})` +
      `(document.currentScript.previousElementSibling,document.documentElement.getAttribute("data-theme")||"dark")</script>` +
      `<noscript><img class="img${opt.class ? " " + opt.class : ""}" src="${src(slug)}" srcset="${PHOTO_SET(slug)}" sizes="${opt.sizes}" alt="${escapeHtml(opt.alt)}"></noscript>`;
    if (ctx && !ctx.heroImage) ctx.heroImage = { slug, themeSrc, isHero, sizes: opt.sizes };
  }
  return html;
}

/** Inline snippet for <head>: preload the hero photo of the active version (uses the same srcset/sizes as the <img>, so it is one download). */
function heroPreloadScript(hero) {
  if (!hero) return "";
  const map = JSON.stringify({ default: hero.slug, ...hero.themeSrc });
  const sizes = hero.isHero ? `/^(light|warm|bright)$/.test(t)?"(max-width: 899px) 100vw, 50vw":"100vw"` : JSON.stringify(hero.sizes);
  return (
    `var H=${map},hs=H[t]||H["default"],hd="${PHOTO_DIR}/";` +
    `var pl=d.createElement("link");pl.rel="preload";pl.as="image";pl.setAttribute("fetchpriority","high");` +
    `pl.setAttribute("imagesrcset",hd+hs+"-800.webp 800w, "+hd+hs+"-1200.webp 1200w, "+hd+hs+"-1920.webp 1920w");` +
    `pl.setAttribute("imagesizes",${sizes});d.head.appendChild(pl);`
  );
}

/** Optional modules (site.config.js → modules). Pages, nav items and content blocks tagged with a module are dropped while it is off. */
const MODULES = site.modules || {};
function moduleOn(name) {
  return !!MODULES[name];
}
function evalCondition(expr) {
  // module:x | notice:x | any:x,y | all:x,y
  const [kind, list = ""] = expr.split(":");
  const names = list.split(",").map((s) => s.trim()).filter(Boolean);
  if (kind === "module") return moduleOn(names[0]);
  if (kind === "notice") return !!(site.notices || {})[names[0]];
  if (kind === "any") return names.some(moduleOn);
  if (kind === "all") return names.every(moduleOn);
  throw new Error(`Unknown condition: ${expr}`);
}
function navVisible(item) {
  return !item.module || moduleOn(item.module);
}

function renderNav(current) {
  const items = site.nav
    .filter(navVisible)
    .map((item) => {
      const active = item.match && item.match.includes(current);
      if (!item.children) {
        return `<li class="nav__item${active ? " is-active" : ""}"><a class="nav__link" href="${item.href}">${item.label}</a></li>`;
      }
      const links = item.children
        .map(
          (c) =>
            `<li><a class="menu__link" href="${c.href}">` +
            `<span class="menu__icon">${icon(c.icon)}</span>` +
            `<span><span class="menu__label">${c.label}</span><span class="menu__desc">${c.desc}</span></span>` +
            `</a></li>`
        )
        .join("");
      const feat = item.featured
        ? `<a class="menu__featured" href="${item.featured.href}">` +
          `<span class="menu__featured-icon">${icon("sparkles")}</span>` +
          `<strong>${item.featured.title}</strong><span>${item.featured.desc}</span>` +
          `<em class="menu__featured-cta">${item.featured.cta} ${icon("arrow-up-right")}</em></a>`
        : "";
      return (
        `<li class="nav__item nav__item--has-menu${active ? " is-active" : ""}">` +
        `<a class="nav__link" href="${item.href}" aria-haspopup="true" aria-expanded="false">${item.label} ${icon("chevron-down", "nav__caret")}</a>` +
        `<div class="menu" role="menu"><div class="menu__inner"><ul class="menu__list">${links}</ul>${feat}</div></div>` +
        `</li>`
      );
    })
    .join("");
  return `<ul class="nav__list">${items}</ul>`;
}

function renderFooterColumns() {
  return site.footer
    .map((col) => {
      const links = col.links
        .filter(navVisible)
        .map((l) => {
          const ext = /^https?:/.test(l.href) ? ` target="_blank" rel="noopener"` : "";
          return `<li><a href="${l.href}"${ext}>${l.label}</a></li>`;
        })
        .join("");
      return `<div class="footer__col"><h4 class="footer__heading">${col.title}</h4><ul class="footer__links">${links}</ul></div>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------

const ASSET_URLS = { css: "assets/css/site.css", js: "assets/js/site.js" }; // replaced with fingerprinted names during build()
const partialCache = new Map();
function partial(name) {
  if (!partialCache.has(name)) {
    const file = path.join(PARTIALS, `${name}.html`);
    if (!fs.existsSync(file)) throw new Error(`Missing partial: ${name}`);
    partialCache.set(name, read(file));
  }
  return partialCache.get(name);
}

function render(template, ctx, depth = 0) {
  if (depth > 20) throw new Error("Template include depth exceeded (circular partial?)");
  let out = template;

  // conditional blocks: {{#if module:peptides}}…{{/if}}  {{#unless any:hormones,peptides}}…{{/unless}}  (nesting allowed: innermost resolves first)
  const COND = /\{\{#(if|unless)\s+([\w:,-]+)\s*\}\}((?:(?!\{\{#(?:if|unless)\s)[\s\S])*?)\{\{\/\1\}\}/;
  while (COND.test(out)) {
    out = out.replace(COND, (_, kind, expr, body) => ((kind === "if") === evalCondition(expr) ? body : ""));
  }

  // partial includes
  out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => render(partial(name), ctx, depth + 1));

  // icons
  out = out.replace(/\{\{icon:([\w-]+)(?:\s+([\w\s-]+))?\}\}/g, (_, name, cls) => icon(name, cls));

  // responsive photos
  out = out.replace(/\{\{img:([^}]+)\}\}/g, (_, spec) => imgTag(spec, ctx));

  // special tokens
  out = out.replace(/\{\{nav\}\}/g, () => ctx.navHtml);
  out = out.replace(/\{\{footer\}\}/g, () => ctx.footerHtml);
  out = out.replace(/\{\{year\}\}/g, String(new Date().getFullYear()));

  // variables: {{site.x.y}} and {{page.x}}
  out = out.replace(/\{\{(site|page)\.([\w.]+)\}\}/g, (m, scope, key) => {
    const v = getPath(scope === "site" ? site : ctx.page, key);
    if (v === undefined || v === null) {
      if (scope === "page") return "";
      throw new Error(`Unknown template variable: ${m}`);
    }
    return String(v);
  });

  return out;
}

function buildPage(file) {
  const raw = read(path.join(PAGES, file));
  const { data, body } = parseFrontMatter(raw);
  const slug = file.replace(/\.html$/, "");
  if (data.module && !moduleOn(data.module)) return null; // page belongs to a module that is switched off
  const page = {
    slug,
    url: slug === "index" ? "./" : `${slug}.html`,
    title: data.title || site.name,
    fullTitle: data.title ? `${data.title} | ${site.name}` : `${site.name} | ${site.tagline}`,
    description: data.description || site.description,
    nav: data.nav || "",
    bodyClass: data.bodyClass || "",
    ogImage: data.ogImage || site.ogImage,
    ...data,
  };
  page.robotsMeta = data.noindex ? '<meta name="robots" content="noindex, nofollow">' : "";
  page.titleEsc = escapeHtml(page.fullTitle);
  page.descriptionEsc = escapeHtml(page.description);

  page.assets = ASSET_URLS; // {{page.assets.css}} / {{page.assets.js}} in the layout
  const ctx = {
    page,
    navHtml: renderNav(page.nav),
    footerHtml: renderFooterColumns(),
    heroImage: null,
  };

  // Render the page body first (so its partials/icons resolve and the hero photo is known), then slot it into the layout.
  const content = render(body, ctx);
  page.heroPreload = heroPreloadScript(ctx.heroImage);
  const layout = read(LAYOUT);
  const html = render(layout.replace("{{content}}", () => content), ctx);

  const outFile = path.join(DIST, file);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  return outFile;
}

function build() {
  const started = Date.now();
  partialCache.clear();
  rmrf(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  // Static assets. The stylesheet parts and the script are not copied as-is: they are concatenated / minified below.
  const partsDir = path.join(ASSETS, "css", "parts");
  const siteJs = path.join(ASSETS, "js", "site.js");
  if (fs.existsSync(ASSETS)) copyDir(ASSETS, path.join(DIST, "assets"), (p) => p === partsDir || p === siteJs);

  // Stylesheet: ordered parts (src/assets/css/parts/*.css) -> one minified file. The file name carries a content hash
  // (site.<hash>.css) so browsers and the CDN can cache it forever and still pick up every new build immediately.
  const hash = (s) => require("crypto").createHash("sha1").update(s).digest("hex").slice(0, 10);
  if (fs.existsSync(partsDir)) {
    const css = minifyCss(fs.readdirSync(partsDir).filter((f) => f.endsWith(".css")).sort().map((f) => read(path.join(partsDir, f))).join("\n"));
    fs.mkdirSync(path.join(DIST, "assets", "css"), { recursive: true });
    ASSET_URLS.css = `assets/css/site.${hash(css)}.css`;
    fs.writeFileSync(path.join(DIST, ASSET_URLS.css), css);
  }
  if (fs.existsSync(siteJs)) {
    const js = minifyJs(read(siteJs));
    fs.mkdirSync(path.join(DIST, "assets", "js"), { recursive: true });
    ASSET_URLS.js = `assets/js/site.${hash(js)}.js`;
    fs.writeFileSync(path.join(DIST, ASSET_URLS.js), js);
  }

  const allPages = fs.readdirSync(PAGES).filter((f) => f.endsWith(".html")).sort();
  const built = allPages.map((file) => ({ file, out: buildPage(file) })).filter((b) => b.out !== null);
  const pages = built.map((b) => b.file);
  const noindex = allPages.filter((f) => /^noindex:\s*true/m.test(read(path.join(PAGES, f))));
  const skipped = allPages.filter((f) => !pages.includes(f));

  // Simple sitemap so the deployed site has one.
  const urls = pages
    .map((f) => f.replace(/\.html$/, ""))
    .filter((s) => s !== "404" && !noindex.includes(s + ".html"))
    .map((s) => `  <url><loc>${site.url}/${s === "index" ? "" : s}</loc></url>`)
    .join("\n");
  fs.writeFileSync(
    path.join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
  fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(`built ${pages.length} pages -> dist/ in ${Date.now() - started}ms${skipped.length ? ` (modules off, skipped: ${skipped.join(", ")})` : ""}`);
}

// ---------------------------------------------------------------------------
// watch + serve
// ---------------------------------------------------------------------------

function watch() {
  let timer = null;
  fs.watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (e) {
        console.error("build failed:", e.message);
      }
    }, 120);
  });
  console.log("watching src/ for changes…");
}

function serve(port) {
  const http = require("http");
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2",
  };
  http
    .createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      let file = path.join(DIST, path.normalize(urlPath));
      if (!file.startsWith(DIST)) {
        res.writeHead(403);
        return res.end();
      }
      if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        const nf = path.join(DIST, "404.html");
        return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "Not found");
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    })
    .listen(port, () => console.log(`serving dist/ at http://localhost:${port}`));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
build();
if (args.includes("--watch") || args.includes("--serve")) watch();
if (args.includes("--serve")) {
  const i = args.indexOf("--serve");
  const port = Number(args[i + 1]) || 3000;
  serve(port);
}
