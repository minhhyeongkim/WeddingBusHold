import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../constants/colors";
import { HOLD_MS } from "../utils/storage";

export default function HoldButton({
  onConfirm,
  disabled,
  label = "꾹 눌러서 탑승 확인",
  holdMs = HOLD_MS,
}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef   = useRef();
  const startRef = useRef();

  const start = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    setHolding(true);
    startRef.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const pct = Math.min((elapsed / holdMs) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setHolding(false);
        setProgress(0);
        onConfirm();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, holdMs, onConfirm]);

  const cancel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const pct  = Math.round(progress);
  const r    = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <button
      onMouseDown={start}  onMouseUp={cancel}    onMouseLeave={cancel}
      onTouchStart={start} onTouchEnd={cancel}   onTouchCancel={cancel}
      style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: 7,
        padding: holding ? "8px 14px 8px 8px" : "8px 14px",
        borderRadius: 10,
        border: `1.5px solid ${holding ? C.purple : C.border}`,
        background: holding ? C.purplePale : C.white,
        color: C.purple,
        fontSize: 13, fontWeight: 700,
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        transition: "background 0.1s, border-color 0.1s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* fill sweep background */}
      {holding && (
        <div style={{
          position: "absolute", inset: 0,
          background: C.purplePale,
          clipPath: `inset(0 ${100 - pct}% 0 0)`,
          transition: "none",
          borderRadius: 10,
          zIndex: 0,
        }} />
      )}

      {/* circular progress ring */}
      {holding && (
        <svg width={40} height={40} style={{ flexShrink: 0, zIndex: 1 }}>
          <circle cx={20} cy={20} r={r} fill="none" stroke={C.grayLight} strokeWidth={3} />
          <circle cx={20} cy={20} r={r} fill="none" stroke={C.purple}    strokeWidth={3}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
          />
          <text x={20} y={20} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 11, fontWeight: 700, fill: C.purple }}>
            {pct}
          </text>
        </svg>
      )}

      <span style={{ zIndex: 1, whiteSpace: "nowrap" }}>
        {holding ? "누르는 중..." : label}
      </span>
    </button>
  );
}
