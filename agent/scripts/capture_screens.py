"""화면 캡처 — KB 엔트리의 screen_ref 구조형(page/capture/hotspots)을 읽어
강조 테두리를 입힌 실제 화면 PNG를 만든다 (F6 가이드 렌더링 보강).

- 캡처 대상 정의는 KB 엔트리 프런트매터(schema/kb-entry.md "screen_ref 구조형")가 단일 기준.
  좌표 하드코딩 없이 Playwright 셀렉터로 요소를 지정한다.
- 산출물: guide/assets/screens/<entry-id>.png + manifest.json (핀 좌표·캡처 시각·커밋).
- 엔트리 .md에는 provenance.screen_ref.captured_commit 한 줄만 갱신한다(사용자 승인 사항).
  본문·다른 프런트매터는 건드리지 않는다.
- 이 스크립트는 명시적으로 실행할 때만 동작한다. auth_login.py / check_screen_ref.py /
  guide/build.py 를 자동 호출하지 않으며, 그쪽에서도 이 스크립트를 자동 호출하지 않는다.

사용:
  python capture_screens.py                  # screen_ref.capture가 있는 모든 엔트리 캡처
  python capture_screens.py --only <entry-id>
  python capture_screens.py --stale-only     # 코드가 바뀐(또는 미캡처) 화면만 캡처

--stale-only 판정 (check_screen_ref.py와 공유):
  manifest의 captured_commit 과 프론트엔드 로컬 클론의 비교 기준 커밋(upstream 추적
  브랜치 또는 HEAD)이 다르면 stale, manifest에 기록이 없으면 미캡처 → 캡처 대상.
  원격 최신과 비교하려면 먼저 `python check_screen_ref.py --fetch`로 최신화할 것
  (이 스크립트는 git fetch를 하지 않는다 — 자동 트리거 없음).

로그인이 필요한 화면(requires_auth: true)은 agent/.auth/state.json 세션을 사용한다.
세션이 없거나 만료되면 해당 엔트리를 건너뛰고 안내만 출력한다(전체 중단 없음):
  세션 만료 — agent/scripts/auth_login.py 를 다시 실행하세요

환경 변수:
  PROTECTGO_FE_REPO  ProtectGO-ENT-FE 로컬 클론 경로 (check_screen_ref.py와 동일)
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import pathlib
import re
import sys

from check_screen_ref import (
    DEFAULT_FRONTEND_REPO,
    KB_DIR,
    REPO_ROOT,
    load_entries,
    resolve_compare_ref,
    run_git,
)

SCREENS_DIR = REPO_ROOT / "guide" / "assets" / "screens"
MANIFEST_PATH = SCREENS_DIR / "manifest.json"
STATE_PATH = REPO_ROOT / "agent" / ".auth" / "state.json"
SNAPSHOTS_DIR = REPO_ROOT / "agent" / "snapshots"

DEFAULT_VIEWPORT = {"width": 1440, "height": 900}
# 강조 색 = PG semantic-primary-default(#4A71FF) — 가이드의 핀·절차 번호 색과 일치시킨다
HIGHLIGHT_JS = (
    "el => { el.style.outline = '3px solid #4A71FF';"
    " el.style.outlineOffset = '1px';"
    " el.style.boxShadow = '0 0 0 4px rgba(74,113,255,.25)'; }"
)
SELECTOR_TIMEOUT_MS = 15000


def collect_capture_targets(kb_dir: pathlib.Path) -> list[dict]:
    """screen_ref가 구조형이고 capture 블록을 가진 엔트리만 모은다."""
    targets = []
    for entry in load_entries(kb_dir):
        screen_ref = entry["frontmatter"].get("screen_ref")
        if not isinstance(screen_ref, dict):
            continue
        capture = screen_ref.get("capture")
        if not isinstance(capture, dict):
            continue
        targets.append({
            "id": entry["frontmatter"]["id"],
            "path": entry["path"],
            "page": screen_ref.get("page") or "/",
            "capture": capture,
            "shots": normalize_shots(screen_ref),
        })
    return targets


def normalize_shots(screen_ref: dict) -> list[dict]:
    """shots 목록을 반환한다. shots 없이 hotspots만 있으면 단일 장면으로 취급."""
    shots = screen_ref.get("shots")
    if shots:
        return shots
    return [{"id": "main", "title": "", "steps": [], "hotspots": screen_ref.get("hotspots") or []}]


def resolve_locator(page, selector: str, nth: int = 0):
    """selector의 nth 번째 요소 locator (-1 = 마지막)."""
    loc = page.locator(selector)
    return loc.last if nth == -1 else loc.nth(nth)


def resolve_base_url(capture: dict) -> tuple[str, str]:
    """base URL을 정한다. 반환: (base_url, 출처 설명). 실패 시 ('', 사유).

    우선순위: 환경변수 > F8 스냅샷 > capture.base_url.
    환경변수 PG_CAPTURE_BASE_URL_<SOURCE_ID> (대문자, '-'는 '_')로 호스트가 바뀌어도
    엔트리 수정 없이 덮어쓸 수 있다 (예: 프로젝트 앱 호스트 IP 변경 시).
    """
    source_id = capture.get("base_url_source") or ""
    env_key = "PG_CAPTURE_BASE_URL_" + source_id.upper().replace("-", "_")
    if source_id and os.environ.get(env_key):
        return os.environ[env_key], f"환경변수 {env_key}"
    snapshot_path = SNAPSHOTS_DIR / f"{source_id}.json"
    if source_id and snapshot_path.exists():
        try:
            url = json.loads(snapshot_path.read_text(encoding="utf-8")).get("url", "")
        except (json.JSONDecodeError, OSError):
            url = ""
        if url:
            return url, f"agent/snapshots/{source_id}.json"
    if capture.get("base_url"):
        return capture["base_url"], "capture.base_url"
    return "", f"스냅샷(agent/snapshots/{source_id}.json)도 capture.base_url도 없음"


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        try:
            return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"경고: {MANIFEST_PATH} 파싱 실패 — 새로 만든다", file=sys.stderr)
    return {}


def save_manifest(manifest: dict) -> None:
    SCREENS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def is_stale(entry_id: str, manifest: dict, current_version: str) -> tuple[bool, str]:
    """--stale-only 판정. 반환: (캡처 대상 여부, 사유)."""
    record = manifest.get(entry_id)
    if not record:
        return True, "미캡처 (manifest에 기록 없음)"
    if record.get("captured_commit") != current_version:
        return True, f"stale (captured: {record.get('captured_commit', '?')})"
    return False, "최신 (captured_commit = 현재 커밋)"


def patch_captured_commit(entry_path: pathlib.Path, captured_commit: str) -> bool:
    """provenance.screen_ref 블록의 captured_commit 한 줄만 갱신/삽입한다.

    YAML 전체를 재직렬화하지 않고 라인 단위로만 고친다(프런트매터 포맷·주석 보존).
    블록을 찾지 못하면 False를 반환하고 파일을 건드리지 않는다.
    """
    text = entry_path.read_text(encoding="utf-8")
    # provenance 하위의 "  screen_ref:" 블록 (들여쓰기 2칸 — 최상위 screen_ref와 구분됨)
    block_re = re.compile(r"(?m)^  screen_ref:\n((?:    .*\n)+)")
    match = block_re.search(text)
    if not match:
        return False

    block = match.group(1)
    new_line = f'    captured_commit: "{captured_commit}"\n'
    if re.search(r"(?m)^    captured_commit:.*\n", block):
        new_block = re.sub(r"(?m)^    captured_commit:.*\n", new_line, block, count=1)
    elif re.search(r"(?m)^    version:.*\n", block):
        new_block = re.sub(r"(?m)^(    version:.*\n)", r"\1" + new_line, block, count=1)
    else:
        new_block = block + new_line

    if new_block == block:
        return True
    entry_path.write_text(text[: match.start(1)] + new_block + text[match.end(1):], encoding="utf-8")
    return True


def looks_logged_out(url: str) -> bool:
    lowered = url.lower()
    return "login" in lowered or "signin" in lowered or "select-project" in lowered


def capture_shot(page, entry_id: str, shot: dict, viewport: dict) -> dict | None:
    """장면 1개 캡처(현재 page 상태에서 actions 수행 → 강조 → 스크린샷). 실패 시 None."""
    shot_id = shot.get("id", "main")

    # actions — 읽기 전용 인터랙션만 (모달·탭·드롭다운 열기). 폼 제출·저장·삭제 클릭 금지.
    for action in shot.get("actions") or []:
        selector = action.get("click", "")
        if not selector:
            continue
        locator = resolve_locator(page, selector, action.get("nth", 0))
        try:
            locator.wait_for(state="visible", timeout=SELECTOR_TIMEOUT_MS)
            locator.click()
            page.wait_for_timeout(1200)
        except Exception:
            print(f"  · 경고: shot={shot_id} action 클릭 실패 — {selector}")
            return None

    hotspot_records = []
    missing = []
    for hotspot in shot.get("hotspots") or []:
        selector = hotspot.get("selector", "")
        locator = resolve_locator(page, selector, hotspot.get("nth", 0))
        try:
            locator.wait_for(state="visible", timeout=SELECTOR_TIMEOUT_MS)
        except Exception:
            missing.append(hotspot)
            continue
        locator.evaluate(HIGHLIGHT_JS)
        box = locator.bounding_box()
        hotspot_records.append({
            "n": hotspot.get("n"),
            "selector": selector,
            "label": hotspot.get("label", ""),
            "box": box,
        })

    for hotspot in missing:
        print(f"  · 경고: shot={shot_id} hotspot n={hotspot.get('n')} 셀렉터 미발견 — {hotspot.get('selector')}")
    if not hotspot_records:
        return None

    page.wait_for_timeout(300)  # 강조 스타일 적용 안정화

    # crop — 확대 장면: 셀렉터 bounding box 주변(여백 32px)만 잘라낸다
    clip = None
    if shot.get("crop"):
        crop_box = resolve_locator(page, shot["crop"]).bounding_box()
        if crop_box:
            pad = 32
            x = max(crop_box["x"] - pad, 0)
            y = max(crop_box["y"] - pad, 0)
            clip = {
                "x": x,
                "y": y,
                "width": min(crop_box["width"] + pad * 2, viewport["width"] - x),
                "height": min(crop_box["height"] + pad * 2, viewport["height"] - y),
            }

    SCREENS_DIR.mkdir(parents=True, exist_ok=True)
    image_path = SCREENS_DIR / f"{entry_id}--{shot_id}.png"
    page.screenshot(path=str(image_path), clip=clip)

    if clip:
        size = {"width": round(clip["width"]), "height": round(clip["height"])}
        for record in hotspot_records:
            if record["box"]:
                record["box"] = {
                    "x": record["box"]["x"] - clip["x"],
                    "y": record["box"]["y"] - clip["y"],
                    "width": record["box"]["width"],
                    "height": record["box"]["height"],
                }
    else:
        size = dict(viewport)

    return {
        "id": shot_id,
        "title": shot.get("title", ""),
        "steps": shot.get("steps") or [],
        "image": image_path.name,
        "size": size,
        "hotspots": hotspot_records,
    }


def capture_one(browser, target: dict, current_version: str, state_path: pathlib.Path) -> dict | None:
    """엔트리 1개 캡처(장면 여러 장). 성공 시 manifest 레코드 반환, 건너뛰면 None."""
    entry_id = target["id"]
    capture = target["capture"]

    base_url, base_src = resolve_base_url(capture)
    if not base_url:
        print(f"- {entry_id}: 건너뜀 — base URL 결정 불가 ({base_src})")
        return None

    requires_auth = bool(capture.get("requires_auth"))
    if requires_auth and not state_path.exists():
        print(f"- {entry_id}: 건너뜀 — 로그인 세션 없음. agent/scripts/auth_login.py 를 먼저 실행하세요")
        return None

    viewport = capture.get("viewport") or DEFAULT_VIEWPORT
    viewport = {"width": int(viewport.get("width", 1440)), "height": int(viewport.get("height", 900))}

    url = base_url.rstrip("/") + target["page"]
    context_kwargs = {"viewport": viewport}
    if requires_auth:
        context_kwargs["storage_state"] = str(state_path)

    context = browser.new_context(**context_kwargs)
    page = context.new_page()
    try:
        shot_records = []
        for shot in target["shots"]:
            # 장면마다 페이지를 새로 열어 이전 장면의 인터랙션 상태(모달 등)를 초기화한다
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_load_state("load")
            page.wait_for_timeout(2000)  # SPA 초기 렌더 안정화 (콜드 로드 시 요소 지연 대비)

            if requires_auth and looks_logged_out(page.url):
                print(f"- {entry_id}: 건너뜀 — 로그인 페이지로 리다이렉트됨({page.url}). "
                      "agent/scripts/auth_login.py 를 다시 실행하세요")
                return None

            # capture.hide — 강조 대상을 가리는 오버레이(미니맵 등)를 캡처에서만 숨긴다
            for hide_selector in capture.get("hide") or []:
                page.wait_for_timeout(500)
                page.locator(hide_selector).evaluate_all(
                    "els => els.forEach(el => { el.style.visibility = 'hidden'; })"
                )

            record = capture_shot(page, entry_id, shot, viewport)
            if record:
                shot_records.append(record)

        if not shot_records:
            if requires_auth and looks_logged_out(page.url):
                print(f"- {entry_id}: 건너뜀 — 세션 만료로 보임({page.url}). "
                      "agent/scripts/auth_login.py 를 다시 실행하세요")
            else:
                print(f"- {entry_id}: 건너뜀 — 어느 장면에서도 hotspot을 찾지 못함 "
                      f"(현재 URL: {page.url}). 세션 만료 또는 화면 변경 가능성 — "
                      "auth_login.py 재실행 또는 셀렉터 점검 필요")
            return None

        # 이 엔트리의 이전 캡처 PNG 중 이번에 안 만든 파일 정리 (장면 구성 변경 대비)
        produced = {r["image"] for r in shot_records}
        for old in list(SCREENS_DIR.glob(f"{entry_id}.png")) + list(SCREENS_DIR.glob(f"{entry_id}--*.png")):
            if old.name not in produced:
                old.unlink()

        pin_count = sum(len(r["hotspots"]) for r in shot_records)
        record = {
            "page": target["page"],
            "url": url,
            "viewport": viewport,
            "captured_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "captured_commit": current_version,
            "shots": shot_records,
        }
        print(f"- {entry_id}: 캡처 완료 — 장면 {len(shot_records)}/{len(target['shots'])}장, 핀 {pin_count}개")
        return record
    finally:
        context.close()


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", metavar="ENTRY_ID", help="특정 엔트리만 캡처")
    parser.add_argument("--stale-only", action="store_true",
                        help="captured_commit이 현재 프론트엔드 커밋과 다른(또는 미캡처) 엔트리만 캡처")
    parser.add_argument("--frontend-repo", type=pathlib.Path, default=DEFAULT_FRONTEND_REPO,
                        help="ProtectGO-ENT-FE 로컬 클론 경로")
    parser.add_argument("--kb-dir", type=pathlib.Path, default=KB_DIR)
    parser.add_argument("--state", type=pathlib.Path, default=STATE_PATH,
                        help="auth_login.py가 저장한 storage_state 경로")
    parser.add_argument("--headed", action="store_true", help="브라우저 창을 띄워 캡처 과정 확인")
    args = parser.parse_args()

    repo = args.frontend_repo
    if not (repo / ".git").exists():
        print(f"오류: {repo} 는 git 저장소가 아님 (PROTECTGO_FE_REPO 또는 --frontend-repo 확인)", file=sys.stderr)
        return 1
    compare_ref = resolve_compare_ref(repo)
    current_version = f"{repo.name}@{run_git(repo, 'rev-parse', compare_ref)}"

    targets = collect_capture_targets(args.kb_dir)
    if args.only:
        targets = [t for t in targets if t["id"] == args.only]
        if not targets:
            print(f"오류: screen_ref.capture가 정의된 엔트리 중 id={args.only} 를 찾지 못함", file=sys.stderr)
            return 1

    manifest = load_manifest()

    if args.stale_only:
        kept = []
        for t in targets:
            stale, reason = is_stale(t["id"], manifest, current_version)
            print(f"- {t['id']}: {reason}" + ("" if stale else " — skip"))
            if stale:
                kept.append(t)
        targets = kept
        print()

    if not targets:
        print("캡처 대상 없음.")
        return 0

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("오류: playwright 미설치 — pip install -r requirements.txt 후 playwright install chromium 실행", file=sys.stderr)
        return 1

    print(f"캡처 기준 커밋: {current_version}")
    print(f"대상 엔트리: {len(targets)}개\n")

    captured = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        for target in targets:
            record = capture_one(browser, target, current_version, args.state)
            if record is None:
                continue
            manifest[target["id"]] = record
            save_manifest(manifest)
            if patch_captured_commit(target["path"], current_version):
                print(f"  · provenance.screen_ref.captured_commit 갱신: {target['path'].relative_to(REPO_ROOT)}")
            else:
                print(f"  · 경고: provenance.screen_ref 블록을 찾지 못해 captured_commit 미기록 — {target['path']}")
            captured += 1
        browser.close()

    print(f"\n완료: {captured}/{len(targets)}개 캡처. manifest: {MANIFEST_PATH.relative_to(REPO_ROOT)}")
    print("가이드 반영은 별도로 python guide/build.py 를 실행하세요 (이 스크립트는 빌드를 호출하지 않음).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
