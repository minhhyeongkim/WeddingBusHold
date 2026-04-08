단일 HTML 파일로 결혼식 축의금 관리 앱을 만들어줘.

[계정/권한]

- bride (pw: bride1234) → 신부측만 입력·조회
- groom (pw: groom1234) → 신랑측만 입력·조회
- admin (pw: admin0000) → 전체 조회 전용

[저장소] window.storage API 사용 (persistent, 동시접속 안전)

- bride: storage.set('bride_entries', [...], false)
- groom: storage.set('groom_entries', [...], false)
- admin: storage.get 양쪽 모두

[화면 3개] login → role별 input 또는 admin

1. login: role 셀렉트 + pw 입력
2. input: 이름·관계(가족/친척/친구/직장/기타)·금액(+빠른입력 3/5/7/10/20만)·메모, 입력내역 목록+합계, 삭제 가능
3. admin: 신부/신랑 각 합계·인원 통계, 전체/신부/신랑 탭 필터, 금액 내림차순 정렬

[기술조건]

- 동시입력 충돌 방지: 저장 전 storage.get으로 최신 배열 fetch 후 push → set
- entry id: Date.now() + random(4자리)
- 각 담당자는 상대측 데이터 접근 불가
- 로그아웃 시 상태 초기화
