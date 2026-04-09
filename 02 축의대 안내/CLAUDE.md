# 결혼식 축의금 관리 앱 — 프로젝트 명세

## 개요

결혼식 당일 신부측·신랑측 축의대 담당자가 각자 독립적으로 축의금을 입력하고,
관리자가 전체 현황을 통합 조회할 수 있는 단일 HTML 파일 웹앱.

---

## 계정 및 권한

| 계정 | 비밀번호 | 권한 |
|------|----------|------|
| `bride` | `bride1234` | 신부측 데이터만 입력·조회 |
| `groom` | `groom1234` | 신랑측 데이터만 입력·조회 |
| `admin` | `admin0000` | 전체 데이터 조회 전용 (입력 불가) |

- 각 담당자는 상대측 데이터에 접근 불가
- 로그아웃 시 모든 상태 초기화

---

## 손님 유형 (guest_type)

입력 시 반드시 선택해야 하는 필드. 로그인 역할에 따라 선택지가 달라짐.

**신부측 담당자 선택지:**
- 신부측
- 신부 아버님측
- 신부 어머님측

**신랑측 담당자 선택지:**
- 신랑측
- 신랑 아버님측
- 신랑 어머님측

---

## 입력 필드 (entry)

```ts
{
  id: string          // Date.now() + '_' + random(4자리)
  name: string        // 하객 이름 (필수)
  guest_type: string  // 손님 유형 (필수, 위 6가지 중 하나)
  relation: string    // 관계: 가족 | 친척 | 친구 | 직장 | 기타
  amount: number      // 축의금 (필수, 양수)
  memo: string        // 메모 (선택)
  ts: string          // 입력 시각 HH:MM
}
```

---

## 저장소 구조

`window.storage` API 사용 (persistent, 동시접속 안전).

```
storage.set('wedding_bride_entries', JSON.stringify(Entry[]), false)
storage.set('wedding_groom_entries', JSON.stringify(Entry[]), false)
```

### 동시접속 충돌 방지 패턴

저장 전 반드시 최신 배열을 먼저 fetch한 뒤 push:

```js
async function addEntry(role, newEntry) {
  const result = await storage.get(KEYS[role]);
  const entries = result ? JSON.parse(result.value) : [];
  entries.push(newEntry);
  await storage.set(KEYS[role], JSON.stringify(entries));
}
```

---

## 화면 구성

### 1. 로그인 화면 (`login`)

- role 셀렉트 (신부측 담당자 / 신랑측 담당자 / 관리자)
- 비밀번호 입력 + Enter 키 제출
- 오류 메시지 인라인 표시
- 로그인 성공 시 → role에 따라 input 또는 admin 화면으로 전환

---

### 2. 입력 화면 (`input`) — 신부/신랑 담당자 전용

**헤더:**
- 역할명 표시 (신부측 / 신랑측 배지)
- 로그아웃 버튼

**입력 폼:**
- 손님 유형 셀렉트 (role에 따라 3가지 표시)
- 하객 이름 (text)
- 관계 셀렉트 (가족/친척/친구/직장/기타)
- 축의금 (number) + 빠른 입력 버튼: 3만 / 5만 / 7만 / 10만 / 20만
- 메모 (text, optional)
- 입력 버튼 → 성공 시 배너 표시 후 2.5초 자동 소멸

**입력 내역 목록:**
- 손님 유형 탭 필터: `전체 | 신부측 | 신부 아버님측 | 신부 어머님측` (또는 신랑측 3개)
- 각 행: [손님유형 배지] 이름 관계 · 메모 / 금액 / 삭제 버튼
- 전체 합계 상단 표시
- 최신 입력순(역순) 정렬

---

### 3. 관리자 대시보드 (`admin`) — 관리자 전용

**통계 카드 (3개):**
- 신부측 합계
- 신랑측 합계
- 전체 합계

**탭 필터 (7개):**
`전체 | 신부측 | 신부 아버님측 | 신부 어머님측 | 신랑측 | 신랑 아버님측 | 신랑 어머님측`

**목록:**
- 탭 필터 기준 인원 수 + 소계 표시
- 금액 내림차순 정렬
- 각 행: [신부/신랑 배지] [손님유형 배지] 이름 관계 · 메모 / 금액
- 새로고침 버튼 (storage에서 재로드)

---

## 기술 조건

- **단일 HTML 파일** — 외부 의존성 없음
- **저장소:** `window.storage` API (`storage.get` / `storage.set`)
- **동시접속:** get → push → set 패턴으로 데이터 유실 방지
- **역할 격리:** bride / groom 키 완전 분리, admin은 양쪽 get만
- **다크모드:** CSS 변수 사용, 하드코딩 색상 금지
- **반응형:** 모바일 우선, max-width 제한으로 데스크톱에서도 가독성 유지