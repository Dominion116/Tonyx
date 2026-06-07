# Tonyx — Implementation Plan

**Version:** 1.1 | **Date:** June 2026  
**Stack:** Next.js 14 · Express/Node.js 22 · MongoDB Atlas · Omniston SDK · x402 · Telegram Bot API · @mira (deep-link bridge + custom skill)

> Patterns from [Agent Ada](https://github.com/oyewale-dominion/Agent-Ada) inform this plan where the two stacks overlap: type-only imports from `packages/shared` into `apps/web`, lean wallet SDKs, and backend-first phase ordering (agent core and API ship before any UI).

---

## Overview

Implementation is split into five phases. Each phase is independently shippable and builds on the previous one. All frontend and UI work is consolidated into Phase 4 so the agent core, API, and integrations are hardened before any interface is built on top of them.

| Phase | Name | Outcome |
|-------|------|---------|
| 0 | Foundation | Mono-repo wired, shared types, CI green |
| 1 | Backend Core | Live API with pool scanner and x402 gate |
| 2 | Advisor Engine & Ask Mira Bridge | Deterministic advisor evaluation, shared Ask-Mira deep-link builder |
| 3 | Telegram Bot & Notifications | Bot, webhook, notification dispatch, scanner integration |
| 4 | Frontend & UI | Web dashboard, scanner & policy views, Telegram Mini App WebView |
| 5 | Hardening & Launch | Security, performance, monitoring, deployment |

---

## Phase 0 — Foundation & Infrastructure

**Goal:** Every engineer can clone, install, and run the full stack locally in one command.

### 0.1 Mono-repo Bootstrap
- [ ] Initialise Turborepo workspace with `npm` workspaces
- [ ] Create directory skeleton:
  ```
  apps/
    web/          <- Next.js 14
    api/          <- Express on Node.js 22
  packages/
    shared/       <- TypeScript types + Zod schemas + integration helpers (Ask-Mira link builder)
    omniston/     <- Omniston SDK wrapper
  ```
- [ ] Root `turbo.json` with `dev`, `build`, `lint`, `test` pipelines
- [ ] Root `package.json` with `workspaces` field pointing to `apps/*` and `packages/*`
- [ ] `.env.example` files for `apps/web` and `apps/api` covering all variables from the env reference section below

### 0.2 Shared Package (`packages/shared`)
- [ ] Zod schemas for every MongoDB document: `users`, `policies`, `runs`, `notifications`
- [ ] Inferred TypeScript types exported alongside each schema
- [ ] Shared API request/response types for every endpoint in the API contract
- [ ] Zod schema for the advisor recommendation object (`proceed`, `confidence`, `explanation`, `suggestedAction`)
- [ ] `integrations/mira-link.ts`: `buildAskMiraMessage()` / `buildAskMiraDeepLink()` — the single shared formatter for the `[TONYX PROPOSAL]`-tagged Telegram deep link, consumed at runtime by both `apps/api` (Telegram bot) and `apps/web` (dashboard button)
- [ ] **Note (from Agent Ada):** `apps/web` must only import types from `packages/shared` using `import type { ... }` (the Ask-Mira link builder is the one runtime exception — see `MIRA_SKILL.md`). Never import Zod schemas or default objects into a web client component. Validate web forms inline rather than importing schemas.

### 0.3 Omniston Package (`packages/omniston`)
- [ ] Install Omniston SDK v1beta8
- [ ] Thin typed wrapper exposing three functions: `discoverPools()`, `getQuote()`, `executeRoute()`
- [ ] Unit tests with mocked Omniston responses

### 0.4 Local Dev Baseline
- [ ] Vercel project linked to `apps/web`
- [ ] Render service linked to `apps/api`
- [ ] MongoDB Atlas: dev cluster provisioned, connection string in `.env` files

**Phase 0 exit criteria:** `npm run dev` starts both apps. All lint and type-check steps pass. Shared types resolve across packages.

---

## Phase 1 — Backend Core

**Goal:** A live Express API that authenticates wallets, scans pools, evaluates policy, and gates execution behind x402.

### 1.1 Express App Setup (`apps/api`)
- [ ] Express 5 + TypeScript strict mode
- [ ] `swagger-jsdoc` + `swagger-ui-express` wired up; Swagger UI accessible at `/api/docs`
- [ ] Global error handler with typed error responses matching `packages/shared`
- [ ] Request validation middleware using Zod schemas from `packages/shared`
- [ ] CORS configured for the `apps/web` origin and Telegram Mini App URL

### 1.2 MongoDB Atlas Connection
- [ ] Mongoose connection with retry logic
- [ ] Models for all four collections: `users`, `policies`, `runs`, `notifications`
- [ ] Index creation on startup: `walletAddress` (all collections)

### 1.3 Authentication Layer
- [ ] `POST /api/wallet/connect` — accepts wallet address, returns signed JWT session token
- [ ] Session middleware that validates JWT and attaches `req.wallet` to every protected route
- [ ] Telegram HMAC middleware for `POST /api/telegram/webhook`

### 1.4 Balance & Pool Endpoints
- [ ] `GET /api/balance/:address` — fetches wallet balance and LP positions from TonAPI; caches for 30 s
- [ ] `GET /api/pools` — returns ranked pool list from `packages/omniston`; caches for 60 s
- [ ] Background cron job (using `node-cron`) that refreshes the pool cache every 60 s and stores results in a dedicated MongoDB collection

### 1.5 Policy Endpoints
- [ ] `POST /api/policy` — validates body with Zod, verifies wallet signature, upserts policy document with auto-incremented `version`, returns created policy
- [ ] `GET /api/policy/:address` — returns active policy and full version history ordered by `createdAt` desc

### 1.6 Quote & Execute Endpoints
- [ ] `POST /api/agent/quote` — calls `packages/omniston` for route, runs policy eligibility check, computes x402 fee from `X402_FEE_USDT`, returns proposal object with one-time `approvalToken`
- [ ] `POST /api/agent/execute` — x402 middleware gate (returns HTTP 402 before payment), validates `approvalToken`, submits route via Omniston, creates `runs` document with status `pending`, fires async execution coroutine
- [ ] Execution coroutine: polls TonAPI for `txHash`, transitions run status through `executing -> completed | failed`, updates MongoDB

### 1.7 Run History Endpoints
- [ ] `GET /api/agent/runs/:address` — paginated run list (limit/cursor), includes all statuses
- [ ] `GET /api/agent/runs/:id/status` — returns current status of a single run

### 1.8 Notification Preferences
- [ ] `PUT /api/notifications/:address` — validates and upserts notification preferences document

### 1.9 x402 Middleware
- [ ] Generic x402 Express middleware: checks for valid payment proof in request header, verifies against `X402_WALLET_ADDRESS`, rejects with HTTP 402 + payment requirement payload if missing
- [ ] Applied to `POST /api/agent/execute`

**Phase 1 exit criteria:** Swagger UI shows all endpoints. Authenticated `curl` calls to `/api/pools`, `/api/agent/quote`, and `/api/agent/execute` return expected shaped responses. A full quote-to-execute-to-poll cycle writes a `completed` run document.

---

## Phase 2 — Advisor Engine & Ask Mira Bridge

**Goal:** All server-side recommendation logic is complete, deterministic, and testable via API before any UI depends on it — and the bridge to @mira is in place from day one, since it is the hackathon's prize-track integration.

> **Why no AI evaluation API:** @mira (the Telegram bot in the "Best project integrating Mira" prize track) has no REST API, webhook system, or SDK — only deep links, inline mode, and custom skills. There is no AI provider key in this stack. Rather than fake an integration against a model endpoint, Tonyx evaluates every route with its own transparent, policy-driven engine, and treats @mira as what it actually is: an optional, conversational second opinion reachable only through Telegram.

### 2.1 Advisor Engine (`apps/api/src/services/advisor.ts`)
- [ ] `evaluateRebalance(input: AdvisorInput): MiraRecommendation` — single deterministic function consumed by the quote endpoint, the Telegram `/rebalance` command, and the notification scanner (one source of truth, no duplicated fallback logic)
- [ ] Computes `proceed` from the policy's `minNetGainUsdt` floor
- [ ] Computes `confidence` (0.4-0.95) scaling with the margin above the policy floor plus a route-size bonus
- [ ] Produces a templated, plain-language `explanation` and `suggestedAction` for both the proceed and hold cases
- [ ] Unit tests covering boundary conditions (exactly at the floor, just above/below, large vs. small routes)

### 2.2 Ask Mira Deep-Link Bridge (`packages/shared/src/integrations/mira-link.ts`)
- [ ] `AskMiraProposal` type + `buildAskMiraMessage(proposal)`: renders a `[TONYX PROPOSAL]`-tagged, plain-language summary (route, amount, APR, est. yield, x402 fee, net gain, Tonyx confidence, Tonyx explanation, and a closing question to Mira)
- [ ] `buildAskMiraDeepLink(proposal)`: returns `https://t.me/mira?text=<encoded message>` — chosen over `?start=<payload>` because Telegram caps `start` at ~64 chars and `[A-Za-z0-9_-]` only, far too small for a real proposal; `?text=` has no practical limit and pre-fills the compose box with something useful even without a configured skill
- [ ] Exported from `@tonyx/shared` so the Telegram bot and the web dashboard format identical messages from one source of truth

### 2.3 Custom Mira Skill Spec
- [ ] Document the skill configuration to paste into Mira's custom-skill editor: trigger phrase `[TONYX PROPOSAL]` / slug `/tonyx_review`, behavioral instructions that turn Mira into an opinionated second-opinion reviewer (sanity-check the math, judge the route, react to Tonyx's own confidence, give a clear verdict), and example input/output — see [`MIRA_SKILL.md`](MIRA_SKILL.md)
- [ ] Configure the skill in Mira's dashboard and verify the `[TONYX PROPOSAL]` trigger fires correctly end to end via the deep link

### 2.4 Advisor Evaluation on Rebalance Trigger
- [ ] `POST /api/agent/quote` invokes `evaluateRebalance()` before returning the proposal
- [ ] Response includes the advisor's `proceed` flag, `confidence` score (0-1), and `explanation` string alongside the standard proposal fields (kept on the existing `mira` field of `QuoteResponse` to avoid a cosmetic rename cascade)
- [ ] `proceed: false` responses still return HTTP 200 but include no `approvalToken`; the frontend (Phase 4) renders an explanation card with no Approve button
- [ ] `proceed: true` responses include the `approvalToken`, the advisor's plain-language explanation, and (on the frontend) an "Ask Mira for a second opinion" deep link built from the same response

**Phase 2 exit criteria:** `POST /api/agent/quote` returns an advisor-evaluated response with a `proceed` flag, confidence score, and explanation, sourced entirely from `evaluateRebalance()` — reproducible from the policy alone, with no external AI call. `buildAskMiraDeepLink()` produces a valid `t.me/mira?text=...` URL that opens Telegram with a correctly tagged, readable proposal summary.

---

## Phase 3 — Telegram Bot & Notifications

**Goal:** The Telegram bot is live, the webhook processes approvals, and the scanner dispatches notifications, all without any Mini App WebView frontend.

### 3.1 Telegram Bot Setup
- [ ] Create Tonyx bot via BotFather; register `TELEGRAM_BOT_TOKEN`
- [ ] Configure webhook: `POST /api/telegram/webhook` with HMAC secret; verify signature on every incoming request
- [ ] Bot commands: `/start`, `/status`, `/rebalance`, `/policy`, `/history`
- [ ] `/start` handler: sends welcome message and a "Launch App" button wired to the Mini App URL (Mini App WebView ships in Phase 4)

### 3.2 Notification Dispatch
- [ ] Background scanner (built in Phase 1) extended to check qualifying opportunities per wallet every scan cycle
- [ ] For wallets with `approvalMode: 'manual'` and a qualifying rebalance: sends Telegram message via Bot API with inline keyboard: Approve / Dismiss
- [ ] For wallets with `approvalMode: 'auto'`: auto-executes by calling the execute coroutine directly, then sends a confirmation message
- [ ] Dispatch respects `quietHoursStart`/`quietHoursEnd` and `alertFrequency` from the `notifications` document

### 3.3 Webhook Callback Processing
- [ ] Inline keyboard callback handler: routes `approve_<runId>` to the execute coroutine, `dismiss_<runId>` to skip logic
- [ ] Skip logic: sets run status to `skipped`, records dismissal timestamp, resets cooldown timer
- [ ] Execution confirmation message: "Rebalanced - earned $X.XX - fee $Y.YY - tx: [link]"
- [ ] Failed execution message with error summary and a retry suggestion

### 3.4 Bot Command Handlers
- [ ] `/status` — replies with idle balance, deployed balance, current APR of active position, and last run summary
- [ ] `/rebalance` — runs `evaluateRebalance()` for the user's wallet; replies with a proposal message + Approve/Dismiss buttons and an "🔮 Ask Mira for a second opinion" inline URL button (built via `buildAskMiraDeepLink`) if `proceed: true`, or the advisor's explanation if `proceed: false`
- [ ] `/policy` — replies with active policy summary and a "Edit in app" button linking to the Mini App settings screen (live in Phase 4)
- [ ] `/history` — replies with last five runs as formatted text

**Phase 3 exit criteria:** Sending `/start` to the bot returns the welcome message. Sending `/rebalance` runs the advisor and returns a proposal message with Approve/Dismiss and "Ask Mira for a second opinion" inline buttons — the latter opens Telegram with a correctly formatted `[TONYX PROPOSAL]` message. Tapping Approve from a Telegram notification executes a run and sends a confirmation reply. `/status` returns live balance data.

---

## Phase 4 — Frontend & UI

**Goal:** Landing page, web dashboard, and Telegram Mini App WebView are fully functional, consuming the complete backend built in Phases 1-3. The landing page hero defines the global theme for the entire frontend.

**Route structure:** `/` is the public landing page (marketing). The dashboard entry point is `/dashboard` (which redirects to `/dashboard/overview`). The Mini App lives under `/mini-app`.

### 4.0 Landing Page (`/`)
- [ ] Install hero dependencies in `apps/web`: `three`, `@react-three/fiber`, `@react-three/drei`, `lucide-react`, plus `@types/three` (dev)
- [ ] Place the Ethereal Beams Hero component at `apps/web/components/ui/ethereal-beams-hero.tsx` (provided template), changing only brand name and CTA copy for Tonyx
- [ ] `(marketing)` route group with a minimal layout — no auth, no sidebar, no dock
- [ ] **The hero's design tokens are the global theme** — pure black/white glassmorphic: `background #000000`, `foreground #ffffff`, `surface rgba(255,255,255,0.05)`, `border rgba(255,255,255,0.10)`, `muted rgba(255,255,255,0.60)`, pill radius for interactive elements, `backdrop-blur-xl`. These are written into `tailwind.config.ts` and `globals.css` as CSS custom properties and consumed by every page
- [ ] Landing sections: glassmorphic navbar (Tonyx brand, pill nav, "Launch app" CTA) · hero with animated 3D beams (heading "Your yield, automated", subtitle, "Launch app" → `/dashboard` and "Open in Telegram" deep link) · "Ask Mira for a second opinion · Built on TON" badge · stats row · 3-column features (Autonomous scanning / Transparent advisor engine / x402 micropayments) · "How it works" 4 steps (Connect wallet → Set policy → Agent executes → You earn) · CTA band · footer

### 4.1 Next.js 14 App Setup (`apps/web`)
- [ ] App Router with TypeScript strict mode
- [ ] `shadcn/ui` init + Tailwind CSS theme derived from the hero design tokens (§4.0) — no component hardcodes a color value; all pages (landing, dashboard, Mini App) consume the shared tokens
- [ ] Three layout groups: `(marketing)` for the landing page, `(dashboard)` for the web dashboard, `(mini-app)` for the Telegram Mini App WebView
- [ ] Shared `Dock` component (`components/layout/Dock.tsx`) with a single `NavItems` data source — used by the dashboard on mobile (`< md`) and always by the Mini App; styling matches the global black/white theme with `env(safe-area-inset-bottom)` padding
- [ ] API client module (typed fetch wrapper) using types from `packages/shared` — import with `import type { ... }` only; never import Zod schemas or runtime values into web components
- [ ] Form validation replicated inline (no shared Zod import in client components)

### 4.2 Wallet Connection (Web)
- [ ] Install and configure `@ton-connect/ui` (TON AppKit) — prefer the minimal connector surface; avoid heavy multi-chain SDK bundles
- [ ] Install and configure Privy SDK for embedded wallet fallback
- [ ] `WalletButton` component in the top nav showing connect state or truncated address
- [ ] On connect: call `POST /api/wallet/connect`, store JWT in `httpOnly` cookie via Next.js Route Handler
- [ ] Persist connection across sessions; auto-reconnect on page load if cookie is valid

### 4.3 Portfolio Overview Page (`/dashboard/overview`)
- [ ] Fetch balance from `GET /api/balance/:address`; show TON, USDT, and LP token balances in cards
- [ ] Active pool positions table: pool name, deposited amount, current APR
- [ ] Lifetime yield earned (sum of `yieldEarnedUsdt` across completed runs)
- [ ] Total x402 fees paid (sum of `x402FeeUsdt` across completed runs)
- [ ] 30-second polling with SWR or React Query; optimistic refresh after execute

### 4.4 Yield Scanner Page (`/dashboard/scanner`)
- [ ] Fetch pool list from `GET /api/pools`
- [ ] Ranked table: pool name, asset pair, APR, liquidity depth, estimated net gain for user's idle balance
- [ ] Crosschain opportunities flagged with estimated bridge cost and net gain after all fees
- [ ] "Rebalance Now" button on each row triggers the quote flow

### 4.5 Quote & Execute Flow (Web)
- [ ] `QuoteModal` component: calls `POST /api/agent/quote`, checks the advisor's `proceed` flag
- [ ] `proceed: false` — renders `ExplanationCard` with the advisor's plain-language reason; no Approve button
- [ ] `proceed: true` — renders `ProposalCard` (origin, destination, estimated yield, x402 fee, net gain, advisor explanation, confidence badge, "Ask Mira for a second opinion" button built via `buildAskMiraDeepLink` from `@tonyx/shared`); Approve and Dismiss buttons
- [ ] Approve: wallet signature via TON AppKit sign-message, then `POST /api/agent/execute` with `approvalToken`; handles HTTP 402 by prompting x402 payment
- [ ] Polls `GET /api/agent/runs/:id/status` and updates modal state (`pending -> executing -> completed`)
- [ ] On completion: toast notification with yield earned; invalidates balance and runs caches

### 4.6 Policy Manager Page (`/dashboard/policy`)
- [ ] Form fields: minimum net gain, cooldown period, spending floor, eligible assets (multi-select), approval mode toggle
- [ ] Client-side validation written inline (not imported from `packages/shared`)
- [ ] Wallet signature required on submit via TON AppKit
- [ ] Policy version history table: version number, changed fields diff, timestamp

### 4.7 Run History Page (`/dashboard/history`)
- [ ] Paginated table of all runs: timestamp, origin pool, destination pool, amount, yield earned, x402 fee, status
- [ ] Link to TON explorer for each completed run via `txHash`
- [ ] Separate "Skipped" tab for dismissed opportunities

### 4.8 Telegram Mini App WebView (`apps/web/app/(mini-app)/`)
- [ ] Separate Next.js route group with Telegram Mini App SDK initialised
- [ ] Global black/white theme tokens (§4.0) applied; Telegram theme variables (`--tg-theme-bg-color`, `--tg-theme-button-color`, etc.) layered on top where the WebView provides them
- [ ] Compact layout with the shared **Dock** component (§4.1) pinned to the bottom, 3 items: Home · Scanner · Settings; active item uses the primary token, icon scales up, iOS-style active indicator; `env(safe-area-inset-bottom)` padding respects the iPhone home bar
- [ ] Back-button handled via `Telegram.WebApp.BackButton`

### 4.9 Onboarding Flow (`/mini-app/onboard`)
- [ ] Step 1: Wallet connection — TON AppKit inside WebView; Privy embedded wallet fallback
- [ ] Step 2: Guided policy setup as a styled conversational Q&A:
  - "What's your spending floor?" (slider + text input)
  - "What minimum gain triggers a rebalance?" (preset options + custom)
  - "How often should I check?" (cooldown dropdown)
  - "Should I execute automatically or ask you first?" (toggle)
- [ ] Step 3: Policy review summary card
- [ ] Step 4: Wallet signature via TON AppKit; on success calls `POST /api/policy`
- [ ] Onboarding state persisted in `localStorage`; completed users skip to Home on next open

### 4.10 Mini App Home Screen (`/mini-app`)
- [ ] Balance cards: idle balance, deployed balance, current APR of active position, lifetime yield
- [ ] "Rebalance Now" button runs the advisor and shows the proposal bottom sheet
- [ ] Recent activity feed: last three runs with one-line summaries
- [ ] Pull-to-refresh using `Telegram.WebApp` haptic feedback

### 4.11 Mini App Proposal Sheet
- [ ] Bottom sheet with proposal details: origin pool, destination pool, estimated yield, x402 fee, net gain, advisor explanation, "Ask Mira for a second opinion" action (`buildAskMiraDeepLink`)
- [ ] Approve button: wallet signature then `POST /api/agent/execute` then loading state then success/failure
- [ ] Dismiss button: records skip via backend; sheet closes
- [ ] Sheet is triggered both from "Rebalance Now" and from notification deep links

### 4.12 Mini App Scanner Screen (`/mini-app/scanner`)
- [ ] Same pool table as web dashboard, adapted for mobile viewport
- [ ] Tap a row: bottom sheet with pool detail and "Rebalance into this pool" CTA

### 4.13 Mini App Settings Screen (`/mini-app/settings`)
- [ ] Full policy editor matching the dashboard policy manager
- [ ] Notification preferences: alert frequency, minimum gain threshold, quiet hours time picker
- [ ] Wallet section: shows connected address, option to disconnect

**Phase 4 exit criteria:** The landing page renders at `/` with the animated 3D beams hero, and its design tokens drive the theme across every page. The full quote-to-approve-to-execute cycle completes in the browser dashboard at `/dashboard`, with the Dock appearing on mobile viewports (`< md`) and the sidebar on desktop. A user can open the Mini App from `/start`, complete onboarding including wallet signature, see their balance, trigger a rebalance, approve it via the notification inline keyboard, and see the confirmation message — all without leaving Telegram, navigating via the Dock. Every proposal surface (web `ProposalCard`, Telegram bot, Mini App sheet) renders a working "Ask Mira for a second opinion" action that opens a correctly tagged deep link.

---

## Phase 5 — Hardening & Launch

**Goal:** Production-ready security, observability, performance, and documentation.

### 5.1 Security
- [ ] Rate limiting on all API endpoints (express-rate-limit: 100 req/min per IP, 20 req/min per wallet)
- [ ] Helmet.js headers on Express
- [ ] Wallet signature verification on every policy write (reject if signature does not match `walletAddress`)
- [ ] `approvalToken` single-use enforcement: mark consumed on execute; reject replays
- [ ] x402 payment proof double-spend check: store used payment proofs with TTL index in MongoDB
- [ ] Input sanitisation: all user-supplied strings run through Zod `.trim()` and max-length constraints
- [ ] Telegram webhook HMAC verified on every incoming request before any processing

### 5.2 Observability
- [ ] Structured JSON logging (Pino) with `walletAddress`, `runId`, `sessionId` in every log line
- [ ] Prometheus metrics endpoint (`/metrics`): pool scan latency, quote duration, execute success rate, x402 fee total, advisor evaluation latency
- [ ] Error tracking: Sentry DSN configured in both `apps/api` and `apps/web`
- [ ] MongoDB Atlas performance advisor reviewed; slow query alerts enabled

### 5.3 Performance
- [ ] Pool data cached in MongoDB with TTL; API returns stale-while-revalidate header
- [ ] `GET /api/balance/:address` cached per wallet for 30 s; invalidated on run completion
- [ ] Next.js ISR for marketing/static pages; dynamic dashboard routes remain server-rendered
- [ ] Connection pooling for MongoDB (Mongoose default pool size tuned for Render instance size)

### 5.4 Testing
- [ ] Unit tests: Zod schema validators, `evaluateRebalance()` boundary conditions, `buildAskMiraDeepLink()` formatting, policy eligibility checker, x402 middleware
- [ ] Integration tests: full quote-to-execute-to-poll cycle against a real dev MongoDB with a mocked Omniston client
- [ ] E2E tests (Playwright): wallet connect, policy set, rebalance, run history visible; Mini App onboarding flow
- [ ] Load test: 100 concurrent quote requests; p99 under 2 s

### 5.5 Deployment
- [ ] **Frontend (Vercel):** Production deployment from `main` branch. Mini App URL registered with Telegram via BotFather. Environment variables set in Vercel dashboard.
- [ ] **Backend (Render):** Production web service + background worker for pool scanner. Health check endpoint at `/health`. Auto-deploy from `main`.
- [ ] **MongoDB Atlas:** Production cluster in the same region as Render. Network access restricted to Render static outbound IPs.
- [ ] Domain: `tonyx.app` to Vercel. `api.tonyx.app` to Render. TLS managed by both platforms.
- [ ] Cron endpoint `POST /api/cron/scan` protected by `CRON_SECRET` header; called by Render cron every 60 s.

### 5.6 Documentation
- [ ] Swagger UI at `api.tonyx.app/api/docs` with all endpoints documented via JSDoc including request/response examples
- [ ] `README.md` in each `apps/` and `packages/` directory: purpose, setup, environment variables
- [ ] Runbook: how to rotate API keys, handle a failed run, replay a skipped rebalance, soft-delete a user

**Phase 5 exit criteria:** Load test passes. Sentry shows zero unhandled errors after 24 h of staging traffic. Swagger UI reflects all live endpoints. Vercel and Render production deployments are live and healthy.

---

## Environment Variables Reference

### Frontend (`apps/web/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_TON_MANIFEST_URL` | TON Connect manifest for wallet pairing |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy embedded wallet app ID |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot username for Mini App deep links |

### Backend (`apps/api/.env`)

| Variable | Purpose |
|---|---|
| `OMNISTON_API_KEY` | Omniston SDK auth |
| `TONAPI_KEY` | TonAPI for balance and tx data |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Database name |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TELEGRAM_WEBHOOK_SECRET` | HMAC secret for webhook verification |
| `X402_WALLET_ADDRESS` | Tonyx fee collection wallet |
| `X402_FEE_USDT` | Fee per execution in USDT |
| `CRON_SECRET` | Protects the cron scan endpoint |
| `SESSION_SECRET` | JWT signing secret |

---

## Dependency Map

```
Phase 0 --> Phase 1 --> Phase 2 --+
                  |               |
                  +-> Phase 3 --+--> Phase 4 --> Phase 5
```

Phase 2 (Advisor Engine & Ask Mira Bridge) and Phase 3 (Telegram Bot) both depend on Phase 1 and can be developed in parallel. Phase 4 (all frontend) depends on both Phase 2 and Phase 3 being complete. Phase 5 hardening runs in parallel with late Phase 4 work.
