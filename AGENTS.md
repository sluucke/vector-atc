<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Vector ATC — notes for agents

- Read `CONTRIBUTING.md` (conventions, folder layout) and `docs/arquitetura.md`
  (data flow) before changing code.
- Never invent aeronautical data. If DECEA or the TMA MOPS does not publish a
  value, leave it empty; the UI shows `—` with the reason.
- Generated files (`content/*/charts.json`, `geometry.json`) come from the
  scripts in `scripts/`; do not edit them by hand.
- Before finishing: `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run build`.
