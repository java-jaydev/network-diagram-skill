# 구성도 명세 (YAML) 형식

렌더러는 이 YAML 하나로 그림 전체를 자동 배치한다. 좌표는 쓰지 않는다.

## 최상위 키

| 키 | 필수 | 설명 |
|---|---|---|
| `title` | 권장 | 그림 제목 |
| `subtitle` | 선택 | 제목 아래 한 줄 (예: "IP 대역은 가정값") |
| `icons` | 선택 | `custom`(기본, 계층 배지가 있는 아이콘) 또는 `affinity` |
| `direction` | 선택 | `down`(기본, 위=바깥 아래=안쪽) 또는 `right` |
| `nodes` | 선택 | 어떤 영역에도 속하지 않는 장비 (인터넷, 외부 시스템 등) |
| `zones` | 선택 | 영역(거점, 망, DMZ 등). 안에 `nodes` 와 하위 `zones` 를 넣는다 |
| `links` | 필수 | 연결선 목록 |
| `flows` | 권장 | 주요 통신 경로 표 (출발 → 목적, 포트, 허용/차단) |
| `notes` | 선택 | 하단 참고 문구 목록 (가정, 확인할 것) |
| `legend` | 선택 | 표시 이름 바꾸기. 예: `{ new: 2차년도 신규, assume: 확인 필요 }` |

## node (장비)

```yaml
- { id: fw1, type: utm, label: Firewall (UTM), sub: VPN 내장, mark: new }
```

| 키 | 설명 |
|---|---|
| `id` | 영문 소문자·숫자·하이픈. 전체에서 유일 |
| `type` | 아래 type 표 중 하나 (아이콘이 결정됨) |
| `label` | 아이콘 아래 굵은 이름 |
| `sub` | 아래 작은 글씨. 문자열 또는 목록 `[영상 분석, WMS]` |
| `mark` | `new`(빨간 점선: 신규 도입), `add`(주황: 추가 제안), `assume`(주황: 추정·가정) |

## zone (영역)

```yaml
- id: hq-dmz
  label: DMZ
  kind: dmz
  cidr: 10.20.100.0/24
  vlan: 100
  note: 방화벽 DMZ 존
  nodes: [...]
  zones: [...]
```

`kind` 는 색을 정한다: `site`(거점), `internal`(내부 서버망), `dmz`(점선 테두리), `wireless`, `control`(관제), `cctv`, `cloud`, `external`. 그 외 색은 `color: "#RRGGBB"`.

## link (연결선)

짧은 형식 `[from, to]` 또는 `[from, to, style]`, 긴 형식 `{ from, to, style, label }`.

| style | 의미 |
|---|---|
| `wire` (기본) | 유선 이더넷 |
| `wifi` | 무선 (파란 점선) |
| `fiber` | 광케이블 |
| `vpn` | VPN 터널 (보라 굵은 점선). 배치 계산에 쓰지 않고 두 장비를 바로 잇는다 |
| `logical` | 논리 연결 (회색 점선) |

규칙:
- `from`, `to` 는 반드시 **장비 id**. 영역 id 를 쓰면 오류.
- 방향은 **바깥 → 안쪽** 으로 쓴다 (`[internet, fw1]`, `[fw1, core1]`). 배치가 위→아래로 정렬된다.
- 물리 연결만 `wire`/`wifi`/`fiber` 로 그린다. 데이터 흐름은 `flows` 표에 쓴다.

## flow (통신 경로 표)

```yaml
flows:
  - { name: 사용자 → DMZ WEB, from: any, to: 10.20.100.10, port: HTTPS 443, note: 공인 IP NAT }
  - { name: DMZ → DB 직접, from: 10.20.100.0/24, to: 10.20.10.50, deny: true, note: 차단 }
```

`deny: true` 면 빨간 글씨 "차단".

## type 표

| type | 계층 | 장비 |
|---|---|---|
| internet | 외부 | 인터넷 / 공인망 |
| external | 외부 | 외부 연계 시스템 (다른 회사, 기관) |
| site-hq | 외부 | 거점: 본사 건물 |
| warehouse | 외부 | 거점: 물류센터, 공장 |
| modem | L1 | 모뎀 / 통신사 회선 종단 |
| hub | L1 | 허브 / 리피터 |
| media-converter | L1 | 광 미디어 컨버터 |
| patch-panel | L1 | 패치 패널 |
| cable | L1 | 케이블 |
| switch | L2 | L2 스위치 |
| poe-switch | L2 | PoE 스위치 |
| ap | L2 | 무선 AP |
| wlc | L2 | 무선 컨트롤러 |
| router | L3 | 라우터 |
| l3-switch | L3 | L3 스위치 / 코어 스위치 |
| vpn-gateway | L3 | VPN 장비 |
| firewall | L3-4 | 방화벽 |
| utm | L3-4 | UTM (방화벽 + VPN 등) |
| ids-ips | L3-7 | IDS / IPS |
| load-balancer | L4 | L4 로드밸런서 |
| nat | L4 | NAT 장비 |
| tls | L5-6 | TLS 종단 |
| ssl-vpn | L5-6 | SSL VPN |
| proxy | L7 | 리버스 프록시 (nginx 등) |
| forward-proxy | L7 | 포워드 프록시 |
| dns | L7 | DNS 서버 |
| waf | L7 | 웹 방화벽 |
| l7-load-balancer | L7 | L7 로드밸런서 |
| api-gateway | L7 | API 게이트웨이 |
| web | L7 | 웹 서버 |
| was | L7 | WAS |
| mqtt-broker | L7 | MQTT / IoT 브로커 |
| server | 단말 | 서버 (일반) |
| db | 단말 | 데이터베이스 |
| nas | 단말 | NAS / 스토리지 |
| pc | 단말 | PC |
| laptop | 단말 | 노트북 |
| ip-wall | 단말 | 관제 모니터 벽 |
| nvr | 단말 | NVR (CCTV 녹화기) |
| cctv | 단말 | CCTV 카메라 |
| iot-sensor | 단말 | IoT 센서 |
| wearable-sensor | 단말 | 착용형 센서 |
| kiosk | 단말 | 키오스크 |
| user | 단말 | 사용자 |
| phone | 단말 | IP 전화기 |

목록에 없는 장비는 가장 가까운 type 을 고르고 `label` 로 이름을 정확히 적는다.

## 최소 예시

```yaml
title: 작은 사무실
nodes:
  - { id: internet, type: internet, label: Internet }
zones:
  - id: office
    label: 사무실
    kind: site
    cidr: 192.168.0.0/24
    nodes:
      - { id: fw, type: firewall, label: 공유기 겸 방화벽 }
      - { id: sw, type: switch, label: 스위치 }
      - { id: ap, type: ap, label: WIFI }
      - { id: pc, type: pc, label: 업무 PC }
      - { id: nas, type: nas, label: NAS }
      - { id: phone, type: laptop, label: 노트북 }
links:
  - [internet, fw]
  - [fw, sw]
  - [sw, pc]
  - [sw, nas]
  - [sw, ap]
  - [ap, phone, wifi]
```
