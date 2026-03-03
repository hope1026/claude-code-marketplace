---
name: review-ralph
description: Professional code and work review with multi-AI feedback. Use when user says "review", "code review", "review my work", "check my changes", "review this PR", or needs thorough quality assurance on code, documents, or completed tasks.
---

# Multi-AI Review

Perform thorough reviews of code, documents, and completed work using multiple AI perspectives. Iterate fixes until all reviewers confirm everything is properly applied.

## Workflow

```
Phase 1: Scope Analysis
   ↓ Identify review targets (changed files, documents, tasks)
Phase 2: Self-Review
   ↓ Claude performs initial detailed review
Phase 3: Multi-AI Review
   ↓ Gather external AI perspectives (Codex / Gemini / Claude CLI)
Phase 4: Synthesize Findings
   ↓ Merge all review feedback into actionable items
   ▼
┌──────────────────────────────────────┐
│  Phase 5: Fix Issues                 │
│     Apply fixes for identified issues│
│              ↓                       │
│  Phase 6: Re-Review                  │
│     All reviewers re-review fixes    │
│              ↓                       │
│  New issues found?                   │
│     YES → back to Phase 5           │
│     NO  → exit loop                 │
└──────────────────────────────────────┘
   ↓ Loop exits ONLY when 0 issues remain
Phase 7: Final Report
   ↓ Output consolidated review report
```

**Core Rule: Phase 5 → Phase 6 loop repeats WITHOUT any iteration limit. The loop exits ONLY when re-review finds zero issues across ALL reviewers.**

## Phase 1: Scope Analysis

Identify what needs to be reviewed:

```bash
# Check git changes
git diff --stat HEAD~1
git diff --name-only
git status
```

If `$ARGUMENTS` is provided, review the specified files/scope instead of git changes.

Categorize targets:
| Type | Examples |
|------|---------|
| Code changes | Modified/added source files |
| Documents | README, CHANGELOG, docs, CLAUDE.md |
| Configuration | package.json, tsconfig, build configs |
| Tests | Test files, test coverage |

## Phase 2: Self-Review (Claude)

Perform a detailed review covering:

### Code Quality
- Logic errors, edge cases, off-by-one errors
- Naming conventions and readability
- DRY violations, unnecessary complexity
- Security vulnerabilities (OWASP top 10)
- Performance issues (N+1 queries, memory leaks, unnecessary allocations)

### Consistency
- Adherence to project conventions (check CLAUDE.md)
- Consistent patterns with existing codebase
- Import ordering and code style

### Completeness
- All requirements addressed
- Error handling present where needed
- Types/interfaces properly defined
- Cross-file consistency (dispatchers, registrations, mappings)

Document all findings with file paths and line numbers.

## Phase 3: Multi-AI Review

### CLI Availability Check

Each CLI를 2단계로 판별: **설치 여부** → **인증 여부**. 이 두 가지만 실패하면 스킵하고, 그 외 모든 경우는 실행 가능한 방법을 찾아서 반드시 실행한다.

```
CLI 판별 흐름:

  CLI 설치됨?
    NO  → SKIP (not installed)
    YES ↓
  인증됨?
    NO  → SKIP (not authenticated)
    YES ↓
  기본 명령 실행됨?
    YES → 그대로 사용
    NO  ↓
  대체 실행 방법 탐색 (npx, 전체 경로, 다른 플래그...)
    찾음 → 해당 방법으로 실행
    못찾음 → 에러 내용 보고 후 계속 시도 (절대 스킵 안 함)
```

**스킵하는 경우 (이 2가지만):**

| 조건 | 판별 방법 | 처리 |
|------|----------|------|
| **미설치** | `command -v`, `which`, `npx --yes` 모두 실패 | 스킵, 로그에 "not installed" 기록 |
| **미인증** | 실행 시 auth/login/credential 관련 에러 출력 | 스킵, 로그에 "not authenticated" 기록 |

**스킵하지 않는 경우 (반드시 실행 방법을 찾는다):**
- PATH에 없지만 설치는 됨 → 전체 경로, npx, 글로벌 경로 탐색
- 특정 서브커맨드가 실패 → 다른 서브커맨드/플래그 시도
- 권한 문제 → `chmod +x` 또는 `node` 직접 실행
- 버전 호환성 문제 → 사용 가능한 옵션으로 조정

### Step 1: 설치 확인

각 CLI에 대해 순차적으로 시도. 하나라도 성공하면 해당 명령어를 저장:

```bash
# Codex 설치 확인
command -v codex 2>/dev/null \
  || which codex 2>/dev/null \
  || npx codex --version 2>/dev/null \
  || ls ~/.npm/_npx/*/node_modules/.bin/codex 2>/dev/null \
  || echo "CODEX_NOT_INSTALLED"

# Gemini 설치 확인
command -v gemini 2>/dev/null \
  || which gemini 2>/dev/null \
  || npx gemini --version 2>/dev/null \
  || echo "GEMINI_NOT_INSTALLED"

# Claude CLI 설치 확인
command -v claude 2>/dev/null \
  || which claude 2>/dev/null \
  || npx @anthropic-ai/claude-code --version 2>/dev/null \
  || echo "CLAUDE_NOT_INSTALLED"
```

### Step 2: 인증 확인

설치된 CLI만 대상. 짧은 테스트 프롬프트로 인증 상태 확인:

```bash
# 각 CLI에 최소한의 프롬프트를 보내서 인증 에러 여부 확인
$CMD "test" 2>&1 | head -5
```

출력에 다음 키워드가 포함되면 **미인증으로 판단하고 스킵**:
- `auth`, `login`, `authenticate`, `credential`, `API key`, `token`, `unauthorized`, `403`, `401`

### Step 3: 실행 방법 탐색

설치 + 인증이 확인된 CLI는 **반드시 실행**. 기본 명령이 실패하면 아래 순서로 대체 방법 시도:

| 순서 | 방법 | 예시 |
|------|------|------|
| 1 | 직접 명령 | `codex exec "..."` |
| 2 | 다른 서브커맨드/플래그 | `codex "..."` (exec 없이) |
| 3 | npx 실행 | `npx codex "..."` |
| 4 | 전체 경로 실행 | `/usr/local/bin/codex "..."` |
| 5 | node 직접 실행 | `node $(which codex) "..."` |
| 6 | 파이프 입력 | `echo "..." \| codex` |

실행 실패 시 에러 메시지를 분석하여 다음 방법을 시도. **미설치/미인증이 아닌 에러는 절대 스킵 사유가 아님.**

### Individual CLI Calls

**Codex** (설치+인증 확인됨):
```bash
FILE=<file>
codex exec "Perform a thorough code review. Report issues as a numbered list with severity (CRITICAL/WARNING/INFO). For each issue include: file path, line reference, description, and suggested fix.

Code from $FILE:
$(cat "$FILE")"
```

실행 실패 시 대체 시도:
```bash
# 대체 1: exec 없이 직접
codex "Review this code. Report issues as numbered list with severity (CRITICAL/WARNING/INFO). File: $FILE
$(cat "$FILE")"

# 대체 2: npx
npx codex exec "..."

# 대체 3: 전체 경로
$(which codex) exec "..."
```

**Gemini** (설치+인증 확인됨):
```bash
gemini "Perform a thorough code review focusing on architecture, security, and performance. Report issues as a numbered list with severity (CRITICAL/WARNING/INFO). For each issue include: file path, line reference, description, and suggested fix.

Code: $(cat <file>)"
```

실행 실패 시 대체 시도:
```bash
# 대체 1: npx
npx gemini "..."

# 대체 2: 전체 경로
$(which gemini) "..."

# 대체 3: 파이프 입력
cat <file> | gemini "Review this code..."
```

**Claude CLI** (설치+인증 확인됨):
```bash
claude -p "Perform a thorough code review focusing on correctness, consistency, and best practices. Report issues as a numbered list with severity (CRITICAL/WARNING/INFO). For each issue include: file path, line reference, description, and suggested fix.

Code: $(cat <file>)"
```

실행 실패 시 대체 시도:
```bash
# 대체 1: --print 플래그
claude --print "Review this code..." < <(cat <file>)

# 대체 2: npx
npx @anthropic-ai/claude-code -p "..."

# 대체 3: 전체 경로
$(which claude) -p "..."
```

**모든 대체 방법 실패 시:** 에러 메시지를 Final Report에 기록하되, 미설치/미인증이 아니면 사용자에게 수동 실행을 안내한다. (자동 스킵 금지)

### Large Changeset (5+ files)

Batch related files together with context:
```bash
codex exec --model gpt-5.3-codex "Review these related modules for consistency and correctness:
$(for f in file1.ts file2.ts file3.ts; do echo "=== $f ==="; cat "$f"; done)"
```

## Phase 4: Synthesize Findings

Merge all review feedback into a unified issue list:

```markdown
## Review Findings

### CRITICAL (Must Fix)
| # | File | Line | Issue | Source |
|---|------|------|-------|--------|
| 1 | path/file.ts | L42 | Description | Claude, Codex |

### WARNING (Should Fix)
| # | File | Line | Issue | Source |
|---|------|------|-------|--------|

### INFO (Consider)
| # | File | Line | Issue | Source |
|---|------|------|-------|--------|
```

Deduplication rules:
- Same issue from multiple AIs → merge, note agreement (higher confidence)
- Conflicting opinions → evaluate both, pick the better-reasoned one
- False positives → discard with brief explanation

## Phase 5: Fix Issues

Apply fixes for all CRITICAL and WARNING items:

1. Fix one issue at a time
2. Verify the fix doesn't break related code
3. Mark each issue as resolved in the findings table
4. For INFO items, apply only if clearly beneficial

**Important:** Do not batch fixes — apply them individually to ensure each fix is correct and doesn't introduce new issues.

## Phase 6: Re-Review (Mandatory Loop)

**This is the critical iteration phase. There is NO iteration limit. Repeat until every reviewer reports zero issues.**

```
┌─────────────────────────────────────────────┐
│          REVIEW-FIX LOOP (no limit)         │
│                                             │
│  1. Re-read all fixed files                 │
│  2. Claude self-review                      │
│  3. External AI re-review (if available)    │
│  4. Evaluate results:                       │
│     - ANY issue found → Fix → Loop again    │
│     - ZERO issues from ALL → Exit to Ph.7   │
└─────────────────────────────────────────────┘
```

### Re-Review Process

Each iteration performs a **full re-review** of all changed files:

1. **Re-read the fixed files** — verify every change is correct
2. **Claude self-review** — check fixes are correct, complete, and introduce no regressions
3. **External AI re-review** (if CLIs available):
   ```bash
   FILE=<fixed-file>
   codex exec --model gpt-5.3-codex "Re-review this code. Previous issues were fixed. Verify all fixes are correct and check for any new issues introduced by the fixes. If everything looks good, respond with 'ALL CLEAR - no issues found'. Otherwise list remaining issues with severity.

   Code from $FILE:
   $(cat "$FILE")"
   ```
   ```bash
   gemini "Re-review this code. Previous issues were fixed. Verify all fixes are correct and check for any new issues introduced. If everything looks good, respond with 'ALL CLEAR - no issues found'. Otherwise list remaining issues with severity.

   Code: $(cat <fixed-file>)"
   ```
   ```bash
   claude -p "Re-review this code. Previous issues were fixed. Verify all fixes are correct and check for any new issues introduced. If everything looks good, respond with 'ALL CLEAR - no issues found'. Otherwise list remaining issues with severity.

   Code: $(cat <fixed-file>)"
   ```
4. **Evaluate re-review results:**
   - **ANY reviewer reports issues** → apply fixes (Phase 5) → re-review again (Phase 6)
   - **ALL reviewers report "ALL CLEAR"** → proceed to Phase 7

### Loop Rules

| Rule | Description |
|------|-------------|
| **No iteration limit** | Loop continues until zero issues remain — no max cap |
| **Full re-review each round** | Every iteration re-reviews ALL changed files, not just newly fixed ones |
| **New issues count equally** | Issues introduced by fixes are treated the same as original issues |
| **All reviewers must agree** | Exit requires ALL available reviewers to report zero issues |
| **Track iteration count** | Log each iteration number for the final report |

## Phase 7: Final Report

```markdown
## Review Complete

### Summary
- Files reviewed: N
- Issues found: N (CRITICAL: X, WARNING: Y, INFO: Z)
- Issues fixed: N
- Review iterations: N
- Reviewers: Claude, Codex, Gemini (or subset)

### Review Details

#### Fixed Issues
| # | File | Issue | Fix Applied | Verified By |
|---|------|-------|-------------|-------------|

#### Remaining Issues (if any)
| # | File | Issue | Reason Not Fixed |
|---|------|-------|------------------|

### AI Agreement Summary
- **Unanimous agreement:** [points all AIs agreed on]
- **Resolved disagreements:** [how conflicts were resolved]

### Recommendations
- [Any follow-up actions or improvements to consider]
```

## Guidelines

- Never skip the self-review (Phase 2) even when external AIs are available
- Always verify fixes don't introduce regressions
- Respect project conventions defined in CLAUDE.md
- Do not send sensitive data (credentials, secrets, .env) to external AIs
- Keep re-review iterations focused on changed files only, not the entire codebase
- If the changeset is trivial (typo fix, comment change), skip external AI review
- Response times for external AIs may be 30+ seconds per query
