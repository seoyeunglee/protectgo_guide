import { useState } from "react";
import {
  FillButton,
  OutlineButton,
  Input,
  Select,
  ContentBadge,
  StateBadge,
  showToast,
} from "@idbrnd/design-system";
import PageLayout from "../components/PageLayout";

const MOCK_ENTRY = {
  id: 1,
  title: "신규 프로젝트 생성",
  description:
    "Protect Go에서 신규 프로젝트를 생성하는 전체 과정을 단계별로 안내합니다. 이 튜토리얼을 따라 첫 프로젝트를 완료할 수 있습니다.",
  domain: "프로젝트 생성",
  type: "튜토리얼",
  policy:
    "- 프로젝트 이름은 2자 이상 50자 이하여야 합니다.\n- 시작일은 오늘 이후로만 설정 가능합니다.\n- 동일한 이름의 프로젝트가 이미 존재하면 생성이 불가합니다.",
  screenRef: "",
  acceptance: "AC-1: 사용자가 프로젝트를 생성하면 목록 페이지에 즉시 반영된다.",
  provenance: {
    title: { source: "PRD", version: "v1.0" },
    description: { source: "PRD", version: "v1.0" },
    policy: { source: "화면설계서 PDF", version: "v2.3" },
    screenRef: { source: "프론트엔드 코드", version: "미확인" },
    acceptance: { source: "티켓", version: "PROJ-42" },
  },
};

const DOMAIN_OPTIONS = [
  { value: "프로젝트 생성", label: "프로젝트 생성" },
  { value: "탐지 시나리오·노드", label: "탐지 시나리오·노드" },
  { value: "조치이력", label: "조치이력" },
  { value: "알림 시스템 개편", label: "알림 시스템 개편" },
];

const TYPE_OPTIONS = [
  { value: "튜토리얼", label: "튜토리얼" },
  { value: "하우투", label: "하우투" },
  { value: "레퍼런스", label: "레퍼런스" },
  { value: "설명", label: "설명" },
];

// desc 텍스트는 inspection/policies.js의 DESCRIPTIONS를 단일 출처로 사용
// 번호 체계는 policies.js와 동기화:
//   2-0 sel-domain  2-1 sel-type  2-2 tmpl-guide  2-3 inp-title
//   2-4 inp-desc    2-5 inp-policy 2-6 inp-screenref 2-7 inp-accept
//   2-8 btn-checklist  2-9 btn-cancel  2-10 btn-save
const D = {
  cancel:
    "[2-9] 취소\n\n· 저장하지 않고 가이드 문서 목록으로 돌아가기\n[정책]\n· 미저장 변경사항은 버려짐 — 확인 다이얼로그는 후속 구현",
  save:
    "[2-10] 저장\n\n· 모든 필드를 검증한 후 가이드에 저장\n[정책]\n· 도메인·유형 미선택 시 저장 불가\n· 저장 성공 시 안내 메시지 표시 후 목록으로 이동",
  domain:
    "[2-0] 도메인 선택\n\n· 이 문서가 속하는 Protect Go 기능 도메인\n[옵션]\n· 프로젝트 생성 / 탐지 시나리오·노드 / 조치이력 / 알림 시스템 개편\n[정책]\n· 필수 입력 — 미선택 시 저장 불가\n· 가이드 홈 도메인 탭과 1:1 매핑",
  type:
    "[2-1] Diátaxis 유형 선택\n\n· 이 문서의 콘텐츠 유형 (Diátaxis 4분류)\n[옵션]\n· 튜토리얼: 단계별 안내 — 필수: 도메인·제목·설명·화면 참조·수용 기준\n· 하우투: 작업 방법 — 필수: 도메인·제목·설명·화면 참조\n· 레퍼런스: 정책·옵션 조회 — 필수: 도메인·제목·설명·정책\n· 설명: 개념·원리 — 필수: 도메인·제목·설명\n[정책]\n· 필수 입력 — 미선택 시 저장 불가\n· 선택 전 '템플릿 가이드 보기' 링크 표시",
  typeGuide:
    "[2-2] 템플릿 가이드 바로가기\n\n· Diátaxis 유형이 선택되지 않은 상태에서 표시되는 안내 링크\n[정책]\n· 클릭 시 콘텐츠 템플릿 선택 화면(Screen 05)으로 이동\n· 유형 선택 완료 시 자동으로 사라짐",
  title:
    "[2-3] 문서 제목\n\n· 가이드 문서의 제목 — 가이드 홈·목록에 표시되는 이름\n[권위 소스]\n· PRD — 기능 정의의 명칭 기준\n  - provenance.title.version = PRD 버전\n[정책]\n· 필수 입력\n· 가이드 홈 카드 제목과 동일하게 표시됨",
  description:
    "[2-4] 설명\n\n· 가이드 독자에게 이 문서가 무엇을 다루는지 소개하는 요약문\n[권위 소스]\n· PRD — 기능 설명 기준\n  - provenance.description.version = PRD 버전\n[정책]\n· 필수 입력",
  screenRef:
    "[2-6] 화면 참조 (screen_ref)\n\n· 이 문서가 설명하는 화면의 프론트엔드 컴포넌트 경로\n[권위 소스]\n· 프론트엔드 코드 — 컴포넌트 파일 경로\n  - 형식: src/screens/ScreenName.tsx\n  - provenance.screenRef.version = 코드 커밋 또는 확인 일자\n[정책]\n· 튜토리얼·하우투: 필수 입력\n· 경로 미입력 시 빌드 단계에서 경고 발생\n  - 빌드 실패 문서 목록에 노출\n  - 해당 문서는 가이드 홈에서 제외됨\n· 경로 변경 시 소스 변경 영향 점검(Screen 06) 실행 권장",
  checklistNav:
    "[2-8] 소스 변경 영향 점검\n\n· 이 문서에 연결된 소스가 변경된 경우 영향받는 필드를 점검\n[정책]\n· 클릭 시 소스 변경 영향 점검 화면(Screen 06)으로 이동",
};

function FieldLabel({ children, required }) {
  return (
    <div
      style={{
        font: "var(--text-label-2-semibold)",
        color: "var(--semantic-text-default)",
        marginBottom: "var(--spacing-8)",
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-4)",
      }}
    >
      {children}
      {required && (
        <span style={{ color: "var(--semantic-content-danger-default)" }}>*</span>
      )}
    </div>
  );
}

function ProvenanceBadge({ source, version }) {
  const color =
    source === "PRD"
      ? "primary"
      : source === "화면설계서 PDF"
      ? "warning"
      : source === "프론트엔드 코드"
      ? "positive"
      : "neutral";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-8)",
        marginTop: "var(--spacing-8)",
      }}
    >
      <ContentBadge variant="outline" color={color} label={source} size="small" />
      <span
        style={{ font: "var(--text-label-2-regular)", color: "var(--semantic-text-sub)" }}
      >
        {version}
      </span>
    </div>
  );
}

function TextAreaField({ value, onChange, placeholder, rows = 4, desc }) {
  return (
    <textarea
      desc={desc}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "var(--spacing-12)",
        border: "1px solid var(--semantic-line-default)",
        borderRadius: "var(--radius-medium)",
        font: "var(--text-body-2-reading-regular)",
        color: "var(--semantic-text-default)",
        background: "var(--semantic-bg-default)",
        resize: "vertical",
        outline: "none",
        lineHeight: 1.6,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--semantic-primary-default)";
        e.currentTarget.style.boxShadow = "0 0 0 2px var(--semantic-primary-extra-light)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--semantic-line-default)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

export default function KBEntryEditor({ onNavigate, selectedEntryId }) {
  const [entry, setEntry] = useState(
    selectedEntryId
      ? MOCK_ENTRY
      : { ...MOCK_ENTRY, id: null, title: "", description: "", screenRef: "", acceptance: "" }
  );

  function update(field, value) {
    setEntry((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    showToast({ message: "가이드 문서가 저장되었습니다.", variant: "positive" });
    onNavigate("kb-list");
  }

  const isNewEntry = !selectedEntryId;

  return (
    <PageLayout
      title={isNewEntry ? "새 가이드 문서 작성" : "가이드 문서 편집"}
      breadcrumb={[
        { label: "가이드 문서 목록", onClick: () => onNavigate("kb-list") },
        { label: entry.domain || "도메인 미선택" },
        { label: entry.title || "새 문서", current: true },
      ]}
      actions={
        <>
          <OutlineButton desc={D.cancel} size="small" onClick={() => onNavigate("kb-list")}>
            취소
          </OutlineButton>
          <FillButton desc={D.save} variant="primary" size="small" onClick={handleSave}>
            저장
          </FillButton>
        </>
      }
    >
      <div style={{ display: "flex", gap: "var(--spacing-24)", alignItems: "flex-start" }}>
        {/* 메인 폼 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "var(--spacing-24)",
          }}
        >
          {/* 기본 정보 */}
          <div
            style={{
              background: "var(--semantic-bg-default)",
              borderRadius: "var(--radius-large)",
              border: "1px solid var(--semantic-line-default)",
              padding: "var(--spacing-24)",
              boxShadow: "var(--level-1)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-16)",
            }}
          >
            <h3
              style={{
                font: "var(--text-heading-2-semibold)",
                color: "var(--semantic-text-default)",
                margin: 0,
              }}
            >
              기본 정보
            </h3>

            {/* 도메인 + 유형 */}
            <div style={{ display: "flex", gap: "var(--spacing-16)" }}>
              <div style={{ flex: 1 }}>
                <FieldLabel required>도메인</FieldLabel>
                <Select
                  desc={D.domain}
                  options={DOMAIN_OPTIONS}
                  selectedValue={entry.domain}
                  onSelect={(v) => update("domain", v)}
                  placeholder="도메인을 선택해주세요."
                />
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel required>Diátaxis 유형</FieldLabel>
                <Select
                  desc={D.type}
                  options={TYPE_OPTIONS}
                  selectedValue={entry.type}
                  onSelect={(v) => update("type", v)}
                  placeholder="유형을 선택해주세요."
                />
                {!entry.type && (
                  <button
                    desc={D.typeGuide}
                    onClick={() => onNavigate("template")}
                    style={{
                      marginTop: "var(--spacing-8)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      font: "var(--text-label-2-regular)",
                      color: "var(--semantic-primary-default)",
                      padding: 0,
                    }}
                  >
                    유형 선택이 어려우신가요? 템플릿 가이드 보기
                  </button>
                )}
              </div>
            </div>

            {/* 제목 */}
            <div>
              <FieldLabel required>문서 제목</FieldLabel>
              <ProvenanceBadge
                source={entry.provenance.title.source}
                version={entry.provenance.title.version}
              />
              <div style={{ marginTop: "var(--spacing-8)" }}>
                <Input
                  desc={D.title}
                  value={entry.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="문서 제목을 입력해주세요. (PRD 기준)"
                  fullWidth
                />
              </div>
            </div>

            {/* 설명 */}
            <div>
              <FieldLabel required>설명</FieldLabel>
              <ProvenanceBadge
                source={entry.provenance.description.source}
                version={entry.provenance.description.version}
              />
              <div style={{ marginTop: "var(--spacing-8)" }}>
                <TextAreaField
                  desc={D.description}
                  value={entry.description}
                  onChange={(v) => update("description", v)}
                  placeholder="문서에 대한 설명을 입력해주세요. PRD의 기능 설명을 기준으로 작성합니다."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 소스별 콘텐츠 */}
          <div
            style={{
              background: "var(--semantic-bg-default)",
              borderRadius: "var(--radius-large)",
              border: "1px solid var(--semantic-line-default)",
              padding: "var(--spacing-24)",
              boxShadow: "var(--level-1)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-16)",
            }}
          >
            <h3
              style={{
                font: "var(--text-heading-2-semibold)",
                color: "var(--semantic-text-default)",
                margin: 0,
              }}
            >
              소스별 콘텐츠
            </h3>

            {/* 정책 */}
            <div>
              <FieldLabel>정책 (policy)</FieldLabel>
              <ProvenanceBadge
                source={entry.provenance.policy.source}
                version={entry.provenance.policy.version}
              />
              <div style={{ marginTop: "var(--spacing-8)" }}>
                <TextAreaField
                  desc="[2-9] 정책 (policy)\n\n· 화면설계서 PDF에서 추출한 정책 텍스트\n[권위 소스]\n· 화면설계서 PDF — 상태 전환·유효성·예외 조건 기준\n  - provenance.policy.version = PDF 버전\n[정책]\n· 레퍼런스 유형: 필수 입력\n· 튜토리얼·하우투·설명: 선택 입력"
                  value={entry.policy}
                  onChange={(v) => update("policy", v)}
                  placeholder="화면설계서 PDF에서 추출한 정책 텍스트를 입력해주세요. (상태 전환, 유효성, 예외 조건 등)"
                  rows={5}
                />
              </div>
            </div>

            {/* screen_ref — F2 핵심 필드 */}
            <div>
              <FieldLabel>화면 참조 (screen_ref)</FieldLabel>
              <ProvenanceBadge
                source={entry.provenance.screenRef.source}
                version={entry.provenance.screenRef.version}
              />
              {/* F2: 프론트엔드 코드 경로 안내 */}
              <div
                style={{
                  marginTop: "var(--spacing-8)",
                  background: "var(--semantic-primary-extra-light)",
                  border: "1px solid var(--semantic-primary-light)",
                  borderRadius: "var(--radius-medium)",
                  padding: "var(--spacing-12) var(--spacing-16)",
                  marginBottom: "var(--spacing-8)",
                }}
              >
                <div
                  style={{
                    font: "var(--text-body-2-normal-semibold)",
                    color: "var(--semantic-primary-default)",
                    marginBottom: "var(--spacing-4)",
                  }}
                >
                  프론트엔드 코드 경로가 필요합니다.
                </div>
                <div
                  style={{
                    font: "var(--text-label-2-regular)",
                    color: "var(--semantic-text-sub)",
                  }}
                >
                  화면 세부(레이아웃·컴포넌트·UI 텍스트)는 프론트엔드 코드를 기준으로 합니다. 해당 화면의 컴포넌트 파일 경로를 입력하거나, 개발팀에 경로를 확인해주세요.
                </div>
              </div>
              <Input
                desc={D.screenRef}
                value={entry.screenRef}
                onChange={(e) => update("screenRef", e.target.value)}
                placeholder="예: src/screens/SituationDetailScreen.tsx"
                fullWidth
              />
            </div>

            {/* 수용 기준 */}
            <div>
              <FieldLabel>수용 기준 (acceptance)</FieldLabel>
              <ProvenanceBadge
                source={entry.provenance.acceptance.source}
                version={entry.provenance.acceptance.version}
              />
              <div style={{ marginTop: "var(--spacing-8)" }}>
                <TextAreaField
                  desc="[2-10] 수용 기준 (acceptance)\n\n· 티켓의 AC(Acceptance Criteria) 텍스트\n[권위 소스]\n· 티켓 (Jira 등) — AC 항목 기준\n  - provenance.acceptance.version = 티켓 번호\n[정책]\n· 튜토리얼·레퍼런스: 필수 입력\n· 하우투·설명: 선택 입력"
                  value={entry.acceptance}
                  onChange={(v) => update("acceptance", v)}
                  placeholder="티켓의 수용 기준(AC)을 입력해주세요. 예: AC-1: 사용자가 프로젝트를 생성하면 목록에 즉시 반영된다."
                  rows={3}
                />
              </div>
            </div>

            {/* 시각 자료 (후속) */}
            <div>
              <FieldLabel>시각 자료 (visual)</FieldLabel>
              <div
                style={{
                  marginTop: "var(--spacing-8)",
                  background: "var(--semantic-natural-extra-light)",
                  border: "1px dashed var(--semantic-line-default)",
                  borderRadius: "var(--radius-medium)",
                  padding: "var(--spacing-16)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    font: "var(--text-body-2-normal-regular)",
                    color: "var(--semantic-text-sub)",
                  }}
                >
                  Figma 연동은 후속 단계에서 지원될 예정입니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 소스 출처 사이드 패널 */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div
            style={{
              background: "var(--semantic-bg-default)",
              borderRadius: "var(--radius-large)",
              border: "1px solid var(--semantic-line-default)",
              padding: "var(--spacing-16)",
              boxShadow: "var(--level-1)",
              position: "sticky",
              top: "var(--spacing-16)",
            }}
          >
            <h4
              style={{
                font: "var(--text-body-2-normal-semibold)",
                color: "var(--semantic-text-default)",
                margin: "0 0 var(--spacing-16) 0",
              }}
            >
              소스 출처 요약
            </h4>
            {Object.entries(entry.provenance).map(([field, prov]) => (
              <div
                key={field}
                style={{
                  padding: "var(--spacing-8) 0",
                  borderBottom: "1px solid var(--semantic-line-extra-light)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    font: "var(--text-label-2-semibold)",
                    color: "var(--semantic-text-sub)",
                  }}
                >
                  {field}
                </span>
                <StateBadge
                  variant={prov.version === "미확인" ? "warning" : "positive"}
                  label={prov.version === "미확인" ? "미확인" : "확인됨"}
                  size="small"
                />
              </div>
            ))}

            <div style={{ marginTop: "var(--spacing-16)" }}>
              <button
                desc={D.checklistNav}
                onClick={() => onNavigate("checklist")}
                style={{
                  width: "100%",
                  padding: "var(--spacing-8) var(--spacing-12)",
                  background: "transparent",
                  border: "1px solid var(--semantic-line-default)",
                  borderRadius: "var(--radius-medium)",
                  cursor: "pointer",
                  font: "var(--text-label-2-regular)",
                  color: "var(--semantic-text-default)",
                  textAlign: "center",
                }}
              >
                소스 변경 영향 점검
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
