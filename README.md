# Tonyx

Tonyx is an AI-powered yield optimization agent for the TON ecosystem. It monitors liquidity pools, evaluates rebalancing opportunities using Mira AI, gates execution behind x402 micropayments, and delivers approvals through Telegram with a chat-first interface.

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

Tonyx connects to TON liquidity pools via the Omniston SDK, evaluates yield opportunities against a user-defined policy, and uses Mira AI to decide whether to proceed with a rebalance. Users interact through a web dashboard, a persistent chat panel, or directly via Telegram -- including a Telegram Mini App WebView.

Every execution is gated behind an x402 payment proof, making fee collection trustless and on-chain. Users can choose manual approval (Telegram inline buttons or chat Approve/Dismiss) or fully automatic execution.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Express 5, Node.js 22, TypeScript strict mode |
| Database | MongoDB Atlas (Mongoose) |
| AI | Mira AI (evaluation + chat) |
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
    shared/       Zod schemas and inferred TypeScript types shared across apps
    omniston/     Typed wrapper around the Omniston SDK (pool discovery, quotes, routing)
    mira/         Mira AI client adapter (evaluate, chat, context builder)
  turbo.json
  package.json
```

### Package responsibilities

**`packages/shared`**
Defines Zod schemas for every MongoDB document (`users`, `policies`, `runs`, `notifications`, `chat_sessions`, `chat_messages`) and all API request/response shapes. `apps/web` imports only types from this package using `import type { ... }` -- never runtime values or Zod schemas -- to keep the client bundle free of server-side validation code.

**`packages/omniston`**
Thin typed wrapper exposing three functions: `discoverPools()`, `getQuote()`, and `executeRoute()`. All Omniston SDK calls go through this package.

**`packages/mira`**
Mira AI client with `evaluate(context)` and `chat(messages, context)` methods. Includes a `buildEvaluationContext` utility that assembles pool data, active policy, idle balance, and recent run history into the shape Mira expects.

**`apps/api`**
Express 5 server with JWT authentication, wallet signature verification, Telegram HMAC middleware, x402 middleware, and a background `node-cron` job that scans pools every 60 seconds. Swagger UI is available at `/api/docs`.

**`apps/web`**
Next.js 14 App Router with two layout groups: `(dashboard)` for the web experience and `(mini-app)` for the Telegram Mini App WebView. Fetches data through a typed API client built on top of types from `packages/shared`.

---

## Getting Started

### Prerequisites

- Node.js 22
- npm 11+
- MongoDB Atlas cluster (dev)
- Omniston API key
- Mira AI API key
- TonAPI key
- Telegram bot token (from BotFather)

### Installation

```bash
git clone https://github.com/oyewale-dominion/tonyx.git
cd tonyx
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
| `MIRA_API_KEY` | Mira AI API authentication |
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
  |           +-- packages/omniston  -->  Omniston SDK  -->  TON pools
  |           +-- packages/mira      -->  Mira AI API
  |           +-- MongoDB Atlas
  |
  v
x402 payment verification  -->  Omniston executeRoute
  |
  v
Background coroutine polls TonAPI for txHash, updates run status
```

### Data model

| Collection | Purpose |
|---|---|
| `users` | Wallet addresses and session tokens |
| `policies` | Per-wallet rebalancing rules with full version history |
| `runs` | Individual execution records (pending, executing, completed, failed, skipped) |
| `notifications` | Per-wallet notification preferences (approval mode, quiet hours, alert frequency) |
| `chat_sessions` | Chat session metadata per wallet (soft-deletable) |
| `chat_messages` | Individual messages with context snapshots on assistant turns |

### Cross-session memory

When a user sends a chat message, the API assembles the last 40 messages across all prior sessions for that wallet, summarises each prior session into a condensed paragraph, and injects this history into Mira's context alongside a live yield snapshot (pool APRs, idle balance, active policy). The active thread is never truncated; oldest prior-session content is dropped first if the token estimate exceeds the configured limit.

### x402 gate

`POST /api/agent/execute` and `POST /api/chat/sessions/:sessionId/messages` both require a valid x402 payment proof in the request header. The middleware verifies the proof against `X402_WALLET_ADDRESS`, rejects with HTTP 402 and a payment requirement payload if it is missing or invalid, and records used proofs with a TTL index to prevent double-spend.

---

## Key Features

**AI-evaluated rebalancing**
Before returning a quote, the API calls Mira `evaluate()` with a context snapshot. The response includes a `proceed` flag, a confidence score (0-1), and a plain-language explanation. If `proceed` is false, no `approvalToken` is issued and the frontend renders an explanation card with no Approve button.

**Manual and automatic approval modes**
Users choose per-policy whether rebalances require manual approval or execute automatically. Manual users receive a Telegram message with Approve/Dismiss inline keyboard buttons. Auto users receive a confirmation message after execution.

**Telegram-first UX**
The Telegram bot handles `/start`, `/status`, `/rebalance`, `/policy`, and `/history`. The Mini App WebView (launched from `/start`) provides the full onboarding flow, balance overview, scanner, chat, and policy editor without leaving Telegram.

**Persistent chat with proposals**
The chat panel (web dashboard and Mini App) streams Mira responses over SSE. When Mira identifies a rebalancing opportunity, it emits a structured `proposal` event that renders as an inline `ProposalCard` with Approve and Dismiss buttons. Approving from chat triggers the same execute flow as the dashboard quote modal.

**Policy versioning**
Every policy save increments a version counter and retains the full history. Users can review a diff of what changed between versions from the policy manager page.

---

## Development Phases

The project ships in six independent phases. Each phase is deployable on its own and builds directly on the previous one. All frontend work is consolidated into Phase 4 so the agent core, API, and integrations are hardened before any UI is built on top of them.

| Phase | Name | Outcome |
|---|---|---|
| 0 | Foundation | Monorepo wired, shared types, CI green, local dev in one command |
| 1 | Backend Core | Live API with pool scanner, policy engine, and x402 gate |
| 2 | AI and Chat Backend | Chat API, cross-session memory, Mira evaluation on quotes |
| 3 | Telegram Bot and Notifications | Bot commands, webhook callbacks, scanner-triggered notifications |
| 4 | Frontend and UI | Web dashboard, chat panel, Telegram Mini App WebView |
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

Production cluster in the same region as Render. Network access is restricted to Render's static outbound IPs. Indexes on `walletAddress` (all collections), `sessionId` (`chat_messages`), and `deletedAt` (`chat_sessions`) are created on API startup.

### Domains

| Domain | Target |
|---|---|
| `tonyx.app` | Vercel (frontend) |
| `api.tonyx.app` | Render (backend) |

TLS is managed by both platforms.

---

## API Reference

Swagger UI is available at `http://localhost:4000/api/docs` in development and at `https://api.tonyx.app/api/docs` in production. Every endpoint is documented with JSDoc including request and response examples.

### Endpoint summary

| Method | Path | Description |
|---|---|---|
| POST | `/api/wallet/connect` | Authenticate wallet, receive JWT |
| GET | `/api/balance/:address` | Wallet balance and LP positions |
| GET | `/api/pools` | Ranked pool list from Omniston |
| POST | `/api/policy` | Create or update policy (wallet signature required) |
| GET | `/api/policy/:address` | Active policy and version history |
| POST | `/api/agent/quote` | Get Mira-evaluated rebalancing proposal |
| POST | `/api/agent/execute` | Execute approved rebalance (x402 gated) |
| GET | `/api/agent/runs/:address` | Paginated run history |
| GET | `/api/agent/runs/:id/status` | Status of a single run |
| PUT | `/api/notifications/:address` | Update notification preferences |
| POST | `/api/chat/sessions` | Create a new chat session |
| GET | `/api/chat/sessions/:address` | List all sessions for a wallet |
| GET | `/api/chat/sessions/:sessionId/messages` | Paginated message history |
| POST | `/api/chat/sessions/:sessionId/messages` | Send message, stream Mira reply (x402 gated) |
| DELETE | `/api/chat/sessions/:sessionId` | Soft-delete a session |
| POST | `/api/telegram/webhook` | Telegram Bot API webhook (HMAC verified) |

---

## License

MIT
