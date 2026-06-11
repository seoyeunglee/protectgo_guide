import { ContentBadge } from "@idbrnd/design-system";

const MOCK_ENTRY_DETAIL = {
  id: 1,
  type: "튜토리얼",
  domain: "프로젝트 생성",
  title: "신규 프로젝트 생성",
  lastUpdated: "2026-06-08",
  readTime: "5분",
  toc: [
    { id: "intro", label: "시작하기 전에" },
    { id: "step1", label: "1단계: 프로젝트 이름 입력" },
    { id: "step2", label: "2단계: 기간 설정" },
    { id: "step3", label: "3단계: 담당자 지정" },
    { id: "step4", label: "4단계: 최종 확인 및 생성" },
    { id: "next", label: "다음 단계" },
  ],
  sections: [
    {
      id: "intro",
      heading: "시작하기 전에",
      content: [
        "이 튜토리얼에서는 Protect Go에서 첫 번째 프로젝트를 생성하는 방법을 단계별로 안내합니다.",
        "필요한 사항: Protect Go 계정, 어드민 또는 매니저 권한",
      ],
      type: "paragraph",
    },
    {
      id: "step1",
      heading: "1단계: 프로젝트 이름 입력",
      content: [
        "상단 내비게이션에서 '프로젝트 관리'를 선택합니다.",
        "'새 프로젝트 생성' 버튼을 클릭합니다.",
        "프로젝트 이름을 입력합니다. 이름은 2자 이상 50자 이하로 입력해야 합니다.",
        "이미 사용 중인 이름이면 오류가 표시됩니다. 다른 이름을 사용해주세요.",
      ],
      type: "steps",
    },
    {
      id: "step2",
      heading: "2단계: 기간 설정",
      content: [
        "프로젝트 시작일과 종료일을 선택합니다.",
        "시작일은 오늘 이후 날짜만 선택할 수 있습니다.",
        "종료일은 시작일 이후 날짜여야 합니다.",
      ],
      type: "steps",
    },
    {
      id: "step3",
      heading: "3단계: 담당자 지정",
      content: [
        "팀 목록에서 담당자를 한 명 이상 지정합니다.",
        "담당자는 이후 설정 화면에서 변경할 수 있습니다.",
      ],
      type: "steps",
    },
    {
      id: "step4",
      heading: "4단계: 최종 확인 및 생성",
      content: [
        "입력한 정보를 확인한 후 '프로젝트 생성' 버튼을 클릭합니다.",
        "생성된 프로젝트는 프로젝트 목록 상단에 표시됩니다.",
      ],
      type: "steps",
    },
    {
      id: "next",
      heading: "다음 단계",
      content: [
        "탐지 시나리오 구성하기",
        "담당자 및 알림 설정",
      ],
      type: "links",
    },
  ],
};

const BADGE_COLORS = {
  튜토리얼: "positive",
  하우투: "primary",
  레퍼런스: "neutral",
  설명: "warning",
};

// desc 텍스트는 inspection/policies.js의 DESCRIPTIONS를 단일 출처로 사용
const D = {
  backNav:
    "[4-0] 가이드 홈으로 이동\n\n· 브레드크럼 최상위 — 가이드 홈 화면(Screen 03)으로 이동\n[정책]\n· 클릭 시 도메인 필터 상태 초기화 (전체 탭으로 복귀)",
  tocItem:
    "[4-1] 목차 (TOC) 항목\n\n· 클릭 시 해당 섹션으로 스크롤 이동\n[정책]\n· 섹션 ID로 scrollIntoView 호출 (behavior: smooth)\n· 현재 뷰포트 내 섹션 하이라이트는 후속 구현",
  nextLink:
    "[4-2] 다음 단계 링크\n\n· 이 문서와 연관된 다음 가이드 문서로 이동하는 인라인 링크\n[정책]\n· 클릭 시 해당 문서 상세 페이지로 이동 (후속 구현)\n· 연결 대상 문서 ID는 가이드 문서 편집기에서 지정 (후속)",
};

function Section({ section }) {
  return (
    <section id={section.id} style={{ marginBottom: "var(--spacing-32)" }}>
      <h2
        style={{
          font: "var(--text-heading-2-semibold)",
          color: "var(--semantic-text-default)",
          margin: "0 0 var(--spacing-16) 0",
          paddingBottom: "var(--spacing-8)",
          borderBottom: "1px solid var(--semantic-line-default)",
        }}
      >
        {section.heading}
      </h2>

      {section.type === "steps" && (
        <ol
          style={{
            margin: 0,
            padding: "0 0 0 var(--spacing-24)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-12)",
          }}
        >
          {section.content.map((item, i) => (
            <li
              key={i}
              style={{
                font: "var(--text-body-2-reading-regular)",
                color: "var(--semantic-text-default)",
                lineHeight: 1.7,
              }}
            >
              {item}
            </li>
          ))}
        </ol>
      )}

      {section.type === "paragraph" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
          {section.content.map((item, i) => (
            <p
              key={i}
              style={{
                font: "var(--text-body-2-reading-regular)",
                color: "var(--semantic-text-default)",
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              {item}
            </p>
          ))}
        </div>
      )}

      {section.type === "links" && (
        <ul
          style={{
            margin: 0,
            padding: "0 0 0 var(--spacing-24)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-8)",
          }}
        >
          {section.content.map((item, i) => (
            <li key={i}>
              <button
                desc={D.nextLink}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  font: "var(--text-body-2-reading-regular)",
                  color: "var(--semantic-primary-default)",
                  padding: 0,
                  textAlign: "left",
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function GuideEntryDetail({ onNavigate }) {
  const entry = MOCK_ENTRY_DETAIL;

  return (
    <div
      style={{
        background: "var(--semantic-natural-extra-light)",
        minHeight: "100vh",
      }}
    >
      {/* 상단 네비게이션 바 */}
      <div
        style={{
          background: "var(--semantic-bg-default)",
          borderBottom: "1px solid var(--semantic-line-default)",
          padding: "var(--spacing-12) var(--spacing-32)",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-8)",
        }}
      >
        <button
          desc={D.backNav}
          onClick={() => onNavigate("guide-home")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            font: "var(--text-label-2-regular)",
            color: "var(--semantic-text-sub)",
            padding: 0,
          }}
        >
          사용자 가이드
        </button>
        <span style={{ color: "var(--semantic-natural-strong)" }}>/</span>
        <span
          style={{
            font: "var(--text-label-2-regular)",
            color: "var(--semantic-text-sub)",
          }}
        >
          {entry.domain}
        </span>
        <span style={{ color: "var(--semantic-natural-strong)" }}>/</span>
        <span
          style={{
            font: "var(--text-label-2-regular)",
            color: "var(--semantic-text-default)",
          }}
        >
          {entry.title}
        </span>
      </div>

      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--spacing-32)",
          display: "flex",
          gap: "var(--spacing-32)",
          alignItems: "flex-start",
        }}
      >
        {/* 본문 */}
        <article style={{ flex: 1, minWidth: 0 }}>
          <header style={{ marginBottom: "var(--spacing-32)" }}>
            <ContentBadge
              variant="fill"
              color={BADGE_COLORS[entry.type] || "neutral"}
              label={entry.type}
              style={{ marginBottom: "var(--spacing-12)" }}
            />
            <h1
              style={{
                font: "var(--text-title-1-semibold)",
                color: "var(--semantic-text-default)",
                margin: "var(--spacing-12) 0 var(--spacing-12) 0",
              }}
            >
              {entry.title}
            </h1>
            <div
              style={{
                display: "flex",
                gap: "var(--spacing-16)",
                font: "var(--text-label-2-regular)",
                color: "var(--semantic-text-sub)",
              }}
            >
              <span>{entry.domain}</span>
              <span>마지막 수정: {entry.lastUpdated}</span>
              <span>{entry.readTime} 읽기</span>
            </div>
          </header>

          {entry.sections.map((section) => (
            <Section key={section.id} section={section} />
          ))}
        </article>

        {/* 목차 사이드바 */}
        <aside
          style={{
            width: 200,
            flexShrink: 0,
            position: "sticky",
            top: "var(--spacing-32)",
          }}
        >
          <div
            style={{
              background: "var(--semantic-bg-default)",
              borderRadius: "var(--radius-large)",
              border: "1px solid var(--semantic-line-default)",
              padding: "var(--spacing-16)",
              boxShadow: "var(--level-1)",
            }}
          >
            <div
              style={{
                font: "var(--text-label-2-semibold)",
                color: "var(--semantic-text-sub)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "var(--spacing-12)",
              }}
            >
              목차
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
              {entry.toc.map((item) => (
                <button
                  key={item.id}
                  desc={D.tocItem}
                  onClick={() => {
                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    font: "var(--text-label-2-regular)",
                    color: "var(--semantic-text-sub)",
                    textAlign: "left",
                    padding: "var(--spacing-4) var(--spacing-8)",
                    borderRadius: "var(--radius-small)",
                    transition: "color 100ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--semantic-text-default)";
                    e.currentTarget.style.background = "var(--semantic-natural-extra-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--semantic-text-sub)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
