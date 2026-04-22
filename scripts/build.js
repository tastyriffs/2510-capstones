#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const PROJECTS_DIR = path.join(__dirname, "..", "projects");
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
  <title>${escapeHtml(title)} | Capstone Projects</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/2510-capstones/style.css" />
</head>
<body>
  <header>
    <div class="header-inner">
      <a class="site-logo" href="/2510-capstones/">
        <img src="/2510-capstones/assets/logo.png" alt="Fullstack Academy" height="36" />
      </a>
      <a class="site-title" href="/2510-capstones/">Student Capstone Projects</a>
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
      <h2><a href="/2510-capstones/projects/${escapeHtml(p._slug)}/">${escapeHtml(p.title)}</a></h2>
      <p class="student-name">${escapeHtml(p.student)}</p>
      ${p.tagline ? `<p class="tagline">${escapeHtml(p.tagline)}</p>` : ""}
      ${
        p.tags && p.tags.length
          ? `<ul class="tags">${p.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
          : ""
      }
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

  const body = `
    <a class="back-link" href="/2510-capstones/">&larr; All Projects</a>
    <h1>${escapeHtml(p.title)}</h1>
    <p class="student-name">${escapeHtml(p.student)}</p>
    ${p.tagline ? `<p class="tagline">${escapeHtml(p.tagline)}</p>` : ""}
    ${descLine}
    ${repoLine}
    ${demoLine}
    ${tagsLine}`;

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

.description {
  margin: 1.25rem 0;
  line-height: 1.7;
  color: #333;
  max-width: 680px;
}

.empty { font-size: 1.1rem; color: var(--muted); }
`.trim();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  ensureDir(OUT_DIR);

  const projects = loadProjects();

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

  console.log(
    `Built ${projects.length} project page(s) → docs/`
  );
}

main();
