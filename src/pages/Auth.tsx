import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Gift, Lock, Phone, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Card } from "../components/UI";
import { BrandMark } from "../components/GameArtwork";
import { cn } from "../utils/cn";
import { sfx } from "../utils/audio";
import { IMG } from "../assets/images";

const inputCls = "w-full h-12 rounded-xl bg-black/35 border border-white/10 pl-11 pr-11 text-sm font-semibold outline-none focus:border-gold-400/60 transition";

const Field: React.FC<{ icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }> = ({ icon, children, right }) => (
  <div className="relative">
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-300/80">{icon}</span>
    {children}
    {right && <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span>}
  </div>
);

export const Auth: React.FC = () => {
  const { state, register, login, toast, navigate, query, route } = useApp();
  const prefilled = (query.get("code") ?? "").toUpperCase();
  const [tab, setTab] = useState<"login" | "register">(route === "/register" || prefilled ? "register" : "login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [invite, setInvite] = useState(prefilled);
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(true);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefilled) {
      setInvite(prefilled);
      setTab("register");
    }
  }, [prefilled]);

  const fail = (message: string) => {
    sfx.error();
    setShake(true);
    setTimeout(() => setShake(false), 500);
    toast(message, "error");
  };

  const submit = () => {
    if (busy) return;
    if (tab === "register") {
      if (password !== confirm) return fail("Passwords do not match");
      if (!agree) return fail("Please accept the terms to continue");
      setBusy(true);
      const r = register({ phone, password, nickname, inviteCode: invite });
      setBusy(false);
      if (!r.ok) return fail(r.message);
      sfx.bigWin();
      toast(r.message, "success");
      navigate("/home", true);
      return;
    }
    setBusy(true);
    const r = login(phone, password);
    setBusy(false);
    if (!r.ok) return fail(r.message);
    sfx.notify();
    toast(r.message, "success");
    navigate("/home", true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative h-64 overflow-hidden">
        <img src={IMG.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-night-950/30 via-night-950/60 to-night-900" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <BrandMark className="w-20 h-20 drop-shadow-[0_0_30px_rgba(245,158,11,.45)]" />
          <p className="text-3xl font-black mt-3 text-gold tracking-tight">{state.admin.brandName}</p>
          <p className="text-xs text-white/70 mt-1">{state.admin.homeTagline}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold-300/40 bg-gold-400/15 px-3 py-1 text-[10px] font-black tracking-[.18em] text-gold-200"><Gift size={12} /> WELCOME BONUS {state.admin.bonuses.welcomeText}</span>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-6 pb-10">
        <Card className={cn("space-y-4", shake && "animate-shake")}>
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/30">
            {(["login", "register"] as const).map((t) => (
              <button key={t} onClick={() => { sfx.click(); setTab(t); }} className={cn("h-10 rounded-lg text-sm font-black transition", tab === t ? "grad-red shadow-lg shadow-ruby-600/30" : "text-white/55")}>
                {t === "login" ? "Log in" : "Register"}
              </button>
            ))}
          </div>

          <Field icon={<Phone size={17} />}>
            <input value={phone} inputMode="numeric" autoComplete="tel" onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Mobile number (10 digits)" className={inputCls} />
          </Field>
          <Field icon={<Lock size={17} />} right={<button onClick={() => setShow((s) => !s)} className="text-white/45">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>}>
            <input type={show ? "text" : "password"} value={password} autoComplete={tab === "login" ? "current-password" : "new-password"} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tab === "login" && submit()} placeholder={tab === "login" ? "Password" : "Create password (min 6 characters)"} className={inputCls} />
          </Field>

          {tab === "register" && (
            <>
              <Field icon={<Lock size={17} />}>
                <input type={show ? "text" : "password"} value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className={inputCls} />
              </Field>
              <Field icon={<UserRound size={17} />}>
                <input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 20))} placeholder="Nickname (optional)" className={inputCls} />
              </Field>
              <Field icon={<Ticket size={17} />}>
                <input value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="Invite code (optional)" className={cn(inputCls, "tracking-[.25em] font-black")} />
              </Field>
              <p className="text-[11px] text-white/50 -mt-1">Have a friend on {state.admin.brandName}? Enter their 6-character invite code — they get a referral bonus ({state.admin.bonuses.referralText}) after your first approved deposit.</p>
              <label className="flex items-start gap-2 text-[11px] text-white/65">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-ruby-500 w-4 h-4" />
                <span>I am 18+ and agree to the demo terms. This platform uses virtual credits for demonstration.</span>
              </label>
            </>
          )}

          <Button block size="lg" variant={tab === "login" ? "primary" : "gold"} onClick={submit} loading={busy} disabled={phone.length !== 10 || password.length < 6}>
            {tab === "login" ? "Log in" : "Create account"}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/45"><ShieldCheck size={13} className="text-emerald-400" /> Accounts and balances are stored locally in this browser.</div>
        </Card>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {[["50+", "Games"], [state.admin.bonuses.welcomeText, "Welcome bonus"], [state.admin.bonuses.depositText, "First deposit bonus"], [state.admin.bonuses.referralText, "Referral bonus"]].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-white/5 border border-white/5 p-3 text-center"><p className="font-black text-gold-300">{v}</p><p className="text-[10px] text-white/50 mt-0.5">{l}</p></div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-white/50">
          <button onClick={() => navigate("/home")} className="font-bold">Browse games as guest</button>
          <span className="text-white/20">|</span>
          <button onClick={() => navigate("/admin")} className="font-bold">Admin panel</button>
        </div>
        <p className="text-center text-[10px] text-white/30 mt-4">© 2026 {state.admin.brandName} · 18+ · Play responsibly</p>
      </div>
    </div>
  );
};
