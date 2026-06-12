"""kb/ KB 엔트리를 정적 HTML 가이드(guide/dist/)로 렌더링한다.

F6(가이드 웹페이지 출력)의 최소 구현. kb/**/*.md의 프런트매터·본문을 읽어
Diátaxis(튜토리얼/하우투/레퍼런스/설명) x 도메인(프로젝트 생성/탐지 시나리오·노드)
탐색 구조를 가진 정적 사이트를 만든다. 사람이 수동으로 실행하는 빌드이며,
자동 빌드/CI 연동(F7)은 범위 밖이다.

화면 캡처: 이 스크립트는 캡처를 실행하지 않는다. agent/scripts/capture_screens.py가
미리 저장해 둔 guide/assets/screens/<entry-id>.png 와 manifest.json 만 읽어,
엔트리 페이지에 캡처 figure(+번호 핀 오버레이)를 넣는다. 캡처가 없으면 placeholder를
표시하고 빌드는 정상 진행한다.

사용:
  pip install -r guide/requirements.txt
  python guide/build.py

산출물: guide/dist/ (실행할 때마다 새로 생성됨 — .gitignore 대상)
확인:   python -m http.server --directory guide/dist  실행 후 브라우저에서 열기
"""
from __future__ import annotations

import html
import json
import os
import pathlib
import re
import shutil

import markdown
import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
KB_DIR = REPO_ROOT / "kb"
GUIDE_DIR = REPO_ROOT / "guide"
DIST_DIR = GUIDE_DIR / "dist"
TEMPLATES_DIR = GUIDE_DIR / "templates"
SCREENS_SRC_DIR = GUIDE_DIR / "assets" / "screens"   # capture_screens.py 산출물 (커밋 대상)
SCREENS_DIST_DIR = DIST_DIR / "assets" / "screens"

CATEGORY_ORDER = ["project-creation", "detection-node"]
CATEGORY_LABELS = {
    "project-creation": "프로젝트 생성·관리",
    "detection-node": "탐지 시나리오·노드",
}
# 홈 도메인 카드 — 한 줄 설명 + 실제 화면 캡처 썸네일(guide/assets/screens 재사용)
CATEGORY_TAGLINES = {
    "project-creation": "워크스페이스를 만들고, 멤버를 초대하고, 권한을 관리합니다.",
    "detection-node": "노드를 연결해 탐지 시나리오를 만들고, 이상 상황 알림을 확인합니다.",
}
CATEGORY_THUMBS = {
    "project-creation": "project-creation.invite-member--account-page.png",
    "detection-node": "detection-node.create-first-scenario--canvas.png",
}

DIATAXIS_ORDER = ["tutorial", "how-to", "reference", "explanation"]
DIATAXIS_LABELS = {
    "tutorial": "튜토리얼",
    "how-to": "하우투",
    "reference": "레퍼런스",
    "explanation": "설명",
}
# 홈의 문서 유형 안내 — 독자가 어떤 유형을 골라야 하는지 한 줄로 알려준다
DIATAXIS_INTRO = {
    "tutorial": "처음부터 끝까지 따라 하며 배웁니다.",
    "how-to": "특정 작업의 절차를 단계별로 안내합니다.",
    "reference": "정확한 사양·옵션·제한값을 표로 정리합니다.",
    "explanation": "개념과 동작 원리를 이해하도록 돕습니다.",
}

MD = markdown.Markdown(extensions=["extra", "sane_lists"])


def render_md(text: str) -> str:
    MD.reset()
    return MD.convert(text)


def load_capture_manifest() -> dict:
    """capture_screens.py가 기록한 캡처 manifest. 없으면 빈 dict (빌드는 정상 진행)."""
    manifest_path = SCREENS_SRC_DIR / "manifest.json"
    if manifest_path.exists():
        try:
            return json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"경고: {manifest_path} 파싱 실패 — 캡처 figure 없이 빌드한다")
    return {}


SLIDER_SCRIPT = """<script>
document.querySelectorAll(".guide-slider").forEach(function (slider) {
  var slides = slider.querySelectorAll(".guide-slide");
  var counter = slider.querySelector(".guide-slider-counter");
  var idx = 0;
  function show(i) {
    idx = (i + slides.length) % slides.length;
    slides.forEach(function (slide, j) { slide.classList.toggle("active", j === idx); });
    if (counter) counter.textContent = (idx + 1) + " / " + slides.length;
  }
  slider.querySelectorAll(".guide-slider-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { show(idx + Number(btn.dataset.dir)); });
  });
  show(0);
});
</script>"""


def steps_label(steps: list) -> str:
    if not steps:
        return ""
    return "단계 " + "·".join(str(s) for s in steps)


def render_shot_frame(shot: dict, title: str, current_dir: pathlib.Path) -> str:
    """장면 1장의 이미지 + 번호 핀 오버레이 HTML."""
    size = shot.get("size") or {}
    width, height = size.get("width", 1440), size.get("height", 900)
    pins = []
    for hotspot in shot.get("hotspots", []):
        box = hotspot.get("box")
        if not box:
            continue
        style = (
            f"left:{box['x'] / width * 100:.2f}%;top:{box['y'] / height * 100:.2f}%;"
            f"width:{box['width'] / width * 100:.2f}%;height:{box['height'] / height * 100:.2f}%"
        )
        pins.append(
            f'<span class="highlight-box" style="{style}" title="{html.escape(hotspot.get("label", ""))}">'
            f'<span class="hotspot">{hotspot.get("n", "")}</span></span>'
        )
    img_href = rel_href(current_dir, SCREENS_DIST_DIR / shot["image"])
    alt = f"{title} — {shot.get('title') or '화면 캡처'}"
    return (
        f'<div class="guide-figure-frame"><img src="{img_href}" '
        f'alt="{html.escape(alt)}" width="{width}" height="{height}">'
        f'{"".join(pins)}</div>'
    )


def render_capture_figure(entry: dict, manifest: dict, current_dir: pathlib.Path) -> str:
    """screen_ref 구조형(capture 보유) 엔트리의 캡처 figure HTML. 캡처 대상이 아니면 빈 문자열.

    캡처를 실행하지 않는다 — 저장된 PNG·manifest만 읽고, 없으면 placeholder를 표시한다.
    장면(shot)이 여러 장이면 이전/다음으로 넘기는 슬라이드로 렌더링한다.
    """
    fm = entry["frontmatter"]
    screen_ref = fm.get("screen_ref")
    if not (isinstance(screen_ref, dict) and isinstance(screen_ref.get("capture"), dict)):
        return ""

    entry_id = fm["id"]
    recapture_cmd = f"python agent/scripts/capture_screens.py --only {entry_id}"
    record = manifest.get(entry_id)

    shots = (record or {}).get("shots") or []
    # 구버전 manifest(단일 이미지) 호환
    if not shots and record and record.get("image"):
        shots = [{
            "id": "main", "title": "", "steps": [],
            "image": record["image"],
            "size": record.get("viewport") or {},
            "hotspots": record.get("hotspots", []),
        }]
    shots = [s for s in shots if (SCREENS_SRC_DIR / s["image"]).exists()]

    if not shots:
        return (
            '<div class="guide-figure-placeholder">화면 캡처가 아직 없습니다. '
            f"<code>{html.escape(recapture_cmd)}</code> 실행이 필요합니다.</div>"
        )

    title = fm.get("title", "")
    caption = (
        f"마지막 캡처: {html.escape(record.get('captured_at', ''))}"
        f" · 기준 코드: {html.escape(record.get('captured_commit', ''))}<br>"
        f"이 화면 다시 캡처: <code>{html.escape(recapture_cmd)}</code>"
    )

    if len(shots) == 1:
        body = render_shot_frame(shots[0], title, current_dir)
        return f'<figure class="guide-figure">{body}<figcaption>{caption}</figcaption></figure>'

    slides = []
    for i, shot in enumerate(shots):
        label_parts = [p for p in (steps_label(shot.get("steps", [])), shot.get("title", "")) if p]
        slide_caption = " · ".join(label_parts)
        slides.append(
            f'<div class="guide-slide{" active" if i == 0 else ""}">'
            f"{render_shot_frame(shot, title, current_dir)}"
            f'<p class="guide-slide-caption">{html.escape(slide_caption)}</p></div>'
        )

    nav = (
        '<div class="guide-slider-nav">'
        '<button type="button" class="guide-slider-btn" data-dir="-1">&#8249; 이전</button>'
        f'<span class="guide-slider-counter">1 / {len(shots)}</span>'
        '<button type="button" class="guide-slider-btn" data-dir="1">다음 &#8250;</button>'
        "</div>"
    )
    return (
        '<figure class="guide-figure">'
        f'<div class="guide-slider">{"".join(slides)}{nav}</div>'
        f"<figcaption>{caption}</figcaption></figure>"
        f"{SLIDER_SCRIPT}"
    )


def mark_steps_list(body_html: str) -> str:
    """절차·흐름 절 바로 뒤의 <ol>에 steps 클래스를 부여 — 번호 모양을 캡처 핀과 맞춘다."""
    return re.sub(
        r"(<h2[^>]*>[^<]*(?:절차|흐름)[^<]*</h2>\s*(?:<p>.*?</p>\s*)?)<ol>",
        r'\1<ol class="steps">',
        body_html,
        flags=re.DOTALL,
    )


def strip_leading_h1(body_html: str) -> str:
    """본문 첫 <h1>을 제거 — 페이지 셸이 이미 title을 <h1>로 렌더링하므로 중복을 막는다."""
    return re.sub(r"^\s*<h1>.*?</h1>", "", body_html, count=1, flags=re.DOTALL)


def load_entries() -> list[dict]:
    """kb/**/*.md 중 KB 엔트리 프런트매터(`id` 필드 포함)를 가진 파일만 파싱한다."""
    entries = []
    for path in sorted(KB_DIR.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---"):
            continue
        parts = text.split("---", 2)
        if len(parts) < 3:
            continue
        try:
            frontmatter = yaml.safe_load(parts[1])
        except yaml.YAMLError:
            continue
        if not isinstance(frontmatter, dict) or "id" not in frontmatter:
            continue
        entries.append({"path": path, "frontmatter": frontmatter, "body": parts[2]})
    return entries


def slug_for(entry: dict) -> str:
    return entry["path"].stem


def readme_intro_html(category: str) -> str:
    """kb/<category>/README.md에서 'Diátaxis 4유형' 섹션 이전(H1 + 소개 문단)만 렌더링한다."""
    text = (KB_DIR / category / "README.md").read_text(encoding="utf-8")
    intro, _, _ = text.partition("## Diátaxis 4유형")
    return render_md(intro.strip())


def type_description(category: str, diataxis_type: str) -> str:
    """kb/<category>/<type>/_index.md에서 유형 설명 문단(두 번째 줄)을 반환한다."""
    lines = (KB_DIR / category / diataxis_type / "_index.md").read_text(encoding="utf-8").splitlines()
    for line in lines[1:]:
        line = line.strip()
        if line and not line.startswith("작성 예정"):
            return line
    return ""


def rel_href(from_dir: pathlib.Path, to_path: pathlib.Path) -> str:
    return pathlib.Path(os.path.relpath(to_path, from_dir)).as_posix()


def build_entry_map(entries: list[dict]) -> dict[tuple[str, str], list[dict]]:
    by_type: dict[tuple[str, str], list[dict]] = {}
    for entry in entries:
        fm = entry["frontmatter"]
        key = (fm["category"], fm["diataxis_type"])
        by_type.setdefault(key, []).append(entry)
    for items in by_type.values():
        items.sort(key=lambda e: e["frontmatter"].get("title", ""))
    return by_type


def build_nav_tree(entry_map: dict[tuple[str, str], list[dict]]) -> list[dict]:
    """사이드바 = 기능(도메인) 그룹 드롭다운. 유형은 중간 단계가 아니라 항목 배지로 표시한다."""
    tree = []
    for category in CATEGORY_ORDER:
        group = {
            "label": CATEGORY_LABELS[category],
            "href": f"{category}/index.html",
            "entries": [],
        }
        for dtype in DIATAXIS_ORDER:
            for entry in entry_map.get((category, dtype), []):
                group["entries"].append({
                    "label": entry["frontmatter"]["title"],
                    "badge": DIATAXIS_LABELS[dtype],
                    "href": f"{category}/{dtype}/{slug_for(entry)}.html",
                })
        tree.append(group)
    return tree


def render_nav(tree: list[dict], current_dir: pathlib.Path, current_href: str) -> str:
    groups = []
    for group in tree:
        intro_rel = rel_href(current_dir, DIST_DIR / group["href"])
        intro_cls = ' class="active"' if group["href"] == current_href else ""
        items = [f'<li><a href="{intro_rel}"{intro_cls}>소개</a></li>']
        group_open = current_href == "" or group["href"] == current_href
        for entry in group["entries"]:
            href_rel = rel_href(current_dir, DIST_DIR / entry["href"])
            cls = ' class="active"' if entry["href"] == current_href else ""
            if entry["href"] == current_href:
                group_open = True
            items.append(
                f'<li><a href="{href_rel}"{cls}>{html.escape(entry["label"])}'
                f'<span class="type-badge">{entry["badge"]}</span></a></li>'
            )
        groups.append(
            f'<details class="nav-group"{" open" if group_open else ""}>'
            f"<summary>{html.escape(group['label'])}</summary>"
            f'<ul>{"".join(items)}</ul></details>'
        )
    return "".join(groups)


def render_breadcrumb(parts: list[tuple[str, pathlib.Path | None]], current_dir: pathlib.Path) -> str:
    items = []
    for label, target in parts:
        if target is None:
            items.append(f"<span>{html.escape(label)}</span>")
        else:
            items.append(f'<a href="{rel_href(current_dir, DIST_DIR / target)}">{html.escape(label)}</a>')
    return '<p class="breadcrumb">' + " / ".join(items) + "</p>"


def page_shell(title: str, nav_html: str, breadcrumb_html: str, content_html: str, current_dir: pathlib.Path) -> str:
    css_href = rel_href(current_dir, DIST_DIR / "assets" / "style.css")
    home_href = rel_href(current_dir, DIST_DIR / "index.html")
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · Protect Go 사용자 가이드</title>
<link rel="stylesheet" href="{css_href}">
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <a class="sidebar-title" href="{home_href}">Protect Go 사용자 가이드</a>
    {nav_html}
  </nav>
  <main class="content">
    {breadcrumb_html}
    {content_html}
  </main>
</div>
</body>
</html>
"""


def render_home(tree: list[dict], entry_map: dict[tuple[str, str], list[dict]]) -> str:
    nav_html = render_nav(tree, DIST_DIR, "")

    # ① 기능(도메인) 카드 — 실제 화면 캡처 썸네일 + 한 줄 설명 + 대표 진입 링크
    domain_cards = []
    for category in CATEGORY_ORDER:
        thumb = CATEGORY_THUMBS.get(category, "")
        thumb_html = ""
        if thumb and (SCREENS_SRC_DIR / thumb).exists():
            thumb_html = (
                f'<a class="domain-thumb" href="{category}/index.html">'
                f'<img src="assets/screens/{thumb}" alt="{CATEGORY_LABELS[category]} 화면 미리보기" loading="lazy"></a>'
            )
        quick_links = []
        for dtype in DIATAXIS_ORDER:
            for entry in entry_map.get((category, dtype), [])[:1]:
                quick_links.append(
                    f'<li><a href="{category}/{dtype}/{slug_for(entry)}.html">'
                    f'{html.escape(entry["frontmatter"]["title"])}</a>'
                    f'<span class="type-badge">{DIATAXIS_LABELS[dtype]}</span></li>'
                )
        domain_cards.append(
            f'<div class="card domain-card">{thumb_html}'
            f'<h3><a href="{category}/index.html">{CATEGORY_LABELS[category]}</a></h3>'
            f'<p>{html.escape(CATEGORY_TAGLINES.get(category, ""))}</p>'
            f'<ul>{"".join(quick_links)}</ul></div>'
        )

    # ② 가이드 구성 다이어그램 — 기능 → 문서 유형 → 본문(절차 번호 = 화면 핀 번호)
    diagram = (
        '<div class="flow-diagram">'
        '<div class="flow-step"><strong>1. 기능 선택</strong>'
        "<span>사이드바 또는 아래 카드에서 사용할 기능을 고릅니다.</span></div>"
        '<div class="flow-arrow">&#8250;</div>'
        '<div class="flow-step"><strong>2. 문서 유형 선택</strong>'
        "<span>배우기(튜토리얼) · 작업(하우투) · 사양(레퍼런스) 중 목적에 맞게 고릅니다.</span></div>"
        '<div class="flow-arrow">&#8250;</div>'
        '<div class="flow-step"><strong>3. 절차 따라가기</strong>'
        "<span>본문 절차 번호와 화면 캡처의 핀 번호가 같은 단계를 가리킵니다.</span></div>"
        "</div>"
    )

    # ③ 문서 유형 안내 — Diátaxis 4유형을 독자 언어로 설명
    type_items = "".join(
        f'<div class="doc-type"><span class="type-badge">{DIATAXIS_LABELS[dtype]}</span>'
        f"<p>{DIATAXIS_INTRO[dtype]}</p></div>"
        for dtype in DIATAXIS_ORDER
    )

    content = (
        "<h1>Protect Go 사용자 가이드</h1>"
        '<p class="description">프로젝트 생성과 탐지 시나리오·노드 구성을 중심으로,'
        " 실제 화면과 정책을 함께 정리한 가이드입니다.</p>"
        f"<section><h2>가이드 이용 방법</h2>{diagram}</section>"
        "<section><h2>기능별로 찾아보기</h2>"
        f'<div class="card-grid domain-grid">{"".join(domain_cards)}</div></section>'
        "<section><h2>문서 유형 안내</h2>"
        f'<div class="doc-type-grid">{type_items}</div></section>'
    )

    return page_shell("홈", nav_html, "", content, DIST_DIR)


def render_category_index(category: str, tree: list[dict], entry_map: dict[tuple[str, str], list[dict]]) -> str:
    current_dir = DIST_DIR / category
    current_href = f"{category}/index.html"
    nav_html = render_nav(tree, current_dir, current_href)
    bc = render_breadcrumb(
        [("홈", pathlib.Path("index.html")), (CATEGORY_LABELS[category], None)], current_dir
    )

    sections = [readme_intro_html(category)]
    for dtype in DIATAXIS_ORDER:
        entries = entry_map.get((category, dtype), [])
        heading = f'<h2><a href="{dtype}/index.html">{DIATAXIS_LABELS[dtype]}</a></h2>'
        if entries:
            items = "".join(
                f'<li><a href="{dtype}/{slug_for(e)}.html">{html.escape(e["frontmatter"]["title"])}</a>'
                f' — {html.escape(e["frontmatter"].get("description", ""))}</li>'
                for e in entries
            )
            body = f"<ul>{items}</ul>"
        else:
            desc = type_description(category, dtype)
            body = f'<p class="placeholder">{html.escape(desc)} (준비 중)</p>'
        sections.append(heading + body)

    return page_shell(CATEGORY_LABELS[category], nav_html, bc, "".join(sections), current_dir)


def render_type_index(
    category: str, dtype: str, tree: list[dict], entry_map: dict[tuple[str, str], list[dict]]
) -> str:
    current_dir = DIST_DIR / category / dtype
    current_href = f"{category}/{dtype}/index.html"
    nav_html = render_nav(tree, current_dir, current_href)
    bc = render_breadcrumb(
        [
            ("홈", pathlib.Path("index.html")),
            (CATEGORY_LABELS[category], pathlib.Path(category) / "index.html"),
            (DIATAXIS_LABELS[dtype], None),
        ],
        current_dir,
    )

    entries = entry_map.get((category, dtype), [])
    desc = type_description(category, dtype)

    if entries:
        items = "".join(
            f'<li><a href="{slug_for(e)}.html">{html.escape(e["frontmatter"]["title"])}</a>'
            f'<p class="description">{html.escape(e["frontmatter"].get("description", ""))}</p></li>'
            for e in entries
        )
        body = f'<ul class="entry-list">{items}</ul>'
    else:
        body = '<p class="placeholder">이 영역의 가이드는 아직 준비 중입니다.</p>'

    title = f"{CATEGORY_LABELS[category]} · {DIATAXIS_LABELS[dtype]}"
    content = f'<h1>{title}</h1><p class="description">{html.escape(desc)}</p>{body}'
    return page_shell(title, nav_html, bc, content, current_dir)


def render_entry_page(entry: dict, tree: list[dict], manifest: dict) -> str:
    fm = entry["frontmatter"]
    category, dtype = fm["category"], fm["diataxis_type"]
    current_dir = DIST_DIR / category / dtype
    current_href = f"{category}/{dtype}/{slug_for(entry)}.html"
    nav_html = render_nav(tree, current_dir, current_href)
    bc = render_breadcrumb(
        [
            ("홈", pathlib.Path("index.html")),
            (CATEGORY_LABELS[category], pathlib.Path(category) / "index.html"),
            (DIATAXIS_LABELS[dtype], pathlib.Path(category) / dtype / "index.html"),
            (fm["title"], None),
        ],
        current_dir,
    )

    content = (
        f'<p class="diataxis-badge">{DIATAXIS_LABELS[dtype]}</p>'
        f'<h1>{html.escape(fm["title"])}</h1>'
        f'<p class="description">{html.escape(fm.get("description", ""))}</p>'
        f"{render_capture_figure(entry, manifest, current_dir)}"
        f"{mark_steps_list(strip_leading_h1(render_md(entry['body'])))}"
    )
    return page_shell(fm["title"], nav_html, bc, content, current_dir)


def main() -> None:
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    assets_dir = DIST_DIR / "assets"
    assets_dir.mkdir(parents=True)
    shutil.copy(TEMPLATES_DIR / "style.css", assets_dir / "style.css")

    # 캡처 PNG는 이미 저장된 것만 복사 — 캡처 재실행은 하지 않는다 (capture_screens.py 담당)
    manifest = load_capture_manifest()
    if SCREENS_SRC_DIR.exists():
        SCREENS_DIST_DIR.mkdir(parents=True, exist_ok=True)
        for png in SCREENS_SRC_DIR.glob("*.png"):
            shutil.copy(png, SCREENS_DIST_DIR / png.name)

    entries = load_entries()
    entry_map = build_entry_map(entries)
    tree = build_nav_tree(entry_map)

    (DIST_DIR / "index.html").write_text(render_home(tree, entry_map), encoding="utf-8")

    for category in CATEGORY_ORDER:
        cat_dir = DIST_DIR / category
        cat_dir.mkdir(parents=True, exist_ok=True)
        (cat_dir / "index.html").write_text(render_category_index(category, tree, entry_map), encoding="utf-8")

        for dtype in DIATAXIS_ORDER:
            type_dir = cat_dir / dtype
            type_dir.mkdir(parents=True, exist_ok=True)
            (type_dir / "index.html").write_text(
                render_type_index(category, dtype, tree, entry_map), encoding="utf-8"
            )
            for entry in entry_map.get((category, dtype), []):
                (type_dir / f"{slug_for(entry)}.html").write_text(
                    render_entry_page(entry, tree, manifest), encoding="utf-8"
                )

    page_count = 1 + len(CATEGORY_ORDER) * (1 + len(DIATAXIS_ORDER)) + len(entries)
    print(f"빌드 완료: {DIST_DIR} ({page_count}개 HTML 페이지, KB 엔트리 {len(entries)}개)")


if __name__ == "__main__":
    main()
