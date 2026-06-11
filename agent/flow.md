# 자동 업데이트 에이전트 — 흐름 설계 (스텁)

> **구현하지 않는다.** 흐름 설계도 + 인터페이스 계약(→ [interfaces.md](./interfaces.md))까지만 정의한다 (CLAUDE.md "2주 범위 규칙: 에이전트는 스텁").
> [schema/kb-entry.md](../schema/kb-entry.md)를 단일 인터페이스 계약으로 삼아, 가이드·KB와 같은 스키마 위에서 동작하도록 contract-first로 설계해 둔다.

## 처리 순서 (4단계)

```
입력                          단계                       산출
PRD               ─┐
화면설계서(PDF)    │      ① 판별                    수정 vs 신규
프론트엔드 코드    ├──→  (변경 유형 분류)      ──→  + 영향받는 카테고리 후보
화면 프로토타입    │
라이브 배포 소스   │
Figma / 티켓      ─┘
                            ↓
                        ② 검색/매핑                기존 KB(kb/**/*.md)에서
                        (기존 KB 탐색)         ──→  대상 엔트리·필드 식별
                            ↓
                        ③ 구조화/생성              필드별 권위 소스에서
                        (필드별 추출·조합)      ──→  추출·조합 → 스키마에 맞춰
                                                     신규 생성 또는 해당 필드만 수정
                            ↓
                        ④ 반영                     저장(kb/**/*.md) →
                        (저장 + 배포)           ──→  웹페이지(guide/) 반영
```

## 단계별 책임 (요약)

| 단계 | 입력 | 처리 | 출력 | 비고 |
|---|---|---|---|---|
| ① 판별 | 변경된 산출물(diff) | 수정/신규 분류, 영향 도메인·카테고리 추정 | 변경 유형 + 후보 목록 | 분기 처리는 LangGraph 등으로 구성 가능 |
| ② 검색/매핑 | 후보 목록 | 기존 `kb/**/*.md`에서 대상 엔트리·필드 검색 | (entry id, field) 매핑 | `id`/`category` 기준 매칭 |
| ③ 구조화/생성 | 매핑 결과 + 권위 소스 원문 | 필드별 권위 소스에서만 추출·조합, 스키마 검증 | 신규 엔트리 또는 변경된 필드만 | `provenance`에 출처·버전 기록 |
| ④ 반영 | 생성/수정된 엔트리 | 저장 + 가이드 빌드 트리거 | 갱신된 `kb/**/*.md` + `guide/dist/` | 2주 범위에선 수동 빌드 |

## 입력 트리거 (후속 — 팀 업무 프로세스 연계)

계획서 "팀 업무 프로세스"의 각 산출물 갱신 시점이 (향후) 입력 트리거가 된다. 트리거마다 영향을 주는 필드가 다르므로 ③에서 해당 필드만 재생성하면 된다:

```
PRD 작성/갱신          → title, description 재생성
화면 프로토타입 갱신    → policy 재생성        ← 정책 툴팁 반영판이 가이드 본문의 1차 소스
프론트엔드 코드 변경    → screen_ref 재생성
티켓 생성/갱신         → acceptance 재생성
Figma 갱신 (후속)      → visual 재생성
라이브 배포 소스 갱신   → policy/screen_ref 등 draft 필드의 provenance.deployment 메타데이터 갱신 (F8, 수동)
```

2주 범위에는 트리거 배선 없이 수동으로 KB 콘텐츠를 채운다. 자동 트리거 연동·구현은 후속(범위 외).

## "프론트엔드 코드 변경" 트리거 — 점검 도구 (F5, 구현됨)

위 표의 "프론트엔드 코드 변경 → screen_ref 재생성" 행은 4단계 에이전트(③ 구조화/생성)가
자동으로 처리할 일이지만, 그 자동화는 범위 밖이다. 대신 [07-features.md F5](../prd-flow/protect-go-ai-guide/auto-backward/07-features.md)에서 정의한
"사람의 점검 보조 도구"로서 [scripts/check_screen_ref.py](./scripts/check_screen_ref.py)를 둔다.

- 각 KB 엔트리의 `provenance.screen_ref.version`(`<저장소명>@<commit sha>`)을
  ProtectGO-ENT-FE 로컬 클론의 현재 상태와 비교한다.
- `--fetch` 옵션이 "버튼 트리거"에 해당 — GitHub 원격(origin)에서 최신 커밋 정보를
  받아온 뒤(작업 트리는 변경하지 않음), 기록된 버전 이후 `screen_ref.ref`에 적힌
  파일이 변경됐는지 보여준다.
- 결과는 사람이 "이 엔트리의 screen_ref를 다시 봐야 하는가?"를 판단하는 입력일 뿐,
  KB 파일을 직접 수정하지 않는다 — ③ 구조화/생성, ④ 반영은 여전히 사람이 수행한다.
- 자세한 사용법은 [scripts/README.md](./scripts/README.md) 참고.

## "라이브 배포 소스" 트리거 — 점검·동기화 도구 (F8, 구현됨)

위 표의 "라이브 배포 소스 갱신" 행도 같은 원칙으로, 4단계 에이전트의 ①·④(판별·반영) 일부를
[scripts/fetch_deployment_source.py](./scripts/fetch_deployment_source.py)가 사람의 점검·동기화를 보조한다.

- `fetch <source_id> --url <url>`: production alias URL(항상 최신 배포)을 페치해 정적 렌더 텍스트를
  추출하고 `section_anchor` 단위로 분할, `agent/snapshots/<source_id>.json`에 스냅샷을 저장한다.
  직전 스냅샷과 비교해 변경된 섹션 목록을 보여준다 — "버튼 트리거"에 해당.
  정적 텍스트가 추출되지 않으면(예: iframe 격리 아티팩트) 적격성 실패로 보고한다.
- `sync <source_id> [--apply]`: 직전 `fetch`에서 변경된 섹션을 참조하는 KB 엔트리의
  `provenance.<field>.deployment`(`content_hash`/`fetched_at`/`deployed_at`)을 찾아 갱신 대상으로 보고한다.
  `--apply` 없이는 리포트만 출력(dry-run), `--apply` 시에만 해당 메타데이터를 갱신한다.
- **본문(`policy`/`screen_ref` 등) 자동 재생성은 하지 않는다** — 변경된 필드를 사람이 검토해
  내용을 갱신하고, 확정 출처가 생기면 `provenance.<field>.source`를 `deployment`에서 해당 출처로
  승격하는 것은 ③ 구조화/생성·④ 반영 영역으로 여전히 사람이 수행한다.
- 자세한 사용법은 [scripts/README.md](./scripts/README.md) 참고.

## 범위 명시
- 이 문서는 **흐름 설계도**다. 분기·재시도·에러 처리·실제 그래프(LangGraph 등) 정의는 후속에서 다룬다.
- 입출력 타입·함수 시그니처 계약은 [interfaces.md](./interfaces.md) 참조.
