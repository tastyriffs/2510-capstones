#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const PROJECTS_DIR = path.join(__dirname, "..", "projects");
const HEADSHOTS_DIR = path.join(__dirname, "..", "headshots");
const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");
const OUT_DIR = path.join(__dirname, "..", "docs");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Derive the filename base from a student's full name: "Sam Rivera" → "sam-rivera"
function studentBase(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Find the first file in dir whose name (without extension) matches base-suffix
function findImage(dir, base, suffix) {
  if (!fs.existsSync(dir)) return null;
  const target = `${base}-${suffix}`;
  const match = fs.readdirSync(dir).find((f) => {
    const noExt = f.slice(0, f.lastIndexOf(".")) || f;
    return noExt === target;
  });
  return match || null;
}

// ---------------------------------------------------------------------------
// Load project YAML files
// ---------------------------------------------------------------------------

function loadProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.warn("No projects/ directory found — nothing to build.");
    return [];
  }

  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => (f.endsWith(".yml") || f.endsWith(".yaml")) && !f.startsWith("_"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8");
      const data = yaml.load(raw);
      if (!data.title || !data.student) {
        throw new Error(`${file} is missing required fields: title, student`);
      }
      data._slug = slug(data.title);
      data._file = file;
      return data;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// HTML shell
// ---------------------------------------------------------------------------

function shell(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | AI/ML Cohort 2510: Student Capstone Projects</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="icon" type="image/png" href="/2510-capstones/assets/logo.png" />
  <link rel="stylesheet" href="/2510-capstones/style.css" />
</head>
<body>
  <header>
    <div class="header-inner">
      <a class="site-logo" href="/2510-capstones/">
        <img src="/2510-capstones/assets/logo.png" alt="Fullstack Academy" height="36" />
      </a>
      <a class="site-title" href="/2510-capstones/">AI/ML Cohort 2510: Student Capstone Projects</a>
    </div>
  </header>
  <main>
${bodyHtml}
  </main>
  <footer>
    <p>Add your project via a pull request — see the <a href="https://github.com/FullstackAcademy/2510-capstones">repo README</a>.</p>
  </footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Index page
// ---------------------------------------------------------------------------

function buildIndex(projects) {
  const cards = projects
    .map(
      (p) => `
    <article class="project-card">
      ${p._headshot ? `<img class="card-avatar" src="/2510-capstones/assets/headshots/${escapeHtml(p._headshot)}" alt="${escapeHtml(p.student)}" />` : "<div class=\"card-avatar card-avatar--empty\"></div>"}
      <div class="card-body">
        <h2><a href="/2510-capstones/projects/${escapeHtml(p._slug)}/">${escapeHtml(p.title)}</a></h2>
        <p class="student-name">${escapeHtml(p.student)}</p>
        ${p.tagline ? `<p class="tagline">${escapeHtml(p.tagline)}</p>` : ""}
        ${
          p.tags && p.tags.length
            ? `<ul class="tags">${p.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
            : ""
        }
      </div>
    </article>`
    )
    .join("\n");

  const body =
    projects.length === 0
      ? `<p class="empty">No projects yet — be the first to <a href="https://github.com/FullstackAcademy/2510-capstones">submit yours</a>!</p>`
      : `<h1>All Projects</h1>\n    <div class="project-grid">${cards}\n    </div>`;

  return shell("All Projects", body);
}

// ---------------------------------------------------------------------------
// Detail page
// ---------------------------------------------------------------------------

function buildDetail(p) {
  const repoLine = p.repo
    ? `<p><strong>Repo:</strong> <a href="${escapeHtml(p.repo)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.repo)}</a></p>`
    : "";
  const demoLine = p.demo
    ? `<p><strong>Demo:</strong> <a href="${escapeHtml(p.demo)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.demo)}</a></p>`
    : "";
  const tagsLine =
    p.tags && p.tags.length
      ? `<ul class="tags">${p.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
      : "";
  const descLine = p.description
    ? `<div class="description"><p>${escapeHtml(p.description)}</p></div>`
    : "";

  const contactLinks = [
    p.email    ? `<a href="mailto:${escapeHtml(p.email)}" aria-label="Email">&#9993; ${escapeHtml(p.email)}</a>` : null,
    p.website  ? `<a href="${escapeHtml(p.website)}" target="_blank" rel="noopener noreferrer" aria-label="Website">&#127760; ${escapeHtml(p.website)}</a>` : null,
    p.linkedin ? `<a href="https://linkedin.com/in/${escapeHtml(p.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">in/${escapeHtml(p.linkedin)}</a>` : null,
    p.twitter  ? `<a href="https://x.com/${escapeHtml(p.twitter.replace(/^@/, ""))}" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">@${escapeHtml(p.twitter.replace(/^@/, ""))}</a>` : null,
    p.github   ? `<a href="https://github.com/${escapeHtml(p.github)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub">github.com/${escapeHtml(p.github)}</a>` : null,
  ].filter(Boolean);
  const contactSection = contactLinks.length
    ? `<div class="contact-links">${contactLinks.join("")}</div>`
    : "";
  const headshotImg = p._headshot
    ? `<img class="detail-headshot" src="/2510-capstones/assets/headshots/${escapeHtml(p._headshot)}" alt="${escapeHtml(p.student)}" />`
    : "";
  const screenshotFig = p._screenshot
    ? `<figure class="detail-screenshot">
        <img src="/2510-capstones/assets/screenshots/${escapeHtml(p._screenshot)}" alt="${escapeHtml(p.title)} screenshot" />
        <figcaption>${escapeHtml(p.title)} — app screenshot</figcaption>
      </figure>`
    : "";

  const body = `
    <a class="back-link" href="/2510-capstones/">&larr; All Projects</a>
    <div class="detail-header">
      ${headshotImg}
      <div class="detail-meta">
        <h1>${escapeHtml(p.title)}</h1>
        <p class="student-name">${escapeHtml(p.student)}</p>
        ${p.tagline ? `<p class="tagline">${escapeHtml(p.tagline)}</p>` : ""}
        ${repoLine}
        ${demoLine}
        ${tagsLine}
      </div>
    </div>
    ${descLine}
    ${screenshotFig}
    ${contactSection}`;

  return shell(p.title, body);
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

const CSS = `
:root {
  --red: #EF2020;
  --pink: #ff7a7a;
  --black: #000000;
  --white: #ffffff;
  --grey: #f5f5f5;
  --border: #e0e0e0;
  --muted: #555555;
}

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: var(--white);
  color: var(--black);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: var(--white);
  border-bottom: 3px solid var(--red);
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.site-logo img {
  display: block;
  height: 36px;
  width: auto;
}

.site-title {
  color: var(--black);
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.site-title:hover { color: var(--red); }

main {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  width: 100%;
}

h1 {
  margin-bottom: 1.5rem;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

footer {
  text-align: center;
  padding: 1.5rem;
  font-size: 0.875rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
  background: var(--grey);
}

footer a { color: var(--red); }
footer a:hover { color: var(--pink); }

/* Project grid */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.project-card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: 4px;
  padding: 1.25rem;
  transition: border-color 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
}

.project-card:hover {
  border-color: var(--red);
  box-shadow: 4px 4px 0 var(--red);
}

.project-card h2 { font-size: 1.1rem; margin-bottom: 0.35rem; font-weight: 700; }
.project-card h2 a { color: var(--black); text-decoration: none; }
.project-card h2 a:hover { color: var(--red); }

.student-name { font-weight: 600; color: var(--red); margin-bottom: 0.4rem; font-size: 0.9rem; }

.tagline { color: var(--muted); font-size: 0.9rem; margin-bottom: 0.5rem; }

.tags {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.tags li {
  background: var(--black);
  color: var(--white);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.6rem;
  border-radius: 2px;
}

/* Card avatar */
.card-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}

.card-avatar--empty {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--grey);
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}

.card-body { flex: 1; }

/* Detail page */
.back-link {
  display: inline-block;
  margin-bottom: 1.25rem;
  color: var(--red);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
}

.back-link:hover { color: var(--pink); text-decoration: underline; }

.detail-header {
  display: flex;
  gap: 1.75rem;
  align-items: flex-start;
  margin-bottom: 1.75rem;
}

.detail-headshot {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--red);
  flex-shrink: 0;
}

.detail-meta { flex: 1; }
.detail-meta h1 { margin-bottom: 0.3rem; }
.detail-meta .student-name { margin-bottom: 0.4rem; font-size: 1.2rem; }
.detail-meta .tagline { margin-bottom: 0.75rem; }
.detail-meta p + p { margin-top: 0.35rem; }
.detail-meta a { color: var(--red); }
.detail-meta a:hover { color: var(--pink); }

.description {
  margin-bottom: 1.5rem;
  line-height: 1.7;
  color: #333;
  max-width: 680px;
}

.detail-screenshot {
  margin-top: 2rem;
}

.detail-screenshot img {
  display: block;
  width: 100%;
  max-width: 800px;
  border: 1.5px solid var(--border);
  border-radius: 4px;
}

.detail-screenshot figcaption {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--muted);
}

.empty { font-size: 1.1rem; color: var(--muted); }

/* Contact links */
.contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1.25rem;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}

.contact-links a {
  color: var(--red);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}

.contact-links a:hover {
  color: var(--pink);
  text-decoration: underline;
}
`.trim();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  ensureDir(OUT_DIR);

  const projects = loadProjects();

  // Resolve and copy images
  const outHeadshots = path.join(OUT_DIR, "assets", "headshots");
  const outScreenshots = path.join(OUT_DIR, "assets", "screenshots");
  ensureDir(outHeadshots);
  ensureDir(outScreenshots);

  for (const p of projects) {
    const base = studentBase(p.student);
    const hs = findImage(HEADSHOTS_DIR, base, "headshot");
    if (hs) {
      fs.copyFileSync(path.join(HEADSHOTS_DIR, hs), path.join(outHeadshots, hs));
      p._headshot = hs;
    }
    const ss = findImage(SCREENSHOTS_DIR, base, "screenshot");
    if (ss) {
      fs.copyFileSync(path.join(SCREENSHOTS_DIR, ss), path.join(outScreenshots, ss));
      p._screenshot = ss;
    }
  }

  // Write CSS
  fs.writeFileSync(path.join(OUT_DIR, "style.css"), CSS, "utf8");

  // Write index
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), buildIndex(projects), "utf8");

  // Write detail pages
  const projectsOut = path.join(OUT_DIR, "projects");
  ensureDir(projectsOut);

  for (const p of projects) {
    const dir = path.join(projectsOut, p._slug);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, "index.html"), buildDetail(p), "utf8");
  }

  console.log(`Built ${projects.length} project page(s) → docs/`);
}

main();
