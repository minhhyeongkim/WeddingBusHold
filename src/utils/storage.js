export const ADMIN_CODE = "admin1234";
export const HOLD_MS    = 800;

const KEY = "wbus6";

export async function loadG() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveG(g) {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {}
}
