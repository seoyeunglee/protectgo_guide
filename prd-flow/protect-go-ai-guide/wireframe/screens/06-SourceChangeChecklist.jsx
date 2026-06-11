import { useState } from "react";
import { FillButton, Select, StateBadge, ContentBadge } from "@idbrnd/design-system";
import PageLayout from "../components/PageLayout";

const SOURCE_OPTIONS = [
  { value: "", label: "변경된 소스를 선택해주세요." },
  { value: "prd", label: "PRD (기획 문서)" },
  { value: "pdf", label: "화면설계서 PDF" },
  { value: "code", label: "프론트엔드 코드" },
  { value: "ticket", label: "티켓 (수용 기준)" },
  { value: "deployment", label: "라이브 배포 소스 (프로토타입)" },
];

const CHECKLISTS = {
  prd: {
    label: "PRD 변경",
    questions: [
      { id: "prd-title", text: "문서 제목·설명에 영향이 있는 변경인가?" },
      { id: "prd-scope", text: "기능 범위·대상 페르소나가 변경되었는가?" },
    ],
    fields: ["title", "description"],
  },
  pdf: {
    label: "화면설계서 PDF 변경",
    questions: [
      { id: "pdf-policy", text: "정책 조건(상태 전환·유효성·예외)이 변경되었는가?" },
      { id: "pdf-error", text: "오류 메시지·안내 문구가 변경되었는가?" },
    ],
    fields: ["policy"],
  },
  code: {
    label: "프론트엔드 코드 변경",
    questions: [
      { id: "code-component", text: "화면 참조(screen_ref)가 가리키는 컴포넌트가 변경되었는가?" },
      { id: "code-path", text: "컴포넌트 파일 경로가 변경되었는가?" },
    ],
    fields: ["screenRef"],
  },
  ticket: {
    label: "티켓 변경",
    questions: [
      { id: "ticket-ac", text: "수용 기준(AC)이 변경되었는가?" },
      { id: "ticket-scope", text: "구현 범위나 우선순위가 변경되었는가?" },
    ],
    fields: ["acceptance"],
  },
  deployment: {
    label: "라이브 배포 소스 변경",
    questions: [
      { id: "deploy-content", text: "배포 URL이 마지막 스냅샷 이후 바뀌었는가? (content_hash·deployed_at 비교)" },
      { id: "deploy-promote", text: "시안(draft) 값이 확정 사양으로 승격됐는가?" },
    ],
    fields: ["policy", "screenRef"],
  },
};

const MOCK_AFFECTED_ENTRIES = [
  { id: 1, title: "신규 프로젝트 생성", domain: "프로젝트 생성", type: "튜토리얼", impact: "높음" },
  { id: 2, title: "프로젝트 이름·기간 설정", domain: "프로젝트 생성", type: "하우투", impact: "낮음" },
  { id: 3, title: "프로젝트 생성 정책 참조", domain: "프로젝트 생성", type: "레퍼런스", impact: "높음" },
];

// desc 텍스트는 inspection/policies.js의 DESCRIPTIONS를 단일 출처로 사용
// 번호 체계: 6-0 source-sel  6-1 impact-q  6-2 impact-check  6-3 edit-affected  6-4 deploy-sync
const D = {
  sourceSelect:
    "[6-0] 변경 소스 선택\n\n· 어떤 소스가 변경되었는지 선택\n[옵션]\n· PRD (기획 문서) — title·description 필드 영향\n· 화면설계서 PDF — policy 필드 영향\n· 프론트엔드 코드 — screen_ref 필드 영향\n· 티켓 (수용 기준) — acceptance 필드 영향\n· 라이브 배포 소스 (프로토타입) — policy·screen_ref 필드 영향 (draft 출처, F8)\n[정책]\n· 선택 변경 시 체크리스트·결과 목록 초기화",
  impactQ:
    "[6-1] 영향 확인 질문\n\n· 선택한 소스 변경이 특정 필드에 영향을 주는지 예·아니요로 확인\n[정책]\n· 모든 질문에 답해야 '영향받는 문서 확인' 버튼 활성화\n· 전부 '아니요'이면 '영향 없음 — 갱신 불필요' 상태로 버튼 표시\n· 라이브 배포 소스의 콘텐츠 변경 여부는 fetch_deployment_source.py 스냅샷 비교로 판단(아래 '최신 배포로 동기화' 참고)",
  impactCheck:
    "[6-2] 영향받는 문서 확인\n\n· 체크리스트 응답을 바탕으로 갱신이 필요한 문서 목록 표시\n[정책]\n· 하나라도 '예' 응답이 있을 때만 활성화\n· 영향도(높음·낮음)는 변경 소스와 문서 유형의 관계로 판단",
  entryEdit:
    "[6-3] 영향 문서 편집\n\n· 영향받는 문서를 직접 편집기(02)로 열어 수정\n[정책]\n· 클릭 시 해당 문서 ID로 편집기 진입\n· 편집 완료 후 변경 영향 점검 화면으로 복귀 불가 (후속 구현)",
  deploySync:
    "[6-4] 최신 배포로 동기화 (mock)\n\n· 배포 production alias URL을 다시 페치해 직전 스냅샷과 비교(agent/scripts/fetch_deployment_source.py fetch)\n· 변경된 섹션을 참조하는 KB 필드의 provenance.deployment 메타데이터 갱신 대상을 표시(sync)\n[정책]\n· 본문(policy·screen_ref 등) 자동 재생성은 하지 않음 — 사람이 검토 후 직접 갱신\n· 이 화면의 버튼은 시각적 mock — 실제 동작은 CLI(fetch_deployment_source.py)로 수행",
};

export default function SourceChangeChecklist({ onNavigate }) {
  const [selectedSource, setSelectedSource] = useState("");
  const [answers, setAnswers] = useState({});
  const [showAffected, setShowAffected] = useState(false);

  const checklist = selectedSource ? CHECKLISTS[selectedSource] : null;
  const allAnswered = checklist
    ? checklist.questions.every((q) => answers[q.id] !== undefined)
    : false;
  const anyYes = checklist
    ? checklist.questions.some((q) => answers[q.id] === true)
    : false;

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <PageLayout
      title="소스 변경 영향 점검"
      breadcrumb={[
        { label: "가이드 문서 목록", onClick: () => onNavigate("kb-list") },
        { label: "소스 변경 영향 점검", current: true },
      ]}
    >
      {/* 소스 선택 */}
      <div
        style={{
          background: "var(--semantic-bg-default)",
          borderRadius: "var(--radius-large)",
          border: "1px solid var(--semantic-line-default)",
          padding: "var(--spacing-24)",
          boxShadow: "var(--level-1)",
          marginBottom: "var(--spacing-24)",
        }}
      >
        <h3
          style={{
            font: "var(--text-heading-2-semibold)",
            color: "var(--semantic-text-default)",
            margin: "0 0 var(--spacing-8) 0",
          }}
        >
          어떤 소스가 변경되었나요?
        </h3>
        <p
          style={{
            font: "var(--text-body-2-normal-regular)",
            color: "var(--semantic-text-sub)",
            margin: "0 0 var(--spacing-16) 0",
          }}
        >
          변경된 소스를 선택하면 영향받는 가이드 문서 필드를 파악할 수 있습니다.
        </p>
        <Select
          desc={D.sourceSelect}
          options={SOURCE_OPTIONS}
          value={selectedSource}
          onChange={(v) => {
            setSelectedSource(v);
            setAnswers({});
            setShowAffected(false);
          }}
          style={{ width: 320 }}
        />

        {selectedSource === "deployment" && (
          <div style={{ marginTop: "var(--spacing-16)" }}>
            <FillButton desc={D.deploySync} variant="secondary" size="small" onClick={() => {}}>
              최신 배포로 동기화
            </FillButton>
          </div>
        )}
      </div>

      {/* 영향 체크리스트 */}
      {checklist && (
        <div
          style={{
            background: "var(--semantic-bg-default)",
            borderRadius: "var(--radius-large)",
            border: "1px solid var(--semantic-line-default)",
            padding: "var(--spacing-24)",
            boxShadow: "var(--level-1)",
            marginBottom: "var(--spacing-24)",
          }}
        >
          <h3
            style={{
              font: "var(--text-heading-2-semibold)",
              color: "var(--semantic-text-default)",
              margin: "0 0 var(--spacing-16) 0",
            }}
          >
            {checklist.label} — 영향 확인
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-16)" }}>
            {checklist.questions.map((q) => (
              <div
                key={q.id}
                style={{
                  padding: "var(--spacing-16)",
                  border: "1px solid var(--semantic-line-default)",
                  borderRadius: "var(--radius-medium)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-12)",
                }}
              >
                <div
                  style={{
                    font: "var(--text-body-2-normal-regular)",
                    color: "var(--semantic-text-default)",
                  }}
                >
                  {q.text}
                </div>
                <div style={{ display: "flex", gap: "var(--spacing-16)" }}>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      desc={D.impactQ}
                      name={q.id}
                      value="yes"
                      checked={answers[q.id] === true}
                      onChange={() => setAnswer(q.id, true)}
                      style={{ accentColor: "var(--semantic-primary-default)" }}
                    />
                    <span
                      style={{
                        font: "var(--text-body-2-normal-regular)",
                        color: "var(--semantic-text-default)",
                      }}
                    >
                      예
                    </span>
                  </label>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      desc={D.impactQ}
                      name={q.id}
                      value="no"
                      checked={answers[q.id] === false}
                      onChange={() => setAnswer(q.id, false)}
                      style={{ accentColor: "var(--semantic-primary-default)" }}
                    />
                    <span
                      style={{
                        font: "var(--text-body-2-normal-regular)",
                        color: "var(--semantic-text-default)",
                      }}
                    >
                      아니요
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {allAnswered && (
            <div style={{ marginTop: "var(--spacing-20)", display: "flex", justifyContent: "flex-end" }}>
              <FillButton
                desc={D.impactCheck}
                variant="primary"
                size="small"
                onClick={() => setShowAffected(true)}
                disabled={!anyYes}
              >
                {anyYes ? "영향받는 문서 확인" : "영향 없음 — 갱신 불필요"}
              </FillButton>
            </div>
          )}
        </div>
      )}

      {/* 영향받는 엔트리 목록 */}
      {showAffected && anyYes && (
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                font: "var(--text-heading-2-semibold)",
                color: "var(--semantic-text-default)",
                margin: 0,
              }}
            >
              갱신이 필요한 가이드 문서
            </h3>
            <StateBadge
              variant="warning"
              label={`${MOCK_AFFECTED_ENTRIES.length}개 문서`}
            />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "var(--semantic-natural-extra-light)",
                  borderBottom: "1px solid var(--semantic-line-default)",
                }}
              >
                {["문서 제목", "도메인", "유형", "영향도", ""].map((col, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "var(--spacing-12) var(--spacing-16)",
                      font: "var(--text-label-2-semibold)",
                      color: "var(--semantic-text-sub)",
                      textAlign: "left",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_AFFECTED_ENTRIES.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: "1px solid var(--semantic-line-default)" }}
                >
                  <td
                    style={{
                      padding: "var(--spacing-12) var(--spacing-16)",
                      font: "var(--text-body-2-normal-semibold)",
                      color: "var(--semantic-text-default)",
                    }}
                  >
                    {entry.title}
                  </td>
                  <td style={{ padding: "var(--spacing-12) var(--spacing-16)" }}>
                    <ContentBadge variant="outline" color="neutral" label={entry.domain} />
                  </td>
                  <td style={{ padding: "var(--spacing-12) var(--spacing-16)" }}>
                    <ContentBadge variant="outline" color="primary" label={entry.type} />
                  </td>
                  <td style={{ padding: "var(--spacing-12) var(--spacing-16)" }}>
                    <StateBadge
                      variant={entry.impact === "높음" ? "danger" : "warning"}
                      label={`영향도 ${entry.impact}`}
                    />
                  </td>
                  <td style={{ padding: "var(--spacing-12) var(--spacing-16)" }}>
                    <button
                      desc={D.entryEdit}
                      onClick={() => onNavigate("kb-editor")}
                      style={{
                        background: "none",
                        border: "1px solid var(--semantic-line-default)",
                        borderRadius: "var(--radius-medium)",
                        padding: "var(--spacing-4) var(--spacing-12)",
                        cursor: "pointer",
                        font: "var(--text-label-2-regular)",
                        color: "var(--semantic-text-default)",
                      }}
                    >
                      문서 편집
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
