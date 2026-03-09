# pickletools Features

This document describes the current tool set shipped by the app, based on the tool registry in `lib/tools.ts` and the routed tool map in `app/tools/[toolId]/page.tsx`.

## App-wide capabilities

- 46 browser-based utilities grouped into 7 categories.
- Local-first privacy model: no accounts, no tracking, and processing stays on the user's machine.
- Search filters both the sidebar navigation and the home page tool library.
- Favourites can be starred from the home page and are surfaced in the sidebar and on the home page.
- Each tool has its own route under `/tools/[toolId]` with metadata, category labelling, and optional `New` or `Beta` badges.
- Static route generation is enabled for every registered tool.
- Theme controls support light mode, dark mode, and selectable colour palettes.

## Tool catalogue

### Social Media

- `/tools/social-cropper` - Social Media Cropper: crop images for Instagram, Bluesky, and Threads.
- `/tools/matte-generator` - Matte Generator: place non-square images onto a square matte.
- `/tools/scroll-generator` - Seamless Scroll Generator: split images for Instagram carousel scrolls.
- `/tools/watermarker` - Watermarker: add watermarks to images.

### Colour

- `/tools/colour-converter` - Colour Converter: convert between colour formats.
- `/tools/tailwind-shades` - Tailwind Shade Generator: generate Tailwind colour scales.
- `/tools/harmony-genny` - Harmony Generator: generate colour harmonies.
- `/tools/palette-genny` - Palette Generator: generate colour palettes.
- `/tools/palette-collection` - Palette Collection: browse curated colour palettes.
- `/tools/contrast-checker` - Contrast Checker: check WCAG colour contrast compliance.
- `/tools/colorblind-sim` - Colour Blindness Simulator: simulate colour blind viewing conditions.
- `/tools/gradient-genny` - Gradient Generator: create linear, corner, and mesh gradients. `New`

### Images & Assets

- `/tools/favicon-genny` - Favicon Generator: generate favicons from any image.
- `/tools/svg-optimiser` - SVG Optimiser: optimise and minify SVG files.
- `/tools/gif-optimiser` - GIF Optimiser: optimise GIFs locally with gifsicle WASM. `New`
- `/tools/placeholder-genny` - Placeholder Generator: generate placeholder images.
- `/tools/image-splitter` - Image Splitter: split images into tiles.
- `/tools/image-converter` - Image Converter: convert between PNG, JPEG, WebP, AVIF, GIF, BMP, TIFF, ICO, and ICNS, with resizing and format options.
- `/tools/artwork-enhancer` - Artwork Enhancer: add a colour noise overlay to artwork.
- `/tools/background-remover` - Background Remover: remove image backgrounds automatically. `Beta`
- `/tools/image-tracer` - Image Tracer: trace raster images into SVG vectors. `New`

### Typography & Text

- `/tools/px-to-rem` - PX to REM: convert pixels to rem units.
- `/tools/line-height-calc` - Line Height Calculator: calculate line-height values.
- `/tools/typo-calc` - Typography Calculator: convert between typographic units.
- `/tools/paper-sizes` - Paper Sizes: reference common paper dimensions.
- `/tools/word-counter` - Word Counter: count words, characters, and related text metrics.
- `/tools/glyph-browser` - Glyph Browser: browse Unicode glyphs.
- `/tools/font-explorer` - Font File Explorer: inspect font file contents.
- `/tools/font-converter` - Font Converter: convert WOFF and WOFF2 webfonts back to TTF or OTF locally. `New`
- `/tools/diff-checker` - Diff Checker: compare two text blocks and highlight line-level differences. `New`

### Print & Production

- `/tools/pdf-preflight` - PDF Preflight: analyse PDFs for print-readiness issues. `New`
- `/tools/guillotine-director` - Guillotine Director: guide guillotine cutting for imposed print sheets. `New`
- `/tools/zine-imposer` - Zine Imposer: create 8-page mini-zine imposition layouts.

### Other Tools

- `/tools/markdown-writer` - Markdown Writer: compose Markdown with a live preview. `New`
- `/tools/text-scratchpad` - Text Scratchpad: text editor with manipulation tools.
- `/tools/tailwind-cheatsheet` - Tailwind Cheat Sheet: quick reference for Tailwind classes.
- `/tools/qr-genny` - QR Generator: generate styled QR codes with custom colours, shapes, and logos.
- `/tools/code-genny` - Barcode Generator: generate Data Matrix, Aztec, PDF417, Code 128, EAN-13, and more.
- `/tools/meta-tag-genny` - Meta Tag Generator: generate HTML meta tags.
- `/tools/regex-tester` - Regex Tester: test regular expressions.

### Calculators

- `/tools/sci-calc` - Scientific Calculator: scientific calculator with history.
- `/tools/graph-calc` - Graph Calculator: plot and visualise mathematical functions.
- `/tools/algebra-calc` - Algebra Calculator: symbolic algebra for simplify, factor, solve, and derivatives.
- `/tools/base-converter` - Base Converter: convert between decimal, hexadecimal, binary, and octal.
- `/tools/time-calc` - Time Calculator: work with Unix timestamps, date arithmetic, and timezone conversion.
- `/tools/unit-converter` - Unit Converter: convert between length, weight, data, and other unit families.
- `/tools/encoder` - Encoding Tools: Base64, URL encoding, and hash generation.
