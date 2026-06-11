"""screen_ref 변경 영향 점검 — F5 "소스 변경 영향 수동 점검" 보조 도구.

KB 엔트리(`kb/**/*.md`)의 `provenance.screen_ref`에 기록된 프론트엔드 저장소
커밋(`<저장소명>@<sha>`)을 현재 상태와 비교해, `screen_ref.ref`가 가리키는 파일이
그 사이 변경되었는지 보여준다.

이 스크립트는 자동으로 KB를 갱신하지 않는다. agent/flow.md·interfaces.md의
4단계 자동 업데이트 에이전트(classify -> locate -> compose -> publish)와는
별개의, 사람이 "이 엔트리를 다시 봐야 하는가?"를 빠르게 판단하기 위한 점검 도구다
(07-features.md F5).

사용:
  # 로컬에 이미 받아둔 ProtectGO-ENT-FE 기준으로 점검
  python check_screen_ref.py

  # GitHub에서 최신 커밋을 받아온 뒤(origin/<현재 브랜치> 갱신) 점검 — "버튼 트리거"에 해당
  python check_screen_ref.py --fetch

  # JSON으로 출력 (다른 도구·화면에서 참조하기 위한 구조화 출력)
  python check_screen_ref.py --format json

환경 변수:
  PROTECTGO_FE_REPO  ProtectGO-ENT-FE 로컬 클론 경로 (기본값: C:\\Users\\idb\\AI-DLC\\ProtectGO-ENT-FE)
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import subprocess
import sys

import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]  # protect-go-guide/
KB_DIR = REPO_ROOT / "kb"
DEFAULT_FRONTEND_REPO = pathlib.Path(
    os.environ.get("PROTECTGO_FE_REPO", r"C:\Users\idb\AI-DLC\ProtectGO-ENT-FE")
)
# 화면 캡처 manifest (capture_screens.py 산출물) — 캡처 최신 여부 판정 기준
CAPTURE_MANIFEST_PATH = REPO_ROOT / "guide" / "assets" / "screens" / "manifest.json"


def load_entries(kb_dir: pathlib.Path) -> list[dict]:
    """kb/**/*.md 중 KB 엔트리 프런트매터(`id` 필드 포함)를 가진 파일만 파싱한다."""
    entries = []
    for path in sorted(kb_dir.rglob("*.md")):
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


def parse_screen_ref_provenance(frontmatter: dict) -> tuple[list[str], str] | None:
    """provenance.screen_ref에서 (참조 파일 목록, 'repo@sha' 버전 문자열)을 뽑는다.

    ref·version이 비어 있으면(스키마 예시 placeholder) None을 반환해 점검 대상에서 제외한다.
    """
    provenance = frontmatter.get("provenance") or {}
    screen_ref = provenance.get("screen_ref")
    if not isinstance(screen_ref, dict):
        return None

    version = screen_ref.get("version") or ""
    if "@" not in version:
        return None

    ref = screen_ref.get("ref") or []
    if isinstance(ref, str):
        ref = [ref] if ref else []
    if not ref:
        return None

    return ref, version


def run_git(repo: pathlib.Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"git {' '.join(args)} 실패")
    return result.stdout.strip()


def resolve_compare_ref(repo: pathlib.Path) -> str:
    """비교 기준 ref. upstream 추적 브랜치가 있으면 그것, 없으면 HEAD."""
    try:
        return run_git(repo, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}")
    except RuntimeError:
        return "HEAD"


def check_entry(repo: pathlib.Path, repo_name: str, ref_paths: list[str], version: str, compare_ref: str) -> dict:
    recorded_repo, _, recorded_sha = version.partition("@")

    if recorded_repo != repo_name:
        return {
            "status": "repo_mismatch",
            "detail": f"version의 저장소명({recorded_repo})이 점검 대상 저장소({repo_name})와 다름",
        }

    try:
        recorded_full = run_git(repo, "rev-parse", recorded_sha)
    except RuntimeError:
        return {
            "status": "sha_not_found",
            "detail": f"커밋 {recorded_sha}을(를) 로컬 저장소에서 찾을 수 없음 (--fetch로 최신화 필요할 수 있음)",
        }

    current_full = run_git(repo, "rev-parse", compare_ref)

    if recorded_full == current_full:
        return {"status": "up_to_date", "current_ref": current_full, "changed_files": []}

    diff_output = run_git(repo, "diff", "--name-only", recorded_full, current_full, "--", *ref_paths)
    changed_files = [line for line in diff_output.splitlines() if line]

    if changed_files:
        return {"status": "review_needed", "current_ref": current_full, "changed_files": changed_files}

    return {"status": "no_relevant_change", "current_ref": current_full, "changed_files": []}


STATUS_LABEL = {
    "up_to_date": "최신 (기록된 커밋 = 현재 커밋)",
    "no_relevant_change": "변경 없음 (참조 파일 기준 — 저장소는 갱신됨)",
    "review_needed": "검토 필요 — screen_ref 참조 파일 변경됨",
    "sha_not_found": "확인 불가 — 기록된 커밋을 로컬에서 찾을 수 없음",
    "repo_mismatch": "확인 불가 — 저장소명 불일치",
}

# 화면 캡처(PNG) 최신 여부 — 코드 참조 최신 여부(status)와 별개 신호.
# 판정 기준은 capture_screens.py와 공유: manifest.captured_commit vs 현재 비교 기준 커밋.
CAPTURE_STATUS_LABEL = {
    "capture_up_to_date": "캡처 최신 (captured_commit = 현재 커밋)",
    "capture_stale": "캡처 갱신 필요 — capture_screens.py --only <id> 또는 --stale-only 실행",
    "not_captured": "미캡처 — capture_screens.py --only <id> 실행 필요",
}


def load_capture_manifest() -> dict:
    if CAPTURE_MANIFEST_PATH.exists():
        try:
            return json.loads(CAPTURE_MANIFEST_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {}


def check_capture(entry_id: str, frontmatter: dict, manifest: dict, current_version: str) -> dict | None:
    """screen_ref 구조형(capture 블록 보유) 엔트리의 캡처 최신 여부. 대상이 아니면 None."""
    screen_ref = frontmatter.get("screen_ref")
    if not (isinstance(screen_ref, dict) and isinstance(screen_ref.get("capture"), dict)):
        return None
    record = manifest.get(entry_id)
    if not record:
        return {"capture_status": "not_captured", "captured_commit": ""}
    captured = record.get("captured_commit", "")
    status = "capture_up_to_date" if captured == current_version else "capture_stale"
    return {"capture_status": status, "captured_commit": captured,
            "captured_at": record.get("captured_at", "")}


def main() -> int:
    # Windows 콘솔 기본 코드페이지(cp949 등)에서도 한글이 깨지지 않도록 강제
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--frontend-repo", type=pathlib.Path, default=DEFAULT_FRONTEND_REPO,
                         help="ProtectGO-ENT-FE 로컬 클론 경로")
    parser.add_argument("--kb-dir", type=pathlib.Path, default=KB_DIR, help="KB 엔트리 디렉터리")
    parser.add_argument("--fetch", action="store_true",
                         help="점검 전 'git fetch origin'으로 GitHub 원격의 최신 커밋을 받아온다 (작업 트리는 변경하지 않음)")
    parser.add_argument("--pull", action="store_true",
                         help="점검 전 로컬 클론을 원격 최신으로 갱신 (fetch + fast-forward만, "
                              "커밋되지 않은 변경이 있으면 중단) — 배포 버전 업데이트용 소스 데이터 받기")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    args = parser.parse_args()

    repo = args.frontend_repo
    if not (repo / ".git").exists():
        print(f"오류: {repo} 는 git 저장소가 아님 (PROTECTGO_FE_REPO 또는 --frontend-repo 확인)", file=sys.stderr)
        return 1
    repo_name = repo.name

    if args.pull:
        # 로컬 클론을 원격 최신으로 갱신 — fast-forward만 허용해 로컬 커밋·작업 내용을 보호한다
        dirty = run_git(repo, "status", "--porcelain")
        if dirty:
            print(f"오류: {repo} 에 커밋되지 않은 변경이 있어 --pull을 중단함. "
                  "변경을 정리한 뒤 다시 실행하세요.", file=sys.stderr)
            return 1
        run_git(repo, "fetch", "origin")
        before = run_git(repo, "rev-parse", "HEAD")
        try:
            run_git(repo, "merge", "--ff-only", "@{upstream}")
        except RuntimeError as exc:
            print(f"오류: fast-forward 갱신 실패 — {exc}\n"
                  "로컬 브랜치가 원격과 갈라져 있음. 클론에서 직접 정리 후 다시 실행하세요.", file=sys.stderr)
            return 1
        after = run_git(repo, "rev-parse", "HEAD")
        if before == after:
            print(f"--pull: 이미 최신 ({repo.name}@{after[:12]})\n")
        else:
            print(f"--pull: {repo.name} 갱신 {before[:12]} -> {after[:12]}\n")
    elif args.fetch:
        run_git(repo, "fetch", "origin")

    compare_ref = resolve_compare_ref(repo)
    current_version = f"{repo_name}@{run_git(repo, 'rev-parse', compare_ref)}"
    capture_manifest = load_capture_manifest()

    results = []
    for entry in load_entries(args.kb_dir):
        frontmatter = entry["frontmatter"]
        parsed = parse_screen_ref_provenance(frontmatter)
        rel_path = entry["path"].relative_to(REPO_ROOT)
        if parsed is None:
            continue
        ref_paths, version = parsed
        check = check_entry(repo, repo_name, ref_paths, version, compare_ref)
        capture = check_capture(frontmatter.get("id"), frontmatter, capture_manifest, current_version)
        results.append({
            "id": frontmatter.get("id"),
            "title": frontmatter.get("title"),
            "kb_path": str(rel_path).replace("\\", "/"),
            "recorded_version": version,
            "screen_ref": ref_paths,
            **check,
            **(capture or {}),
        })

    if args.format == "json":
        print(json.dumps({"compare_ref": compare_ref, "entries": results}, ensure_ascii=False, indent=2))
        return 0

    print(f"비교 기준: {repo_name} @ {compare_ref}")
    print(f"점검 대상 엔트리: {len(results)}개\n")
    for r in results:
        print(f"- {r['id']} ({r['kb_path']})")
        print(f"  기록된 버전 : {r['recorded_version']}")
        print(f"  상태        : {STATUS_LABEL.get(r['status'], r['status'])}")
        if r.get("capture_status"):
            print(f"  캡처 상태   : {CAPTURE_STATUS_LABEL.get(r['capture_status'], r['capture_status'])}")
            if r.get("captured_commit"):
                print(f"  캡처 버전   : {r['captured_commit']} ({r.get('captured_at', '')})")
        if r.get("detail"):
            print(f"  비고        : {r['detail']}")
        if r.get("changed_files"):
            print("  변경된 참조 파일:")
            for f in r["changed_files"]:
                print(f"    - {f}")
        print()

    review_needed = [r for r in results if r["status"] == "review_needed"]
    if review_needed:
        print(f"검토 필요 엔트리 {len(review_needed)}개: " + ", ".join(r["id"] for r in review_needed))
    capture_stale = [r for r in results if r.get("capture_status") in ("capture_stale", "not_captured")]
    if capture_stale:
        print(f"캡처 갱신 필요 엔트리 {len(capture_stale)}개: " + ", ".join(r["id"] for r in capture_stale))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
