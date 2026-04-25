# 🤖 Enterprise AI Agent Instructions for MusicBot

**Governance Framework for Claude, Copilot, and AI-Assisted Development**

---

## 🎵 Project Overview

**MusicBot** is an **AI-Driven Discord Plex Bot** — a modular, containerized Discord music bot that integrates natively with Plex Media Server and Lidarr. It supports optional AI-driven command parsing (via Ollama or Gemini), high-fidelity audio pipelines for both Discord voice channels and local Chromecast devices, and a secure OAuth-based authentication flow for Plex.

### Core Architecture
- **Language:** TypeScript (compiled with `tsc`, dev via `tsx`)
- **Runtime:** Node.js 18+
- **Discord:** discord.js v14 + @discordjs/voice
- **Audio Targets:** Discord voice channels, Chromecast (castv2-client)
- **Media Backend:** Plex Media Server, Lidarr
- **HTTP Framework:** Fastify
- **Database:** better-sqlite3 (SQLite)
- **AI Integration:** Ollama / Gemini (optional)
- **Logging:** Pino + pino-pretty
- **Containerisation:** Docker Compose

---

## Core Non-Negotiable Rules

AI agents working in the MusicBot repository MUST follow these ten absolute rules:

### Rule 1: NEVER Push to `main`
- Human developers only merge to `main`
- All AI work goes to feature branches: `type/issue-number`
- Example: `feature/queue-management`, `fix/plex-auth-bug`

### Rule 2: NEVER Close GitHub Issues Autonomously
- Issues stay open for human decision-makers
- AI can update issue comments with status, but closing requires explicit human approval
- If resolution is uncertain, post comment and wait

### Rule 3: NEVER Auto-Merge Pull Requests
- All merges require human review and approval
- AI can create PRs and suggest merges, never execute them
- Document merge readiness clearly for human reviewers

### Rule 4: NEVER Skip Tests
- All test suites must pass before pushing
- Run `npm test` locally before each push
- Document test results in `.github/TODO.md`

### Rule 5: NEVER Bypass Conflict Checks
- Always verify merge conflicts: `git merge --no-commit --no-ff origin/main`
- If conflicts exist, document in `PLANNING.md` and escalate to humans
- No force-pushes, no conflict circumvention

### Rule 6: ALWAYS Update TODO.md + PLANNING.md
- Update tracking documents **immediately** after every phase
- Format: timestamp, completed tasks, blockers, next steps
- Do NOT batch updates—update in real-time as work progresses

### Rule 7: ALWAYS Use Feature Branches
- Create descriptive branch names: `type/issue-number` or `type/description`
- Branch off `main`, not from other feature branches
- Use `git checkout -b` for clarity

### Rule 8: ALWAYS Log Decisions with Timestamps
- Every architectural choice, refactoring, or tech decision logged with timestamp
- Format: `[HH:MM:SS] decision: <what and why>`
- Store in `.github/PLANNING.md`

### Rule 9: ALWAYS Follow Conventional Commits
- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `security`, `perf`
- Example: `feat(player): add shuffle mode support`

### Rule 10: Governance Files are Production Code
- `.github/copilot-instructions.md` protected—treat with production-level rigor
- Changes to governance files require full workflow compliance
- No shortcuts, no exceptions for rule modifications

---

## Four-Phase Workflow

All AI-assisted work follows this strict sequence:

### Phase 0: Orientation (5 minutes)
- [ ] Read `.github/REPO_CONFIG.md` for project context
- [ ] Check `.github/TODO.md` for active tasks
- [ ] Review `.github/PLANNING.md` for decisions
- [ ] Understand current codebase structure

**Output:** Understanding of context and current state

### Phase 1: Planning (10 minutes)
- [ ] Break task into subtasks in TODO.md
- [ ] Document approach in PLANNING.md with timestamp
- [ ] Create feature branch: `git checkout -b type/issue-number`
- [ ] Create initial commit: `git add . && git commit -m "chore: phase 1 planning for issue #X"`
- [ ] Push branch: `git push -u origin type/issue-number`

**Output:** Feature branch ready, planning documented

### Phase 2: Implementation (varies)
- [ ] Code changes with clear commit messages
- [ ] Test after every logical change
- [ ] Update TODO.md after each subtask completed
- [ ] Push frequently: `git push origin type/issue-number`
- [ ] Verify no merge conflicts: `git merge --no-commit --no-ff origin/main` (after push)

**Output:** Code complete, all tests passing

### Phase 3: Verification (10 minutes)
- [ ] Run full test suite: `npm test`
- [ ] Run linting: `npm run lint`
- [ ] TypeScript compilation: `npm run build`
- [ ] Run security audit: `npm audit`
- [ ] Document results in TODO.md and TEST_COMPLETION_PROTOCOL.md

**Output:** All checks passing, results documented

### Phase 4: Delivery (5 minutes)
- [ ] Final push of any changes: `git push origin type/issue-number`
- [ ] Create pull request with template
- [ ] Add completion comment: "All phases complete, ready for human review"
- [ ] **STOP** — Do not merge, do not close issues
- [ ] Wait for human approval

**Output:** PR created, awaiting human review

---

## Conflict Detection Protocol

After every push:

```bash
git merge --no-commit --no-ff origin/main
# If conflicts exist:
#   1. Document in PLANNING.md with timestamp
#   2. Post comment on related GitHub issue
#   3. STOP and escalate to human developer
# If no conflicts:
#   4. git merge --abort
#   5. Continue with next push
```

**Golden Rule:** Never commit merge conflict markers. Always resolve with human approval.

---

## Escalation Criteria

Stop and escalate to humans for:

- **Architectural decisions** (new frameworks, major refactors)
- **Security vulnerabilities** (auth, data exposure, injection risks)
- **Breaking changes** (API modifications, dependency version bumps)
- **Merge conflicts** (document in PLANNING.md, wait for resolution)
- **Test failures** (document cause in TODO.md, determine root issue)
- **Dependency version conflicts** (complex transitive dependencies)
- **Third-party service integration** (API keys, authentication)

**Escalation Format:**
```
[HH:MM:SS] ESCALATION: <what> — <why> — <next steps>
```

Store in `.github/PLANNING.md` and post GitHub issue comment.

---

## TypeScript & Code Conventions

### TypeScript Standards
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

### Testing
- Unit tests for core logic (command parsing, Plex integration, queue management)
- Integration tests for Discord event handling
- Target ≥80% coverage on critical modules
- Never commit failing tests to `main`

---

## Project Structure

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
├── .github/
│   ├── copilot-instructions.md     # This file — governance rules
│   ├── REPO_CONFIG.md              # Project configuration
│   ├── TODO.md                     # Task tracking
│   ├── PLANNING.md                 # Decision log
│   ├── PR_MERGE_RULES.md          # Merge protocol
│   ├── TEST_COMPLETION_PROTOCOL.md # Test execution logs
│   ├── pull_request_template.md    # PR template
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       ├── feature_request.md
│       └── config.yml
├── docker-compose.yml              # bot, web, ollama services
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── LICENSE
```

---

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

---

## Protected Governance Files

The following files receive special protection. Any edits must follow the complete workflow:

- `.github/copilot-instructions.md` (this file)
- `.github/REPO_CONFIG.md`
- `.github/TODO.md`
- `.github/PLANNING.md`
- `.github/PR_MERGE_RULES.md`
- `package.json` (dependency management)

**Modification Protocol:**
1. Feature branch with clear naming
2. Full test suite passes
3. PR with detailed justification
4. Explicit human approval before merge
5. All changes logged with timestamps

---

## Final Authority

This document is the governance framework for all AI-assisted work in MusicBot. Human developers are the final authority on:

- Rule exceptions (none, except by unanimous team agreement)
- Escalation decisions
- Merge approvals
- Task prioritization
- Production deployment

**Questions or conflicts?** Escalate to project lead with full context.

---

**Last Updated:** [Date]
**Version:** 1.0
**Applies To:** Claude, GitHub Copilot, GPT models, and all AI-assisted development
