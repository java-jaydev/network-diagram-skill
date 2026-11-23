# AGENTS.md - network-diagram-skill

네트워크를 말로 설명하면 YAML 명세 → 아이콘 구성도(SVG/PNG)를 만드는 공개 스킬. 여러 AI(Claude, ChatGPT, Gemini, Grok, Codex)에서 쓴다.

## 구조

| 경로 | 역할 | 직접 수정 |
|---|---|---|
| `renderer/core.mjs` | 명세 검증 + ELK 배치 + SVG 생성 (브라우저·Node 공용) | O |
| `renderer/cli.mjs` | CLI | O |
| `renderer/vendor/` | elkjs·js-yaml 원본 그대로 (설치 없이 실행용) | X |
| `renderer/icons.mjs` | `scripts/build-icons.mjs` 가 생성 | X |
| `icons/custom/`, `icons/affinity/` | 아이콘 원본 | O |
| `skills/network-diagram/SKILL.md`, `references/` | AI 지침 원본 | O |
| `skills/network-diagram/scripts/`, `docs/lib/`, `docs/examples/` | `npm run build` 복사본 | X |
| `platforms/web-chat-instructions.md` | ChatGPT·Gemini·Grok 웹 채팅 지침 (8,000자 이하 유지) | O |

## 작업 규칙

- 렌더러나 아이콘을 고치면 `npm run build && npm test`. 빌드 복사본까지 같이 커밋한다.
- type 을 추가하면 `scripts/build-icons.mjs` TYPES 와 `references/spec.md` type 표를 같이 고친다 (테스트가 확인함).
- `references/spec.md` 의 yaml 예시는 테스트가 실제로 렌더링한다.
- 예제·문서에 특정 회사 이름이나 실제 사내 IP 를 넣지 않는다.
- 출력 문자에 em dash 를 쓰지 않는다.

## Git

| | |
|---|---|
| 원격 | `java-jaydev/network-diagram-skill` (public) |
| gh 계정 | `java-jaydev` |

원격 작업 전 `gh auth status` 로 활성 계정 확인. 다르면 `gh auth switch --user java-jaydev`.
GitHub Pages: `main` 브랜치 `/docs`.
