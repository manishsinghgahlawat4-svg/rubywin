import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ANNOUNCEMENTS, AnnouncementDef, ATTENDANCE_REWARDS, DEFAULT_BANNERS, DEPOSIT_CHANNELS, GAME_LABELS, GAMES, GIFT_CODES, MISSIONS, MissionDef, PromoBanner, VIP_LEVELS, getVipLevel } from "../data";
import { setSoundEnabled, sfx } from "../utils/audio";
import { round2, startOfDay, todayKey, uid } from "../utils/helpers";
import { LOTTERY_GAMES, LotteryGame, calcLotteryPayout, periodEndTs } from "../games/lottery/engine";
import { syncDepositToCloud, syncUserToCloud, syncWithdrawalToCloud } from "../lib/firebase";

// ---------- Types ----------
export interface User {
  uid: string;
  nickname: string;
  avatar: number;
  phone: string;
  password: string;
  balance: number;
  totalBet: number;
  totalWin: number;
  totalDeposit: number;
  totalWithdraw: number;
  lockedBonus: number;
  hasMadeDeposit: boolean;
  inviteCode: string;
  referredBy: string | null;
  createdAt: number;
}

export interface Account {
  uid: string;
  phone: string;
  password: string;
  nickname: string;
  inviteCode: string;
  referredBy: string | null;
  createdAt: number;
}

export type TxType = "deposit" | "withdraw" | "bet" | "win" | "bonus" | "commission" | "rebate" | "refund" | "adjust";
export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  balanceAfter: number;
  status: "success" | "pending" | "failed";
  note: string;
  createdAt: number;
}

export interface DepositRequest {
  id: string;
  amount: number;
  bonus: number;
  channel: string;
  utr: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  resolvedAt?: number;
}

export interface WithdrawRequest {
  id: string;
  amount: number;
  method: "bank" | "upi";
  accountLabel: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  resolvedAt?: number;
}

export interface BankCard {
  id: string;
  bankName: string;
  holder: string;
  accountNumber: string;
  ifsc: string;
  phone: string;
}
export interface UpiAccount {
  id: string;
  upiId: string;
  holder: string;
  app: string;
}

export interface BetRecord {
  id: string;
  game: string;
  period?: string;
  duration?: number;
  selection: string;
  selectionLabel: string;
  amount: number;
  payout: number;
  result: "pending" | "win" | "lose";
  detail?: string;
  createdAt: number;
  settledAt?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface GameControl {
  enabled: boolean;
  minBet: number;
  maxBet: number;
}

export interface BonusSettings {
  welcomeText: string;
  welcomeMin: number;
  welcomeMax: number;
  depositText: string;
  depositMin: number;
  depositMax: number;
  referralText: string;
  referralMin: number;
  referralMax: number;
}

export interface AdminSettings {
  bonuses: BonusSettings;
  brandName: string;
  logoUrl: string;
  homeTagline: string;
  banners: PromoBanner[];
  announcements: AnnouncementDef[];
  gameControls: Record<string, GameControl>;
  depositQr: string;
  upiId: string;
  payeeName: string;
  minDeposit: number;
  minWithdraw: number;
  maintenanceNotice: string;
}

export interface ActivityState {
  lastCheckIn: string | null;
  streak: number;
  totalCheckIns: number;
  checkInDays: string[];
  redeemedCodes: string[];
  claimedMissions: Record<string, string[]>;
  rebateBaseline: number;
  lastRebateClaim: number | null;
  vipClaimed: number[];
  commissionClaimedDay: string | null;
}

export interface AppState {
  version: number;
  user: User;
  transactions: Transaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawRequest[];
  bankCards: BankCard[];
  upiAccounts: UpiAccount[];
  bets: BetRecord[];
  notifications: Notification[];
  admin: AdminSettings;
  activity: ActivityState;
  settings: { sound: boolean; language: string; autoPlay?: boolean };
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

const STORAGE_PREFIX = "rubywin_state_v2:";
const ACCOUNTS_KEY = "rubywin_accounts_v1";
const SESSION_KEY = "rubywin_session_v1";
const ADMIN_SETTINGS_KEY = "rubywin_admin_settings_v1";
const ADMIN_PASSWORD = "Mgahlawat2001";
const ADMIN_SESSION_KEY = "rubywin_admin_session_v2";
/** Random integer in [min, max] — used so bonus amounts vary while ads show the maximum. */
export function randRange(min: number, max: number): number {
  const lo = Math.max(0, Math.round(min));
  const hi = Math.max(lo, Math.round(max));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
export function randPercent(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// ---------- Defaults & storage ----------
function defaultAdminSettings(): AdminSettings {
  return {
    bonuses: {
      welcomeText: "UP TO ₹1,500",
      welcomeMin: 20,
      welcomeMax: 50,
      depositText: "UP TO 900%",
      depositMin: 5,
      depositMax: 10,
      referralText: "UP TO 500%",
      referralMin: 10,
      referralMax: 20,
    },
    brandName: "RubyWin",
    logoUrl: "/images/rubywin-logo.svg",
    homeTagline: "A little more play. A lot more sparkle.",
    banners: DEFAULT_BANNERS,
    announcements: ANNOUNCEMENTS,
    gameControls: Object.fromEntries(GAMES.map((g) => [g.id, { enabled: true, minBet: 1, maxBet: 100000 }])),
    depositQr: "",
    upiId: "5279899564127f@mairte",
    payeeName: "Suman Singh",
    minDeposit: 100,
    minWithdraw: 110,
    maintenanceNotice: "",
  };
}

export function loadAdminSettings(): AdminSettings {
  const def = defaultAdminSettings();
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;
    // Migrate stale defaults from earlier builds
    if (parsed.upiId === "rubywin@upi") parsed.upiId = def.upiId;
    if (!parsed.payeeName || parsed.payeeName === "RubyWin Payments") parsed.payeeName = def.payeeName;
    if (parsed.logoUrl === "/images/rubywin-mark.svg") parsed.logoUrl = def.logoUrl;
    if (parsed.banners && parsed.banners.length > 0 && parsed.banners.every((b) => b.imageUrl === "/images/rubywin-poster.png")) parsed.banners = def.banners;
    return { ...def, ...parsed, banners: parsed.banners ?? def.banners, announcements: parsed.announcements ?? def.announcements, gameControls: { ...def.gameControls, ...(parsed.gameControls ?? {}) } };
  } catch {
    return def;
  }
}

function saveAdminSettings(admin: AdminSettings) {
  try {
    localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(admin));
  } catch {
    /* storage unavailable */
  }
}

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function makeInviteCode(existing: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (existing.has(code));
  return code;
}

function makeDefaultState(account?: Account): AppState {
  const now = Date.now();
  const cfg = loadAdminSettings().bonuses;
  const welcomeBonus = account ? randRange(cfg.welcomeMin, cfg.welcomeMax) : 0;
  return {
    version: 2,
    user: {
      uid: account?.uid ?? "GUEST",
      nickname: account?.nickname ?? "Guest",
      avatar: 0,
      phone: account?.phone ?? "",
      password: account?.password ?? "",
      balance: account ? welcomeBonus : 0,
      totalBet: 0,
      totalWin: 0,
      totalDeposit: 0,
      totalWithdraw: 0,
      lockedBonus: 0,
      hasMadeDeposit: false,
      inviteCode: account?.inviteCode ?? "------",
      referredBy: account?.referredBy ?? null,
      createdAt: account?.createdAt ?? now,
    },
    transactions: account ? [{ id: uid("T"), type: "bonus", amount: welcomeBonus, balanceAfter: welcomeBonus, status: "success", note: "Welcome bonus", createdAt: now }] : [],
    deposits: [],
    withdrawals: [],
    bankCards: [],
    upiAccounts: [],
    bets: [],
    notifications: [
      { id: uid("N"), title: "Welcome to RubyWin", message: account ? `₹${welcomeBonus} welcome bonus has been credited to your wallet. Pick a game and start playing!` : `Register now and claim your ${cfg.welcomeText} welcome bonus.`, read: false, createdAt: now },
    ],
    admin: loadAdminSettings(),
    activity: {
      lastCheckIn: null,
      streak: 0,
      totalCheckIns: 0,
      checkInDays: [],
      redeemedCodes: [],
      claimedMissions: {},
      rebateBaseline: 0,
      lastRebateClaim: null,
      vipClaimed: [],
      commissionClaimedDay: null,
    },
    settings: { sound: true, language: "English" },
  };
}

export function readUserState(targetUid: string): AppState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${targetUid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const def = makeDefaultState();
    return {
      ...def,
      ...parsed,
      user: { ...def.user, ...(parsed.user ?? {}) },
      admin: loadAdminSettings(),
      activity: { ...def.activity, ...(parsed.activity ?? {}) },
      settings: { ...def.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return null;
  }
}

function writeUserState(targetUid: string, s: AppState) {
  try {
    const { admin: _admin, ...rest } = s;
    void _admin;
    localStorage.setItem(`${STORAGE_PREFIX}${targetUid}`, JSON.stringify(rest));
  } catch {
    /* storage unavailable */
  }
}

function loadInitialState(): AppState {
  const sessionUid = localStorage.getItem(SESSION_KEY);
  if (sessionUid) {
    const account = loadAccounts().find((a) => a.uid === sessionUid);
    if (account) return readUserState(sessionUid) ?? makeDefaultState(account);
    localStorage.removeItem(SESSION_KEY);
  }
  return makeDefaultState();
}

// ---------- Pure reducers (shared with the admin panel for cross-user actions) ----------
const pushNotification = (s: AppState, title: string, message: string): Notification[] =>
  [{ id: uid("N"), title, message, read: false, createdAt: Date.now() }, ...s.notifications].slice(0, 100);

const pushTx = (s: AppState, tx: Omit<Transaction, "id" | "createdAt">): Transaction[] =>
  [{ ...tx, id: uid("T"), createdAt: Date.now() }, ...s.transactions].slice(0, 600);

export function resolveDepositReducer(prev: AppState, id: string, approve: boolean): { next: AppState; firstDepositAmount: number } {
  const d = prev.deposits.find((x) => x.id === id);
  if (!d || d.status !== "pending") return { next: prev, firstDepositAmount: 0 };
  const deposits = prev.deposits.map((x) => (x.id === id ? { ...x, status: approve ? ("approved" as const) : ("rejected" as const), resolvedAt: Date.now() } : x));
  let transactions = prev.transactions.map((t) =>
    t.type === "deposit" && t.status === "pending" && t.note.includes(d.utr) ? { ...t, status: approve ? ("success" as const) : ("failed" as const) } : t
  );
  if (!approve) {
    return {
      next: { ...prev, deposits, transactions, notifications: pushNotification(prev, "Deposit rejected", `Your deposit of ₹${d.amount} (UTR ${d.utr}) could not be verified. Contact support if you believe this is an error.`) },
      firstDepositAmount: 0,
    };
  }
  const isFirst = !prev.user.hasMadeDeposit;
  const welcomeUnlock = isFirst ? prev.user.lockedBonus || 0 : 0;
  const total = round2(d.amount + d.bonus + welcomeUnlock);
  const balanceAfter = round2(prev.user.balance + total);
  const approvedTx: Transaction = { id: uid("T"), type: "deposit", amount: d.amount, balanceAfter: round2(prev.user.balance + d.amount), status: "success", note: `Deposit approved · ${d.channel}`, createdAt: Date.now() };
  const bonusTx: Transaction[] = d.bonus > 0 ? [{ id: uid("T"), type: "bonus", amount: d.bonus, balanceAfter, status: "success", note: "Deposit bonus", createdAt: Date.now() }] : [];
  const welcomeTx: Transaction[] = welcomeUnlock > 0 ? [{ id: uid("T"), type: "bonus", amount: welcomeUnlock, balanceAfter, status: "success", note: "First deposit welcome bonus unlocked", createdAt: Date.now() }] : [];
  transactions = [approvedTx, ...bonusTx, ...welcomeTx, ...transactions].slice(0, 600);
  return {
    next: {
      ...prev,
      user: { ...prev.user, balance: balanceAfter, totalDeposit: round2(prev.user.totalDeposit + d.amount), hasMadeDeposit: true, lockedBonus: 0 },
      deposits,
      transactions,
      notifications: pushNotification(prev, "Deposit successful", `₹${d.amount} has been credited${d.bonus > 0 ? ` with ₹${d.bonus} deposit bonus` : ""}${welcomeUnlock > 0 ? ` and your ₹${welcomeUnlock} welcome bonus is now unlocked` : ""}. Happy gaming!`),
    },
    firstDepositAmount: isFirst ? d.amount : 0,
  };
}

export function resolveWithdrawReducer(prev: AppState, id: string, approve: boolean): AppState {
  const w = prev.withdrawals.find((x) => x.id === id);
  if (!w || w.status !== "pending") return prev;
  const withdrawals = prev.withdrawals.map((x) => (x.id === id ? { ...x, status: approve ? ("approved" as const) : ("rejected" as const), resolvedAt: Date.now() } : x));
  const transactions = prev.transactions.map((t) =>
    t.type === "withdraw" && t.status === "pending" && t.amount === -w.amount && t.note.includes(w.accountLabel) ? { ...t, status: approve ? ("success" as const) : ("failed" as const) } : t
  );
  if (approve) {
    return { ...prev, withdrawals, transactions, user: { ...prev.user, totalWithdraw: round2(prev.user.totalWithdraw + w.amount) }, notifications: pushNotification(prev, "Withdrawal completed", `₹${w.amount} has been sent to ${w.accountLabel}.`) };
  }
  const balanceAfter = round2(prev.user.balance + w.amount);
  return {
    ...prev,
    withdrawals,
    user: { ...prev.user, balance: balanceAfter },
    transactions: [{ id: uid("T"), type: "refund" as const, amount: w.amount, balanceAfter, status: "success" as const, note: "Withdrawal rejected – refunded", createdAt: Date.now() }, ...transactions].slice(0, 600),
    notifications: pushNotification(prev, "Withdrawal rejected", `₹${w.amount} has been refunded to your wallet. Please verify your account details.`),
  };
}

export function creditReducer(prev: AppState, amount: number, type: TxType, note: string, notify?: { title: string; message: string }): AppState {
  const a = round2(amount);
  const balanceAfter = round2(prev.user.balance + a);
  return {
    ...prev,
    user: { ...prev.user, balance: balanceAfter },
    transactions: pushTx(prev, { type, amount: a, balanceAfter, status: "success", note }),
    notifications: notify ? pushNotification(prev, notify.title, notify.message) : prev.notifications,
  };
}

export function adjustReducer(prev: AppState, amount: number, note: string): AppState {
  const a = round2(amount);
  const balanceAfter = Math.max(0, round2(prev.user.balance + a));
  return {
    ...prev,
    user: { ...prev.user, balance: balanceAfter },
    transactions: pushTx(prev, { type: "adjust", amount: a, balanceAfter, status: "success", note: note || "Admin adjustment" }),
    notifications: pushNotification(prev, "Balance adjusted", `${a > 0 ? "+" : ""}₹${a} · ${note || "Admin adjustment"}`),
  };
}

// ---------- Routing ----------
function parseHash(): { path: string; query: URLSearchParams } {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  const wantsAdmin = pathname.endsWith("/admin") || new URLSearchParams(window.location.search).has("admin");
  const raw = window.location.hash.replace(/^#/, "") || (wantsAdmin ? "/admin" : "/");
  const [p, q] = raw.split("?");
  const path = p.startsWith("/") ? p : `/${p}`;
  return { path: path === "/" ? "/home" : path.replace(/\/$/, "") || "/home", query: new URLSearchParams(q ?? "") };
}

// ---------- Context value ----------
export interface PlaceBetArgs {
  game: string;
  selection: string;
  selectionLabel: string;
  amount: number;
  period?: string;
  duration?: number;
  detail?: string;
}

export interface RegisterArgs {
  phone: string;
  password: string;
  nickname: string;
  inviteCode: string;
}

export interface AppContextValue {
  state: AppState;
  route: string;
  query: URLSearchParams;
  navigate: (path: string, replace?: boolean) => void;
  back: () => void;
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"]) => void;
  isLoggedIn: boolean;
  register: (args: RegisterArgs) => { ok: boolean; message: string };
  login: (phone: string, password: string) => { ok: boolean; message: string };
  logout: () => void;
  accounts: Account[];
  storageVersion: number;
  applyToUser: (targetUid: string, reducer: (prev: AppState) => AppState) => void;
  placeBet: (args: PlaceBetArgs) => string | null;
  settleBet: (betId: string, payout: number, detail?: string) => void;
  cancelBet: (betId: string) => void;
  credit: (amount: number, type: TxType, note: string, notify?: { title: string; message: string }) => void;
  requestDeposit: (amount: number, channel: string, utr: string, bonusPct: number) => { ok: boolean; message: string };
  adminResolveDeposit: (id: string, approve: boolean, targetUid?: string) => void;
  requestWithdraw: (amount: number, method: "bank" | "upi", accountId: string) => { ok: boolean; message: string };
  adminResolveWithdraw: (id: string, approve: boolean, targetUid?: string) => void;
  addBankCard: (card: Omit<BankCard, "id">) => void;
  removeBankCard: (id: string) => void;
  addUpi: (upi: Omit<UpiAccount, "id">) => void;
  removeUpi: (id: string) => void;
  updateProfile: (patch: Partial<Pick<User, "nickname" | "avatar" | "phone" | "password">>) => void;
  checkIn: () => { ok: boolean; message: string };
  redeemGift: (code: string) => { ok: boolean; message: string };
  missionProgress: (m: MissionDef) => { progress: number; claimed: boolean; done: boolean };
  claimMission: (id: string) => { ok: boolean; message: string };
  rebateAvailable: () => number;
  claimRebate: () => { ok: boolean; message: string };
  claimVipReward: (level: number) => { ok: boolean; message: string };
  updateAdmin: (patch: Partial<AdminSettings>) => void;
  adminAdjustBalance: (amount: number, note: string, targetUid?: string) => void;
  markNotificationsRead: () => void;
  setSound: (v: boolean) => void;
  setLanguage: (v: string) => void;
  setAutoPlay: (v: boolean) => void;
  resetAll: () => void;
  isAdminAuthed: boolean;
  adminLogin: (pw: string) => boolean;
  adminLogout: () => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [sessionUid, setSessionUid] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [accounts, setAccounts] = useState<Account[]>(loadAccounts);
  const [storageVersion, setStorageVersion] = useState(0);

  const [{ path: route, query }, setRoute] = useState(parseHash);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isAdminAuthed, setAdminAuthed] = useState<boolean>(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === "1");

  // Persist user state (per account) and admin settings (global)
  useEffect(() => {
    if (sessionUid && state.user.uid === sessionUid) writeUserState(sessionUid, state);
    saveAdminSettings(state.admin);
  }, [state, sessionUid]);

  // Firebase cloud sync (best-effort; local data remains authoritative)
  useEffect(() => {
    if (!sessionUid || state.user.uid !== sessionUid) return;
    const u = state.user;
    void syncUserToCloud(sessionUid, {
      uid: u.uid, nickname: u.nickname, phone: u.phone, balance: u.balance,
      totalBet: u.totalBet, totalWin: u.totalWin, totalDeposit: u.totalDeposit,
      totalWithdraw: u.totalWithdraw, inviteCode: u.inviteCode, referredBy: u.referredBy,
      hasMadeDeposit: u.hasMadeDeposit,
    });
    state.deposits.slice(0, 20).forEach((d) =>
      void syncDepositToCloud({ ...d, uid: u.uid, user: u.nickname, phone: u.phone })
    );
    state.withdrawals.slice(0, 20).forEach((w) =>
      void syncWithdrawalToCloud({ ...w, uid: u.uid, user: u.nickname, phone: u.phone })
    );
  }, [state, sessionUid]);

  useEffect(() => {
    setSoundEnabled(state.settings.sound);
  }, [state.settings.sound]);

  // Hash routing
  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);

  const navigate = useCallback((path: string, replace = false) => {
    const target = `#${path.startsWith("/") ? path : `/${path}`}`;
    if (replace) {
      window.location.replace(`${window.location.pathname}${window.location.search}${target}`);
    } else {
      window.location.hash = target;
    }
  }, []);

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else navigate("/home");
  }, [navigate]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // ---------- Auth ----------
  const register = useCallback((args: RegisterArgs) => {
    const phone = args.phone.trim();
    const nickname = args.nickname.trim();
    const code = args.inviteCode.trim().toUpperCase();
    const existing = loadAccounts();
    if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false, message: "Enter a valid 10-digit Indian mobile number" };
    if (args.password.length < 6) return { ok: false, message: "Password must be at least 6 characters" };
    if (nickname && !/^[A-Za-z0-9_ ]{3,20}$/.test(nickname)) return { ok: false, message: "Nickname must be 3-20 letters or numbers" };
    if (existing.some((a) => a.phone === phone)) return { ok: false, message: "This mobile number is already registered. Please log in." };
    let referredBy: string | null = null;
    if (code) {
      const referrer = existing.find((a) => a.inviteCode === code);
      if (!referrer) return { ok: false, message: "Invite code not found. Check the code or leave it blank." };
      referredBy = referrer.inviteCode;
    }
    const account: Account = {
      uid: String(100000 + Math.floor(Math.random() * 899999)),
      phone,
      password: args.password,
      nickname: nickname || `Member${phone.slice(-4)}`,
      inviteCode: makeInviteCode(new Set(existing.map((a) => a.inviteCode))),
      referredBy,
      createdAt: Date.now(),
    };
    while (existing.some((a) => a.uid === account.uid)) account.uid = String(100000 + Math.floor(Math.random() * 899999));
    const nextAccounts = [...existing, account];
    saveAccounts(nextAccounts);
    setAccounts(nextAccounts);
    const fresh = makeDefaultState(account);
    writeUserState(account.uid, fresh);
    localStorage.setItem(SESSION_KEY, account.uid);
    setSessionUid(account.uid);
    stateRef.current = fresh;
    setState(fresh);
    setStorageVersion((v) => v + 1);
    return { ok: true, message: `Welcome ${account.nickname}! Your invite code is ${account.inviteCode}` };
  }, []);

  const login = useCallback((phoneRaw: string, password: string) => {
    const phone = phoneRaw.trim();
    const account = loadAccounts().find((a) => a.phone === phone);
    if (!account) return { ok: false, message: "No account found for this number. Please register." };
    const stored = readUserState(account.uid);
    const currentPassword = stored?.user.password || account.password;
    if (currentPassword !== password) return { ok: false, message: "Incorrect password" };
    const next = stored ?? makeDefaultState(account);
    localStorage.setItem(SESSION_KEY, account.uid);
    setSessionUid(account.uid);
    stateRef.current = next;
    setState(next);
    return { ok: true, message: `Welcome back, ${next.user.nickname}` };
  }, []);

  const logout = useCallback(() => {
    const s = stateRef.current;
    if (sessionUid && s.user.uid === sessionUid) writeUserState(sessionUid, s);
    localStorage.removeItem(SESSION_KEY);
    setSessionUid(null);
    const guest = makeDefaultState();
    stateRef.current = guest;
    setState(guest);
  }, [sessionUid]);

  const applyToUser = useCallback(
    (targetUid: string, reducer: (prev: AppState) => AppState) => {
      if (sessionUid && targetUid === sessionUid) {
        const next = reducer(stateRef.current);
        stateRef.current = next;
        setState(next);
      } else {
        const account = loadAccounts().find((a) => a.uid === targetUid);
        if (!account) return;
        const current = readUserState(targetUid) ?? makeDefaultState(account);
        writeUserState(targetUid, reducer(current));
      }
      setStorageVersion((v) => v + 1);
    },
    [sessionUid]
  );

  // ---------- Betting ----------
  const placeBet = useCallback(
    (args: PlaceBetArgs): string | null => {
      const s = stateRef.current;
      const amount = round2(args.amount);
      if (!localStorage.getItem(SESSION_KEY) || s.user.uid === "GUEST") {
        toast("Please log in or register to place a bet", "error");
        sfx.error();
        navigate("/login");
        return null;
      }
      if (!(amount > 0)) {
        toast("Enter a valid bet amount", "error");
        return null;
      }
      const limits = s.admin.gameControls[args.game];
      if (limits?.enabled === false) {
        toast("This game is temporarily unavailable", "error");
        sfx.error();
        return null;
      }
      if (limits && amount < limits.minBet) {
        toast(`Minimum bet for this game is ₹${limits.minBet}`, "error");
        sfx.error();
        return null;
      }
      if (limits && amount > limits.maxBet) {
        toast(`Maximum bet for this game is ₹${limits.maxBet}`, "error");
        sfx.error();
        return null;
      }
      if (s.user.balance < amount) {
        toast("Insufficient balance. Please deposit.", "error");
        sfx.error();
        return null;
      }
      const id = uid("B");
      stateRef.current = { ...s, user: { ...s.user, balance: round2(s.user.balance - amount) } };
      setState((prev) => {
        if (prev.user.balance < amount) return prev;
        const balanceAfter = round2(prev.user.balance - amount);
        const bet: BetRecord = { id, game: args.game, period: args.period, duration: args.duration, selection: args.selection, selectionLabel: args.selectionLabel, amount, payout: 0, result: "pending", detail: args.detail, createdAt: Date.now() };
        const prevLevel = getVipLevel(prev.user.totalBet).level;
        const newTotal = round2(prev.user.totalBet + amount);
        const newLevel = getVipLevel(newTotal).level;
        let notifications = prev.notifications;
        if (newLevel > prevLevel) notifications = pushNotification(prev, `VIP ${newLevel} unlocked`, `Congratulations! You reached VIP ${newLevel}. Claim your level-up reward in Account → VIP.`);
        return {
          ...prev,
          user: { ...prev.user, balance: balanceAfter, totalBet: newTotal },
          bets: [bet, ...prev.bets].slice(0, 600),
          transactions: pushTx(prev, { type: "bet", amount: -amount, balanceAfter, status: "success", note: `${GAME_LABELS[args.game] ?? args.game} · ${args.selectionLabel}` }),
          notifications,
        };
      });
      return id;
    },
    [toast, navigate]
  );

  const settleBet = useCallback((betId: string, payout: number, detail?: string) => {
    const p = round2(Math.max(0, payout));
    setState((prev) => {
      const bet = prev.bets.find((b) => b.id === betId);
      if (!bet || bet.result !== "pending") return prev;
      const balanceAfter = round2(prev.user.balance + p);
      const bets = prev.bets.map((b) => (b.id === betId ? { ...b, payout: p, result: p > 0 ? ("win" as const) : ("lose" as const), detail: detail ?? b.detail, settledAt: Date.now() } : b));
      const transactions = p > 0 ? pushTx(prev, { type: "win", amount: p, balanceAfter, status: "success", note: `${GAME_LABELS[bet.game] ?? bet.game} · ${bet.selectionLabel}` }) : prev.transactions;
      return { ...prev, user: { ...prev.user, balance: balanceAfter, totalWin: round2(prev.user.totalWin + p) }, bets, transactions };
    });
  }, []);

  const cancelBet = useCallback((betId: string) => {
    setState((prev) => {
      const bet = prev.bets.find((b) => b.id === betId);
      if (!bet || bet.result !== "pending") return prev;
      const balanceAfter = round2(prev.user.balance + bet.amount);
      return {
        ...prev,
        user: { ...prev.user, balance: balanceAfter, totalBet: Math.max(0, round2(prev.user.totalBet - bet.amount)) },
        bets: prev.bets.filter((b) => b.id !== betId),
        transactions: pushTx(prev, { type: "refund", amount: bet.amount, balanceAfter, status: "success", note: `${GAME_LABELS[bet.game] ?? bet.game} · bet cancelled` }),
      };
    });
  }, []);

  const credit = useCallback((amount: number, type: TxType, note: string, notify?: { title: string; message: string }) => {
    setState((prev) => creditReducer(prev, amount, type, note, notify));
  }, []);

  // Auto-settle pending lottery bets whose period has ended & forfeit stale instant bets
  useEffect(() => {
    const run = () => {
      const s = stateRef.current;
      const now = Date.now();
      const pending = s.bets.filter((b) => b.result === "pending");
      if (!pending.length) return;
      for (const b of pending) {
        if (LOTTERY_GAMES.includes(b.game as LotteryGame) && b.period && b.duration) {
          if (periodEndTs(b.period, b.duration) <= now) settleBet(b.id, calcLotteryPayout(b.game as LotteryGame, b.selection, b.amount, b.period, b.duration));
        } else if (now - b.createdAt > 10 * 60 * 1000) {
          settleBet(b.id, 0, "Forfeited (session ended)");
        }
      }
    };
    run();
    const t = setInterval(run, 2000);
    return () => clearInterval(t);
  }, [settleBet]);

  // ---------- Deposits ----------
  const requestDeposit = useCallback((amount: number, channel: string, utr: string, _bonusPct: number) => {
    const a = round2(amount);
    const channelConfig = DEPOSIT_CHANNELS.find((item) => item.name === channel);
    if (!(a > 0)) return { ok: false, message: "Enter a valid amount" };
    const min = Math.max(stateRef.current.admin.minDeposit, channelConfig?.min ?? 1);
    if (a < min) return { ok: false, message: `Minimum deposit is ₹${min}` };
    if (channelConfig && a > channelConfig.max) return { ok: false, message: `Maximum deposit is ₹${channelConfig.max}` };
    if (!/^\d{12}$/.test(utr)) return { ok: false, message: "UTR must be exactly 12 digits" };
    if (stateRef.current.deposits.some((d) => d.utr === utr)) return { ok: false, message: "This UTR has already been submitted" };
    setState((prev) => ({
      ...prev,
      deposits: [{ id: uid("D"), amount: a, bonus: round2((a * randPercent(prev.admin.bonuses.depositMin, prev.admin.bonuses.depositMax)) / 100), channel, utr, status: "pending", createdAt: Date.now() }, ...prev.deposits],
      transactions: pushTx(prev, { type: "deposit", amount: a, balanceAfter: prev.user.balance, status: "pending", note: `Deposit via ${channel} · UTR ${utr}` }),
      notifications: pushNotification(prev, "Deposit submitted", `Your deposit of ₹${a} is pending verification. UTR: ${utr}`),
    }));
    return { ok: true, message: "Deposit request submitted" };
  }, []);

  const adminResolveDeposit = useCallback(
    (id: string, approve: boolean, targetUid?: string) => {
      const target = targetUid ?? stateRef.current.user.uid;
      let firstDepositAmount = 0;
      let referredBy: string | null = null;
      let nickname = "";
      applyToUser(target, (prev) => {
        const r = resolveDepositReducer(prev, id, approve);
        firstDepositAmount = r.firstDepositAmount;
        referredBy = prev.user.referredBy;
        nickname = prev.user.nickname;
        return r.next;
      });
      if (approve && firstDepositAmount > 0 && referredBy) {
        const referrer = loadAccounts().find((a) => a.inviteCode === referredBy);
        if (referrer) {
          const refCfg = stateRef.current.admin.bonuses;
          const pct = randPercent(refCfg.referralMin, refCfg.referralMax);
          const bonus = round2((firstDepositAmount * pct) / 100);
          if (bonus > 0) {
            applyToUser(referrer.uid, (prev) => creditReducer(prev, bonus, "commission", `Referral bonus · ${nickname} (${target}) first deposit`, { title: "Referral bonus credited", message: `${nickname} made their first deposit. ₹${bonus} referral bonus added to your wallet.` }));
          }
        }
      }
    },
    [applyToUser]
  );

  // ---------- Withdrawals ----------
  const requestWithdraw = useCallback((amount: number, method: "bank" | "upi", accountId: string) => {
    const s = stateRef.current;
    const a = round2(amount);
    if (!(a > 0)) return { ok: false, message: "Enter a valid amount" };
    if (a < s.admin.minWithdraw) return { ok: false, message: `Minimum withdrawal is ₹${s.admin.minWithdraw}` };
    if (a > 50000) return { ok: false, message: "Maximum withdrawal per request is ₹50,000" };
    if (a > s.user.balance) return { ok: false, message: "Insufficient balance" };
    if (s.withdrawals.filter((w) => w.createdAt >= startOfDay()).length >= 3) return { ok: false, message: "You can make up to 3 withdrawal requests per day" };
    const required = Math.max(0, round2(s.user.totalDeposit - s.user.totalBet));
    if (required > 0) return { ok: false, message: `Bet ₹${required.toFixed(2)} more to unlock withdrawals` };
    let label = "";
    if (method === "bank") {
      const c = s.bankCards.find((x) => x.id === accountId);
      if (!c) return { ok: false, message: "Select a bank card" };
      label = `${c.bankName} ••••${c.accountNumber.slice(-4)}`;
    } else {
      const u = s.upiAccounts.find((x) => x.id === accountId);
      if (!u) return { ok: false, message: "Select a UPI ID" };
      label = `UPI ${u.upiId}`;
    }
    setState((prev) => {
      if (prev.user.balance < a) return prev;
      const balanceAfter = round2(prev.user.balance - a);
      return {
        ...prev,
        user: { ...prev.user, balance: balanceAfter },
        withdrawals: [{ id: uid("W"), amount: a, method, accountLabel: label, status: "pending", createdAt: Date.now() }, ...prev.withdrawals],
        transactions: pushTx(prev, { type: "withdraw", amount: -a, balanceAfter, status: "pending", note: `Withdrawal to ${label}` }),
        notifications: pushNotification(prev, "Withdrawal requested", `₹${a} withdrawal to ${label} is being processed.`),
      };
    });
    return { ok: true, message: "Withdrawal request submitted" };
  }, []);

  const adminResolveWithdraw = useCallback(
    (id: string, approve: boolean, targetUid?: string) => {
      applyToUser(targetUid ?? stateRef.current.user.uid, (prev) => resolveWithdrawReducer(prev, id, approve));
    },
    [applyToUser]
  );

  // ---------- Accounts ----------
  const addBankCard = useCallback((card: Omit<BankCard, "id">) => setState((prev) => ({ ...prev, bankCards: [...prev.bankCards, { ...card, id: uid("BC") }] })), []);
  const removeBankCard = useCallback((id: string) => setState((prev) => ({ ...prev, bankCards: prev.bankCards.filter((c) => c.id !== id) })), []);
  const addUpi = useCallback((u: Omit<UpiAccount, "id">) => setState((prev) => ({ ...prev, upiAccounts: [...prev.upiAccounts, { ...u, id: uid("UP") }] })), []);
  const removeUpi = useCallback((id: string) => setState((prev) => ({ ...prev, upiAccounts: prev.upiAccounts.filter((c) => c.id !== id) })), []);

  const updateProfile = useCallback((patch: Partial<Pick<User, "nickname" | "avatar" | "phone" | "password">>) => {
    setState((prev) => ({ ...prev, user: { ...prev.user, ...patch } }));
    if (patch.nickname || patch.password) {
      const next = loadAccounts().map((a) => (a.uid === stateRef.current.user.uid ? { ...a, nickname: patch.nickname ?? a.nickname, password: patch.password ?? a.password } : a));
      saveAccounts(next);
      setAccounts(next);
    }
  }, []);

  // ---------- Activity ----------
  const checkIn = useCallback(() => {
    const s = stateRef.current;
    const today = todayKey();
    if (s.activity.lastCheckIn === today) return { ok: false, message: "Already checked in today" };
    const yesterday = todayKey(startOfDay() - 1000);
    const streak = s.activity.lastCheckIn === yesterday ? (s.activity.streak % 7) + 1 : 1;
    const reward = ATTENDANCE_REWARDS[streak - 1];
    setState((prev) => {
      const balanceAfter = round2(prev.user.balance + reward);
      return {
        ...prev,
        user: { ...prev.user, balance: balanceAfter },
        activity: { ...prev.activity, lastCheckIn: today, streak, totalCheckIns: prev.activity.totalCheckIns + 1, checkInDays: [...prev.activity.checkInDays, today].slice(-60) },
        transactions: pushTx(prev, { type: "bonus", amount: reward, balanceAfter, status: "success", note: `Attendance day ${streak}` }),
        notifications: pushNotification(prev, "Attendance bonus", `Day ${streak} check-in complete. ₹${reward} credited!`),
      };
    });
    return { ok: true, message: `Day ${streak} check-in! ₹${reward} credited` };
  }, []);

  const redeemGift = useCallback((codeRaw: string) => {
    const code = codeRaw.trim().toUpperCase();
    const s = stateRef.current;
    if (!code) return { ok: false, message: "Enter a gift code" };
    const value = GIFT_CODES[code];
    if (!value) return { ok: false, message: "Invalid or expired gift code" };
    if (s.activity.redeemedCodes.includes(code)) return { ok: false, message: "You have already redeemed this code" };
    setState((prev) => {
      const balanceAfter = round2(prev.user.balance + value);
      return {
        ...prev,
        user: { ...prev.user, balance: balanceAfter },
        activity: { ...prev.activity, redeemedCodes: [...prev.activity.redeemedCodes, code] },
        transactions: pushTx(prev, { type: "bonus", amount: value, balanceAfter, status: "success", note: `Gift code ${code}` }),
        notifications: pushNotification(prev, "Gift redeemed", `Code ${code} redeemed successfully. ₹${value} credited.`),
      };
    });
    return { ok: true, message: `₹${value} bonus credited!` };
  }, []);

  const missionProgress = useCallback(
    (m: MissionDef) => {
      const s = stateRef.current;
      const dayStart = startOfDay();
      const todaysBets = s.bets.filter((b) => b.createdAt >= dayStart);
      let progress = 0;
      switch (m.type) {
        case "bets":
          progress = todaysBets.length;
          break;
        case "volume":
          progress = round2(todaysBets.reduce((a, b) => a + b.amount, 0));
          break;
        case "games":
          progress = new Set(todaysBets.map((b) => b.game)).size;
          break;
        case "deposit":
          progress = s.deposits.filter((d) => d.status === "approved" && (d.resolvedAt ?? 0) >= dayStart).length;
          break;
        case "checkin":
          progress = s.activity.lastCheckIn === todayKey() ? 1 : 0;
          break;
      }
      const claimed = (s.activity.claimedMissions[m.id] ?? []).includes(todayKey());
      return { progress: Math.min(progress, m.target), claimed, done: progress >= m.target };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  const claimMission = useCallback(
    (id: string) => {
      const m = MISSIONS.find((x) => x.id === id);
      if (!m) return { ok: false, message: "Mission not found" };
      const p = missionProgress(m);
      if (p.claimed) return { ok: false, message: "Already claimed today" };
      if (!p.done) return { ok: false, message: "Mission not complete yet" };
      setState((prev) => {
        const balanceAfter = round2(prev.user.balance + m.reward);
        return {
          ...prev,
          user: { ...prev.user, balance: balanceAfter },
          activity: { ...prev.activity, claimedMissions: { ...prev.activity.claimedMissions, [id]: [...(prev.activity.claimedMissions[id] ?? []), todayKey()] } },
          transactions: pushTx(prev, { type: "bonus", amount: m.reward, balanceAfter, status: "success", note: `Mission: ${m.title}` }),
        };
      });
      return { ok: true, message: `₹${m.reward} mission reward claimed!` };
    },
    [missionProgress]
  );

  const rebateAvailable = useCallback(() => {
    const s = stateRef.current;
    const rate = getVipLevel(s.user.totalBet).rebate;
    return round2((Math.max(0, s.user.totalBet - s.activity.rebateBaseline) * rate) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const claimRebate = useCallback(() => {
    const amount = rebateAvailable();
    if (amount < 0.01) return { ok: false, message: "No rebate available yet. Keep playing!" };
    setState((prev) => {
      const balanceAfter = round2(prev.user.balance + amount);
      return {
        ...prev,
        user: { ...prev.user, balance: balanceAfter },
        activity: { ...prev.activity, rebateBaseline: prev.user.totalBet, lastRebateClaim: Date.now() },
        transactions: pushTx(prev, { type: "rebate", amount, balanceAfter, status: "success", note: "Betting rebate" }),
      };
    });
    return { ok: true, message: `₹${amount.toFixed(2)} rebate credited!` };
  }, [rebateAvailable]);

  const claimVipReward = useCallback((level: number) => {
    const s = stateRef.current;
    const def = VIP_LEVELS.find((l) => l.level === level);
    if (!def || level === 0) return { ok: false, message: "Invalid level" };
    if (getVipLevel(s.user.totalBet).level < level) return { ok: false, message: "Level not reached yet" };
    if (s.activity.vipClaimed.includes(level)) return { ok: false, message: "Already claimed" };
    setState((prev) => {
      const balanceAfter = round2(prev.user.balance + def.levelUpReward);
      return {
        ...prev,
        user: { ...prev.user, balance: balanceAfter },
        activity: { ...prev.activity, vipClaimed: [...prev.activity.vipClaimed, level] },
        transactions: pushTx(prev, { type: "bonus", amount: def.levelUpReward, balanceAfter, status: "success", note: `VIP ${level} level-up reward` }),
      };
    });
    return { ok: true, message: `₹${def.levelUpReward} VIP reward claimed!` };
  }, []);

  // ---------- Admin ----------
  const updateAdmin = useCallback((patch: Partial<AdminSettings>) => {
    setState((prev) => {
      const admin = { ...prev.admin, ...patch };
      saveAdminSettings(admin);
      return { ...prev, admin };
    });
    setStorageVersion((v) => v + 1);
  }, []);

  const adminAdjustBalance = useCallback(
    (amount: number, note: string, targetUid?: string) => {
      const a = round2(amount);
      if (!a) return;
      applyToUser(targetUid ?? stateRef.current.user.uid, (prev) => adjustReducer(prev, a, note));
    },
    [applyToUser]
  );

  const markNotificationsRead = useCallback(() => setState((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) })), []);
  const setSound = useCallback((v: boolean) => setState((prev) => ({ ...prev, settings: { ...prev.settings, sound: v } })), []);
  const setLanguage = useCallback((v: string) => setState((prev) => ({ ...prev, settings: { ...prev.settings, language: v } })), []);
  const setAutoPlay = useCallback((v: boolean) => setState((prev) => ({ ...prev, settings: { ...prev.settings, autoPlay: v } })), []);

  const resetAll = useCallback(() => {
    loadAccounts().forEach((a) => localStorage.removeItem(`${STORAGE_PREFIX}${a.uid}`));
    localStorage.removeItem(ACCOUNTS_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_SETTINGS_KEY);
    setAccounts([]);
    setSessionUid(null);
    const fresh = makeDefaultState();
    stateRef.current = fresh;
    setState(fresh);
    setStorageVersion((v) => v + 1);
  }, []);

  const adminLogin = useCallback((pw: string) => {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      setAdminAuthed(true);
      return true;
    }
    return false;
  }, []);
  const adminLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminAuthed(false);
  }, []);

  const unreadCount = useMemo(() => state.notifications.filter((n) => !n.read).length, [state.notifications]);
  const isLoggedIn = !!sessionUid && state.user.uid === sessionUid;

  const value: AppContextValue = {
    state,
    route,
    query,
    navigate,
    back,
    toasts,
    toast,
    isLoggedIn,
    register,
    login,
    logout,
    accounts,
    storageVersion,
    applyToUser,
    placeBet,
    settleBet,
    cancelBet,
    credit,
    requestDeposit,
    adminResolveDeposit,
    requestWithdraw,
    adminResolveWithdraw,
    addBankCard,
    removeBankCard,
    addUpi,
    removeUpi,
    updateProfile,
    checkIn,
    redeemGift,
    missionProgress,
    claimMission,
    rebateAvailable,
    claimRebate,
    claimVipReward,
    updateAdmin,
    adminAdjustBalance,
    markNotificationsRead,
    setSound,
    setLanguage,
    setAutoPlay,
    resetAll,
    isAdminAuthed,
    adminLogin,
    adminLogout,
    unreadCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
