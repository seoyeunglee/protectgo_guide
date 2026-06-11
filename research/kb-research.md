# 사전조사 — KB 구축·운영 방식 (실리콘밸리·빅테크) → 설계 원칙

> 1단계 산출물. RAG, doc-as-code, 지식 그래프, 에이전트용 KB, 청킹·메타데이터·버저닝·출처 추적 사례를 조사해 우리 KB(`schema/kb-entry.md`, `kb/`, `agent/`) 설계에 반영할 원칙으로 정리했다.
> 조사 방법: 웹 검색(2026-06 기준 최신 자료) — 출처는 문서 하단 참조.

## 설계 원칙 (8개)

### 1. doc-as-code — KB를 코드처럼: git, 마크다운, 단일 출처
문서를 git 저장소의 마크다운으로 관리하고 PR·리뷰를 거쳐 코드와 같은 흐름으로 버전 관리한다(GitOps 방식). 가이드 웹페이지는 KB의 **파생 렌더링 결과**일 뿐, 별도의 출처가 아니다.
→ **반영**: `kb/`가 단일 출처(source of truth), `guide/`는 그 렌더 결과(`guide/dist/`는 `.gitignore` 대상). 모든 변경은 이 저장소에서 git으로 추적된다.

### 2. 검색·갱신의 최소 단위로 청킹 — "엔트리 = 의미 단위"
실험상 고정 길이 분할보다 **주제·논리 경계에 맞춘 청킹**이 정확도가 크게 높았고(적응형 청킹 87% vs 고정분할 13%), 헤더 경로(header path)를 메타데이터에 포함하는 것이 ROI가 가장 높은 개선 중 하나였다.
→ **반영**: KB 엔트리 1개 = 파일 1개(`kb/<category>/<diataxis_type>/<id>.md`), `id`에 카테고리·슬러그 경로를 담아 헤더 경로 역할을 하게 한다. 엔트리가 곧 검색·갱신·렌더링의 최소 단위다.

### 3. 메타데이터를 콘텐츠와 동급의 1급 데이터로 다룬다
LLM 기반 메타데이터 보강(태그·요약·구조 정보를 콘텐츠와 함께 인코딩)이 검색 품질을 크게 끌어올린다는 것이 최신 벤치마크의 공통된 결론이다.
→ **반영**: YAML 프런트매터로 `category`, `diataxis_type`, `language`, `updated_at` 등을 구조화해 콘텐츠와 함께 저장 — 라우팅·필터링·향후 검색 강화의 기반이 된다.

### 4. 필드 단위(컬럼 수준) 출처 추적(provenance)
"규제 조항과 슬랙 메시지는 출처가 다르면 신뢰도도 다르다" — 프로덕션 RAG 아키텍처는 문서 단위가 아니라 **필드/컬럼 수준 lineage**로 출처를 추적해 사람이 각 주장을 검증할 수 있게 한다.
→ **반영**: `provenance`를 엔트리 전체가 아니라 **필드별**로 기록한다(`policy ← 화면설계서`, `screen_ref ← frontend_code` 등). 이것이 우리 스키마 고도화의 핵심이다.

### 5. 소스별 권위 분담으로 드리프트를 구조적으로 차단
여러 소스를 합칠 때 "어떤 소스가 어떤 필드의 권위자인가"를 명확히 분리하면 중복 작성과 문서-제품 불일치(드리프트)가 줄어든다 — 자주 바뀌는 정보는 가장 빨리 갱신되는 소스(코드)에서, 잘 변하지 않는 정보는 문서에서 가져온다.
→ **반영**: `screen_ref`(자주 바뀜) ← 프론트엔드 코드, `policy`(상대적으로 안정적) ← 화면설계서 정책 추출. 화면이 바뀌면 가이드가 코드를 따라 자연히 갱신된다.

### 6. 생성(인덱싱) 파이프라인과 서빙(렌더링)의 분리
신뢰할 수 있는 프로덕션 패턴은 콘텐츠를 준비하는 **오프라인 인덱싱/생성 워크플로**와 질의에 응답하는 **온라인 서빙 워크플로**를 분리한다. 한쪽의 변경이 다른 쪽에 즉시 영향을 주지 않게 한다.
→ **반영**: `kb/`(구조화·생성)와 `guide/`(빌드·렌더링)를 별도 폴더·책임으로 분리. KB가 바뀌어도 가이드는 빌드 시점에만 반영되고, 가이드 빌드 방식이 바뀌어도 KB 구조엔 영향이 없다.

### 7. 증분 업데이트 — 전체 재생성이 아니라 변경분만
"임베딩 모델이 바뀌거나, 청킹 산출물이 실질적으로 바뀌거나, 정규화 규칙이 텍스트를 바꿀 때만 재생성한다"는 원칙처럼, 변경된 부분만 다시 만드는 것이 비용과 드리프트를 동시에 줄인다.
→ **반영**: `provenance`에 필드별 `version`을 기록해, 특정 소스(예: 화면설계서 v1.1)가 갱신되면 영향받는 **그 필드만** 재생성하도록 설계한다(`agent/flow.md` ③ 구조화/생성 단계의 핵심 전제).

### 8. 에이전트를 KB의 1급 소비자로 — 사람용 문서와 같은 계약(contract) 공유
"LLM 위키" 패턴은 AI 에이전트가 위키를 1차 메모리로 쓸 수 있도록 구조화된 마크다운 + 명확한 인터페이스(API/MCP)로 노출할 것을 권한다. 이때 사람이 읽는 문서와 에이전트가 참조하는 인터페이스가 **같은 소스에서 파생**되는 것이 핵심이다.
→ **반영**: `schema/kb-entry.md`를 가이드(사람용)·KB(저장)·에이전트(`agent/interfaces.md`)가 공유하는 **단일 인터페이스 계약**으로 둔다. contract-first로 스키마를 먼저 고정하고, 에이전트 구현은 후속에서 같은 계약 위에 붙인다.

## 콘텐츠 모델 — Diátaxis 채택 근거
Diátaxis(튜토리얼·하우투·레퍼런스·설명)는 조직 구조나 코드베이스가 아니라 **사용자의 필요(학습/작업/조회/이해)** 를 기준으로 문서를 나누는 프레임워크로, Cloudflare·Gatsby 등이 채택해 정보 구조 개편에 효과를 본 사례가 보고된다. 우리 KB는 이를 도메인과 교차해(Diátaxis × 도메인) 카테고리를 구성한다(`kb/<domain>/{tutorial,how-to,reference,explanation}/`).

## 출처
- [The Complete Guide to Document Chunking for RAG](https://kaustavmukherjee-66179.medium.com/the-complete-guide-to-document-chunking-for-rag-ac312e6d635f)
- [Best Chunking Strategies for RAG (and LLMs) in 2026 — Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
- [A Systematic Framework for Enterprise Knowledge Retrieval: Leveraging LLM-Generated Metadata to Enhance RAG Systems (arXiv)](https://arxiv.org/pdf/2512.05411)
- [Engineering the RAG Stack: Architecture and Trust Frameworks for RAG Systems (arXiv)](https://arxiv.org/pdf/2601.05264)
- [Best Practices for Implementing RAG Systems in Production — Unstructured](https://unstructured.io/insights/rag-systems-best-practices-unstructured-data-pipeline)
- [Enterprise Knowledge Base for AI: Architecture Guide — Scality](https://www.solved.scality.com/enterprise-knowledge-base-for-ai-architecture/)
- [LLM Wikis: A Better Knowledge Base for AI Agents — Anovate.ai](https://anovate.ai/blog/LLM-Wikis-A-Better-Knowledge-Base-for-AI-Agents)
- [LLM Knowledge Base vs RAG — Atlan](https://atlan.com/know/llm-knowledge-base-vs-rag/)
- [Building an enterprise AI knowledge base with RAG and Agentic AI — Xenoss](https://xenoss.io/blog/enterprise-knowledge-base-llm-rag-architecture)
- [Docs-as-Code: Automating Documentation for User-Centric Experiences — BrainGu](https://www.braingu.com/news/docs-as-code)
- [Diátaxis 공식 사이트](https://diataxis.fr/)
- [We fixed our documentation with the Diátaxis framework — Sequin](https://blog.sequinstream.com/we-fixed-our-documentation-with-the-diataxis-framework/)
