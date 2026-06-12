# 가이드 웹페이지 (`guide/`)

`kb/`의 KB 엔트리를 렌더링한 사용자 가이드 웹페이지. KB가 단일 출처(source of truth)이며, 이 폴더는 그 **렌더링 결과물**이다.

## 원칙
- 가이드 **본문의 근거**는 이미지가 아니라 HTML/CSS·프론트엔드 코드 참조다(Figma 직접 연동은 후속).
- `policy`는 `kb/_sources/policy/`에서, `screen_ref`(레이아웃·컴포넌트·UI 텍스트)는 프론트엔드 코드 참조에서 채운다.
- 본문을 보조하는 **실제 화면 캡처**(강조 테두리 + 번호 핀)는 `agent/scripts/capture_screens.py`가
  별도로 생성한 PNG·manifest를 빌드가 읽기만 한다. **빌드는 캡처를 재실행하지 않는다** —
  캡처 갱신은 캡처 스크립트를 명시적으로 실행할 때만 일어난다.
- 언어는 한국어 우선.

## 구성
```
guide/
├─ build.py        # kb/**/*.md → 정적 HTML 변환 스크립트 (F6 최소 구현)
├─ requirements.txt
├─ templates/
│  └─ style.css    # 전체 페이지 공통 스타일시트
├─ assets/
│  └─ screens/     # 화면 캡처 PNG + manifest.json (capture_screens.py 산출물 — 커밋 대상)
└─ dist/           # 빌드 산출물 (.gitignore 대상 — 재생성 가능)
```

## 화면 캡처 (guide/assets/screens/)
- `<entry-id>.png` — hotspot 요소에 강조 테두리를 입힌 실제 화면. `manifest.json`에는
  핀 좌표(요소 bounding box)·캡처 시각(`captured_at`)·캡처 시점 프론트엔드 커밋
  (`captured_commit`)·뷰포트가 기록된다.
- 빌드 시 캡처가 있는 엔트리는 본문 위에 figure(이미지 + 번호 핀 오버레이 + "마지막 캡처"
  캡션)로 표시되고, 없는 엔트리는 회색 placeholder("화면 캡처 미생성 — `capture_screens.py
  --only <id>` 실행 필요")가 표시된다 — **빌드는 실패하지 않는다**.
- 캡처 생성·갱신: [agent/scripts/README.md](../agent/scripts/README.md)의
  `auth_login.py`(로그인 세션 1회 저장) / `capture_screens.py`(`--only`, `--stale-only`) 참고.

## 빌드 방법
```
pip install -r guide/requirements.txt
python guide/build.py
```

`guide/dist/`에 정적 HTML이 생성된다. 확인은 `python -m http.server --directory guide/dist`
실행 후 브라우저에서 `http://localhost:8000`으로 접속한다.

## 결과물 확인 방법

**1. 캡처 PNG 원본 — 빌드 없이 바로 확인**

`guide/assets/screens/`의 PNG를 이미지 뷰어로 연다. 절차 단계별 **장면(shot)마다 1장**씩
`<entry-id>--<shot-id>.png` 형식으로 저장되며, 강조 테두리(파란 외곽선)가 hotspot 요소에
입혀져 있어야 정상이다. `manifest.json`에서 장면 목록·핀 좌표·캡처 시각(`captured_at`)·
캡처 시점 커밋(`captured_commit`)을 확인할 수 있다.

```
guide/assets/screens/project-creation.invite-member--account-page.png   # 단계 1·2
guide/assets/screens/project-creation.invite-member--invite-modal.png   # 단계 3·4·5 (모달 열림)
guide/assets/screens/project-creation.invite-member--invite-tab.png     # 단계 6
guide/assets/screens/project-creation.switch-project--header.png        # 단계 1
guide/assets/screens/project-creation.switch-project--dropdown-open.png # 단계 2 (드롭다운 열림)
guide/assets/screens/detection-node.configure-event-setting-node--canvas.png       # 단계 1
guide/assets/screens/detection-node.configure-event-setting-node--node-detail.png  # 단계 2·4·5·6 (노드 확대)
guide/assets/screens/manifest.json
```

**2. 가이드 페이지에서 슬라이드(이미지 + 번호 핀) 확인**

```
python guide/build.py
python -m http.server --directory guide/dist 8000
```

브라우저에서 아래 페이지를 열면, 본문 위에 캡처 슬라이드가 표시된다 — 장면이 여러 장이면
**"‹ 이전 / 다음 ›" 버튼과 카운터(예: 2 / 3)로 넘겨 볼 수 있고**, 각 슬라이드 아래에
"단계 3·4·5 · 멤버 초대하기 모달"처럼 해당 절차 번호·장면 제목이 캡션으로 붙는다.
핀 번호는 본문 "절차" 절의 번호와 같은 단계를 가리킨다.

- http://localhost:8000/project-creation/how-to/invite-member.html
- http://localhost:8000/project-creation/how-to/switch-project.html
- http://localhost:8000/detection-node/how-to/configure-event-setting-node.html

캡처가 없는 엔트리는 회색 placeholder("화면 캡처 미생성 — …")로 표시된다 — 빌드 실패가 아니다.

**3. 캡처 최신 여부 확인**

```
python agent/scripts/check_screen_ref.py --fetch
```

엔트리별로 "상태"(코드 참조 최신 여부)와 "캡처 상태"(캡처 최신 여부)가 별개 신호로 보고된다.
`capture_stale`/`not_captured`가 나오면 `capture_screens.py --stale-only`(또는 `--only <id>`)로 갱신한다.

## 사이트 구조 (2026-06-12 IA 개편)
- `dist/index.html` — 홈: "가이드 이용 방법" 3단계 다이어그램 + 기능(도메인) 카드(실제 화면
  캡처 썸네일 + 한 줄 설명 + 대표 링크) + 문서 유형 안내(Diátaxis 4유형 설명).
- `dist/<category>/index.html` — 기능(도메인) 랜딩: `kb/<category>/README.md`의 개념 소개
  (구 explanation 개념 페이지를 병합) + 유형별 엔트리 목록.
- `dist/<category>/<diataxis_type>/<id>.html` — KB 엔트리 본문 페이지. `policy`/`screen_ref`/
  `provenance` 등 KB 내부 메타데이터는 가이드에 노출하지 않는다.
- `dist/<category>/<diataxis_type>/index.html` — 유형별 목록 (구 경로 호환용 — 내비게이션에는
  노출하지 않음).

사이드바는 **기능(도메인) 그룹 드롭다운**이다 — 그룹 아래 "소개"(랜딩)와 엔트리들이 유형
배지(튜토리얼/하우투/레퍼런스/설명)와 함께 나열된다. 상위 개념 = 기능(도메인), 유형은
항목 라벨로만 쓴다. 파일 경로 기준은 그대로 `kb/<category>/<dtype>/<slug>.md` →
`dist/<category>/<dtype>/<slug>.html` 1:1 매핑이다.

빌드 스크립트는 사람이 수동으로 실행하는 전제다 (F7의 자동 빌드/CI 연동은 범위 밖).

## 출처와 반영 흐름 (가이드 운영 — 작성자용)

> 이전에는 가이드 내 explanation 페이지("이 가이드가 만들어지는 방식")로 노출했으나,
> 작성자용 내부 문서로 이동했다 (2026-06-12 IA 개편).

가이드 한 편은 단일 문서가 아니라 여러 출처의 조합이다. 필드마다 권위 있는 출처가 다르다.

| 가이드 내용 | 출처 | 권위 |
|---|---|---|
| 제목·기능 요약 | PRD (기획 문서) | 확정 |
| 정책 (상태 전환·유효성·예외) | 화면설계서 PDF 정책 추출분 / protect-go-knowledge | 확정 |
| 화면 세부 (버튼·문구·구성) | 프론트엔드 코드 | 확정 |
| 동작 요구사항 | 티켓(수용 기준) | 확정 |
| 확정 출처가 없는 신규 기능 | 배포 프로토타입 (라이브 URL) | draft (임시) |

draft 출처 규칙: 권위는 항상 확정 출처가 우선한다. 확정 출처가 생기면 교체(승격)하고,
draft는 텍스트 출처로만 쓴다 — 가이드 화면 이미지는 실제 솔루션에서만 캡처한다.

반영 흐름(요약): 페치(`fetch_deployment_source.py` / `check_screen_ref.py --pull`)로 소스를
받고, 변경 감지 결과를 사람이 검토해 바뀐 부분만 갱신하고, 코드가 바뀐 화면만 재캡처한 뒤
빌드한다. 본문 자동 재생성은 하지 않는다. 커맨드는 [agent/scripts/README.md](../agent/scripts/README.md)의
"배포 버전 업데이트 루틴" 참고.
