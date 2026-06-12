# HANDOFF — Protect Go 가이드 · KB 구축

다음 세션이 이어받을 수 있도록 현재 상태를 정리한 문서. 작업 시작 전 [CLAUDE.md](./CLAUDE.md)를 먼저 읽을 것.

## 현재 상태 (V1 Features F1~F8)

| Feature | 상태 | 비고 |
|---|---|---|
| F1 (KB 엔트리 스키마 적용) | 완료 | `schema/kb-entry.md` 기준, 엔트리 3개에 적용 |
| F2 (실제 엔트리 1~2개 제작 + 비교 검증) | 완료 + 확장 | KB 엔트리 11개 — Diátaxis 8칸(도메인 2 × 유형 4) 전부 채움. F5 비교 기준은 `origin/develop`(version: `8b277532d3ec`) |
| F5 (소스 변경 영향 수동 점검) | 완료 | `agent/scripts/check_screen_ref.py` — 최근 점검: 2026-06-10, `--fetch` 포함 3개 엔트리 모두 `up_to_date` |
| F6 (가이드 웹페이지 출력) | 완료 (최소 구현 + 화면 캡처 보강) | `guide/build.py` → `guide/dist/`. 실제 화면 캡처(강조 테두리+번호 핀) 연동 — `agent/scripts/capture_screens.py`, 3개 엔트리 모두 캡처 완료 |
| F7 (kb/ → guide/ 자동 빌드·CI) | 미착수 | P2. "V1 종료 시점까지 수동 빌드 확인 수준으로 충분" (`09-priorities.md`) |
| F8 (라이브 배포 소스 참조 + 동기화 트리거) | 완료 + 첫 실사용 | P2. `agent/scripts/fetch_deployment_source.py` — 스냅샷 2개(`pg-relabel-prototype`, `protect-go-react`). `protect-go-react`(이상 상황 레이어 프로토타입, SPA라 `--render` 페치)는 `detection-node.anomaly-alert-guide-sourcing`(explanation)의 `policy`가 draft 출처로 실제 참조 중 |

`prd-flow/protect-go-ai-guide/` — Macro Gate 1 → 1.5 → 2 통과, wireframe Phase 2(화면 7개) 완료, Notion 업로드 완료.

## 저장소·소스 규칙

- 이 가이드 저장소의 원격: `https://github.com/seoyeunglee/protectgo_guide.git` (main).
  git identity는 저장소 로컬 설정(seoyeunglee / syoo0183oo@gmail.com).
- **프론트엔드 코드(ProtectGO-ENT-FE)는 이 저장소에 올리지 않는다** — 코드는
  `https://github.com/idbrnd/ProtectGO-ENT-FE.git`에서 로컬 클론
  (`C:\Users\idb\AI-DLC\ProtectGO-ENT-FE`, `PROTECTGO_FE_REPO`로 변경 가능)으로 받아
  경로·커밋 참조만 KB에 기록한다. 받기: `python agent/scripts/check_screen_ref.py --pull`.
- 알림 센터(2026.06.04 개편) 구현 코드는 FE의 `origin/develop`(= `origin/qa`,
  `8b277532d3ec`) `src/components/Header/AppHeader/AlertCenterDrawer/`에 있음 —
  현재 F5 비교 기준 브랜치(`feat/video-monitoring-widget`)에는 없어 provenance.ref 제외,
  엔트리 notes에 기록(비교 기준을 develop으로 전환할 때 승격).

## 이번 세션에서 변경·생성한 파일 — F6 보강 (실제 화면 캡처 + 강조 테두리 + 번호 핀)

### 신규 스크립트 (`agent/scripts/`, 모두 수동 실행 — 서로 자동 호출하지 않음)
- `auth_login.py` (신규) — headed 브라우저에서 **사람이 직접** 로그인 후 storage_state를
  `agent/.auth/state.json`에 저장. 자격증명 하드코딩·자동 입력 없음, 로그인 URL은 인자/환경변수.
- `capture_screens.py` (신규) — `screen_ref` 구조형(`page`/`capture`/`shots`)을 읽어
  로그인 세션으로 화면을 열고, hotspot 요소에 강조 테두리(CSS 주입)를 입혀 PNG 캡처.
  **절차 단계별 멀티샷**: 장면(shot)마다 페이지를 새로 열고 `actions`(읽기 전용 클릭 —
  모달·탭·드롭다운 열기)를 수행해 중간 단계 화면까지 캡처, `crop`으로 요소 확대 장면 지원.
  `--only <id>` / `--stale-only`(manifest `captured_commit` vs 현재 FE 커밋 비교) 지원.
  산출물: `guide/assets/screens/<entry-id>--<shot-id>.png` + `manifest.json`(장면 목록·핀
  좌표·캡처 시각·커밋) + 엔트리 `provenance.screen_ref.captured_commit` 한 줄 갱신.
  세션 만료/셀렉터 미발견 시 해당 엔트리(장면)만 건너뛰고 안내 (전체 중단 없음).
- `check_screen_ref.py` (확장) — 기존 코드 참조 점검에 더해, capture 대상 엔트리의
  **캡처 상태**(`capture_up_to_date`/`capture_stale`/`not_captured`)를 별개 신호로 병행 보고.
- `requirements.txt` (갱신) — `playwright` 추가 (`playwright install chromium` 필요).

### 스키마·KB 엔트리
- `schema/kb-entry.md` (갱신) — "`screen_ref` 구조형" 절 추가: `{ notes, page, capture
  (base_url_source/base_url/requires_auth/viewport/hide), hotspots(n/selector/label) }`.
  좌표 하드코딩 금지(셀렉터 기반), `hotspots[].n` = 본문 "절차" ol 번호,
  `provenance.screen_ref.captured_commit` 정의(코드 검증 시점 `version`과 별개 신호).
- `계획_Protect_Go_가이드_에이전트.md`·`agent/interfaces.md` (갱신) — 스키마 변경 동기화
  (`ScreenRefStruct`/`ScreenCaptureSpec`/`Hotspot` 타입, `Provenance.captured_commit`).
- KB 엔트리 3개 (갱신) — `screen_ref`를 문자열에서 구조형으로 전환(기존 내용은 `notes`로
  이동)하고 절차 단계별 `shots` 정의:
  - `invite-member`: page `/account-management`, 장면 3장 — 계정 관리 화면(단계 1·2) /
    멤버 초대하기 모달(단계 3·4·5, 모달 열기 action) / 초대 관리 탭(단계 6, 탭 클릭 action)
  - `switch-project`: page `/dashboard`, 장면 2장 — 헤더(단계 1) / 드롭다운 열림(단계 2).
    프로젝트 항목 클릭은 실제 전환이 일어나 action 금지, 단계 3·4(진행률 팝업)는 캡처 제외
  - `configure-event-setting-node`: page `/detection-setting/225`(dev 프로젝트 "듀얼 카메라
    테스트" 시나리오 — 데이터 의존, 시나리오 변경 시 이 값만 갱신), 장면 2장 — 캔버스 전체
    (단계 1) / 노드 확대 `crop`(단계 2·4·5·6), `hide: [".react-flow__minimap"]`(미니맵이
    저장 버튼을 가림). 단계 3(융합 기간)은 개별 이벤트 시나리오라 미노출 — 캡처 제외

### 가이드 렌더 연동 (`guide/`)
- `guide/build.py` (갱신) — **캡처를 호출하지 않고** `guide/assets/screens/`의 PNG·manifest만
  읽어 엔트리 페이지에 캡처 figure 렌더링. 장면이 여러 장이면 **슬라이드**("‹ 이전 / 다음 ›"
  버튼 + "2 / 3" 카운터 + 장면별 "단계 3·4·5 · 멤버 초대하기 모달" 캡션, vanilla JS 인라인)로
  표시. 번호 핀은 bounding box 기반 오버레이, 캡션에 "마지막 캡처"·재캡처 커맨드 안내.
  캡처가 없으면 placeholder 표시 후 정상 빌드. "절차" 절의 `<ol>`에 `steps` 클래스를 부여해
  본문 번호와 핀 번호 모양을 일치시킴.
- `guide/templates/style.css` (갱신) — `.guide-figure`/`.highlight-box`/`.hotspot`/
  `.guide-figure-placeholder`/`ol.steps`/`.guide-slider`(슬라이드·내비게이션) 스타일 추가.
- `guide/assets/screens/` (신규, 커밋 대상) — 장면별 PNG 7장 + `manifest.json`
  (invite-member 3장 / switch-project 2장 / configure-event-setting-node 2장).

### 기타
- `.gitignore` — `agent/.auth/`(세션 파일 커밋 금지), `__pycache__/` 추가.
- `agent/scripts/README.md`·`guide/README.md` — 사용법·판정 규칙·세션 만료 절차 문서화.
- 검증: 3/3 엔트리·7/7 장면 캡처 성공(모달·드롭다운 열림 상태, 노드 확대 crop, 핀 좌표 정상),
  `--stale-only` 전체 skip 확인, `check_screen_ref.py --fetch` 코드/캡처 신호 동시 보고 확인,
  빌드된 페이지를 브라우저로 열어 슬라이드 동작(이전/다음·카운터·랩어라운드·장면 캡션) 확인.
  dev 프로젝트 앱 호스트는 `http://13.209.124.163`(로그인은 `https://protectgo.kr/login`)
  — 호스트 변경 시 `PG_CAPTURE_BASE_URL_PROTECTGO_DEV`로 덮어쓰기.

### 추가 4 — PRD 구현 현황 반영 · develop 전환 · draft 승격 · 콘텐츠 2차 (2026-06-12)

- **PRD 갱신**: Notion 라이브 PRD + repo 미러에 "구현 현황 (V1)" 표(F1~F8 상태·산출물) 추가,
  Status를 "V1 구현 완료 (기획팀 검토 대기)"로, 산출물 저장소 링크 명시.
- **F5 비교 기준 develop 전환**: `resolve_compare_ref`가 `PROTECTGO_FE_COMPARE_REF` 환경변수 >
  `origin/develop`(기본) > upstream 순으로 기준을 정함 — 체크아웃 없이 ref로만 비교해
  로컬 클론의 작업 브랜치를 건드리지 않음. 전환 후 5개 엔트리 review_needed → 변경 파일
  7개 diff 검토(전부 i18n 래핑·리팩터·알림 센터 통합 — 본문 영향 없음) → version을
  `develop@8b277532d3ec`로 승격, AlertCenterDrawer 4개 파일을 handle-anomaly-situation의
  provenance.ref로 정식 승격, 5개 엔트리 재캡처(13장면) — 전체 최신 확인.
- **draft → 확정 승격 첫 사례 완료**: 이상 상황 레이어 구현이 develop
  `src/pages/AbnormalSituation`(상세·조치 이력 기록)에 반영된 것을 확인 →
  `anomaly-alert-guide-sourcing`의 policy 출처를 deployment(draft, protect-go-react)에서
  frontend_code(확정)로 교체. 본문 "예고된 개편의 승격" 절에 추적→승격 이력 3단계 기록.
  단 feature flag `abnormalSituationListWidget`로 정식 공개 전이라 how-to 본문·캡처 확장은
  공개 후로 보류. protect-go-react 스냅샷은 이력으로 보존(갱신 종료).
- **콘텐츠 2차**: `project-creation/explanation/project-workspace-concepts.md`(프로젝트·
  소유/참여·권한·생명주기 개념), `detection-node/reference/node-catalog.md`(노드 카탈로그 +
  공통 사양) — **Diátaxis 8칸 전부 채움 (KB 11개, 가이드 22페이지)**.

### 추가 3 — 콘텐츠 확장 1차 (P0: 빈 Diátaxis 칸 채우기)

- 신규 KB 엔트리 4개 (UX 라이팅 원칙 적용 + editorial 가드레일 자가 점검):
  - `kb/project-creation/tutorial/create-first-project.md` — "첫 프로젝트 만들기".
    policy 확정 출처 `protect-go-knowledge/03-project-lifecycle.md#4`(생성 3단계·소유 한도·
    접속 흐름). 화면이 Auth 앱 영역이라 **캡처 없음**(본문에 안내 블록) — Auth 저장소·세션
    확보 후 보강.
  - `kb/detection-node/tutorial/create-first-scenario.md` — "첫 탐지 시나리오 만들기".
    policy 확정 출처 `kb/_sources/policy/detection-scenario.md`(생성 팝업·탐지 시작·초기화).
    캡처 3장면(목록/생성 팝업 — 모달 열기 action/캔버스), 핀 5개.
  - `kb/project-creation/reference/permission-matrix.md` — "권한별 기능 레퍼런스".
    `protect-go-knowledge/02#1` 권한 4종 + 행동 매트릭스(미확정 항목 * 표기).
  - `kb/detection-node/explanation/scenario-node-concepts.md` — "탐지 시나리오와 노드 —
    개념 이해". `protect-go-knowledge/04·05` 노드 6종·좌→우 흐름·탐지 유형 5종.
  - 4개 엔트리 모두 관련 가이드 상호 링크(튜토리얼 → 레퍼런스/하우투/설명 동선).
- `capture_screens.py` (보완) — 페이지 로드 후 2초 안정화 대기 추가: SPA 콜드 로드 시
  첫 장면 hotspot 미발견(간헐) 문제 수정.
- 검증: 캡처 3/3장·핀 5/5, 빌드 20페이지·9엔트리, F5 점검 전체 최신.

### 추가 2 — 가이드 산출물 점검·디자인·pull 플로우

- `check_screen_ref.py` (확장) — `--pull` 추가: 로컬 FE 클론을 원격 최신으로 fast-forward
  갱신(더티/분기 시 중단). "배포 버전 업데이트 루틴"(pull → stale 캡처 → F8 재페치 → 빌드)을
  `agent/scripts/README.md`에 문서화하고 엔드투엔드 실행 확인.
- `guide/build.py` (수정) — 본문 첫 `<h1>` 제거(페이지 타이틀과 중복되던 문제, 전 엔트리 공통),
  steps 번호 스타일을 "절차" 외 "…흐름" 절에도 적용, 캡처 placeholder 문구를 어조 규칙에 맞게
  교정("화면 캡처가 아직 없습니다. … 실행이 필요합니다.").
- `guide/templates/style.css` (확장) — 디자인 폴리시 레이어: h2 구분선, 표 줄무늬·헤더 배경,
  blockquote 콜아웃(draft 안내), 카드 음영·호버, 본문 링크 스타일.
- `handle-anomaly-situation.md` — 알림 유형 표의 미확인 "—" 셀 제거(확인된 3종만 표,
  나머지는 문장으로), 시각 표기 화살표 나열 교정. `anomaly-alert-guide-sourcing.md` —
  반영 흐름에 프론트엔드 코드 pull 단계 문단 추가.
- editorial-reviewer 체크리스트로 빌드 페이지 재점검(H1 중복 = 🔴 구조, 표 모호 셀 = 🟡) 후
  전부 수정, 스크린샷으로 최종 레이아웃 확인.

### 추가 — 이상 상황 알림 가이드 (F8 파이프라인 첫 실사용)

- `agent/scripts/fetch_deployment_source.py` (확장) — `fetch --render` 옵션 추가: 정적 페치가
  적격성 실패하는 SPA 배포를 Playwright로 렌더해 페치. 스냅샷에 `render: true`가 기록되어
  재페치 시 자동 적용. 랜딩 화면 텍스트만 추출(탭·모달 내용 제외)하는 한계는 README에 명시.
- `agent/snapshots/protect-go-react.json` (신규) — 이상 상황 알림 프로토타입
  (`https://protect-go-react.vercel.app/`) 스냅샷. 섹션은 `intro` 1개(시맨틱 헤딩 없는 SPA).
- `kb/detection-node/how-to/handle-anomaly-situation.md` (신규) — "이상 상황 알림 확인하기".
  **실제 솔루션 기준**: `policy`는 확정 출처 `protect-go-knowledge/11-situation-agent.md#I`
  (알림 센터 2026.06.04 개편 정책), 절차·이미지·핀은 실제 제품 화면(protectgo-dev).
  캡처 shots 3장(헤더 99+ 배지 / 알림 센터 상황 탭 — 99+·상황 탭 클릭 action /
  이상 발생 알림 드로어 — 종 아이콘 클릭 action), 핀 6개, 와이드 뷰포트 1920×950
  (알림 센터 드로어가 우측에 보이도록). 프로토타입 내용은 "개편 예정 미리보기" 1문단으로만
  남기고 explanation 엔트리로 이동.
  ※ 처음에 프로토타입 화면으로 캡처했다가 "가이드 이미지는 실제 솔루션만" 지적을 받고
  재작업 — 규칙을 schema·README에 명문화했다(아래 결정 8).
- `kb/detection-node/explanation/anomaly-alert-guide-sourcing.md` (신규) — "이 가이드가
  만들어지는 방식 — 출처와 반영 흐름". 출처별 역할 표, draft 출처 규칙(권위·승격·
  **이미지는 실제 화면만**), 반영 흐름 5단계(페치 → 변경 감지 → 사람 검토 → 갱신 → 빌드),
  "예고된 개편 추적 — 이상 상황 레이어" 절(프로토타입 draft 요약 — 이 엔트리의 `policy`가
  deployment draft 출처를 참조, `section_anchor: intro`, 이미지 없음). how-to와 상호 링크.
- 본문 작성에 `/general-ux-writing`(어조 3종 분리·현재 단정/미래 추측 시제·행동 유도) 적용,
  `/editorial-reviewer`(AI 투 11패턴·화살표 가드레일·사실 정확성) 검수 후 교정 반영
  (배너 동작 사실 오류 2건 수정, 화살표 나열 → 번호 목록, em-dash 절 분리, draft·드리프트 첫 등장 풀이).
- 검증: fetch `--render` 재현성(재페치 변경 없음), `sync` dry-run no-op, 캡처 3/3장,
  빌드 16페이지·5엔트리, 교차 링크 동작 확인.

## 직전 세션 — F8 (라이브 배포 소스 참조 + 동기화 트리거)

### 스키마·에이전트 스텁 — `deployment`(draft) 출처 정의
- `schema/kb-entry.md` (갱신) — "라이브 배포 소스 (`deployment`) — draft 권위" 절 추가.
  `provenance.<field>.deployment` 키(`source_id`/`url`/`deployment_ref`/`content_hash`/
  `fetched_at`/`deployed_at`/`section_anchor`), 권위 등급(`schema 표(확정) > deployment(draft)`),
  적격성 기준(정적 텍스트 추출 가능 여부) 정의.
- `agent/interfaces.md` (갱신) — `DeploymentRef` 인터페이스 추가, `Provenance.source`에
  `"deployment"`와 `authority?: "draft"` / `deployment?: DeploymentRef` 필드 추가, `SourceKind`에
  `"deployment"` 추가.
- `agent/flow.md` (갱신) — 입력 소스 다이어그램·트리거 표에 "라이브 배포 소스" 추가,
  `fetch_deployment_source.py`의 `fetch`/`sync` 역할을 설명하는 절 추가.

### 점검·동기화 도구 (신규)
- `agent/scripts/fetch_deployment_source.py` (신규, stdlib만 사용)
  - `fetch <source_id> [--url <url>]` — production alias URL을 페치해 `section_anchor`
    단위로 정적 텍스트 추출·해시, `agent/snapshots/<source_id>.json`에 스냅샷 저장,
    직전 스냅샷과 비교해 변경/추가/삭제 섹션을 표시.
  - `sync <source_id> [--apply]` — 변경된 섹션을 참조하는 KB 필드를 찾아 리포트(dry-run),
    `--apply` 시 `provenance.<field>.deployment`의 `content_hash`/`fetched_at`/`deployed_at`만
    라인 단위로 패치(`patch_deployment_block`, YAML 전체 재작성 없음).
- `agent/snapshots/pg-relabel-prototype.json` (신규) — `https://pg-relabel-prototype.vercel.app/`
  최초 fetch 결과(섹션 22개, `content_hash` 기록). 다음 세션 diff 비교를 위해 커밋 대상.
- `agent/scripts/README.md` (갱신) — `fetch_deployment_source.py` 사용법·출력 상태표·
  "다음 KB 갱신 시 사용 흐름"·범위 밖 항목 추가.

### PRD·우선순위·와이어프레임 반영
- `prd-flow/protect-go-ai-guide/auto-backward/07-features.md` (갱신) — F8 절 신규 추가,
  F5에 "라이브 배포 소스" 점검 문항 2개 추가(콘텐츠 변경 여부 / draft→확정 승격 여부).
- `prd-flow/protect-go-ai-guide/auto-backward/09-priorities.md` (갱신) — F8을 P2(F7과 동일
  그룹)에 추가, "순서 제약 요약"에 F8 반영.
- `prd-flow/protect-go-ai-guide/notion-pages/full-prd.md` (갱신) — 기능 정의 표·우선순위 절에
  F8 행 추가, "최종 수정" 날짜 갱신(2026-06-08 → 2026-06-10).
- Notion 라이브 PRD 페이지(`37a7d156-8e06-8107-96a3-e3c689865eff`, MCP로 갱신·재조회 확인) —
  위와 동일하게 기능 정의 표·우선순위·최종 수정일 반영.
- `prd-flow/protect-go-ai-guide/wireframe/screens/06-SourceChangeChecklist.jsx` (갱신) —
  `SOURCE_OPTIONS`/`CHECKLISTS`에 `"deployment"` 추가(점검 문항 2개), `[6-4]` "최신 배포로
  동기화" 버튼 추가(시각적 mock — `onClick`은 비어 있음, 실제 동작은 CLI).
- `prd-flow/protect-go-ai-guide/wireframe/inspection/policies.js` (갱신) — `[6-4] deploy-sync`
  레지스트리·`DESCRIPTIONS` 항목 추가, `[6-0]`/`[6-1]` 설명에 새 옵션·정책 문장 반영.
- `npm run build` (wireframe) 로 JSX 구문 검증 후 `dist/` 삭제(빌드 산출물 미커밋).

## 주요 결정 사항 (F6 보강 — 화면 캡처)

1. **captured_commit은 manifest + provenance 양쪽 기록** (사용자 선택): `capture_screens.py`가
   캡처 성공 시 `provenance.screen_ref.captured_commit` **한 줄만** 라인 단위로 패치한다.
   엔트리 본문·다른 필드는 건드리지 않으며, `version`(코드 검증 시점)과는 별개 신호로 둔다.
2. **screen_ref 매핑 전환 + 3개 엔트리 모두 적용** (사용자 선택): 기존 문자열은 `notes` 키로
   이동. `provenance.screen_ref`(점검 도구가 읽는 키)와 빌드 출력은 영향 없음 확인.
3. **셀렉터 전략**: FE가 CSS Modules(해시 클래스)이고 `data-testid`가 없어, 텍스트 기반
   (`button:has-text("멤버 초대하기")`)·부분 클래스(`[class*="title_container"]`)·라이브러리
   안정 클래스(`.react-flow__node`) 셀렉터를 사용. 좌표 하드코딩 없음.
4. **로그인 세션**: Playwright storage_state 방식. `auth_login.py`는 사람이 직접 입력하는
   headed 설계이며, 이번 검증의 1회 로그인은 임시 스크립트(실행 후 삭제, 자격증명은
   환경변수로만 전달)로 수행 — 저장소 어디에도 자격증명 없음. `agent/.auth/`는 gitignore.
5. **base URL 우선순위**: 환경변수 `PG_CAPTURE_BASE_URL_<SOURCE_ID>` > F8 스냅샷 url >
   `capture.base_url`. dev 프로젝트 앱은 로그인 뒤에만 접근 가능해(F8 fetch 불가) ③ 사용.
6. **`capture.hide`**: 강조 대상을 가리는 오버레이(react-flow 미니맵)를 캡처에서만 숨기는
   선택 키를 스키마에 추가 — 캔버스 엔트리의 "설정 저장" 버튼 가림 문제 해결.
7. **독립 실행 원칙 준수**: auth_login / capture_screens / check_screen_ref / build 네 도구는
   서로를 자동 호출하지 않는다. capture는 git fetch도 하지 않음(원격 비교는 check --fetch 선행).

## 주요 결정 사항 (F8)

1. **draft 권위 + 권위 등급 고정**: `provenance.<field>.source: deployment`은 항상
   `authority: draft`로 표기하고, 권위 등급은 `schema 표(확정) > deployment(draft)`로
   정의했다. 기존 KB 엔트리 3개는 모두 확정 출처를 쓰므로 이번 변경은 추가뿐 — 기존
   엔트리 retrofit은 하지 않았다.
2. **deployment_ref는 V1에서 비워둠 (Vercel API 미연동)**: 커밋 SHA 등 정확한
   `deployment_ref` 조회는 `VERCEL_TOKEN`이 필요해 V1 범위에서 제외했다(사용자 선택:
   "content_hash/fetched_at만 사용"). production alias URL + `content_hash` +
   `fetched_at`/`deployed_at`(Last-Modified 헤더, best-effort)만으로 "최신 배포 변경 감지"를
   구현했다.
3. **section_anchor = 헤딩 텍스트 슬러그**: 샘플 페이지에 안정적인 DOM id가 없어
   `html.parser.HTMLParser`로 h1~h3 텍스트를 슬러그화해 섹션 경계로 사용했다(신규
   의존성 없이 stdlib만 사용).
4. **파일 위치**: 새 최상위 폴더 대신 `agent/scripts/`(스크립트)·`agent/snapshots/`
   (스냅샷, `agent/` 하위 신규 디렉터리)에 배치했다(사용자 선택). 스냅샷은 다음 세션
   diff 비교에 필요하므로 커밋 대상으로 둔다.
5. **트리거 형태 = CLI + 와이어프레임 mock 버튼**: 실제 동작 가능한 내부 어드민 화면이
   없어 `fetch`/`sync` CLI를 1차 트리거로 하고, `06-SourceChangeChecklist.jsx`에는
   시각적 mock 버튼만 추가했다(클릭 동작 미구현). CLAUDE.md Hard Stop H1(자동 트리거
   배선 금지)을 준수.
6. **`sync --apply`의 안전한 패치**: YAML을 통째로 재직렬화하면 프런트매터 포맷·주석이
   깨질 수 있어, `provenance.<field>.deployment` 블록 내 `content_hash`/`fetched_at`/
   `deployed_at` 세 줄만 정규식으로 치환하는 라인 단위 패처(`patch_deployment_block`)를
   작성·검증했다("증분 반영, 전체 재작성 금지" 원칙).
7. **F8 우선순위 = P2 (F7과 동일 그룹)**: draft 출처를 다루므로 확정 출처 우선순위
   (F1·F4)가 먼저 자리잡은 뒤 착수하는 후반부 보조 기능으로 분류했다(사용자 선택).

## 다음에 할 일

- [ ] **캡처 세션 직접 생성**: 이번 검증에 쓴 `agent/.auth/state.json`은 임시 생성본 —
      만료되면 사용자가 `python agent/scripts/auth_login.py --url https://protectgo.kr/login`으로
      직접 재생성한다 (캡처 실행 시 "세션 만료" 안내가 나오면 동일).
- [ ] **캔버스 캡처의 데이터 의존성 점검**: `configure-event-setting-node`의 page는 dev
      프로젝트 시나리오 225("듀얼 카메라 테스트")에 의존 — 시나리오가 삭제·변경되면 엔트리의
      `page` 값만 갱신 후 `capture_screens.py --only detection-node.configure-event-setting-node` 재실행.
- [ ] **F8 실제 KB 적용**: 확정 출처가 아직 없는 신규 KB 필드(또는 신규 엔트리)에
      `provenance.<field>.deployment`(source_id: `pg-relabel-prototype` 등)를 채워 넣고
      `fetch` → `sync` → `sync --apply` 흐름을 엔드투엔드로 1회 시연.
- [ ] **draft → 확정 승격 절차 점검**: F8로 채운 draft 필드가 이후 확정 출처(PDF/코드)로
      교체되는 흐름(권위 등급 교체)을 1건 이상 시연해 "승격 게이트"가 실제로 동작하는지 확인.
- [ ] **콘텐츠 확장**: project-creation/detection-node 각 도메인의 tutorial/reference/explanation
      엔트리 작성 (현재는 how-to만 존재, 나머지 3유형은 `_index.md` placeholder만 있음).
      신규 엔트리를 추가한 뒤 `guide/build.py`를 다시 실행하면 사이드바·홈 카운트·목록에 자동 반영된다.
- [ ] **F7 착수 여부 판단**: `kb/` 변경 시 `guide/dist/` 자동 재빌드(예: pre-commit hook, 워치 스크립트)가
      필요한 시점인지 사용자와 논의. CLAUDE.md의 범위 외 항목("팀 파이프라인 실연동")과의 경계를
      먼저 확인할 것.
- [ ] **정기 점검 루틴에 F8 포함**: `check_screen_ref.py --fetch`와 함께
      `fetch_deployment_source.py fetch <source_id>`도 주기적으로 재실행해 배포 변경 여부를
      확인할지 결정(현재는 수동 1회 실행만 한 상태).
- [ ] (선택) "역할별로 찾아보기" 카드를 KB 엔트리 프런트매터에 페르소나 메타데이터를 추가해
      데이터 기반으로 생성할지, 현재처럼 고정 카드로 유지할지 — 엔트리 수가 늘어나면 재검토.

## 관련 테스트·확인 커맨드

```powershell
# F5 — screen_ref provenance 점검 (모두 up_to_date여야 정상)
cd agent/scripts
python check_screen_ref.py
python check_screen_ref.py --fetch     # GitHub 최신 커밋과 비교 + 캡처 최신 여부 동시 보고
python check_screen_ref.py --pull      # 로컬 클론을 원격 최신으로 ff 갱신(pull) 후 점검

# 배포 버전 업데이트 루틴 (소스 데이터 받기 — agent/scripts/README.md 참고)
python check_screen_ref.py --pull && python capture_screens.py --stale-only
python fetch_deployment_source.py fetch protect-go-react      # draft 프로토타입 변경 감지

# F6 보강 — 화면 캡처 (모두 수동 실행, 서로 자동 호출 없음)
pip install -r agent/scripts/requirements.txt
playwright install chromium
python agent/scripts/auth_login.py --url https://protectgo.kr/login   # 로그인 세션 1회 저장 (사람이 직접 입력)
python agent/scripts/capture_screens.py --stale-only                  # 코드 바뀐 화면만 캡처
python agent/scripts/capture_screens.py --only project-creation.invite-member  # 특정 화면만

# F8 — 라이브 배포 소스 점검·동기화
cd agent/scripts
python fetch_deployment_source.py fetch pg-relabel-prototype           # 재페치 + 직전 스냅샷과 비교
python fetch_deployment_source.py sync pg-relabel-prototype            # 영향받는 KB 필드 리포트(dry-run)
python fetch_deployment_source.py sync pg-relabel-prototype --apply    # provenance.deployment 메타데이터만 갱신

# F6 — 가이드 정적 사이트 빌드
pip install -r guide/requirements.txt
python guide/build.py                  # guide/dist/ 생성, "빌드 완료: ... (14개 HTML 페이지, KB 엔트리 3개)" 출력

# F6 — 로컬에서 가이드 확인
python -m http.server --directory guide/dist 8000
# 브라우저에서 http://localhost:8000 접속
```

## 참고 문서
- [CLAUDE.md](./CLAUDE.md) — 프로젝트 규칙(2주 범위, 파일 생성 원칙, 범위 외 항목)
- [schema/kb-entry.md](./schema/kb-entry.md) — KB 엔트리 스키마 단일 기준 (F8: `deployment` 출처 정의 포함)
- [prd-flow/protect-go-ai-guide/auto-backward/07-features.md](./prd-flow/protect-go-ai-guide/auto-backward/07-features.md) — F1~F8 정의
- [prd-flow/protect-go-ai-guide/auto-backward/09-priorities.md](./prd-flow/protect-go-ai-guide/auto-backward/09-priorities.md) — 우선순위(P0/P1/P2) 및 F7/F8 순서 근거
- [agent/scripts/README.md](./agent/scripts/README.md) — `check_screen_ref.py`·`fetch_deployment_source.py`·`auth_login.py`·`capture_screens.py` 사용법
- [guide/README.md](./guide/README.md) — `guide/` 빌드·사이트 구조
