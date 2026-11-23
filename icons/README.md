# 아이콘

| 폴더 | 내용 | 라이선스 |
|---|---|---|
| `custom/` | 이 프로젝트용으로 만든 아이콘 44개. 64x64, 계층 배지(L1~L7)와 계층별 색 | MIT (`../LICENSE`) |
| `affinity/` | ecceman/affinity 에서 고른 33개 (수정 없음) | Unlicense (`affinity/LICENSE`) |

## custom 스타일 규칙

- `viewBox="0 0 64 64"`, 흰 바탕 둥근 사각형(rx 12), 테두리 2.5px 계층 색
- 선 위주(stroke 2.5, round), 옅은 채움만. 그라디언트·그림자·래스터 없음
- 오른쪽 아래 계층 배지. 단말(EP-)은 배지 없음
- 계층 색: L1 `#5D6D7E`, L2 `#117A65`, L3 `#1F618D`, L3-4 `#B03A2E`, L4 `#1E8449`, L5-6 `#AF601A`, L7 `#6C3483`, 단말 `#2C3E50`

아이콘을 추가하면 `scripts/build-icons.mjs` 의 TYPES 표에 type 을 등록하고 `npm run build` 를 실행합니다.
