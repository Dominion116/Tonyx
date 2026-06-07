# Tonyx

Tonyx is a yield optimization agent for the TON ecosystem. It monitors liquidity pools, evaluates rebalancing opportunities with a transparent, policy-driven advisor engine, gates execution behind x402 micropayments, and delivers approvals through Telegram and a web dashboard. Every proposal can be handed to [@mira](https://t.me/mira) for a second opinion via a one-tap Telegram deep link.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Development Phases](#development-phases)
- [Deployment](#deployment)
- [API Reference](#api-reference)

---

## Overview

Tonyx connects to TON liquidity pools via the Omniston SDK, evaluates yield opportunities against a user-defined policy, and runs every candidate route through a deterministic advisor engine that decides whether to proceed. Users interact through a web dashboard or directly via Telegram -- including a Telegram Mini App WebView.

Every execution is gated behind an x402 payment proof, making fee collection trustless and on-chain. Users can choose manual approval (Telegram inline buttons or dashboard Approve/Dismiss) or fully automatic execution. On any proposal, an "Ask Mira for a second opinion" action opens a pre-filled chat with [@mira](https://t.me/mira) so users can sanity-check the route with Telegram's AI teammate.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Express 5, Node.js 22, TypeScript strict mode |
| Database | MongoDB Atlas (Mongoose) |
| Advisor | Deterministic, policy-driven recommendation engine (`apps/api/src/services/advisor.ts`) |
| DEX routing | Omniston SDK v1beta8 |
| Payments | x402 micropayment protocol |
| Messaging | Telegram Bot API, Telegram Mini App SDK |
| Wallet | TON AppKit (TON Connect), Privy (embedded fallback) |
| Monorepo | Turborepo, npm workspaces |
| Hosting | Vercel (frontend), Render (backend + worker) |

---

## Project Structure

```
tonyx/
  apps/
    web/          Next.js 14 dashboard and Telegram Mini App WebView
    api/          Express API server and background pool scanner
  packages/
    shared/       Zod schemas, inferred TypeScript types, and integration helpers shared across apps
    omniston/     Typed wrapper around the Omniston SDK (pool discovery, quotes, routing)
  turbo.json
  package.json
```

### Package responsibilities

**`packages/shared`**
Defines Zod schemas for every MongoDB document (`users`, `policies`, `runs`, `notifications`) and all API request/response shapes, plus shared integration helpers such as `buildAskMiraDeepLink` (in `integrations/mira-link.ts`), which both the Telegram bot and the web dashboard use to build the "Ask Mira for a second opinion" deep link from a single source of truth. `apps/web` imports types from this package using `import type { ... }` for runtime/Zod-free bundles, and the `buildAskMiraDeepLink` helper at runtime.

**`packages/omniston`**
Thin typed wrapper exposing three functions: `discoverPools()`, `getQuote()`, and `executeRoute()`. All Omniston SDK calls go through this package.

**`apps/api`**
Express 5 server with JWT authentication, wallet signature verification, Telegram HMAC middleware, x402 middleware, a deterministic advisor engine (`services/advisor.ts`), and a background `node-cron` job that scans pools every 60 seconds. Swagger UI is available at `/api/docs`.

**`apps/web`**
Next.js 14 App Router with two layout groups: `(dashboard)` for the web experience and `(mini-app)` for the Telegram Mini App WebView. Fetches data through a typed API client built on top of types from `packages/shared`.

---

## Getting Started

### Prerequisites

- Node.js 22
- npm 11+
- MongoDB Atlas cluster (dev)
- Omniston API key
- TonAPI key
- Telegram bot token (from BotFather)

### Installation

```bash
git clone https://github.com/Dominion116/Tonyx.git
cd Tonyx
npm install
```

### Environment setup

Copy the example env files and fill in your credentials:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

See the [Environment Variables](#environment-variables) section for the full list.

### Running locally

```bash
npm run dev
```

This starts both `apps/web` (Next.js) and `apps/api` (Express) in parallel using Turborepo. The web app runs on `http://localhost:3000` and the API on `http://localhost:4000`.

### Other scripts

```bash
npm run build        # Build all apps and packages
npm run lint         # Lint all workspaces
npm run test         # Run all test suites
npm run type-check   # TypeScript type checking across all packages
```

---

## Environment Variables

### Frontend (`apps/web/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_TON_MANIFEST_URL` | TON Connect manifest URL for wallet pairing |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy embedded wallet app ID |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot username used for Mini App deep links |

### Backend (`apps/api/.env`)

| Variable | Purpose |
|---|---|
| `OMNISTON_API_KEY` | Omniston SDK authentication |
| `TONAPI_KEY` | TonAPI key for balance and transaction data |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Target database name |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `TELEGRAM_WEBHOOK_SECRET` | HMAC secret for webhook signature verification |
| `X402_WALLET_ADDRESS` | Tonyx fee collection wallet address |
| `X402_FEE_USDT` | Per-execution fee in USDT |
| `CRON_SECRET` | Secret header required by the cron scan endpoint |
| `SESSION_SECRET` | JWT signing secret |

---

## Architecture

### Request flow

```
User (web or Telegram)
  |
  v
Next.js App (apps/web)  --  Telegram Bot / Mini App
  |                               |
  v                               v
Express API (apps/api)  <---------+
  |           |
  |           +-- packages/omniston    -->  Omniston SDK  -->  TON pools
  |           +-- services/advisor.ts  -->  deterministic recommendation engine
  |           +-- MongoDB Atlas
  |
  v
x402 payment verification  -->  Omniston executeRoute
  |
  v
Background coroutine polls TonAPI for txHash, updates run status

Any proposal  -->  buildAskMiraDeepLink (packages/shared)  -->  t.me/mira?text=...  -->  @mira (second opinion)
```

### Data model

| Collection | Purpose |
|---|---|
| `users` | Wallet addresses and session tokens |
| `policies` | Per-wallet rebalancing rules with full version history |
| `runs` | Individual execution records (pending, executing, completed, failed, skipped) |
| `notifications` | Per-wallet notification preferences (approval mode, quiet hours, alert frequency) |

### Advisor engine

Every quote, Telegram `/rebalance`, and notification-scanner candidate is evaluated by `evaluateRebalance()` (`apps/api/src/services/advisor.ts`) -- a single, deterministic, policy-driven function. It computes a `proceed` flag from the policy's minimum net-gain floor, a `confidence` score that scales with the margin above that floor and route size, and a templated plain-language `explanation`. Because the logic is transparent and reproducible rather than a black-box model call, every recommendation Tonyx makes can be explained and audited from the policy alone.

### Ask Mira for a second opinion

Mira (the [@mira](https://t.me/mira) Telegram bot) has no programmatic API -- only deep links, inline mode, and custom skills. Tonyx bridges to it with `buildAskMiraDeepLink()` (`packages/shared/src/integrations/mira-link.ts`), which renders a proposal as a tagged, plain-language summary and opens `https://t.me/mira?text=<encoded summary>`. The `[TONYX PROPOSAL]` tag at the top is the trigger a custom Mira skill matches on; the rest reads naturally even without the skill configured. Both the Telegram bot's `/rebalance` proposal and the web dashboard's `ProposalCard` use this single shared builder.

### x402 gate

`POST /api/agent/execute` requires a valid x402 payment proof in the request header. The middleware verifies the proof against `X402_WALLET_ADDRESS`, rejects with HTTP 402 and a payment requirement payload if it is missing or invalid, and records used proofs with a TTL index to prevent double-spend.

---

## Key Features

**Deterministic, policy-driven advisor**
Before returning a quote, the API runs the candidate route through `evaluateRebalance()`. The response includes a `proceed` flag, a confidence score (0-1), and a plain-language explanation derived directly from the user's policy and the route's economics. If `proceed` is false, no `approvalToken` is issued and the frontend renders an explanation card with no Approve button.

**Ask Mira for a second opinion**
Every proposal -- in the Telegram bot and the web dashboard's `ProposalCard` -- carries an "Ask Mira for a second opinion" action. It opens a Telegram chat with [@mira](https://t.me/mira) pre-filled with the route, economics, and Tonyx's own reasoning, so the user can get an independent read from Telegram's AI teammate in one tap.

**Manual and automatic approval modes**
Users choose per-policy whether rebalances require manual approval or execute automatically. Manual users receive a Telegram message with Approve/Dismiss inline keyboard buttons. Auto users receive a confirmation message after execution.

**Telegram-first UX**
The Telegram bot handles `/start`, `/status`, `/rebalance`, `/policy`, and `/history`. The Mini App WebView (launched from `/start`) provides the full onboarding flow, balance overview, scanner, and policy editor without leaving Telegram.

**Policy versioning**
Every policy save increments a version counter and retains the full history. Users can review a diff of what changed between versions from the policy manager page.

---

## Development Phases

The project ships in six independent phases. Each phase is deployable on its own and builds directly on the previous one. All frontend work is consolidated into Phase 4 so the agent core, API, and integrations are hardened before any UI is built on top of them.

| Phase | Name | Outcome |
|---|---|---|
| 0 | Foundation | Monorepo wired, shared types, CI green, local dev in one command |
| 1 | Backend Core | Live API with pool scanner, policy engine, and x402 gate |
| 2 | Advisor and Backend Core | Quote pipeline, deterministic advisor evaluation, Ask Mira deep-link bridge |
| 3 | Telegram Bot and Notifications | Bot commands, webhook callbacks, scanner-triggered notifications |
| 4 | Frontend and UI | Web dashboard, scanner and policy views, Telegram Mini App WebView |
| 5 | Hardening and Launch | Security, observability, performance, E2E tests, production deployment |

Phases 2 and 3 both depend on Phase 1 and can be developed in parallel. Phase 4 depends on both Phase 2 and Phase 3 being complete. Phase 5 hardening runs in parallel with late Phase 4 work.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the full task-level breakdown including exit criteria for each phase.

---

## Deployment

### Frontend -- Vercel

The `apps/web` directory is linked to a Vercel project. Production deploys from the `main` branch. Set all `NEXT_PUBLIC_*` variables in the Vercel dashboard. The Telegram Mini App URL is registered with BotFather after the first successful production deploy.

### Backend -- Render

The `apps/api` directory runs as a Render web service (API) and a separate background worker (pool scanner). Auto-deploy triggers on push to `main`. A health check endpoint is available at `/health`. The cron scan endpoint `POST /api/cron/scan` is called by a Render cron every 60 seconds, authenticated via the `CRON_SECRET` header.

### Database -- MongoDB Atlas

Production cluster in the same region as Render. Network access is restricted to Render's static outbound IPs. Indexes on `walletAddress` (all collections) are created on API startup.

### Live URLs

| Surface | URL |
|---|---|
| Web dashboard | [tonyx-web.vercel.app](https://tonyx-web.vercel.app/) |
| API | [tonyx.onrender.com](https://tonyx.onrender.com) |
| Telegram bot | [@ton_yx_bot](https://t.me/ton_yx_bot) |

TLS is managed by both platforms.

---

## API Reference

Swagger UI is available at `http://localhost:4000/api/docs` in development and at `https://tonyx.onrender.com/api/docs` in production. Every endpoint is documented with JSDoc including request and response examples.

### Endpoint summary

| Method | Path | Description |
|---|---|---|
| POST | `/api/wallet/connect` | Authenticate wallet, receive JWT |
| GET | `/api/balance/:address` | Wallet balance and LP positions |
| GET | `/api/pools` | Ranked pool list from Omniston |
| POST | `/api/policy` | Create or update policy (wallet signature required) |
| GET | `/api/policy/:address` | Active policy and version history |
| POST | `/api/agent/quote` | Get an advisor-evaluated rebalancing proposal |
| POST | `/api/agent/execute` | Execute approved rebalance (x402 gated) |
| GET | `/api/agent/runs/:address` | Paginated run history |
| GET | `/api/agent/runs/:id/status` | Status of a single run |
| PUT | `/api/notifications/:address` | Update notification preferences |
| POST | `/api/telegram/webhook` | Telegram Bot API webhook (HMAC verified) |

---

## License

MIT
