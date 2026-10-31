# Hrishikesh Dehankar — personal site

A small, hand-built portfolio in plain HTML, CSS and vanilla JavaScript. The one idea running through it: **rows**. Crop furrows, lines of code and the lines of a music staff are all parallel rows carrying something forward, so the page's background is a single field of fine lines that shifts between those three states as you scroll.

There is no framework, no build step and no external JavaScript. Fonts come from Google Fonts.

## What's here

```
index.html            the whole page
css/styles.css        palette (day + dusk), type, layout, field scene, motion
js/main.js            theme, nav, reveal, canvas field, Web Audio, bonda, breeze
assets/favicon.svg    HAD monogram favicon
assets/og.svg         source artwork for the social card
assets/og.png         1200 × 630 social card (used by Open Graph tags)
tools/make-og.ps1     optional Windows script that regenerates og.png
tools/check-html.py   optional structural check for index.html
tools/validate.mjs    optional Edge/CDP check: interactions + screenshots
```

Everything else is inline SVG: the HAD mark, the plant, the field scene with the hoodie and laptop, the sarod, the sound wave, the day/dusk illustration and the plate of aloo bonda.

## The page, in order

- **Hero** — name, the three identities, and the living line field.
- **01 About** — four plain sentences, with the small plant drawing.
- **02 Work** — a growing timeline; LLM gateway, AI catalog, NLP systems, Django services.
- **03 Field** — the wide hoodie-and-laptop scene, a breeze button, fireflies at dusk.
- **04 Toolbox** — grouped tools, now including NLP and dialogue systems.
- **05 Sound** — sarod and singing, with five strings you can actually pluck.
- **06 Play** — the opt-in keyboard, day/dusk switch and aloo-bonda plate.
- **07 Contact** — email, LinkedIn, GitHub. No phone number anywhere.

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

For this repository, the project site is `https://optimus-33.github.io/MySiteC/`. If you deploy under a different project path, update the absolute URLs in the `<head>` as well as any renamed asset URLs. Netlify works too: drag the folder into Netlify Drop, or connect the repo with no build command and publish directory `.`.

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
- **Absolute URLs.** `index.html` points `canonical`, `og:url`, `og:image` and `twitter:image` at this repository's GitHub Pages project site, `https://optimus-33.github.io/MySiteC/`. Change these if you use a custom domain or deploy under a different repository path; social cards need absolute URLs.
- **Toolbox (optional).** The skill groups are deliberately plain lists, not exhaustive. Trim or add freely.

The phone number is intentionally not published anywhere. Contact is email, LinkedIn and GitHub only.

## Notes on the build

- **Motion.** The line field is drawn on a `<canvas>` fixed behind the page. Scroll position cross-fades the three row states: furrows at Hero/About, stepped code lines through Work, furrows again at Field, code at Toolbox, then a five-line staff through Sound/Play. The cursor or a touch bends the nearest lines; scrolling adds a little wind. Staff noteheads are drawn only above 1280 px and only in the outer margins, so they never sit behind copy. Under `prefers-reduced-motion: reduce` the canvas renders one still frame and stops, and every CSS transition/animation is reduced to nothing.
- **Field scene.** Crops sway on staggered loops, the chai steams, the laptop cursor blinks and the sun becomes a moon at dusk. Dusk also brings stars and fireflies. *Send a breeze* speeds up the crop sway and sends a few leaves across for a few seconds. The button is hidden under reduced motion. The scene is drawn entirely in SVG and responds to the day/dusk toggle.
- **Sound.** Everything is muted by default. Turning sound on in either Sound or Play creates an `AudioContext` only after that click, so there is no autoplay prompt, and both switches stay in sync. The keyboard uses two oscillators and a soft low-pass; the sarod strings use a short plucked envelope. No audio files. The SVG strings are focusable (`role="button"`, Enter or Space) as well as clickable.
- **Work claims.** Client names are deliberately omitted. The Fortune 500 scale and the top-five detail live inside the expanded Fractal entry, not in the summary, so the page stays understated.
- **Accessibility.** Semantic landmarks, skip link, visible `:focus-visible` styles, native `<details>` for work entries, `aria-pressed` toggles, live regions for the bonda messages, alt/title text for illustrations, and AA-contrast text colours (terracotta is used decoratively or in a darker text-safe variant). The breeze button is keyboard reachable and hidden when motion is reduced.
- **Weight.** About 155 KB for the whole site including the 46 KB social image (which visitors don't download). Fonts are excluded and load from Google Fonts.
- **Fonts.** Fraunces for headings, Inter for body and detail. Two families, no more.
- **Checks.** `python tools/check-html.py` verifies tag balance and unique ids. `node tools/validate.mjs` starts a local server, drives headless Edge over CDP, tests theme/sound/strings/breeze/bonda/nav, and writes screenshots plus `report.json` to `.preview/` (git-ignored). Both are dev-only; the site needs neither.

## License

MIT — see `LICENSE`.
