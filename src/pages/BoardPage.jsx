import { useState, useEffect, useRef } from "react";
import { C } from "../constants/colors";
import { GUEST_TYPES, DIRECTIONS } from "../constants/types";
import { subscribeG, saveG } from "../utils/storage";
import HoldButton from "../components/HoldButton";

const FF = "system-ui,-apple-system,sans-serif";

function Badge({ typeKey, lookup }) {
  const t = lookup.find(x => x.key === typeKey);
  if (!t) return null;
  return (
    <span style={{
      display: "inline-block", padding: "1px 7px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, color: t.color, background: t.bg, flexShrink: 0,
    }}>
      {t.label}
    </span>
  );
}

export default function BoardPage() {
  const [guests,   setGuests]   = useState([]);
  const [justDone, setJustDone] = useState(false);
  const prevAll = useRef(false);

  useEffect(() => {
    const unsub = subscribeG(setGuests);
    return () => unsub();
  }, []);

  const allBoarded = guests.length > 0 && guests.every(g => g.boarded);
  useEffect(() => {
    if (allBoarded && !prevAll.current && guests.length > 0) setJustDone(true);
    prevAll.current = allBoarded;
  }, [allBoarded, guests.length]);

  async function board(id) {
    const u = guests.map(g => g.id === id ? { ...g, boarded: true } : g);
    await saveG(u);
  }

  async function unboard(id) {
    const u = guests.map(g => g.id === id ? { ...g, boarded: false } : g);
    await saveG(u);
  }

  const boarded = guests.filter(g => g.boarded).length;
  const total   = guests.length;
  const pct     = total > 0 ? Math.round((boarded / total) * 100) : 0;
  const waiting = [...guests].filter(g => !g.boarded).sort((a, b) => a.seat - b.seat);
  const done    = [...guests].filter(g =>  g.boarded).sort((a, b) => a.seat - b.seat);

  // ── 출발 준비 완료 ─────────────────────────────────────────────────
  if (justDone) return (
    <div onClick={() => setJustDone(false)} style={{
      fontFamily: FF, minHeight: "100vh", background: C.teal,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, textAlign: "center", cursor: "pointer",
    }}>
      <style>{`
        @keyframes popIn  { 0%{transform:scale(0.4);opacity:0} 70%{transform:scale(1.25)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={{ fontSize: 72, animation: "popIn 0.55s cubic-bezier(.34,1.56,.64,1) both" }}>🎉</div>
      <p style={{ margin: "16px 0 6px", fontSize: 30, fontWeight: 700, color: "#fff", animation: "fadeUp 0.4s 0.3s both" }}>
        출발 준비 완료!
      </p>
      <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.85)", animation: "fadeUp 0.4s 0.45s both" }}>
        전원 탑승 확인 · {total}명
      </p>
      <p style={{ margin: "32px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)", animation: "fadeUp 0.4s 0.6s both" }}>
        화면을 탭하면 명단으로 돌아갑니다
      </p>
    </div>
  );

  return (
    <div style={{ fontFamily: FF, maxWidth: 480, margin: "0 auto", padding: "14px 13px 72px" }}>

      {/* 헤더 */}
      <div style={{ background: C.orange, borderRadius: 16, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: C.orangeLight, fontWeight: 600, letterSpacing: "0.08em" }}>WEDDING BUS</p>
            <p style={{ margin: "3px 0 2px", fontSize: 18, fontWeight: 700, color: "#FFF7F2" }}>탑승 체크인</p>
            <p style={{ margin: 0, fontSize: 11, color: C.orangeLight }}>신부 김민형 · 아벤티움 · 12시 30분 식</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, lineHeight: 1 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "#FFF7F2" }}>{boarded}</span>
              <span style={{ fontSize: 15, color: C.orangeLight }}>/{total}</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.orangeLight }}>탑승완료</p>
          </div>
        </div>

        {total > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, background: "rgba(255,255,255,0.25)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: allBoarded ? "#5DCAA5" : "rgba(255,255,255,0.75)",
                width: `${pct}%`,
                transition: "width 0.45s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11, color: C.orangeLight }}>대기 {total - boarded}명</span>
              <span style={{ fontSize: 11, color: allBoarded ? "#5DCAA5" : C.orangeLight, fontWeight: allBoarded ? 700 : 400 }}>
                {allBoarded ? "전원 탑승 완료 ✓" : `${pct}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 비어있음 */}
      {guests.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 0", color: C.textSub, fontSize: 14 }}>
          등록된 탑승자가 없습니다<br />
          <span style={{ fontSize: 12 }}>관리자 페이지에서 탑승자를 추가해주세요</span>
        </div>
      )}

      {/* 힌트 */}
      {waiting.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "8px 12px", background: C.orangePale, borderRadius: 8 }}>
          <span style={{ fontSize: 16 }}>👆</span>
          <p style={{ margin: 0, fontSize: 12, color: C.orangeMid }}>버튼을 <b>꾹 누르고 있으면</b> 탑승 처리됩니다</p>
        </div>
      )}

      {/* 미탑승 */}
      {waiting.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <p style={{ margin: "0 0 7px 2px", fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: "0.06em" }}>
            미탑승 · {waiting.length}명
          </p>
          {waiting.map(g => (
            <div key={g.id} style={{
              background: C.white, border: `1.5px solid ${C.border}`,
              borderRadius: 12, padding: "12px 13px", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.orangePale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.orange }}>{g.seat}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>{g.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                  <Badge typeKey={g.guestType} lookup={GUEST_TYPES} />
                  <Badge typeKey={g.direction} lookup={DIRECTIONS} />
                  {g.phone && <span style={{ fontSize: 12, color: C.textSub }}>{g.phone}</span>}
                </div>
              </div>
              <HoldButton onConfirm={() => board(g.id)} label="꾹 눌러서 탑승" />
            </div>
          ))}
        </div>
      )}

      {waiting.length > 0 && done.length > 0 && (
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
      )}

      {/* 탑승완료 */}
      {done.length > 0 && (
        <div>
          <p style={{ margin: "0 0 7px 2px", fontSize: 11, fontWeight: 700, color: C.teal, letterSpacing: "0.06em" }}>
            탑승완료 · {done.length}명
          </p>
          {done.map(g => (
            <div key={g.id} style={{
              background: "#f8fcfa", border: `1.5px solid ${C.teal}`,
              borderRadius: 12, padding: "11px 13px", marginBottom: 7,
              display: "flex", alignItems: "center", gap: 10, opacity: 0.75,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: C.tealPale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: C.tealDark }}>{g.seat}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.tealDark }}>{g.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                  <Badge typeKey={g.guestType} lookup={GUEST_TYPES} />
                  <Badge typeKey={g.direction} lookup={DIRECTIONS} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: C.teal, fontWeight: 700, flexShrink: 0 }}>완료 ✓</span>
              <button onClick={() => unboard(g.id)} title="탑승 취소"
                style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 13, color: C.amber, flexShrink: 0 }}>
                ↩
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 하단 관리자 링크 */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "flex-end",
        padding: "10px 16px",
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
        borderTop: `1px solid ${C.border}`,
      }}>
        <button
          onClick={() => { window.location.hash = "admin"; }}
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 12, color: C.textSub, cursor: "pointer" }}
        >
          관리자 페이지 →
        </button>
      </div>
    </div>
  );
}
