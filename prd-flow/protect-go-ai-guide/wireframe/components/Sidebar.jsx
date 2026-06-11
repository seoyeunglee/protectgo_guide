const NAV_GROUPS = [
  {
    label: "문서 관리",
    items: [
      {
        id: "kb-list",
        label: "가이드 문서 목록",
        desc: "[0-0] 가이드 문서 목록\n\n· 전체 가이드 문서를 목록으로 조회\n[정책]\n· 문서 관리 섹션의 기본 진입점\n· 필터·검색으로 도메인·유형·상태 조합 탐색",
      },
      {
        id: "kb-editor",
        label: "새 문서 작성",
        desc: "[0-1] 새 문서 작성\n\n· 비어 있는 가이드 문서 편집기를 열어 새 항목 작성 시작\n[정책]\n· 도메인·유형 미선택 상태로 진입 가능\n  - 저장 전 도메인·유형 선택 필수",
      },
      {
        id: "template",
        label: "작성 유형 안내",
        desc: "[0-2] 작성 유형 안내\n\n· Diátaxis 유형·복잡도·필드 체크리스트를 안내하는 화면\n[정책]\n· 유형 선택이 어려울 때 진입; 선택 후 편집기로 연결",
      },
    ],
  },
  {
    label: "변경 관리",
    items: [
      {
        id: "checklist",
        label: "소스 변경 영향 점검",
        desc: "[0-3] 소스 변경 영향 점검\n\n· PRD·PDF·코드·티켓 변경 시 영향받는 가이드 문서 필드를 파악\n[정책]\n· 소스 유형 선택 후 Yes/No 체크리스트 제공\n· 모두 '아니요'이면 '영향 없음' 상태 표시",
      },
    ],
  },
  {
    label: "배포·확인",
    items: [
      {
        id: "build",
        label: "빌드 실행",
        desc: "[0-6] 빌드 실행\n\n· 가이드 문서를 가이드 웹페이지로 변환하는 빌드 실행·이력 조회\n[정책]\n· 화면 참조 미입력 문서는 경고 발생 후 가이드에서 제외\n· 빌드 성공 시 가이드 홈에 즉시 반영",
      },
      {
        id: "guide-home",
        label: "가이드 홈 미리보기",
        desc: "[0-4] 가이드 홈 미리보기\n\n· 빌드 결과인 Protect Go 사용자 가이드 홈 화면 미리보기\n[정책]\n· 도메인 탭·유형 섹션 구조로 문서 탐색\n· 빌드 성공한 문서만 노출",
      },
      {
        id: "guide-detail",
        label: "가이드 문서 미리보기",
        desc: "[0-5] 가이드 문서 미리보기\n\n· 개별 가이드 문서가 렌더링된 가이드 상세 화면 미리보기\n[정책]\n· 목차(TOC) 사이드바·본문 섹션·다음 단계 링크 포함",
      },
    ],
  },
];

export default function Sidebar({ currentScreen, onNavigate }) {
  return (
    <aside
      style={{
        width: 232,
        minHeight: "100vh",
        background: "var(--semantic-bg-default)",
        borderRight: "1px solid var(--semantic-line-default)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: "var(--spacing-16)",
          borderBottom: "1px solid var(--semantic-line-default)",
        }}
      >
        <div
          style={{
            font: "var(--text-label-2-semibold)",
            color: "var(--semantic-text-sub)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "var(--spacing-2)",
          }}
        >
          Protect Go AI
        </div>
        <div
          style={{
            font: "var(--text-body-1-normal-semibold)",
            color: "var(--semantic-text-default)",
          }}
        >
          가이드 관리 도구
        </div>
      </div>

      {/* 내비게이션 */}
      <nav style={{ flex: 1, padding: "var(--spacing-8)" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div
            key={group.label}
            style={{ marginBottom: gi < NAV_GROUPS.length - 1 ? "var(--spacing-4)" : 0 }}
          >
            {/* 그룹 레이블 */}
            <div
              style={{
                padding: "var(--spacing-8) var(--spacing-8) var(--spacing-4)",
                font: "var(--text-label-2-semibold)",
                color: "var(--semantic-text-sub)",
                letterSpacing: "0.04em",
              }}
            >
              {group.label}
            </div>

            {/* 메뉴 아이템 */}
            {group.items.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  desc={item.desc}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    padding: "var(--spacing-8) var(--spacing-12)",
                    borderRadius: "var(--radius-medium)",
                    border: "none",
                    cursor: "pointer",
                    font: isActive
                      ? "var(--text-body-2-normal-semibold)"
                      : "var(--text-body-2-normal-regular)",
                    background: isActive
                      ? "var(--semantic-natural-deep)"
                      : "transparent",
                    color: isActive
                      ? "var(--semantic-natural-white)"
                      : "var(--semantic-text-default)",
                    textAlign: "left",
                    marginBottom: "var(--spacing-2)",
                    transition: "background 80ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--semantic-natural-extra-light)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.label}
                </button>
              );
            })}

            {/* 그룹 간 구분선 */}
            {gi < NAV_GROUPS.length - 1 && (
              <div
                style={{
                  height: 1,
                  background: "var(--semantic-line-default)",
                  margin: "var(--spacing-8) var(--spacing-8)",
                }}
              />
            )}
          </div>
        ))}
      </nav>

      {/* 하단 고정 */}
      <div
        style={{
          padding: "var(--spacing-12) var(--spacing-8)",
          borderTop: "1px solid var(--semantic-line-default)",
        }}
      >
        <button
          desc="[0-7] 문의하기\n\n· Protect Go 가이드 관리 도구 관련 문의 채널\n[정책]\n· 연결 대상 채널은 후속 단계에서 확정"
          style={{
            width: "100%",
            padding: "var(--spacing-8) var(--spacing-12)",
            background: "var(--semantic-natural-deep)",
            color: "var(--semantic-natural-white)",
            border: "none",
            borderRadius: "var(--radius-medium)",
            font: "var(--text-body-2-normal-regular)",
            cursor: "pointer",
          }}
        >
          문의하기
        </button>
      </div>
    </aside>
  );
}
