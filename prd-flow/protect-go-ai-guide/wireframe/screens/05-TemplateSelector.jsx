import { useState } from "react";
import { FillButton, OutlineButton, CheckBox, Radio } from "@idbrnd/design-system";
import PageLayout from "../components/PageLayout";

const DIATAXIS_TYPES = [
  {
    value: "튜토리얼",
    label: "튜토리얼",
    subtitle: "처음 사용하는 분을 위한 단계별 안내",
    description: "사용자가 목표를 달성하도록 손을 잡고 이끄는 학습 중심 콘텐츠입니다. 화면을 따라가며 쓸 수 있도록 순서대로 작성합니다.",
    focus: "학습 경험",
    example: "신규 프로젝트 생성하기",
    requiredFields: ["도메인", "제목", "설명", "화면 참조", "수용 기준"],
    optionalFields: ["정책"],
  },
  {
    value: "하우투",
    label: "하우투",
    subtitle: "특정 작업을 수행하는 방법",
    description: "이미 기본을 아는 사용자가 특정 작업을 빠르게 완료하도록 돕는 실무 중심 콘텐츠입니다.",
    focus: "목표 달성",
    example: "프로젝트 이름·기간 변경하기",
    requiredFields: ["도메인", "제목", "설명", "화면 참조"],
    optionalFields: ["정책", "수용 기준"],
  },
  {
    value: "레퍼런스",
    label: "레퍼런스",
    subtitle: "설정값·정책·옵션 조회",
    description: "정보 조회가 목적인 콘텐츠입니다. 읽지 않고 찾아보는 방식으로 작성합니다. 정책·규칙·옵션을 정확하게 서술합니다.",
    focus: "정보 제공",
    example: "프로젝트 생성 정책 참조",
    requiredFields: ["도메인", "제목", "설명", "정책"],
    optionalFields: ["화면 참조", "수용 기준"],
  },
  {
    value: "설명",
    label: "설명",
    subtitle: "배경·개념·원리 이해",
    description: "왜 이렇게 동작하는지, 어떤 개념인지를 설명하는 이해 중심 콘텐츠입니다. 절차나 조작 방법보다 맥락과 이유에 집중합니다.",
    focus: "이해 제공",
    example: "탐지 노드 개요",
    requiredFields: ["도메인", "제목", "설명"],
    optionalFields: ["정책", "화면 참조"],
  },
];

const COMPLEXITY_OPTIONS = [
  { value: "simple", label: "단순 (1~2시간)", description: "단일 화면·기능, 정책 1~3개" },
  { value: "medium", label: "보통 (반나절)", description: "2~3개 화면, 정책 3~7개" },
  { value: "complex", label: "복잡 (1일 이상)", description: "다수 화면·조건 분기, 정책 7개 이상" },
];

// desc 텍스트는 inspection/policies.js의 DESCRIPTIONS를 단일 출처로 사용
const D = {
  typeCard:
    "[5-0] Diátaxis 유형 카드\n\n· 콘텐츠 유형을 선택하는 카드 — 4가지 Diátaxis 유형 중 하나 선택\n[정책]\n· 선택 시 배경 --semantic-primary-extra-light, 테두리 2px primary\n· 선택 후 복잡도·체크리스트 섹션 노출\n· 선택한 유형이 가이드 문서 편집기 진입 시 자동 설정됨 (후속 구현)",
  complexity:
    "[5-1] 복잡도 선택\n\n· 문서 작성 예상 복잡도 — 단순·보통·복잡\n[옵션]\n· 단순 (1~2시간): 단일 화면·기능, 정책 1~3개\n· 보통 (반나절): 2~3개 화면, 정책 3~7개\n· 복잡 (1일 이상): 다수 화면·조건 분기, 정책 7개 이상\n[정책]\n· 참고 지표로만 사용; 편집기에 직접 반영되지 않음",
  requiredCheck:
    "[5-2] 필수 소스 체크리스트\n\n· 선택한 유형의 필수 소스가 준비됐는지 확인하는 체크박스\n[정책]\n· 미체크해도 편집기 진입 가능 — 저장 시 유효성 검사는 편집기에서 수행\n· 튜토리얼: 도메인·제목·설명·화면 참조·수용 기준\n· 하우투: 도메인·제목·설명·화면 참조\n· 레퍼런스: 도메인·제목·설명·정책\n· 설명: 도메인·제목·설명",
  optionalCheck:
    "[5-3] 선택 소스 체크리스트\n\n· 선택한 유형의 선택 소스 보유 여부 확인\n[정책]\n· 미보유 시에도 문서 저장 가능\n· 보유 시 편집기에서 해당 필드 우선 입력 권장",
  cancel:
    "[5-4] 템플릿 선택 취소\n\n· 유형 선택을 취소하고 가이드 문서 목록으로 돌아가기",
  start:
    "[5-5] 편집기 진입\n\n· 선택한 Diátaxis 유형으로 가이드 문서 편집기 열기\n[정책]\n· 유형 선택 전에는 버튼이 표시되지 않음\n· 클릭 시 편집기의 유형 셀렉트가 선택한 값으로 설정됨 (후속 구현)",
};

export default function TemplateSelector({ onNavigate }) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedComplexity, setSelectedComplexity] = useState("simple");
  const [checklist, setChecklist] = useState({});

  const selectedTemplate = DIATAXIS_TYPES.find((t) => t.value === selectedType);

  function toggleCheck(key) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <PageLayout
      title="콘텐츠 템플릿 선택"
      breadcrumb={[
        { label: "가이드 문서 목록", onClick: () => onNavigate("kb-list") },
        { label: "콘텐츠 템플릿 선택", current: true },
      ]}
    >
      {/* Diátaxis 유형 선택 */}
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
          어떤 유형의 콘텐츠인가요?
        </h3>
        <p
          style={{
            font: "var(--text-body-2-normal-regular)",
            color: "var(--semantic-text-sub)",
            margin: "0 0 var(--spacing-20) 0",
          }}
        >
          Diátaxis 4개 유형 중 작성할 문서에 가장 적합한 유형을 선택해주세요.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--spacing-12)" }}>
          {DIATAXIS_TYPES.map((type) => {
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                desc={D.typeCard}
                onClick={() => setSelectedType(type.value)}
                style={{
                  background: isSelected
                    ? "var(--semantic-primary-extra-light)"
                    : "var(--semantic-bg-default)",
                  border: isSelected
                    ? "2px solid var(--semantic-primary-default)"
                    : "1px solid var(--semantic-line-default)",
                  borderRadius: "var(--radius-large)",
                  padding: "var(--spacing-16)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-8)",
                  transition: "border-color 100ms, background 100ms",
                }}
              >
                <div
                  style={{
                    font: "var(--text-body-2-normal-semibold)",
                    color: isSelected
                      ? "var(--semantic-primary-default)"
                      : "var(--semantic-text-default)",
                  }}
                >
                  {type.label}
                </div>
                <div
                  style={{
                    font: "var(--text-label-2-regular)",
                    color: "var(--semantic-text-sub)",
                  }}
                >
                  {type.subtitle}
                </div>
                {isSelected && (
                  <div
                    style={{
                      font: "var(--text-label-2-regular)",
                      color: "var(--semantic-text-sub)",
                      paddingTop: "var(--spacing-8)",
                      borderTop: "1px solid var(--semantic-primary-light)",
                    }}
                  >
                    {type.description}
                  </div>
                )}
                <div
                  style={{
                    font: "var(--text-label-2-regular)",
                    color: "var(--semantic-text-sub)",
                    fontStyle: "italic",
                  }}
                >
                  예: {type.example}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 복잡도 + 체크리스트 (유형 선택 후) */}
      {selectedTemplate && (
        <>
          <div
            style={{
              background: "var(--semantic-bg-default)",
              borderRadius: "var(--radius-large)",
              border: "1px solid var(--semantic-line-default)",
              padding: "var(--spacing-24)",
              boxShadow: "var(--level-1)",
              marginBottom: "var(--spacing-24)",
              display: "flex",
              gap: "var(--spacing-32)",
            }}
          >
            {/* 복잡도 */}
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  font: "var(--text-heading-2-semibold)",
                  color: "var(--semantic-text-default)",
                  margin: "0 0 var(--spacing-16) 0",
                }}
              >
                예상 복잡도
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-12)" }}>
                {COMPLEXITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    style={{ display: "flex", alignItems: "flex-start", gap: "var(--spacing-8)", cursor: "pointer" }}
                  >
                    <Radio
                      desc={D.complexity}
                      checked={selectedComplexity === opt.value}
                      onChange={() => setSelectedComplexity(opt.value)}
                    />
                    <div>
                      <div style={{ font: "var(--text-body-2-normal-semibold)", color: "var(--semantic-text-default)" }}>
                        {opt.label}
                      </div>
                      <div style={{ font: "var(--text-label-2-regular)", color: "var(--semantic-text-sub)" }}>
                        {opt.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 필수 필드 체크리스트 */}
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  font: "var(--text-heading-2-semibold)",
                  color: "var(--semantic-text-default)",
                  margin: "0 0 var(--spacing-16) 0",
                }}
              >
                작성 전 체크리스트
              </h3>
              <div
                style={{
                  font: "var(--text-label-2-semibold)",
                  color: "var(--semantic-text-sub)",
                  marginBottom: "var(--spacing-8)",
                }}
              >
                필수 소스 ({selectedTemplate.label})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-8)", marginBottom: "var(--spacing-16)" }}>
                {selectedTemplate.requiredFields.map((field) => (
                  <label key={field} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", cursor: "pointer" }}>
                    <CheckBox
                      desc={D.requiredCheck}
                      checked={!!checklist[field]}
                      onChange={() => toggleCheck(field)}
                    />
                    <span style={{ font: "var(--text-body-2-normal-regular)", color: "var(--semantic-text-default)" }}>
                      {field} 소스가 있다
                    </span>
                  </label>
                ))}
              </div>
              {selectedTemplate.optionalFields.length > 0 && (
                <>
                  <div
                    style={{
                      font: "var(--text-label-2-semibold)",
                      color: "var(--semantic-text-sub)",
                      marginBottom: "var(--spacing-8)",
                    }}
                  >
                    선택 소스
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
                    {selectedTemplate.optionalFields.map((field) => (
                      <label key={field} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", cursor: "pointer" }}>
                        <CheckBox
                          desc={D.optionalCheck}
                          checked={!!checklist[field]}
                          onChange={() => toggleCheck(field)}
                        />
                        <span style={{ font: "var(--text-body-2-normal-regular)", color: "var(--semantic-text-sub)" }}>
                          {field} 소스가 있다 (선택)
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 하단 CTA */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--spacing-8)" }}>
            <OutlineButton desc={D.cancel} size="medium" onClick={() => onNavigate("kb-list")}>
              취소
            </OutlineButton>
            <FillButton desc={D.start} variant="primary" size="medium" onClick={() => onNavigate("kb-editor")}>
              이 템플릿으로 작성 시작
            </FillButton>
          </div>
        </>
      )}
    </PageLayout>
  );
}
