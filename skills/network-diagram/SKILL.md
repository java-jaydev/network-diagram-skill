---
name: network-diagram
description: Turns a plain-language description of a network (sites, servers, cameras, sensors, Wi-Fi, firewalls, cloud) into a clean icon-based network diagram, and reviews existing diagrams for mistakes. Use when someone asks to draw, make, fix, check or explain a network diagram, topology, 네트워크 구성도, 망 구성도, 네트워크 그림, 구성도 그려줘, 구성도 검토, or shares a picture or slide of a network to redraw. Works for non-developers who do not know networking terms.
license: MIT
---

# Network Diagram

사용자가 말로 설명한 네트워크를 YAML 명세로 바꾸고, 렌더러로 아이콘 구성도(SVG/PNG)를 만든다. 사용자는 비개발자일 수 있다. 용어를 모른다고 가정하고 쉬운 말로 묻고 설명한다.

## 순서

1. **듣기**: `references/interview.md` 의 1차 질문 3개만 먼저 묻는다. 사용자가 기존 그림(이미지, PPT 캡처, 문서)을 주면 그것부터 읽고, 그림에 있는 장비·연결을 그대로 옮긴다.
2. **명세 쓰기**: `references/spec.md` 형식으로 YAML 을 쓴다. 좌표는 쓰지 않는다. type 은 표에 있는 값만 쓴다.
3. **점검**: `references/checklist.md` 를 처음부터 끝까지 대조한다. 기존 그림을 옮긴 경우, 발견한 문제는 **고친 명세**에 반영하고 무엇을 왜 고쳤는지 따로 목록으로 알려 준다. 사용자가 모르는 값(IP 대역, 포트, 장비 유무)은 일반적인 값으로 채우고 `mark: assume` 과 `notes` 로 가정임을 밝힌다.
4. **그리기**:
   - 코드 실행이 가능하면 (Claude Code, Codex, Gemini CLI 등):
     ```bash
     node <이 스킬 폴더>/scripts/cli.mjs diagram.yaml -o diagram.svg --png diagram.png
     ```
     Node 18 이상이면 설치 없이 동작한다. `--png` 는 Chrome/Chromium 이 있을 때만. 명세 오류가 나오면 메시지대로 고치고 다시 실행한다. 경고(연결선 없는 장비)는 의도한 것인지 확인한다.
   - 결과 이미지를 직접 볼 수 있으면 열어서 확인한다: 선이 겹쳐 읽기 어려운 곳, 잘린 글자, 너무 큰 그림. 크면 거점별로 나눠 다시 그린다.
   - 코드 실행이 안 되는 채팅이면: 완성한 YAML 을 코드 블록 하나로 주고, https://java-jaydev.github.io/network-diagram-skill/ 에 붙여 넣고 "그리기"를 누르라고 안내한다.
5. **설명**: 그림을 보여 주며 3~6줄로 설명한다. 경계(인터넷/방화벽/DMZ/내부) → 주요 흐름 하나(출발 → 목적, 거치는 장비) → 가정한 것 목록 → 사용자에게 확인할 것 순서. 비유보다 장비가 실제로 하는 일을 쓴다.

## 원칙

- 그림 하나에 질문 하나. 전체 지도 하나에 모든 걸 넣지 않는다. 장비가 40개를 넘으면 거점별 그림 + 거점 간 연결 그림으로 나눈다.
- 바깥(인터넷)이 위, 안쪽이 아래. links 는 바깥 → 안쪽 방향으로 쓴다.
- 선은 물리 연결만. "무엇이 어디로 가는지"는 `flows` 표에 쓴다.
- 사용자가 준 이름을 바꾸지 않는다. 고친 점과 가정은 숨기지 않고 말한다.
- 사용자 회사·개인 정보를 외부 서비스로 보내지 않는다. 웹 렌더러는 브라우저 안에서만 동작한다.
