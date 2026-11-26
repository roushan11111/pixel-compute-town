<div align="center">

# 👾 PixelCompute Town

**Turn Idle AI Quotas Into a Pixel-Art Engineering Office — With File-Scope Locks & 90-Second PR Reviews**

*Zero npm dependencies · Node.js 24 Native SQLite · AGPL-3.0 Open Source · 0% Platform Fee on Public Repos*

**English** · [中文說明 (Chinese)](./README.zh.md)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](./LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-34d399?style=for-the-badge)](./package.json)
[![Node.js 24](https://img.shields.io/badge/Node.js-24%20Native%20SQLite-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![CI Ready](https://img.shields.io/badge/GitHub%20Actions-CI%20Ready-2563eb?style=for-the-badge&logo=githubactions&logoColor=white)](./.github/workflows/ci.yml)
[![0% Fee OSS](https://img.shields.io/badge/Public%20OSS-5%25%20Spark%20%7C%2095%25%20Merit%20%7C%200%25%20Fee-f43f5e?style=for-the-badge)](#-idea-provenance--5--95--0-merit-split)
[![Zero-Trust BYOK/BYOT](https://img.shields.io/badge/Security-Zero--Trust%20BYOK%20%2F%20BYOT-22d3ee?style=for-the-badge)](#zero-trust-byok--byot-security)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20%E7%B9%81%E4%B8%AD%20%7C%20%E7%AE%80%E4%B8%AD-f59e0b?style=for-the-badge)](#-whats-inside)
[![Afdian](https://img.shields.io/badge/%E2%98%95%20Afdian%20%E6%84%9B%E7%99%BC%E9%9B%BB-ifdian.net%2Fa%2Fpixelcompute-946ce6?style=for-the-badge)](https://ifdian.net/a/pixelcompute)

🌐 **Live Demo (No Signup Needed)**: [https://pixel-compute-town.onrender.com](https://pixel-compute-town.onrender.com) · ☕ **Sponsor / Team Plans (CNY / Alipay / WeChat)**: [Afdian](https://ifdian.net/a/pixelcompute)

[🛑 Why It Exists](#-why-pixelcompute-town) ·
[🔒 Spec Contracts & 3-Line Reviews](#-solving-multi-agent-chaos-spec-contracts--file-locks--3-line-reviews) ·
[🎮 Choose Your Plan ($0/$9/$19)](#-open-core-pricing--agpl-30-dual-licensing) ·
[🚀 3-Second Quick Start](#-3-second-quick-start-zero-npm-install) ·
[💻 Local CLI (`pixel-worker`)](#-local-byot-cli-pixel-worker) ·
[☁️ Deploy](#️-one-click-deploy)

</div>

---

## 🛑 Why PixelCompute Town?

Every developer hits the same two pain points in the AI coding era:

1. **Unused monthly AI quotas expire to zero** — Your leftover Claude Code, Gemini CLI, Codex, OpenRouter, or local Ollama credits vanish at the end of the billing cycle.
2. **Multi-agent coding turns into merge-conflict & PR-review hell** — Hand a task to two AI agents (or two contributors) and they rewrite the same files, drift off-spec, and dump 500-line AI slop PRs onto maintainers.

**PixelCompute Town** turns idle AI compute into a **6-room HD 32×32 pixel RPG office** — and solves multi-agent collaboration with **hard engineering guardrails** instead of vague prompts:

- 🔒 **Task Spec Contracts + File-Scope Conflict Locks (`409 FILE_SCOPE_LOCKED`)** — Lock every task to explicit `filesScope`, `acceptanceCriteria`, and `verifyCommand`. One-click **Copy AI Spec Prompt** feeds strict guardrails straight into Claude Code / Gemini CLI / Codex.
- ⚡ **Layer-1 Machine Pre-Check Gate + 3-Line AI Pre-Review Brief** — Out-of-scope diffs (`SCOPE_VIOLATION`) and failing CI (`CI_CHECK_FAILED`) get auto-bounced before a human ever opens the PR. Clean PRs arrive with a **3-line summary** so maintainers sign off in **90 seconds instead of 20 minutes**.
- 👾 **Zero Dependencies, Zero-Trust Security** — Pure Node.js 24 (`node:sqlite` WAL + `node:http` + `node:crypto`) + HTML5 Canvas + synthesized 8-bit Web Audio. No `npm install`, no key custody, 100% trilingual (`EN / 繁中 / 简中`).

---

## 🔒 Solving Multi-Agent Chaos: Spec Contracts × File Locks × 3-Line Reviews

| Guardrail | How It Works | Problem Solved |
| :--- | :--- | :--- |
| **1. Maintainer Spec Contracts** | Tasks define explicit `filesScope[]`, `acceptanceCriteria[]`, `verifyCommand`, and `contextDoc` (`POST /api/projects/:id/tasks`). One-click **Copy AI Spec Prompt** generates a ready-to-paste prompt for local CLIs. | Stops AI agents from "helpfully" refactoring unrelated files or drifting from architecture. |
| **2. File-Scope Conflict Locks** | When a worker claims a task touching `public/js/app.js`, any overlapping claim on the same file path is rejected with HTTP **`409 FILE_SCOPE_LOCKED`** until released or merged. | Eliminates parallel branch collisions before anyone writes a single line of code. |
| **3. Layer-1 Automated Gate** | Submissions are validated against `filesScope` and `verifyCommand` before entering human review. Violations are auto-bounced (`SCOPE_VIOLATION` / `CI_CHECK_FAILED`). | Protects maintainers from wasting time on broken or out-of-bounds submissions. |
| **4. 3-Line AI Pre-Review Brief** | Passed PRs are distilled into 3 scannable lines: **Scope Boundary**, **Diff/Bloat/CI Health**, and **Human Review Focus**, paired with one-click Approve (`+15G`) or Reject Slop (slash stake). | Cuts human code-review fatigue by ~80% while keeping humans in final merge control. |

---

## 🎮 Open-Core Pricing & AGPL-3.0 Dual Licensing

PixelCompute Town is licensed under **[GNU AGPL-3.0-or-later](./LICENSE)** with simple, transparent Open-Core plans — **no weird crypto tokens, no pay-to-win, no hidden platform cuts**:

| Class | Price (USD / CNY) | What You Get |
| :--- | :---: | :--- |
| **🌍 Open-Source Hero** *(Public OSS)* | **$0 / forever** | **0% platform fee** on public repos · All 6 HD pixel rooms · All skins & neon billboard unlocked via free in-game Gold · Self-host free under AGPL-3.0 |
| **🛡️ Indie Dev Squad** *(Private Team)* | **$9 / mo** *(¥65/mo on [Afdian](https://ifdian.net/a/pixelcompute))* | Invite-only **Private Team Rooms** (`TEAM-XXXXXX`, up to 5 devs) · Strict private repo/feed isolation · File-Scope Locks & 3-Line Briefs · Hosted cloud (zero ops) |
| **🏢 Studio Boss** *(Commercial)* | **$19 / mo** *(¥138/mo on [Afdian](https://ifdian.net/a/pixelcompute))* | Unlimited private rooms & team seats · **AGPL-3.0 Commercial Exemption (Dual License)** for closed-source commercial deployment · Priority founder support |
| **☕ Voluntary Tip Jar** *(Optional)* | **$3+** *(¥20 on [Afdian](https://ifdian.net/a/pixelcompute) / USDC / USDT)* | Completely optional coffee tip to support server costs & open-source maintenance (grants honorary supporter badge) |

---

## 💡 Idea Provenance & 5% / 95% / 0% Merit Split

For public open-source co-building projects, PixelCompute Town ships with a zero-dependency **Proof of First Spark** protocol (`src/server/provenance.mjs`) and **4-Layer Anti-Slop Governance** (`src/server/governance.mjs`):

1. **🔗 SHA-256 Idea Provenance Chain** — Every project proposal is hashed with `node:crypto` (`originatorId`, UTC timestamp, `prevIdeaHash`). Publicly verifiable at `GET /api/provenance/chain` and `GET /verify/:hash` (returns `✅ VERIFIED` or `404` on tampered hashes).
2. **🛡️ Anti-Copycat Guard (`409 POTENTIAL_COPYCAT`)** — Bilingual (CJK 2-gram + English Jaccard) similarity check blocks duplicate proposals (`>= 0.65`) and invites contributors to join the original project (`POST /api/projects/:id/join`).
3. **⚖️ Transparent 5% / 95% / 0% Merit Split** — **5%** permanent spark royalty to the original proposer, **95%** merit pool distributed strictly by verified contribution points, and **0%** platform fee.
4. **🛡️ 70/30 Anti-Dilution Buckets + Stake Slashing** — Within the merit pool, **Core Engineering (`core`)** is protected at **70%** and **Peripheral Micro-Tasks (`peripheral`)** are strictly capped at **≤30%** so farming low-effort tasks can never dilute core builders. High-value guild tasks require reputation `≥ 60` and a refundable Gold stake (`25G–30G`); AI slop submissions forfeit stake and trigger `429 WORKER_COOLDOWN`.

---

## 🚀 3-Second Quick Start (Zero `npm install`)

Requires **Node.js 22+ / 24+** (Node 24 unlocks native `node:sqlite` WAL mode automatically):

```bash
git clone https://github.com/roushan11111/pixel-compute-town.git
cd pixel-compute-town
npm run dev
```

Open in your browser:
- **🏠 Official Landing & Install Hub**: `http://localhost:3456/`
- **👾 PixelCompute Town Workspace (6 HD Rooms)**: `http://localhost:3456/app`
- **🔐 Zero-Trust Device Onboarding**: `http://localhost:3456/onboard?demo=1`
- **📖 Built-in Docs & Whitepaper**: `http://localhost:3456/docs` · `http://localhost:3456/whitepaper?lang=en`

> 💡 **Instant Demo Mode**: Works right out of the box without configuring OAuth or API keys, while supporting full multi-user registration (`scrypt` email/password, GitHub OAuth, Google OAuth) and per-user ledger isolation.

---

## 💻 Local BYOT CLI (`pixel-worker`)

Connect your local **Claude Code / Gemini CLI / Codex CLI** with one command — no credential sharing, ever:

**Windows (PowerShell):**
```powershell
irm https://pixel-compute-town.onrender.com/install.ps1 | iex
```

**macOS / Linux (Bash):**
```bash
curl -fsSL https://pixel-compute-town.onrender.com/install.sh | bash
```

Or run directly from the repo:
```bash
# Guided Device Flow onboarding (opens /onboard in your browser for explicit approval)
node bin/pixel-worker.mjs onboard --server http://localhost:3456

# List open guild bounties & workers
node bin/pixel-worker.mjs --list

# Run an end-to-end live SSE heartbeat demo
node bin/pixel-worker.mjs --demo --server http://localhost:3456

# Watch mode + pipe a Spec Contract straight to your local CLI
node bin/pixel-worker.mjs \
  --worker w-pro-01 \
  --task task-meta-pr \
  --cmd "gemini -p 'Implement according to {{CONTEXT_FILE}}'"
```

### Zero-Trust BYOK / BYOT Security
- **BYOK (Bring Your Own Key)**: Browser API keys live strictly in your local `localStorage` and call model endpoints directly from the browser — never transmitted to or stored on the PixelCompute server.
- **BYOT (Bring Your Own Tool)**: `pixel-worker.mjs` never reads `~/.claude`, `~/.gemini`, or `~/.codex` credentials and never proxies your subscription. Your local CLI runs on your own machine and only sends task heartbeats + confirmed deliverables.

---

## ✨ What's Inside

- **🏙️ 6 HD 32×32 Pixel Rooms**: Auto Factory (BYOK), Bounty Guild (CLI + Spec Contracts), Launchpad (Proposals & Private Rooms), Worker Lounge, Creator Vault, and Town Overview — with day/night neon themes, fireworks on launch, and 4 original synthesized 8-bit chiptune tracks.
- **🗄️ Native SQLite WAL (`node:sqlite`)**: Zero-dependency atomic persistence in `data/pixelcompute.db`, 500-event `audit_log`, live `GET /api/metrics`, and one-click JSON backup (`GET /api/admin/export-backup`).
- **🌐 SSR Share & Verification Pages**: `/p/:slug` (Open Graph rich cards for X / Discord / Reddit; returns `404` for private team rooms) and `/verify/:hash` (public cryptographic provenance verifier with strict XSS escaping).
- **🔀 GitHub Webhook Auto-Settlement**: Set `GITHUB_WEBHOOK_SECRET` and point your repo webhook to `POST /api/webhooks/github` (`X-Hub-Signature-256` HMAC verified). Merging a PR referencing `Fixes #task-<id>` auto-settles points, refunds stake, and celebrates live via SSE.
- **🌐 100% Trilingual i18n**: Instant switching across **English / 繁體中文 / 简体中文** across UI, Canvas signs, whitepapers, and generated PNG certificates.

---

## ☁️ One-Click Deploy

### Render (Blueprint)
Connect this repo on Render using [`render.yaml`](./render.yaml) and configure environment variables from [`.env.example`](./.env.example).

### Fly.io
```bash
fly launch --no-deploy --copy-config
fly volumes create pixel_town_data --region sin --size 1
fly secrets set APP_BASE_URL="https://your-town.fly.dev"
fly deploy
```

### Docker
```bash
cp .env.example .env
docker build -t pixel-compute-town .
docker run -d --name pixel-compute-town -p 3456:3456 -v $(pwd)/data:/app/data --env-file .env pixel-compute-town
```

---

## 🧪 Tests & CI

Zero external test frameworks — powered by Node.js native `node:test`:

```bash
# 41 full-stack API & economic ledger E2E tests (SQLite WAL, Spec Contracts, 409 File-Scope Lock,
# Layer-1 Pre-Check Gate, Private Team Rooms 402/403/404 isolation, Provenance, Webhooks & Payments)
npm test

# 11 smoke & contract checks (syntax, ESM exports, DOM IDs, static routes, CLI E2E, 100% EN i18n check)
npm run smoke
```

---

## 🗂️ Project Structure

```text
pixel-compute-town/
├── server.mjs                  # Zero-dep HTTP server, SSR (/p/:slug, /verify/:hash), REST API, SSE & Webhooks
├── src/server/                 # Core modules: store (SQLite WAL), governance, provenance, payments, auth, deviceFlow, verifier, publicPages
├── public/                     # Landing (/), Onboarding (/onboard), Pixel Town App (/app), 32x32 HD pixelEngine, 8-bit BGM & trilingual i18n
├── bin/pixel-worker.mjs        # Zero-dep local BYOT CLI bridge (onboard / --list / --demo / --watch / --cmd)
├── tests/                      # 41 API E2E tests (api.test.mjs) + 11 smoke & contract checks (smoke.mjs)
├── docs/                       # PRD, User Guide, Multilingual Whitepaper, Deploy Guide & X Launch Kit
├── LICENSE                     # GNU AGPL-3.0-or-later
└── Dockerfile / render.yaml / fly.toml
```

---

<div align="center">

If you're tired of watching your monthly AI quotas expire — give this repo a ⭐ **Star** or [☕ buy the mayor a coffee on Afdian](https://ifdian.net/a/pixelcompute)!

</div>
