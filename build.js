const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content', 'posts');
const POSTS_OUT_DIR = path.join(__dirname, 'posts');
const INDEX_OUT = path.join(__dirname, 'index.html');

function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: fileContent };

  const yamlBlock = match[1];
  const body = match[2];
  const data = {};

  yamlBlock.split('\n').forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        value = value.replace(/^["']|["']$/g, '');
      }
      data[key] = value;
    }
  });

  return { data, body };
}

function mdToHtml(markdown) {
  let html = markdown;

  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    const cleanCode = code.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div class="code-wrapper"><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code>${cleanCode}</code></pre></div>`;
  });

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/^> (.*$)/gim, (_, text) => {
    if (text.includes('Key failure:') || text.includes('The real lesson:')) {
      return `<div class="callout">${text}</div>`;
    }
    return `<blockquote>${text}</blockquote>`;
  });

  html = html.replace(/^---$/gim, '<hr />');

  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`);

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const blocks = html.split(/\n\n+/);
  const formattedBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr')
    ) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, ' ')}</p>`;
  });

  return formattedBlocks.join('\n\n');
}

// Common GlassNavBar HTML & Mobile Dropdown
const glassNavBarHtml = `
<nav>
  <a href="https://jazdot.github.io" class="nav-logo">JAZDOT<span>.</span></a>
  <ul class="nav-links">
    <li><a href="https://jazdot.github.io">Home</a></li>
    <li><a href="https://jazdot.github.io/#/about">Profile</a></li>
    <li><a href="https://jazdot.github.io/#/tools">Tools</a></li>
    <li><a href="https://jazdot.github.io/blog" class="active">Blog</a></li>
  </ul>
  <div class="nav-right">
    <button id="theme-toggle" aria-label="Toggle theme"></button>
    <a href="https://jazdot.github.io/#/tools" class="nav-contact-btn">Contact</a>
    <button class="mobile-toggle" id="mobile-toggle" aria-label="Toggle menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</nav>

<!-- Mobile Menu -->
<div class="mobile-menu" id="mobile-menu">
  <a href="https://jazdot.github.io">Home</a>
  <a href="https://jazdot.github.io/#/about">Profile</a>
  <a href="https://jazdot.github.io/#/tools">Tools</a>
  <a href="https://jazdot.github.io/blog" class="active">Blog</a>
  <a href="https://jazdot.github.io/#/tools" class="nav-contact-btn" style="margin-top: .5rem; display: inline-flex;">Contact</a>
</div>
`;

function renderPostPage(data, bodyHtml) {
  const tagsHtml = (data.tags || [])
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.title} — Blog</title>
  <meta name="description" content="${data.excerpt || data.title}" />
  <meta property="og:title" content="${data.title}" />
  <meta property="og:description" content="${data.excerpt || data.title}" />
  <meta property="og:url" content="https://jazdot.github.io/blog/posts/${data.slug}/" />
  <link rel="canonical" href="https://jazdot.github.io/blog/posts/${data.slug}/" />
  
  <!-- Prefetch main portfolio for instant transitions -->
  <link rel="prefetch" href="https://jazdot.github.io" />
  <link rel="stylesheet" href="../../assets/style.css" />
  <link rel="icon" type="image/svg+xml" href="https://jazdot.github.io/favicon.svg" />
  <link rel="alternate icon" type="image/png" href="https://jazdot.github.io/jd.png" />
  <link rel="apple-touch-icon" href="https://jazdot.github.io/jd-android.png" />
  <style>
    .code-wrapper { position: relative; margin-bottom: 1.5rem; }
    .copy-btn {
      position: absolute; top: 12px; right: 12px;
      font-size: .7rem; font-weight: 600; padding: .25rem .6rem;
      border-radius: 6px; background: var(--border); color: var(--muted);
      border: 1px solid var(--border); cursor: pointer; transition: all .2s;
    }
    .copy-btn:hover { color: var(--page-text); background: var(--card-bg); }
    .callout {
      margin: 2rem 0; padding: 1.1rem 1.4rem; border-left: 3px solid var(--accent);
      background: var(--border); border-radius: 0 8px 8px 0; font-size: .95rem;
      color: var(--page-text); line-height: 1.65; max-width: 840px;
    }
    .callout strong { color: var(--accent); }
    .ascii {
      font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: .8rem;
      line-height: 1.6; background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 12px; padding: 1.4rem 1.6rem; overflow-x: auto; color: var(--page-text);
      backdrop-filter: blur(8px); max-width: 1000px;
    }
    [data-theme="dark"] .ascii { color: #94a3b8; }
    .stat-row { display: flex; gap: 1.5rem; margin: 2rem 0; flex-wrap: wrap; max-width: 1000px; }
    .stat-box { flex: 1; min-width: 130px; padding: 1.1rem 1.25rem; border: 1px solid var(--border); border-radius: 12px; background: var(--card-bg); backdrop-filter: blur(8px); }
    .stat-box .val { font-size: 1.5rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--page-text); line-height: 1; }
    .stat-box .lbl { font-size: .72rem; color: var(--muted); margin-top: .35rem; text-transform: uppercase; letter-spacing: .06em; font-weight: 500; }
    .reading-time { display: inline-flex; align-items: center; gap: .4rem; font-size: .82rem; color: var(--muted); }
  </style>
</head>
<body>

<div class="aurora" aria-hidden="true"><div class="aurora-blob"></div><div class="aurora-blob"></div></div>
<div class="dot-bg" aria-hidden="true"></div>
<div id="progress-bar" aria-hidden="true"></div>

${glassNavBarHtml}

<main>
  <article>
    <header class="article-header">
      <div class="breadcrumb">
        <a href="https://jazdot.github.io/blog">Blog</a> / ${data.title}
      </div>
      <h1>${data.title}</h1>
      <div class="article-date">
        <span>${data.date}</span>
        ${data.readTime ? `&nbsp;·&nbsp; <span class="reading-time">${data.readTime}</span>` : ''}
      </div>
      <div class="article-tags">
        ${tagsHtml}
      </div>
    </header>

    <div class="prose">
${bodyHtml}
    </div>
  </article>

  <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
    <a href="https://jazdot.github.io/blog" style="font-size: .875rem; color: var(--muted); text-decoration: none;">
      ← Back to all posts
    </a>
    <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" style="background: none; border: none; font-size: .85rem; color: var(--muted); cursor: pointer;">
      Back to top ↑
    </button>
  </div>
</main>

<footer>
  <p>
    <a href="https://jazdot.github.io">jazdot.github.io</a> &nbsp;·&nbsp;
    <a href="https://linkedin.com/in/muhammedriswanmp" target="_blank" rel="noopener">LinkedIn</a> &nbsp;·&nbsp;
    <a href="https://github.com/jazdot" target="_blank" rel="noopener">GitHub</a>
  </p>
  <p style="margin-top:.5rem;">© <span id="year"></span> Muhammed Riswan M. P.</p>
</footer>

<script>
  document.getElementById('year').textContent = new Date().getFullYear();
  const root = document.documentElement;
  const saved = localStorage.getItem('theme') || 'dark';
  root.setAttribute('data-theme', saved);
  const sunIcon = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>\`;
  const moonIcon = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\`;
  const btn = document.getElementById('theme-toggle');
  btn.innerHTML = saved === 'dark' ? sunIcon : moonIcon;
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.innerHTML = next === 'dark' ? sunIcon : moonIcon;
  });
  const bar = document.getElementById('progress-bar');
  window.addEventListener('scroll', () => {
    const p = (document.body.scrollHeight - window.innerHeight) > 0
      ? window.scrollY / (document.body.scrollHeight - window.innerHeight) : 0;
    bar.style.transform = \`scaleX(\${p})\`;
  }, { passive: true });

  function copyCode(button) {
    const code = button.nextElementSibling.innerText;
    navigator.clipboard.writeText(code).then(() => {
      button.innerText = 'Copied!';
      setTimeout(() => { button.innerText = 'Copy'; }, 2000);
    });
  }

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }
</script>
</body>
</html>`;
}

function renderIndexPage(posts) {
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || [])));

  const listItemsHtml = posts
    .map(
      (p) => `    <li class="post-item" data-tags="${(p.tags || []).join(',').toLowerCase()}" data-title="${p.title.toLowerCase()} ${(p.excerpt || '').toLowerCase()}">
      <a href="./posts/${p.slug}/" class="post-link">
        <div>
          <div class="post-title">${p.title}</div>
          <div class="post-excerpt">${p.excerpt || ''}</div>
          <div class="post-tags-mini">${(p.tags || []).map(t => `<span class="tag-pill">${t}</span>`).join(' ')}</div>
        </div>
        <span class="post-meta">${p.date}</span>
      </a>
    </li>`
    )
    .join('\n');

  const filterTagsHtml = allTags
    .map((tag) => `<button class="filter-pill" onclick="filterByTag('${tag.toLowerCase()}', this)">${tag}</button>`)
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog — Muhammed Riswan M. P.</title>
  <meta name="description" content="Notes on 5G, network engineering, cloud infrastructure, and automation by Muhammed Riswan M. P." />
  <meta property="og:title" content="Blog — Muhammed Riswan M. P." />
  <meta property="og:description" content="Notes on 5G, network engineering, cloud infrastructure, and automation." />
  <meta property="og:url" content="https://jazdot.github.io/blog" />
  <link rel="canonical" href="https://jazdot.github.io/blog" />
  
  <link rel="prefetch" href="https://jazdot.github.io" />
  <link rel="stylesheet" href="./assets/style.css" />
  <link rel="icon" type="image/svg+xml" href="https://jazdot.github.io/favicon.svg" />
  <link rel="alternate icon" type="image/png" href="https://jazdot.github.io/jd.png" />
  <link rel="apple-touch-icon" href="https://jazdot.github.io/jd-android.png" />
  <style>
    .search-box { width: 100%; margin-bottom: 1rem; position: relative; }
    .search-input {
      width: 100%; padding: .8rem 1.25rem; border-radius: 12px;
      border: 1px solid var(--border); background: var(--card-bg);
      color: var(--page-text); font-size: .95rem; outline: none;
      backdrop-filter: blur(10px); transition: border-color .2s;
    }
    .search-input:focus { border-color: var(--accent); }
    .filter-bar { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .filter-pill {
      font-size: .75rem; font-weight: 600; padding: .35rem .8rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--card-bg); color: var(--muted);
      cursor: pointer; transition: all .2s;
    }
    .filter-pill.active, .filter-pill:hover {
      background: var(--page-text); color: var(--page-bg); border-color: var(--page-text);
    }
    .post-tags-mini { display: flex; gap: .4rem; margin-top: .5rem; }
    .tag-pill { font-size: .68rem; font-weight: 600; padding: .15rem .45rem; border-radius: 4px; background: var(--border); color: var(--muted); text-transform: uppercase; }
  </style>
</head>
<body>

<div class="aurora" aria-hidden="true"><div class="aurora-blob"></div><div class="aurora-blob"></div></div>
<div class="dot-bg" aria-hidden="true"></div>
<div id="progress-bar" aria-hidden="true"></div>

${glassNavBarHtml}

<main>
  <header class="page-header">
    <span class="page-tag">Writing</span>
    <h1>Blog</h1>
    <p>Notes on 5G, network engineering, cloud infrastructure, and automation.</p>
  </header>

  <div class="search-box">
    <input type="text" id="search-input" class="search-input" placeholder="Search posts by title, tag, or topic..." oninput="filterPosts()" />
  </div>
  <div class="filter-bar" id="filter-bar">
    <button class="filter-pill active" onclick="filterByTag('all', this)">All</button>
    ${filterTagsHtml}
  </div>

  <ul class="post-list" id="post-list">
${listItemsHtml}
  </ul>
  <div id="no-results" style="display: none; padding: 3rem 0; text-align: center; color: var(--muted); font-size: .95rem;">
    No matching posts found.
  </div>
</main>

<footer>
  <p>
    <a href="https://jazdot.github.io">jazdot.github.io</a> &nbsp;·&nbsp;
    <a href="https://linkedin.com/in/muhammedriswanmp" target="_blank" rel="noopener">LinkedIn</a> &nbsp;·&nbsp;
    <a href="https://github.com/jazdot" target="_blank" rel="noopener">GitHub</a>
  </p>
  <p style="margin-top:.5rem;">© <span id="year"></span> Muhammed Riswan M. P.</p>
</footer>

<script>
  document.getElementById('year').textContent = new Date().getFullYear();
  const root = document.documentElement;
  const saved = localStorage.getItem('theme') || 'dark';
  root.setAttribute('data-theme', saved);

  const sunIcon = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>\`;
  const moonIcon = \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\`;

  const btn = document.getElementById('theme-toggle');
  btn.innerHTML = saved === 'dark' ? sunIcon : moonIcon;
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.innerHTML = next === 'dark' ? sunIcon : moonIcon;
  });

  let currentTag = 'all';

  function filterByTag(tag, element) {
    currentTag = tag;
    document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    filterPosts();
  }

  function filterPosts() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const items = document.querySelectorAll('.post-item');
    let visibleCount = 0;

    items.forEach(item => {
      const titleText = item.getAttribute('data-title') || '';
      const tagsText = item.getAttribute('data-tags') || '';
      
      const matchesSearch = !query || titleText.includes(query) || tagsText.includes(query);
      const matchesTag = currentTag === 'all' || tagsText.includes(currentTag);

      if (matchesSearch && matchesTag) {
        item.style.display = 'block';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });

    document.getElementById('no-results').style.display = visibleCount === 0 ? 'block' : 'none';
  }

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }
</script>
</body>
</html>`;
}

function build() {
  console.log('🔨 Building blog from Markdown content...');

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('❌ Content directory missing:', CONTENT_DIR);
    return;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  const posts = [];

  files.forEach((file) => {
    const filePath = path.join(CONTENT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, body } = parseFrontmatter(content);

    const slug = data.slug || file.replace(/\.md$/, '');
    data.slug = slug;

    const bodyHtml = mdToHtml(body);
    const postHtml = renderPostPage(data, bodyHtml);

    const outDir = path.join(POSTS_OUT_DIR, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), postHtml, 'utf-8');

    posts.push(data);
    console.log(`  ✓ Generated post: /posts/${slug}/`);
  });

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const indexHtml = renderIndexPage(posts);
  fs.writeFileSync(INDEX_OUT, indexHtml, 'utf-8');
  console.log('  ✓ Generated blog index: /index.html');

  console.log('✨ Blog build complete!');
}

build();
