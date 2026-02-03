---
date: 2026-01-30
tags: [#shadow-english, #mvp, #youtube, #shadowing, #srs, #nlp]
project: shadow-english
---

## 해결 문제 (Context)
- 유튜브 영상 자막 기반 영어 섀도잉 + 문맥 단어장 + SRS 복습 웹 에이전트 MVP 구축 (LLM 미사용)

## 기술 스택 결정
| 구성요소 | 선택 | 이유 |
|---------|------|------|
| 백엔드 | Express.js | topdown-learner 패턴 재사용 |
| 자막 추출 | yt-dlp (CLI) | 자동자막 + 수동자막 지원 |
| 영상 재생 | YouTube IFrame API | 구간 반복 + 속도 조절 |
| 단어 분석 | compromise.js | 토큰화 + POS 태깅 + lemma |
| 난이도 | CEFR 정적 JSON (2063 단어) | LLM 없이 빈도 기반 분류 |
| 사전 | Free Dictionary API | 무료 + phonetic + audio |
| SRS | SM-2 직접 구현 | 외부 의존성 제거 |
| 인증 | PIN 기반 | topdown-learner 패턴 |
| 저장 | JSON 파일 + 인메모리 캐시 | MVP 단순성 |

## 구현 완료 항목 (23 Step)
- **백엔드:** server.js (Express + PIN + 11 API 엔드포인트)
- **서비스:** subtitle-extractor, subtitle-parser, vocab-analyzer, dictionary, srs-engine, data-store
- **프론트엔드:** index.html, style.css, app.js, shadowing.js, wordbook.js, review.js (SPA 3탭)
- **데이터:** CEFR 단어 리스트 빌드 스크립트 + JSON (2063 단어)
- **보안:** self-healing-agent config.js에 등록 완료

## API 엔드포인트
| Method | Path | 기능 |
|--------|------|------|
| POST | /api/auth | PIN 검증 |
| POST | /api/video/load | 영상 URL → 자막 추출 |
| GET | /api/video/:id | 캐시된 자막 조회 |
| POST | /api/video/:id/vocab | 어휘 분석 |
| GET | /api/dictionary/:word | 사전 조회 |
| GET/POST/DELETE | /api/wordbook/* | 단어장 CRUD |
| GET/POST | /api/review/* | SRS 복습 |
| GET | /api/health | yt-dlp 상태 체크 |

## 통합 테스트 결과
| 항목 | 상태 |
|------|------|
| 서버 기동 (port 3004) | OK |
| PIN 인증 성공/실패 | OK |
| 영상 자막 추출 (Rick Astley, 23개 구간) | OK |
| 캐시 조회 | OK |
| 어휘 분석 (41 단어, CEFR 분류) | OK |
| 단어장 추가/중복/삭제 | OK |
| SRS 카드 자동 생성 + 복습 응답 | OK |
| Dictionary API (phonetic + audio + definition) | OK |
| 프론트엔드 HTML 서빙 | OK |

## 핵심 통찰 (Learning & Decision)
- **Problem 1:** `dotenv` 미설치로 서버 시작 실패 → `try/catch`로 optional 처리
- **Problem 2:** `pip` 미설치로 yt-dlp 설치 불가 → GitHub releases에서 바이너리 직접 다운로드 (`~/.local/bin/yt-dlp`)
- **Problem 3:** 구간 반복 버튼이 0~1초에서 맴돔 → 현재 재생 시간 기준 구간 탐색 + `seg.start` 이전 벗어남 방지 로직 추가 + JS 캐시 버스팅 적용. **아직 미해결 — 추가 디버깅 필요**
- **Decision:** Render 배포 (yt-dlp 시스템 바이너리 필요 → Vercel 불가)

## Next Step
| 우선순위 | 항목 |
|---------|------|
| **P0** | 구간 반복 버그 수정 (브라우저 디버깅 필요) |
| P1 | self-healing-agent hook 설치 (`npm run install-hooks`) |
| P1 | Git 초기 커밋 + GitHub private repo push |
| P2 | CLAUDE.md 프로젝트 목록 업데이트 |
| P2 | Render 배포 (build command에 yt-dlp 설치) |
| P3 | 브라우저 전체 UI 수동 테스트 |
