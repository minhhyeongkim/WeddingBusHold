import { C } from "../constants/colors";

// ── 좌석 레이아웃 (운전석 시선 기준) ──────────────────────────────
// 운전석에서 뒤를 바라보는 시선:
//   - 위아래: 뒷줄(9행)이 위, 앞줄(1행)이 아래 (운전석에 가까울수록 아래)
//   - 좌우:  원래 D열(우창)이 왼쪽, A열(좌창)이 오른쪽
// 각 row 슬롯: [D, C or null, 'aisle', B, A]
function buildLayout() {
  const rows = [];
  for (let r = 1; r <= 8; r++) {
    const b = (r - 1) * 3;
    rows.push({ rowNum: r, slots: [b + 3, null, "aisle", b + 2, b + 1] });
  }
  rows.push({ rowNum: 9, slots: [28, 27, "aisle", 26, 25] });
  // 행 순서 뒤집기: 9행이 맨 위
  return rows.reverse();
}
const LAYOUT = buildLayout();

function Seat({ no, name, boarded }) {
  const empty  = !name;
  const bg     = empty ? C.white     : boarded ? "#E1F5EE" : "#EEEDFE";
  const border = empty ? C.grayLight  : boarded ? "#1D9E75" : "#3C3489";
  const color  = empty ? C.textSub    : boarded ? "#085041" : "#3C3489";

  return (
    <div style={{
      height: 44, border: `1.5px solid ${border}`, borderRadius: 6,
      background: bg, color, boxSizing: "border-box",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden", padding: "2px 1px", minWidth: 0,
    }}>
      {name ? (
        <>
          <span style={{ fontSize: 9, opacity: 0.55, lineHeight: 1 }}>{no}</span>
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.3, textAlign: "center", width: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", padding: "0 2px" }}>
            {name}
          </span>
          {boarded && <span style={{ fontSize: 8, color: "#1D9E75", lineHeight: 1 }}>✓</span>}
        </>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600 }}>{no}</span>
      )}
    </div>
  );
}

export default function BusSeatMap({
  direction,
  onDirectionChange,
  boardedSeats = [],
  guestSeatMap = {},
}) {
  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* 방향 토글 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["상행", "↑ 상행"], ["하행", "↓ 하행"]].map(([key, label]) => (
          <button key={key} onClick={() => onDirectionChange(key)} style={{
            flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: `1.5px solid ${direction === key ? C.orange : C.border}`,
            background: direction === key ? C.orangePale : C.white,
            color: direction === key ? C.orange : C.textSub,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* 버스 레이아웃 */}
      <div style={{ background: C.grayPale, borderRadius: 14, padding: "12px 10px", border: `1px solid ${C.border}` }}>

        {/* 열 헤더 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "22px 1fr 1fr 18px 1fr 1fr",
          gap: "4px", marginBottom: 4,
        }}>
          <div />
          <span style={{ fontSize: 10, color: C.textSub, textAlign: "center" }}>D</span>
          <span style={{ fontSize: 10, color: C.textSub, textAlign: "center" }}>C</span>
          <div />
          <span style={{ fontSize: 10, color: C.textSub, textAlign: "center" }}>B</span>
          <span style={{ fontSize: 10, color: C.textSub, textAlign: "center" }}>A</span>
        </div>

        {/* 좌석 그리드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {LAYOUT.map(({ rowNum, slots }) => (
            <div key={rowNum} style={{
              display: "grid",
              gridTemplateColumns: "22px 1fr 1fr 18px 1fr 1fr",
              gap: "4px", alignItems: "stretch",
            }}>
              {/* 행 번호 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 10, color: C.textSub }}>{rowNum}</span>
              </div>

              {slots.map((slot, ci) => {
                if (slot === "aisle") {
                  return (
                    <div key={ci} style={{
                      borderRadius: 4,
                      background: "rgba(0,0,0,0.04)",
                    }} />
                  );
                }
                if (slot === null) {
                  return <div key={ci} />;
                }
                return (
                  <Seat
                    key={ci}
                    no={slot}
                    name={guestSeatMap[slot] ?? null}
                    boarded={boardedSeats.includes(slot)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* 운전석 */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <div style={{
            padding: "5px 18px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: C.grayLight, color: C.textSub, letterSpacing: "0.03em",
          }}>
            🚌 운전석 (앞)
          </div>
        </div>

        {/* 범례 */}
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { bg: C.white,   bd: C.grayLight, label: "빈 좌석" },
            { bg: "#EEEDFE", bd: "#3C3489",   label: "탑승 예정" },
            { bg: "#E1F5EE", bd: "#1D9E75",   label: "탑승 완료" },
          ].map(({ bg, bd, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 13, height: 13, borderRadius: 3, background: bg, border: `1.5px solid ${bd}`, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: C.textSub }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
