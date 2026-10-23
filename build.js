#!/usr/bin/env node
/*
 * Flamingo static site builder. Zero dependencies.
 *
 *   node build.js            build src/ -> dist/
 *   node build.js --watch    rebuild whenever src/ changes
 *   node build.js --serve    build, watch, and serve dist/ on http://localhost:3000
 *
 * Template syntax (used in src/layout.html, src/partials/*.html, src/pages/*.html):
 *   {{> name}}         include src/partials/name.html
 *   {{icon:name}}      inline SVG icon from the sprite (see src/partials/icons.html)
 *   {{site.key}}       value from site.config.js
 *   {{page.key}}       value from the page's front matter
 *   {{nav}}            generated main navigation (from site.config.js)
 *   {{footer}}         generated footer link columns
 *   {{year}}           current year
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

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
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
// navigation + footer generation
// ---------------------------------------------------------------------------

function icon(name, cls) {
  return `<svg class="icon${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
}

function renderNav(current) {
  const items = site.nav
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

  // partial includes
  out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => render(partial(name), ctx, depth + 1));

  // icons
  out = out.replace(/\{\{icon:([\w-]+)(?:\s+([\w\s-]+))?\}\}/g, (_, name, cls) => icon(name, cls));

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
  page.titleEsc = escapeHtml(page.fullTitle);
  page.descriptionEsc = escapeHtml(page.description);

  const ctx = {
    page,
    navHtml: renderNav(page.nav),
    footerHtml: renderFooterColumns(),
  };

  // Render the page body first (so its partials/icons resolve), then slot it into the layout.
  const content = render(body, ctx);
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
  if (fs.existsSync(ASSETS)) copyDir(ASSETS, path.join(DIST, "assets"));

  const pages = fs.readdirSync(PAGES).filter((f) => f.endsWith(".html")).sort();
  for (const file of pages) buildPage(file);

  // Simple sitemap so the deployed site has one.
  const urls = pages
    .map((f) => f.replace(/\.html$/, ""))
    .filter((s) => s !== "404")
    .map((s) => `  <url><loc>${site.url}/${s === "index" ? "" : s}</loc></url>`)
    .join("\n");
  fs.writeFileSync(
    path.join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
  fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(`built ${pages.length} pages -> dist/ in ${Date.now() - started}ms`);
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
