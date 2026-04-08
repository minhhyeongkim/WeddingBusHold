import { useState, useEffect, useRef } from "react";
import { C } from "./constants/colors";
import { ADMIN_CODE, loadG, saveG } from "./utils/storage";
import HoldButton from "./components/HoldButton";

const FF = "system-ui,-apple-system,sans-serif";

const GUEST_TYPES = [
  { key: "민형측",  label: "민형측 하객",  color: "#3C3489", bg: "#EEEDFE" },
  { key: "엄마측",  label: "엄마측 하객",  color: "#B5386A", bg: "#FDECF3" },
  { key: "아빠측",  label: "아빠측 하객",  color: "#1B5FA8", bg: "#E8F1FC" },
  { key: "부모님측", label: "부모님측 하객", color: "#8B6014", bg: "#FEF3E2" },
];

function TypeBadge({ guestType }) {
  const t = GUEST_TYPES.find(t => t.key === guestType) ?? GUEST_TYPES[0];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 7px", borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      color: t.color, background: t.bg,
      flexShrink: 0,
    }}>
      {t.label}
    </span>
  );
}

export default function App() {
  const [view,     setView]     = useState("login");
  const [guests,   setGuests]   = useState([]);
  const [pw,       setPw]       = useState("");
  const [pwErr,    setPwErr]    = useState("");
  const [form,     setForm]     = useState({ name: "", phone: "", seat: "", guestType: "민형측" });
  const [formErr,  setFormErr]  = useState("");
  const [tab,      setTab]      = useState("board");
  const [justDone, setJustDone] = useState(false);
  const prevAll = useRef(false);

  // 초기 로드
  useEffect(() => { loadG().then(setGuests); }, []);

  // 관리자 화면에서 3초마다 폴링
  useEffect(() => {
    if (view !== "admin") return;
    const t = setInterval(() => loadG().then(setGuests), 3000);
    return () => clearInterval(t);
  }, [view]);

  // 전원 탑승 감지
  const allBoarded = guests.length > 0 && guests.every(g => g.boarded);
  useEffect(() => {
    if (allBoarded && !prevAll.current && guests.length > 0) setJustDone(true);
    prevAll.current = allBoarded;
  }, [allBoarded, guests.length]);

  // ── 액션 ──────────────────────────────────────────────────────────
  function login() {
    if (pw === ADMIN_CODE) { setView("admin"); setPwErr(""); }
    else setPwErr("비밀번호가 틀렸습니다.");
  }

  async function addGuest() {
    if (!form.name.trim()) return setFormErr("이름을 입력해주세요.");
    const sn = Number(form.seat);
    if (!form.seat || isNaN(sn) || sn < 1) return setFormErr("올바른 좌석 번호를 입력해주세요.");
    if (guests.find(g => g.seat === sn)) return setFormErr("이미 사용 중인 좌석입니다.");
    const g = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: form.name.trim(),
      phone: form.phone.trim(),
      seat: sn,
      guestType: form.guestType,
      boarded: false,
    };
    const u = [...guests, g].sort((a, b) => a.seat - b.seat);
    setGuests(u); await saveG(u);
    setForm({ name: "", phone: "", seat: "", guestType: form.guestType }); setFormErr("");
  }

  async function del(id) {
    const u = guests.filter(g => g.id !== id);
    setGuests(u); await saveG(u);
  }

  async function board(id) {
    const u = guests.map(g => g.id === id ? { ...g, boarded: true } : g);
    setGuests(u); await saveG(u);
  }

  async function unboard(id) {
    const u = guests.map(g => g.id === id ? { ...g, boarded: false } : g);
    setGuests(u); await saveG(u);
  }

  // ── 파생 값 ───────────────────────────────────────────────────────
  const boarded = guests.filter(g => g.boarded).length;
  const total   = guests.length;
  const pct     = total > 0 ? Math.round((boarded / total) * 100) : 0;
  const waiting = [...guests].filter(g => !g.boarded).sort((a, b) => a.seat - b.seat);
  const done    = [...guests].filter(g =>  g.boarded).sort((a, b) => a.seat - b.seat);

  // ── 출발 준비 완료 화면 ───────────────────────────────────────────
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

  // ── 로그인 화면 ───────────────────────────────────────────────────
  if (view === "login") return (
    <div style={{ fontFamily: FF, maxWidth: 360, margin: "48px auto", padding: 20 }}>
      <div style={{ background: C.purple, borderRadius: 16, padding: "22px 24px", marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 11, color: C.purpleLight, fontWeight: 600, letterSpacing: "0.1em" }}>WEDDING BUS</p>
        <p style={{ margin: "5px 0 3px", fontSize: 22, fontWeight: 700, color: "#EEEDFE" }}>탑승 체크인</p>
        <p style={{ margin: 0, fontSize: 12, color: C.purpleLight }}>신부 김민형 · 아벤티움 · 12시 30분 식</p>
      </div>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: C.textSub }}>관리자 비밀번호</p>
        <input
          type="password" placeholder="비밀번호 입력" value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
          style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 15, boxSizing: "border-box", outline: "none" }}
        />
        {pwErr && <p style={{ color: C.red, fontSize: 12, margin: "6px 0 0" }}>{pwErr}</p>}
        <button onClick={login} style={{ marginTop: 13, width: "100%", padding: 12, background: C.purple, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          입장
        </button>
        <p style={{ margin: "10px 0 0", fontSize: 11, color: C.grayLight, textAlign: "center" }}>기본 비밀번호: admin1234</p>
      </div>
    </div>
  );

  // ── 관리자 화면 ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FF, maxWidth: 480, margin: "0 auto", padding: "14px 13px 56px" }}>

      {/* 헤더 */}
      <div style={{ background: C.purple, borderRadius: 16, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: C.purpleLight, fontWeight: 600, letterSpacing: "0.08em" }}>WEDDING BUS</p>
            <p style={{ margin: "3px 0 2px", fontSize: 18, fontWeight: 700, color: "#EEEDFE" }}>웨딩 셔틀 탑승 현황</p>
            <p style={{ margin: 0, fontSize: 11, color: C.purpleLight }}>신부 김민형 · 아벤티움 · 12시 30분 식</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, lineHeight: 1 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "#EEEDFE" }}>{boarded}</span>
              <span style={{ fontSize: 15, color: C.purpleLight }}>/{total}</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.purpleLight }}>탑승완료</p>
          </div>
        </div>

        {total > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: allBoarded ? "#5DCAA5" : C.purpleLight,
                width: `${pct}%`,
                transition: "width 0.45s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11, color: C.purpleLight }}>대기 {total - boarded}명</span>
              <span style={{ fontSize: 11, color: allBoarded ? "#5DCAA5" : C.purpleLight, fontWeight: allBoarded ? 700 : 400 }}>
                {allBoarded ? "전원 탑승 완료 ✓" : `${pct}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["board", "탑승 체크인"], ["add", "탑승자 추가"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "10px 0", borderRadius: 9,
            border: `1.5px solid ${tab === k ? C.purple : C.border}`,
            background: tab === k ? C.purplePale : C.white,
            color: tab === k ? C.purple : C.textSub,
            fontSize: 14, fontWeight: tab === k ? 700 : 400, cursor: "pointer",
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── 탑승 체크인 탭 ── */}
      {tab === "board" && <>
        {guests.length === 0 && (
          <div style={{ textAlign: "center", padding: "52px 0", color: C.textSub, fontSize: 14 }}>
            등록된 탑승자가 없습니다<br />
            <span style={{ fontSize: 12 }}>"탑승자 추가" 탭에서 먼저 추가해주세요</span>
          </div>
        )}

        {waiting.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "8px 12px", background: C.purplePale, borderRadius: 8 }}>
            <span style={{ fontSize: 16 }}>👆</span>
            <p style={{ margin: 0, fontSize: 12, color: C.purpleMid }}>버튼을 <b>꾹 누르고 있으면</b> 탑승 처리됩니다</p>
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
                <div style={{ width: 42, height: 42, borderRadius: 10, background: C.purplePale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.purple }}>{g.seat}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>{g.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <TypeBadge guestType={g.guestType} />
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
                display: "flex", alignItems: "center", gap: 10, opacity: 0.72,
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: C.tealPale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.tealDark }}>{g.seat}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.tealDark }}>{g.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <TypeBadge guestType={g.guestType} />
                    {g.phone && <span style={{ fontSize: 12, color: C.teal }}>{g.phone}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: C.teal, fontWeight: 700, flexShrink: 0 }}>탑승완료 ✓</span>
                <button onClick={() => unboard(g.id)} title="탑승 취소"
                  style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 13, color: C.amber, flexShrink: 0 }}>
                  ↩
                </button>
              </div>
            ))}
          </div>
        )}
      </>}

      {/* ── 탑승자 추가 탭 ── */}
      {tab === "add" && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.text }}>탑승자 추가</p>

          {/* 손님 유형 선택 */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: C.textSub }}>손님 유형 *</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {GUEST_TYPES.map(t => (
                <button key={t.key} onClick={() => setForm(f => ({ ...f, guestType: t.key }))}
                  style={{
                    padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${form.guestType === t.key ? t.color : C.border}`,
                    background: form.guestType === t.key ? t.bg : C.white,
                    color: form.guestType === t.key ? t.color : C.textSub,
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {[["이름 *", "name", "홍길동", "text"], ["전화번호", "phone", "010-0000-0000", "tel"], ["좌석 번호 *", "seat", "예: 7", "number"]].map(([l, k, ph, t]) => (
            <div key={k} style={{ marginBottom: 13 }}>
              <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 600, color: C.textSub }}>{l}</p>
              <input
                type={t} placeholder={ph} value={form[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addGuest()}
                style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 15, boxSizing: "border-box", outline: "none" }}
              />
            </div>
          ))}
          {formErr && <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{formErr}</p>}
          <button onClick={addGuest} style={{ width: "100%", padding: 12, background: C.purple, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            추가하기
          </button>

          {guests.length > 0 && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: C.textSub }}>현재 등록 · {total}명</p>
              {[...guests].sort((a, b) => a.seat - b.seat).map(g => (
                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.grayPale}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.purple, width: 28, flexShrink: 0 }}>{g.seat}석</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}>{g.name}</span>
                  <TypeBadge guestType={g.guestType} />
                  <button onClick={() => del(g.id)} style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, color: C.red, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
