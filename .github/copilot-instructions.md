# MusicBot — Copilot Instructions

## Project Overview
MusicBot is an **AI-Driven Discord Plex Bot** — a modular, containerized Discord music bot that integrates natively with Plex Media Server and Lidarr. It supports optional AI-driven command parsing (via Ollama or Gemini), high-fidelity audio pipelines for both Discord voice channels and local Chromecast devices, and a secure OAuth-based authentication flow for Plex.

## Core Architecture
- **Language:** TypeScript (compiled with `tsc`, dev via `tsx`)
- **Runtime:** Node.js
- **Discord:** discord.js v14 + @discordjs/voice
- **Audio Targets:** Discord voice channels, Chromecast (castv2-client)
- **Media Backend:** Plex Media Server, Lidarr
- **HTTP Framework:** Fastify
- **Database:** better-sqlite3 (SQLite)
- **AI Integration:** Ollama / Gemini (optional)
- **Logging:** Pino + pino-pretty
- **Containerisation:** Docker Compose

## Coding Conventions

### TypeScript
- **Strict mode** — `tsconfig.json` enforces strict checking
- Use **ES modules** (`import`/`export`), never CommonJS
- Prefer `async`/`await` over raw Promises & callbacks
- Use explicit types; avoid `any` unless absolutely necessary
- Name files in `kebab-case.ts`, classes in `PascalCase`, variables/functions in `camelCase`
- Keep functions under ~50 lines; extract helpers when complexity grows

### Error Handling
- All async paths must have proper try-catch or `.catch()` handling
- Never swallow errors silently — at minimum log with Pino
- Use typed error classes where possible
- In Fastify routes, always return appropriate HTTP status codes

### Security
- **Never** hardcode secrets — use `.env` and `dotenv`
- Validate & sanitize all external input (Discord commands, Plex API responses)
- Parameterised queries via better-sqlite3 prepared statements
- OAuth tokens stored securely; never logged or exposed in errors
- Docker containers must not expose host filesystem unnecessarily

### Database (better-sqlite3)
- All queries use prepared statements — no string interpolation
- Schema changes go through migration files
- Keep database operations synchronous (better-sqlite3 is synchronous by design)

### Docker & Deployment
- All services are defined in `docker-compose.yml`
- Application builds via `Dockerfile`
- Environment variables documented in `.env.example`
- Container should run as non-root user

### Testing (when test framework added)
- Unit tests for core logic (command parsing, Plex integration, queue management)
- Integration tests for Discord event handling
- Target ≥80% coverage on critical modules
- Never commit failing tests to `main`

## Git Workflow
- **Branches:** `main` (production) ← `test` (pre-prod) ← `feat/*`, `fix/*`
- **Commit messages:** follow Conventional Commits — `feat(scope):`, `fix(scope):`, `docs:`, `chore:`
- **PRs:** must pass all CI checks before merge
- **Reviews:** at least 1 approval required for `main` and `test`

## Project Structure (current)
```
MusicBot/
├── src/
│   ├── index.ts                    # Entry point — boots Discord client, Lidarr client, web portal
│   ├── commands/
│   │   ├── command-handler.ts      # Slash command registration & interaction routing
│   │   └── search.ts               # /search artist, /search album commands
│   ├── integrations/
│   │   └── lidarr-client.ts        # Lidarr API client (artist/album lookup)
│   ├── types/
│   │   └── lidarr.ts               # TypeScript interfaces for Lidarr API
│   └── web/
│       └── server.ts               # Fastify web portal (Plex OAuth, API)
├── docs/                           # Documentation & wiki
├── .github/                        # CI/CD, agents, copilot rules (see below)
├── docker-compose.yml              # bot, web, ollama services
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── install.sh                      # One-line remote installer
├── upgrade.sh                      # One-line remote updater
└── uninstall.sh                    # One-line remote uninstaller
```

## Key Dependencies
| Package | Purpose |
|---------|---------|
| discord.js | Discord bot framework (v14) |
| @discordjs/voice | Voice channel audio playback |
| axios | HTTP client (Plex/Lidarr API calls) |
| better-sqlite3 | Embedded SQLite database |
| castv2-client | Chromecast audio streaming |
| fastify | HTTP server for OAuth callbacks and API |
| pino / pino-pretty | Structured logging |
| dotenv | Environment variable management |
| typescript | TypeScript compiler (devDep) |
| tsx | TypeScript dev runner (devDep) |

## Environment Variables

All env vars are documented in `.env.example`. The bot reads them via `dotenv` at startup.

| Variable | Required | Default | Purpose |
|----------|----------|---------|--------|
| `DISCORD_TOKEN` | ✅ Yes | — | Discord bot token from Developer Portal |
| `PLEX_CLIENT_IDENTIFIER` | ✅ Yes | `musicbot-default-id` | Unique client ID for Plex OAuth |
| `PORT` | No | `3000` | Web portal / Fastify listen port |
| `LIDARR_URL` | For search | — | Lidarr base URL (e.g. `http://localhost:8686`) |
| `LIDARR_API_KEY` | For search | — | Lidarr API key (Settings → General in Lidarr) |
| `PLEX_TOKEN` | After auth | — | Auto-populated after Plex OAuth flow |
| `PLEX_SERVER_URL` | After auth | — | Auto-populated after Plex OAuth flow |

## Discord Slash Commands

| Command | Description |
|---------|-------------|
| `/search artist <name>` | Search Lidarr for artists/bands — returns top 5 with genres, status, artwork |
| `/search album <name>` | Search Lidarr for albums — returns top 5 with artist, year, type, artwork |

Commands are registered globally on bot startup via `registerCommands()` in `command-handler.ts`.
If Lidarr is not configured, commands reply with a helpful ephemeral message.

## Docker Services

| Service | Container | Profile | Purpose |
|---------|-----------|---------|--------|
| `bot` | `musicbot-core` | default | Discord bot + command handling |
| `web` | `musicbot-web` | default | Fastify web portal (Plex OAuth, API) |
| `ollama` | `musicbot-ollama` | `ai-enabled` | Optional local LLM for natural language parsing |

Start core: `docker compose up -d`
Start with AI: `docker compose --profile ai-enabled up -d`

## AI Agent Rules

All AI agent definitions, workflows, and project-level configuration live inside the `.github/` directory:

```
.github/
├── copilot-instructions.md          # This file — project rules & conventions
├── BRANCH_PROTECTION_SETUP.md       # Branch protection guide
├── WORKFLOWS.md                     # CI/CD workflow documentation
├── pull_request_template.md         # PR template
├── agents/
│   ├── code-review.agent.md         # Static analysis & PR reviews
│   ├── debug.agent.md               # Runtime debugging & test failures
│   └── program.agent.md             # Feature implementation & coding
└── workflows/
    ├── build.yml                    # TypeScript compile + Docker build
    ├── lint.yml                     # ESLint + Prettier checks
    ├── test.yml                     # Unit & integration tests
    ├── merge-test-to-main.yml       # Auto-merge on approval
    └── sync-branch-references.yml   # Sync branch refs in docs
```

### Implementation Workflow
When implementing features or fixing bugs:
1. **Understand** existing code by reading related files first
2. **Plan** the change, outlining affected files and dependencies
3. **Code** with inline comments, strict TypeScript, and security hardening
4. **Test** before finalizing — write tests for new logic
5. **Validate** against project conventions
6. **Commit** with clear Conventional Commit messages

### Issue & Task Prioritisation

When processing issues, tasks, or a backlog — **always work in priority order, highest first.** This is critical because AI context windows and token budgets can be exhausted mid-session. If tokens run out, the most impactful work must already be done.

**Priority processing rules:**
1. **Critical / Blocking** — security vulnerabilities, crashes, data loss, broken builds. Do these **immediately**.
2. **High / Obvious wins** — clear bugs with known fixes, failing tests with obvious root causes, small changes with large impact. Do these **next**.
3. **Medium / Feature work** — new features, enhancements, refactors that require design thought. Do these **after** all critical and high items are resolved.
4. **Low / Nice-to-have** — documentation tweaks, style nits, speculative improvements. Do these **last**, only if token budget remains.

**Within each priority level:**
- Prefer items with **clear, actionable descriptions** over vague ones
- Prefer items that **unblock other work** (dependencies, shared code)
- Prefer **smaller, self-contained changes** that can be completed and committed in one pass
- If an issue is ambiguous, add a clarifying comment and move to the next clear item

**If tokens are running low:**
- Finish and commit the current in-progress item
- Write a summary of remaining work as a comment or in `task.md`
- Do **not** start a new large task that cannot be completed

**Issue lifecycle:**
- **Never close an issue.** Only the project owner closes issues. AI agents may comment on issues, add fix details, and reference commits — but must leave the issue open.
- When a fix is committed, note the commit hash and what was changed in a comment on the issue. Do **not** use `fixes #N` or `closes #N` in commit messages.

### Session Startup — Issue Queue Review

**At the start of every conversation**, the AI agent must:
1. Check the open issues on `Crashcart/MusicBot` (via the GitHub issues page)
2. Triage them using the priority rules above (Critical → High → Medium → Low)
3. Present a brief summary of open issues and their assessed priority to the user
4. Ask the user if they want to work on any of them, or if they have a different task

This ensures the issue backlog is never forgotten and critical items are surfaced immediately.
