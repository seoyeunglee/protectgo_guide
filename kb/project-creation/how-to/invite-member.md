---
id: project-creation.invite-member
category: project-creation
diataxis_type: how-to
title: 멤버 초대하기
description: 계정 관리 화면에서 새 멤버에게 프로젝트 참여를 요청하는 방법
policy: |
  - 멤버 초대는 에디터 권한 이상만 가능하다 (어드민/에디터: 가능, 매니저/뷰어: 불가)
  - 계정 관리 > 초대 관리 경로에서는 초대 시 권한을 에디터/매니저/뷰어 중에서 선택할 수 있다
    (프로젝트 생성 시 초대 경로는 매니저로 고정). 단, 한 번에 추가한 이메일 전체에
    동일한 권한이 일괄 적용된다.
  - 이메일은 한 번에 최대 10명까지 추가할 수 있다.
  - 초대 메일 유효기간은 30일이며, 만료된 초대는 재전송이 필요하다.
  - 초대받은 사용자는 "대기중" 상태로 등록되며, 초대된 이메일로 가입 또는 로그인해야
    권한이 활성화된다.
  - 이미 등록되었거나 초대 대기 중인 이메일은 다시 초대할 수 없다.
  - 초대 메일 제목 형식: "[Protect GO AI] 관리자가 귀하를 [프로젝트명] 프로젝트에
    [권한명]로 초대했습니다."
screen_ref:
  notes: |
    - `src/pages/AccountManagement/AccountManagement.jsx`
      - 계정 관리 화면 상단 "멤버 초대하기" 버튼(addPerson 아이콘)을 누르면 초대 모달이 열린다.
      - 탭 구성: "전체 계정" / "초대 관리". 초대 성공 시 "초대 관리" 탭으로 자동 전환된다.
    - `src/pages/AccountManagement/components/InviteModal.jsx`
      - 모달 제목: "멤버 초대하기"
      - 이메일 입력: "이메일" 라벨 + 입력란 + "추가" 버튼. 최대 10건(MAX_INVITES) 도달 시
        "추가" 버튼이 비활성화되고 "초대 메일은 한 번에 최대 10명까지 보낼 수 있습니다."
        툴팁이 표시된다.
      - 입력 검증 오류 메시지: "한글은 입력할 수 없습니다.", "올바른 이메일 형식으로
        작성해주세요.", "이미 추가된 이메일입니다.", "이미 프로젝트에 초대 된 멤버입니다."
      - 권한 선택: "권한" 라벨 + "* 일괄 적용" 보조 라벨 + 드롭다운(옵션: 에디터/매니저/뷰어).
        초기값은 빈 옵션("권한")이며, 사용자가 직접 선택해야 한다.
      - 하단 버튼 상태: 비활성("초대 메일 전송", 이메일 0건이거나 권한 미선택 시) →
        활성("초대 메일 전송") → 전송 중("전송중...")
      - 전송 결과 안내: 성공 시 "프로젝트 초대 이메일 발송 완료" / 404 오류 시 "이메일이나
        권한을 다시 확인해 주세요." / 553 오류 시 "프로젝트 초대 이메일 발송 실패" /
        그 외 오류 시 "네트워크 오류로 인해 이메일 발송에 실패했습니다. 다시 시도해 주세요."
    - `src/pages/AccountManagement/Invite/Invite.jsx` ("초대 관리" 탭)
      - 검색창 placeholder: "검색어를 입력해주세요."
      - 필터: 전송 상태(전송 완료 / 전송 실패)
      - 테이블 컬럼: 체크박스, 이메일, 설정 권한, 초대일(~초대 만료일), 전송 상태
      - 상단 버튼: "선택 삭제"(선택 항목 없으면 비활성), "{N}명의 멤버 선택", "초대 메일 재전송"
      - 빈 상태 문구: "대기중인 멤버가 없습니다." / "[멤버 초대하기] 버튼으로 프로젝트에
        새로운 멤버를 초대해보세요."
    - `src/pages/AccountManagement/components/Constants.js`
      - `AUTHORITY_OPTIONS`: 빈 옵션("권한") / 에디터(editor) / 매니저(manager) / 뷰어(viewer)
    - `src/api/invite.js`
      - `inviteAPI.inviteUser({ emails, role })`, `inviteAPI.inviteAgain({ inviteIds })`,
        `inviteAPI.deleteInviteUser(ids)`
  page: "/account-management"
  capture:
    base_url_source: "protectgo-dev"
    # dev 프로젝트 앱 호스트 — 로그인(https://protectgo.kr/login) 후 진입하는 주소.
    # 호스트가 바뀌면 환경변수 PG_CAPTURE_BASE_URL_PROTECTGO_DEV 로 덮어쓸 수 있다.
    base_url: "http://13.209.124.163"
    requires_auth: true
    viewport: { width: 1440, height: 900 }
  shots:
    - id: account-page
      title: "계정 관리 화면"
      steps: [1, 2]
      hotspots:
        - { n: 1, selector: "a[href='/account-management']", label: "계정 관리 메뉴" }
        - { n: 2, selector: 'button:has-text("멤버 초대하기")', label: "멤버 초대하기 버튼" }
    - id: invite-modal
      title: "멤버 초대하기 모달"
      steps: [3, 4, 5]
      actions:
        - { click: 'button:has-text("멤버 초대하기")' }
      hotspots:
        - { n: 3, selector: 'input[type="email"]', label: "이메일 입력란 (+ 추가 버튼)" }
        # "권한" 텍스트 버튼이 필터 바에도 있어 마지막(모달 안) 요소를 지정
        - { n: 4, selector: 'button:has-text("권한")', nth: -1, label: "권한 선택 (일괄 적용)" }
        - { n: 5, selector: 'button:has-text("초대 메일 전송")', label: "초대 메일 전송 버튼" }
    - id: invite-tab
      title: "초대 관리 탭"
      steps: [6]
      actions:
        - { click: 'button:has-text("초대 관리")' }
      hotspots:
        - { n: 6, selector: 'button:has-text("초대 관리")', label: "초대 관리 탭 (전송 후 자동 전환)" }
acceptance: |
  - [ ] (임시 — 연결된 티켓 없음, 화면 동작 기준 추정) 이메일을 1건도 추가하지 않았거나
    권한을 선택하지 않으면 "초대 메일 전송" 버튼은 비활성 상태를 유지한다.
  - [ ] (임시) 이메일은 한 번에 최대 10건까지 추가할 수 있고, 10건에 도달하면 추가 입력이
    제한된다.
  - [ ] (임시) 초대 메일 전송에 성공하면 모달이 닫히고 "초대 관리" 탭으로 자동 전환된다.
visual: ""
provenance:
  title:       { source: "PRD", ref: "", version: "" }
  description: { source: "PRD", ref: "", version: "" }
  policy:      { source: "protect-go-knowledge", ref: "02-account-and-permissions.md#5-멤버-초대", version: "" }
  screen_ref:
    source: "frontend_code"
    ref:
      - "src/pages/AccountManagement/AccountManagement.jsx"
      - "src/pages/AccountManagement/components/InviteModal.jsx"
      - "src/pages/AccountManagement/Invite/Invite.jsx"
      - "src/pages/AccountManagement/components/Constants.js"
      - "src/api/invite.js"
    version: "ProtectGO-ENT-FE@4e979115d8ee26f5fb22dd420e7c1342d8495711"
    captured_commit: "ProtectGO-ENT-FE@4e979115d8ee26f5fb22dd420e7c1342d8495711"
  acceptance:  { source: "ticket", ref: "", version: "" }
language: ko
updated_at: "2026-06-10"
---

# 멤버 초대하기

계정 관리 화면에서 새 멤버에게 프로젝트 참여를 요청하는 절차를 설명한다. 멤버 초대는 에디터 권한을 가진 사용자만 수행할 수 있다.

## 절차

1. 좌측 메뉴에서 **계정 관리**로 이동한다.
2. 화면 상단의 **멤버 초대하기** 버튼을 누른다.
3. **멤버 초대하기** 모달이 열리면 "이메일" 입력란에 초대할 사용자의 이메일을 입력하고 **추가** 버튼을 누른다. 이메일은 한 번에 최대 10명까지 추가할 수 있으며, 10명에 도달하면 "초대 메일은 한 번에 최대 10명까지 보낼 수 있습니다." 안내가 표시된다.
4. **권한** 항목에서 초대할 멤버의 권한을 선택한다. 선택지는 에디터, 매니저, 뷰어이며, 여기서 선택한 권한은 추가한 모든 이메일에 동일하게 적용된다.
5. **초대 메일 전송** 버튼을 누른다. 이메일을 추가하지 않았거나 권한을 선택하지 않은 상태에서는 버튼이 비활성 상태로 표시되고, 전송 중에는 버튼 텍스트가 "전송중..."으로 바뀐다.
6. 전송이 완료되면 "프로젝트 초대 이메일 발송 완료" 안내가 표시되고, 화면이 자동으로 **초대 관리** 탭으로 전환된다.

## 입력 시 주의 사항

- 이메일에 한글이 포함되면 "한글은 입력할 수 없습니다." 오류가 표시된다.
- 이메일 형식이 올바르지 않으면 "올바른 이메일 형식으로 작성해주세요." 오류가 표시된다.
- 이미 추가한 이메일을 다시 입력하면 "이미 추가된 이메일입니다." 오류가 표시된다.
- 이미 프로젝트에 초대된 멤버의 이메일을 입력하면 "이미 프로젝트에 초대 된 멤버입니다." 오류가 표시된다.

## 전송 실패 시

초대 메일 전송이 실패하면 원인에 따라 다음 안내가 표시된다.

- 이메일이나 권한 값에 문제가 있는 경우: "이메일이나 권한을 다시 확인해 주세요."
- 서버에서 메일 발송 자체가 실패한 경우: "프로젝트 초대 이메일 발송 실패"
- 그 외 네트워크 오류인 경우: "네트워크 오류로 인해 이메일 발송에 실패했습니다. 다시 시도해 주세요."

## 초대 후 관리

**계정 관리 > 초대 관리** 탭에서 발송한 초대 목록을 확인할 수 있다. 각 항목은 이메일, 설정 권한, 초대일과 초대 만료일, 전송 상태(전송 완료 또는 전송 실패)로 구성된다.

- 전송에 실패했거나 초대 메일이 만료된 항목은 **초대 메일 재전송** 버튼으로 다시 보낼 수 있다.
- 더 이상 필요하지 않은 초대 항목은 체크박스로 선택한 뒤 **선택 삭제** 버튼으로 제거할 수 있다.
- 대기 중인 초대가 없으면 "대기중인 멤버가 없습니다."라는 안내와 함께 멤버 초대하기 버튼을 안내하는 빈 화면이 표시된다.

## 정책-화면 점검 메모

기존 정책 문서(`protect-go-knowledge/02-account-and-permissions.md`)에는 권한 기본값이 "뷰어(일괄 적용)"로 기록되어 있다. 반면 현재 화면 코드(`InviteModal.jsx`)는 권한 선택 항목의 초깃값을 빈 옵션("권한")으로 두고 있어, 사용자가 권한을 직접 선택해야 "초대 메일 전송" 버튼이 활성화된다.

이 차이는 `policy` 필드(정책 문서 기반)와 `screen_ref` 필드(프론트엔드 코드 기반)의 출처가 서로 다르기 때문에 발생한 드리프트의 한 예시다. 이 가이드는 화면 코드 기준(권한 직접 선택 필요)으로 안내한다. `acceptance` 필드는 현재 연결된 티켓이 없어 화면 동작을 근거로 임시 작성했으며, 실제 티켓이 연결되면 갱신이 필요하다.
