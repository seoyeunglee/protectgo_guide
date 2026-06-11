import { useState } from "react";
import { FillButton, StateBadge, Spinner } from "@idbrnd/design-system";
import PageLayout from "../components/PageLayout";

const MOCK_BUILD_HISTORY = [
  { id: "b-008", startedAt: "2026-06-08 14:32", duration: "1분 12초", status: "성공", triggeredBy: "이서영" },
  { id: "b-007", startedAt: "2026-06-07 11:10", duration: "1분 05초", status: "성공", triggeredBy: "이서영" },
  { id: "b-006", startedAt: "2026-06-06 16:45", duration: "2분 31초", status: "실패", triggeredBy: "이서영" },
  { id: "b-005", startedAt: "2026-06-05 09:20", duration: "1분 08초", status: "성공", triggeredBy: "이서영" },
];

const MOCK_FAILED_ENTRIES = [
  { id: 3, title: "프로젝트 생성 정책 참조" },
];

// desc 텍스트는 inspection/policies.js의 DESCRIPTIONS를 단일 출처로 사용
const D = {
  buildRun:
    "[7-0] 빌드 실행\n\n· 가이드 문서 전체를 가이드 웹페이지로 변환하는 빌드 시작\n[정책]\n· 빌드 진행 중 버튼 비활성화 (중복 실행 방지)\n· 화면 참조 미입력 문서 처리:\n  - 경고 발생 후 해당 문서를 가이드에서 제외\n  - 빌드 실패 문서 목록에 표시\n· 빌드 성공 시 가이드 홈(Screen 03)에 즉시 반영\n· 빌드 실패 시 원인 문서 목록과 편집기 이동 안내 표시",
};

function StatusCard({ build, isBuilding }) {
  return (
    <div
      style={{
        background: "var(--semantic-bg-default)",
        borderRadius: "var(--radius-large)",
        border: "1px solid var(--semantic-line-default)",
        padding: "var(--spacing-24)",
        boxShadow: "var(--level-1)",
        marginBottom: "var(--spacing-24)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-16)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-12)" }}>
        {isBuilding ? (
          <Spinner size="medium" />
        ) : (
          <StateBadge
            variant={build.status === "성공" ? "positive" : "danger"}
            label={build.status === "성공" ? "빌드 성공" : "빌드 실패"}
            stateIcon
          />
        )}
        <h2
          style={{
            font: "var(--text-heading-2-semibold)",
            color: "var(--semantic-text-default)",
            margin: 0,
          }}
        >
          {isBuilding ? "빌드 진행 중" : `최근 빌드 ${build.status === "성공" ? "성공" : "실패"}`}
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--spacing-16)",
        }}
      >
        <div>
          <div
            style={{
              font: "var(--text-label-2-semibold)",
              color: "var(--semantic-text-sub)",
              marginBottom: "var(--spacing-4)",
            }}
          >
            빌드 ID
          </div>
          <div style={{ font: "var(--text-body-2-normal-regular)", color: "var(--semantic-text-default)" }}>
            {isBuilding ? "진행 중..." : build.id}
          </div>
        </div>
        <div>
          <div
            style={{
              font: "var(--text-label-2-semibold)",
              color: "var(--semantic-text-sub)",
              marginBottom: "var(--spacing-4)",
            }}
          >
            시작 시각
          </div>
          <div style={{ font: "var(--text-body-2-normal-regular)", color: "var(--semantic-text-default)" }}>
            {isBuilding ? "방금 전" : build.startedAt}
          </div>
        </div>
        <div>
          <div
            style={{
              font: "var(--text-label-2-semibold)",
              color: "var(--semantic-text-sub)",
              marginBottom: "var(--spacing-4)",
            }}
          >
            소요 시간
          </div>
          <div style={{ font: "var(--text-body-2-normal-regular)", color: "var(--semantic-text-default)" }}>
            {isBuilding ? "--" : build.duration}
          </div>
        </div>
      </div>

      {/* 실패 항목 안내 */}
      {!isBuilding && build.status === "실패" && (
        <div
          style={{
            background: "var(--semantic-content-danger-extra-light)",
            border: "1px solid var(--semantic-content-danger-light)",
            borderRadius: "var(--radius-medium)",
            padding: "var(--spacing-12) var(--spacing-16)",
          }}
        >
          <div
            style={{
              font: "var(--text-body-2-normal-semibold)",
              color: "var(--semantic-content-danger-default)",
              marginBottom: "var(--spacing-8)",
            }}
          >
            빌드 실패 문서
          </div>
          {MOCK_FAILED_ENTRIES.map((entry) => (
            <div
              key={entry.id}
              style={{
                font: "var(--text-body-2-normal-regular)",
                color: "var(--semantic-text-default)",
              }}
            >
              {entry.title}
            </div>
          ))}
          <div
            style={{
              font: "var(--text-label-2-regular)",
              color: "var(--semantic-text-sub)",
              marginTop: "var(--spacing-8)",
            }}
          >
            필수 필드(screen_ref)가 비어 있어 빌드에 실패했습니다. 가이드 문서 편집기에서 값을 입력한 후 다시 빌드해주세요.
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuildStatus({ onNavigate }) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [history, setHistory] = useState(MOCK_BUILD_HISTORY);

  function handleBuild() {
    setIsBuilding(true);
    setTimeout(() => {
      setIsBuilding(false);
      setHistory((prev) => [
        {
          id: `b-${String(Number(prev[0].id.split("-")[1]) + 1).padStart(3, "0")}`,
          startedAt: "방금 전",
          duration: "1분 18초",
          status: "성공",
          triggeredBy: "이서영",
        },
        ...prev,
      ]);
    }, 2500);
  }

  return (
    <PageLayout
      title="빌드 상태"
      actions={
        <FillButton
          desc={D.buildRun}
          variant="primary"
          size="small"
          disabled={isBuilding}
          onClick={handleBuild}
        >
          {isBuilding ? "빌드 중..." : "빌드 실행"}
        </FillButton>
      }
    >
      {/* 현재 빌드 상태 */}
      <StatusCard build={history[0]} isBuilding={isBuilding} />

      {/* 빌드 이력 */}
      <div
        style={{
          background: "var(--semantic-bg-default)",
          borderRadius: "var(--radius-large)",
          border: "1px solid var(--semantic-line-default)",
          boxShadow: "var(--level-1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "var(--spacing-16) var(--spacing-24)",
            borderBottom: "1px solid var(--semantic-line-default)",
          }}
        >
          <h3
            style={{
              font: "var(--text-heading-2-semibold)",
              color: "var(--semantic-text-default)",
              margin: 0,
            }}
          >
            빌드 이력
          </h3>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "var(--semantic-natural-extra-light)",
                borderBottom: "1px solid var(--semantic-line-default)",
              }}
            >
              {["빌드 ID", "시작 시각", "소요 시간", "상태", "실행자"].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "var(--spacing-12) var(--spacing-16)",
                    font: "var(--text-label-2-semibold)",
                    color: "var(--semantic-text-sub)",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((build) => (
              <tr
                key={build.id}
                style={{ borderBottom: "1px solid var(--semantic-line-default)" }}
              >
                <td
                  style={{
                    padding: "var(--spacing-12) var(--spacing-16)",
                    font: "var(--text-body-2-normal-regular)",
                    color: "var(--semantic-text-sub)",
                  }}
                >
                  {build.id}
                </td>
                <td
                  style={{
                    padding: "var(--spacing-12) var(--spacing-16)",
                    font: "var(--text-body-2-normal-regular)",
                    color: "var(--semantic-text-default)",
                  }}
                >
                  {build.startedAt}
                </td>
                <td
                  style={{
                    padding: "var(--spacing-12) var(--spacing-16)",
                    font: "var(--text-body-2-normal-regular)",
                    color: "var(--semantic-text-default)",
                  }}
                >
                  {build.duration}
                </td>
                <td style={{ padding: "var(--spacing-12) var(--spacing-16)" }}>
                  <StateBadge
                    variant={build.status === "성공" ? "positive" : "danger"}
                    label={build.status}
                  />
                </td>
                <td
                  style={{
                    padding: "var(--spacing-12) var(--spacing-16)",
                    font: "var(--text-body-2-normal-regular)",
                    color: "var(--semantic-text-default)",
                  }}
                >
                  {build.triggeredBy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 안내 */}
      <div
        style={{
          marginTop: "var(--spacing-16)",
          font: "var(--text-label-2-regular)",
          color: "var(--semantic-text-sub)",
        }}
      >
        빌드는 가이드 문서를 Protect Go 사용자 가이드 웹페이지로 변환합니다. 빌드 성공 시 가이드 홈에 즉시 반영됩니다.
      </div>
    </PageLayout>
  );
}
