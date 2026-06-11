import { useState } from "react";
import { ContentBadge } from "@idbrnd/design-system";

const MOCK_ENTRIES = {
  전체: {
    튜토리얼: [
      { id: 1, title: "신규 프로젝트 생성", domain: "프로젝트 생성", readTime: "5분" },
      { id: 7, title: "알림 시스템 초기 설정", domain: "알림 시스템 개편", readTime: "7분" },
    ],
    하우투: [
      { id: 2, title: "프로젝트 이름·기간 설정", domain: "프로젝트 생성", readTime: "3분" },
      { id: 6, title: "탐지 시나리오 구성", domain: "탐지 시나리오·노드", readTime: "8분" },
    ],
    레퍼런스: [
      { id: 3, title: "프로젝트 생성 정책 참조", domain: "프로젝트 생성", readTime: "2분" },
    ],
    설명: [
      { id: 4, title: "프로젝트 생성 개요", domain: "프로젝트 생성", readTime: "4분" },
      { id: 5, title: "탐지 노드 개요", domain: "탐지 시나리오·노드", readTime: "6분" },
    ],
  },
};

const DIATAXIS_TYPES = ["튜토리얼", "하우투", "레퍼런스", "설명"];

const DIATAXIS_DESCRIPTIONS = {
  튜토리얼: "처음 사용하는 분을 위한 단계별 안내",
  하우투: "특정 작업을 수행하는 방법",
  레퍼런스: "설정값·정책·옵션 조회",
  설명: "배경·개념·원리 이해",
};

const DOMAIN_TABS = [
  { value: "전체", label: "전체" },
  { value: "프로젝트 생성", label: "프로젝트 생성" },
  { value: "탐지 시나리오·노드", label: "탐지 시나리오·노드" },
  { value: "조치이력", label: "조치이력" },
  { value: "알림 시스템 개편", label: "알림 시스템 개편" },
];

const BADGE_COLORS = {
  튜토리얼: "positive",
  하우투: "primary",
  레퍼런스: "neutral",
  설명: "warning",
};

// desc 텍스트는 inspection/policies.js의 DESCRIPTIONS를 단일 출처로 사용
const D = {
  domainTab:
    "[3-0] 도메인 탭\n\n· 가이드 홈을 도메인 단위로 필터링하는 탭 바\n[옵션]\n· 전체 / 프로젝트 생성 / 탐지 시나리오·노드 / 조치이력 / 알림 시스템 개편\n[정책]\n· 선택한 도메인의 문서만 노출\n· 해당 도메인에 문서가 없는 유형 섹션은 숨김",
  entryCard:
    "[3-1] 가이드 문서 카드\n\n· Diátaxis 유형별 가이드 문서를 카드 형태로 탐색\n[정책]\n· 클릭 시 가이드 문서 상세 화면(Screen 04)으로 이동\n· 호버 시 강한 그림자 표시\n· 빌드 성공한 문서만 노출",
};

function EntryCard({ entry, type, onNavigate }) {
  return (
    <div
      role="button"
      desc={D.entryCard}
      onClick={() => onNavigate("guide-detail")}
      style={{
        background: "var(--semantic-bg-default)",
        border: "1px solid var(--semantic-line-default)",
        borderRadius: "var(--radius-large)",
        padding: "var(--spacing-16)",
        cursor: "pointer",
        transition: "box-shadow 100ms",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-8)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--level-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <ContentBadge
        variant="fill"
        color={BADGE_COLORS[type] || "neutral"}
        label={type}
        size="small"
      />
      <p
        style={{
          font: "var(--text-body-2-normal-semibold)",
          color: "var(--semantic-text-default)",
          margin: 0,
        }}
      >
        {entry.title}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-8)",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            font: "var(--text-label-2-regular)",
            color: "var(--semantic-text-sub)",
          }}
        >
          {entry.domain}
        </span>
        <span
          style={{
            font: "var(--text-label-2-regular)",
            color: "var(--semantic-text-sub)",
          }}
        >
          {entry.readTime} 읽기
        </span>
      </div>
    </div>
  );
}

export default function GuideHome({ onNavigate }) {
  const [selectedDomain, setSelectedDomain] = useState("전체");

  const entries = MOCK_ENTRIES["전체"];

  return (
    <div style={{ background: "var(--semantic-natural-extra-light)", minHeight: "100vh" }}>
      {/* 가이드 헤더 */}
      <div
        style={{
          background: "var(--semantic-natural-deep)",
          padding: "var(--spacing-48) var(--spacing-32)",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div
            style={{
              font: "var(--text-label-2-semibold)",
              color: "var(--semantic-natural-white)",
              opacity: 0.6,
              marginBottom: "var(--spacing-8)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Protect Go
          </div>
          <h1
            style={{
              font: "var(--text-title-1-semibold)",
              color: "var(--semantic-natural-white)",
              margin: "0 0 var(--spacing-12) 0",
            }}
          >
            사용자 가이드
          </h1>
          <p
            style={{
              font: "var(--text-body-2-reading-regular)",
              color: "var(--semantic-natural-white)",
              opacity: 0.75,
              margin: 0,
              maxWidth: 560,
            }}
          >
            Protect Go 기능을 이해하고 활용하는 방법을 안내합니다.
          </p>
        </div>
      </div>

      {/* 도메인 탭 */}
      <div
        style={{
          background: "var(--semantic-bg-default)",
          borderBottom: "1px solid var(--semantic-line-default)",
          padding: "0 var(--spacing-32)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            display: "flex",
            gap: 0,
          }}
        >
          {DOMAIN_TABS.map((tab) => {
            const isActive = selectedDomain === tab.value;
            return (
              <button
                key={tab.value}
                desc={D.domainTab}
                onClick={() => setSelectedDomain(tab.value)}
                style={{
                  padding: "var(--spacing-16) var(--spacing-20)",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid var(--semantic-primary-default)"
                    : "2px solid transparent",
                  cursor: "pointer",
                  font: isActive
                    ? "var(--text-body-2-normal-semibold)"
                    : "var(--text-body-2-normal-regular)",
                  color: isActive
                    ? "var(--semantic-primary-default)"
                    : "var(--semantic-text-sub)",
                  whiteSpace: "nowrap",
                  transition: "color 100ms",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Diátaxis 유형별 섹션 */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--spacing-32)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-32)",
        }}
      >
        {DIATAXIS_TYPES.map((type) => {
          const typeEntries = entries[type] || [];
          const filtered =
            selectedDomain === "전체"
              ? typeEntries
              : typeEntries.filter((e) => e.domain === selectedDomain);
          if (filtered.length === 0) return null;

          return (
            <section key={type}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-12)",
                  marginBottom: "var(--spacing-16)",
                }}
              >
                <ContentBadge
                  variant="fill"
                  color={BADGE_COLORS[type] || "neutral"}
                  label={type}
                />
                <div>
                  <h2
                    style={{
                      font: "var(--text-heading-2-semibold)",
                      color: "var(--semantic-text-default)",
                      margin: 0,
                    }}
                  >
                    {type}
                  </h2>
                  <p
                    style={{
                      font: "var(--text-label-2-regular)",
                      color: "var(--semantic-text-sub)",
                      margin: "var(--spacing-4) 0 0 0",
                    }}
                  >
                    {DIATAXIS_DESCRIPTIONS[type]}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "var(--spacing-12)",
                }}
              >
                {filtered.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    type={type}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
