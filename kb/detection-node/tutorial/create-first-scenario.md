---
id: detection-node.create-first-scenario
category: detection-node
diataxis_type: tutorial
title: 첫 탐지 시나리오 만들기
description: 탐지 설정에서 시나리오를 생성하고, 캔버스에서 노드를 연결해 탐지를 시작하는 과정
policy: |
  - 시나리오 생성 팝업: 탐지 시나리오명 입력(중복 이름이 있으면 에러 텍스트 표시),
    장소 선택(프로젝트에 등록된 장소 중), 저장 폴더 선택(프로젝트에 존재하는 폴더 중).
    [생성하기] 클릭 시 시나리오가 생성되고 설정 화면(캔버스)이 표시된다.
  - 탐지 시나리오 저장 버튼: 현재까지 수정된 시나리오를 저장하고 저장 완료 스낵바를 표시한다.
  - 탐지 시작 버튼: 현재 설정된 시나리오에 대해 탐지를 시작한다.
  - 초기화 버튼: 전체 삭제 확인 팝업을 거쳐 해당 시나리오의 전체 노드 정보를 삭제하고
    탐지를 비활성화한다.
  - 저장되지 않은 설정값이 있으면 페이지 이탈 시 안내 팝업이 표시된다.
screen_ref:
  notes: |
    - `src/pages/DetectionSetting/DetectionSetting.jsx` — 탐지 설정 목록 화면.
      시나리오 폴더 트리 + 시나리오 테이블(탐지 시나리오 명·폴더 위치·장소·이상 탐지 유형·
      마지막 수정일·활성 상태) + "시나리오 생성" 버튼. 시나리오 명 클릭 시 캔버스로 이동.
    - `src/pages/DetectionSetting/components/Modal/AddScenarioModal.jsx` — "탐지 시나리오 생성"
      팝업: 탐지 시나리오 명 / 장소 선택 / 저장 폴더 선택 / 취소·생성하기.
    - `src/pages/Scenario/` — 시나리오 캔버스. 좌측 노드 카테고리 사이드바(엣지·데이터·
      AI 패키지·탐지 설정·이벤트 설정·알림 및 제어), 우상단 "전체 저장"·"탐지 시작" 버튼.
  page: "/detection-setting"
  capture:
    base_url_source: "protectgo-dev"
    base_url: "http://13.209.124.163"
    requires_auth: true
    viewport: { width: 1600, height: 900 }
    hide: [".react-flow__minimap"]
  shots:
    - id: scenario-list
      title: "탐지 설정 — 시나리오 목록"
      steps: [1, 2]
      hotspots:
        - { n: 1, selector: "a[href='/detection-setting']", label: "탐지 설정 메뉴" }
        - { n: 2, selector: 'button:has-text("시나리오 생성")', label: "시나리오 생성 버튼" }
    - id: create-modal
      title: "탐지 시나리오 생성 팝업"
      steps: [3]
      actions:
        - { click: 'button:has-text("시나리오 생성")' }
      hotspots:
        - { n: 3, selector: 'button:has-text("생성하기")', label: "생성하기 (이름·장소·폴더 입력 후)" }
    - id: canvas
      title: "시나리오 캔버스 — 노드 구성과 탐지 시작"
      steps: [4, 5]
      actions:
        # 캡처용으로 기존 시나리오(225 "듀얼 카메라 테스트")의 캔버스를 연다 — 데이터 의존
        - { click: '[class*="scenario_name_wrap"]:has-text("듀얼 카메라 테스트")' }
      hotspots:
        - { n: 4, selector: ':text("알림 및 제어")', label: "노드 카테고리 사이드바" }
        - { n: 5, selector: 'button:has-text("탐지 시작")', label: "탐지 시작 버튼" }
acceptance: |
  - [ ] (임시 — 연결된 티켓 없음, 화면 동작 기준 추정) 중복된 시나리오 이름으로는 생성할
    수 없고 에러 텍스트가 표시된다.
  - [ ] (임시) 생성하기를 누르면 캔버스가 열리고 시나리오 탭이 네비게이션에 추가된다.
  - [ ] (임시) 저장되지 않은 설정값이 있는 상태로 나가면 안내 팝업이 표시된다.
visual: ""
provenance:
  title:       { source: "PRD", ref: "", version: "" }
  description: { source: "PRD", ref: "", version: "" }
  policy:
    source: "화면설계서(PDF)"
    ref: "kb/_sources/policy/detection-scenario.md"
    version: ""
  screen_ref:
    source: "frontend_code"
    ref:
      - "src/pages/DetectionSetting/DetectionSetting.jsx"
      - "src/pages/DetectionSetting/components/Modal/AddScenarioModal.jsx"
    version: "ProtectGO-ENT-FE@4e979115d8ee26f5fb22dd420e7c1342d8495711"
    captured_commit: "ProtectGO-ENT-FE@4e979115d8ee26f5fb22dd420e7c1342d8495711"
  acceptance:  { source: "ticket", ref: "", version: "" }
language: ko
updated_at: "2026-06-11"
---

# 첫 탐지 시나리오 만들기

탐지 시나리오는 "어떤 데이터를, 어떤 기준으로 감시하고, 누구에게 알릴지"를 노드로 연결해 정의한 것이다. 이 튜토리얼은 시나리오를 새로 만들고, 캔버스에서 노드를 연결해 탐지를 시작하는 과정을 다룬다. 노드와 시나리오 개념이 처음이라면 [탐지 시나리오와 노드 — 개념 이해](../explanation/scenario-node-concepts.html)를 먼저 읽는 것을 권장한다.

## 절차

1. 좌측 메뉴에서 **탐지 설정**으로 이동한다. 폴더별 시나리오 목록과 활성 상태가 표시된다.
2. **시나리오 생성** 버튼을 누른다.
3. **탐지 시나리오 생성** 팝업에서 시나리오 이름을 입력하고, 적용할 장소와 저장 폴더를 선택한 뒤 **생성하기**를 누른다. 같은 이름의 시나리오가 이미 있으면 에러 텍스트가 표시된다. 생성하면 시나리오 설정 화면(캔버스)이 바로 열린다.
4. 캔버스 좌측의 **노드 카테고리 사이드바**에서 노드를 추가하고 왼쪽에서 오른쪽으로 연결한다. 기본 흐름은 데이터(센서·카메라)에서 시작해 탐지 설정, 이벤트 설정을 거쳐 알림 및 제어로 끝난다. 이벤트 설정 노드의 상세 입력은 [이벤트 설정 노드 구성하기](../how-to/configure-event-setting-node.html)를 참고한다.
5. 노드 설정을 저장한 뒤 **탐지 시작**을 누른다. 현재 설정된 시나리오로 탐지가 시작된다.

## 시작 전 알아두기

- 탐지 시나리오는 데이터 소스와 판정 방식에 따라 5종으로 나뉜다: 영상 이상 탐지, DB 임계치 탐지, 센서 임계치 탐지, 통계 분석 탐지, 발전 효율 저하 탐지. 어떤 유형을 쓸지는 감시하려는 데이터가 무엇인지에 따라 정해진다.
- 저장하지 않은 설정값이 있는 상태로 화면을 나가면 안내 팝업이 표시된다. 작업 중간에는 저장 버튼으로 수시로 저장한다.
- **초기화** 버튼은 시나리오의 전체 노드 정보를 삭제하고 탐지를 비활성화한다. 전체 삭제 확인 팝업을 거치지만, 삭제된 구성은 되돌릴 수 없으므로 주의한다.

## 다음 단계

- 탐지가 시작되면 이상 상황이 알림으로 도착한다 — [이상 상황 알림 확인하기](../how-to/handle-anomaly-situation.html)에서 확인 방법을 다룬다.
