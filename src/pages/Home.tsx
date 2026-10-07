import React, { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, ChevronRight, Crown, Flame, Gem, Gift as GiftIcon, Headphones, Megaphone, Plus, Search, Sparkles, Trophy, Volume2, VolumeX } from "lucide-react";
import { useApp } from "../context/AppContext";
import { BalanceChip, Button, Card, PageHeader, Pill, SectionTitle } from "../components/UI";
import { DEFAULT_BANNERS, GAMES, GameCategory, PromoBanner, getVipLevel } from "../data";
import { cn } from "../utils/cn";
import { formatMoney } from "../utils/helpers";
import { sfx } from "../utils/audio";
import { BrandMark, GameArtwork, gameArtwork } from "../components/GameArtwork";
import { IMG, img } from "../assets/images";

const CATEGORIES: { id: GameCategory | "all"; label: string; icon: React.ReactNode }[] = [
  { id: "popular", label: "Popular", icon: <Flame size={14} /> },
  { id: "lottery", label: "Lottery", icon: <Trophy size={14} /> },
  { id: "slots", label: "Slots", icon: <Gem size={14} /> },
  { id: "casino", label: "Casino", icon: <Sparkles size={14} /> },
  { id: "arcade", label: "Arcade", icon: <Flame size={14} /> },
  { id: "all", label: "All", icon: <Gem size={14} /> },
];

export const Home: React.FC = () => {
  const { state, navigate, unreadCount, setSound, toast, isLoggedIn } = useApp();
  const [banner, setBanner] = useState(0);
  const [cat, setCat] = useState<GameCategory | "all">("popular");
  const configuredBanners = state.admin.banners?.filter((b) => b.enabled) ?? [];
  const banners: PromoBanner[] = configuredBanners.length ? configuredBanners : DEFAULT_BANNERS;

  useEffect(() => {
    const t = setInterval(() => setBanner((b) => (b + 1) % Math.max(1, banners.length)), 5200);
    return () => clearInterval(t);
  }, [banners.length]);
  useEffect(() => {
    if (banner >= banners.length) setBanner(0);
  }, [banner, banners.length]);

  const games = useMemo(() => {
    if (cat === "all") return GAMES;
    if (cat === "popular") return GAMES.filter((g) => g.category.includes("popular"));
    return GAMES.filter((g) => g.category.includes(cat));
  }, [cat]);

  const myWins = useMemo(() => state.bets.filter((b) => b.result === "win").slice(0, 5), [state.bets]);

  const vip = getVipLevel(state.user.totalBet);

  return (
    <div className="safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-night-900/85 border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <BrandMark className="w-9 h-9 drop-shadow-[0_0_14px_rgba(245,158,11,.35)]" />
            <div className="leading-tight"><span className="font-black text-lg tracking-tight text-gold">{state.admin.brandName}</span><p className="text-[9px] text-white/45 -mt-0.5 max-w-[130px] truncate">{state.admin.homeTagline}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? <BalanceChip compact /> : <Button size="sm" variant="gold" onClick={() => navigate("/login")}>Log in</Button>}
            <button onClick={() => { sfx.click(); setSound(!state.settings.sound); }} className="p-2 rounded-full hover:bg-white/10 text-white/70">
              {state.settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={() => navigate("/notifications")} className="relative p-2 rounded-full hover:bg-white/10">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-ruby-500 text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="px-3 pt-3 space-y-4">
        {/* Banner carousel */}
        <div className="relative h-[190px] rounded-2xl overflow-hidden card-shadow border border-gold-400/15">
          {banners.map((b, i) => (
            <div
              key={b.id}
              className={cn("absolute inset-0 p-5 flex items-center justify-between transition-all duration-700", i === banner ? "opacity-100 translate-x-0" : i < banner ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full")}
              style={{ backgroundImage: `linear-gradient(90deg, rgba(22,5,12,.94) 0%, rgba(22,5,12,.75) 47%, rgba(22,5,12,.08) 100%), url("${img(b.imageUrl)}")`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 border border-gold-300/30 px-2.5 py-1 text-[9px] font-black tracking-[0.18em] text-gold-200">{state.admin.brandName.toUpperCase()} · 50+ GAMES</span>
                <p className="text-[26px] leading-none font-black drop-shadow mt-3">{b.title}</p>
                <p className="text-xs text-white/85 mt-2 max-w-[220px]">{b.subtitle}</p>
                <Button size="sm" variant="gold" className="mt-4" onClick={() => navigate(b.route)}>
                  {b.cta} <ChevronRight size={14} />
                </Button>
              </div>
              <span className="absolute right-3 bottom-7 h-1 w-20 rounded-full bg-gold-300/40 blur-xl" />
            </div>
          ))}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setBanner(i)} className={cn("h-1.5 rounded-full transition-all", i === banner ? "w-5 bg-white" : "w-1.5 bg-white/40")} />
            ))}
          </div>
        </div>

        {/* Marquee */}
        <div className="flex items-center gap-2 rounded-xl bg-black/30 border border-white/5 px-3 py-2 overflow-hidden">
          <Megaphone size={16} className="text-gold-400 shrink-0" />
          <div className="flex-1 overflow-hidden relative h-5">
            <p className="absolute whitespace-nowrap text-xs text-white/80 animate-marquee">
              {state.admin.maintenanceNotice ||
                `Welcome to ${state.admin.brandName} · Welcome bonus ${state.admin.bonuses.welcomeText} · First deposit ${state.admin.bonuses.depositText} · Referral ${state.admin.bonuses.referralText} · Play responsibly, 18+ only.`}
            </p>
          </div>
          <button onClick={() => navigate("/announcement")} className="text-[10px] font-bold text-ruby-400 shrink-0">
            Detail
          </button>
        </div>

        {/* Wallet quick card */}
        <Card className="grad-ruby-card border-ruby-400/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Available wallet balance</p>
              <p className="text-2xl font-black tabular-nums mt-0.5">{formatMoney(state.user.balance)}</p>
              <div className="flex items-center gap-1 mt-1">
                <Crown size={12} className="text-gold-300" />
                <span className="text-[11px] text-gold-300 font-bold">VIP {vip.level}</span>
                <span className="text-[11px] text-white/60">· UID {state.user.uid}</span>
              </div>
              {!isLoggedIn && <p className="text-[11px] text-gold-200 font-semibold mt-2">Register now · welcome bonus {state.admin.bonuses.welcomeText}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="gold" onClick={() => navigate(isLoggedIn ? "/deposit" : "/register")}>
                <Plus size={14} /> {isLoggedIn ? "Deposit" : "Register"}
              </Button>
              <Button size="sm" variant="dark" className="bg-black/30" onClick={() => navigate("/wallet")}>Wallet</Button>
            </div>
          </div>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Attendance", icon: <CalendarDays size={22} />, route: "/attendance" },
            { label: "Gift Code", icon: <GiftIcon size={22} />, route: "/gift" },
            { label: "Jackpot", icon: <Gem size={22} />, route: "/jackpot" },
            { label: "Support", icon: <Headphones size={22} />, route: "/service" },
          ].map((q) => (
            <button key={q.label} onClick={() => { sfx.click(); navigate(q.route); }} className="rounded-xl bg-white/5 border border-white/5 py-3 flex flex-col items-center gap-1 btn-press hover:bg-white/10 text-gold-300">
              <span>{q.icon}</span>
              <span className="text-[11px] font-semibold text-white/80">{q.label}</span>
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { sfx.click(); setCat(c.id); }}
              className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition btn-press", cat === c.id ? "grad-red border-transparent shadow-lg shadow-ruby-600/30" : "bg-white/5 border-white/10 text-white/70")}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Game grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {games.map((g, i) => (
            <button
              key={g.id}
              onClick={() => {
                sfx.click();
                if (state.admin.gameControls[g.id]?.enabled === false) toast("This game is temporarily unavailable", "info");
                else navigate(g.route);
              }}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn("group relative rounded-2xl p-3 h-32 flex flex-col justify-between text-left card-shadow btn-press overflow-hidden animate-pop border border-white/10", g.gradient, state.admin.gameControls[g.id]?.enabled === false && "grayscale opacity-50")}
            >
              <GameArtwork game={g} />
              <div className="relative z-10 flex items-start justify-between">
                <span className="w-7 h-7 rounded-lg border border-white/25 bg-black/30 flex items-center justify-center text-[10px] font-black tracking-tight">{g.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
                {g.hot && <Pill className="bg-black/40 text-gold-300">HOT</Pill>}
                {g.isNew && <Pill className="bg-black/40 text-emerald-300">NEW</Pill>}
              </div>
              <div className="relative z-10">
                <p className="font-black text-sm leading-tight drop-shadow">{g.name}</p>
                <p className="text-[10px] text-white/80 leading-tight mt-0.5">{g.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.035] px-3 py-2.5">
          <span className="text-xs text-white/60">{games.length} games in this category · {GAMES.length} total</span>
          <button onClick={() => navigate("/games")} className="text-xs font-black text-gold-300 flex items-center gap-1">Browse all <ChevronRight size={14} /></button>
        </div>

        {/* Referral CTA */}
        <button onClick={() => navigate("/promotion")} className="w-full rounded-2xl overflow-hidden relative text-left card-shadow btn-press border border-gold-400/25">
          <img src={IMG.slotClassic} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-night-950/95 via-night-950/80 to-night-950/30" />
          <div className="relative z-10 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black tracking-[.2em] text-gold-200">INVITE & EARN</p>
              <p className="font-black text-lg leading-tight mt-1">Referral bonus {state.admin.bonuses.referralText}</p>
              <p className="text-[11px] text-white/70 mt-1">Your code <span className="font-black tracking-[.2em] text-gold-300">{state.user.inviteCode}</span> · bonus on every friend's first deposit</p>
            </div>
            <span className="shrink-0 w-11 h-11 rounded-full grad-gold flex items-center justify-center text-night-950"><GiftIcon size={20} /></span>
          </div>
        </button>

        {/* My recent wins */}
        <div>
          <SectionTitle title="My recent wins" icon={<Trophy size={14} className="text-gold-400" />} action={<button onClick={() => navigate("/bet-history")} className="text-xs text-ruby-400 font-bold">History</button>} />
          {myWins.length === 0 ? (
            <Card className="text-center py-6">
              <Crown size={26} className="mx-auto text-gold-400/70" />
              <p className="text-sm font-bold mt-2">No wins yet</p>
              <p className="text-[11px] text-white/50 mt-1">{isLoggedIn ? "Pick a game above to get started." : "Register to claim your ₹30 welcome bonus and start playing."}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {myWins.map((w) => {
                const g = GAMES.find((x) => x.id === w.game);
                return (
                  <div key={w.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                    <span className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 shrink-0">{g && <img src={gameArtwork(g)} alt="" className="h-full w-full object-cover" />}</span>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{g?.name ?? w.game}</p><p className="text-[10px] text-white/50 truncate">{w.selectionLabel}</p></div>
                    <div className="text-right"><p className="text-xs font-black text-emerald-400">+{formatMoney(w.payout)}</p><p className="text-[10px] text-white/40">Bet {formatMoney(w.amount, 0)}</p></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-white/35 py-4 space-y-2">
          <div className="flex justify-center gap-4 text-white/50">
            <button onClick={() => navigate("/service")} className="flex items-center gap-1"><Headphones size={12} /> Support</button>
            <button onClick={() => navigate("/about")}>About</button>
            <button onClick={() => navigate("/announcement")}>Rules</button>
            <button onClick={() => navigate("/admin")}>Admin</button>
          </div>
          <p>{state.admin.brandName} is a demo platform. Virtual currency only · 18+ · Play responsibly.</p>
          <p>© 2026 {state.admin.brandName}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export const GamesLibrary: React.FC = () => {
  const { state, navigate, query, toast } = useApp();
  const initial = query.get("category") ?? "all";
  const [cat, setCat] = useState<GameCategory | "all">((CATEGORIES.some((x) => x.id === initial) ? initial : "all") as GameCategory | "all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GAMES.filter((g) => {
      const matchesCategory = cat === "all" || (cat === "popular" ? g.category.includes("popular") : g.category.includes(cat));
      const matchesSearch = !q || `${g.name} ${g.subtitle}`.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [cat, search]);

  return (
    <div className="safe-bottom">
      <PageHeader title="Game library" showBalance />
      <div className="px-3 pt-3 space-y-4">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search 50+ games" className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-10 pr-3 text-sm outline-none focus:border-gold-400/50" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={cn("flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border btn-press", cat === c.id ? "grad-red border-transparent" : "bg-white/5 border-white/10 text-white/60")}>
              {c.icon}{c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-white/50"><span>{filtered.length} games</span><span>Demo credits · 18+</span></div>
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((g, i) => {
            const unavailable = state.admin.gameControls[g.id]?.enabled === false;
            return (
              <button key={g.id} onClick={() => unavailable ? toast("This game is temporarily unavailable", "info") : navigate(g.route)} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }} className={cn("group relative h-32 rounded-2xl overflow-hidden p-3 text-left flex flex-col justify-between card-shadow btn-press animate-pop border border-white/10", g.gradient, unavailable && "grayscale opacity-50")}>
                <GameArtwork game={g} />
                <div className="relative z-10 flex items-start justify-between"><span className="w-7 h-7 rounded-lg bg-black/35 border border-white/20 flex items-center justify-center text-[10px] font-black">{g.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>{g.hot && <Pill className="bg-black/35 text-gold-200">HOT</Pill>}{g.isNew && <Pill className="bg-black/35 text-emerald-200">NEW</Pill>}</div>
                <div className="relative z-10"><p className="font-black text-sm leading-tight">{g.name}</p><p className="text-[10px] text-white/75 mt-1">{g.subtitle}</p></div>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && <Card className="text-center py-8 text-sm text-white/50">No games match that search.</Card>}
      </div>
    </div>
  );
};
