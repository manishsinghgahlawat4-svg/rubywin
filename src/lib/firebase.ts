/**
 * Firebase (Firestore) cloud layer.
 * Local storage stays the source of truth — every cloud call is best-effort and
 * silently degrades when the project is offline or security rules reject it.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAg9Y9YPhV1Z3dDMx6S1j2sh4KyJla1hhI",
  authDomain: "rubywin-89464.firebaseapp.com",
  projectId: "rubywin-89464",
  storageBucket: "rubywin-89464.firebasestorage.app",
  messagingSenderId: "840866914937",
  appId: "1:840866914937:web:51e2c1926cf38d46da2aa8",
  measurementId: "G-FBP9TKETF9"
}

export type CloudStatus = "idle" | "connecting" | "online" | "error";
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let status: CloudStatus = "idle";
let lastError = "";
let verified = false;

export function cloudStatus(): { status: CloudStatus; error: string; verified: boolean } {
  return { status, error: lastError, verified };
}

function getDb(): Firestore | null {
  try {
    if (!db) {
      status = "connecting";
      if (!app) app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    }
    return db;
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
    return null;
  }
}

/** Reads a tiny collection once to verify the project is reachable. */
export async function pingCloud(): Promise<boolean> {
  const database = getDb();
  if (!database) return false;
  try {
    await getDocs(collection(database, "rubywin_meta"));
    status = "online";
    verified = true;
    lastError = "";
    return true;
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
    return false;
  }
}

export async function syncUserToCloud(uid: string, payload: Record<string, unknown>) {
  const database = getDb();
  if (!database) return;
  try {
    await setDoc(doc(database, "rubywin_users", uid), { ...payload, uid, updatedAt: Date.now() }, { merge: true });
    status = "online";
    verified = true;
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
  }
}

export async function syncDepositToCloud(payload: Record<string, unknown>) {
  const database = getDb();
  if (!database) return;
  try {
    const id = String(payload.id);
    await setDoc(doc(database, "rubywin_deposits", id), { ...payload, syncedAt: Date.now() }, { merge: true });
    status = "online";
    verified = true;
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
  }
}

export async function syncWithdrawalToCloud(payload: Record<string, unknown>) {
  const database = getDb();
  if (!database) return;
  try {
    const id = String(payload.id);
    await setDoc(doc(database, "rubywin_withdrawals", id), { ...payload, syncedAt: Date.now() }, { merge: true });
    status = "online";
    verified = true;
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
  }
}

export interface CloudRecord {
  id: string;
  uid: string;
  user?: string;
  phone?: string;
  amount: number;
  bonus?: number;
  channel?: string;
  method?: string;
  utr?: string;
  accountLabel?: string;
  status: string;
  createdAt: number;
}

export async function fetchCloudRecords(): Promise<{ deposits: CloudRecord[]; withdrawals: CloudRecord[]; users: number }> {
  const database = getDb();
  if (!database) return { deposits: [], withdrawals: [], users: 0 };
  try {
    const [depSnap, wdSnap, userSnap] = await Promise.all([
      getDocs(collection(database, "rubywin_deposits")),
      getDocs(collection(database, "rubywin_withdrawals")),
      getDocs(collection(database, "rubywin_users")),
    ]);
    status = "online";
    verified = true;
    const toRecord = (d: { id: string; data: () => unknown }): CloudRecord => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as unknown as CloudRecord);
    return {
      deposits: depSnap.docs.map(toRecord),
      withdrawals: wdSnap.docs.map(toRecord),
      users: userSnap.size,
    };
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
    return { deposits: [], withdrawals: [], users: 0 };
  }
}

export async function setCloudStatus(kind: "deposits" | "withdrawals", id: string, newStatus: string) {
  const database = getDb();
  if (!database) return;
  try {
    await updateDoc(doc(database, kind === "deposits" ? "rubywin_deposits" : "rubywin_withdrawals", id), { status: newStatus, resolvedAt: Date.now() });
    status = "online";
    verified = true;
  } catch (e) {
    status = "error";
    lastError = e instanceof Error ? e.message : String(e);
  }
}
