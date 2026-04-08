import { useState, useEffect } from "react";
import { C } from "../constants/colors";
import { GUEST_TYPES, DIRECTIONS } from "../constants/types";
import { ADMIN_CODE, subscribeG, saveG } from "../utils/storage";

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

// ── 전화번호 유틸 ─────────────────────────────────────────────────
function formatPhone(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.startsWith('02')) {
    if (d.length <= 2)  return d;
    if (d.length <= 5)  return `${d.slice(0,2)}-${d.slice(2)}`;
    if (d.length <= 9)  return `${d.slice(0,2)}-${d.slice(2,5)}-${d.slice(5)}`;
    return `${d.slice(0,2)}-${d.slice(2,6)}-${d.slice(6,10)}`;
  }
  if (d.length <= 3)  return d;
  if (d.length <= 7)  return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}

function validatePhone(phone) {
  if (!phone) return true; // 선택 항목
  return /^\d{2,3}-\d{3,4}-\d{4}$/.test(phone);
}

// ── CSV 파싱 유틸 ──────────────────────────────────────────────────
function splitCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map(v => v.trim());
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, ''));
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

function normalizeGuestType(raw) {
  if (!raw) return '민형측';
  const r = raw.trim();
  if (r.includes('엄마')) return '엄마측';
  if (r.includes('아빠')) return '아빠측';
  if (r.includes('부모')) return '부모님측';
  return '민형측';
}

function normalizeDirection(raw) {
  if (!raw) return '동시';
  const r = raw.trim();
  if ((r.includes('상행') && r.includes('하행')) || r.includes('동시') || r.includes('both')) return '동시';
  if (r.includes('상행') || r.includes('up')) return '상행';
  if (r.includes('하행') || r.includes('down')) return '하행';
  return '동시';
}

function csvRowToGuest(row) {
  const name = row['이름'] || row['name'] || '';
  if (!name) return null;
  const phone = row['전화번호'] || row['연락처'] || row['phone'] || '';
  const seatStr = row['좌석번호'] || row['좌석'] || row['seat'] || '';
  const seat = parseInt(seatStr);
  if (!seat || isNaN(seat) || seat < 1) return null;
  const guestType = normalizeGuestType(row['손님유형'] || row['유형'] || row['하객유형'] || row['guesttype'] || '');
  const direction = normalizeDirection(row['방향'] || row['탑승방향'] || row['direction'] || '');
  return { name, phone, seat, guestType, direction };
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function AdminPage() {
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState("");
  const [pwErr,    setPwErr]    = useState("");
  const [guests,   setGuests]   = useState([]);
  const [tab,      setTab]      = useState("list");
  const [form,     setForm]     = useState({ name: "", phone: "", seat: "", guestType: "민형측", direction: "동시" });
  const [formErr,  setFormErr]  = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [preview,  setPreview]  = useState(null);  // null | { rows, skipped }
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState("");

  useEffect(() => {
    if (!authed) return;
    const unsub = subscribeG(setGuests);
    return () => unsub();
  }, [authed]);

  function login() {
    if (pw === ADMIN_CODE) { setAuthed(true); setPwErr(""); }
    else setPwErr("비밀번호가 틀렸습니다.");
  }

  async function addGuest() {
    if (!form.name.trim()) return setFormErr("이름을 입력해주세요.");
    if (form.phone && !validatePhone(form.phone)) return setFormErr("전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
    const sn = Number(form.seat);
    if (!form.seat || isNaN(sn) || sn < 1) return setFormErr("올바른 좌석 번호를 입력해주세요.");
    if (guests.find(g => g.seat === sn)) return setFormErr("이미 사용 중인 좌석입니다.");
    const g = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: form.name.trim(), phone: form.phone.trim(),
      seat: sn, guestType: form.guestType, direction: form.direction, boarded: false,
    };
    const u = [...guests, g].sort((a, b) => a.seat - b.seat);
    setGuests(u); await saveG(u);
    setForm(f => ({ ...f, name: "", phone: "", seat: "" })); setFormErr("");
  }

  async function del(id) {
    const u = guests.filter(g => g.id !== id);
    setGuests(u); await saveG(u);
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
      const existingSeats = new Set(guests.map(g => g.seat));
      const toAdd    = rows.filter(r => !existingSeats.has(r.seat));
      const skipped  = rows.filter(r =>  existingSeats.has(r.seat));
      setPreview({ toAdd, skipped });
    } catch (e) {
      setFetchErr(e.message || "불러오기에 실패했습니다.");
    } finally {
      setFetching(false);
    }
  }

  async function importSheet() {
    if (!preview?.toAdd?.length) return;
    const newGuests = preview.toAdd.map(r => ({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      ...r, boarded: false,
    }));
    const u = [...guests, ...newGuests].sort((a, b) => a.seat - b.seat);
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
        <button
          onClick={() => { window.location.hash = ""; }}
          style={{ marginTop: 8, width: "100%", padding: 11, background: "none", color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 14, cursor: "pointer" }}
        >
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
        <button
          onClick={() => { window.location.hash = ""; }}
          style={{ width: 36, height: 36, borderRadius: 9, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", color: "#FFF7F2", fontSize: 16, cursor: "pointer", flexShrink: 0 }}
        >
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

          {/* 텍스트 입력 */}
          {[["이름 *", "name", "홍길동", "text"], ["전화번호", "phone", "010-0000-0000", "tel"], ["좌석 번호 *", "seat", "예: 7", "number"]].map(([l, k, ph, t]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 600, color: C.textSub }}>{l}</p>
              <input
                type={t} placeholder={ph} value={form[k]}
                onChange={e => {
                  const val = k === "phone" ? formatPhone(e.target.value) : e.target.value;
                  setForm(f => ({ ...f, [k]: val }));
                }}
                onKeyDown={e => e.key === "Enter" && addGuest()}
                style={{
                  width: "100%", padding: "11px 13px", borderRadius: 9, fontSize: 15, boxSizing: "border-box", outline: "none",
                  border: `1.5px solid ${k === "phone" && form.phone && !validatePhone(form.phone) ? C.red : C.border}`,
                }}
              />
              {k === "phone" && form.phone && !validatePhone(form.phone) && (
                <p style={{ color: C.red, fontSize: 11, margin: "4px 0 0" }}>올바른 형식이 아닙니다 (예: 010-1234-5678)</p>
              )}
            </div>
          ))}
          {formErr && <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{formErr}</p>}
          <button onClick={addGuest} style={{ width: "100%", padding: 12, background: C.orange, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            추가하기
          </button>

          {/* 현재 명단 */}
          {guests.length > 0 && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: C.textSub }}>현재 등록 · {total}명</p>
              {[...guests].sort((a, b) => a.seat - b.seat).map(g => (
                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.grayPale}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, width: 28, flexShrink: 0 }}>{g.seat}석</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.text, minWidth: 0 }}>{g.name}</span>
                  <Badge typeKey={g.guestType} lookup={GUEST_TYPES} />
                  <Badge typeKey={g.direction} lookup={DIRECTIONS} />
                  <button onClick={() => del(g.id)} style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 11, color: C.red, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 스프레드시트 탭 ── */}
      {tab === "sheet" && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: C.text }}>구글 스프레드시트 가져오기</p>

          {/* 안내 */}
          <div style={{ background: C.grayPale, borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>
            <b style={{ color: C.text }}>스프레드시트 준비 방법</b><br />
            1. 구글 스프레드시트 열기<br />
            2. 첫 행에 헤더: <code style={{ background: C.border, padding: "1px 4px", borderRadius: 3 }}>이름, 전화번호, 좌석번호, 손님유형, 방향</code><br />
            3. 파일 → 공유 → 웹에 게시 → CSV → 게시<br />
            4. 생성된 URL을 아래에 붙여넣기<br />
            <br />
            <b>손님유형:</b> 민형측 / 엄마측 / 아빠측 / 부모님측<br />
            <b>방향:</b> 동시 / 상행 / 하행
          </div>

          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: C.textSub }}>게시된 CSV URL</p>
          <input
            type="url" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, boxSizing: "border-box", outline: "none", marginBottom: 10 }}
          />
          {fetchErr && <p style={{ color: C.red, fontSize: 12, margin: "0 0 8px" }}>{fetchErr}</p>}
          <button onClick={fetchSheet} disabled={fetching}
            style={{ width: "100%", padding: 12, background: fetching ? C.grayLight : C.orange, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: fetching ? "default" : "pointer" }}>
            {fetching ? "불러오는 중..." : "데이터 불러오기"}
          </button>

          {/* 미리보기 */}
          {preview && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: C.text }}>
                가져올 항목 · {preview.toAdd.length}명
                {preview.skipped.length > 0 && <span style={{ fontWeight: 400, color: C.textSub, marginLeft: 6 }}>({preview.skipped.length}명 중복 건너뜀)</span>}
              </p>
              {preview.toAdd.length === 0 ? (
                <p style={{ color: C.textSub, fontSize: 13 }}>가져올 새 항목이 없습니다 (모두 중복).</p>
              ) : (
                <>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden", marginBottom: 12 }}>
                    {preview.toAdd.map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: i < preview.toAdd.length - 1 ? `1px solid ${C.grayPale}` : "none" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, width: 28, flexShrink: 0 }}>{g.seat}석</span>
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
