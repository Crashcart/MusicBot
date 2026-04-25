# MusicBot Repository Configuration

**Project Metadata, High-Risk Files, and Development Standards**

---

## 📋 Project Overview

**Project:** MusicBot
**Type:** Discord Music Bot
**Language:** JavaScript/Node.js
**Runtime:** Node.js 18+
**Package Manager:** npm

**Purpose:** A feature-rich music bot for Discord with queue management, streaming, and playback control.

---

## 🏗️ Core Architecture

### Backend
- `server.js` — Main bot entry point
- `src/commands/` — Command implementations
- `src/events/` — Discord event handlers
- `src/utils/` — Utility functions
- `config.json` — Configuration file

### Frontend (if applicable)
- `public/` — Web dashboard files
- `public/app.js` — Client-side logic

### Critical Files
1. **Entry Points** (frequent edits expected):
   - `server.js`
   - `package.json`
   - `config.json`

2. **Governance Files** (careful edits required):
   - `.github/copilot-instructions.md`
   - `.github/REPO_CONFIG.md`
   - `.github/TODO.md`
   - `.github/PLANNING.md`

3. **High-Risk Files** (concurrent edit conflicts):
   - `src/commands/` (multiple contributors)
   - `.github/workflows/` (CI/CD definitions)
   - `package.json` (dependency management)

---

## 🔧 Development Standards

### Code Quality
- **Linter:** ESLint (if configured)
- **Formatter:** Prettier (if configured)
- **Test Framework:** Jest or Mocha (if configured)
- **Git Hooks:** Pre-commit hooks enforce linting

**Run Before Commit:**
```bash
npm run lint          # Check linting
npm run format        # Auto-format code
npm test              # Run tests
npm audit             # Check dependencies
```

### Commit Conventions
Format: `type(scope): description`

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code reorganization
- `docs` — Documentation
- `test` — Test additions/updates
- `chore` — Build, CI, tooling
- `security` — Security fixes
- `perf` — Performance improvements

**Examples:**
- `feat(player): add shuffle mode`
- `fix(queue): resolve duplicate tracks — Closes #23`
- `security: update vulnerable dependency`

### Branch Strategy

**Naming Convention:** `type/issue-number` or `type/description`

**Types:**
- `feature/` — New features
- `fix/` — Bug fixes
- `refactor/` — Code improvements
- `security/` — Security fixes
- `docs/` — Documentation

**Examples:**
- `feature/queue-management`
- `fix/volume-bug-156`
- `security/auth-vulnerabilities`

### Test Requirements

All pushes must have passing tests:
```bash
npm test              # All tests pass
npm audit             # No high/critical vulnerabilities
npm run lint          # ESLint passes (if configured)
```

**Test Results Location:** `.github/TODO.md`

---

## 📁 Directory Structure

```
MusicBot/
├── .github/
│   ├── workflows/
│   │   ├── test.yml
│   │   ├── lint.yml
│   │   └── build.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   ├── copilot-instructions.md      (Rule 10 protection)
│   ├── REPO_CONFIG.md               (Rule 10 protection)
│   ├── TODO.md                      (Rule 10 protection)
│   ├── PLANNING.md                  (Rule 10 protection)
│   ├── PR_MERGE_RULES.md
│   └── pull_request_template.md
├── src/
│   ├── commands/
│   ├── events/
│   ├── utils/
│   └── index.js
├── public/                          (if web dashboard)
├── tests/                           (if tests exist)
├── server.js
├── package.json
├── config.json
├── .env.local                       (gitignored - secrets)
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🚨 High-Risk Areas

Files with frequent concurrent edits or critical impact:

| File | Risk Level | Impact | Mitigation |
|------|-----------|--------|-----------|
| `.github/copilot-instructions.md` | CRITICAL | Governance | Full workflow required for changes |
| `package.json` | HIGH | Dependencies | Check PLANNING.md before editing |
| `src/commands/` | HIGH | Multiple edits | Coordinate in TODO.md, use feature branches |
| `.github/workflows/` | CRITICAL | CI/CD | Changes require human review |
| `server.js` | HIGH | Core logic | Document approach in PLANNING.md |
| `config.json` | MEDIUM | Configuration | Keep secrets in `.env.local` |

**Before Editing These Files:**
1. Check `.github/PLANNING.md` for ongoing work
2. Document your approach with timestamp
3. Create feature branch with clear name
4. Run full test suite before pushing
5. Escalate if conflicts detected

---

## 🔐 Security Practices

### Secrets Management
- **Never commit** API keys, tokens, passwords
- **Store secrets in** `.env.local` (gitignored)
- **Reference in code** via `process.env.VARIABLE_NAME`
- **Document expected vars** in `.env.example`

### Dependency Management
- **Audit regularly:** `npm audit`
- **Update carefully:** Review changelogs for breaking changes
- **Version pinning:** Consider pinning critical dependencies
- **Transitive dependencies:** Watch for indirect vulnerabilities

### Vulnerability Reporting
- **High/Critical:** Post as GitHub issue immediately, escalate
- **Medium:** Schedule fix in next sprint, track in TODO.md
- **Low:** Log in issue tracker, address when convenient

---

## 📊 CI/CD Pipeline

The repository includes automated workflows for:

1. **Test Pipeline** (`workflows/test.yml`)
   - Run test suite
   - Check code coverage
   - Report results

2. **Lint Pipeline** (`workflows/lint.yml`)
   - ESLint validation
   - Code formatting check

3. **Build Pipeline** (`workflows/build.yml`)
   - Build project (if needed)
   - Verify no build errors

**All workflows must pass before merge.**

---

## 🎯 Default Model/Configuration

- **Default Config:** See `config.json`
- **Node.js Version:** 18+ (check `package.json`)
- **Discord.js Version:** Latest stable
- **Development Environment:** Node.js + npm

---

## 📝 Workflow

### Creating a New Feature
1. Create issue on GitHub
2. Create feature branch: `git checkout -b feature/issue-number`
3. Update `.github/TODO.md` with tasks
4. Code and commit with conventional format
5. Push and create PR
6. Wait for review and approval

### Fixing a Bug
1. Create issue if not exists
2. Create fix branch: `git checkout -b fix/issue-number`
3. Write test case (if applicable)
4. Fix and commit: `fix(scope): description`
5. Push and create PR
6. Wait for review

### Security Updates
1. Run `npm audit` to identify vulnerabilities
2. Create branch: `security/audit-fixes`
3. Update dependencies carefully
4. Test thoroughly
5. Document impact in PR
6. Escalate for approval if critical

---

## 🔄 Deployment

**Production Deployment:**
- Handled by project maintainers only
- Requires passing all CI/CD checks
- Requires human approval on PR
- Tag releases with semantic versioning

**Staging/Testing:**
- Automated after merge to `main`
- Automatic notifications on completion

---

## 👥 Team Guidelines

- **All members** follow same governance rules
- **AI agents** treated same as human contributors for governance
- **Rule violations** trigger escalation
- **Exceptions** require team consensus and documentation

---

## 📞 Escalation Contacts

- **Code Review Issues:** Post on PR or GitHub issue
- **Architectural Decisions:** Escalate in PLANNING.md, @ project lead
- **Security Vulnerabilities:** Create private security issue or @ security team
- **Merge Conflicts:** Document in PLANNING.md, wait for human resolution
- **Governance Questions:** Reference copilot-instructions.md, escalate if unclear

---

## 📚 Additional Resources

- **README.md** — User-facing documentation
- **CONTRIBUTING.md** — Contribution guidelines (if exists)
- **Security Policy** — SECURITY.md (if exists)
- **GitHub Issues** — Bug reports and feature requests
- **Discussions** — Community Q&A and proposals

---

**Last Updated:** [Date]
**Version:** 1.0
**Maintainers:** [List maintainers]
