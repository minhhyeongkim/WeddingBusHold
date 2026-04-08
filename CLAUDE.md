# 웨딩 버스 탑승 체크인 앱

## 프로젝트 개요
신부 김민형의 결혼식(아벤티움 웨딩홀, 12시 30분)을 위한
하객 버스 탑승 체크인 관리 앱.
고모(통솔자)가 현장에서 탑승자를 체크하는 단일 화면 앱.

## 기술 스택
- React 18 + Vite
- 상태관리: useState, useEffect, useRef, useCallback
- 스타일: inline style (CSS-in-JS, 외부 라이브러리 없음)
- 저장소: localStorage (shared persistent storage)
- 배포: Vercel 또는 GitHub Pages

## 프로젝트 구조
src/
├── constants/
│   └── colors.js          # C 색상 팔레트 객체
├── utils/
│   └── storage.js         # loadG(), saveG() — localStorage 래퍼
├── components/
│   └── HoldButton.jsx     # Long press 버튼 컴포넌트
├── App.jsx                # 뷰 로직 (login / admin / justDone 세 화면)
└── main.jsx               # Vite 엔트리포인트

## 핵심 기능
1. 관리자 로그인 (비밀번호: admin1234)
2. 탑승자 추가/삭제 (이름, 전화번호, 좌석번호)
3. 탑승 체크인 - Long press(0.8초) 방식으로 실수 방지
4. 미탑승 인원 리스트 상단 고정, 탑승완료 인원 하단
5. 진행 바로 탑승률 실시간 표시
6. 전원 탑승 시 "출발 준비 완료!" 전체화면 표시

## 코드 컨벤션
- 함수형 컴포넌트만 사용
- 색상은 src/constants/colors.js의 C 객체에서 중앙 관리
- storage key: "wbus6"
- 비동기 storage 함수: loadG(), saveG() (localStorage 기반)

## 주의사항
- localStorage는 기기별 저장 (고모님 폰 한 대에서만 사용)
- Long press는 HoldButton 컴포넌트로 분리
- 탑승 취소(↩)는 일반 탭, 탑승 처리만 long press
- 모바일 최적화 필수 (고모님이 폰으로 사용)
- 터치 이벤트 대응 필수 (onTouchStart, onTouchEnd)
