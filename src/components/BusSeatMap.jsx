import { C } from "../constants/colors";

// ── 좌석 레이아웃 ─────────────────────────────────────────────────
// 컬럼 인덱스: 0=A, 1=B, 2=통로(gap), 3=C(9행만), 4=D
// null = 빈 자리 표시기(1~8행의 C 위치), 'aisle' = 통로
function buildLayout() {
  const rows = [];
  for (let r = 1; r <= 8; r++) {
    const b = (r - 1) * 3;
    rows.push([b + 1, b + 2, "aisle", null, b + 3]);
  }
  rows.push([25, 26, "aisle", 27, 28]); // 9행
  return rows;
}
const LAYOUT = buildLayout();

function Seat({ no, name, boarded }) {
  const empty   = !name;
  const bg      = empty ? C.white      : boarded ? "#E1F5EE" : "#EEEDFE";
  const border  = empty ? C.grayLight   : boarded ? "#1D9E75" : "#3C3489";
  const color   = empty ? C.textSub     : boarded ? "#085041" : "#3C3489";

  return (
    <div style={{
      width: 44, height: 42, border: `1.5px solid ${border}`, borderRadius: 6,
      background: bg, color, boxSizing: "border-box",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden", padding: "2px 1px",
      flexShrink: 0,
    }}>
      {name ? (
        <>
          <span style={{ fontSize: 9, opacity: 0.6, lineHeight: 1 }}>{no}</span>
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>
            {name.length > 3 ? name.slice(0, 3) + "…" : name}
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

      {/* 상행/하행 토글 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
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
      <div style={{
        background: C.grayPale, borderRadius: 14, padding: "14px 12px",
        border: `1px solid ${C.border}`, overflowX: "auto",
      }}>
        {/* 운전석 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <div style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: C.grayLight, color: C.textSub, letterSpacing: "0.03em",
          }}>
            운전석 🚌
          </div>
        </div>

        {/* 좌석 그리드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          {LAYOUT.map((row, ri) => (
            <div key={ri} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* 행 번호 */}
              <span style={{ width: 18, fontSize: 10, color: C.textSub, textAlign: "right", flexShrink: 0 }}>
                {ri + 1}
              </span>

              {row.map((slot, ci) => {
                if (slot === "aisle") return <div key={ci} style={{ width: 12, flexShrink: 0 }} />;
                if (slot === null)    return <div key={ci} style={{ width: 44, flexShrink: 0 }} />;
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

        {/* 범례 */}
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { bg: C.white,    bd: C.grayLight, label: "빈 좌석" },
            { bg: "#EEEDFE",  bd: "#3C3489",   label: "탑승 예정" },
            { bg: "#E1F5EE",  bd: "#1D9E75",   label: "탑승 완료" },
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
