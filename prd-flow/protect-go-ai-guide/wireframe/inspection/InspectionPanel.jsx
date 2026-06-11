import { useState, useEffect, useCallback } from "react";
import { POLICIES, DESCRIPTIONS, GROUPS, GROUP_ORDER } from "./policies.js";

/**
 * policy key → 와이어프레임 screen id (null = 화면 이동 없음)
 * 요소 클릭 시 "이 화면으로 이동" 버튼 표시 여부를 결정.
 */
const POL_NAV = {
  // 0. 공통 레이아웃
  "nav-kb-list":      "kb-list",
  "nav-kb-editor":    "kb-editor",
  "nav-template":     "template",
  "nav-checklist":    "checklist",
  "nav-guide-home":   "guide-home",
  "nav-guide-detail": "guide-detail",
  "nav-build":        "build",
  "ask-btn":          null,
  // 1. KB 엔트리 목록
  "add-entry":        "kb-editor",
  "domain-filter":    null,
  "type-filter":      null,
  "entry-search":     null,
  "entry-link":       "kb-editor",
  "entry-page":       null,
  // 2. KB 엔트리 편집기
  "sel-domain":       null,
  "sel-type":         null,
  "tmpl-guide":       "template",
  "inp-title":        null,
  "inp-desc":         null,
  "inp-policy":       null,
  "inp-screenref":    null,
  "inp-accept":       null,
  "btn-checklist":    "checklist",
  "btn-cancel":       "kb-list",
  "btn-save":         null,
  // 3. 가이드 홈
  "domain-tab":       null,
  "entry-card":       "guide-detail",
  // 4. 가이드 엔트리 상세
  "guide-back":       "guide-home",
  "toc-item":         null,
  "next-link":        "guide-detail",
  // 5. Diátaxis 템플릿 선택
  "type-card":        null,
  "complexity":       null,
  "checklist-req":    null,
  "checklist-opt":    null,
  "tmpl-cancel":      "kb-list",
  "tmpl-start":       "kb-editor",
  // 6. 소스 변경 영향 점검
  "source-sel":       null,
  "impact-q":         null,
  "impact-check":     null,
  "edit-affected":    "kb-editor",
  // 7. 빌드 상태
  "build-run":        null,
  "build-hist":       null,
};

const PANEL_WIDTH = 300;
const FAB_MARGIN = 24;

/**
 * desc 문자열을 파싱해 { num, title, body } 반환.
 * 첫 줄이 "[num] title" 형식인 경우 num/title 추출.
 */
function parseDesc(desc) {
  if (!desc) return { num: "", title: "", body: [] };
  const lines = desc.split("\n");
  const firstLine = lines[0] || "";
  const match = firstLine.match(/^\[(\d+-\d+)\]\s+(.+)/);
  return {
    num:   match ? match[1] : "",
    title: match ? match[2] : firstLine,
    body:  lines.slice(1),
  };
}

/**
 * desc body 줄 배열을 렌더링.
 * 컨벤션:
 *   ""       → 섹션 간격
 *   [...]    → 섹션 헤더
 *   ·        → 1차 항목
 *   "  -"    → 2차 서브항목
 */
function DescBody({ lines }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {lines.map((line, i) => {
        if (line === "") {
          return <div key={i} style={{ height: 6 }} />;
        }
        if (/^\[.+\]$/.test(line)) {
          return (
            <div
              key={i}
              style={{
                font: "var(--text-label-2-semibold)",
                color: "var(--semantic-text-sub)",
                marginTop: 8,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontSize: 11,
              }}
            >
              {line}
            </div>
          );
        }
        if (line.startsWith("·")) {
          return (
            <div
              key={i}
              style={{
                font: "var(--text-label-2-regular)",
                color: "var(--semantic-text-default)",
                paddingLeft: 8,
                lineHeight: 1.5,
              }}
            >
              {line}
            </div>
          );
        }
        if (line.startsWith("  -")) {
          return (
            <div
              key={i}
              style={{
                font: "var(--text-label-2-regular)",
                color: "var(--semantic-text-sub)",
                paddingLeft: 20,
                lineHeight: 1.5,
              }}
            >
              {"- " + line.trimStart().slice(2)}
            </div>
          );
        }
        return (
          <div
            key={i}
            style={{
              font: "var(--text-label-2-regular)",
              color: "var(--semantic-text-default)",
              lineHeight: 1.5,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

export default function InspectionPanel({ onNavigate }) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState(null);
  const [allOpen, setAllOpen] = useState(false);

  // 인스펙션 모드 활성 시 [desc] 요소에 윤곽선 스타일 주입
  useEffect(() => {
    const id = "ipd-style";
    let style = document.getElementById(id);
    if (active) {
      if (!style) {
        style = document.createElement("style");
        style.id = id;
        document.head.appendChild(style);
      }
      style.textContent = `
        [desc] { outline: 1px dashed rgba(99,102,241,0.35) !important; }
        [desc]:hover { outline: 2px solid rgba(99,102,241,0.75) !important; cursor: crosshair !important; }
      `;
    } else {
      style?.remove();
    }
  }, [active]);

  // 클릭 인터셉터 (캡처 단계 → 요소 onClick 실행 전에 가로챔)
  const handleCapture = useCallback(
    (e) => {
      if (!active) return;

      let el = e.target;
      while (el && el !== document.body) {
        const desc = el.getAttribute("desc");
        if (desc) {
          e.preventDefault();
          e.stopPropagation();
          const parsed = parseDesc(desc);
          const policy = POLICIES.find((p) => p.num === parsed.num) || null;
          setSelected({ ...parsed, policy, desc });
          return;
        }
        el = el.parentElement;
      }
      // desc 없는 영역 클릭 → 선택 해제 (패널 외부)
      setSelected(null);
    },
    [active]
  );

  useEffect(() => {
    if (active) {
      document.addEventListener("click", handleCapture, true);
    } else {
      document.removeEventListener("click", handleCapture, true);
      setSelected(null);
    }
    return () => document.removeEventListener("click", handleCapture, true);
  }, [active, handleCapture]);

  const navTarget = selected?.policy ? POL_NAV[selected.policy.key] : null;
  const fabRight = active ? PANEL_WIDTH + FAB_MARGIN : FAB_MARGIN;

  return (
    <>
      {/* ── 토글 FAB ─────────────────────────────── */}
      <button
        onClick={() => setActive((a) => !a)}
        title={active ? "인스펙션 모드 종료" : "인스펙션 모드 — 요소 클릭으로 정책 확인"}
        style={{
          position: "fixed",
          bottom: FAB_MARGIN,
          right: fabRight,
          zIndex: 1100,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          background: active
            ? "var(--semantic-primary-default)"
            : "var(--semantic-natural-deep)",
          color: "var(--semantic-natural-white)",
          cursor: "pointer",
          font: "var(--text-label-2-semibold)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "right 220ms ease, background 100ms",
          fontSize: 15,
          userSelect: "none",
        }}
      >
        {active ? "✕" : "검"}
      </button>

      {/* ── 패널 ─────────────────────────────────── */}
      {active && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: PANEL_WIDTH,
            height: "100vh",
            background: "var(--semantic-bg-default)",
            borderLeft: "1px solid var(--semantic-line-default)",
            boxShadow: "-4px 0 16px rgba(0,0,0,0.10)",
            zIndex: 1099,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          // 패널 내부 클릭이 인터셉터로 올라가는 것을 막음
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div
            style={{
              padding: "var(--spacing-12) var(--spacing-16)",
              borderBottom: "1px solid var(--semantic-line-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--semantic-primary-extra-light)",
            }}
          >
            <span
              style={{
                font: "var(--text-body-2-normal-semibold)",
                color: "var(--semantic-primary-default)",
              }}
            >
              인스펙션 모드
            </span>
            <span
              style={{
                font: "var(--text-label-2-regular)",
                color: "var(--semantic-text-sub)",
              }}
            >
              요소 클릭 → 정책 확인
            </span>
          </div>

          {/* 선택된 정책 */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "var(--spacing-16)",
            }}
          >
            {!selected ? (
              <div
                style={{
                  color: "var(--semantic-text-sub)",
                  font: "var(--text-label-2-regular)",
                  textAlign: "center",
                  marginTop: 40,
                  lineHeight: 1.8,
                }}
              >
                화면의 파란 점선 요소를 클릭하면
                <br />
                관련 정책을 여기서 확인할 수 있습니다.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-12)",
                }}
              >
                {/* 번호 + 그룹 */}
                <div
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  {selected.num && (
                    <span
                      style={{
                        font: "var(--text-label-2-semibold)",
                        color: "var(--semantic-primary-default)",
                        background: "var(--semantic-primary-extra-light)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-small)",
                        flexShrink: 0,
                      }}
                    >
                      {selected.num}
                    </span>
                  )}
                  {selected.policy && (
                    <span
                      style={{
                        font: "var(--text-label-2-regular)",
                        color: "var(--semantic-text-sub)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {GROUPS[selected.policy.group]}
                    </span>
                  )}
                </div>

                {/* 제목 */}
                <div
                  style={{
                    font: "var(--text-body-2-normal-semibold)",
                    color: "var(--semantic-text-default)",
                  }}
                >
                  {selected.title}
                </div>

                {/* Body */}
                <div
                  style={{
                    background: "var(--semantic-natural-extra-light)",
                    borderRadius: "var(--radius-medium)",
                    padding: "var(--spacing-12)",
                  }}
                >
                  <DescBody lines={selected.body} />
                </div>

                {/* 화면 이동 버튼 */}
                {navTarget && (
                  <button
                    onClick={() => onNavigate(navTarget)}
                    style={{
                      width: "100%",
                      padding: "var(--spacing-8) var(--spacing-12)",
                      background: "var(--semantic-primary-default)",
                      color: "var(--semantic-natural-white)",
                      border: "none",
                      borderRadius: "var(--radius-medium)",
                      font: "var(--text-label-2-semibold)",
                      cursor: "pointer",
                    }}
                  >
                    이 화면으로 이동
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 전체 정책 목록 */}
          <div
            style={{
              borderTop: "1px solid var(--semantic-line-default)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setAllOpen((o) => !o)}
              style={{
                width: "100%",
                padding: "var(--spacing-10) var(--spacing-16)",
                background: "none",
                border: "none",
                cursor: "pointer",
                font: "var(--text-label-2-semibold)",
                color: "var(--semantic-text-sub)",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>전체 정책 ({POLICIES.length})</span>
              <span style={{ fontSize: 10 }}>{allOpen ? "▲" : "▼"}</span>
            </button>

            {allOpen && (
              <div
                style={{
                  maxHeight: 280,
                  overflow: "auto",
                  padding: "0 var(--spacing-8) var(--spacing-8)",
                }}
              >
                {GROUP_ORDER.map((groupKey) => {
                  const grouped = POLICIES.filter((p) => p.group === groupKey);
                  if (!grouped.length) return null;
                  return (
                    <div key={groupKey} style={{ marginBottom: "var(--spacing-4)" }}>
                      <div
                        style={{
                          font: "var(--text-label-2-semibold)",
                          color: "var(--semantic-text-sub)",
                          padding: "var(--spacing-4) var(--spacing-8)",
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {GROUPS[groupKey]}
                      </div>
                      {grouped.map((pol) => {
                        const isSelected = selected?.num === pol.num;
                        return (
                          <button
                            key={pol.key}
                            onClick={() => {
                              const descText = DESCRIPTIONS[pol.key] || "";
                              const parsed = parseDesc(descText);
                              setSelected({
                                ...parsed,
                                policy: pol,
                                desc: descText,
                              });
                            }}
                            style={{
                              display: "flex",
                              gap: 8,
                              width: "100%",
                              padding: "var(--spacing-4) var(--spacing-8)",
                              border: "none",
                              borderRadius: "var(--radius-small)",
                              background: isSelected
                                ? "var(--semantic-primary-extra-light)"
                                : "transparent",
                              cursor: "pointer",
                              textAlign: "left",
                              font: "var(--text-label-2-regular)",
                              color: isSelected
                                ? "var(--semantic-primary-default)"
                                : "var(--semantic-text-default)",
                              transition: "background 100ms",
                            }}
                          >
                            <span
                              style={{
                                flexShrink: 0,
                                color: "var(--semantic-text-sub)",
                                fontVariantNumeric: "tabular-nums",
                                minWidth: 36,
                              }}
                            >
                              {pol.num}
                            </span>
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {pol.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
