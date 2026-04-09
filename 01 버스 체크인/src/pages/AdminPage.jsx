import { useState, useEffect } from "react";
import { C } from "../constants/colors";
import { GUEST_TYPES, DIRECTIONS } from "../constants/types";
import { ADMIN_CODE, subscribeG, saveG } from "../utils/storage";

const FF = "system-ui,-apple-system,sans-serif";

// 구 데이터 호환
const getSeats = (g) => Array.isArray(g.seats) ? g.seats : (g.seat ? [g.seat] : []);

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

// ── 전화번호 유틸 ─────────────────────────────────────────────────
function formatPhone(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0,2)}-${d.slice(2,5)}-${d.slice(5)}`;
    return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6,10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}
const validatePhone = (p) => !p || /^\d{2,3}-\d{3,4}-\d{4}$/.test(p);

// ── CSV 파싱 유틸 ──────────────────────────────────────────────────
function splitCSVLine(line) {
  const result = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result.map(v => v.trim());
}
function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, ''));
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line); const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; }); return row;
  });
}
function normalizeGuestType(raw) {
  if (!raw) return '민형측'; const r = raw.trim();
  if (r.includes('엄마')) return '엄마측'; if (r.includes('아빠')) return '아빠측';
  if (r.includes('부모')) return '부모님측'; return '민형측';
}
function normalizeDirection(raw) {
  if (!raw) return '동시'; const r = raw.trim();
  if ((r.includes('상행') && r.includes('하행')) || r.includes('동시')) return '동시';
  if (r.includes('상행')) return '상행'; if (r.includes('하행')) return '하행'; return '동시';
}
function csvRowToGuest(row) {
  const name = row['이름'] || row['name'] || ''; if (!name) return null;
  const phone = row['전화번호'] || row['연락처'] || row['phone'] || '';
  const seatStr = row['좌석번호'] || row['좌석'] || row['seat'] || '';
  // 쉼표/공백으로 구분된 다중 좌석 지원 (예: "3,4,5" 또는 "3 4 5")
  const seats = seatStr.split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 28);
  if (seats.length === 0) return null;
  const guestType = normalizeGuestType(row['손님유형'] || row['유형'] || row['guesttype'] || '');
  const direction = normalizeDirection(row['방향'] || row['탑승방향'] || row['direction'] || '');
  return { name, phone, seats, guestType, direction };
}

// ── 인원수 스테퍼 ────────────────────────────────────────────────
function CountStepper({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {[-1, 1].map((delta, i) => (
        <button key={delta} onClick={() => onChange(Math.max(1, Math.min(8, value + delta)))}
          style={{
            width: 36, height: 36, borderRadius: i === 0 ? "8px 0 0 8px" : "0 8px 8px 0",
            border: `1.5px solid ${C.border}`, background: C.white,
            fontSize: 18, color: C.orange, cursor: "pointer", fontWeight: 700,
            lineHeight: 1,
          }}>
          {delta < 0 ? "−" : "+"}
        </button>
      ))}
      <div style={{
        width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${C.border}`, borderLeft: "none", borderRight: "none",
        fontSize: 16, fontWeight: 700, color: C.text,
      }}>
        {value}
      </div>
      <span style={{ marginLeft: 8, fontSize: 13, color: C.textSub }}>명</span>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function AdminPage() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [pwErr,    setPwErr]    = useState("");
  const [guests,   setGuests]   = useState([]);
  const [tab,      setTab]      = useState("list");
  const [form,     setForm]     = useState({
    name: "", phone: "", count: 1, seats: [""],
    guestType: "민형측", direction: "동시",
  });
  const [formErr,  setFormErr]  = useState("");
  const [sheetUrl,  setSheetUrl]  = useState("");
  const [preview,   setPreview]   = useState(null);
  const [fetching,  setFetching]  = useState(false);
  const [fetchErr,  setFetchErr]  = useState("");
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState(null);

  useEffect(() => {
    if (!authed) return;
    const unsub = subscribeG(setGuests);
    return () => unsub();
  }, [authed]);

  function login() {
    if (pw === ADMIN_CODE) { setAuthed(true); setPwErr(""); }
    else setPwErr("비밀번호가 틀렸습니다.");
  }

  function handleCount(n) {
    setForm(f => ({
      ...f, count: n,
      seats: Array.from({ length: n }, (_, i) => f.seats[i] ?? ""),
    }));
  }

  function updateSeat(i, val) {
    setForm(f => {
      const seats = [...f.seats]; seats[i] = val.replace(/\D/g, "").slice(0, 2);
      return { ...f, seats };
    });
  }

  // 전체 사용 좌석 (기존 + 구버전 seat 필드 호환)
  const allUsedSeats = guests.flatMap(getSeats);

  async function addGuest() {
    if (!form.name.trim()) return setFormErr("이름을 입력해주세요.");
    if (!validatePhone(form.phone)) return setFormErr("전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
    const seatNums = form.seats.map(Number);
    if (seatNums.some(s => !s || isNaN(s) || s < 1 || s > 28))
      return setFormErr("올바른 좌석 번호를 입력해주세요. (1~28)");
    if (new Set(seatNums).size !== seatNums.length)
      return setFormErr("중복된 좌석 번호가 있습니다.");
    const conflict = seatNums.find(s => allUsedSeats.includes(s));
    if (conflict) return setFormErr(`${conflict}번 좌석은 이미 사용 중입니다.`);

    const g = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: form.name.trim(), phone: form.phone.trim(),
      seats: seatNums, guestType: form.guestType, direction: form.direction,
      boardedUp: false, boardedDown: false,
    };
    const u = [...guests, g].sort((a, b) => getSeats(a)[0] - getSeats(b)[0]);
    setGuests(u); await saveG(u);
    setForm(f => ({ ...f, name: "", phone: "", count: 1, seats: [""] })); setFormErr("");
  }

  async function del(id) {
    if (editId === id) { setEditId(null); setEditForm(null); }
    const u = guests.filter(g => g.id !== id);
    setGuests(u); await saveG(u);
  }

  function startEdit(g) {
    const seats = getSeats(g);
    setEditId(g.id);
    setEditForm({
      name: g.name, phone: g.phone || "",
      count: seats.length, seats: seats.map(String),
      guestType: g.guestType, direction: g.direction,
    });
  }

  function handleEditCount(n) {
    setEditForm(f => ({
      ...f, count: n,
      seats: Array.from({ length: n }, (_, i) => f.seats[i] ?? ""),
    }));
  }

  function updateEditSeat(i, val) {
    setEditForm(f => {
      const seats = [...f.seats]; seats[i] = val.replace(/\D/g, "").slice(0, 2);
      return { ...f, seats };
    });
  }

  async function saveEdit() {
    if (!editForm.name.trim()) return setFormErr("이름을 입력해주세요.");
    if (!validatePhone(editForm.phone)) return setFormErr("전화번호 형식이 올바르지 않습니다.");
    const seatNums = editForm.seats.map(Number);
    if (seatNums.some(s => !s || isNaN(s) || s < 1 || s > 28))
      return setFormErr("올바른 좌석 번호를 입력해주세요. (1~28)");
    if (new Set(seatNums).size !== seatNums.length)
      return setFormErr("중복된 좌석 번호가 있습니다.");
    const otherSeats = guests.filter(g => g.id !== editId).flatMap(getSeats);
    const conflict = seatNums.find(s => otherSeats.includes(s));
    if (conflict) return setFormErr(`${conflict}번 좌석은 이미 사용 중입니다.`);

    const u = guests.map(g => g.id !== editId ? g : {
      ...g,
      name: editForm.name.trim(), phone: editForm.phone.trim(),
      seats: seatNums, guestType: editForm.guestType, direction: editForm.direction,
    }).sort((a, b) => getSeats(a)[0] - getSeats(b)[0]);
    setGuests(u); await saveG(u);
    setEditId(null); setEditForm(null); setFormErr("");
  }

  // ── 스프레드시트 불러오기 ──────────────────────────────────────
  async function fetchSheet() {
    if (!sheetUrl.trim()) return setFetchErr("URL을 입력해주세요.");
    setFetching(true); setFetchErr(""); setPreview(null);
    try {
      const res = await fetch(sheetUrl.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseCSV(text).map(csvRowToGuest).filter(Boolean);
      if (rows.length === 0) throw new Error("파싱된 데이터가 없습니다. 컬럼 헤더를 확인해주세요.");
      const usedSet = new Set(allUsedSeats);
      const toAdd   = rows.filter(r => !r.seats.some(s => usedSet.has(s)));
      const skipped = rows.filter(r =>  r.seats.some(s => usedSet.has(s)));
      setPreview({ toAdd, skipped });
    } catch (e) {
      setFetchErr(e.message || "불러오기에 실패했습니다.");
    } finally { setFetching(false); }
  }

  async function importSheet() {
    if (!preview?.toAdd?.length) return;
    const newGuests = preview.toAdd.map(r => ({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      ...r, boardedUp: false, boardedDown: false,
    }));
    const u = [...guests, ...newGuests].sort((a, b) => getSeats(a)[0] - getSeats(b)[0]);
    setGuests(u); await saveG(u);
    setPreview(null); setSheetUrl(""); setTab("list");
  }

  const total = guests.length;

  // ── 로그인 화면 ───────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ fontFamily: FF, maxWidth: 360, margin: "48px auto", padding: 20 }}>
      <div style={{ background: C.orange, borderRadius: 16, padding: "22px 24px", marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 11, color: C.orangeLight, fontWeight: 600, letterSpacing: "0.1em" }}>WEDDING BUS</p>
        <p style={{ margin: "5px 0 3px", fontSize: 22, fontWeight: 700, color: "#FFF7F2" }}>관리자 페이지</p>
        <p style={{ margin: 0, fontSize: 12, color: C.orangeLight }}>신부 김민형 · 아벤티움 · 12시 30분 식</p>
      </div>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: C.textSub }}>관리자 비밀번호</p>
        <input
          type="password" placeholder="비밀번호 입력" value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
          style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 15, boxSizing: "border-box", outline: "none" }}
        />
        {pwErr && <p style={{ color: C.red, fontSize: 12, margin: "6px 0 0" }}>{pwErr}</p>}
        <button onClick={login} style={{ marginTop: 13, width: "100%", padding: 12, background: C.orange, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          입장
        </button>
        <button onClick={() => { window.location.hash = ""; }}
          style={{ marginTop: 8, width: "100%", padding: 11, background: "none", color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 14, cursor: "pointer" }}>
          ← 체크인 화면으로
        </button>
      </div>
    </div>
  );

  // ── 관리자 화면 ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FF, maxWidth: 480, margin: "0 auto", padding: "14px 13px 56px" }}>

      {/* 헤더 */}
      <div style={{ background: C.orange, borderRadius: 16, padding: "16px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { window.location.hash = ""; }}
          style={{ width: 36, height: 36, borderRadius: 9, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", color: "#FFF7F2", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, color: C.orangeLight, fontWeight: 600, letterSpacing: "0.08em" }}>ADMIN</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#FFF7F2" }}>탑승자 관리 · {total}명</p>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["list", "명단 관리"], ["sheet", "스프레드시트 가져오기"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, cursor: "pointer",
            border: `1.5px solid ${tab === k ? C.orange : C.border}`,
            background: tab === k ? C.orangePale : C.white,
            color: tab === k ? C.orange : C.textSub,
            fontWeight: tab === k ? 700 : 400,
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── 명단 관리 탭 ── */}
      {tab === "list" && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.text }}>탑승자 추가</p>

          {/* 손님 유형 */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 7px", fontSize: 12, fontWeight: 600, color: C.textSub }}>손님 유형 *</p>
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

          {/* 탑승 방향 */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 7px", fontSize: 12, fontWeight: 600, color: C.textSub }}>탑승 방향 *</p>
            <div style={{ display: "flex", gap: 6 }}>
              {DIRECTIONS.map(d => (
                <button key={d.key} onClick={() => setForm(f => ({ ...f, direction: d.key }))}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${form.direction === d.key ? d.color : C.border}`,
                    background: form.direction === d.key ? d.bg : C.white,
                    color: form.direction === d.key ? d.color : C.textSub,
                  }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 600, color: C.textSub }}>이름 *</p>
            <input type="text" placeholder="홍길동" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addGuest()}
              style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 15, boxSizing: "border-box", outline: "none" }}
            />
          </div>

          {/* 전화번호 */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 600, color: C.textSub }}>전화번호</p>
            <input type="tel" placeholder="010-0000-0000" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
              style={{
                width: "100%", padding: "11px 13px", borderRadius: 9, fontSize: 15, boxSizing: "border-box", outline: "none",
                border: `1.5px solid ${form.phone && !validatePhone(form.phone) ? C.red : C.border}`,
              }}
            />
            {form.phone && !validatePhone(form.phone) && (
              <p style={{ color: C.red, fontSize: 11, margin: "4px 0 0" }}>올바른 형식이 아닙니다 (예: 010-1234-5678)</p>
            )}
          </div>

          {/* 탑승 인원수 */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 7px", fontSize: 12, fontWeight: 600, color: C.textSub }}>탑승 인원수 *</p>
            <CountStepper value={form.count} onChange={handleCount} />
          </div>

          {/* 좌석 번호 (인원수만큼) */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 7px", fontSize: 12, fontWeight: 600, color: C.textSub }}>좌석 번호 * (1~28)</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {form.seats.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.textSub, flexShrink: 0 }}>{i + 1}번째</span>
                  <input
                    type="number" min={1} max={28} placeholder="7"
                    value={s} onChange={e => updateSeat(i, e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addGuest()}
                    style={{
                      width: 60, padding: "9px 10px", borderRadius: 8, fontSize: 15,
                      border: `1.5px solid ${s && (Number(s) < 1 || Number(s) > 28) ? C.red : C.border}`,
                      boxSizing: "border-box", outline: "none", textAlign: "center",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {formErr && <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{formErr}</p>}
          <button onClick={addGuest} style={{ width: "100%", padding: 12, background: C.orange, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            추가하기
          </button>

          {/* 현재 명단 */}
          {guests.length > 0 && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: C.textSub }}>현재 등록 · {total}명</p>
              {[...guests].sort((a, b) => getSeats(a)[0] - getSeats(b)[0]).map(g => {
                const seats = getSeats(g);
                const isEditing = editId === g.id;
                if (isEditing && editForm) return (
                  <div key={g.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.grayPale}` }}>
                    {/* 손님 유형 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
                      {GUEST_TYPES.map(t => (
                        <button key={t.key} onClick={() => setEditForm(f => ({ ...f, guestType: t.key }))}
                          style={{ padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            border: `1.5px solid ${editForm.guestType === t.key ? t.color : C.border}`,
                            background: editForm.guestType === t.key ? t.bg : C.white,
                            color: editForm.guestType === t.key ? t.color : C.textSub }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {/* 방향 */}
                    <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                      {DIRECTIONS.map(d => (
                        <button key={d.key} onClick={() => setEditForm(f => ({ ...f, direction: d.key }))}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            border: `1.5px solid ${editForm.direction === d.key ? d.color : C.border}`,
                            background: editForm.direction === d.key ? d.bg : C.white,
                            color: editForm.direction === d.key ? d.color : C.textSub }}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                    {/* 이름 */}
                    <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="이름" style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 6 }} />
                    {/* 전화번호 */}
                    <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                      placeholder="010-0000-0000" style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 6 }} />
                    {/* 인원수 */}
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 600, color: C.textSub }}>탑승 인원수</p>
                      <CountStepper value={editForm.count} onChange={handleEditCount} />
                    </div>
                    {/* 좌석 */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {editForm.seats.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 11, color: C.textSub }}>{i + 1}번째</span>
                          <input type="number" min={1} max={28} value={s}
                            onChange={e => updateEditSeat(i, e.target.value)}
                            style={{ width: 55, padding: "7px 8px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 14, boxSizing: "border-box", outline: "none", textAlign: "center" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEdit} style={{ flex: 1, padding: 9, background: C.orange, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>저장</button>
                      <button onClick={() => { setEditId(null); setEditForm(null); setFormErr(""); }}
                        style={{ flex: 1, padding: 9, background: C.white, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer" }}>취소</button>
                    </div>
                  </div>
                );
                return (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.grayPale}` }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, flexShrink: 0, minWidth: 32 }}>
                      {seats.join("·")}석
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: C.text, minWidth: 0 }}>
                      {g.name}{seats.length > 1 && <span style={{ fontSize: 11, color: C.textSub }}> ({seats.length}명)</span>}
                    </span>
                    <Badge typeKey={g.guestType} lookup={GUEST_TYPES} />
                    <Badge typeKey={g.direction} lookup={DIRECTIONS} />
                    <button onClick={() => startEdit(g)}
                      style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, color: C.textSub, flexShrink: 0 }}>
                      ✎
                    </button>
                    <button onClick={() => del(g.id)}
                      style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, color: C.red, flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 스프레드시트 탭 ── */}
      {tab === "sheet" && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: C.text }}>구글 스프레드시트 가져오기</p>
          <div style={{ background: C.grayPale, borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>
            <b style={{ color: C.text }}>스프레드시트 준비 방법</b><br />
            1. 구글 스프레드시트 열기<br />
            2. 첫 행 헤더: <code style={{ background: C.border, padding: "1px 4px", borderRadius: 3 }}>이름, 전화번호, 좌석번호, 손님유형, 방향</code><br />
            3. 파일 → 공유 → 웹에 게시 → CSV → 게시<br />
            4. 생성된 URL 붙여넣기<br /><br />
            <b>손님유형:</b> 민형측 / 엄마측 / 아빠측 / 부모님측<br />
            <b>방향:</b> 동시 / 상행 / 하행
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: C.textSub }}>게시된 CSV URL</p>
          <input type="url" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, boxSizing: "border-box", outline: "none", marginBottom: 10 }}
          />
          {fetchErr && <p style={{ color: C.red, fontSize: 12, margin: "0 0 8px" }}>{fetchErr}</p>}
          <button onClick={fetchSheet} disabled={fetching}
            style={{ width: "100%", padding: 12, background: fetching ? C.grayLight : C.orange, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: fetching ? "default" : "pointer" }}>
            {fetching ? "불러오는 중..." : "데이터 불러오기"}
          </button>

          {preview && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: C.text }}>
                가져올 항목 · {preview.toAdd.length}명
                {preview.skipped.length > 0 && <span style={{ fontWeight: 400, color: C.textSub, marginLeft: 6 }}>({preview.skipped.length}명 중복 건너뜀)</span>}
              </p>
              {preview.toAdd.length === 0 ? (
                <p style={{ color: C.textSub, fontSize: 13 }}>가져올 새 항목이 없습니다.</p>
              ) : (
                <>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden", marginBottom: 12 }}>
                    {preview.toAdd.map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: i < preview.toAdd.length - 1 ? `1px solid ${C.grayPale}` : "none" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, flexShrink: 0 }}>{getSeats(g).join("·")}석</span>
                        <span style={{ flex: 1, fontSize: 13, color: C.text }}>{g.name}</span>
                        <Badge typeKey={g.guestType} lookup={GUEST_TYPES} />
                        <Badge typeKey={g.direction} lookup={DIRECTIONS} />
                      </div>
                    ))}
                  </div>
                  <button onClick={importSheet}
                    style={{ width: "100%", padding: 12, background: C.teal, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    {preview.toAdd.length}명 가져오기
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
