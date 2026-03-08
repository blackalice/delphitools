# delphitools

A collection of small, low stakes and low effort tools.
No logins, no registration, no data collection.
I can't believe I have to say that. 
Long live the handmade web.

## Development

This project uses Bun.

```bash
bun install
bun run dev
```

`npm install` is intentionally blocked so the lockfile and dependency tree stay Bun-managed.

## Cloudflare Pages

This repo is configured for static export hosting on Cloudflare Pages.

```bash
bun install
bun run pages:build
```

Deploy the generated `out/` directory to Cloudflare Pages.

Notes:

- `next.config.ts` uses `output: "export"` so `next build` emits a static site.
- `public/_redirects` contains Cloudflare Pages redirects.
- Set the Pages build command to `bun run pages:build`.
- Set the Pages output directory to `out`.

### Dev server note

If `bun dev` starts resolving packages like `tailwindcss` from the parent folder instead of this repo, do not "fix" it by:

- changing `@import "tailwindcss"` / `@import "tw-animate-css"` to filesystem paths
- adding custom Next/Bun root-launch wrappers
- changing the app to use server-side fallbacks for browser-only tools

Those changes caused follow-on breakage here.

First stop the dev server, then clear the dev cache and retry:

```powershell
Remove-Item .\.next\dev -Recurse -Force
```

The Tailwind imports in [`app/globals.css`](./app/globals.css) should stay as bare package imports.

## Included tools

### img & assets

- favicon genny
- svg optimiser
- placeholder genny
- image splitter
- image converter

### typo & text

- px to rem
- line height calc
- typo calc (agates, ciceros, picas, pt, inches, mm)
- paper sizes
- word counter
- glyph browser
- font file explorer

### colour

- colour converter (hex, rgb, hsl, oklch, lab, lch, oklab)
- tailwind shade genny
- harmony genny

### other tools

- text scratchpad
- tailwind cheat sheet
- qr genny
- meta tag genny
- regex tester
