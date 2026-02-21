# Oracle API Checker

Oracle is a Next.js 12 application for:
- API key verification with strict result semantics
- provider-aware mismatch detection
- chat assistance backed by Gemini
- Postman-style API request testing through a hardened proxy

## Requirements

- Node.js 18+ (Node 20 recommended)
- npm 9+

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (for local development):

```bash
# Required for /api/chat (supports rotation with sparse suffixes)
GOOGLE_API_KEY=...
# Optional additional keys:
GOOGLE_API_KEY_1=...
GOOGLE_API_KEY_3=...
GEMINI_API_KEY_2=...

# Optional payload encryption for /api/check and /api/chat
# If omitted, app falls back to plain JSON over HTTPS.
NEXT_PUBLIC_ENCRYPTION_KEY=your-shared-key

# Optional explicit dev host allowlist for /api/postman
# Comma-separated; supports exact hosts and suffix entries like ".example.internal"
ORACLE_PROXY_ALLOWLIST=api.github.com,.example.dev
```

3. Start development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Security/Validation Semantics

- `POST /api/check` always returns backward-compatible `valid`, plus:
  - `verificationLevel`: `verified | format_only | unknown`
  - `warnings`: string array
- Strict policy: `format_only` keys are treated as non-working by default.
- Ambiguous key formats require `providerHint`/`hint` for strict provider routing.
- Leak-check path is privacy-safe and does not send raw keys to third-party code-search APIs.

## Postman Proxy Safety

`POST /api/postman` enforces:
- `http/https` scheme only
- DNS resolution checks against private/restricted IP ranges (IPv4/IPv6)
- blocked metadata/internal destinations by default
- redirect chain re-validation
- timeout bounds and response size limits
- header sanitization

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run test
```

## Notes

- Payload encryption is optional and controlled by `NEXT_PUBLIC_ENCRYPTION_KEY`.
- Without encryption key, the app uses plain request/response payloads (intended for HTTPS transport).
- Postman history persistence is disabled by default (`historyEnabled: false`).
