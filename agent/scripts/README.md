# `check_screen_ref.py` — screen_ref 변경 영향 점검

KB 엔트리의 `provenance.screen_ref`에 적힌 ProtectGO-ENT-FE 커밋을 현재 상태와 비교해,
`screen_ref.ref`가 가리키는 파일이 그 사이 바뀌었는지 알려주는 점검 스크립트다.

[07-features.md F5 (소스 변경 영향 수동 점검 체크리스트)](../../prd-flow/protect-go-ai-guide/auto-backward/07-features.md)의
"코드" 소스 점검 문항("화면 참조(screen_ref)가 가리키는 컴포넌트가 변경되었는가?")을
`provenance.version` 비교로 자동 확인해 준다. **KB 파일을 직접 수정하지는 않는다** —
변경이 발견된 엔트리를 사람이 다시 검토하고, 필요하면 [schema/kb-entry.md](../../schema/kb-entry.md)
형식에 맞춰 `screen_ref`·`provenance.screen_ref`를 직접 갱신한다.

## 준비

```
pip install -r requirements.txt
```

`PROTECTGO_FE_REPO` 환경 변수로 ProtectGO-ENT-FE 로컬 클론 경로를 지정한다.
지정하지 않으면 `C:\Users\idb\AI-DLC\ProtectGO-ENT-FE`를 사용한다.

## 사용

```
# 로컬에 받아둔 ProtectGO-ENT-FE 기준으로 점검
python check_screen_ref.py

# GitHub(origin)에서 최신 커밋 정보를 받아온 뒤 점검 — "최신 버전 다시 받아오기" 버튼에 해당
python check_screen_ref.py --fetch

# 로컬 클론 자체를 원격 최신으로 갱신(pull)한 뒤 점검 — 배포 버전 업데이트용 소스 데이터 받기
python check_screen_ref.py --pull

# 다른 도구·화면(예: 06-SourceChangeChecklist 와이어프레임)에서 참조할 구조화 출력
python check_screen_ref.py --format json
```

`--fetch`는 `git fetch origin`만 실행한다. 원격 저장소의 최신 커밋 정보를 로컬
remote-tracking 브랜치(`origin/<branch>`)로 받아올 뿐, 작업 트리·로컬 브랜치는
바꾸지 않는다.

`--pull`은 fetch에 더해 로컬 브랜치를 원격으로 **fast-forward 갱신**한다. 커밋되지 않은
변경이 있거나 로컬이 원격과 갈라져 있으면 갱신하지 않고 중단해 로컬 작업을 보호한다.

## 배포 버전 업데이트 루틴 (소스 데이터 받기)

새 배포가 나갔을 때 가이드의 소스 데이터를 최신으로 맞추는 수동 루틴. 순서대로 실행한다.

```
# 1. 프론트엔드 코드 — GitHub에서 pull + 코드/캡처 최신 여부 점검
python check_screen_ref.py --pull

# 2. dev 서버 솔루션 화면 — 코드가 바뀐(또는 미캡처) 화면만 다시 캡처
python capture_screens.py --stale-only

# 3. 배포 프로토타입(draft 출처) — 최신 배포 재페치 + 변경 섹션 감지
python fetch_deployment_source.py fetch protect-go-react
python fetch_deployment_source.py fetch pg-relabel-prototype

# 4. 가이드 재빌드 (1~3과 분리된 별도 실행 — 자동 트리거 없음)
python ../../guide/build.py
```

dev 서버 솔루션은 git으로 받을 수 없으므로, 화면 변경은 2번(재캡처)으로 반영하고
정책·동작 변경은 사람이 1·3번 점검 결과를 보고 KB 본문을 직접 갱신한다.

## 출력

| 상태(`status`) | 의미 |
|---|---|
| `up_to_date` | 기록된 커밋과 현재 커밋이 동일 — 점검 불필요 |
| `no_relevant_change` | 저장소는 갱신됐지만 `screen_ref.ref`에 적힌 파일은 변경 없음 |
| `review_needed` | `screen_ref.ref` 파일 중 하나 이상이 변경됨 — 엔트리의 `screen_ref`/`policy` 재검토 대상 |
| `sha_not_found` | 기록된 커밋을 로컬 저장소에서 찾을 수 없음 (`--fetch` 후 재시도) |
| `repo_mismatch` | `provenance.screen_ref.version`의 저장소명이 `--frontend-repo`와 다름 |

`review_needed`인 엔트리는 `changed_files`에 변경된 참조 파일 목록이 담긴다.

화면 캡처 대상 엔트리(`screen_ref`에 `capture` 블록이 있는 엔트리)는 **캡처 상태**도 함께
보고한다 — 코드 참조 최신 여부(`status`)와는 별개 신호다.

| 캡처 상태(`capture_status`) | 의미 |
|---|---|
| `capture_up_to_date` | manifest의 `captured_commit` = 현재 비교 기준 커밋 |
| `capture_stale` | 캡처 이후 코드가 갱신됨 — `capture_screens.py --stale-only` 대상 |
| `not_captured` | manifest에 기록 없음 — `capture_screens.py --only <id>` 실행 필요 |

## 다음 KB 갱신 시 사용 흐름

1. `python check_screen_ref.py --fetch` 실행 (버튼 트리거에 해당).
2. `review_needed` 엔트리의 `changed_files`를 ProtectGO-ENT-FE에서 직접 확인한다
   (`git -C <repo> show <recorded_sha>..<현재 ref> -- <파일>` 등).
3. 화면·컴포넌트·UI 텍스트가 바뀌었으면 해당 KB 엔트리의 `screen_ref` 본문과 가이드
   본문을 갱신한다.
4. `provenance.screen_ref.version`을 새 커밋(`<저장소명>@<새 sha>`)으로 갱신하고
   `updated_at`을 오늘 날짜로 바꾼다.

## 범위 밖

- KB 엔트리 자동 생성·수정 (4단계 자동 업데이트 에이전트의 영역 — [flow.md](../flow.md)·[interfaces.md](../interfaces.md)는 스텁만 정의)
- CI/웹훅 등 실제 파이프라인 연동 — 이 스크립트는 사람이 수동으로 실행하는 점검 도구다

# `fetch_deployment_source.py` — 라이브 배포 소스 점검·동기화 (F8)

배포된 프론트엔드 프로토타입(예: Vercel)의 production alias URL(항상 최신 배포)을 페치해
정적 렌더 텍스트를 `section_anchor` 단위로 추출·해시하고, 직전 스냅샷과 비교해 변경된
섹션을 보여주는 점검 도구다. `provenance.<field>.source: deployment`(draft 권위, 자세한
내용은 [schema/kb-entry.md](../../schema/kb-entry.md))로 KB에 인용된 배포 소스가
바뀌었는지 확인할 때 쓴다.

[07-features.md F8](../../prd-flow/protect-go-ai-guide/auto-backward/07-features.md)의
"라이브 배포 소스" 점검 문항(콘텐츠 변경 여부 / draft → 확정 승격 여부)을 보조한다.
**KB 본문(`policy`/`screen_ref` 등)을 자동 재생성하지 않는다** — `sync --apply`도
`provenance.<field>.deployment`의 `content_hash`/`fetched_at`/`deployed_at` 메타데이터만 갱신한다.

## 준비

기본은 stdlib만 사용한다. 단 `--render`(SPA 배포용)는 `playwright`가 필요하다
(`pip install -r requirements.txt` 후 `playwright install chromium`).

## 사용

```
# 최초 페치 — 스냅샷 생성 (agent/snapshots/<source_id>.json)
python fetch_deployment_source.py fetch pg-relabel-prototype --url https://pg-relabel-prototype.vercel.app/

# 재페치 — 직전 스냅샷과 비교해 변경된 섹션을 보여줌 ("최신 배포로 동기화" 버튼에 해당, --url 생략 가능)
python fetch_deployment_source.py fetch pg-relabel-prototype

# SPA(클라이언트 렌더링) 배포 — 정적 페치가 적격성 실패하면 --render로 렌더된 DOM을 페치
# (스냅샷에 기록되어 이후 재페치 시 자동 적용. 랜딩 화면 텍스트만 추출 — 탭·모달 내용은 제외)
python fetch_deployment_source.py fetch protect-go-react --url https://protect-go-react.vercel.app/ --render

# 직전 fetch에서 변경된 섹션을 참조하는 KB 필드 리포트 (dry-run)
python fetch_deployment_source.py sync pg-relabel-prototype

# 위 대상 필드의 provenance.deployment 메타데이터(해시/시각)만 갱신 — 본문은 변경하지 않음
python fetch_deployment_source.py sync pg-relabel-prototype --apply

# 다른 도구·화면에서 참조할 구조화 출력
python fetch_deployment_source.py fetch pg-relabel-prototype --format json
```

## 출력 (`fetch`)

| 상태 | 의미 |
|---|---|
| `new` | 최초 페치 — 스냅샷 생성, 비교 대상 없음 |
| `no_relevant_change` | 직전 스냅샷과 `content_hash` 동일 — 점검 불필요 |
| `changed` | 섹션 단위 변경 감지 — `changed_sections`/`removed_sections`에 목록 표시 |
| (적격성 실패) | 정적 텍스트가 너무 짧음(예: iframe 격리 아티팩트) — 스냅샷을 저장하지 않고 종료(exit 1) |

`hidden` 클래스가 다수 발견되면 경고로 표시한다 — 인터랙션 후에만 노출되는 동적 상태는
정적 추출에 빠질 수 있으므로 수동 확인을 권장한다.

## 다음 KB 갱신 시 사용 흐름

1. `python fetch_deployment_source.py fetch <source_id>` 실행 (버튼 트리거에 해당).
2. `changed`면 `python fetch_deployment_source.py sync <source_id>`로 영향받는 KB 필드
   (`provenance.<field>.deployment.section_anchor`가 변경 섹션과 일치하는 필드)를 확인한다.
3. 사람이 배포 페이지에서 해당 섹션 내용을 직접 보고, KB 엔트리의 본문(`policy`/`screen_ref` 등)을
   검토·갱신한다.
4. 메타데이터만 최신화하려면 `python fetch_deployment_source.py sync <source_id> --apply` 실행 —
   `content_hash`/`fetched_at`/`deployed_at`만 갱신된다.
5. 확정 출처(화면설계서 PDF·프론트엔드 코드 등)가 새로 생기면 `provenance.<field>.source`를
   `deployment`에서 해당 출처로 직접 교체(승격)한다 — 이 단계는 스크립트가 하지 않는다.

## 범위 밖

- KB 엔트리 자동 생성·수정, 본문 재생성 — 4단계 자동 업데이트 에이전트의 영역
  ([flow.md](../flow.md)·[interfaces.md](../interfaces.md)는 스텁만 정의)
- 배포 플랫폼 API(예: Vercel REST API, 커밋 SHA 조회) 연동 — `deployment_ref`는 빈 문자열로
  두는 V1 범위 (확장 시 `VERCEL_TOKEN` 등은 환경 변수로만 다룬다)
- CI/웹훅 등 실제 파이프라인 연동 — 이 스크립트는 사람이 수동으로 실행하는 점검 도구다

# `auth_login.py` — 로그인 세션 1회 저장 (캡처용)

headed 브라우저를 띄워 **사람이 직접** 로그인(필요 시 MFA까지)한 뒤, 콘솔에서 엔터를
누르면 storage_state(쿠키·로컬 스토리지)를 `agent/.auth/state.json`에 저장한다.
`capture_screens.py`가 이 세션으로 로그인 필요 화면을 연다.

- 자격증명을 스크립트에 하드코딩하지 않으며 자동 입력도 하지 않는다.
- `agent/.auth/`는 `.gitignore` 대상 — **세션 파일을 절대 커밋하지 말 것.**
- 캡처·빌드와 완전히 분리된 독립 도구다. 어느 쪽도 서로 자동 호출하지 않는다.

## 준비

```
pip install -r requirements.txt
playwright install chromium
```

## 사용

```
# 로그인 시작 URL은 인자 또는 환경변수로 전달 (코드에 박지 않는다)
python auth_login.py --url https://protectgo.kr/login
# 또는: set PG_LOGIN_URL=https://protectgo.kr/login && python auth_login.py
```

세션이 만료되면(캡처 시 "세션 만료" 안내가 나오면) 이 스크립트를 다시 실행한다.

# `capture_screens.py` — 화면 캡처 + 강조 테두리 + 번호 핀 (F6 보강)

KB 엔트리의 `screen_ref` 구조형(`page`/`capture`/`shots` —
[schema/kb-entry.md](../../schema/kb-entry.md) 참고)을 읽어, 로그인된 세션으로 실제
화면을 열고 hotspot 요소에 강조 테두리(CSS 주입)를 입힌 PNG를 캡처한다.
좌표 하드코딩 없이 Playwright 셀렉터로 요소를 지정한다.

**절차 단계별로 여러 장면(shot)을 캡처**할 수 있다 — 장면마다 페이지를 새로 연 뒤
`actions`(읽기 전용 클릭: 모달·탭·드롭다운 열기)를 수행하고 캡처하므로, "모달이 열린
상태"·"드롭다운이 펼쳐진 상태" 같은 중간 단계 화면도 담을 수 있다. `crop` 키를 주면
해당 요소 주변만 잘라 확대 장면을 만든다(예: 캔버스의 노드 상세). 가이드에서는 장면들이
이전/다음으로 넘기는 슬라이드로 표시된다.

산출물 (커밋 대상):
- `guide/assets/screens/<entry-id>--<shot-id>.png` — 장면별 캡처 (강조 테두리 포함)
- `guide/assets/screens/manifest.json` — 장면 목록·핀 좌표(요소 bounding box)·캡처 시각·캡처 시점 커밋
- 엔트리 프런트매터의 `provenance.screen_ref.captured_commit` **한 줄만** 갱신
  (사용자 승인 사항 — 본문·다른 필드는 건드리지 않는다)

안전 규칙: `actions`에는 **읽기 전용 인터랙션만** 적는다 (폼 제출·저장·삭제·프로젝트 전환
등 상태를 바꾸는 클릭 금지). 같은 텍스트의 요소가 여러 개면 `nth`(0부터, `-1`=마지막)로 지정한다.

이미지 출처 규칙: **캡처 대상은 실제 솔루션 배포만** — `deployment(draft)` 프로토타입은
텍스트 출처로만 쓰고 `base_url_source`로 지정하지 않는다 (가이드 이미지가 실제 화면과
달라지는 것을 막기 위함, schema/kb-entry.md 운영 규칙).

`guide/build.py`는 이 산출물을 **읽기만** 한다 — 빌드가 캡처를 재실행하지 않으며,
이 스크립트도 빌드를 호출하지 않는다.

결과 확인: PNG는 `guide/assets/screens/`에서 바로 열어보고, 가이드 페이지에 반영된
모습(번호 핀 오버레이 포함)은 `python guide/build.py` 후 로컬 서버로 확인한다 —
자세한 경로·URL은 [guide/README.md](../../guide/README.md)의 "결과물 확인 방법" 참고.

## 사용

```
python capture_screens.py                    # capture 블록이 있는 모든 엔트리 캡처
python capture_screens.py --only <entry-id>  # 특정 엔트리만
python capture_screens.py --stale-only       # 코드가 바뀐(또는 미캡처) 화면만
python capture_screens.py --headed           # 브라우저 창을 띄워 과정 확인 (디버깅)
```

## `--stale-only` 판정 (check_screen_ref.py와 공유)

manifest의 `captured_commit`과 프론트엔드 로컬 클론의 비교 기준 커밋(upstream 추적
브랜치 또는 HEAD)이 다르면 stale, manifest에 기록이 없으면 미캡처 — 둘 다 캡처 대상.
원격 최신과 비교하려면 먼저 `python check_screen_ref.py --fetch`로 최신화한다
(이 스크립트는 git fetch를 하지 않는다 — 자동 트리거 없음).

## 세션 만료 시

캡처 중 로그인 페이지로 리다이렉트되거나 hotspot 셀렉터를 하나도 찾지 못하면
"세션 만료 — `agent/scripts/auth_login.py` 를 다시 실행하세요" 안내 후 **해당 엔트리만
건너뛴다** (전체 실행·빌드를 중단시키지 않는다).

## base URL 결정

`capture.base_url_source` 기준, 우선순위:
① 환경변수 `PG_CAPTURE_BASE_URL_<SOURCE_ID>`(대문자, `-`→`_`) — 호스트 변경 시 엔트리 수정 없이 덮어쓰기
② `agent/snapshots/<source_id>.json`의 `url` (F8 스냅샷 재사용)
③ 엔트리의 `capture.base_url`

현재 `protectgo-dev` 소스는 로그인 뒤에만 접근 가능해 F8 스냅샷이 없으므로 ③을 쓴다
(dev 프로젝트 앱 호스트, 로그인 시작은 `https://protectgo.kr/login`).

## 범위 밖

- KB 본문 자동 생성·수정 — `captured_commit` 한 줄 외에는 엔트리를 건드리지 않는다
- 브라우저 버튼 등 서버측 트리거 — 정적 사이트이므로 트리거는 CLI로만 제공한다
  (가이드 페이지에는 figure 캡션에 재캡처 커맨드 안내만 표시)
- CI/웹훅/스케줄 등 자동 실행 — 사람이 명시적으로 실행할 때만 동작한다
