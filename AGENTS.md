# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router entrypoints, global styles, and the dynamic tool route at `app/tools/[toolId]/page.tsx`.
- `components/`: shared UI and tool implementations. New tools usually live in `components/tools/*.tsx`.
- `lib/`: registries and helpers. Update `lib/tools.ts` when adding, renaming, or recategorising a tool.
- `hooks/`: reusable React hooks.
- `public/`: static assets, fonts, and browser-side helper files.
- `types/`: local type shims for packages without complete TypeScript support.
- `scripts/`: repo maintenance scripts such as Bun enforcement.

## Build, Test, and Development Commands

- `bun install`: install dependencies. Use Bun only; `npm install` is intentionally blocked.
- `bun run dev`: start the local Next.js dev server.
- `bun run build`: create a production build and catch type/runtime route issues.
- `bun run lint`: run ESLint across the repo.

If the dev server gets into a bad state, clear the cache with `Remove-Item .\.next\dev -Recurse -Force`.

## Coding Style & Naming Conventions

- TypeScript + React function components only; prefer client components for browser-only tools.
- Follow existing formatting: 2-space indentation, semicolons, double quotes, and compact JSX.
- Use PascalCase for component exports (`DiffCheckerTool`), kebab-case for tool files (`diff-checker.tsx`), and kebab-case tool ids/routes (`/tools/diff-checker`).
- Reuse shared UI primitives from `components/ui/` before creating new patterns.
- When shipping a tool, wire it in three places: the component file, `lib/tools.ts`, and `app/tools/[toolId]/page.tsx`.

## Testing Guidelines

- There is no dedicated automated test suite yet.
- Minimum validation for changes is `bun run lint` and `bun run build`.
- For UI changes, manually verify the affected tool route and check responsive behaviour.
- If you add non-trivial logic, keep it in small helper functions so it is easy to test later.

## Commit & Pull Request Guidelines

- Recent history uses short, imperative commit subjects such as `Add in-browser font converter tool`.
- Conventional prefixes are optional but used for fixes, for example `fix(guillotine-director): ...`.
- Keep commits focused on one tool or one refactor.
- Pull requests should include a concise summary, note any registry/route changes, link related issues, and attach screenshots or recordings for UI work.

## Architecture Notes

- This app is local-first: tools are intended to run in the browser without uploads or accounts.
- The tool catalogue is registry-driven. If a tool is missing from `lib/tools.ts`, it will not appear in navigation even if the component exists.
