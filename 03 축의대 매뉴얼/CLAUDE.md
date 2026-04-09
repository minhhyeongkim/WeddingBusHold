# 축의대 매뉴얼 웹사이트 — 프로젝트 명세

## 프로젝트 개요

결혼식 당일 축의대 담당자가 모바일로 빠르게 참고할 수 있는 단일 HTML 파일 매뉴얼 웹사이트.
역할(하객 응대 / 명부 기입 / 공통 정보)을 탭으로 전환하며 필요한 정보만 즉시 확인.

- **행사 정보:** 아벤티움 3층 · 12:30 예식 · 축의대 11:30 오픈
- **결과물:** `wedding_manual.html` — 단일 파일, 외부 의존성 없음 (폰트 제외)

---

## 파일 구조

```
wedding_manual.html   ← 모든 HTML·CSS·JS가 담긴 단일 파일
```

---

## 디자인 시스템

### 색상 팔레트 (CSS 변수)

```css
--cream: #faf7f2 /* 페이지 배경 */ --warm-white: #fffdf9 /* 카드·헤더 배경 */
  --gold: #c9a96e /* 골드 강조색 */ --gold-light: #e8d5b0 /* 골드 구분선 */
  --gold-dark: #9b7a42 /* 골드 텍스트 */ --charcoal: #2c2c2c /* 본문 텍스트 */
  --gray-mid: #6b6b6b /* 보조 텍스트 */ --gray-light: #ebebeb
  /* 구분선·테두리 */ /* 신부측 (핑크) */ --bride-bg: #fdf2f4
  --bride-accent: #c0607a --bride-border: #e8b4c0 /* 신랑측 (블루) */
  --groom-bg: #f2f6fd --groom-accent: #3d6fa8 --groom-border: #b4c8e8
  /* 경고 카드 (노란) */ --warn-bg: #fff8ec --warn-border: #f0c87a
  --warn-text: #8b5e1a /* 위험 카드 (빨강) */ --danger-bg: #fff2f2
  --danger-border: #e8a0a0 --danger-text: #9b2222;
```

### 타이포그래피

- 본문: `Noto Sans KR` (Google Fonts) — weight 300/400/500/700
- 제목: `Noto Serif KR` (Google Fonts) — weight 400/600
- 기본 font-weight: 300, line-height: 1.7

### 반응형

- max-width: 640px, margin: 0 auto
- 모바일 우선 설계
- `grid2` (2열 그리드): `@media (max-width: 400px)` → 1열

---

## 화면 구성 및 인터랙션

### 헤더 (sticky)

```
[행사 정보 — 소문자 골드 letter-spacing 3px]
[축의대 매뉴얼 — Noto Serif KR h1]
[축의대 오픈 11:30 · 역할을 선택하세요 — 보조 텍스트]
```

### 역할 탭 (3개 버튼)

| 버튼         | ID           | 활성 클래스     |
| ------------ | ------------ | --------------- |
| 🤝 하객 응대 | `btn-guest`  | `active-bride`  |
| 📋 명부 기입 | `btn-ledger` | `active-groom`  |
| 📌 공통 정보 | `btn-shared` | `active-shared` |

- 패널 전환: `display:none` → `display:block` + `fadeUp` 애니메이션 (0.3s ease)
- 초기 상태: 안내 문구 패널 표시 (`panel-intro`)

### 패널 전환 함수

```js
function showPanel(id) {
  // 모든 .panel에서 active 제거
  // 모든 .role-btn에서 active-* 제거
  // panel-{id} 에 active 추가
  // btn-{id} 에 해당 active-* 클래스 추가
}
```

### 아코디언 (명부 기입 패널 내 돌발 상황)

```js
function toggleCollapse(bodyId, btnId) {
  // .collapse-body에 open 토글 → display 전환
  // .collapse-btn에 open 토글 → 화살표 rotate(180deg)
}
```

---

## 컴포넌트 명세

### section-title

```html
<div class="section-title">
  <span class="dot dot-{bride|groom|gold|warn|danger}"></span>
  섹션명
</div>
```

- Noto Serif KR, 15px, font-weight 600
- 하단 border: 1px solid var(--gold-light)
- 점(dot): 6px 원형

### steps (번호 단계 목록)

```html
<ul class="steps">
  <li>
    <span class="step-num num-{bride|groom}">1</span>
    <div class="step-text">
      내용
      <div class="step-note">보조 설명 (선택)</div>
    </div>
  </li>
</ul>
```

### info-card (일반 정보)

```html
<div class="info-card">
  <div class="ic-title">제목</div>
  <div class="ic-body">내용</div>
</div>
```

### warn-card (주의 — 노란)

```html
<div class="warn-card">
  <div class="wc-label">라벨</div>
  <div class="wc-title">제목 (선택)</div>
  <div class="wc-body">내용</div>
</div>
```

### danger-card (위험 — 빨강)

```html
<div class="danger-card">
  <div class="dc-label">라벨</div>
  <div class="dc-title">제목</div>
  <div class="dc-body">내용</div>
</div>
```

### highlight (골드 왼쪽 보더 강조)

```html
<div class="highlight">강조 내용</div>
```

### collapse-btn + collapse-body (아코디언)

```html
<div class="collapse-btn" id="c{n}" onclick="toggleCollapse('b{n}','c{n}')">
  제목 <span class="arrow">▼</span>
</div>
<div class="collapse-body" id="b{n}">
  <!-- info-card 또는 warn-card -->
</div>
```

### supply-tag (준비물 태그 pill)

```html
<div class="supplies">
  <span class="supply-tag">태그명</span>
</div>
```

### ticket-row (식권 정보 행)

```html
<div class="ticket-row">
  <span class="ticket-label">라벨</span>
  <span class="ticket-val">값</span>
</div>
```

### grid2 (2열 그리드)

```html
<div class="grid2">
  <div class="info-card">...</div>
  <div class="info-card">...</div>
</div>
```

### example (코드/예시 박스)

```html
<div class="example">예) 1 / 2(소1) / 2</div>
```

### badge (인라인 배지)

```html
<span class="badge badge-{bride|groom}">텍스트</span>
```

---

## 패널별 콘텐츠 명세

### panel-intro (초기 화면)

- 아이콘 + "위에서 담당 역할을 선택하면 해당 매뉴얼을 확인할 수 있습니다." 안내

---

### panel-guest (하객 응대)

**섹션 1 — 준비물 체크** `dot-bride`

- supply-tag: 장부, 방명록, 펜, 식권, 고무줄, 축의 가방, 도장(필요시)

**섹션 2 — 식권 현황** `dot-bride`

- info-card (ticket-row 4행):
  - 총 수량: 500장
  - 신랑측 `badge-groom 200명 예상`: 300장
  - 신부측 `badge-bride 100명 예상`: 200장
  - 소인식권: 7세 이하 무료 (초등학생↑ 대인)
- highlight: "식권은 **숫자 순서대로** 배부 · 여유분 소진 시 홀 직원에게 문의"

**섹션 3 — 응대 순서** `dot-bride`

- steps (num-bride, 5단계):
  1. 하객에게 **축의금 봉투** 받기
  2. 봉투에 적힌 **성함 확인** / step-note: "이름 없을 시 → '방명록 작성 부탁드립니다' 요청"
  3. **"식권 몇 장 필요하세요?"** 질문
  4. 봉투 오른쪽 상단에 **넘버 + 식권 수량** 기입 / example: "예) 1 / 2(소1) / 2"
  5. **식권 전달** 후 봉투를 명부 기입 담당에게 전달
- warn-card: ⚠️ 주의 / "식권 안 받고 답례품 문의 시" / 홀 규정 안내, **→ 이번 행사 답례품 없음**

---

### panel-ledger (명부 기입)

**섹션 1 — 기입 순서** `dot-groom`

- steps (num-groom, 4단계):
  1. 하객 응대 담당에게 봉투 받고 **금액 확인**
  2. 봉투에 **금액 & 명부 번호** 직접 기입
  3. 축의금 명부에 기재 / step-note: "봉투 넘버와 맞춰서 번호 · 이름 · 금액 · 식권 수량"
  4. 봉투 **10개씩 고무줄**로 묶어 축의 가방에 넣기

**섹션 2 — 돌발 상황 대응** `dot-groom`

아코디언 6개 (기본 닫힘):

| ID    | 제목                                | 내용 유형    | 핵심 내용                                                                                                       |
| ----- | ----------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| c1/b1 | 계좌이체 하객 / 단체 대표 납부      | info-card    | ①계좌이체 내역 확인 ②청첩장 확인 ③장부 별도 표시                                                                |
| c2/b2 | 금액 착오 주장 하객                 | warn-card ×2 | 적게: "추가로 주시면 대신 넣어드리겠습니다" / 많이: "계좌번호 주시면 식후 돌려드리겠습니다" + ★단호한 안내 주의 |
| c3/b3 | "봉투 돌려주세요" / "측 바꿔냈어요" | info-card    | "메모 남겨주시면 식 후 신랑·신부가 직접 처리"                                                                   |
| c4/b4 | 빈 봉투 / 1만원 미만 + 식권 요청    | warn-card    | "봉투가 바뀐 것 같으니 한 번 더 확인 부탁드립니다"                                                              |
| c5/b5 | 소액 대비 식권 과다 요구            | warn-card    | "해당 금액이 맞는지 봉투 한 번 더 확인 부탁드립니다"                                                            |
| c6/b6 | 중간 정산 요청                      | warn-card    | 식 중 정산 없음, 신랑·신부 외 전달 금지                                                                         |

- danger-card: 🔴 절대 금지 / 축의금 가방 관리 / 차·가족·따로두기 ✕, 신랑·신부에게만 전달

---

### panel-shared (공통 정보)

**섹션 1 — 하객 문의 안내** `dot-gold`

grid2 (4개 info-card):

- 🏧 ATM 위치: 건물 1층 이마트24 / 맞은편 한국경제신문사 빌딩 1층 우리은행
- 🚗 주차권: 연회장 입구 키오스크 등록 시 **2시간 무료**
- 🍽️ 연회장 & 식사: 축의대 맞은편 / 식사 시간 **12:00~14:00**
- 👰 신부 대기실: 축의대 기준 **오른편**

info-card (전체폭 2개):

- 🚻 화장실: 여성 — 혼주대기실 계단 옆 / 남성 — 반대편 입구 예약실 뒤편 폐백실 옆
- 🎁 답례품: 없음 (gray-mid 텍스트)

**섹션 2 — 주의사항** `dot-warn`

- warn-card: 📌 상주 필수 / 마감까지 이탈 금지, 특이사항 장부 기재
- danger-card: 🔴 최우선 주의 / ★ 이미 받은 축의금은 신랑·신부 이외 절대 전달 금지 ★ / 도난 위험, 차·가족 ✕, 돌발 시 즉시 문의

---

## 기술 조건

- 단일 HTML 파일 (`wedding_manual.html`)
- 외부 JS 라이브러리 없음
- 폰트만 Google Fonts CDN 사용 (`Noto Sans KR`, `Noto Serif KR`)
- CSS 변수 기반 색상 (하드코딩 금지)
- JS는 `showPanel()`, `toggleCollapse()` 두 함수로만 구성
- 모바일 우선, sticky 헤더, fadeUp 전환 애니메이션 (0.3s ease)
- `@keyframes fadeUp`: opacity 0→1, translateY 8px→0
