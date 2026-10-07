import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Banknote, Check, Download, Eye, EyeOff, Gamepad2, Image as ImageIcon, LayoutDashboard, ListChecks, LogOut, QrCode, Search, Settings2, Users, Wallet, X } from "lucide-react";
import { IMG, img } from "../assets/images";
import { cloudStatus, fetchCloudRecords, pingCloud, setCloudStatus, type CloudRecord } from "../lib/firebase";
import { AppState, loadAccounts, readUserState, useApp } from "../context/AppContext";
import { Button, Card, EmptyState, Pill, Stat, Tabs } from "../components/UI";
import { cn } from "../utils/cn";
import { formatDateTime, formatMoney } from "../utils/helpers";
import { sfx } from "../utils/audio";
import { AnnouncementDef, GAMES, GAME_LABELS, PromoBanner } from "../data";
import { BrandMark, gameArtwork } from "../components/GameArtwork";

const AdminLogin: React.FC = () => {
  const { adminLogin, navigate, toast } = useApp();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const submit = () => {
    if (adminLogin(pw)) {
      sfx.notify();
      toast("Welcome, administrator", "success");
    } else {
      sfx.error();
      setShake(true);
      setAttempts((a) => a + 1);
      setTimeout(() => setShake(false), 500);
      toast("Incorrect password", "error");
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className={cn("w-full max-w-sm space-y-4", shake && "animate-shake")}>
        <button onClick={() => navigate("/home")} className="flex items-center gap-1 text-xs text-white/50"><ArrowLeft size={14} /> Back to app</button>
        <div className="text-center">
          <BrandMark className="w-20 h-20 mx-auto drop-shadow-[0_0_20px_rgba(245,158,11,.25)]" />
          <h1 className="font-black text-xl mt-3">RubyWin Admin</h1>
          <p className="text-xs text-white/50">Restricted area · authorized personnel only</p>
        </div>
        <div className="relative">
          <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Admin password" className="w-full h-12 rounded-xl bg-black/30 border border-white/10 px-3 pr-11 text-sm outline-none focus:border-ruby-500" autoFocus />
          <button onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        {attempts > 0 && <p className="text-[11px] text-ruby-400 text-center">{attempts} failed attempt{attempts > 1 ? "s" : ""}</p>}
        <Button block size="lg" onClick={submit} disabled={!pw}>Sign in</Button>
      </Card>
    </div>
  );
};

interface UserSnapshot {
  uid: string;
  phone: string;
  nickname: string;
  inviteCode: string;
  referredBy: string | null;
  createdAt: number;
  state: AppState | null;
}

export const Admin: React.FC = () => {
  const { state, isAdminAuthed, adminLogout, navigate, toast, adminResolveDeposit, adminResolveWithdraw, updateAdmin, adminAdjustBalance, resetAll, storageVersion, isLoggedIn } = useApp();
  const [tab, setTab] = useState("overview");
  const [qr, setQr] = useState(state.admin.depositQr);
  const [upi, setUpi] = useState(state.admin.upiId);
  const [payee, setPayee] = useState(state.admin.payeeName);
  const [minDep, setMinDep] = useState(String(state.admin.minDeposit));
  const [minWd, setMinWd] = useState(String(state.admin.minWithdraw));
  const [notice, setNotice] = useState(state.admin.maintenanceNotice);
  const [adjust, setAdjust] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustUid, setAdjustUid] = useState("");
  const [qrError, setQrError] = useState(false);
  const [brandName, setBrandName] = useState(state.admin.brandName);
  const [logoUrl, setLogoUrl] = useState(state.admin.logoUrl);
  const [homeTagline, setHomeTagline] = useState(state.admin.homeTagline);
  const [banners, setBanners] = useState<PromoBanner[]>(state.admin.banners);
  const [announcements, setAnnouncements] = useState<AnnouncementDef[]>(state.admin.announcements);
  const [gameSearch, setGameSearch] = useState("");
  const [betSearch, setBetSearch] = useState("");
  const [betFilter, setBetFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [bonus, setBonus] = useState(state.admin.bonuses);
  const [cloud, setCloud] = useState<{ deposits: CloudRecord[]; withdrawals: CloudRecord[]; users: number }>({ deposits: [], withdrawals: [], users: 0 });
  const [cloudBusy, setCloudBusy] = useState(false);
  const cloudInfo = cloudStatus();

  // Aggregate every registered account (current session user is read live from state)
  const users: UserSnapshot[] = useMemo(() => {
    const accounts = loadAccounts();
    return accounts
      .map((a) => ({ uid: a.uid, phone: a.phone, nickname: a.nickname, inviteCode: a.inviteCode, referredBy: a.referredBy, createdAt: a.createdAt, state: isLoggedIn && state.user.uid === a.uid ? state : readUserState(a.uid) }))
      .sort((a, b) => b.createdAt - a.createdAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageVersion, state, isLoggedIn]);

  const allDeposits = useMemo(() => users.flatMap((u) => (u.state?.deposits ?? []).map((d) => ({ ...d, uid: u.uid, nickname: u.nickname, phone: u.phone }))).sort((a, b) => b.createdAt - a.createdAt), [users]);
  const allWithdrawals = useMemo(() => users.flatMap((u) => (u.state?.withdrawals ?? []).map((w) => ({ ...w, uid: u.uid, nickname: u.nickname, phone: u.phone, bankCards: u.state?.bankCards ?? [], upiAccounts: u.state?.upiAccounts ?? [] }))).sort((a, b) => b.createdAt - a.createdAt), [users]);
  const allBets = useMemo(() => users.flatMap((u) => (u.state?.bets ?? []).map((b) => ({ ...b, uid: u.uid, nickname: u.nickname }))).sort((a, b) => b.createdAt - a.createdAt), [users]);
  const pendingDeposits = allDeposits.filter((d) => d.status === "pending");
  const pendingWithdrawals = allWithdrawals.filter((w) => w.status === "pending");
  const filteredBets = allBets.filter((b) => {
    const text = `${b.id} ${b.game} ${b.selectionLabel} ${b.detail ?? ""} ${b.uid} ${b.nickname}`.toLowerCase();
    return (!betSearch || text.includes(betSearch.toLowerCase())) && (betFilter === "all" || b.result === betFilter);
  });
  const stats = useMemo(() => {
    const approvedDeposits = allDeposits.filter((d) => d.status === "approved").reduce((a, d) => a + d.amount, 0);
    const approvedWithdrawals = allWithdrawals.filter((w) => w.status === "approved").reduce((a, w) => a + w.amount, 0);
    const settled = allBets.filter((b) => b.result !== "pending");
    const wagered = settled.reduce((a, b) => a + b.amount, 0);
    const paid = settled.reduce((a, b) => a + b.payout, 0);
    const balances = users.reduce((a, u) => a + (u.state?.user.balance ?? 0), 0);
    return { approvedDeposits, approvedWithdrawals, wagered, paid, ggr: wagered - paid, bets: settled.length, balances };
  }, [allDeposits, allWithdrawals, allBets, users]);

  if (!isAdminAuthed) return <AdminLogin />;

  const saveSettings = () => {
    const md = parseInt(minDep, 10);
    const mw = parseInt(minWd, 10);
    if (qr && !/^(https?:\/\/|data:image\/)/i.test(qr.trim())) return toast("QR must be an http(s) URL or data:image URI", "error");
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi.trim())) return toast("Invalid UPI ID", "error");
    if (!(md >= 1) || !(mw >= 1)) return toast("Minimums must be positive numbers", "error");
    const cleanBonus = {
      welcomeText: bonus.welcomeText.trim().slice(0, 24),
      welcomeMin: Math.max(1, Math.round(bonus.welcomeMin)),
      welcomeMax: Math.max(Math.round(bonus.welcomeMin), Math.round(bonus.welcomeMax)),
      depositText: bonus.depositText.trim().slice(0, 24),
      depositMin: Math.max(0, Number(bonus.depositMin.toFixed ? bonus.depositMin.toFixed(2) : bonus.depositMin)),
      depositMax: Math.max(Number(bonus.depositMin.toFixed ? bonus.depositMin.toFixed(2) : bonus.depositMin), Number(bonus.depositMax.toFixed ? bonus.depositMax.toFixed(2) : bonus.depositMax)),
      referralText: bonus.referralText.trim().slice(0, 24),
      referralMin: Math.max(0, Number(bonus.referralMin.toFixed ? bonus.referralMin.toFixed(2) : bonus.referralMin)),
      referralMax: Math.max(Number(bonus.referralMin.toFixed ? bonus.referralMin.toFixed(2) : bonus.referralMin), Number(bonus.referralMax.toFixed ? bonus.referralMax.toFixed(2) : bonus.referralMax)),
    };
    updateAdmin({ depositQr: qr.trim(), upiId: upi.trim(), payeeName: payee.trim() || "Suman Singh", minDeposit: md, minWithdraw: mw, bonuses: cleanBonus });
    setBonus(cleanBonus);
    sfx.notify();
    toast("Payment & bonus settings saved", "success");
  };

  const loadCloud = async () => {
    setCloudBusy(true);
    await pingCloud();
    const data = await fetchCloudRecords();
    setCloud(data);
    setCloudBusy(false);
    toast(cloudStatus().status === "online" ? `Cloud synced · ${data.users} users` : `Cloud error: ${cloudStatus().error.slice(0, 60)}`, cloudStatus().status === "online" ? "success" : "error");
  };

  const resolveCloud = async (kind: "deposits" | "withdrawals", rec: CloudRecord, approve: boolean) => {
    await setCloudStatus(kind, rec.id, approve ? "approved" : "rejected");
    if (kind === "deposits" && approve) adminResolveDeposit(rec.id, true, rec.uid);
    if (kind === "withdrawals" && approve) adminResolveWithdraw(rec.id, true, rec.uid);
    sfx.notify();
    toast(`Cloud ${kind} ${approve ? "approved" : "rejected"}`, "success");
    await loadCloud();
  };

  const resolveDeposit = (id: string, targetUid: string, ok: boolean) => {
    adminResolveDeposit(id, ok, targetUid);
    if (ok) sfx.win(); else sfx.error();
    toast(ok ? "Deposit approved & balance credited" : "Deposit rejected", ok ? "success" : "info");
  };
  const resolveWithdraw = (id: string, targetUid: string, ok: boolean) => {
    adminResolveWithdraw(id, ok, targetUid);
    if (ok) sfx.win(); else sfx.error();
    toast(ok ? "Withdrawal marked as paid" : "Withdrawal rejected & refunded", ok ? "success" : "info");
  };

  const patchBanner = (id: string, patch: Partial<PromoBanner>) => setBanners((items) => items.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const patchAnnouncement = (index: number, patch: Partial<AnnouncementDef>) => setAnnouncements((items) => items.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const readImage = (file: File | undefined, maxSize: number, onDone: (dataUrl: string) => void, square = false) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Choose an image file", "error");
    if (file.size > 12 * 1024 * 1024) return toast("Choose an image under 12 MB", "error");
    const reader = new FileReader();
    reader.onerror = () => toast("Could not read that image", "error");
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => toast("Could not decode that image", "error");
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return toast("Image processing is not available", "error");
        if (square) {
          canvas.width = maxSize;
          canvas.height = maxSize;
          const scale = Math.min(maxSize / image.width, maxSize / image.height);
          const w = image.width * scale;
          const h = image.height * scale;
          context.drawImage(image, (maxSize - w) / 2, (maxSize - h) / 2, w, h);
          onDone(canvas.toDataURL("image/png"));
        } else {
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          onDone(canvas.toDataURL("image/jpeg", 0.78));
        }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveContent = () => {
    if (!brandName.trim()) return toast("Brand name cannot be empty", "error");
    if (banners.some((b) => !b.title.trim() || !b.cta.trim())) return toast("Every poster needs a title and button label", "error");
    updateAdmin({ brandName: brandName.trim().slice(0, 28), logoUrl, homeTagline: homeTagline.trim().slice(0, 80), banners, announcements, maintenanceNotice: notice.trim().slice(0, 240) });
    sfx.notify();
    toast("Home content published", "success");
  };

  const updateGameControl = (id: string, patch: Partial<{ enabled: boolean; minBet: number; maxBet: number }>) => {
    const current = state.admin.gameControls[id] ?? { enabled: true, minBet: 1, maxBet: 100000 };
    const next = { ...current, ...patch };
    if (next.minBet > next.maxBet) next.maxBet = next.minBet;
    updateAdmin({ gameControls: { ...state.admin.gameControls, [id]: next } });
  };

  const exportData = () => {
    const payload = { admin: state.admin, users: users.map((u) => ({ account: { uid: u.uid, phone: u.phone, nickname: u.nickname, inviteCode: u.inviteCode, referredBy: u.referredBy, createdAt: u.createdAt }, state: u.state })) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rubywin-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upiPreview = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(payee)}&cu=INR`;
  const filteredUsers = users.filter((u) => !userSearch || `${u.uid} ${u.phone} ${u.nickname} ${u.inviteCode}`.toLowerCase().includes(userSearch.toLowerCase()));
  const statusPill = (s: string) => <Pill className={s === "approved" ? "bg-emerald-500/20 text-emerald-300" : s === "pending" ? "bg-gold-500/20 text-gold-300" : "bg-ruby-500/20 text-ruby-300"}>{s.toUpperCase()}</Pill>;

  const NAV = [
    { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={18} />, badge: 0 },
    { id: "users", label: "Users", icon: <Users size={18} />, badge: 0, count: users.length },
    { id: "deposits", label: "Deposits", icon: <Wallet size={18} />, badge: pendingDeposits.length },
    { id: "withdrawals", label: "Withdrawals", icon: <Banknote size={18} />, badge: pendingWithdrawals.length },
    { id: "bets", label: "All bets", icon: <ListChecks size={18} />, badge: 0 },
    { id: "content", label: "Posters & logo", icon: <ImageIcon size={18} />, badge: 0 },
    { id: "games", label: "Game controls", icon: <Gamepad2 size={18} />, badge: 0 },
    { id: "settings", label: "UPI & payments", icon: <QrCode size={18} />, badge: 0 },
  ];
  const current = NAV.find((n) => n.id === tab) ?? NAV[0];

  return (
    <div className="min-h-screen md:flex bg-night-950">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-night-900 border-r border-white/5">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-white/5"><BrandMark className="w-10 h-10" /><div><p className="font-black text-sm">{state.admin.brandName}</p><p className="text-[10px] text-gold-300 font-bold tracking-widest">ADMIN PANEL</p></div></div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={cn("w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-bold transition", tab === n.id ? "grad-red shadow-lg shadow-ruby-600/30" : "text-white/60 hover:bg-white/5 hover:text-white")}>
              {n.icon}<span className="flex-1 text-left">{n.label}</span>
              {n.badge > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-gold-400 text-night-950 text-[10px] font-black flex items-center justify-center">{n.badge}</span>}
              {"count" in n && n.count ? <span className="text-[10px] text-white/50">{n.count}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5 space-y-2">
          <Button block variant="dark" size="sm" onClick={() => navigate("/home")}><ArrowLeft size={14} /> Back to site</Button>
          <Button block variant="danger" size="sm" onClick={() => { adminLogout(); toast("Signed out", "info"); }}><LogOut size={14} /> Sign out</Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-10">
        <header className="sticky top-0 z-40 backdrop-blur-md bg-night-900/90 border-b border-white/5">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-2"><BrandMark className="w-9 h-9 md:hidden" /><div><p className="font-black text-base leading-tight">{current.label}</p><p className="text-[10px] text-white/50">{state.admin.brandName} admin · {users.length} users · {pendingDeposits.length + pendingWithdrawals.length} pending</p></div></div>
            <div className="flex items-center gap-1 md:hidden">
              <button onClick={() => navigate("/home")} className="px-2 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 rounded-lg">Site</button>
              <button onClick={() => { adminLogout(); toast("Signed out", "info"); }} className="p-2 rounded-full hover:bg-white/10 text-ruby-400"><LogOut size={18} /></button>
            </div>
          </div>
          {/* Mobile nav */}
          <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar px-3 pb-3">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setTab(n.id)} className={cn("relative shrink-0 flex flex-col items-center justify-center gap-1 w-[76px] h-16 rounded-xl text-[10px] font-bold border transition", tab === n.id ? "grad-red border-transparent" : "bg-white/5 border-white/10 text-white/60")}>
                {n.icon}{n.label}
                {n.badge > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-gold-400 text-night-950 text-[9px] font-black flex items-center justify-center">{n.badge}</span>}
              </button>
            ))}
          </div>
        </header>

      <div className="px-3 md:px-6 pt-4 space-y-4 max-w-5xl">
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Registered users" value={users.length} valueClass="text-gold-400" />
              <Stat label="Total user balances" value={formatMoney(stats.balances)} valueClass="text-gold-400" />
              <Stat label="Approved deposits" value={formatMoney(stats.approvedDeposits)} valueClass="text-emerald-400" />
              <Stat label="Approved withdrawals" value={formatMoney(stats.approvedWithdrawals)} valueClass="text-sky-400" />
              <Stat label="Gross gaming revenue" value={`${stats.ggr >= 0 ? "+" : ""}${formatMoney(stats.ggr)}`} valueClass={stats.ggr >= 0 ? "text-emerald-400" : "text-ruby-400"} />
              <Stat label="Total wagered" value={formatMoney(stats.wagered)} />
              <Stat label="Settled bets" value={stats.bets} />
              <Stat label="Referral links active" value={users.filter((u) => u.referredBy).length} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTab("deposits")} className={cn("rounded-2xl p-4 text-left border card-shadow btn-press", pendingDeposits.length ? "grad-red border-transparent animate-pulse-soft" : "grad-dark border-white/5")}><p className="text-3xl font-black">{pendingDeposits.length}</p><p className="text-xs font-semibold">Pending deposits</p></button>
              <button onClick={() => setTab("withdrawals")} className={cn("rounded-2xl p-4 text-left border card-shadow btn-press", pendingWithdrawals.length ? "grad-blue border-transparent animate-pulse-soft" : "grad-dark border-white/5")}><p className="text-3xl font-black">{pendingWithdrawals.length}</p><p className="text-xs font-semibold">Pending withdrawals</p></button>
            </div>
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 font-bold text-sm">Latest activity</div>
              <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                {allBets.length === 0 && <EmptyState text="No bets yet" />}
                {allBets.slice(0, 25).map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-2 text-xs"><div><p className="font-bold">{GAME_LABELS[b.game] ?? b.game} · {b.selectionLabel}</p><p className="text-[10px] text-white/40">{b.nickname} · {b.uid} · {formatDateTime(b.createdAt)}</p></div><div className="text-right"><p>{formatMoney(b.amount)}</p><p className={cn("font-bold", b.result === "win" ? "text-emerald-400" : b.result === "lose" ? "text-ruby-400" : "text-gold-400")}>{b.result === "pending" ? "pending" : b.result === "win" ? `+${formatMoney(b.payout)}` : "lost"}</p></div></div>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === "users" && (
          <>
            <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search UID, mobile, nickname or invite code" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 pl-9 pr-3 text-sm outline-none" /></div>
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm">Firebase cloud sync</h2>
                <Pill className={cloudInfo.status === "online" ? "bg-emerald-500/20 text-emerald-300" : cloudInfo.status === "error" ? "bg-ruby-500/20 text-ruby-300" : "bg-gold-500/20 text-gold-300"}>{cloudInfo.status.toUpperCase()}{cloudInfo.verified ? " ✓" : ""}</Pill>
              </div>
              <p className="text-[11px] text-white/50">Users, deposits and withdrawals are mirrored to Firestore (project <b className="text-white/70">allotp-bf5c8</b>). Local data stays authoritative if the cloud is unavailable.</p>
              {cloudInfo.status === "error" && <p className="text-[10px] text-ruby-300 break-words">{cloudInfo.error}</p>}
              <Button block variant="outline" loading={cloudBusy} onClick={loadCloud}>{cloudBusy ? "Syncing…" : "Sync & load cloud requests"}</Button>
              {cloud.users > 0 && <p className="text-[11px] text-white/60">Cloud users: <b className="text-gold-300">{cloud.users}</b> · deposits {cloud.deposits.length} · withdrawals {cloud.withdrawals.length}</p>}
              {cloud.deposits.filter((d) => d.status === "pending").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gold-300">Cloud deposits awaiting approval</p>
                  {cloud.deposits.filter((d) => d.status === "pending").map((d) => (
                    <div key={d.id} className="rounded-xl border border-gold-500/25 bg-black/25 p-3">
                      <div className="flex items-center justify-between"><p className="font-black text-gold-300">{formatMoney(d.amount)}</p><span className="text-[10px] text-white/50 font-mono">{d.id}</span></div>
                      <p className="text-[11px] text-white/60 mt-1">{d.user ?? "Unknown"} · UID {d.uid} · {d.channel ?? "UPI"}</p>
                      <p className="text-[11px] text-white/60">UTR <b className="font-mono text-white/80">{d.utr ?? "—"}</b> · {d.createdAt ? formatDateTime(d.createdAt) : ""}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2"><Button size="sm" variant="danger" onClick={() => resolveCloud("deposits", d, false)}>Reject</Button><Button size="sm" variant="green" onClick={() => resolveCloud("deposits", d, true)}>Approve</Button></div>
                    </div>
                  ))}
                </div>
              )}
              {cloud.withdrawals.filter((w) => w.status === "pending").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-sky-300">Cloud withdrawals awaiting approval</p>
                  {cloud.withdrawals.filter((w) => w.status === "pending").map((w) => (
                    <div key={w.id} className="rounded-xl border border-sky-500/25 bg-black/25 p-3">
                      <div className="flex items-center justify-between"><p className="font-black text-sky-300">{formatMoney(w.amount)}</p><span className="text-[10px] text-white/50 font-mono">{w.id}</span></div>
                      <p className="text-[11px] text-white/60 mt-1">{w.user ?? "Unknown"} · UID {w.uid} · {w.accountLabel ?? w.method}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2"><Button size="sm" variant="danger" onClick={() => resolveCloud("withdrawals", w, false)}>Reject</Button><Button size="sm" variant="green" onClick={() => resolveCloud("withdrawals", w, true)}>Approve</Button></div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="space-y-3">
              <h2 className="font-bold text-sm">Manual balance adjustment</h2>
              <select value={adjustUid} onChange={(e) => setAdjustUid(e.target.value)} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none">
                <option value="" className="bg-night-800">Select a user…</option>
                {users.map((u) => <option key={u.uid} value={u.uid} className="bg-night-800">{u.nickname} · {u.phone} · UID {u.uid}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={adjust} onChange={(e) => setAdjust(e.target.value.replace(/[^\d.-]/g, ""))} placeholder="+500 or -200" className="w-32 h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
                <input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason / note" className="flex-1 h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
              </div>
              <Button block variant="gold" disabled={!parseFloat(adjust) || !adjustUid} onClick={() => { adminAdjustBalance(parseFloat(adjust), adjustNote, adjustUid); setAdjust(""); setAdjustNote(""); sfx.coin(); toast("Balance adjusted", "success"); }}>Apply adjustment</Button>
            </Card>
            {filteredUsers.length === 0 && <Card><EmptyState text={users.length ? "No users match" : "No registered users yet. New accounts appear here as soon as they sign up."} /></Card>}
            {filteredUsers.map((u) => {
              const s = u.state;
              const referrer = u.referredBy ? users.find((x) => x.inviteCode === u.referredBy) : null;
              const referrals = users.filter((x) => x.referredBy === u.inviteCode).length;
              return (
                <Card key={u.uid} className="space-y-2">
                  <div className="flex items-center justify-between gap-2"><div><p className="font-black text-sm flex items-center gap-2"><Users size={14} className="text-gold-400" /> {u.nickname} <span className="text-[10px] font-mono text-white/40">UID {u.uid}</span></p><p className="text-[11px] text-white/50">{u.phone} · joined {formatDateTime(u.createdAt)}</p></div>{s?.user.hasMadeDeposit ? <Pill className="bg-emerald-500/20 text-emerald-300">DEPOSITED</Pill> : <Pill className="bg-gold-500/20 text-gold-300">NO DEPOSIT YET</Pill>}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-1 gap-x-3 text-[11px] text-white/65">
                    <span>Balance <b className="text-gold-300 float-right">{formatMoney(s?.user.balance ?? 0)}</b></span>
                    <span>Deposits <b className="text-white float-right">{formatMoney(s?.user.totalDeposit ?? 0)}</b></span>
                    <span>Withdrawals <b className="text-white float-right">{formatMoney(s?.user.totalWithdraw ?? 0)}</b></span>
                    <span>Wagered <b className="text-white float-right">{formatMoney(s?.user.totalBet ?? 0)}</b></span>
                    <span>Invite code <b className="text-gold-300 font-mono float-right">{u.inviteCode}</b></span>
                    <span>Referred by <b className="text-white float-right">{referrer ? `${referrer.nickname} (${referrer.uid})` : "—"}</b></span>
                    <span>Referrals <b className="text-white float-right">{referrals}</b></span>
                    <span>Bank / UPI <b className="text-white float-right">{s?.bankCards.length ?? 0} / {s?.upiAccounts.length ?? 0}</b></span>
                  </div>
                  <button onClick={() => { setAdjustUid(u.uid); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-[10px] font-bold text-ruby-300">Adjust this user's balance</button>
                </Card>
              );
            })}
            <Card className="space-y-2">
              <h2 className="font-bold text-sm">Data</h2>
              <Button block variant="outline" onClick={exportData}><Download size={16} /> Export all data (JSON)</Button>
              <Button block variant="danger" onClick={() => { if (window.confirm("Reset ALL local data? This deletes every registered account and clears admin settings.")) { resetAll(); toast("All data reset", "info"); } }}>Reset platform data</Button>
            </Card>
          </>
        )}

        {tab === "deposits" && (
          <>
            <h2 className="font-bold text-sm px-1 flex items-center gap-2"><Wallet size={16} className="text-gold-400" /> Pending approval queue · all users</h2>
            {pendingDeposits.length === 0 && <Card><EmptyState text="Queue is empty" /></Card>}
            {pendingDeposits.map((d) => (
              <Card key={d.id} className="space-y-3 border-gold-500/30">
                <div className="flex items-center justify-between"><p className="font-black text-xl text-gold-400">{formatMoney(d.amount)}</p>{statusPill(d.status)}</div>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-white/70">
                  <span>User</span><span className="text-right text-white font-bold">{d.nickname} · {d.phone}</span>
                  <span>UID</span><span className="text-right font-mono">{d.uid}</span>
                  <span>Channel</span><span className="text-right font-bold text-white">{d.channel}</span>
                  <span>UTR</span><span className="text-right font-mono text-white">{d.utr}</span>
                  <span>Bonus</span><span className="text-right text-emerald-400">+{formatMoney(d.bonus)}</span>
                  <span>Submitted</span><span className="text-right">{formatDateTime(d.createdAt)}</span>
                  <span>Order</span><span className="text-right font-mono">{d.id}</span>
                </div>
                <div className="grid grid-cols-2 gap-2"><Button variant="danger" onClick={() => resolveDeposit(d.id, d.uid, false)}><X size={16} /> Reject</Button><Button variant="green" onClick={() => resolveDeposit(d.id, d.uid, true)}><Check size={16} /> Approve</Button></div>
              </Card>
            ))}
            <h2 className="font-bold text-sm px-1 pt-2">History</h2>
            <Card className="p-0 divide-y divide-white/5">
              {allDeposits.filter((d) => d.status !== "pending").length === 0 && <EmptyState text="No processed deposits" />}
              {allDeposits.filter((d) => d.status !== "pending").map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5 text-xs"><div><p className="font-bold">{formatMoney(d.amount)} · {d.channel} · {d.nickname}</p><p className="text-[10px] text-white/40">UTR {d.utr} · {formatDateTime(d.resolvedAt ?? d.createdAt)}</p></div>{statusPill(d.status)}</div>
              ))}
            </Card>
          </>
        )}

        {tab === "withdrawals" && (
          <>
            <h2 className="font-bold text-sm px-1">Pending withdrawals · all users</h2>
            {pendingWithdrawals.length === 0 && <Card><EmptyState text="No pending withdrawals" /></Card>}
            {pendingWithdrawals.map((w) => (
              <Card key={w.id} className="space-y-3 border-sky-500/30">
                <div className="flex items-center justify-between"><p className="font-black text-xl text-sky-400">{formatMoney(w.amount)}</p>{statusPill(w.status)}</div>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-white/70">
                  <span>User</span><span className="text-right text-white font-bold">{w.nickname} · {w.phone}</span>
                  <span>UID</span><span className="text-right font-mono">{w.uid}</span>
                  <span>Method</span><span className="text-right font-bold text-white uppercase">{w.method}</span>
                  <span>Account</span><span className="text-right text-white">{w.accountLabel}</span>
                  <span>Requested</span><span className="text-right">{formatDateTime(w.createdAt)}</span>
                </div>
                {w.method === "bank" && w.bankCards.map((c) => w.accountLabel.endsWith(c.accountNumber.slice(-4)) && <div key={c.id} className="rounded-lg bg-black/30 p-2 text-[11px] font-mono">{c.holder} · {c.accountNumber} · {c.ifsc} · {c.phone}</div>)}
                {w.method === "upi" && w.upiAccounts.map((c) => w.accountLabel.includes(c.upiId) && <div key={c.id} className="rounded-lg bg-black/30 p-2 text-[11px] font-mono">{c.holder} · {c.upiId} · {c.app}</div>)}
                <div className="grid grid-cols-2 gap-2"><Button variant="danger" onClick={() => resolveWithdraw(w.id, w.uid, false)}><X size={16} /> Reject & refund</Button><Button variant="green" onClick={() => resolveWithdraw(w.id, w.uid, true)}><Check size={16} /> Mark paid</Button></div>
              </Card>
            ))}
            <h2 className="font-bold text-sm px-1 pt-2">History</h2>
            <Card className="p-0 divide-y divide-white/5">
              {allWithdrawals.filter((w) => w.status !== "pending").length === 0 && <EmptyState text="No processed withdrawals" />}
              {allWithdrawals.filter((w) => w.status !== "pending").map((w) => (
                <div key={w.id} className="flex items-center justify-between px-4 py-2.5 text-xs"><div><p className="font-bold">{formatMoney(w.amount)} · {w.accountLabel} · {w.nickname}</p><p className="text-[10px] text-white/40">{formatDateTime(w.resolvedAt ?? w.createdAt)}</p></div>{statusPill(w.status)}</div>
              ))}
            </Card>
          </>
        )}

        {tab === "bets" && (
          <>
            <div className="grid grid-cols-3 gap-2"><Stat label="All records" value={allBets.length} /><Stat label="Pending" value={allBets.filter((b) => b.result === "pending").length} valueClass="text-gold-400" /><Stat label="Settled" value={allBets.filter((b) => b.result !== "pending").length} valueClass="text-emerald-400" /></div>
            <input value={betSearch} onChange={(e) => setBetSearch(e.target.value)} placeholder="Search bet ID, game, selection, user" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
            <Tabs tabs={[{ id: "all", label: "All" }, { id: "pending", label: "Pending" }, { id: "win", label: "Won" }, { id: "lose", label: "Lost" }]} active={betFilter} onChange={setBetFilter} />
            <p className="text-xs text-white/45 px-1">Showing {filteredBets.length} bet records across all users. Outcomes are generated by the game RNG and are not editable.</p>
            {filteredBets.length === 0 && <Card><EmptyState text="No matching bets" /></Card>}
            {filteredBets.slice(0, 200).map((b) => (
              <Card key={b.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black">{GAME_LABELS[b.game] ?? b.game}</p><p className="text-xs text-white/60 truncate">{b.selectionLabel}</p></div><Pill className={b.result === "win" ? "bg-emerald-500/20 text-emerald-300" : b.result === "lose" ? "bg-ruby-500/20 text-ruby-300" : "bg-gold-500/20 text-gold-300"}>{b.result.toUpperCase()}</Pill></div>
                <div className="grid grid-cols-2 gap-y-1 text-[11px] text-white/60"><span>Bet ID</span><span className="text-right font-mono text-white/80">{b.id}</span><span>User</span><span className="text-right">{b.nickname} · {b.uid}</span><span>Stake</span><span className="text-right font-bold text-white">{formatMoney(b.amount)}</span><span>Return</span><span className="text-right font-bold text-emerald-400">{formatMoney(b.payout)}</span><span>Placed</span><span className="text-right">{formatDateTime(b.createdAt)}</span><span>Period</span><span className="text-right font-mono">{b.period ?? "Instant round"}</span><span>Outcome</span><span className="text-right">{b.detail ?? "Awaiting result"}</span></div>
              </Card>
            ))}
          </>
        )}

        {tab === "content" && (
          <>
            <Card className="space-y-3 grad-ruby-card border-gold-400/20">
              <h2 className="font-black text-base">Home screen content</h2>
              <p className="text-[11px] text-white/65">Changes are saved in this browser and shown to every user. Poster uploads are resized and compressed before they are stored.</p>
              <div><p className="text-xs text-white/70 mb-1">Brand name</p><input value={brandName} maxLength={28} onChange={(e) => setBrandName(e.target.value)} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm font-bold outline-none" /></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-night-900 border border-white/10 flex items-center justify-center overflow-hidden"><img src={img(logoUrl, IMG.logo)} alt="Logo preview" className="w-14 h-14 object-contain" /></div>
                <div className="flex-1 min-w-0"><p className="text-xs font-bold">Brand logo</p><input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/images/rubywin-mark.svg or image URL" className="mt-2 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-[10px] font-mono outline-none" /></div>
                <label className="shrink-0 rounded-lg border border-gold-400/40 bg-gold-500/10 px-2 py-2 text-[10px] font-bold text-gold-200 cursor-pointer">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], 512, (url) => { setLogoUrl(url); toast("Logo ready to publish", "success"); }, true)} /></label>
              </div>
              <button onClick={() => setLogoUrl("/images/rubywin-logo.svg")} className="text-[10px] font-bold text-white/45">Restore original RubyWin logo</button>
              <div><p className="text-xs text-white/70 mb-1">Home tagline</p><input value={homeTagline} maxLength={80} onChange={(e) => setHomeTagline(e.target.value)} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" /></div>
              <div><p className="text-xs text-white/70 mb-1">Scrolling announcement</p><textarea value={notice} maxLength={240} onChange={(e) => setNotice(e.target.value)} rows={2} placeholder="Leave blank for the default notice" className="w-full rounded-xl bg-black/30 border border-white/10 p-3 text-sm outline-none resize-none" /></div>
            </Card>
            {banners.map((banner, index) => (
              <Card key={banner.id} className="space-y-3">
                <div className="flex items-center justify-between"><h3 className="font-black text-sm">Poster {index + 1}</h3><button onClick={() => patchBanner(banner.id, { enabled: !banner.enabled })} className={cn("w-12 h-6 rounded-full relative transition", banner.enabled ? "grad-green" : "bg-white/15")} aria-label="Toggle poster"><span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", banner.enabled ? "left-6" : "left-0.5")} /></button></div>
                <div className="h-36 rounded-xl overflow-hidden border border-white/10 bg-night-900" style={{ backgroundImage: `linear-gradient(90deg, rgba(22,5,12,.92), rgba(22,5,12,.12)), url("${img(banner.imageUrl)}")`, backgroundPosition: "center", backgroundSize: "cover" }}>
                  <div className="h-full flex flex-col justify-center p-4"><p className="text-lg font-black">{banner.title}</p><p className="text-[11px] text-white/75">{banner.subtitle}</p><span className="mt-2 text-[10px] font-black text-gold-300">{banner.cta} →</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-white/50 mb-1">Poster title</p><input value={banner.title} onChange={(e) => patchBanner(banner.id, { title: e.target.value.slice(0, 42) })} className="w-full h-10 rounded-lg bg-black/30 border border-white/10 px-2 text-xs outline-none" /></div>
                  <div><p className="text-[10px] text-white/50 mb-1">Button label</p><input value={banner.cta} onChange={(e) => patchBanner(banner.id, { cta: e.target.value.slice(0, 24) })} className="w-full h-10 rounded-lg bg-black/30 border border-white/10 px-2 text-xs outline-none" /></div>
                </div>
                <div><p className="text-[10px] text-white/50 mb-1">Poster subtitle</p><textarea value={banner.subtitle} rows={2} onChange={(e) => patchBanner(banner.id, { subtitle: e.target.value.slice(0, 90) })} className="w-full rounded-lg bg-black/30 border border-white/10 p-2 text-xs outline-none resize-none" /></div>
                <div className="grid grid-cols-2 gap-2"><div><p className="text-[10px] text-white/50 mb-1">Button destination</p><input value={banner.route} onChange={(e) => patchBanner(banner.id, { route: e.target.value.startsWith("/") ? e.target.value : `/${e.target.value}` })} className="w-full h-10 rounded-lg bg-black/30 border border-white/10 px-2 text-xs font-mono outline-none" /></div><label className="h-10 self-end rounded-lg border border-gold-400/40 bg-gold-500/10 flex items-center justify-center text-xs font-bold text-gold-200 cursor-pointer">Upload / change image<input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], 1400, (url) => { patchBanner(banner.id, { imageUrl: url }); toast("Poster image added to preview", "success"); })} /></label></div>
                <button onClick={() => patchBanner(banner.id, { imageUrl: "/images/rubywin-poster.png" })} className="text-[10px] font-bold text-white/45">Restore RubyWin poster image</button>
              </Card>
            ))}
            <Card className="space-y-3">
              <div className="flex items-center justify-between"><div><h3 className="font-black text-sm">Announcements</h3><p className="text-[10px] text-white/45">Shown on the Announcement page</p></div><Button size="sm" variant="outline" onClick={() => setAnnouncements((items) => [...items, { title: "New announcement", body: "Add your announcement text here." }])}>Add</Button></div>
              {announcements.map((announcement, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                  <div className="flex items-center gap-2"><input value={announcement.title} onChange={(e) => patchAnnouncement(index, { title: e.target.value.slice(0, 70) })} className="flex-1 h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs font-bold outline-none" /><button onClick={() => setAnnouncements((items) => items.filter((_, i) => i !== index))} className="w-9 h-9 rounded-lg bg-ruby-500/15 text-ruby-300 text-lg">×</button></div>
                  <textarea value={announcement.body} onChange={(e) => patchAnnouncement(index, { body: e.target.value.slice(0, 400) })} rows={3} className="w-full rounded-lg bg-black/30 border border-white/10 p-2 text-xs outline-none resize-none" />
                </div>
              ))}
            </Card>
            <Button block size="lg" variant="gold" onClick={saveContent}>Publish home content</Button>
          </>
        )}

        {tab === "games" && (
          <>
            <Card className="grad-violet"><p className="font-black">Game controls</p><p className="text-xs text-white/75 mt-1">Pause a game or set stake limits. These limits are enforced by the central betting ledger for every user. Outcome controls are deliberately not available.</p><p className="text-[10px] text-white/65 mt-2">{GAMES.length} games · applies to all users</p></Card>
            <input value={gameSearch} onChange={(e) => setGameSearch(e.target.value)} placeholder="Find a game" className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" />
            <div className="grid md:grid-cols-2 gap-3">
              {GAMES.filter((g) => `${g.name} ${g.id} ${g.category.join(" ")}`.toLowerCase().includes(gameSearch.toLowerCase())).map((g) => {
                const control = state.admin.gameControls[g.id] ?? { enabled: true, minBet: 1, maxBet: 100000 };
                return (
                  <Card key={g.id} className="space-y-2 p-3">
                    <div className="flex items-center gap-3"><span className="w-12 h-12 rounded-xl overflow-hidden border border-white/10"><img src={gameArtwork(g)} alt="" className="w-full h-full object-cover" /></span><div className="flex-1 min-w-0"><p className="text-sm font-black truncate">{g.name}</p><p className="text-[10px] text-white/45">{g.category.filter((c) => c !== "popular").join(" · ") || "Game"}</p></div><button onClick={() => updateGameControl(g.id, { enabled: !control.enabled })} className={cn("w-12 h-6 rounded-full relative transition", control.enabled ? "grad-green" : "bg-white/15")}><span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", control.enabled ? "left-6" : "left-0.5")} /></button></div>
                    <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-white/50">Min stake<input type="number" min={1} value={control.minBet} onChange={(e) => updateGameControl(g.id, { minBet: Math.max(1, Number(e.target.value) || 1) })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label><label className="text-[10px] text-white/50">Max stake<input type="number" min={control.minBet} value={control.maxBet} onChange={(e) => updateGameControl(g.id, { maxBet: Math.max(control.minBet, Number(e.target.value) || control.minBet) })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label></div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {tab === "settings" && (
          <>
            <Card className="space-y-3">
              <h2 className="font-bold text-sm flex items-center gap-2"><QrCode size={16} className="text-gold-400" /> Deposit QR code</h2>
              <p className="text-[11px] text-white/50">Paste an image URL (or data:image URI) of your UPI QR code, or upload one. It is shown instantly to users on the Deposit page. Leave empty to auto-generate a QR from the UPI ID below.</p>
              <div className="flex gap-2">
                <input value={qr} onChange={(e) => { setQr(e.target.value); setQrError(false); }} placeholder="https://example.com/my-upi-qr.png" className="flex-1 h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-xs font-mono outline-none focus:border-ruby-500" />
                <label className="h-11 px-3 rounded-xl border border-gold-400/40 bg-gold-500/10 flex items-center text-xs font-bold text-gold-200 cursor-pointer">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => readImage(e.target.files?.[0], 900, (url) => { setQr(url); setQrError(false); })} /></label>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-white rounded-xl shrink-0">
                  {qr.trim() && !qrError ? <img src={qr.trim()} alt="QR preview" className="w-32 h-32 object-contain" onError={() => setQrError(true)} /> : <QRCodeSVG value={upiPreview} size={128} />}
                </div>
                <div className="text-[11px] text-white/60 space-y-1">
                  <p className="font-bold text-white flex items-center gap-1"><ImageIcon size={12} /> Live preview</p>
                  {qrError && <p className="text-ruby-400">Image failed to load. Check the URL.</p>}
                  <p>{qr.trim() && !qrError ? "Custom image will be displayed." : "Auto-generated QR from UPI ID."}</p>
                  {qr && <button onClick={() => setQr("")} className="text-ruby-400 font-bold">Clear custom QR</button>}
                </div>
              </div>
            </Card>
            <Card className="space-y-3">
              <h2 className="font-bold text-sm flex items-center gap-2"><Settings2 size={16} className="text-gold-400" /> Payment settings</h2>
              <div><p className="text-xs text-white/60 mb-1">UPI ID</p><input value={upi} onChange={(e) => setUpi(e.target.value)} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" /></div>
              <div><p className="text-xs text-white/60 mb-1">Payee name</p><input value={payee} onChange={(e) => setPayee(e.target.value)} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-white/60 mb-1">Min deposit (₹)</p><input value={minDep} inputMode="numeric" onChange={(e) => setMinDep(e.target.value.replace(/\D/g, ""))} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" /></div>
                <div><p className="text-xs text-white/60 mb-1">Min withdrawal (₹)</p><input value={minWd} inputMode="numeric" onChange={(e) => setMinWd(e.target.value.replace(/\D/g, ""))} className="w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm outline-none" /></div>
              </div>
            </Card>
            <Card className="space-y-3">
              <h2 className="font-bold text-sm">Bonus offers & banners</h2>
              <p className="text-[11px] text-white/50">The large text is what players see on banners. The range below is the amount that is actually credited.</p>
              <div className="rounded-xl border border-gold-400/25 bg-gold-500/10 p-3 space-y-2">
                <p className="text-xs font-black text-gold-200">Welcome bonus</p>
                <input value={bonus.welcomeText} onChange={(e) => setBonus({ ...bonus, welcomeText: e.target.value.slice(0, 24) })} className="w-full h-10 rounded-lg bg-black/30 border border-white/10 px-2 text-xs outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-white/60">Actual min (₹)<input type="number" value={bonus.welcomeMin} onChange={(e) => setBonus({ ...bonus, welcomeMin: Number(e.target.value) || 1 })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label>
                  <label className="text-[10px] text-white/60">Actual max (₹)<input type="number" value={bonus.welcomeMax} onChange={(e) => setBonus({ ...bonus, welcomeMax: Number(e.target.value) || 1 })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 space-y-2">
                <p className="text-xs font-black text-emerald-200">First deposit bonus</p>
                <input value={bonus.depositText} onChange={(e) => setBonus({ ...bonus, depositText: e.target.value.slice(0, 24) })} className="w-full h-10 rounded-lg bg-black/30 border border-white/10 px-2 text-xs outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-white/60">Actual min (%)<input type="number" step="0.1" value={bonus.depositMin} onChange={(e) => setBonus({ ...bonus, depositMin: Number(e.target.value) || 0 })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label>
                  <label className="text-[10px] text-white/60">Actual max (%)<input type="number" step="0.1" value={bonus.depositMax} onChange={(e) => setBonus({ ...bonus, depositMax: Number(e.target.value) || 0 })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label>
                </div>
              </div>
              <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-3 space-y-2">
                <p className="text-xs font-black text-violet-200">Referral bonus</p>
                <input value={bonus.referralText} onChange={(e) => setBonus({ ...bonus, referralText: e.target.value.slice(0, 24) })} className="w-full h-10 rounded-lg bg-black/30 border border-white/10 px-2 text-xs outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-white/60">Actual min (%)<input type="number" step="0.1" value={bonus.referralMin} onChange={(e) => setBonus({ ...bonus, referralMin: Number(e.target.value) || 0 })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label>
                  <label className="text-[10px] text-white/60">Actual max (%)<input type="number" step="0.1" value={bonus.referralMax} onChange={(e) => setBonus({ ...bonus, referralMax: Number(e.target.value) || 0 })} className="mt-1 w-full h-9 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-white outline-none" /></label>
                </div>
              </div>
              <Button block size="lg" onClick={saveSettings}>Save payment & bonus settings</Button>
            </Card>
          </>
        )}
      </div>
      </main>
    </div>
  );
};
