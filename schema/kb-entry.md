# KB 엔트리 스키마 (단일 기준)

> 이 파일이 KB 엔트리 구조의 단일 기준이다. 변경 시 [계획_Protect_Go_가이드_에이전트.md](../계획_Protect_Go_가이드_에이전트.md)의 스키마 섹션과 [agent/interfaces.md](../agent/interfaces.md)를 함께 갱신한다.

KB 엔트리 1개 = 파일 1개 (`kb/<category>/<diataxis_type>/<id>.md`).
메타데이터·`provenance`는 YAML 프런트매터로, 본문(설명·단계·캡션 등 가이드에 렌더링될 내용)은 그 아래에 작성한다.

엔트리는 단일 문서를 그대로 옮긴 것이 아니라 **여러 소스에서 필요한 부분만 뽑아 조합**한 결과다. 필드마다 권위(authoritative) 소스가 다르며, 이를 분리하는 것이 드리프트(문서-제품 불일치)를 줄이고 증분 업데이트를 가능하게 하는 핵심 설계다.

## 필드 정의 & 권위 소스

| 필드 | 설명 | 권위 소스 |
|---|---|---|
| `id` | 엔트리 고유 ID — `<category>.<slug>` | — |
| `category` | 카테고리 (예: `project-creation`, `detection-node`) | — |
| `diataxis_type` | `tutorial` \| `how-to` \| `reference` \| `explanation` | — |
| `title` | 제목 | PRD |
| `description` | 기능 목적·범위 한 줄 요약 | PRD |
| `policy` | 상태 전환·수식·예외·기본값·유효성 등 정책 텍스트 | 화면설계서(PDF) 정책 추출분(`kb/_sources/policy/`) + 화면 프로토타입 |
| `screen_ref` | 화면 세부 — 레이아웃·컴포넌트·실제 UI 텍스트·상태 | 프론트엔드 코드 참조 |
| `acceptance` | 동작 요구사항(AC) | 티켓 |
| `visual` | 시각 자료·variant | Figma — 후속(2주 범위는 빈 값) |
| `provenance` | 필드별 출처·버전. 증분 업데이트 기준(소스가 갱신되면 그 필드만 재생성) | — (메타) |
| `language` | `ko` \| `en` (2주 범위는 `ko` 우선) | — |
| `updated_at` | 마지막 갱신 일시 (ISO 8601) | — |

## 프런트매터 형식 (예시)

```yaml
---
id: project-creation.invite-member
category: project-creation
diataxis_type: how-to
title: 멤버 초대하기
description: 프로젝트 생성 중 또는 생성 후 멤버를 초대하는 방법
policy: |
  - (예) 초대 가능 인원·중복 이메일 처리 등 — 화면설계서 정책 추출분에서 채움
screen_ref: |
  - (예) 컴포넌트명 / 버튼 라벨 / 비활성 조건 — 프론트엔드 코드에서 채움
acceptance: |
  - [ ] (예) 동작 요구사항 — 티켓에서 채움
visual: ""   # Figma 연동 후속 — 2주 범위는 비움
provenance:
  title:       { source: "PRD", ref: "", version: "" }
  description: { source: "PRD", ref: "", version: "" }
  policy:      { source: "화면설계서(PDF)", ref: "kb/_sources/policy/<screen>.md", version: "" }
  screen_ref:  { source: "frontend_code", ref: "", version: "" }
  acceptance:  { source: "ticket", ref: "", version: "" }
language: ko
updated_at: "2026-06-08"
---

본문 — 가이드 웹페이지에 렌더링될 설명·단계·캡션 등을 마크다운으로 작성한다.
```

## `screen_ref` 구조형 — 화면 캡처 대상 정의 (선택)

`screen_ref`는 기본적으로 여러 줄 문자열(코드 참조 메모)이지만, 가이드 페이지에 **실제 화면
캡처 + 번호 핀**을 보여줄 엔트리는 아래 매핑 형태로 적는다. 기존 문자열 내용은 `notes` 키로
옮긴다. 좌표를 하드코딩하지 않고 셀렉터로 요소를 지정하는 것이 원칙이다.

```yaml
screen_ref:
  notes: |
    - (기존 문자열 형식의 코드 참조 메모 — 그대로 유지)
  page: "/account-management"            # base URL 기준 상대 경로
  capture:
    base_url_source: "protectgo-dev"     # 배포 소스 식별자 — agent/snapshots/<source_id>.json의 url 재사용(F8)
    base_url: "http://13.209.124.163"    # (선택) 스냅샷이 없는 소스의 직접 URL — 로그인 뒤에만 접근 가능한 배포 등
    requires_auth: true                  # 로그인 필요 여부 — true면 agent/.auth/state.json 세션 사용
    viewport: { width: 1440, height: 900 }
    # hide: [".react-flow__minimap"]     # (선택) 강조 대상을 가리는 오버레이를 캡처에서만 숨김
  shots:                                 # 절차 단계별 캡처 장면 — 가이드에서 슬라이드로 표시
    - id: account-page                   # 장면 식별자 — PNG 파일명(<entry-id>--<shot-id>.png)에 사용
      title: "계정 관리 화면"
      steps: [1, 2]                      # 이 장면이 다루는 본문 "절차" 번호 (슬라이드 캡션용)
      hotspots:
        - { n: 1, selector: "a[href='/account-management']",      label: "계정 관리 메뉴" }
        - { n: 2, selector: "button:has-text(\"멤버 초대하기\")", label: "멤버 초대하기 버튼" }
    - id: invite-modal
      title: "멤버 초대하기 모달"
      steps: [3, 4, 5]
      actions:                           # 캡처 전 수행할 읽기 전용 인터랙션 (모달·탭·드롭다운 열기)
        - { click: 'button:has-text("멤버 초대하기")' }
      hotspots:
        - { n: 3, selector: 'input[type="email"]', label: "이메일 입력란" }
        - { n: 4, selector: 'button:has-text("권한")', nth: -1, label: "권한 선택" }
```

- `page`/`capture`/`shots`는 [agent/scripts/capture_screens.py](../agent/scripts/README.md)의
  입력이다. 캡처 결과(장면별 PNG·요소 좌표)는 `guide/assets/screens/`에 저장되고, `guide/build.py`가
  **이미 저장된 캡처만** 읽어 슬라이드(이전/다음 넘김)로 렌더링한다 (빌드가 캡처를 재실행하지 않는다).
- `shots[]` 키:
  - `id`(필수) — 장면 식별자. `title` — 슬라이드 캡션 제목. `steps` — 다루는 절차 번호 목록.
  - `actions`(선택) — 캡처 전 수행할 클릭 목록 `{ click: <selector>, nth?: <인덱스> }`.
    **읽기 전용 인터랙션만 허용** (모달·탭·드롭다운 열기 등 — 폼 제출·저장·삭제 클릭 금지).
  - `crop`(선택) — 셀렉터의 bounding box 주변만 잘라 캡처(확대 장면용, 여백 32px).
  - `hotspots` — 번호 핀 목록. 장면 없이 엔트리에 `hotspots`만 적으면 단일 장면으로 처리한다.
- `hotspots[].n`은 본문 "절차" 절의 순서 번호(`ol`)와 일치시킨다 — 가이드에서 핀 번호와
  절차 번호가 같은 단계를 가리키도록.
- `hotspots[].selector`는 Playwright 셀렉터(CSS + `:has-text()` 등). 프론트엔드가 CSS Modules로
  클래스명을 해시하므로, 텍스트 기반(`button:has-text("…")`) 또는 부분 클래스
  (`[class*="title_container"]`) 셀렉터를 쓴다. 같은 텍스트가 여러 개면 `nth`(0부터, `-1`=마지막)로
  지정한다. 좌표(x/y) 하드코딩은 금지.
- **캡처 대상은 실제 솔루션 배포만**: 가이드에 들어가는 화면 이미지(캡처)와 번호 핀은 사용자가
  실제로 보는 제품 화면이어야 한다. `deployment(draft)` 프로토타입은 **텍스트 출처로만** 쓰고
  `capture.base_url_source`로 지정하지 않는다 — 프로토타입 화면을 가이드 이미지로 쓰면
  사용자가 실제 화면과 다른 안내를 받는다.
- `capture.base_url_source`는 F8 배포 소스 식별자를 재사용한다. base URL 결정 우선순위:
  ① 환경변수 `PG_CAPTURE_BASE_URL_<SOURCE_ID>`(대문자, `-`→`_` — 호스트 변경 시 엔트리 수정 없이 덮어쓰기)
  ② `agent/snapshots/<source_id>.json`의 `url`(F8 스냅샷)
  ③ `capture.base_url`(로그인이 필요해 F8 fetch가 불가능한 배포 등).
- 캡처 메타는 `guide/assets/screens/manifest.json`에 기록되고, 캡처 시점 프론트엔드 커밋은
  `provenance.screen_ref.captured_commit`(`<저장소명>@<sha>` 형식)에도 함께 기록된다 —
  `capture_screens.py`가 캡처 성공 시 이 한 줄만 갱신한다. `version`(코드 참조 검증 시점)과
  `captured_commit`(화면 캡처 시점)은 별개 신호다: 전자는 "본문이 어느 코드 기준으로 쓰였나",
  후자는 "캡처 이미지가 어느 코드 기준 화면인가"를 뜻한다.

## 라이브 배포 소스 (`deployment`) — draft 권위

배포된 프론트엔드 프로토타입(예: Vercel)을 `policy`/`screen_ref` 등 필드의 **임시(draft) 출처**로 쓸 수 있다.
화면설계서 PDF·프론트엔드 코드 등 위 표의 확정 출처가 아직 없는 신규 기능(예: 프로토타입만 존재하는 도메인)에서,
확정 출처가 생기기 전까지 해당 필드를 채우는 용도다.

- `provenance.<field>.source`에 `deployment`를 쓸 수 있다. 이때 `provenance.<field>.authority: draft`를
  함께 적는다 (기존 출처는 별도 표기 없이 확정으로 간주한다).
- `provenance.<field>.deployment`에 다음 키를 적는다:

  | 키 | 설명 |
  |---|---|
  | `source_id` | 배포 소스 식별자 — `agent/snapshots/<source_id>.json`과 대응 |
  | `url` | 배포 URL (production alias — 항상 최신 배포를 가리켜야 함) |
  | `deployment_ref` | 배포 ID·commit SHA — best-effort, 확인 불가 시 빈 문자열 |
  | `content_hash` | 페치 시점 해당 섹션 텍스트의 sha256 |
  | `fetched_at` | 페치 시각 (ISO 8601) |
  | `deployed_at` | 배포 시각 — `Last-Modified` 헤더 기반 best-effort, 빈 문자열 가능 |
  | `section_anchor` | 스냅샷의 `sections` 키 — 이 필드가 참조하는 배포 페이지 섹션 |

예시(정책 필드를 라이브 배포에서 임시로 채운 경우):

```yaml
provenance:
  policy:
    source: deployment
    authority: draft
    deployment:
      source_id: pg-relabel-prototype
      url: "https://pg-relabel-prototype.vercel.app/"
      deployment_ref: ""
      content_hash: "<sha256>"
      fetched_at: "2026-06-10T04:40:00+00:00"
      deployed_at: "2026-06-09T12:51:50+00:00"
      section_anchor: "재학습-데이터-활용-방식"
```

- **권위 등급**: `schema 표(확정)` > `deployment(draft)`. 화면설계서 PDF·프론트엔드 코드·티켓 등 위 표의
  확정 출처가 새로 생기면 그쪽으로 `provenance.<field>.source`를 교체(승격)하고, 충돌 시 확정 출처가 이긴다.
  `deployment` 출처는 사람이 검토해 승격하기 전까지 draft로 남는다.
- **적격성**: production alias URL에서 정적 렌더 텍스트가 추출되는 배포만 사용 가능하다(예: iframe에 격리된
  공개 아티팩트는 부적격 — 추출 실패로 감지됨). 점검·동기화는
  [agent/scripts/fetch_deployment_source.py](../agent/scripts/README.md) 참고.

## 운영 규칙
- `policy`는 화면설계서 PDF 전체가 아니라 [PDF 읽기 규칙](../CLAUDE.md)에 따라 추려진 `kb/_sources/policy/<screen>.md`만 거쳐서 채운다 (PDF 원본을 직접 인용하지 않는다).
- `screen_ref`의 **내용 근거**는 캡처 이미지가 아니라 프론트엔드 코드 경로·컴포넌트명·실제 UI 문자열이다 — 화면이 바뀌면 가이드가 자연히 따라가도록 하기 위함이다. 구조형의 화면 캡처(PNG)는 본문을 보조하는 **파생 시각 자료(렌더 캐시)**일 뿐 권위 소스가 아니며, 최신 여부는 `captured_commit`으로 별도 점검한다(`check_screen_ref.py --fetch`).
- 값이 아직 없는 필드(`visual` 등 후속 항목)는 빈 문자열로 두고, 해당 필드의 `provenance`도 기록하지 않는다.
- `provenance.<field>.ref`는 참조 대상이 1개면 문자열, 2개 이상이면 YAML 배열로 적는다.
  특히 `screen_ref.ref`는 프론트엔드 저장소 루트 기준 상대 경로 배열로 적어, 변경 영향
  점검 도구가 파일 단위로 diff를 비교할 수 있게 한다. `screen_ref.version`은
  `<저장소명>@<git commit SHA>` 형식으로 적는다 (예: `ProtectGO-ENT-FE@4e979115d8ee...`).
- 스키마 변경 시 이 문서 + 계획서 + `agent/interfaces.md`의 타입 정의를 함께 갱신한다.
