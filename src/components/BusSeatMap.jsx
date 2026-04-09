import { useState, useRef, useCallback, useEffect } from "react";
import { C } from "../constants/colors";
import { HOLD_MS } from "../utils/storage";

function buildLayout() {
  const rows = [];
  for (let r = 1; r <= 8; r++) {
    const b = (r - 1) * 3;
    rows.push({ rowNum: r, slots: [b + 3, null, "aisle", b + 2, b + 1] });
  }
  rows.push({ rowNum: 9, slots: [28, 27, "aisle", 26, 25] });
  return rows.reverse();
}
const LAYOUT = buildLayout();

function Seat({ no, name, boarded, onBoard }) {
  const [progress, setProgress] = useState(0);
  const [holding,  setHolding]  = useState(false);
  const rafRef   = useRef();
  const startRef = useRef();

  const canHold = !!name && !boarded && !!onBoard;

  const start = useCallback((e) => {
    if (!canHold) return;
    e.preventDefault();
    setHolding(true);
    startRef.current = performance.now();
    const tick = () => {
      const pct = Math.min(((performance.now() - startRef.current) / HOLD_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setHolding(false);
        setProgress(0);
        onBoard(no);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [canHold, no, onBoard]);

  const cancel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const empty  = !name;
  const bg     = empty ? C.white    : boarded ? "#E1F5EE" : holding ? "#D8D3F8" : "#EEEDFE";
  const border = empty ? C.grayLight : boarded ? "#1D9E75" : holding ? "#3C3489" : "#3C3489";
  const color  = empty ? C.textSub   : boarded ? "#085041" : "#3C3489";

  // 원형 프로그레스
  const r    = 14;
  const circ = 2 * Math.PI * r;
  const dash = (progress / 100) * circ;

  return (
    <div
      onMouseDown={start}  onMouseUp={cancel}    onMouseLeave={cancel}
      onTouchStart={start} onTouchEnd={cancel}   onTouchCancel={cancel}
      style={{
        height: 44, border: `1.5px solid ${border}`, borderRadius: 6,
        background: bg, color, boxSizing: "border-box",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden", padding: "2px 1px", minWidth: 0,
        position: "relative",
        cursor: canHold ? "pointer" : "default",
        userSelect: "none", WebkitUserSelect: "none",
        transition: "background 0.1s",
      }}
    >
      {/* 롱프레스 오버레이 */}
      {holding && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(60,52,137,0.08)",
          clipPath: `inset(0 ${100 - Math.round(progress)}% 0 0)`,
          zIndex: 0,
        }} />
      )}

      {holding ? (
        <svg width={32} height={32} style={{ zIndex: 1 }}>
          <circle cx={16} cy={16} r={r} fill="none" stroke={C.grayLight} strokeWidth={2.5} />
          <circle cx={16} cy={16} r={r} fill="none" stroke="#3C3489" strokeWidth={2.5}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
          />
        </svg>
      ) : name ? (
        <>
          <span style={{ fontSize: 9, opacity: 0.55, lineHeight: 1, zIndex: 1 }}>{no}</span>
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.3, textAlign: "center", width: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", padding: "0 2px", zIndex: 1 }}>
            {name}
          </span>
          {boarded && <span style={{ fontSize: 8, color: "#1D9E75", lineHeight: 1, zIndex: 1 }}>✓</span>}
        </>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600, zIndex: 1 }}>{no}</span>
      )}
    </div>
  );
}

export default function BusSeatMap({
  direction,
  boardedSeats = [],
  guestSeatMap = {},
  seatToGuestId = {},
  onBoard,
}) {
  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ background: C.grayPale, borderRadius: 14, padding: "12px 10px", border: `1px solid ${C.border}` }}>

        {/* 열 헤더 */}
        <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 18px 1fr 1fr", gap: "4px", marginBottom: 4 }}>
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
            <div key={rowNum} style={{ display: "grid", gridTemplateColumns: "22px 1fr 1fr 18px 1fr 1fr", gap: "4px", alignItems: "stretch" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 10, color: C.textSub }}>{rowNum}</span>
              </div>
              {slots.map((slot, ci) => {
                if (slot === "aisle") return <div key={ci} style={{ borderRadius: 4, background: "rgba(0,0,0,0.04)" }} />;
                if (slot === null)   return <div key={ci} />;
                const guestId = seatToGuestId[slot];
                return (
                  <Seat
                    key={ci}
                    no={slot}
                    name={guestSeatMap[slot] ?? null}
                    boarded={boardedSeats.includes(slot)}
                    onBoard={guestId ? () => onBoard(guestId) : null}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* 운전석 */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <div style={{ padding: "5px 18px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: C.grayLight, color: C.textSub }}>
            🚌 운전석 (앞)
          </div>
        </div>

        {/* 범례 */}
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { bg: C.white,   bd: C.grayLight, label: "빈 좌석" },
            { bg: "#EEEDFE", bd: "#3C3489",   label: "탑승 예정 (꾹 눌러 체크)" },
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
