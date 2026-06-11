"""로그인 세션 1회 저장 — 화면 캡처(capture_screens.py)용 storage_state 생성.

headed 브라우저를 띄우면 **사람이 직접** 아이디·비밀번호(필요 시 MFA까지)를 입력해
로그인한다. 로그인·프로젝트 선택까지 마친 뒤 이 콘솔에서 엔터를 누르면 현재 브라우저
컨텍스트의 storage_state(쿠키·로컬 스토리지)가 agent/.auth/state.json 에 저장된다.

자격증명은 이 스크립트에 하드코딩하지 않으며 자동 입력도 하지 않는다.
agent/.auth/ 는 .gitignore 대상 — 세션 파일을 절대 커밋하지 말 것.

이 스크립트는 캡처·빌드와 완전히 분리된 독립 실행 도구다. 어느 쪽도 자동 호출하지 않는다.

사용:
  pip install -r requirements.txt
  playwright install chromium

  # 로그인 시작 URL은 인자 또는 환경변수로 전달 (코드에 박지 않는다)
  python auth_login.py --url https://<도메인>/login
  # 또는
  set PG_LOGIN_URL=https://<도메인>/login
  python auth_login.py
"""
from __future__ import annotations

import argparse
import os
import pathlib
import sys

AGENT_DIR = pathlib.Path(__file__).resolve().parents[1]  # agent/
DEFAULT_STATE_PATH = AGENT_DIR / ".auth" / "state.json"


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default=os.environ.get("PG_LOGIN_URL", ""),
                        help="로그인 시작 URL (기본값: 환경변수 PG_LOGIN_URL)")
    parser.add_argument("--state", type=pathlib.Path, default=DEFAULT_STATE_PATH,
                        help=f"storage_state 저장 경로 (기본값: {DEFAULT_STATE_PATH})")
    args = parser.parse_args()

    if not args.url:
        print("오류: 로그인 시작 URL이 없음 — --url 인자 또는 PG_LOGIN_URL 환경변수로 전달하세요.", file=sys.stderr)
        return 1

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("오류: playwright 미설치 — pip install -r requirements.txt 후 playwright install chromium 실행", file=sys.stderr)
        return 1

    args.state.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        page.goto(args.url)

        print("브라우저에서 직접 로그인하세요 (MFA가 있으면 MFA까지 완료).")
        print("로그인 후 프로젝트 선택까지 마친 상태에서, 이 콘솔로 돌아와 엔터를 누르면 세션이 저장됩니다.")
        try:
            input("저장하려면 엔터 > ")
        except (KeyboardInterrupt, EOFError):
            print("\n취소됨 — 세션을 저장하지 않음.")
            browser.close()
            return 1

        context.storage_state(path=str(args.state))
        browser.close()

    print(f"세션 저장 완료: {args.state}")
    print("이 파일은 .gitignore 대상입니다. 세션이 만료되면 이 스크립트를 다시 실행하세요.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
