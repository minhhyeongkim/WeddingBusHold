import { db } from "./firebase";
import { ref, get, set } from "firebase/database";

export const ADMIN_CODE = "admin1234";
export const HOLD_MS    = 500;

const KEY = "wbus6";

export async function loadG() {
  try {
    const snapshot = await get(ref(db, KEY));
    return snapshot.exists() ? snapshot.val() : [];
  } catch {
    return [];
  }
}

export async function saveG(g) {
  try {
    await set(ref(db, KEY), g);
  } catch {}
}
