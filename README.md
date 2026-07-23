# jazdot blog

Personal blog by [Muhammed Riswan M. P.](https://jazdot.github.io) — deployed at **jazdot.github.io/blog**.

Pure HTML/CSS — no build tools, no frameworks. Just edit files and push.

---

## Setup on GitHub (one-time)

1. **Create repo** at [github.com/new](https://github.com/new)
   - **Repository name:** `blog` ← must be exactly this
   - Owner: `jazdot`
   - Visibility: Public

2. **Enable GitHub Pages**
   - Go to repo **Settings → Pages**
   - Under *Build and deployment*, set **Source = GitHub Actions**
   - Save

3. **Push this repo**
   ```bash
   cd /home/richu/jazdot-blog
   git init
   git add .
   git commit -m "initial blog"
   git branch -M main
   git remote add origin https://github.com/jazdot/blog.git
   git push -u origin main
   ```

4. **Wait ~60 seconds** → blog is live at `https://jazdot.github.io/blog`

---

## Adding a new post

1. Create a folder: `posts/my-post-slug/`
2. Copy `posts/hello-world/index.html` into it and edit
3. Add a `<li>` entry to `index.html` post list
4. Push — done

## File structure

```
jazdot-blog/
├── index.html              ← Blog listing
├── posts/
│   └── hello-world/
│       └── index.html      ← First post
├── assets/
│   └── style.css           ← Shared design system
└── .github/
    └── workflows/
        └── deploy.yml      ← Auto-deploy on push to main
```
