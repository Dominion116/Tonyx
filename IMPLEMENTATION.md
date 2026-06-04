# Tonyx — Implementation Plan

**Version:** 1.0 | **Date:** June 2026  
**Stack:** Next.js 14 · Express/Node.js 22 · MongoDB Atlas · Omniston SDK · Mira AI · x402 · Telegram Bot API

---

## Overview

Implementation is split into five phases. Each phase is independently shippable and builds on the previous one.

| Phase | Name | Outcome |
|-------|------|---------|
| 0 | Foundation | Mono-repo wired, shared types, CI green |
| 1 | Backend Core | Live API with pool scanner and x402 gate |
| 2 | Web Dashboard | Full dashboard — connect, scan, quote, execute |
| 3 | AI & Chat Layer | Mira chat panel with cross-session memory |
| 4 | Telegram Mini App | Full Mini App — onboard, approve, notify |
| 5 | Hardening & Launch | Security, performance, monitoring, deployment |

---

## Phase 0 — Foundation & Infrastructure

**Goal:** Every engineer can clone, install, and run the full stack locally in one command.

### 0.1 Mono-repo Bootstrap
- [ ] Initialise Turborepo workspace with `pnpm` workspaces
- [ ] Create directory skeleton:
  ```
  apps/
    web/          ← Next.js 14
    api/          ← Express on Node.js 22
  packages/
    shared/       ← TypeScript types + Zod schemas
    omniston/     ← Omniston SDK wrapper
    mira/         ← Mira AI client adapter
  ```
- [ ] Root `turbo.json` with `dev`, `build`, `lint`, `test` pipelines
- [ ] `.env.example` files for `apps/web` and `apps/api` covering all variables from §12

### 0.2 Shared Package (`packages/shared`)
- [ ] Zod schemas for every MongoDB document (users, policies, runs, notifications, chat_sessions, chat_messages)
- [ ] Inferred TypeScript types exported alongside each schema
- [ ] Shared API request/response types for every endpoint in §9
- [ ] Zod schema for Mira recommendation object (§11)

### 0.3 Omniston Package (`packages/omniston`)
- [ ] Install Omniston SDK v1beta8
- [ ] Thin typed wrapper exposing three functions: `discoverPools()`, `getQuote()`, `executeRoute()`
- [ ] Unit tests with mocked Omniston responses

### 0.4 Mira Package (`packages/mira`)
- [ ] Mira API client with typed `evaluate(context)` and `chat(messages, context)` methods
- [ ] Context builder utility that assembles pool data + policy + balance into Mira's expected input shape
- [ ] Unit tests with mocked Mira responses

### 0.5 CI/CD Baseline
- [ ] GitHub Actions: lint → type-check → unit tests on every PR
- [ ] Vercel project linked to `apps/web` (preview deployments on PR)
- [ ] Render service linked to `apps/api` (preview deployment on PR)
- [ ] MongoDB Atlas: dev cluster provisioned, connection string in GitHub secrets

**Phase 0 exit criteria:** `pnpm dev` starts both apps. All lint and type-check steps pass. Shared types resolve across packages.

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
- [ ] Models for all six collections (§8.3): `users`, `policies`, `runs`, `notifications`, `chat_sessions`, `chat_messages`
- [ ] Index creation on startup: `walletAddress` (all collections), `sessionId` (chat_messages), `deletedAt` (chat_sessions)

### 1.3 Authentication Layer
- [ ] `POST /api/wallet/connect` — accepts wallet address, returns signed JWT session token (§9)
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
- [ ] Execution coroutine: polls TonAPI for `txHash`, transitions run status through `executing → completed | failed`, updates MongoDB

### 1.7 Run History Endpoints
- [ ] `GET /api/agent/runs/:address` — paginated run list (limit/cursor), includes all statuses
- [ ] `GET /api/agent/runs/:id/status` — returns current status of a single run

### 1.8 Notification Preferences
- [ ] `PUT /api/notifications/:address` — validates and upserts notification preferences document

### 1.9 x402 Middleware
- [ ] Generic x402 Express middleware: checks for valid payment proof in request header, verifies against `X402_WALLET_ADDRESS`, rejects with HTTP 402 + payment requirement payload if missing
- [ ] Applied to `POST /api/agent/execute` and later to `POST /api/chat/sessions/:sessionId/messages`

**Phase 1 exit criteria:** Swagger UI shows all endpoints. Authenticated `curl` calls to `/api/pools`, `/api/agent/quote`, and `/api/agent/execute` return expected shaped responses. A full quote→execute→poll cycle writes a `completed` run document.

---

## Phase 2 — Web Dashboard

**Goal:** A functional web dashboard covering wallet connection, portfolio overview, yield scanning, policy management, and rebalance execution.

### 2.1 Next.js 14 App Setup (`apps/web`)
- [ ] App Router with TypeScript strict mode
- [ ] `shadcn/ui` init + Tailwind CSS configured with a neutral base theme
- [ ] Shared layout with sidebar navigation: Overview · Scanner · History · Policy · Chat
- [ ] API client module (typed fetch wrapper) using types from `packages/shared`

### 2.2 Wallet Connection
- [ ] Install and configure `@ton-connect/ui` (TON AppKit)
- [ ] Install and configure Privy SDK for embedded wallet fallback
- [ ] `WalletButton` component in the top nav — shows connect state or truncated address
- [ ] On connect: call `POST /api/wallet/connect`, store JWT in `httpOnly` cookie via Next.js Route Handler
- [ ] Persist connection across sessions; auto-reconnect on page load if cookie valid

### 2.3 Portfolio Overview Page (`/`)
- [ ] Fetch balance from `GET /api/balance/:address`; show TON, USDT, and LP token balances in cards
- [ ] Active pool positions table: pool name, deposited amount, current APR
- [ ] Lifetime yield earned (sum of `yieldEarnedUsdt` across completed runs)
- [ ] Total x402 fees paid (sum of `x402FeeUsdt` across completed runs)
- [ ] 30-second polling with `SWR` or React Query; optimistic refresh after execute

### 2.4 Yield Scanner Page (`/scanner`)
- [ ] Fetch pool list from `GET /api/pools`
- [ ] Ranked table: pool name, asset pair, APR, liquidity depth, estimated net gain for user's idle balance
- [ ] Crosschain opportunities flagged with estimated bridge cost and net gain after all fees
- [ ] "Rebalance Now" button on each row → triggers quote flow

### 2.5 Quote & Execute Flow
- [ ] `QuoteModal` component: calls `POST /api/agent/quote`, renders proposal card (origin, destination, estimated yield, x402 fee, net gain, Mira plain-language explanation)
- [ ] Wallet signature step before execution (TON AppKit sign-message)
- [ ] Calls `POST /api/agent/execute` with `approvalToken`; handles HTTP 402 by prompting x402 payment
- [ ] Polls `GET /api/agent/runs/:id/status` and updates modal state (pending → executing → completed)
- [ ] On completion: toast notification with yield earned; invalidates balance and runs caches

### 2.6 Policy Manager Page (`/policy`)
- [ ] Form fields: minimum net gain, cooldown period, spending floor, eligible assets (multi-select), approval mode toggle
- [ ] Client-side Zod validation matching `packages/shared` policy schema
- [ ] Wallet signature required on submit (surfaced inline via TON AppKit)
- [ ] Policy version history table: version number, changed fields diff, timestamp

### 2.7 Run History Page (`/history`)
- [ ] Paginated table of all runs: timestamp, origin pool, destination pool, amount, yield earned, x402 fee, status
- [ ] Link to TON explorer for each completed run via `txHash`
- [ ] Separate "Skipped" tab for dismissed opportunities

**Phase 2 exit criteria:** Full quote→approve→execute cycle completes in the browser. Policy update requires and accepts a wallet signature. Run history reflects completed and skipped runs.

---

## Phase 3 — AI & Chat Layer

**Goal:** Mira is available in the dashboard chat panel with cross-session memory, streaming responses, and inline proposal cards.

### 3.1 Chat API Endpoints (`apps/api`)
- [ ] `POST /api/chat/sessions` — creates session, auto-generates title placeholder, returns `{ sessionId, title, createdAt }`
- [ ] `GET /api/chat/sessions/:address` — lists non-deleted sessions ordered by `lastActivityAt` desc
- [ ] `GET /api/chat/sessions/:sessionId/messages` — returns paginated messages (cursor-based, `before` param)
- [ ] `POST /api/chat/sessions/:sessionId/messages` — main message endpoint (x402 gated):
  - Validates session belongs to requesting wallet
  - Assembles cross-session memory: last 40 messages across all wallet sessions ordered by `createdAt` desc, excluding active session
  - Fetches live yield snapshot (pool APRs, user balance, active policy)
  - Forwards to `packages/mira` `chat()` method
  - Streams SSE response back to client
  - If Mira returns a proposal object, emits `{ type: 'proposal', data: {...} }` event
  - Saves both messages to `chat_messages` with `contextSnapshot` on assistant message
  - Updates `lastActivityAt` on session
- [ ] `DELETE /api/chat/sessions/:sessionId` — soft delete (sets `deletedAt`); messages retained

### 3.2 Cross-Session Memory Logic
- [ ] `buildMemoryContext(walletAddress, activeSessionId)` utility in `apps/api/src/lib/`
- [ ] Queries `chat_messages` for wallet across all sessions excluding active; orders by `createdAt` desc; takes up to 40 messages
- [ ] Summarises prior-session messages into a condensed history block (one paragraph per session)
- [ ] Respects sliding window: if combined token estimate exceeds limit, drops oldest prior-session content first; never truncates active thread

### 3.3 Mira Context Builder
- [ ] `buildEvaluationContext(walletAddress)` in `packages/mira`: fetches pool APRs, Omniston quote for top candidate, estimated costs, active policy, idle balance, last three runs
- [ ] Returns typed context object that maps directly to Mira's expected input shape

### 3.4 Dashboard Chat Panel (`apps/web`)
- [ ] Persistent right-sidebar `ChatPanel` component visible on all dashboard pages
- [ ] Session list sidebar: all sessions ordered by last activity; "New Chat" button at top
- [ ] Active session message thread with streaming content rendering (SSE consumer)
- [ ] `ProposalCard` component: renders when SSE emits `type: 'proposal'`; shows origin, destination, yield, fee, net gain; Approve / Dismiss buttons
- [ ] Approve in chat: calls `POST /api/agent/execute` inline, polls status, shows result in thread
- [ ] Message composer with submit on Enter, Shift+Enter for newline
- [ ] Session rename: inline edit on session title in the list
- [ ] Soft delete: removes session from list; confirmation modal warns that history is retained for memory

### 3.5 Mira Evaluation on Rebalance Trigger
- [ ] Rebalance Now (dashboard button and scanner row) invokes Mira evaluate first, not a raw quote
- [ ] Mira `proceed: false` → renders explanation card with no Approve button
- [ ] Mira `proceed: true` → renders full proposal card with Approve button and confidence score

**Phase 3 exit criteria:** User can open a chat session, ask "what is the best pool right now?", receive a streamed plain-language answer, and if Mira identifies an opportunity, tap Approve inline and see the run complete without leaving the chat panel. A new session inherits memory from a prior session without being told anything.

---

## Phase 4 — Telegram Mini App

**Goal:** Full Telegram Mini App experience — onboard, monitor, approve, and configure, all without leaving Telegram.

### 4.1 Telegram Bot Setup
- [ ] Create Tonyx bot via BotFather; register `TELEGRAM_BOT_TOKEN`
- [ ] Configure webhook: `POST /api/telegram/webhook` with HMAC secret
- [ ] Bot commands: `/start`, `/status`, `/rebalance`, `/policy`, `/history`
- [ ] `/start` handler: sends welcome message + "Launch App" button wired to the Mini App URL

### 4.2 Mini App WebView Pages (`apps/web/app/mini-app/`)
- [ ] Separate Next.js route group under `/mini-app` with Telegram Mini App SDK initialised
- [ ] Apply Telegram theme variables to Tailwind: `--tg-theme-bg-color`, `--tg-theme-button-color`, etc.
- [ ] Compact layout with bottom navigation: Home · Scanner · Chat · Settings
- [ ] Back-button handled via `Telegram.WebApp.BackButton`

### 4.3 Onboarding Flow (`/mini-app/onboard`)
- [ ] Step 1: Wallet connection — TON AppKit inside WebView; Privy embedded wallet fallback
- [ ] Step 2: Mira-guided policy setup — conversational prompts rendered as a styled Q&A:
  - "What's your spending floor?" (slider + text input)
  - "What minimum gain triggers a rebalance?" (preset options + custom)
  - "How often should I check?" (cooldown dropdown)
  - "Should I execute automatically or ask you first?" (toggle)
- [ ] Step 3: Policy review — summary card with all values
- [ ] Step 4: Wallet signature — TON AppKit sign prompt; on success calls `POST /api/policy`
- [ ] Onboarding state persisted in `localStorage`; completed users skip to Home on next open

### 4.4 Home Screen (`/mini-app`)
- [ ] Balance cards: idle balance, deployed balance, current APR of active position, lifetime yield
- [ ] "Rebalance Now" button → triggers Mira evaluate → shows proposal sheet
- [ ] Recent activity feed: last three runs with one-line summaries (e.g. "Earned $0.84 in USDT/TON pool · 2 h ago")
- [ ] Pull-to-refresh using `Telegram.WebApp` haptic feedback

### 4.5 Proposal Sheet (Approve / Dismiss)
- [ ] Bottom sheet with proposal details: origin pool, destination pool, estimated yield, x402 fee, net gain, Mira explanation
- [ ] "Approve" button → wallet signature → `POST /api/agent/execute` → loading state → success/failure state
- [ ] "Dismiss" button → records skip via backend; sheet closes
- [ ] Sheet is triggered both from "Rebalance Now" and from inline approve/dismiss in notification deep link

### 4.6 Telegram Notifications
- [ ] Background scanner in `apps/api` (already built in Phase 1) checks qualifying opportunities per wallet every scan cycle
- [ ] For wallets with `approvalMode: 'manual'` and a qualifying rebalance: sends Telegram message via Bot API with inline keyboard buttons: ✅ Approve / ❌ Dismiss
- [ ] For wallets with `approvalMode: 'auto'`: auto-executes and sends confirmation message
- [ ] Webhook handler processes inline keyboard callbacks: routes to execute or skip logic
- [ ] Respects `quietHoursStart`/`quietHoursEnd` and `alertFrequency` from notifications document
- [ ] Execution confirmation message: "Rebalanced ✅ — earned $X.XX · fee $Y.YY · tx: [link]"

### 4.7 Scanner Screen (`/mini-app/scanner`)
- [ ] Same pool table as web dashboard, adapted for mobile viewport
- [ ] Tap a row → bottom sheet with pool detail + "Rebalance into this pool" CTA

### 4.8 Chat Screen (`/mini-app/chat`)
- [ ] Tab strip showing last three sessions; "New Chat" button
- [ ] Full message thread with streaming SSE rendering
- [ ] `ProposalCard` adapted for mobile: same Approve / Dismiss flow as desktop
- [ ] Compose bar pinned to bottom, respects Telegram keyboard inset via `Telegram.WebApp.expand()`

### 4.9 Settings Screen (`/mini-app/settings`)
- [ ] Full policy editor mirroring the web dashboard policy manager
- [ ] Notification preferences: alert frequency, minimum gain threshold, quiet hours time picker
- [ ] Wallet section: shows connected address, option to disconnect

**Phase 4 exit criteria:** A user can open the Mini App from `/start`, complete onboarding including wallet signature, see their balance, trigger a rebalance, approve it via the notification inline keyboard, and see the confirmation message — all without leaving Telegram.

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
- [ ] Prometheus metrics endpoint (`/metrics`): pool scan latency, quote duration, execute success rate, x402 fee total, Mira latency
- [ ] Error tracking: Sentry DSN configured in both `apps/api` and `apps/web`
- [ ] MongoDB Atlas performance advisor reviewed; slow query alerts enabled

### 5.3 Performance
- [ ] Pool data cached in MongoDB with TTL; API returns stale-while-revalidate header
- [ ] `GET /api/balance/:address` cached per wallet for 30 s; invalidated on run completion
- [ ] Next.js ISR for marketing/static pages; dynamic dashboard routes remain server-rendered
- [ ] Mira streaming responses piped directly from Mira API to client; no buffering
- [ ] Connection pooling for MongoDB (Mongoose default pool size tuned for Render instance size)

### 5.4 Testing
- [ ] Unit tests: Zod schema validators, cross-session memory builder, policy eligibility checker, x402 middleware
- [ ] Integration tests: full quote→execute→poll cycle against a real dev MongoDB and mocked Omniston + Mira
- [ ] E2E tests (Playwright): wallet connect → policy set → rebalance → run history visible; Mini App onboarding flow
- [ ] Load test: 100 concurrent quote requests; p99 < 2 s

### 5.5 Deployment
- [ ] **Frontend (Vercel):** Production deployment from `main` branch. Mini App URL registered with Telegram via BotFather. Environment variables set in Vercel dashboard.
- [ ] **Backend (Render):** Production web service + background worker for pool scanner. Health check endpoint at `/health`. Auto-deploy from `main`.
- [ ] **MongoDB Atlas:** Production cluster in the same region as Render. Network access restricted to Render static outbound IPs.
- [ ] Domain: `tonyx.app` → Vercel. `api.tonyx.app` → Render. TLS managed by both platforms.
- [ ] Cron endpoint `POST /api/cron/scan` protected by `CRON_SECRET` header; called by Render cron every 60 s.

### 5.6 Documentation
- [ ] Swagger UI at `api.tonyx.app/api/docs` — all endpoints documented with JSDoc including request/response examples
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
| `MIRA_API_KEY` | Mira AI API auth |
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
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3
                  │                        │
                  └──────────────────────► Phase 4
                                           │
                                           ▼
                                        Phase 5
```

Phases 2 and 4 both depend on Phase 1 and can be developed in parallel after Phase 1 is complete. Phase 3 depends on Phase 2 (chat panel is embedded in the dashboard). Phase 5 runs in parallel with late Phase 4 work.
