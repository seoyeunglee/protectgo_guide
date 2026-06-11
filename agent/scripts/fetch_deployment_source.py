"""라이브 배포 소스(F8) — 최신 배포 페치 + 변경 감지 + provenance 동기화 보조 도구.

배포된 프론트엔드 프로토타입(예: Vercel)의 production alias URL(항상 최신 배포를 가리킴)을
페치해 정적 렌더 텍스트를 section_anchor 단위로 추출·해시하고, 직전 스냅샷과 비교해
변경된 섹션을 보여준다. agent/flow.md·interfaces.md의 4단계 자동 업데이트 에이전트
(classify -> locate -> compose -> publish)와는 별개의, 사람이 "이 배포 소스를 다시 봐야
하는가?"를 빠르게 판단하기 위한 점검 도구다 (07-features.md F8). check_screen_ref.py와
같은 위치에 두는 같은 성격의 도구다.

이 스크립트는 본문(policy/screen_ref 등)을 자동 재생성하지 않는다. `sync --apply`도
provenance.<field>.deployment의 content_hash/fetched_at/deployed_at 메타데이터만 갱신한다.

사용:
  # 최초 페치 (스냅샷 생성) — 이후에는 --url 생략 가능(직전 스냅샷의 url 재사용)
  python fetch_deployment_source.py fetch pg-relabel-prototype --url https://pg-relabel-prototype.vercel.app/

  # 재페치 — 직전 스냅샷과 비교해 변경된 섹션을 보여줌 ("최신 배포로 동기화" 버튼에 해당)
  python fetch_deployment_source.py fetch pg-relabel-prototype

  # 직전 fetch에서 변경된 섹션을 참조하는 KB 필드를 찾아 리포트 (dry-run)
  python fetch_deployment_source.py sync pg-relabel-prototype

  # 위 대상 필드의 provenance.deployment 메타데이터(해시/시각)만 갱신 — 본문은 변경하지 않음
  python fetch_deployment_source.py sync pg-relabel-prototype --apply

  # JSON으로 출력 (다른 도구·화면에서 참조하기 위한 구조화 출력)
  python fetch_deployment_source.py fetch pg-relabel-prototype --format json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request
from collections import OrderedDict
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser

import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]  # protect-go-guide/
KB_DIR = REPO_ROOT / "kb"
SNAPSHOT_DIR = REPO_ROOT / "agent" / "snapshots"

SKIP_TAGS = {"script", "style", "noscript"}
HEADING_TAGS = {"h1", "h2", "h3"}
MIN_TEXT_LENGTH = 200  # 적격성(정적 렌더 텍스트 추출) 판단 임계값 — 빈 SPA 셸/iframe 격리 감지용
HIDDEN_CLASS_RE = re.compile(r'class="[^"]*\bhidden\b[^"]*"')
WS_RE = re.compile(r"\s+")


class SectionTextExtractor(HTMLParser):
    """본문 텍스트를 가장 최근 h1~h3 제목 기준 섹션(section_anchor)으로 분할해 추출한다."""

    def __init__(self) -> None:
        super().__init__()
        self._sections: "OrderedDict[str, list[str]]" = OrderedDict()
        self._current = "intro"
        self._sections.setdefault(self._current, [])
        self._skip_depth = 0
        self._in_heading = False
        self._heading_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in SKIP_TAGS:
            self._skip_depth += 1
            return
        if tag in HEADING_TAGS:
            self._in_heading = True
            self._heading_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if tag in HEADING_TAGS and self._in_heading:
            text = WS_RE.sub(" ", "".join(self._heading_buf)).strip()
            if text:
                key = self._unique_key(text)
                self._current = key
                self._sections.setdefault(key, []).append(text)
            self._in_heading = False

    def _unique_key(self, text: str) -> str:
        slug = WS_RE.sub("-", text)[:60]
        key = slug
        i = 2
        while key in self._sections:
            key = f"{slug}-{i}"
            i += 1
        return key

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = WS_RE.sub(" ", data).strip()
        if not text:
            return
        if self._in_heading:
            self._heading_buf.append(data)
            return
        self._sections.setdefault(self._current, []).append(text)

    def result(self) -> "OrderedDict[str, str]":
        return OrderedDict((k, " ".join(v)) for k, v in self._sections.items() if v)


def extract_sections(html: str) -> "OrderedDict[str, str]":
    parser = SectionTextExtractor()
    parser.feed(html)
    return parser.result()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fetch_url(url: str) -> tuple[str, dict]:
    req = urllib.request.Request(url, headers={"User-Agent": "protect-go-guide-fetch-deployment-source/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (URL은 KB provenance에 기록된 신뢰 출처)
        charset = resp.headers.get_content_charset() or "utf-8"
        html = resp.read().decode(charset, errors="replace")
        headers = {k: v for k, v in resp.headers.items()}
    return html, headers


def fetch_url_rendered(url: str, wait_ms: int = 4000) -> tuple[str, dict]:
    """클라이언트 렌더링(SPA) 배포용 — Playwright(chromium)로 렌더된 DOM을 가져온다.

    정적 페치(fetch_url)로 적격성 실패(빈 SPA 셸)가 나는 배포에 --render로 사용한다.
    랜딩 화면에 렌더된 텍스트만 추출한다 — 클릭해야 보이는 탭·모달 내용은 포함되지 않는다.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "playwright 미설치 — pip install -r requirements.txt 후 playwright install chromium 실행"
        ) from exc
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        response = page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(wait_ms)
        html = page.content()
        raw_headers = response.headers if response else {}
        browser.close()
    headers = {}
    if raw_headers.get("last-modified"):
        headers["Last-Modified"] = raw_headers["last-modified"]
    return html, headers


def parse_deployed_at(headers: dict) -> str:
    last_modified = headers.get("Last-Modified")
    if not last_modified:
        return ""
    try:
        dt = parsedate_to_datetime(last_modified)
    except (TypeError, ValueError):
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def check_eligibility(sections: "OrderedDict[str, str]", html: str) -> tuple[bool, list[str]]:
    warnings: list[str] = []
    total_len = sum(len(t) for t in sections.values())
    if total_len < MIN_TEXT_LENGTH:
        return False, [
            f"추출된 텍스트가 너무 짧음({total_len}자, 기준 {MIN_TEXT_LENGTH}자) — "
            "정적 렌더링이 아니거나(SPA 빈 셸) iframe에 격리된 아티팩트일 가능성"
        ]
    hidden_count = len(HIDDEN_CLASS_RE.findall(html))
    if hidden_count:
        warnings.append(
            f"'hidden' 클래스가 {hidden_count}곳에서 발견됨 — 인터랙션 후에만 노출되는 동적 상태는 "
            "정적 추출에 포함되지 않을 수 있음(수동 확인 권장)"
        )
    return True, warnings


def diff_sections(old_sections: dict, new_sections: dict) -> tuple[set[str], set[str], set[str]]:
    old_keys, new_keys = set(old_sections), set(new_sections)
    added = new_keys - old_keys
    removed = old_keys - new_keys
    changed = {k for k in (old_keys & new_keys) if old_sections[k]["hash"] != new_sections[k]["hash"]}
    return changed, added, removed


def snapshot_path(source_id: str) -> pathlib.Path:
    return SNAPSHOT_DIR / f"{source_id}.json"


def load_snapshot(source_id: str) -> dict | None:
    path = snapshot_path(source_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_snapshot(source_id: str, snapshot: dict) -> pathlib.Path:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    path = snapshot_path(source_id)
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def cmd_fetch(args: argparse.Namespace) -> int:
    source_id = args.source_id
    previous = load_snapshot(source_id)
    url = args.url or (previous or {}).get("url")
    if not url:
        print(f"오류: --url이 필요합니다 (source_id={source_id}의 기존 스냅샷이 없음)", file=sys.stderr)
        return 1

    # --render 또는 기존 스냅샷이 render 모드였다면 Playwright 렌더 페치 사용 (SPA 배포)
    use_render = bool(getattr(args, "render", False) or (previous or {}).get("render"))
    try:
        if use_render:
            html, headers = fetch_url_rendered(url)
        else:
            html, headers = fetch_url(url)
    except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
        print(f"오류: {url} 페치 실패 — {exc}", file=sys.stderr)
        return 1

    sections = extract_sections(html)
    eligible, warnings = check_eligibility(sections, html)

    if not eligible:
        if args.format == "json":
            print(json.dumps({"source_id": source_id, "url": url, "status": "ineligible", "warnings": warnings},
                              ensure_ascii=False, indent=2))
        else:
            print(f"적격성 실패: {source_id} ({url})")
            for w in warnings:
                print(f"  - {w}")
        return 1

    full_text = " ".join(sections.values())
    new_section_meta = {k: {"hash": sha256_text(v), "length": len(v)} for k, v in sections.items()}
    old_section_meta = (previous or {}).get("sections", {})
    changed, added, removed = diff_sections(old_section_meta, new_section_meta)

    new_snapshot = {
        "source_id": source_id,
        "type": "deployment",
        "url": url,
        "render": use_render,
        "deployment_ref": (previous or {}).get("deployment_ref", ""),
        "content_hash": sha256_text(full_text),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "deployed_at": parse_deployed_at(headers),
        "sections": new_section_meta,
        "changed_sections": sorted(changed | added),
        "removed_sections": sorted(removed),
        "warnings": warnings,
    }
    saved_path = save_snapshot(source_id, new_snapshot)

    if previous is None:
        status = "new"
    elif previous.get("content_hash") == new_snapshot["content_hash"]:
        status = "no_relevant_change"
    else:
        status = "changed"

    if args.format == "json":
        print(json.dumps({**new_snapshot, "status": status, "snapshot_path": str(saved_path.relative_to(REPO_ROOT))},
                          ensure_ascii=False, indent=2))
        return 0

    print(f"배포 소스: {source_id}")
    print(f"URL        : {url}")
    print(f"페치 시각  : {new_snapshot['fetched_at']}")
    print(f"배포 시각  : {new_snapshot['deployed_at'] or '(Last-Modified 헤더 없음)'}")
    print(f"content_hash: {new_snapshot['content_hash']}")
    print(f"섹션 수    : {len(new_section_meta)}개")
    print()

    status_label = {
        "new": "최초 페치 — 스냅샷 생성 (비교 대상 없음)",
        "no_relevant_change": "변경 없음 (직전 스냅샷과 content_hash 동일)",
        "changed": f"변경 감지 — 섹션 {len(changed | added)}개 변경/추가, {len(removed)}개 삭제",
    }
    print(f"상태: {status_label[status]}")
    if changed | added:
        print("변경/신규 섹션:")
        for k in sorted(changed | added):
            tag = "신규" if k in added else "변경"
            print(f"  - [{tag}] {k}")
    if removed:
        print("삭제된 섹션:")
        for k in sorted(removed):
            print(f"  - {k}")
    if warnings:
        print("경고:")
        for w in warnings:
            print(f"  - {w}")

    print(f"\n스냅샷 저장: {saved_path.relative_to(REPO_ROOT)}")
    if status == "changed":
        print(f"다음: 'python fetch_deployment_source.py sync {source_id}'로 영향받는 KB 필드를 확인하세요.")
    return 0


def load_kb_entries() -> list[dict]:
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
        entries.append({"path": path, "frontmatter": frontmatter})
    return entries


def find_deployment_targets(source_id: str, changed_sections: set[str]) -> list[tuple[dict, str, dict]]:
    """provenance.<field>.deployment.source_id == source_id 이고 section_anchor가
    changed_sections에 포함된 (entry, field, deployment_provenance)를 모두 찾는다."""
    targets = []
    for entry in load_kb_entries():
        provenance = entry["frontmatter"].get("provenance") or {}
        for field, prov in provenance.items():
            if not isinstance(prov, dict):
                continue
            dep = prov.get("deployment")
            if not isinstance(dep, dict) or dep.get("source_id") != source_id:
                continue
            if dep.get("section_anchor") in changed_sections:
                targets.append((entry, field, dep))
    return targets


def patch_deployment_block(frontmatter_text: str, field: str, content_hash: str,
                            fetched_at: str, deployed_at: str) -> str | None:
    """provenance.<field>.deployment 블록의 content_hash/fetched_at/deployed_at 값만 치환한다.

    YAML 파서로 전체를 다시 직렬화하지 않아 그 외 줄의 포맷·주석·키 순서를 그대로 보존한다.
    schema/kb-entry.md 예시의 들여쓰기(필드 2-space, deployment 하위 6-space)를 가정한다.
    매칭 실패 시 None을 반환한다(파일을 건드리지 않음).
    """
    field_pat = re.compile(
        rf"(\n  {re.escape(field)}:\n(?:.*\n)*?    deployment:\n(?:.*\n)*?)(?=\n  \S|\n---|\Z)"
    )
    m = field_pat.search(frontmatter_text)
    if not m:
        return None
    block = m.group(1)

    def sub_value(text: str, key: str, value: str) -> tuple[str, int]:
        return re.subn(
            rf'(?m)^(\s*{key}:\s*).*$',
            lambda mm: mm.group(1) + json.dumps(value, ensure_ascii=False),
            text,
            count=1,
        )

    new_block, n1 = sub_value(block, "content_hash", content_hash)
    new_block, n2 = sub_value(new_block, "fetched_at", fetched_at)
    new_block, n3 = sub_value(new_block, "deployed_at", deployed_at)
    if not (n1 and n2 and n3):
        return None

    return frontmatter_text[: m.start(1)] + new_block + frontmatter_text[m.end(1):]


def cmd_sync(args: argparse.Namespace) -> int:
    source_id = args.source_id
    snapshot = load_snapshot(source_id)
    if snapshot is None:
        print(f"오류: 스냅샷 없음 — 먼저 'fetch {source_id} --url <url>'을 실행하세요", file=sys.stderr)
        return 1

    changed_sections = set(snapshot.get("changed_sections", []))
    if not changed_sections:
        print(f"{source_id}: 직전 fetch 이후 변경된 섹션 없음 — 동기화할 항목 없음 (no-op)")
        return 0

    targets = find_deployment_targets(source_id, changed_sections)
    if not targets:
        print(f"{source_id}: 변경된 섹션({', '.join(sorted(changed_sections))})을 참조하는 KB 필드 없음")
        return 0

    print(f"{source_id}: 변경된 섹션 {len(changed_sections)}개 -> 영향받는 필드 {len(targets)}개")
    for entry, field, dep in targets:
        rel = entry["path"].relative_to(REPO_ROOT)
        anchor = dep["section_anchor"]
        new_meta = snapshot["sections"][anchor]
        old_hash = (dep.get("content_hash") or "")[:12]
        print(f"  - {entry['frontmatter'].get('id')} / {field} ({rel})")
        print(f"      section_anchor: {anchor}")
        print(f"      content_hash  : {old_hash}... -> {new_meta['hash'][:12]}...")
        print(f"      권장 조치     : 본문 검토 후 갱신. 확정 출처가 생기면 provenance.{field}.source를 승격")

    if not args.apply:
        print("\n(dry-run — provenance 갱신 없음. --apply로 content_hash/fetched_at/deployed_at만 갱신)")
        return 0

    updated = 0
    for entry, field, _dep in targets:
        path = entry["path"]
        text = path.read_text(encoding="utf-8")
        end = text.find("\n---", 3)
        if not text.startswith("---") or end == -1:
            continue
        anchor = entry["frontmatter"]["provenance"][field]["deployment"]["section_anchor"]
        new_meta = snapshot["sections"][anchor]
        patched_fm = patch_deployment_block(
            text[: end + 1], field, new_meta["hash"], snapshot["fetched_at"], snapshot["deployed_at"]
        )
        if patched_fm is None:
            print(f"  경고: {path.relative_to(REPO_ROOT)}의 provenance.{field}.deployment 블록을 찾지 못해 건너뜀")
            continue
        path.write_text(patched_fm + text[end + 1:], encoding="utf-8")
        updated += 1

    print(f"\n{updated}개 필드의 provenance.deployment 메타데이터 갱신 완료 (본문은 변경하지 않음 — 직접 검토 필요)")
    return 0


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_fetch = sub.add_parser("fetch", help="배포 URL을 페치해 스냅샷 저장 + 직전 스냅샷과 비교")
    p_fetch.add_argument("source_id", help="배포 소스 식별자 (agent/snapshots/<source_id>.json)")
    p_fetch.add_argument("--url", help="배포 production alias URL (최초 1회 필요, 이후 생략 시 기존 스냅샷의 url 재사용)")
    p_fetch.add_argument("--render", action="store_true",
                         help="Playwright로 렌더된 DOM을 페치 (정적 페치가 적격성 실패하는 SPA 배포용. "
                              "스냅샷에 기록되어 이후 재페치 시 자동 적용)")
    p_fetch.add_argument("--format", choices=["text", "json"], default="text")
    p_fetch.set_defaults(func=cmd_fetch)

    p_sync = sub.add_parser("sync", help="직전 fetch에서 변경된 섹션을 참조하는 KB 필드의 provenance.deployment 동기화")
    p_sync.add_argument("source_id", help="배포 소스 식별자 (agent/snapshots/<source_id>.json)")
    p_sync.add_argument("--apply", action="store_true", help="실제로 provenance.deployment 메타데이터를 갱신 (기본은 dry-run)")
    p_sync.set_defaults(func=cmd_sync)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
