---
name: review-ralph
description: Professional code and work review with multi-AI feedback. Use when user says "review", "code review", "review my work", "check my changes", "review this PR", or needs thorough quality assurance on code, documents, or completed tasks.
---

# Multi-AI Review (Stop Hook Loop)

Stop hook 기반 자율 리뷰 루프. Claude가 종료를 시도하면 hook이 잔여 이슈를 확인하고, 이슈가 0개가 될 때까지 세션을 자동으로 계속한다.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Claude Session                                 │
│                                                 │
│  Phase 1: Scope Analysis                        │
│  Phase 2: Self-Review                           │
│  Phase 3: Multi-AI Review                       │
│  Phase 4: Synthesize → state.json 생성          │
│  Phase 5: Fix Issues → remaining_issues 업데이트│
│  Phase 6: 세션 종료 시도                         │
│       ↓                                         │
│  ┌──────────────────────────────────┐           │
│  │ Stop Hook (.claude/hooks/        │           │
│  │   ralph-loop-hook.sh)            │           │
│  │                                  │           │
│  │ remaining_issues > 0?            │           │
│  │   YES → exit 2 (종료 차단)       │           │
│  │         재리뷰 프롬프트 주입      │           │
│  │   NO  → exit 0 (종료 허용)       │           │
│  └──────────────────────────────────┘           │
│       ↓ (차단 시)                                │
│  Phase 5로 복귀: 재리뷰 + 수정                   │
│  Phase 6: 다시 종료 시도 ...                     │
└─────────────────────────────────────────────────┘
```

## State File

리뷰 루프 상태는 `.claude/loop-state.json`으로 관리한다.

### 상태 파일 생성 (Phase 4 완료 시)

```bash
cat > .claude/loop-state.json << 'STATEEOF'
{
  "status": "active",
  "skill": "review-ralph",
  "iteration": 1,
  "remaining_issues": <CRITICAL + WARNING 개수>,
  "total_found": <전체 이슈 수>,
  "files_reviewed": ["path/to/file1.ts", "path/to/file2.ts"],
  "reviewers": ["claude", "codex", "gemini"]
}
STATEEOF
```

### 상태 업데이트 (수정 후)

수정이 완료될 때마다 remaining_issues를 갱신한다:

```bash
# 이슈 수 업데이트
jq '.remaining_issues = <남은 수>' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

### 루프 종료 (모든 이슈 해결 시)

```bash
# 모든 리뷰어가 이슈 0개 확인 시
jq '.remaining_issues = 0 | .status = "complete"' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

**중요:** remaining_issues를 0으로 설정하면 다음 종료 시도에서 hook이 종료를 허용한다.

---

## Phase 1: Scope Analysis

리뷰 대상을 식별한다:

```bash
git diff --stat HEAD~1
git diff --name-only
git status
```

`$ARGUMENTS`가 제공되면 해당 파일/범위를 대신 리뷰한다.

대상 분류:
| Type | Examples |
|------|---------|
| Code changes | Modified/added source files |
| Documents | README, CHANGELOG, docs, CLAUDE.md |
| Configuration | package.json, tsconfig, build configs |
| Tests | Test files, test coverage |

## Phase 2: Self-Review (Claude)

다음을 커버하는 상세 리뷰 수행:

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

모든 발견 사항을 파일 경로와 라인 번호로 문서화한다.

## Phase 3: Multi-AI Review

### CLI Availability Check

각 CLI를 2단계로 판별: **설치 여부** -> **인증 여부**. 이 두 가지만 실패하면 스킵하고, 그 외 모든 경우는 실행 가능한 방법을 찾아서 반드시 실행한다.

```
CLI 판별 흐름:

  CLI 설치됨?
    NO  -> SKIP (not installed)
    YES |
  인증됨?
    NO  -> SKIP (not authenticated)
    YES |
  기본 명령 실행됨?
    YES -> 그대로 사용
    NO  |
  대체 실행 방법 탐색 (npx, 전체 경로, 다른 플래그...)
    찾음 -> 해당 방법으로 실행
    못찾음 -> 에러 내용 보고 후 계속 시도 (절대 스킵 안 함)
```

**스킵하는 경우 (이 2가지만):**

| 조건 | 판별 방법 | 처리 |
|------|----------|------|
| **미설치** | `command -v`, `which`, `npx --yes` 모두 실패 | 스킵, 로그에 "not installed" 기록 |
| **미인증** | 실행 시 auth/login/credential 관련 에러 출력 | 스킵, 로그에 "not authenticated" 기록 |

**스킵하지 않는 경우 (반드시 실행 방법을 찾는다):**
- PATH에 없지만 설치는 됨 -> 전체 경로, npx, 글로벌 경로 탐색
- 특정 서브커맨드가 실패 -> 다른 서브커맨드/플래그 시도
- 권한 문제 -> `chmod +x` 또는 `node` 직접 실행
- 버전 호환성 문제 -> 사용 가능한 옵션으로 조정

### Step 1: 설치 확인

```bash
# Codex 설치 확인
command -v codex 2>/dev/null \
  || which codex 2>/dev/null \
  || npx codex --version 2>/dev/null \
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

**모든 대체 방법 실패 시:** 에러 메시지를 Final Report에 기록하되, 미설치/미인증이 아니면 사용자에게 수동 실행을 안내한다.

### Individual CLI Calls

**Codex** (설치+인증 확인됨):
```bash
FILE=<file>
codex exec "Perform a thorough code review. Report issues as a numbered list with severity (CRITICAL/WARNING/INFO). For each issue include: file path, line reference, description, and suggested fix.

Code from $FILE:
$(cat "$FILE")"
```

**Gemini** (설치+인증 확인됨):
```bash
gemini "Perform a thorough code review focusing on architecture, security, and performance. Report issues as a numbered list with severity (CRITICAL/WARNING/INFO). For each issue include: file path, line reference, description, and suggested fix.

Code: $(cat <file>)"
```

**Claude CLI** (설치+인증 확인됨):
```bash
claude -p "Perform a thorough code review focusing on correctness, consistency, and best practices. Report issues as a numbered list with severity (CRITICAL/WARNING/INFO). For each issue include: file path, line reference, description, and suggested fix.

Code: $(cat <file>)"
```

### Large Changeset (5+ files)

```bash
codex exec "Review these related modules for consistency and correctness:
$(for f in file1.ts file2.ts file3.ts; do echo "=== $f ==="; cat "$f"; done)"
```

## Phase 4: Synthesize Findings + State 초기화

리뷰 피드백을 통합하고 **상태 파일을 생성**한다:

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
- Same issue from multiple AIs -> merge, note agreement (higher confidence)
- Conflicting opinions -> evaluate both, pick the better-reasoned one
- False positives -> discard with brief explanation

**통합 완료 후 상태 파일을 생성한다** (CRITICAL + WARNING 합산):

```bash
cat > .claude/loop-state.json << 'STATEEOF'
{
  "status": "active",
  "skill": "review-ralph",
  "iteration": 1,
  "remaining_issues": <CRITICAL + WARNING 합산 수>,
  "total_found": <전체 이슈 수>,
  "files_reviewed": [<리뷰 대상 파일 목록>],
  "reviewers": [<사용된 리뷰어 목록>]
}
STATEEOF
```

이슈가 0개이면 `"status": "complete"`, `"remaining_issues": 0`으로 생성한다.

## Phase 5: Fix Issues + State 업데이트

CRITICAL과 WARNING 항목을 수정한다:

1. 한 번에 하나의 이슈만 수정
2. 수정이 관련 코드를 깨뜨리지 않는지 확인
3. INFO 항목은 명확히 유익한 경우에만 적용

**수정 후 반드시 상태 파일을 업데이트한다:**

```bash
jq '.remaining_issues = <남은 CRITICAL + WARNING 수>' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

수정 완료 후:
- 자체 재리뷰로 수정 사항 검증
- 사용 가능한 외부 AI CLI로 재리뷰 실행
- 새로운 이슈가 발견되면 remaining_issues에 반영
- 모든 리뷰어가 이슈 0개를 확인하면:

```bash
jq '.remaining_issues = 0 | .status = "complete"' .claude/loop-state.json > .claude/loop-state.json.tmp && mv .claude/loop-state.json.tmp .claude/loop-state.json
```

**Phase 5 완료 후 세션을 종료한다. Stop hook이 remaining_issues를 확인하여 루프를 제어한다.**

### Re-Review 시 외부 AI 호출

```bash
FILE=<fixed-file>
codex exec "Re-review this code. Previous issues were fixed. Verify all fixes are correct and check for any new issues. If everything looks good, respond with 'ALL CLEAR'. Otherwise list remaining issues with severity.

Code from $FILE:
$(cat "$FILE")"
```

```bash
gemini "Re-review this code. Previous issues were fixed. Verify all fixes are correct and check for any new issues. If everything looks good, respond with 'ALL CLEAR'. Otherwise list remaining issues with severity.

Code: $(cat <fixed-file>)"
```

```bash
claude -p "Re-review this code. Previous issues were fixed. Verify all fixes are correct and check for any new issues. If everything looks good, respond with 'ALL CLEAR'. Otherwise list remaining issues with severity.

Code: $(cat <fixed-file>)"
```

## Phase 6: Final Report

remaining_issues가 0이 되어 세션이 정상 종료될 때, 최종 리포트를 출력한다:

```markdown
## Review Complete

### Summary
- Files reviewed: N
- Issues found: N (CRITICAL: X, WARNING: Y, INFO: Z)
- Issues fixed: N
- Review iterations: N (check state file)
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
- **상태 파일은 반드시 jq로 업데이트한다** (직접 echo/cat으로 덮어쓰지 않는다)
- **remaining_issues를 정확히 관리한다** — 이 값이 루프 종료 조건이다
- Response times for external AIs may be 30+ seconds per query
