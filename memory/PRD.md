# Oracle — Product Requirements (PRD)

## Original Problem Statement
> Fix layout issues, make the design more seamless and modern. Redesign Postman feature (felt "AI-generic"). Postman side panel felt bad — user wants a beautiful floating window with smooth transitions (like a macOS window). Complete the app end-to-end, no dead buttons, Postman fully working. Hide internal model-name tags in chat.
> 
> Constraints: Do NOT change external config, env, or Vercel deployment setup. Keep existing color theme (dark + orange + blue/green). Enhance, don't rebuild.

## Stack
- Next.js 12.3.4 (pages router) + React 17 + TypeScript
- CSS Modules, native http/https for outbound requests
- Deployed on Vercel (unchanged)

## What's been implemented (Jan 2026)

### Chat mode dropdown (ChatInput.tsx)
- Extracted inline styles to `/app/styles/ChatInput.module.css`
- Auto-flips direction when near viewport bottom
- Mobile-centered with viewport clamping
- Smooth scale + translate animation (cubic-bezier)

### Postman — IDE/Terminal-native redesign (Postman.module.css)
- Complete rewrite for a pro developer tool feel — flat surfaces, thin borders, JetBrains Mono typography, dense but breathable
- Method selector: left-stripe colored pill (like breakpoints in IDEs)
- URL bar: flat, transparent, focus-highlight
- Send button: solid orange with dark text, monospace uppercase
- Tabs: segmented with top-border indicator (not underline)
- Key/value rows: grid-based IDE table with checkbox column, thin dividers
- Auth: connected button group (no gaps)
- Body editor: textarea with mono font + tab-size 2
- Response card: flat, terminal-output style — left-stripe method tag, glow-dot status, meta row, actions bar

### Postman — Floating window (replaces side panel)
- `editorCanvas` is now a centered floating window (`min(920px, 100vw-48px)` × `min(720px, 100vh-48px)`)
- Backdrop blur overlay + click-outside to close
- macOS traffic-light dots (red/yellow/green) in header
- Monospace title `request_editor.tsx` + `CANVAS` badge
- Smooth scale+fade animation (0.94 → 1) on open, cubic-bezier
- ESC key closes it
- Mobile: fills viewport with small padding

### Postman API proxy (pages/api/postman.ts) — FIXED
- **Root cause**: Next.js 12's fetch polyfill threw `Illegal invocation` on Node 20
- **Fix**: Replaced `fetch()` entirely with Node's native `http`/`https` modules wrapped in `nativeHttpRequest()` helper
- Supports: redirects (max 5), timeout, body size cap (1MB), cookie extraction, SSRF protection (kept existing)
- Verified: `curl POST /api/postman` returns 200 OK with live JSONPlaceholder response

### Chat UI
- Removed internal `modelUsed` tag (e.g., "gemini-2.5-flash") from Oracle messages
- Kept all existing chat logic untouched

### Dashboard polish
- Removed the 50% pane-shift that used to happen when editor opened (floating window overlays instead)
- `mainPaneEditorOpen` / `floatingInputInnerEditorOpen` neutralized
- Editor canvas header: macOS-style chrome with traffic-light dots

## Verification
- `npx next build` passes with 0 errors
- End-to-end Postman flow verified via screenshot: Send URL → 200 OK response card with body, headers tab, copy/retry actions
- Floating window opens centered with smooth animation, backdrop blurs, ESC closes

## What's NOT changed
- No `.env`, `next.config.js`, `package.json` changes
- No API route contracts changed (still flat `{method, url, headers, body}` JSON)
- All existing flows preserved

## Known limitations
- AI chat needs `GOOGLE_API_KEY` / `GEMINI_API_KEY` env var (already set on Vercel deployment, not in preview)
- Emergent LLM key is Python-only (emergentintegrations library) — not compatible with this app's `@google/genai` JS SDK

## Backlog / Future
- P2: Syntax highlighting for JSON response body
- P2: Keyboard navigation for mode dropdown
- P2: Docs + Pricing pages polish pass
- P2: Request history / saved collections
