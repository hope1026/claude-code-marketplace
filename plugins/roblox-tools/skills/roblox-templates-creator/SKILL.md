---
name: roblox-templates-creator
description: Search, verify, register Roblox assets and update game references. Use when populating asset registry, finding new assets, updating references, or user says "에셋 찾기", "템플릿 에셋 추가", "search assets", "에셋 등록", "레퍼런스 업데이트".
argument-hint: "[category] [search-query]"
---

# Roblox Templates Creator

MCP를 통해 Roblox Creator Store에서 에셋을 검색하고 `roblox-templates` 레지스트리에 등록합니다.

**Core Mission:**
1. Search and verify assets from Roblox Creator Store
2. Register verified assets to `assets/*.json`
3. **Update corresponding `references/*.md` with new assets**

에셋 레지스트리(`assets/`)는 포괄적인 게임 레퍼런스(`references/`)를 구축하기 위한 **수단**입니다.

## Prerequisites

- Roblox Studio가 실행 중이고 MCP 플러그인이 연결되어 있어야 합니다
- `search_creator_store`, `get_asset_info` MCP 도구가 필요합니다

## Workflow

```
1. 카테고리 선택 (monsters, weapons, items, environment, npcs, effects, terrain-presets)
     ↓
2. 검색 쿼리 실행 (MCP search_creator_store)
     ↓
3. 메타데이터 검증 (get_asset_info)
     ↓
4. Studio 삽입 검증 (insert_free_model + 구조 분석)
     ↓
5. 레지스트리에 등록 (assets/*.json 업데이트)
     ↓
6. 레퍼런스 업데이트 (references/*.md 동기화) ← CRITICAL!
```

## 카테고리별 검색

### 자동 검색 모드

카테고리 지정 시 해당 JSON의 `searchQueries`를 순회하며 자동 검색:

```typescript
// 1. 레지스트리 파일 읽기
const registry = JSON.parse(await read("mcp-server/marketplace/plugins/weppy-roblox-mcp/skills/roblox-templates/assets/{category}.json"));

// 2. 각 서브카테고리의 쿼리 실행
for (const [subcat, queries] of Object.entries(registry.searchQueries)) {
    for (const query of queries) {
        const results = await search_creator_store({ query, limit: 5 });
        // 결과 처리
    }
}
```

### 수동 검색 모드

특정 쿼리로 직접 검색:

```typescript
const results = await search_creator_store({
    query: "zombie R15 enemy",
    limit: 10
});
```

## 품질 검증 기준

### 공통 기준
- **무료 에셋만** (isFree 또는 price === 0)
- **적절한 파트 수** (카테고리별 maxPartCount 이하)

### 카테고리별 기준

| 카테고리 | 추가 조건 |
|----------|----------|
| monsters | R15 Humanoid 선호, 적절한 크기 |
| weapons | Handle 파트 필요, Tool 구조 |
| items | 작은 크기, 수집 가능 |
| environment | Anchored, PrimaryPart 존재 |
| npcs | R15 Humanoid 필수 |
| effects | ParticleEmitter 포함 |

## 검증 프로세스

에셋 등록은 **2단계 검증**을 거쳐야 합니다:

### 1단계: 메타데이터 검증 (API)

```typescript
async function verifyMetadata(assetId: number): Promise<boolean> {
    const info = await get_asset_info({ assetId });

    // 필수 조건
    if (!info.isPublicDomain) return false;  // 무료 확인
    if (info.assetTypeId !== 10) return false;  // Model 타입 확인

    return true;
}
```

### 2단계: Studio 삽입 검증 (필수!)

**메타데이터 검증만으로는 불충분합니다.** 반드시 Studio에 삽입하여 실제 구조를 확인해야 합니다.

```typescript
async function verifyInStudio(assetId: number, category: string): Promise<VerificationResult> {
    // 1. 검증 폴더 생성
    await create_instance({ className: "Folder", name: "_AssetVerification", parent: "game.Workspace" });

    // 2. 에셋 삽입 (구조 정보 자동 반환)
    const result = await insert_free_model({
        assetId,
        parentPath: "game.Workspace._AssetVerification"
    });

    // 3. 카테고리별 구조 검증
    const criteria = getCriteria(category);
    const structure = result.details;

    // 파트 수 확인
    if (structure.partCount > criteria.maxPartCount) {
        return { valid: false, reason: `파트 수 초과: ${structure.partCount} > ${criteria.maxPartCount}` };
    }

    // 카테고리별 추가 검증
    switch (category) {
        case "weapons":
            // Tool 클래스 + Handle 파트 필수
            if (result.className !== "Tool") {
                return { valid: false, reason: "Tool 클래스가 아님" };
            }
            const hasHandle = structure.childClasses.some(c => c.className === "Part" || c.className === "MeshPart");
            if (!hasHandle) {
                return { valid: false, reason: "Handle 파트 없음" };
            }
            break;

        case "monsters":
        case "npcs":
            // Humanoid 필수, R15 선호 (Motor6D 15개)
            if (!structure.childClasses.some(c => c.className === "Humanoid")) {
                return { valid: false, reason: "Humanoid 없음" };
            }
            const motor6DCount = structure.childClasses.find(c => c.className === "Motor6D")?.count || 0;
            const isR15 = motor6DCount >= 15;
            break;

        case "terrain-presets":
            // 맵 타입: 스폰 위치 탐색
            const bounds = await get_bounds({ path: result.path });
            const spawns = await find_spawn_positions({
                searchArea: {
                    min: bounds.min,
                    max: bounds.max
                },
                count: 5,
                preferOutdoor: true
            });
            // suggestedSpawns 필드로 저장
            break;
    }

    // 4. 검증 완료 후 정리
    await delete_instance({ path: "game.Workspace._AssetVerification" });

    return {
        valid: true,
        structure: {
            className: result.className,
            partCount: structure.partCount,
            meshPartCount: structure.meshPartCount,
            hasScripts: structure.hasScripts,
            boundingBox: structure.boundingBox
        }
    };
}
```

### 검증 실패 처리

검증 실패 시 해당 에셋은 **등록하지 않습니다**:

| 실패 사유 | 처리 |
|-----------|------|
| 파트 수 초과 | 제거 (성능 문제) |
| Tool 구조 미충족 (weapons) | 제거 |
| Humanoid 없음 (monsters/npcs) | 제거 |
| SpawnLocation 없음 (terrain) | 스폰 위치 탐색 후 `suggestedSpawns` 추가 |

### 검증 결과 기록

검증 통과 시 `structure` 필드에 상세 정보 기록:

```json
{
  "id": 12345678,
  "name": "Zombie Soldier",
  "structure": {
    "className": "Model",
    "partCount": 16,
    "hasHumanoid": true,
    "hasScripts": true,
    "motor6D": 15,
    "boundingBox": { "x": 5, "y": 6, "z": 3 }
  }
}
```

## 레지스트리 등록

검증 통과 시 JSON 파일의 `verified` 배열에 추가:

```typescript
async function registerAsset(category: string, asset: VerifiedAsset) {
    const filePath = `mcp-server/marketplace/plugins/weppy-roblox-mcp/skills/roblox-templates/assets/${category}.json`;
    const registry = JSON.parse(await read(filePath));

    // 중복 체크
    if (registry.verified.some(v => v.id === asset.id)) {
        return { status: "duplicate", message: "이미 등록된 에셋입니다" };
    }

    // 등록
    registry.verified.push({
        id: asset.id,
        name: asset.name,
        query: asset.query,
        verifiedAt: new Date().toISOString().split('T')[0],
        creator: asset.creator,
        description: asset.description
    });

    // 메타 업데이트
    registry._meta.lastUpdated = new Date().toISOString().split('T')[0];
    registry._meta.totalAssets = registry.verified.length;

    // 저장
    await write(filePath, JSON.stringify(registry, null, 2));

    return { status: "success", message: `${asset.name} 등록 완료` };
}
```

## 6. 레퍼런스 업데이트 (CRITICAL!)

에셋 등록 후 **반드시** 해당 레퍼런스 파일을 업데이트합니다.

### Category → Reference Mapping

| 에셋 카테고리 | 레퍼런스 파일 |
|---------------|---------------|
| monsters, weapons, npcs, items, effects | references/rpg.md |
| terrain-presets (맵) | references/rpg.md |
| obstacles, checkpoints | references/obby.md |
| droppers, upgraders | references/tycoon.md |
| tools, pets, zones | references/simulator.md |

### Reference Update Workflow

```typescript
// 1. 레퍼런스 파일 읽기
const refPath = `.claude/skills/roblox-templates/references/${gameType}.md`;
const content = await read(refPath);

// 2. 에셋 카탈로그 섹션 찾기
// "## 에셋 카탈로그" 또는 "### {Category}" 섹션

// 3. 새 에셋 추가 (테이블에 행 추가)
// | ID | 이름 | 타입 | 특징 |
// | {newId} | {newName} | {type} | {features} |

// 4. 에셋 조합 가이드 업데이트 (필요시)
// 새 에셋이 특정 난이도/테마에 적합하면 해당 섹션에 추가
```

### Example: Monster 추가 시

```markdown
// assets/monsters.json에 등록 후

// references/rpg.md 업데이트:
// "### Monsters" 테이블에 행 추가
| 12345678 | New Monster | 타입 | 난이도 | 특징 |

// "### 난이도별 조합" 섹션 업데이트 (해당 시)
**중급 (레벨 6-15):**
- 몬스터: ..., New Monster (추가)
```

### Example: Map 추가 시

```markdown
// assets/terrain-presets.json에 등록 후

// references/rpg.md 업데이트:
// "### Maps" 테이블에 행 추가
| 12345678 | New Map | 크기 | (x, y, z) | 특징 |

// "### 테마별 조합" 섹션에 새 테마 추가 (필요시)
**새테마:**
- 맵: New Map
- 몬스터: ...
```

## 사용 예시

### 전체 카테고리 자동 채우기

```
/roblox-templates-creator all
```

모든 카테고리의 searchQueries를 순회하며 에셋 검색 및 등록.

### 특정 카테고리 채우기

```
/roblox-templates-creator monsters
```

monsters.json의 searchQueries만 처리.

### 특정 쿼리로 검색

```
/roblox-templates-creator weapons "legendary sword"
```

weapons 카테고리에 "legendary sword" 검색 결과 등록.

## 결과 보고

작업 완료 시 보고:

```
## Asset Verification Report

### Category: {category}
- Queries executed: X
- Assets found: Y
- **Studio verified**: Z
- Registered: W
- Failed: F

### Newly Registered Assets

| ID | Name | Structure |
|----|------|-----------|
| 123 | Zombie | partCount:16, R15 |

### References Updated

| Reference | Section | Changes |
|-----------|---------|---------|
| rpg.md | Monsters | +1 (Zombie) |
| rpg.md | 난이도별 조합 | 초급에 추가 |

### Failed Assets

| ID | Name | Reason |
|----|------|--------|
| 456 | Sword | No Tool class |
| 789 | Tree | 437 parts > 200 limit |
```

## 주의사항

- **Roblox Studio 연결 필수**: MCP 도구 사용을 위해 Studio가 실행 중이어야 합니다
- **속도 제한**: Roblox API 제한으로 인해 검색 간 딜레이가 필요할 수 있습니다
- **품질 우선**: 양보다 품질을 우선하여 검증된 에셋만 등록합니다
- **R15 우선**: 캐릭터형 에셋은 R15 호환 에셋을 우선합니다
- **Studio 삽입 검증 필수**: 메타데이터만으로 등록하지 마세요
- **구조 정보 기록**: `structure` 필드에 검증 결과 저장
- **레퍼런스 동기화 필수**: 에셋 등록 후 반드시 references/*.md 업데이트
