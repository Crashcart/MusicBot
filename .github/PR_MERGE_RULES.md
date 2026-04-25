# PR Merge Rules & Test Completion Protocol

**Mandatory Standards for All Pull Request Merges**

---

## Core Principles

✅ **All PRs must complete mandatory verification phases**
✅ **No exceptions for any contributor**
✅ **Status must be documented in `.github/` directory**
✅ **Premature declarations reset the protocol**

---

## The Test Completion Protocol: 6-Phase Workflow

### Total Duration: ~195 seconds minimum

All pull requests follow this strict sequence before any merge is permitted.

---

### Phase 1: Repository Registration & Branch Verification
**Duration:** 30 seconds
**Trigger:** PR created

**Actions:**
1. Verify feature branch created from `main`
2. Confirm no direct `main` commits
3. Register PR in `.github/TODO.md`
4. Record timestamp: `[HH:MM:SS] Phase 1 started: PR #XYZ`

**Success Criteria:**
- ✅ Branch tracks `origin/main`
- ✅ Branch not `main` itself
- ✅ PR template filled (non-empty description)
- ✅ At least 3 commits present

**If Failed:** Return to "Needs Work" status

---

### Phase 2: Workflow Trigger & Initial Checks
**Duration:** 30 seconds
**Trigger:** Phase 1 complete

**Actions:**
1. Verify CI/CD pipelines triggered (check GitHub Actions)
2. Confirm no "Request changes" from reviewers
3. Document in `.github/TODO.md`: `Phase 2 started: workflows triggered`
4. Record timestamp

**Success Criteria:**
- ✅ All workflows visible in GitHub Actions
- ✅ No failing pre-flight checks
- ✅ PR not in draft status
- ✅ Branch protection rules satisfied

**If Failed:** Fix issues, re-push, restart from Phase 1

---

### Phase 3: Automated Test Execution
**Duration:** 60-90 seconds
**Trigger:** Phase 2 complete, workflows running

**Actions:**
1. Wait for all pipelines to complete:
   - Conflict Detection
   - Linting/Code Review
   - Unit Tests
   - Integration Tests
   - Security Audit
   - Docker Build (if applicable)

2. Document results in `.github/TODO.md`:
   ```
   ## Phase 3: Test Execution
   - [x] Conflict Detection — Zero conflicts
   - [x] Linting — ESLint PASSED
   - [x] Unit Tests — 100% PASSED
   - [x] Integration Tests — PASSED
   - [x] Security Audit — NO VULNERABILITIES
   - [x] Docker Build — SUCCESSFUL
   ```

3. Record completion timestamp

**Success Criteria:**
- ✅ ALL checks show green status
- ✅ No red X marks
- ✅ No skipped tests
- ✅ 0 conflicts detected
- ✅ Code coverage maintained/improved

**Status Expectations:**
| Check | Status | Requirement |
|-------|--------|------------|
| Conflict Detection | ✅ Zero conflicts | Must pass |
| Static Code Review | ✅ No blocking issues | Must pass |
| Unit Tests | ✅ 100% pass | Must pass |
| Integration Tests | ✅ All pass | Must pass |
| Linting | ✅ ESLint clean | Must pass |
| Security Audit | ✅ No high/critical | Must pass |

**If Failed:** 
- Document failure in `.github/TODO.md`
- Post comment on PR: "Phase 3 failed: [reason]"
- Fix issues, push changes
- **RESTART FROM PHASE 1**

---

### Phase 4: Code Review Gate Verification
**Duration:** 30 seconds
**Trigger:** Phase 3 complete (all checks green)

**Actions:**
1. Confirm automated code review gate completed
2. Review for:
   - No hardcoded secrets
   - No console.log() in production code (unless necessary)
   - Comments on complex logic
   - Proper error handling
3. Document: `[HH:MM:SS] Phase 4: Code Review Gate PASSED`

**Success Criteria:**
- ✅ Code review gate workflow green
- ✅ No flagged security issues
- ✅ Comments on complex code
- ✅ Error handling present

**If Failed:** Fix code review issues, restart from Phase 2

---

### Phase 5: Final Status Verification & Documentation
**Duration:** 30 seconds
**Trigger:** Phase 4 complete

**Actions:**
1. Verify all checks remain green
2. Confirm branch mergeable (GitHub shows "Able to merge")
3. Update `.github/PLANNING.md`:
   ```
   ## PR #XYZ - [Feature Name]
   
   ### Completion
   [HH:MM:SS] All phases complete:
   - Phase 1: Repository verification ✅
   - Phase 2: Workflow triggers ✅
   - Phase 3: Test execution ✅
   - Phase 4: Code review gate ✅
   - Phase 5: Final verification ✅
   
   Status: READY FOR HUMAN REVIEW
   ```
4. Document test results in `.github/TEST_COMPLETION_PROTOCOL.md`

**Success Criteria:**
- ✅ All six check categories green
- ✅ "Able to merge" shown on PR
- ✅ All timestamps recorded
- ✅ Documentation complete

**If Failed:** Return to failing phase

---

### Phase 6: Readiness Declaration & Human Review
**Duration:** Manual
**Trigger:** Phase 5 complete

**Actions:**
1. Post PR comment:
   ```
   All test completion phases complete ✅
   - Phase 1: Repository verification ✅ [HH:MM:SS]
   - Phase 2: Workflow triggers ✅ [HH:MM:SS]
   - Phase 3: Test execution ✅ [HH:MM:SS]
   - Phase 4: Code review gate ✅ [HH:MM:SS]
   - Phase 5: Final verification ✅ [HH:MM:SS]
   
   Ready for human review. See `.github/TEST_COMPLETION_PROTOCOL.md` for full results.
   ```

2. Assign to reviewer (if possible)
3. Wait for human approval

**Success Criteria:**
- ✅ All previous checks still green
- ✅ Comment posted
- ✅ Awaiting reviewer decision

**If Phase Fails or Checks Go Red:**
- ❌ ALL work reverts to Phase 1
- ❌ No shortcuts
- ❌ No partial merges
- ❌ Restart complete protocol

---

## Critical Rules

### ⛔ Never Declare Readiness Early
- Cannot say "ready" until ALL phases complete
- Cannot say "ready" if any check is red/yellow
- Premature declaration = automatic reset to Phase 1

### ⛔ No Skipping Phases
- All six phases required, no exceptions
- No human override of automation
- Process exists for good reasons

### ⛔ No Re-Using Phase Results
- If ANY check fails, restart from Phase 1
- Cannot cherry-pick passing checks
- Fresh run ensures quality

---

## Documentation Requirements

### `.github/TODO.md` Must Include:
```markdown
## PR #123 - Feature Name
- [x] Phase 1: Repository registration — [HH:MM:SS]
- [x] Phase 2: Workflow triggers — [HH:MM:SS]
- [x] Phase 3: Test execution — [HH:MM:SS]
- [x] Phase 4: Code review gate — [HH:MM:SS]
- [x] Phase 5: Final verification — [HH:MM:SS]
- [ ] Phase 6: Human review — awaiting...

### Test Results (Phase 3)
- [x] Conflict Detection — Zero conflicts
- [x] Linting — PASSED
- [x] Unit Tests — PASSED
- [x] Integration Tests — PASSED
- [x] Security Audit — PASSED
- [x] Docker Build — PASSED
```

### `.github/PLANNING.md` Must Include:
```markdown
## PR #123 - Feature Name

### Completion Status
[HH:MM:SS] Phase 1: ✅ Complete
[HH:MM:SS] Phase 2: ✅ Complete
[HH:MM:SS] Phase 3: ✅ Complete
[HH:MM:SS] Phase 4: ✅ Complete
[HH:MM:SS] Phase 5: ✅ Complete
[HH:MM:SS] Phase 6: ⏳ Awaiting human review

### All Checks Status
- Conflict Detection: ✅ Green
- Static Review: ✅ Green
- Tests: ✅ Green
- Linting: ✅ Green
- Security: ✅ Green
```

### `.github/TEST_COMPLETION_PROTOCOL.md` Example:
```markdown
# Test Completion Log

## PR #123: Feature Name
**Date:** 2024-01-15
**Author:** @username
**Branch:** feature/description

### Phase Timeline
| Phase | Start | Duration | Result | Details |
|-------|-------|----------|--------|---------|
| 1 | 10:15:00 | 30s | ✅ PASS | Branch verified |
| 2 | 10:15:30 | 30s | ✅ PASS | Workflows triggered |
| 3 | 10:16:00 | 75s | ✅ PASS | All tests passed |
| 4 | 10:17:15 | 30s | ✅ PASS | Code review gate OK |
| 5 | 10:17:45 | 30s | ✅ PASS | Final verification |
| 6 | 10:18:15 | ⏳ | PENDING | Awaiting human review |

### Check Results
- ✅ Conflict Detection — Zero conflicts detected
- ✅ ESLint Check — No errors, 0 warnings
- ✅ Unit Tests — 45/45 passed (100%)
- ✅ Integration Tests — 12/12 passed (100%)
- ✅ Security Audit — 0 vulnerabilities
- ✅ Docker Build — Image built successfully

### Test Coverage
- Lines: 85% (maintained)
- Branches: 80% (improved)
- Functions: 90%

### Notes
- All required checks passing
- No merge conflicts
- Ready for human review
```

---

## Enforcement Mechanism

### Automated Enforcement
- GitHub branch protection rules prevent merge without all checks
- `.github/workflows/code-review-gate.yml` enforces phase progression
- PR template ensures documentation completeness

### Human Accountability
- PR creator responsible for documentation accuracy
- Reviewer verifies all phases complete before approving
- Merge only by authorized maintainers

### Consequences of Violation

| Violation | Consequence |
|-----------|------------|
| Skipping a phase | PR status → "Needs Work", restart Phase 1 |
| Red check ignored | Merge blocked, restart Phase 1 |
| Undocumented status | PR cannot merge until documented |
| Premature "ready" | Phase counter resets |
| Force merge attempt | Escalation to project lead |

---

## Scenario Examples

### ✅ Success Path
```
10:15:00 Phase 1: ✅ Repository registered
10:15:30 Phase 2: ✅ Workflows triggered
10:16:00 Phase 3: ✅ Tests running...
10:17:15 Phase 3: ✅ All tests PASSED
10:17:45 Phase 4: ✅ Code review gate PASSED
10:18:15 Phase 5: ✅ Final verification complete
10:18:45 Phase 6: ✅ Ready for human review
→ Human reviews and approves
→ Merge approved by maintainer
```

### ❌ Failure & Reset
```
10:15:00 Phase 1: ✅ Repository registered
10:15:30 Phase 2: ✅ Workflows triggered
10:16:00 Phase 3: 🔄 Running tests...
10:17:15 Phase 3: ❌ FAILURE — Unit test failed
→ Developer fixes code
→ Developer pushes new changes
→ RESET: Return to Phase 1
10:22:00 Phase 1: ✅ Repository verified
... (cycle repeats) ...
```

---

## Timeline Summary

**Best Case:** ~195 seconds from PR creation to "Ready for Review"

- Phase 1: 30 seconds
- Phase 2: 30 seconds
- Phase 3: 60-90 seconds (depends on test suite)
- Phase 4: 30 seconds
- Phase 5: 30 seconds
- Phase 6: Manual (human review time)

**With One Failure Reset:** ~390 seconds (protocol runs twice)

---

## Questions?

**See also:**
- `.github/copilot-instructions.md` — AI agent governance
- `.github/PLANNING.md` — Current task tracking
- `.github/TODO.md` — Work items and test results

**Last Updated:** [Date]
**Version:** 1.0
