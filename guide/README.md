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

## 사이트 구조
- `dist/index.html` — 홈. "역할별로 찾아보기"(일반 사용자/하우투가 필요한 사용자/어드민·매니저)와
  "도메인별로 찾아보기"(프로젝트 생성, 탐지 시나리오·노드) 두 진입 경로를 제공한다.
- `dist/<category>/index.html` — 도메인 페이지. `kb/<category>/README.md` 소개 + Diátaxis
  4유형(튜토리얼/하우투/레퍼런스/설명)별 엔트리 목록 또는 "준비 중" 안내.
- `dist/<category>/<diataxis_type>/index.html` — 유형별 목록 페이지.
- `dist/<category>/<diataxis_type>/<id>.html` — KB 엔트리 본문(`title`/`description`/본문 마크다운)을
  렌더링한 페이지. `policy`/`screen_ref`/`provenance` 등 KB 내부 메타데이터는 가이드에 노출하지 않는다.

모든 페이지는 좌측 사이드바에 동일한 도메인 × Diátaxis 탐색 트리를 표시한다.

빌드 스크립트는 사람이 수동으로 실행하는 전제다 (F7의 자동 빌드/CI 연동은 범위 밖).
