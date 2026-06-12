# Protect Go 사용자 가이드 · KB

지식 베이스(KB)를 구조화하고, 그 위에서 Protect Go 최신 버전 사용자 가이드(웹페이지)를 만드는 프로젝트입니다.
**가이드를 만드는 작업 = KB 콘텐츠를 구조화하는 작업**입니다.

- 작업 규칙·폴더 구조 원칙: [CLAUDE.md](./CLAUDE.md)
- 전체 계획(v0.7): [계획_Protect_Go_가이드_에이전트.md](./계획_Protect_Go_가이드_에이전트.md)

## 폴더 구조

```
schema/kb-entry.md       KB 엔트리 스키마 (단일 기준 — 가이드·KB·에이전트 공유 인터페이스 계약)
research/                사전조사 산출물 (KB 설계 원칙 등)
kb/                      KB = 구조화 데이터 (단일 출처)
├─ _sources/policy/      화면설계서 PDF에서 추린 "정책 텍스트만" (작은 .md)
├─ project-creation/     도메인 1: 프로젝트 생성   (tutorial · how-to · reference · explanation)
└─ detection-node/       도메인 2: 탐지 시나리오·노드 (〃)
guide/                   kb/ 를 렌더한 웹페이지 (build 스크립트 + dist/)
agent/                   자동 업데이트 에이전트 — 스텁 (흐름 설계 + 인터페이스 계약, 구현 안 함)
extracted/               PDF 텍스트 추출 캐시 (.gitignore 대상, 재생성 가능)
```

## 콘텐츠 모델
Diátaxis(튜토리얼 · 하우투 · 레퍼런스 · 설명) × 도메인(프로젝트 생성 · 탐지 시나리오·노드).
2주 범위는 이 두 도메인만 깊게 다루고, 나머지 도메인은 같은 템플릿으로 "확장 가능함"만 시연합니다.

## 실행 방법 (퀵스타트)

```powershell
# 0. 준비 (최초 1회)
pip install -r guide/requirements.txt
pip install -r agent/scripts/requirements.txt
playwright install chromium

# 1. 가이드 빌드 → 로컬 확인
python guide/build.py
python -m http.server --directory guide/dist 8000   # http://localhost:8000

# 2. 소스 최신화 + 변경 점검 (배포 버전 업데이트 루틴)
python agent/scripts/check_screen_ref.py --pull       # FE 코드 pull + 코드/캡처 최신 여부
python agent/scripts/capture_screens.py --stale-only  # 코드 바뀐 화면만 재캡처
python agent/scripts/fetch_deployment_source.py fetch <source_id>  # 배포 프로토타입 변경 감지

# 3. 화면 캡처용 로그인 세션 (만료 시 재실행 — 사람이 직접 로그인)
python agent/scripts/auth_login.py --url https://protectgo.kr/login
```

자세한 사용법: [agent/scripts/README.md](./agent/scripts/README.md) · [guide/README.md](./guide/README.md) · 현재 상태는 [HANDOFF.md](./HANDOFF.md)

## 진행 상태
- [x] 0단계 — 스캐폴드
- [x] 1단계 — 사전조사 (`research/kb-research.md`)
- [x] 2단계 — 화면설계서 PDF 정책 추출 (`kb/_sources/policy/`)
- [x] 3단계 — PRD 플로우 → KB 콘텐츠 구조화 → 가이드 렌더링 (V1 — KB 11개 · 가이드 22페이지)
