import { useState } from "react";
import {
  FillButton,
  SearchBar,
  Chip,
  StateBadge,
  ContentBadge,
  Pagination,
} from "@idbrnd/design-system";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import PageLayout from "../components/PageLayout";

const MOCK_ENTRIES = [
  { id: 1, title: "신규 프로젝트 생성", domain: "프로젝트 생성", type: "튜토리얼", updatedAt: "2026-06-08", version: "1.0", status: "완료" },
  { id: 2, title: "프로젝트 이름·기간 설정", domain: "프로젝트 생성", type: "하우투", updatedAt: "2026-06-07", version: "1.1", status: "완료" },
  { id: 3, title: "프로젝트 생성 정책 참조", domain: "프로젝트 생성", type: "레퍼런스", updatedAt: "2026-06-06", version: "1.0", status: "작성중" },
  { id: 4, title: "프로젝트 생성 개요", domain: "프로젝트 생성", type: "설명", updatedAt: "2026-06-05", version: "1.0", status: "완료" },
  { id: 5, title: "탐지 노드 개요", domain: "탐지 시나리오·노드", type: "설명", updatedAt: "2026-06-04", version: "1.0", status: "완료" },
  { id: 6, title: "탐지 시나리오 구성", domain: "탐지 시나리오·노드", type: "하우투", updatedAt: "2026-06-03", version: "1.2", status: "작성중" },
  { id: 7, title: "조치이력 조회", domain: "조치이력", type: "하우투", updatedAt: "2026-06-02", version: "0.1", status: "작성중" },
  { id: 8, title: "알림 시스템 초기 설정", domain: "알림 시스템 개편", type: "튜토리얼", updatedAt: "2026-06-01", version: "0.1", status: "작성중" },
];

const DOMAIN_FILTERS = [
  { value: "all", label: "전체" },
  { value: "프로젝트 생성", label: "프로젝트 생성" },
  { value: "탐지 시나리오·노드", label: "탐지 시나리오·노드" },
  { value: "조치이력", label: "조치이력" },
  { value: "알림 시스템 개편", label: "알림 시스템 개편" },
];

const TYPE_FILTERS = ["튜토리얼", "하우투", "레퍼런스", "설명"];

const PAGE_SIZE = 10;

const columnHelper = createColumnHelper();

// desc 텍스트는 inspection/policies.js의 DESCRIPTIONS를 단일 출처로 사용
const D = {
  addEntry:    "[1-0] 새 문서 추가\n\n· 비어 있는 가이드 문서 편집기를 열어 새 항목 작성 시작\n[정책]\n· 도메인·유형 미선택 상태로 편집기에 진입 가능\n  - 저장 전 도메인·유형 선택 필수\n· 기존 문서 편집은 목록에서 문서 제목 클릭",
  domainChip:  "[1-1] 도메인 필터\n\n· 표시할 문서의 도메인을 단일 선택으로 필터링\n[옵션]\n· 전체 (기본): 모든 도메인 표시\n· 프로젝트 생성 / 탐지 시나리오·노드 / 조치이력 / 알림 시스템 개편\n[정책]\n· 유형 필터·검색과 AND 조건으로 결합\n· 선택 변경 시 페이지 인덱스를 1로 초기화",
  typeChip:    "[1-2] 유형 필터\n\n· 표시할 문서의 Diátaxis 유형을 다중 선택으로 필터링\n[옵션]\n· 튜토리얼 / 하우투 / 레퍼런스 / 설명\n[정책]\n· 미선택 시 전체 유형 표시 (기본)\n· 다중 선택 가능 — 선택된 항목 중 하나라도 일치하면 표시\n· 도메인 필터·검색과 AND 조건으로 결합",
  search:      "[1-3] 문서 제목 검색\n\n· 문서 제목 텍스트로 실시간 검색\n[정책]\n· 도메인·유형 필터와 AND 조건으로 결합\n· 검색어 변경 시 1페이지로 자동 이동\n· 대소문자 구분 없음 (후속 구현)",
  entryLink:   "[1-4] 문서 제목 링크\n\n· 클릭 시 해당 문서의 편집기로 이동\n[정책]\n· 문서 ID를 App.jsx의 selectedEntryId에 전달\n· 편집기는 기존 값을 불러온 상태로 진입",
  pagination:  "[1-5] 목록 페이지네이션\n\n· 필터 결과를 페이지 단위로 탐색\n[정책]\n· 페이지당 10건 표시\n· 필터·검색 변경 시 1페이지로 자동 이동\n· 결과 0건이면 빈 상태 메시지 표시",
};

export default function KBEntryList({ onNavigate, onEditEntry }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const filtered = MOCK_ENTRIES.filter((entry) => {
    const domainMatch = selectedDomain === "all" || entry.domain === selectedDomain;
    const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(entry.type);
    const searchMatch = !searchQuery || entry.title.includes(searchQuery);
    return domainMatch && typeMatch && searchMatch;
  });

  function toggleType(type) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const columns = [
    columnHelper.accessor("title", {
      header: "문서 제목",
      cell: (info) => (
        <button
          desc={D.entryLink}
          onClick={() => onEditEntry && onEditEntry(info.row.original.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            font: "var(--text-body-2-normal-semibold)",
            color: "var(--semantic-primary-default)",
            padding: 0,
            textAlign: "left",
          }}
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor("domain", {
      header: "도메인",
      cell: (info) => (
        <ContentBadge variant="outline" color="neutral" label={info.getValue()} />
      ),
    }),
    columnHelper.accessor("type", {
      header: "Diátaxis 유형",
      cell: (info) => (
        <ContentBadge variant="outline" color="primary" label={info.getValue()} />
      ),
    }),
    columnHelper.accessor("version", {
      header: "버전",
      cell: (info) => (
        <span style={{ font: "var(--text-body-2-normal-regular)", color: "var(--semantic-text-sub)" }}>
          v{info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("updatedAt", {
      header: "마지막 갱신",
      cell: (info) => (
        <span style={{ font: "var(--text-body-2-normal-regular)", color: "var(--semantic-text-sub)" }}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "상태",
      cell: (info) => (
        <StateBadge
          variant={info.getValue() === "완료" ? "positive" : "warning"}
          label={info.getValue()}
        />
      ),
    }),
  ];

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  return (
    <PageLayout
      title="가이드 문서 목록"
      actions={
        <FillButton
          desc={D.addEntry}
          variant="primary"
          size="small"
          onClick={() => onNavigate("kb-editor")}
        >
          새 문서 추가
        </FillButton>
      }
    >
      {/* 필터 패널 */}
      <div
        style={{
          background: "var(--semantic-bg-default)",
          borderRadius: "var(--radius-large)",
          border: "1px solid var(--semantic-line-default)",
          padding: "var(--spacing-16)",
          marginBottom: "var(--spacing-16)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-12)",
          boxShadow: "var(--level-1)",
        }}
      >
        {/* 도메인 필터 */}
        <div style={{ display: "flex", gap: "var(--spacing-8)", flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              font: "var(--text-label-2-semibold)",
              color: "var(--semantic-text-sub)",
              minWidth: 40,
            }}
          >
            도메인
          </span>
          {DOMAIN_FILTERS.map((f) => (
            <Chip
              key={f.value}
              desc={D.domainChip}
              label={f.label}
              selected={selectedDomain === f.value}
              onClick={() => {
                setSelectedDomain(f.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              variant={selectedDomain === f.value ? "fill" : "outline"}
              size="small"
            />
          ))}
        </div>

        {/* 유형 필터 + 검색 */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-12)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              font: "var(--text-label-2-semibold)",
              color: "var(--semantic-text-sub)",
              minWidth: 40,
            }}
          >
            유형
          </span>
          <div style={{ display: "flex", gap: "var(--spacing-8)" }}>
            {TYPE_FILTERS.map((type) => (
              <Chip
                key={type}
                desc={D.typeChip}
                label={type}
                selected={selectedTypes.includes(type)}
                onClick={() => toggleType(type)}
                variant={selectedTypes.includes(type) ? "fill" : "outline"}
                size="small"
              />
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <SearchBar
            desc={D.search}
            value={searchQuery}
            onSearch={(v) => { setSearchQuery(v); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
            placeholder="문서 제목으로 검색해주세요."
            style={{ width: 260 }}
          />
        </div>
      </div>

      {/* 결과 수 */}
      <div
        style={{
          font: "var(--text-body-2-normal-regular)",
          color: "var(--semantic-text-sub)",
          marginBottom: "var(--spacing-12)",
        }}
      >
        전체{" "}
        <span
          style={{
            color: "var(--semantic-primary-default)",
            font: "var(--text-body-2-normal-semibold)",
          }}
        >
          {filtered.length}
        </span>
        건
      </div>

      {/* 테이블 */}
      <div
        style={{
          background: "var(--semantic-bg-default)",
          borderRadius: "var(--radius-large)",
          border: "1px solid var(--semantic-line-default)",
          boxShadow: "var(--level-1)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                style={{
                  borderBottom: "1px solid var(--semantic-line-default)",
                  background: "var(--semantic-natural-extra-light)",
                }}
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      padding: "var(--spacing-12) var(--spacing-16)",
                      font: "var(--text-label-2-semibold)",
                      color: "var(--semantic-text-sub)",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {header.isPlaceholder ? null : header.column.columnDef.header}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "var(--spacing-48)",
                    textAlign: "center",
                    font: "var(--text-body-2-normal-regular)",
                    color: "var(--semantic-text-sub)",
                  }}
                >
                  일치하는 문서가 없습니다. 검색어나 필터를 변경해주세요.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: "1px solid var(--semantic-line-default)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--semantic-natural-extra-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: "var(--spacing-12) var(--spacing-16)",
                        font: "var(--text-body-2-normal-regular)",
                        color: "var(--semantic-text-default)",
                      }}
                    >
                      {cell.column.columnDef.cell(cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        <div
          style={{
            padding: "var(--spacing-12) var(--spacing-16)",
            borderTop: "1px solid var(--semantic-line-default)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Pagination
            desc={D.pagination}
            table={table}
            pageCount={pageCount}
            canPreviousPage={table.getCanPreviousPage()}
            canNextPage={table.getCanNextPage()}
            onPreviousPage={() => table.previousPage()}
            onNextPage={() => table.nextPage()}
          />
        </div>
      </div>
    </PageLayout>
  );
}
