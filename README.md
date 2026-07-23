# 📝 jazdot blog

Personal technical blog by [Muhammed Riswan M. P.](https://jazdot.github.io) — live at **[jazdot.github.io/blog](https://jazdot.github.io/blog)**.

---

## ⚡ Quick Start & Workflow

### 1. Add a New Blog Post / Document
Create a Markdown file inside `content/posts/` (e.g., `content/posts/5g-oran-cu-du-bringup.md`):

```markdown
---
title: "5G O-RAN CU/DU Bring-up Guide"
date: "2026-07-25"
excerpt: "Step-by-step setup for OpenAirInterface CU/DU with Keysight Core."
tags: ["5G", "O-RAN", "Protocol"]
readTime: "6 min read"
---

# 5G O-RAN CU/DU Bring-up Guide

Write your post content in standard Markdown here!

## Section Title
Supports **bold**, *italics*, `inline code`, code blocks, lists, and quotes.

> **Key failure:** Example callout box.
```

---

### 2. Preview Locally
To test and preview your blog locally before publishing:

```bash
# Generate the static HTML pages & index
node build.js

# Option A: Open index.html directly in your browser
xdg-open index.html

# Option B: Run a quick local HTTP server (if Python is installed)
python3 -m http.server 8000
# Then visit http://localhost:8000
```

---

### 3. Deploy to GitHub Pages
Simply push your changes to GitHub:

```bash
git add .
git commit -m "Add post: 5G O-RAN CU/DU Bring-up Guide"
git push
```

GitHub Actions will automatically run `node build.js` on push, build all pages, and publish them to `https://jazdot.github.io/blog` in under 30 seconds.

---

## 🚀 Enhanced Blog Features Built-In

- 🔍 **Live Search Bar**: Readers can instantly filter posts by title, tag, or topic.
- 🏷️ **Interactive Tag Pills**: Filter posts by clicking on any tag pill (`5G`, `UAV`, `OLSR`, `Meta`).
- 📋 **One-Click Code Copy**: Every code block has an automatic "Copy" button.
- 🌓 **Persisted Dark/Light Theme**: Seamlessly synced with `jazdot.github.io`.
- ⏱️ **Read-time & Breadcrumbs**: Navigation indicators on every post.
- ⬆️ **Smooth Scroll Back to Top**: Built-in for long articles.

---

## 📁 Directory Structure

```
jazdot-blog/
├── content/
│   └── posts/                    ← Put all your Markdown (.md) documents here!
│       ├── hello-world.md
│       └── uav-mesh-what-actually-broke.md
├── assets/
│   └── style.css                 ← Design system & typography
├── build.js                      ← High-speed static site generator (<15ms)
├── index.html                    ← Auto-generated blog homepage with search
├── posts/                        ← Auto-generated HTML post pages
└── .github/
    └── workflows/
        └── deploy.yml            ← Auto-builds & deploys on git push
```
