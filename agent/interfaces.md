# 자동 업데이트 에이전트 — 인터페이스 계약 (스텁)

> **구현 코드는 포함하지 않는다.** contract-first — 인터페이스(타입·함수 시그니처)를 먼저 확정하고 구현은 후속에서 붙인다.
> 모든 계약은 [schema/kb-entry.md](../schema/kb-entry.md)의 KB 엔트리 스키마를 단일 기준으로 삼는다. 흐름 개요는 [flow.md](./flow.md) 참조.

## 공유 타입 — `KBEntry`

`schema/kb-entry.md` 프런트매터와 1:1 대응한다 (스키마 변경 시 이 타입도 함께 갱신).

```ts
type DiataxisType = "tutorial" | "how-to" | "reference" | "explanation";
type FieldName = "title" | "description" | "policy" | "screen_ref" | "acceptance" | "visual";

// "deployment" 출처(provenance.<field>.deployment)의 세부 — agent/snapshots/<source_id>.json과 대응
// (F8 · scripts/fetch_deployment_source.py가 생성·갱신)
interface DeploymentRef {
  source_id: string;        // 배포 소스 식별자 — agent/snapshots/<source_id>.json 파일명과 대응
  url: string;               // 배포 URL (production alias — 항상 최신 배포를 가리켜야 함)
  deployment_ref?: string;   // 배포 ID·commit SHA — best-effort, 확인 불가 시 빈 문자열
  content_hash: string;      // 페치 시점 해당 섹션 텍스트의 sha256
  fetched_at: string;        // ISO 8601 — 페치 시각
  deployed_at?: string;      // ISO 8601 — Last-Modified 헤더 기반 best-effort, 빈 문자열 가능
  section_anchor: string;    // agent/snapshots/<source_id>.json의 sections 키
}

interface Provenance {
  source: "PRD" | "화면설계서(PDF)" | "protect-go-knowledge" | "frontend_code" | "ticket" | "Figma" | "deployment";
  ref?: string | string[];  // 파일 경로 · 컴포넌트명 · 티켓 ID 등 — 2개 이상이면 배열
  version?: string;         // 출처 버전 — 증분 업데이트 판단 기준
                             // frontend_code는 "<저장소명>@<commit sha>" 형식 (scripts/check_screen_ref.py가 파싱)
  captured_commit?: string;  // screen_ref 전용 — 화면 캡처(PNG) 시점의 "<저장소명>@<sha>"
                             // scripts/capture_screens.py가 캡처 성공 시 이 한 줄만 갱신. version과 별개 신호
  authority?: "draft";       // source: "deployment"일 때만 명시. 그 외 출처는 기본 확정(미기재)
  deployment?: DeploymentRef; // source: "deployment"일 때만 사용
}

// screen_ref 구조형 — 화면 캡처 대상 정의 (schema/kb-entry.md "screen_ref 구조형"과 1:1)
// scripts/capture_screens.py의 입력. 좌표 하드코딩 금지 — 셀렉터로 요소를 지정한다.
interface ScreenCaptureSpec {
  base_url_source: string;   // F8 배포 소스 식별자 — agent/snapshots/<id>.json의 url 재사용
  base_url?: string;         // 스냅샷이 없는 소스(로그인 필요 배포 등)의 직접 URL
  requires_auth?: boolean;   // true면 agent/.auth/state.json 세션으로 페이지를 연다
  viewport?: { width: number; height: number };
}

interface Hotspot {
  n: number;        // 본문 "절차" ol 번호와 일치시키는 핀 번호
  selector: string; // Playwright 셀렉터 (CSS · :has-text() 등)
  nth?: number;     // 같은 셀렉터가 여러 개일 때 인덱스 (0부터, -1 = 마지막)
  label: string;
}

// 절차 단계별 캡처 장면 — 가이드에서 슬라이드(이전/다음)로 표시
interface Shot {
  id: string;          // PNG 파일명(<entry-id>--<shot-id>.png)에 사용
  title?: string;      // 슬라이드 캡션 제목
  steps?: number[];    // 이 장면이 다루는 본문 "절차" 번호 (캡션용)
  actions?: { click: string; nth?: number }[];  // 캡처 전 읽기 전용 인터랙션(모달·탭·드롭다운 열기)만
  crop?: string;       // 셀렉터 bounding box 주변만 잘라 캡처 (확대 장면)
  hotspots: Hotspot[];
}

interface ScreenRefStruct {
  notes: string;            // 기존 문자열형 screen_ref 내용
  page?: string;            // base URL 기준 상대 경로
  capture?: ScreenCaptureSpec;
  shots?: Shot[];           // 장면 목록 — 없으면 hotspots를 단일 장면으로 처리
  hotspots?: Hotspot[];
}

interface KBEntry {
  id: string;                 // "<category>.<slug>"
  category: string;           // 예: "project-creation" | "detection-node"
  diataxis_type: DiataxisType;
  title: string;
  description: string;
  policy: string;
  screen_ref: string | ScreenRefStruct;  // 캡처 대상 엔트리만 구조형 사용
  acceptance: string;
  visual: string;
  provenance: Partial<Record<FieldName, Provenance>>;
  language: "ko" | "en";
  updated_at: string;         // ISO 8601
}
```

## 모듈 인터페이스 (4단계 — flow.md 대응)

각 모듈은 입력을 받아 다음 모듈이 바로 사용할 산출만 반환한다. (시그니처·계약만 — 구현 없음)

### ① 판별 — `classify`
```ts
// "deployment"는 "prototype"의 라이브-호스팅 변형 — 정적 텍스트 추출이 가능한 배포 URL을
// 가진 프로토타입(F8 적격성 체크 통과)일 때 이 kind로 분류한다.
type SourceKind = "PRD" | "screen_design_pdf" | "frontend_code" | "prototype" | "Figma" | "ticket" | "deployment";

interface SourceChange {
  kind: SourceKind;
  ref: string;          // 변경된 산출물 식별자(파일 경로 · 페이지 · 컴포넌트 · 티켓 ID)
  diff_summary: string; // 무엇이 바뀌었는지 요약
}

interface ClassifyResult {
  change_type: "new" | "update";
  affected_fields: FieldName[];
  candidate_categories: string[];   // 영향받는 도메인·카테고리 추정
}

declare function classify(change: SourceChange): ClassifyResult;
```

### ② 검색/매핑 — `locate`
```ts
interface LocateResult {
  entry_id: string | null;   // null이면 신규 엔트리
  matched_fields: FieldName[];
}

declare function locate(result: ClassifyResult, kb: KBEntry[]): LocateResult;
```

### ③ 구조화/생성 — `compose`
```ts
interface ComposeInput {
  locate: LocateResult;
  sources: Partial<Record<SourceKind, unknown>>;  // 필드별 권위 소스 원문(추출된 형태)
}

interface ComposeResult {
  entry: Partial<KBEntry>;               // 신규면 전체, 수정이면 변경된 필드만
  provenance_patch: Partial<Record<FieldName, Provenance>>;
}

declare function compose(input: ComposeInput): ComposeResult;
```

### ④ 반영 — `publish`
```ts
interface PublishResult {
  written_path: string;   // kb/<category>/<diataxis_type>/<id>.md
  rebuilt: boolean;       // guide/ 빌드 트리거 여부
}

declare function publish(result: ComposeResult): PublishResult;
```

## 호출 순서 계약
`classify → locate → compose → publish`. 각 단계는 바로 이전 단계의 산출만 입력으로 받는다(역방향 의존 없음). 분기·재시도·실패 처리는 후속에서 LangGraph 등으로 구체화한다.

## 비범위 (이 문서가 정의하지 않는 것)
- 각 함수의 실제 구현(프롬프트, 추출 로직, 저장소 연동)
- 에러·재시도·동시성 처리
- 트리거 배선(웹훅, 폴링 등)
