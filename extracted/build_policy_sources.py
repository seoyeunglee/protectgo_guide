"""화면설계서 PDF -> (1) 페이지별 텍스트 추출(캐시) -> (2) 정책 신호 섹션만 필터링.

CLAUDE.md "화면설계서 PDF 읽기 규칙" 구현:
  1) 작은 스크립트로 텍스트만 추출(pymupdf), 페이지 단위로 extracted/<slug>/page-NN.txt 캐시
  2) 정책 신호 키워드 + 한글 비율 기준으로 1차 선별해 kb/_sources/policy/<slug>.md 로 추림
  3) 모델은 이 .md 파일만 읽는다 (PDF 원본을 직접 읽지 않는다)

이번 도메인(프로젝트 생성, 탐지 시나리오·노드)에 해당하는 화면만 처리한다.
캐시(extracted/<slug>/*.txt)는 재실행 시 재사용한다 — 한 번만 추출.

사용: python build_policy_sources.py
"""
import re
import datetime
import pathlib
import fitz  # pymupdf

REFS_PDF_DIR = pathlib.Path(r"C:\Users\idb\refs\Figma_PDF_files")
HERE = pathlib.Path(__file__).resolve().parent              # extracted/
POLICY_DIR = HERE.parent / "kb" / "_sources" / "policy"

# (PDF 파일명, slug, 화면 표시명) — 이번 도메인(프로젝트 생성 / 탐지 시나리오·노드)만
TARGETS = [
    ("프로젝트 생성 -_ 1. 프로젝트 이름 입력.pdf", "project-creation-1-name", "프로젝트 생성 - 1. 프로젝트 이름 입력"),
    ("프로젝트 생성 -_ 2. 멤버 초대.pdf", "project-creation-2-invite", "프로젝트 생성 - 2. 멤버 초대"),
    ("프로젝트 생성 -_ 3. 사용 용도 선택.pdf", "project-creation-3-purpose", "프로젝트 생성 - 3. 사용 용도 선택"),
    ("프로젝트 생성 → 프로젝트 선택 페이지.pdf", "project-creation-select-page", "프로젝트 생성 → 프로젝트 선택 페이지"),
    ("[공통] 노드 모듈.pdf", "detection-node-common-module", "[공통] 노드 모듈"),
    ("탐지 시나리오.pdf", "detection-scenario", "탐지 시나리오"),
    ("탐지 설정 노드.pdf", "detection-setting-node", "탐지 설정 노드"),
    ("이벤트 설정 노드.pdf", "event-setting-node", "이벤트 설정 노드"),
    ("[06.04 정책 수정 버전] 이상 탐지 알림 및 GNB 진입.pdf", "anomaly-alert-gnb-entry", "[06.04 정책 수정 버전] 이상 탐지 알림 및 GNB 진입"),
    ("[WEB] 상황 제안 에이전트.pdf", "situation-suggestion-agent-web", "[WEB] 상황 제안 에이전트"),
    ("[MO] 상황 제안 에이전트.pdf", "situation-suggestion-agent-mobile", "[MO] 상황 제안 에이전트"),
]

# 정책 신호 키워드 (CLAUDE.md: 상태/전환/조건/예외/기본값/유효성/권한/제약/오류/필수 등)
POLICY_KEYWORDS = [
    "정책", "상태", "전환", "조건", "예외", "기본값", "유효성", "권한", "제약",
    "오류", "필수", "가능", "불가능", "노출", "비활성", "활성화", "활성",
    "최대", "최소", "이상", "이하", "초과", "미만", "클릭", "팝업", "안내",
    "표시", "선택", "입력", "초대", "삭제", "추가", "변경", "허용", "차단",
    "검증", "확인", "버튼", "토글", "알림", "경보",
]
HANGUL_RE = re.compile(r"[가-힣]")

# Figma 도형 라벨은 폰트 서브셋 문제로 깨진(모지바케) 텍스트가 섞여 나온다.
# "Description" 정책 설명 영역의 한글은 정상 추출되므로, 한글 비율이 낮은 줄은 모지바케로 보고 제외한다.
def is_policy_line(line: str) -> bool:
    line = line.strip()
    if len(line) < 4:
        return False
    hangul = len(HANGUL_RE.findall(line))
    if hangul < max(3, int(len(line) * 0.3)):
        return False
    return any(kw in line for kw in POLICY_KEYWORDS)


def extract_pages(pdf_path: pathlib.Path, slug: str) -> list[pathlib.Path]:
    out_dir = HERE / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(pdf_path))
    pages = []
    for i, page in enumerate(doc, start=1):
        out_path = out_dir / f"page-{i:02d}.txt"
        if not out_path.exists():           # 캐시 재사용 — 이미 추출된 페이지는 건너뜀
            out_path.write_text(page.get_text(), encoding="utf-8")
        pages.append(out_path)
    return pages


def write_policy_md(slug: str, screen: str, source_pdf_name: str, pages: list[pathlib.Path]) -> int:
    picked: list[str] = []
    for p in pages:
        for line in p.read_text(encoding="utf-8").splitlines():
            if is_policy_line(line):
                picked.append(line.strip())

    seen: set[str] = set()
    uniq = [l for l in picked if not (l in seen or seen.add(l))]

    page_nums = [int(p.stem.split("-")[1]) for p in pages]
    front_matter = (
        "---\n"
        f"screen: {screen}\n"
        f'source_pdf: "refs/Figma_PDF_files/{source_pdf_name}"\n'
        f"pages: {page_nums}\n"
        f'extracted_at: "{datetime.date.today().isoformat()}"\n'
        "---\n\n"
    )
    LOW_YIELD_NOTE = (
        "\n\n> ⚠️ 정책 신호 라인이 적게 추출됐다 — 이 PDF의 본문(Description) 텍스트가 "
        "폰트 서브셋 인코딩 문제로 깨져(모지바케) 있을 가능성이 높다. "
        "`extracted/{slug}/page-NN.txt` 원문에서 리비전 히스토리 외 본문 줄의 한글 비율을 확인하고, "
        "`protect-go-knowledge`(기존 KB) · 화면 프로토타입으로 보강할 것."
    )
    if uniq:
        body = "\n".join(f"- {l}" for l in uniq)
        if len(uniq) <= 5:
            body += LOW_YIELD_NOTE.format(slug=slug)
    else:
        body = (
            "_(정책 신호 라인을 찾지 못함 — 화면 세부 위주이거나, 이 PDF의 폰트 서브셋 인코딩 문제로 "
            "본문이 깨졌을 수 있음. `extracted/<slug>/page-NN.txt` 원문 확인 후 "
            "`protect-go-knowledge`(기존 KB) · 화면 프로토타입으로 보강 필요)_"
        )

    out_path = POLICY_DIR / f"{slug}.md"
    out_path.write_text(front_matter + body + "\n", encoding="utf-8")
    return len(uniq)


def main() -> None:
    POLICY_DIR.mkdir(parents=True, exist_ok=True)
    for pdf_name, slug, screen in TARGETS:
        pdf_path = REFS_PDF_DIR / pdf_name
        if not pdf_path.exists():
            print(f"[스킵] 원본 없음: {pdf_name}")
            continue
        pages = extract_pages(pdf_path, slug)
        n = write_policy_md(slug, screen, pdf_name, pages)
        print(f"{slug}: {len(pages)}p 추출 -> 정책 라인 {n}개 -> kb/_sources/policy/{slug}.md")


if __name__ == "__main__":
    main()
