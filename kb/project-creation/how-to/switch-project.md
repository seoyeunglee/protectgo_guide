---
id: project-creation.switch-project
category: project-creation
diataxis_type: how-to
title: 다른 프로젝트로 전환하기
description: 헤더의 프로젝트 선택 드롭다운에서 소속된 다른 프로젝트로 전환하는 방법
policy: |
  - 비활성화(deactivated) 상태인 프로젝트는 선택할 수 없으며, "일시 중지" 배지와 함께
    "비활성화되어 접근할 수 없습니다." 안내가 표시된다.
  - 정상 프로젝트로 전환하면 0%, 70%, 90%, 100% 순서로 표시되는 접속 진행률 팝업을 거쳐
    대시보드로 이동한다. 15초 이상 진행률 변화가 없으면 접근 실패 안내가 표시된다.
  - 로그인 후 소속 프로젝트가 2개 이상이면 별도의 프로젝트 선택 페이지로 진입한다.
    이 페이지는 Auth 애플리케이션 영역으로 본 저장소(ProtectGO-ENT-FE) 범위 밖이며,
    헤더 드롭다운의 "선택 페이지" 버튼으로도 이동할 수 있다.
screen_ref:
  notes: |
    - `src/components/Header/AppHeader/AppHeader.jsx`
      - 헤더 중앙에 현재 프로젝트명(`currentProjectName`) 버튼과 드롭다운 화살표 아이콘이
        있으며, 클릭하면 `ProjectListDropdown`이 토글된다.
    - `src/components/Header/AppHeader/Dropdown/ProjectListDropdown.jsx`
      - 드롭다운 상단: "프로젝트 선택" 라벨 + "선택 페이지" 버튼. 버튼을 누르면
        `${VITE_AUTH_URL}/select-project?isMovePage=true`(외부 Auth 앱)로 이동한다.
      - 프로젝트 목록: 역할이 'pending'이 아닌 프로젝트만 항목으로 표시되며, 각 항목에는
        `projectName`이 노출된다.
      - 정상 프로젝트 클릭 시: 배포 환경에서는 `/health-check`를 경유해 대시보드로 이동,
        개발 환경 또는 `front_test` 프로젝트는 즉시 전환된다.
      - 비활성화 프로젝트: 클릭이 비활성화되며, 호버 시 "비활성화되어 접근할 수 없습니다."
        툴팁과 "일시 중지" 배지가 표시된다.
    - `src/hook/use-currentProject.jsx`
      - `currentProjectName`, `currentProjectId` 등 현재 프로젝트 정보를 `me.userProjects[0]`
        에서 파생해 헤더에 전달한다.
  page: "/dashboard"
  capture:
    base_url_source: "protectgo-dev"
    # dev 프로젝트 앱 호스트 — 로그인(https://protectgo.kr/login) 후 진입하는 주소.
    # 호스트가 바뀌면 환경변수 PG_CAPTURE_BASE_URL_PROTECTGO_DEV 로 덮어쓸 수 있다.
    base_url: "http://13.209.124.163"
    requires_auth: true
    viewport: { width: 1440, height: 900 }
  shots:
    - id: header
      title: "헤더 — 프로젝트 선택 드롭다운"
      steps: [1]
      hotspots:
        - { n: 1, selector: '[class*="title_container"] > button', label: "프로젝트 선택 드롭다운" }
    - id: dropdown-open
      title: "프로젝트 목록 (드롭다운 열림)"
      steps: [2]
      actions:
        - { click: '[class*="title_container"] > button' }
      # 주의: 목록의 프로젝트 항목을 클릭하면 실제 전환이 일어나므로 hotspot 표시만 한다.
      # 단계 3·4(접속 진행률 팝업)는 실제 전환을 수반해 캡처하지 않는다.
      hotspots:
        - { n: 2, selector: '[class*="title_container"] ul', label: "소속 프로젝트 목록" }
acceptance: |
  - [ ] (임시 — 연결된 티켓 없음, 화면 동작 기준 추정) 정상 상태인 프로젝트 항목을 누르면
    드롭다운이 닫히고 선택한 프로젝트로 전환된다.
  - [ ] (임시) "일시 중지" 배지가 표시된 프로젝트 항목은 클릭해도 화면이 전환되지 않는다.
  - [ ] (임시) "선택 페이지" 버튼을 누르면 외부 프로젝트 선택 페이지로 이동한다.
visual: ""
provenance:
  title:       { source: "PRD", ref: "", version: "" }
  description: { source: "PRD", ref: "", version: "" }
  policy:
    source: "protect-go-knowledge"
    ref:
      - "03-project-lifecycle.md#2-프로젝트-선택-페이지"
      - "03-project-lifecycle.md#3-프로젝트-접속-흐름"
    version: ""
  screen_ref:
    source: "frontend_code"
    ref:
      - "src/components/Header/AppHeader/AppHeader.jsx"
      - "src/components/Header/AppHeader/Dropdown/ProjectListDropdown.jsx"
      - "src/hook/use-currentProject.jsx"
    version: "ProtectGO-ENT-FE@8b277532d3eca6bfdbf3cf6d6aca314e39b82030"
    captured_commit: "ProtectGO-ENT-FE@8b277532d3eca6bfdbf3cf6d6aca314e39b82030"
  acceptance:  { source: "ticket", ref: "", version: "" }
language: ko
updated_at: "2026-06-10"
---

# 다른 프로젝트로 전환하기

헤더의 프로젝트 선택 드롭다운을 사용해 현재 소속된 다른 프로젝트로 전환하는 방법을 설명한다.

## 절차

1. 화면 상단 헤더에서 현재 프로젝트명 옆의 드롭다운 화살표 아이콘을 누른다.
2. 소속된 프로젝트 목록이 드롭다운으로 펼쳐진다. 전환할 프로젝트명을 누른다.
3. 정상 상태인 프로젝트를 선택하면 0%, 70%, 90%, 100% 순서로 표시되는 접속 진행률 팝업을 거쳐 해당 프로젝트의 대시보드로 이동한다.
4. 진행률 팝업이 15초 이상 멈춰 있으면 접근 실패 안내가 표시된다.

## 비활성화된 프로젝트

- "일시 중지" 배지가 표시된 프로젝트는 선택할 수 없다.
- 항목에 마우스를 올리면 "비활성화되어 접근할 수 없습니다." 안내가 표시된다.

## 더 많은 프로젝트 보기

드롭다운 상단의 "선택 페이지" 버튼을 누르면, 소속된 프로젝트를 카드 형태로 모아 보여주는 별도의 프로젝트 선택 페이지로 이동한다. 이 페이지는 별도의 인증(Auth) 애플리케이션에서 제공된다.

## 범위 메모

프로젝트 카드·멤버 수 표시·프로젝트 접속 버튼으로 구성된 "프로젝트 선택 페이지"와, 이름 입력·멤버 초대·용도 선택 3단계로 구성된 "프로젝트 생성 위저드"는 ProtectGO-ENT-FE 코드베이스에 존재하지 않는다. 두 화면 모두 별도의 Auth 프론트엔드 애플리케이션(`AUTH_URL` 환경 변수로 참조)에 구현되어 있다. 두 화면을 다루는 KB 엔트리를 작성하려면 해당 저장소를 `screen_ref` 소스로 추가 확보해야 한다.
