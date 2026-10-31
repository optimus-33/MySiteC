# Hrishikesh Dehankar — personal site

A small, hand-built portfolio in plain HTML, CSS and vanilla JavaScript. The one idea running through it: **rows**. Crop furrows, lines of code and the lines of a music staff are all parallel rows carrying something forward, so the page's background is a single field of fine lines that shifts between those three states as you scroll.

There is no framework, no build step and no external JavaScript. Fonts come from Google Fonts.

## What's here

```
index.html            the whole page
css/styles.css        palette (day + dusk), type, layout, motion
js/main.js            theme, nav, reveal, Web Audio keyboard, bonda, canvas field
assets/favicon.svg    HAD monogram favicon
assets/og.svg         source artwork for the social card
assets/og.png         1200 × 630 social card (used by Open Graph tags)
tools/make-og.ps1     optional Windows script that regenerates og.png
```

Everything else is inline SVG: the HAD mark, the plant, the sound wave, the day/dusk scene and the plate of aloo bonda.

## Run it locally

No install, no build. From this folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. Any static server works (`npx serve`, VS Code Live Server, etc.). Opening `index.html` directly also works, but a local server is closer to production.

## Deploy to GitHub Pages

1. Create a repository and push these files to `main` (the site is the repo root).
2. In the repository: **Settings → Pages → Build and deployment**.
3. Source: **Deploy from a branch**; branch: `main`; folder: `/ (root)`; save.
4. Wait for the first build. The site appears at `https://<username>.github.io/<repo>/` (or `https://<username>.github.io/` for a user site).

If you deploy under a project path (`/repo-name/`), all internal links are relative and keep working. Only the absolute URLs in the `<head>` need attention — see the placeholder list below. Netlify works too: drag the folder into Netlify Drop, or connect the repo with no build command and publish directory `.`.

## Placeholders to replace

- **Photo (optional).** The About section currently uses a hand-drawn plant. To use a portrait, drop the file at `assets/portrait.jpg` and replace the `<svg class="plant">…</svg>` inside `.about__figure` with:
  ```html
  <img class="about__photo" src="assets/portrait.jpg" alt="Hrishikesh standing between rows on his farm" width="720" height="900">
  ```
  Keep a useful `alt` and roughly a 4:5 crop.
- **Logo.** `assets/favicon.svg` holds the HAD monogram (H and D highlighted, A as the shared base). If you have your own, replace that file **and** the inline `<svg class="brand__mark">` in `index.html` so the favicon and nav mark stay identical. The favicon uses hard-coded colours; update them there if you change the palette.
- **OG / social image.** `assets/og.png` is a generated placeholder at 1200 × 630. Replace it with your own (same size, under ~1 MB), or edit `tools/make-og.ps1` and run it on Windows:
  ```powershell
  powershell -ExecutionPolicy Bypass -File tools/make-og.ps1
  ```
  Also update `og:image` / `twitter:image` if the file name changes.
- **Absolute URLs.** `index.html` points `canonical`, `og:url`, `og:image` and `twitter:image` at `https://optimus-33.github.io/`. Change these to your real domain or repository path before sharing; social cards need absolute URLs.
- **Toolbox (optional).** The skill groups are deliberately plain lists, not exhaustive. Trim or add freely.

The phone number is intentionally not published anywhere. Contact is email, LinkedIn and GitHub only.

## Notes on the build

- **Motion.** The line field is drawn on a `<canvas>` fixed behind the page. Scroll position cross-fades the three row states: furrows at the Hero/About, stepped code lines through Work, a five-line staff with notes at Play. The cursor or a touch bends the nearest lines; scrolling adds a little wind. Under `prefers-reduced-motion: reduce` it renders one still frame and stops, and every CSS transition/animation is reduced to nothing.
- **Sound.** The keyboard is muted by default. Turning it on creates an `AudioContext` only after that click, so no autoplay prompts. Notes are synthesised with two oscillators and a soft low-pass, no audio files.
- **Accessibility.** Semantic landmarks, skip link, visible `:focus-visible` styles, native `<details>` for the work entries, `aria-pressed` toggles, live regions for the bonda messages, alt/title text for illustrations, and AA-contrast text colours (terracotta is used decoratively or in a darker text-safe variant).
- **Weight.** The page is well under 200 KB excluding fonts; the largest file is the 47 KB social image, which isn't downloaded by visitors to the page.
- **Fonts.** Fraunces for headings, Inter for body and detail. Two families, no more.

## License

MIT — see `LICENSE`.
