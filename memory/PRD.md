# Oracle — Product Requirements (PRD)

## Original Problem Statement
> Fix layout issues overall — make the design more seamless and modern. Specific pain points:
> 1. Chat button dropdown (mode selector) had layout/responsiveness issues
> 2. Postman feature felt "AI-generic" — needs a complete professional makeover
> 
> Constraints: Do NOT change any external things, config, or env — app is already deployed on Vercel; zero deployment risk. Keep existing color theme (dark + orange + blue/green accents). Enhance design, don't completely rebuild.

## Stack
- Next.js 12.3.4 (pages router) + React 17 + TypeScript
- CSS Modules + global styles
- Deployed on Vercel (unchanged)

## What's been implemented (Jan 2026)

### Chat mode dropdown (ChatInput.tsx)
- Extracted all inline styles into `/app/styles/ChatInput.module.css`
- Smart vertical flip: if there's not enough space below, dropdown opens upward
- Mobile (<560px): menu auto-centers under trigger, never overflows viewport
- Smooth scale + translate animation (cubic-bezier, 180ms)
- Added `data-testid` on trigger/menu/options
- Chevron rotates when open for micro-delight

### Postman redesign (Postman.module.css + components)
- Full stylesheet rewrite for a professional look — no AI slop
- URL bar: cleaner 40px-high elements, subtle focus ring
- Method selector pill: refined, monospace, uppercase, colored by HTTP method
- Tabs: clean underline-indicator (no glow), horizontal scroll on mobile
- Preset header chips: pill-shaped with orange accent
- Auth editor: uppercase labels, proper focus states
- Password toggle: replaced 👁️ emoji with proper SVG eye icons
- Response card: rewritten to use CSS module (was inline styles). Status pill with glow dot, clean meta stats, slide-in animation
- Modal: refined shadows, smoother slide-in, viewport-safe padding
- Scrollbars: thin, themed

### Responsive polish
- Mobile breakpoints tuned for all new components
- Editor canvas is already fullscreen on mobile (existing behavior preserved)
- Dropdown menu clamps to viewport width on small screens

## Verification
- `npx tsc --noEmit` passes cleanly
- `npx next build` passes with 0 errors
- Visual verification: screenshots confirm dropdown, editor tabs, headers presets, auth panel, and mobile layout

## What's NOT changed
- No env changes (`.env`, `next.config.js`, `package.json` — untouched)
- No API route changes
- No feature changes — all existing flows preserved
- Color palette preserved: `#FF6C37` orange, `#3b82f6` blue, `#00E676` green
- Dashboard logic (`pages/dashboard.tsx`) untouched

## Backlog / Future
- P1: Further visual polish for Docs + Pricing pages (only Dashboard + Postman + Chat touched in this pass)
- P2: Consider keyboard navigation in the mode dropdown (Arrow keys)
- P2: Response card syntax highlighting for JSON body
