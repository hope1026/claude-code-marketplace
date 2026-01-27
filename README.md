# Claude Code Marketplace

Claude Code 플러그인 마켓플레이스입니다. 다른 프로젝트에서 이 마켓플레이스를 추가하고 플러그인을 설치할 수 있습니다.

## 마켓플레이스 추가 방법

### GitHub에서 추가

```shell
/plugin marketplace add owner/claude-code-marketplace
```

### 로컬에서 추가

```shell
/plugin marketplace add ./path/to/claude-code-marketplace
```

### Git URL로 추가

```shell
/plugin marketplace add https://github.com/owner/claude-code-marketplace.git
```

## 플러그인 설치

마켓플레이스를 추가한 후 플러그인을 설치합니다:

```shell
/plugin install tools@hanbyeol-plugins
```

또는 대화형 UI 사용:

```shell
/plugin
```

그 후 **Discover** 탭에서 플러그인을 선택하고 설치합니다.

## 사용 가능한 플러그인

### tools

개발 도구 모음으로 다음 스킬들을 포함합니다:

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `skill-creator` | Claude Code 스킬 생성 가이드 | `/tools:skill-creator` |
| `agent-creator` | Claude Code 에이전트 생성 가이드 | `/tools:agent-creator` |
| `hooks-creator` | Claude Code 훅 생성 가이드 | `/tools:hooks-creator` |
| `plugin-creator` | Claude Code 플러그인 생성 가이드 | `/tools:plugin-creator` |
| `ai-council` | 여러 AI (Claude, Codex, Gemini) 협업 | `/tools:ai-council` |
| `codex-cli` | OpenAI Codex CLI 연동 | `/tools:codex-cli` |
| `gemini-cli` | Google Gemini CLI 연동 | `/tools:gemini-cli` |

### claude-status

실시간 상태 바를 표시하는 플러그인입니다. 설치 후 자동으로 활성화됩니다.

**표시 정보:**
- 🤖 **모델 정보** - 현재 사용 중인 모델 (Opus, Sonnet, Haiku)
- 📊 **Context 사용량** - 현재/최대 토큰 사용량 및 프로그레스 바
- 💰 **Cost** - 세션 비용 (USD)
- ⏱️ **5h Session Limit** - 5시간 세션 사용량 및 리셋 시간
- 📅 **7d Usage** - 7일 사용량 정보
- ⚙️ **Tools** - 현재 실행 중인 도구 및 완료된 도구 수
- 🤖 **Agent** - 실행 중인 서브에이전트 정보
- ✓ **Todos** - 현재 작업 및 진행률
- 📦 **Cache Hit** - 캐시 히트율

**설치:**
```shell
/plugin install claude-status@hanbyeol-plugins
```

## 디렉토리 구조

```
claude-code-marketplace/
├── .claude-plugin/
│   └── marketplace.json      # 마켓플레이스 매니페스트
├── plugins/
│   ├── tools/                # tools 플러그인
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   └── skills/
│   │       ├── skill-creator/
│   │       ├── agent-creator/
│   │       ├── hooks-creator/
│   │       ├── plugin-creator/
│   │       ├── ai-council/
│   │       ├── codex-cli/
│   │       └── gemini-cli/
│   └── claude-status/        # claude-status 플러그인
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── src/              # TypeScript 소스
│       │   ├── main.ts
│       │   ├── types.ts
│       │   ├── lib/
│       │   └── panels/
│       └── out/              # 빌드 결과
│           └── main.js
└── README.md
```

## 자체 플러그인 추가하기

1. `plugins/` 디렉토리에 새 플러그인 폴더 생성
2. `.claude-plugin/plugin.json` 매니페스트 추가
3. 스킬은 `skills/` 폴더에, 에이전트는 `agents/` 폴더에 배치
4. `.claude-plugin/marketplace.json`에 플러그인 항목 추가

### 플러그인 매니페스트 예시

```json
{
  "name": "my-plugin",
  "description": "My awesome plugin",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### 마켓플레이스에 플러그인 등록

`.claude-plugin/marketplace.json`의 `plugins` 배열에 추가:

```json
{
  "name": "my-plugin",
  "source": "./my-plugin",
  "description": "My awesome plugin description"
}
```

## 참고 문서

- [플러그인 검색 및 설치](https://code.claude.com/docs/ko/discover-plugins)
- [플러그인 마켓플레이스 생성](https://code.claude.com/docs/ko/plugin-marketplaces)
- [플러그인 레퍼런스](https://code.claude.com/docs/ko/plugins-reference)

## 라이선스

MIT License
