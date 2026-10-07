import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowDownToLine, ArrowUpFromLine, Building2, CheckCircle2, Clock, Copy, CreditCard, History, Landmark, Plus, QrCode, RefreshCw, Smartphone, Trash2, Wallet as WalletIcon, XCircle, Zap, CircleDollarSign, Trophy, Gift as GiftIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button, Card, EmptyState, Modal, PageHeader, Pill, SectionTitle, Stat, Tabs } from "../components/UI";
import { BANKS, DEPOSIT_CHANNELS, PRESET_AMOUNTS, UPI_APPS } from "../data";
import { cn } from "../utils/cn";
import { copyToClipboard, formatDateTime, formatMoney, maskString, uid } from "../utils/helpers";
import { sfx } from "../utils/audio";
import { IMG, img } from "../assets/images";
import { SafeImg } from "../components/GameArtwork";

const statusPill = (s: string) => (
  <Pill className={cn(s === "approved" || s === "success" ? "bg-emerald-500/20 text-emerald-300" : s === "pending" ? "bg-gold-500/20 text-gold-300" : "bg-ruby-500/20 text-ruby-300")}>
    {s === "approved" || s === "success" ? <CheckCircle2 size={10} className="mr-1" /> : s === "pending" ? <Clock size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
    {s.toUpperCase()}
  </Pill>
);

// ================= WALLET =================
export const Wallet: React.FC = () => {
  const { state, navigate, toast } = useApp();
  const [spin, setSpin] = useState(false);
  const recent = state.transactions.slice(0, 8);
  return (
    <div className="safe-bottom">
      <PageHeader title="Wallet" showBack={false} right={<button onClick={() => navigate("/transactions")} className="p-2 rounded-full hover:bg-white/10"><History size={18} /></button>} />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-ruby-card border-ruby-400/20 text-center py-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-white/15 flex items-center justify-center"><WalletIcon size={26} /></div>
          <p className="text-3xl font-black tabular-nums mt-3">{formatMoney(state.user.balance)}</p>
          <p className="text-xs text-white/70 mt-1">Total balance</p>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div><p className="text-lg font-bold tabular-nums">{formatMoney(state.user.totalDeposit, 0)}</p><p className="text-[11px] text-white/60">Total deposit</p></div>
            <div><p className="text-lg font-bold tabular-nums">{formatMoney(state.user.totalWithdraw, 0)}</p><p className="text-[11px] text-white/60">Total withdrawal</p></div>
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" /><circle cx="18" cy="18" r="15.9" fill="none" stroke="#e11d48" strokeWidth="3" strokeDasharray="100 100" strokeLinecap="round" /></svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">100%</span>
              </div>
              <p className="text-sm font-bold mt-1">{formatMoney(state.user.balance)}</p>
              <p className="text-[11px] text-white/50">Main wallet</p>
            </div>
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" /></svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">0%</span>
              </div>
              <p className="text-sm font-bold mt-1">₹0.00</p>
              <p className="text-[11px] text-white/50">3rd party wallet</p>
            </div>
          </div>
          <Button block variant="outline" className="mt-4" onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 800); toast("All funds are in the main wallet", "success"); }}>
            <RefreshCw size={16} className={cn(spin && "animate-spin")} /> Main wallet transfer
          </Button>
        </Card>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Deposit", icon: <ArrowDownToLine size={20} />, route: "/deposit", cls: "grad-red" },
            { label: "Withdraw", icon: <ArrowUpFromLine size={20} />, route: "/withdraw", cls: "grad-blue" },
            { label: "Deposit history", icon: <History size={20} />, route: "/deposit-history", cls: "grad-gold" },
            { label: "Withdrawal history", icon: <Landmark size={20} />, route: "/withdraw-history", cls: "grad-green" },
          ].map((a) => (
            <button key={a.label} onClick={() => { sfx.click(); navigate(a.route); }} className="flex flex-col items-center gap-2 btn-press">
              <span className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", a.cls)}>{a.icon}</span>
              <span className="text-[10px] font-semibold text-white/80 text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>

        <div>
          <SectionTitle title="Recent transactions" action={<button onClick={() => navigate("/transactions")} className="text-xs text-ruby-400 font-bold">View all</button>} />
          <Card className="p-0 divide-y divide-white/5">
            {recent.length === 0 && <EmptyState text="No transactions yet" />}
            {recent.map((t) => <TxRow key={t.id} t={t} />)}
          </Card>
        </div>
      </div>
    </div>
  );
};

export const TxRow: React.FC<{ t: { type: string; amount: number; note: string; createdAt: number; status: string; balanceAfter: number } }> = ({ t }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black", t.amount >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-ruby-500/15 text-ruby-400")}>
      {t.type === "deposit" ? "D" : t.type === "withdraw" ? "W" : t.type === "bet" ? "B" : t.type === "win" ? <Trophy size={16} /> : t.type === "bonus" ? <GiftIcon size={16} /> : t.type === "commission" ? "C" : t.type === "rebate" ? "R" : "↺"}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold capitalize truncate">{t.type} · <span className="font-normal text-white/60">{t.note}</span></p>
      <p className="text-[10px] text-white/40">{formatDateTime(t.createdAt)} · Bal {formatMoney(t.balanceAfter)}</p>
    </div>
    <div className="text-right">
      <p className={cn("text-sm font-black tabular-nums", t.amount >= 0 ? "text-emerald-400" : "text-ruby-400")}>{t.amount >= 0 ? "+" : ""}{formatMoney(t.amount)}</p>
      {t.status !== "success" && statusPill(t.status)}
    </div>
  </div>
);

// ================= DEPOSIT =================
export const Deposit: React.FC = () => {
  const { state, navigate, requestDeposit, toast } = useApp();
  const [channel, setChannel] = useState(DEPOSIT_CHANNELS[0].id);
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<1 | 2>(1);
  const [utr, setUtr] = useState("");
  const [timer, setTimer] = useState(600);
  const [paymentRef, setPaymentRef] = useState("");
  const ch = DEPOSIT_CHANNELS.find((c) => c.id === channel)!;
  const finalAmount = custom ? parseFloat(custom) || 0 : amount;

  useEffect(() => {
    if (!payOpen) return;
    setTimer(600);
    const t = setInterval(() => setTimer((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [payOpen]);

  const upiParams = `pa=${encodeURIComponent(state.admin.upiId)}&pn=${encodeURIComponent(state.admin.payeeName)}&am=${finalAmount.toFixed(2)}&cu=INR&tr=${encodeURIComponent(paymentRef)}&tid=${encodeURIComponent(paymentRef)}&tn=${encodeURIComponent(`RubyWin ${paymentRef}`)}`;
  const upiString = `upi://pay?${upiParams}`;

  const openPay = () => {
    const min = Math.max(ch.min, state.admin.minDeposit);
    if (finalAmount < min) return toast(`Minimum deposit for this channel is ₹${min}`, "error");
    if (finalAmount > ch.max) return toast(`Maximum deposit for this channel is ₹${ch.max}`, "error");
    setUtr("");
    setPaymentRef(uid("RW"));
    setPayStep(1);
    setPayOpen(true);
  };

  const openUpiApp = (app: "phonepe" | "gpay" | "paytm" | "upi") => {
    const routes: Record<typeof app, string> = {
      phonepe: `phonepe://upi/pay?${upiParams}`,
      gpay: `gpay://upi/pay?${upiParams}`,
      paytm: `paytmmp://pay?${upiParams}`,
      upi: upiString,
    };
    window.location.href = routes[app];
  };

  const submit = () => {
    const r = requestDeposit(finalAmount, ch.name, utr, ch.bonus);
    if (!r.ok) {
      sfx.error();
      return toast(r.message, "error");
    }
    sfx.notify();
    toast("Submitted! Awaiting admin verification", "success");
    setPayOpen(false);
    navigate("/deposit-history");
  };

  return (
    <div className="safe-bottom">
      <PageHeader title="Deposit" right={<button onClick={() => navigate("/deposit-history")} className="text-xs font-bold text-ruby-400 px-2">History</button>} />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-ruby-card border-ruby-400/20">
          <p className="text-xs text-white/70 flex items-center gap-1"><WalletIcon size={14} /> Balance</p>
          <p className="text-2xl font-black tabular-nums mt-1">{formatMoney(state.user.balance)}</p>

        </Card>

        <div>
          <SectionTitle title="Select channel" />
          <div className="grid grid-cols-2 gap-2">
            {DEPOSIT_CHANNELS.map((c) => (
              <button key={c.id} onClick={() => { sfx.click(); setChannel(c.id); }} className={cn("relative rounded-xl p-3 text-left border transition btn-press", channel === c.id ? "grad-red border-transparent shadow-lg shadow-ruby-600/30" : "bg-white/5 border-white/10")}>
                <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold-500 text-night-950">{state.admin.bonuses.depositText}</span>
                <span className="text-gold-200">{c.id === "upi-qr" ? <QrCode size={24} /> : c.id === "upi-fast" ? <Zap size={24} /> : c.id === "bank" ? <Building2 size={24} /> : <CircleDollarSign size={24} />}</span>
                <p className="text-sm font-bold mt-1">{c.name}</p>
                <p className={cn("text-[10px]", channel === c.id ? "text-white/80" : "text-white/50")}>{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle title="Deposit amount" action={<span className="text-[11px] text-white/50">₹{Math.max(ch.min, state.admin.minDeposit)} – ₹{ch.max.toLocaleString("en-IN")}</span>} />
          <Card className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((p) => (
                <button key={p} onClick={() => { sfx.click(); setAmount(p); setCustom(""); }} className={cn("py-2.5 rounded-xl text-sm font-bold border btn-press", !custom && amount === p ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/80")}>
                  ₹{p >= 1000 ? `${p / 1000}K` : p}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-3 h-12">
              <span className="text-gold-400 font-bold mr-2">₹</span>
              <input type="number" inputMode="numeric" placeholder="Enter custom amount" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))} className="flex-1 bg-transparent outline-none font-bold" />
              {custom && <button onClick={() => setCustom("")} className="text-white/40 text-xs">Clear</button>}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Bonus offer</span>
              <span className="font-black text-gold-300">{state.admin.bonuses.depositText}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">You deposit</span>
              <span className="font-black text-gold-400">{formatMoney(finalAmount)}</span>
            </div>
            <p className="text-[10px] text-white/45">Bonus up to the offer amount is credited automatically once your payment is approved.</p>
            <Button block size="lg" onClick={openPay}>Deposit {formatMoney(finalAmount)}</Button>
          </Card>
        </div>

        <Card>
          <h3 className="font-bold text-sm mb-2">Recharge instructions</h3>
          <ul className="text-xs text-white/60 space-y-1.5 list-disc pl-4">
            <li>Scan the QR code or pay to the UPI ID shown on the payment page using any UPI app.</li>
            <li>Enter the exact amount shown. Payments with a different amount may be delayed.</li>
            <li>After payment, submit the 12-digit UTR / reference number. Funds are credited after verification.</li>
            <li>Each UTR can only be submitted once. Do not share payment screenshots with anyone outside support.</li>
          </ul>
        </Card>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Pay ${formatMoney(finalAmount)} via ${ch.name}`} hideClose={false} className="p-0">
        <div className="flex flex-col max-h-[62vh] sm:max-h-[70vh]">
          {/* step indicator */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-night-800">
            {[[1, "PAY"], [2, "SUBMIT UTR"]].map(([n, label]) => (
              <React.Fragment key={String(n)}>
                <button onClick={() => setPayStep(n as 1 | 2)} className={cn("flex items-center gap-1.5 text-[11px] font-black tracking-wider", payStep === n ? "text-gold-300" : "text-white/40")}>
                  <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px]", payStep === n ? "grad-gold text-night-950" : "bg-white/10 text-white/60")}>{n}</span>
                  {label}
                </button>
                {n === 1 && <span className="flex-1 h-[2px] rounded bg-white/10"><span className="block h-full rounded bg-gold-400 transition-all" style={{ width: payStep === 2 ? "100%" : "0%" }} /></span>}
              </React.Fragment>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-gold-500/10 border border-gold-500/30 px-3 py-2 text-xs">
              <span className="text-gold-300 font-bold flex items-center gap-1"><Clock size={14} /> {payStep === 1 ? "Complete payment within" : "Submit UTR within"}</span>
              <span className="font-black text-gold-300 tabular-nums">{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</span>
            </div>

            {payStep === 1 ? (
              <>
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-white rounded-2xl shadow-xl">
                    {state.admin.depositQr ? (
                      <SafeImg src={img(state.admin.depositQr)} fallback={IMG.poster} alt="Deposit QR" className="w-48 h-48 object-contain" />
                    ) : (
                      <QRCodeSVG value={upiString} size={192} level="M" includeMargin={false} />
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 mt-2">Scan to pay <b className="text-white/80">{state.admin.payeeName}</b></p>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/10 divide-y divide-white/5">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div><p className="text-[10px] text-white/50">UPI ID</p><p className="text-sm font-bold">{state.admin.upiId}</p></div>
                    <button onClick={() => { copyToClipboard(state.admin.upiId); toast("UPI ID copied", "success"); }} className="p-2 rounded-lg bg-white/5"><Copy size={14} /></button>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div><p className="text-[10px] text-white/50">Amount</p><p className="text-sm font-bold text-gold-400">{formatMoney(finalAmount)}</p></div>
                    <button onClick={() => { copyToClipboard(finalAmount.toFixed(2)); toast("Amount copied", "success"); }} className="p-2 rounded-lg bg-white/5"><Copy size={14} /></button>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div><p className="text-[10px] text-white/50">Payee</p><p className="text-sm font-bold">{state.admin.payeeName}</p></div>
                    <Smartphone size={16} className="text-white/40" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/60 mb-2">Open payment app directly</p>
                  <div className="grid grid-cols-4 gap-2">
                    {([["phonepe", "PhonePe"], ["gpay", "Google Pay"], ["paytm", "Paytm"], ["upi", "Other UPI"]] as const).map(([id, label]) => (
                      <button key={id} onClick={() => openUpiApp(id)} className="rounded-xl bg-white/5 border border-white/10 py-2.5 flex flex-col items-center gap-1 text-[10px] font-bold btn-press active:border-gold-400/50">
                        <span className="w-6 h-6 rounded-full grad-gold flex items-center justify-center text-night-950 text-[9px] font-black">{label.slice(0, 2).toUpperCase()}</span>{label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/40 mt-2">On mobile the selected app opens with payee and amount filled in.</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 px-3 py-2.5">
                  <p className="text-[11px] font-bold text-emerald-200">Payment reference needed. Open your UPI app, copy the 12-digit UTR / transaction ID and paste it below.</p>
                </div>
                <div>
                  <p className="text-xs text-white/70 mb-1">UTR / Transaction reference</p>
                  <input value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" autoFocus placeholder="12-digit UTR" className={cn("w-full h-14 rounded-xl bg-black/30 border-2 px-3 text-lg font-black tracking-[0.25em] outline-none", utr.length === 12 ? "border-emerald-500/70" : "border-white/15")} />
                  <p className="text-[10px] text-white/50 mt-1">{utr.length}/12 digits</p>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/10 divide-y divide-white/5">
                  <div className="flex items-center justify-between px-3 py-2 text-xs"><span className="text-white/50">Amount paid</span><span className="font-black text-gold-300">{formatMoney(finalAmount)}</span></div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs"><span className="text-white/50">Payee</span><span className="font-bold">{state.admin.payeeName}</span></div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs"><span className="text-white/50">UPI ID</span><span className="font-mono text-white/80">{state.admin.upiId}</span></div>
                </div>
              </>
            )}
          </div>

          {/* sticky footer — always visible above the nav */}
          <div className="shrink-0 border-t border-white/10 bg-night-800 px-4 py-3 space-y-2">
            {payStep === 1 ? (
              <>
                <Button block size="lg" variant="gold" onClick={() => setPayStep(2)}>I have paid → Enter UTR</Button>
                <button onClick={() => setPayStep(2)} className="w-full text-[11px] text-white/50 font-bold">Pay later? Go straight to UTR submission</button>
              </>
            ) : (
              <>
                <Button block size="lg" variant="green" disabled={utr.length !== 12 || timer === 0} onClick={submit}>Submit UTR · {formatMoney(finalAmount)}</Button>
                <button onClick={() => setPayStep(1)} className="w-full text-[11px] text-white/50 font-bold">← Back to payment details</button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ================= WITHDRAW =================
export const Withdraw: React.FC = () => {
  const { state, navigate, requestWithdraw, addBankCard, addUpi, removeBankCard, removeUpi, toast } = useApp();
  const [method, setMethod] = useState<"bank" | "upi">("bank");
  const [selected, setSelected] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const required = Math.max(0, state.user.totalDeposit - state.user.totalBet);
  const list = method === "bank" ? state.bankCards : state.upiAccounts;

  useEffect(() => {
    if (!list.find((x) => x.id === selected)) setSelected(list[0]?.id ?? "");
  }, [list, selected]);

  const submit = () => {
    const r = requestWithdraw(parseFloat(amount) || 0, method, selected);
    if (!r.ok) {
      sfx.error();
      return toast(r.message, "error");
    }
    sfx.notify();
    toast(r.message, "success");
    setConfirmOpen(false);
    setAmount("");
    navigate("/withdraw-history");
  };

  const numericAmount = parseFloat(amount) || 0;

  return (
    <div className="safe-bottom">
      <PageHeader title="Withdraw" right={<button onClick={() => navigate("/withdraw-history")} className="text-xs font-bold text-ruby-400 px-2">History</button>} />
      <div className="px-3 pt-3 space-y-4">
        <Card className="grad-blue border-sky-400/20">
          <p className="text-xs text-white/70">Available balance</p>
          <p className="text-2xl font-black tabular-nums mt-1">{formatMoney(state.user.balance)}</p>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className="text-white/70">Turnover requirement</span>
            <span className={cn("font-bold", required > 0 ? "text-gold-300" : "text-emerald-300")}>{required > 0 ? `Bet ${formatMoney(required)} more` : "Completed ✓"}</span>
          </div>
        </Card>

        <Tabs tabs={[{ id: "bank", label: "Bank Card" }, { id: "upi", label: "UPI ID" }]} active={method} onChange={(m) => setMethod(m as "bank" | "upi")} />

        <div className="space-y-2">
          {list.length === 0 && (
            <Card className="text-center py-6 border-dashed border-white/20">
              {method === "bank" ? <Building2 size={28} className="mx-auto text-white/30" /> : <Smartphone size={28} className="mx-auto text-white/30" />}
              <p className="text-sm text-white/60 mt-2">No {method === "bank" ? "bank card" : "UPI ID"} added yet</p>
            </Card>
          )}
          {method === "bank"
            ? state.bankCards.map((c) => (
                <button key={c.id} onClick={() => setSelected(c.id)} className={cn("w-full text-left rounded-2xl p-4 border relative overflow-hidden btn-press", selected === c.id ? "grad-ruby-card border-gold-400/60" : "grad-dark border-white/10")}>
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1"><CreditCard size={14} /> {c.bankName}</span>
                    <span onClick={(e) => { e.stopPropagation(); removeBankCard(c.id); toast("Bank card removed", "info"); }} className="p-1.5 rounded-lg bg-black/30"><Trash2 size={14} /></span>
                  </div>
                  <p className="text-lg font-black tracking-widest mt-3 tabular-nums">{maskString(c.accountNumber, 0, 4).replace(/\*/g, "•")}</p>
                  <div className="flex justify-between text-[11px] text-white/70 mt-2"><span>{c.holder}</span><span>{c.ifsc}</span></div>
                </button>
              ))
            : state.upiAccounts.map((u) => (
                <button key={u.id} onClick={() => setSelected(u.id)} className={cn("w-full text-left rounded-2xl p-4 border flex items-center gap-3 btn-press", selected === u.id ? "grad-ruby-card border-gold-400/60" : "grad-dark border-white/10")}>
                  <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-lg">📱</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{u.upiId}</p>
                    <p className="text-[11px] text-white/60">{u.holder} · {u.app}</p>
                  </div>
                  <span onClick={(e) => { e.stopPropagation(); removeUpi(u.id); toast("UPI ID removed", "info"); }} className="p-1.5 rounded-lg bg-black/30"><Trash2 size={14} /></span>
                </button>
              ))}
          <Button block variant="outline" onClick={() => setAddOpen(true)}><Plus size={16} /> Add {method === "bank" ? "bank card" : "UPI ID"}</Button>
        </div>

        <Card className="space-y-3">
          <p className="text-xs text-white/60">Withdrawal amount</p>
          <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-3 h-12">
            <span className="text-gold-400 font-bold mr-2">₹</span>
            <input type="number" inputMode="decimal" placeholder={`Min ${state.admin.minWithdraw}`} value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 bg-transparent outline-none font-bold" />
            <button onClick={() => setAmount(String(Math.floor(state.user.balance)))} className="text-xs font-bold text-ruby-400">All</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[500, 1000, 5000, 10000].map((p) => (
              <button key={p} onClick={() => setAmount(String(p))} className={cn("py-2 rounded-xl text-xs font-bold border", numericAmount === p ? "grad-gold text-night-950 border-transparent" : "bg-white/5 border-white/10 text-white/70")}>₹{p >= 1000 ? `${p / 1000}K` : p}</button>
            ))}
          </div>
          <div className="text-[11px] text-white/50 space-y-1">
            <p>• Withdrawal limit ₹{state.admin.minWithdraw} – ₹50,000 per request · 3 times per day</p>
            <p>• Processing time 10 min – 24 h · Fee ₹0</p>
            <p>• Turnover: you must wager deposits 1× before withdrawing</p>
          </div>
          <Button block size="lg" variant="green" disabled={!selected || numericAmount <= 0} onClick={() => setConfirmOpen(true)}>Withdraw {numericAmount > 0 ? formatMoney(numericAmount) : ""}</Button>
        </Card>
      </div>

      <AddAccountModal open={addOpen} onClose={() => setAddOpen(false)} method={method} onAddBank={(c) => { addBankCard(c); toast("Bank card added", "success"); }} onAddUpi={(u) => { addUpi(u); toast("UPI ID added", "success"); }} />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm withdrawal" sheet={false}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-white/60">Amount</span><span className="font-black text-gold-400">{formatMoney(numericAmount)}</span></div>
          <div className="flex justify-between"><span className="text-white/60">To</span><span className="font-bold text-right text-xs">{method === "bank" ? `${state.bankCards.find((c) => c.id === selected)?.bankName} ••••${state.bankCards.find((c) => c.id === selected)?.accountNumber.slice(-4)}` : state.upiAccounts.find((u) => u.id === selected)?.upiId}</span></div>
          <div className="flex justify-between"><span className="text-white/60">Fee</span><span className="font-bold">₹0.00</span></div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="green" className="flex-1" onClick={submit}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div>
    <p className="text-xs text-white/60 mb-1">{label}</p>
    {children}
    {error && <p className="text-[11px] text-ruby-400 mt-1">{error}</p>}
  </div>
);
const inputCls = "w-full h-11 rounded-xl bg-black/30 border border-white/10 px-3 text-sm font-semibold outline-none focus:border-ruby-500/60";

export const AddAccountModal: React.FC<{ open: boolean; onClose: () => void; method: "bank" | "upi"; onAddBank: (c: { bankName: string; holder: string; accountNumber: string; ifsc: string; phone: string }) => void; onAddUpi: (u: { upiId: string; holder: string; app: string }) => void }> = ({ open, onClose, method, onAddBank, onAddUpi }) => {
  const [bank, setBank] = useState({ bankName: BANKS[0], holder: "", accountNumber: "", confirm: "", ifsc: "", phone: "" });
  const [upi, setUpi] = useState({ upiId: "", holder: "", app: UPI_APPS[0] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setErrors({});
  }, [open, method]);

  const submitBank = () => {
    const e: Record<string, string> = {};
    if (!/^[A-Za-z][A-Za-z .']{2,49}$/.test(bank.holder.trim())) e.holder = "Enter the account holder name as printed on the passbook (letters only)";
    if (!/^\d{9,18}$/.test(bank.accountNumber)) e.accountNumber = "Account number must be 9-18 digits";
    if (bank.confirm !== bank.accountNumber) e.confirm = "Account numbers do not match";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc)) e.ifsc = "Invalid IFSC (e.g. SBIN0001234)";
    if (!/^[6-9]\d{9}$/.test(bank.phone)) e.phone = "Enter a valid 10-digit Indian mobile number";
    setErrors(e);
    if (Object.keys(e).length) return sfx.error();
    onAddBank({ bankName: bank.bankName, holder: bank.holder.trim(), accountNumber: bank.accountNumber, ifsc: bank.ifsc, phone: bank.phone });
    setBank({ bankName: BANKS[0], holder: "", accountNumber: "", confirm: "", ifsc: "", phone: "" });
    onClose();
  };

  const submitUpi = () => {
    const e: Record<string, string> = {};
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi.upiId.trim())) e.upiId = "Invalid UPI ID (e.g. name@okaxis)";
    if (!/^[A-Za-z][A-Za-z .']{2,49}$/.test(upi.holder.trim())) e.holder = "Enter the UPI account holder name (letters only)";
    setErrors(e);
    if (Object.keys(e).length) return sfx.error();
    onAddUpi({ upiId: upi.upiId.trim().toLowerCase(), holder: upi.holder.trim(), app: upi.app });
    setUpi({ upiId: "", holder: "", app: UPI_APPS[0] });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={method === "bank" ? "Add bank card" : "Add UPI ID"}>
      {method === "bank" ? (
        <div className="space-y-3">
          <Field label="Bank name">
            <select value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} className={inputCls}>
              {BANKS.map((b) => <option key={b} value={b} className="bg-night-800">{b}</option>)}
            </select>
          </Field>
          <Field label="Account holder name" error={errors.holder}><input value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value.replace(/[^A-Za-z .']/g, "") })} placeholder="Full name" className={inputCls} /></Field>
          <Field label="Account number" error={errors.accountNumber}><input value={bank.accountNumber} inputMode="numeric" onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 18) })} placeholder="9-18 digits" className={inputCls} /></Field>
          <Field label="Confirm account number" error={errors.confirm}><input value={bank.confirm} inputMode="numeric" onChange={(e) => setBank({ ...bank, confirm: e.target.value.replace(/\D/g, "").slice(0, 18) })} placeholder="Re-enter account number" className={inputCls} /></Field>
          <Field label="IFSC code" error={errors.ifsc}><input value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) })} placeholder="SBIN0001234" className={cn(inputCls, "uppercase tracking-wider")} /></Field>
          <Field label="Mobile number" error={errors.phone}><input value={bank.phone} inputMode="numeric" onChange={(e) => setBank({ ...bank, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit mobile" className={inputCls} /></Field>
          <p className="text-[11px] text-white/45">Make sure the holder name matches your bank records. Incorrect details may delay withdrawals.</p>
          <Button block size="lg" onClick={submitBank}>Save bank card</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="UPI app">
            <div className="grid grid-cols-3 gap-2">
              {UPI_APPS.map((a) => <button key={a} onClick={() => setUpi({ ...upi, app: a })} className={cn("py-2 rounded-xl text-xs font-bold border", upi.app === a ? "grad-red border-transparent" : "bg-white/5 border-white/10 text-white/70")}>{a}</button>)}
            </div>
          </Field>
          <Field label="UPI ID" error={errors.upiId}><input value={upi.upiId} onChange={(e) => setUpi({ ...upi, upiId: e.target.value.replace(/\s/g, "") })} placeholder="yourname@okaxis" className={inputCls} /></Field>
          <Field label="Account holder name" error={errors.holder}><input value={upi.holder} onChange={(e) => setUpi({ ...upi, holder: e.target.value.replace(/[^A-Za-z .']/g, "") })} placeholder="Full name" className={inputCls} /></Field>
          <p className="text-[11px] text-white/45">Supported handles: @okaxis, @ybl, @paytm, @upi, @ibl, @axl, @oksbi and more.</p>
          <Button block size="lg" onClick={submitUpi}>Save UPI ID</Button>
        </div>
      )}
    </Modal>
  );
};

// ================= HISTORIES =================
export const DepositHistory: React.FC = () => {
  const { state } = useApp();
  const [filter, setFilter] = useState("all");
  const list = state.deposits.filter((d) => filter === "all" || d.status === filter);
  return (
    <div className="safe-bottom">
      <PageHeader title="Deposit history" />
      <div className="px-3 pt-3 space-y-3">
        <Tabs tabs={[{ id: "all", label: "All" }, { id: "pending", label: "Pending" }, { id: "approved", label: "Success" }, { id: "rejected", label: "Failed" }]} active={filter} onChange={setFilter} />
        {list.length === 0 && <EmptyState text="No deposit records" />}
        {list.map((d) => (
          <Card key={d.id} className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs font-bold px-2 py-1 rounded-md grad-red">Deposit</span>{statusPill(d.status)}</div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Amount</span><span className="font-black text-gold-400">{formatMoney(d.amount)} {d.bonus > 0 && <span className="text-emerald-400 text-[10px]">+{formatMoney(d.bonus)} bonus</span>}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Channel</span><span className="font-bold">{d.channel}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">UTR</span><span className="font-mono">{d.utr}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Order</span><span className="font-mono text-white/70">{d.id}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Time</span><span>{formatDateTime(d.createdAt)}</span></div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const WithdrawHistory: React.FC = () => {
  const { state } = useApp();
  const [filter, setFilter] = useState("all");
  const list = state.withdrawals.filter((d) => filter === "all" || d.status === filter);
  return (
    <div className="safe-bottom">
      <PageHeader title="Withdrawal history" />
      <div className="px-3 pt-3 space-y-3">
        <Tabs tabs={[{ id: "all", label: "All" }, { id: "pending", label: "Pending" }, { id: "approved", label: "Success" }, { id: "rejected", label: "Rejected" }]} active={filter} onChange={setFilter} />
        {list.length === 0 && <EmptyState text="No withdrawal records" />}
        {list.map((w) => (
          <Card key={w.id} className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs font-bold px-2 py-1 rounded-md grad-blue">Withdraw</span>{statusPill(w.status)}</div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Amount</span><span className="font-black text-gold-400">{formatMoney(w.amount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Type</span><span className="font-bold uppercase">{w.method}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Account</span><span className="font-bold">{w.accountLabel}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Order</span><span className="font-mono text-white/70">{w.id}</span></div>
            <div className="flex justify-between text-xs"><span className="text-white/50">Time</span><span>{formatDateTime(w.createdAt)}</span></div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const Transactions: React.FC = () => {
  const { state } = useApp();
  const [filter, setFilter] = useState("all");
  const list = useMemo(() => state.transactions.filter((t) => filter === "all" || (filter === "bonus" ? ["bonus", "rebate", "commission", "refund", "adjust"].includes(t.type) : t.type === filter)), [state.transactions, filter]);
  const totals = useMemo(() => ({ in: list.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0), out: list.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0) }), [list]);
  return (
    <div className="safe-bottom">
      <PageHeader title="Transaction history" />
      <div className="px-3 pt-3 space-y-3">
        <Tabs tabs={[{ id: "all", label: "All" }, { id: "deposit", label: "Deposit" }, { id: "withdraw", label: "Withdraw" }, { id: "bet", label: "Bets" }, { id: "win", label: "Wins" }, { id: "bonus", label: "Bonus" }]} active={filter} onChange={setFilter} />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Total in" value={formatMoney(totals.in)} valueClass="text-emerald-400" />
          <Stat label="Total out" value={formatMoney(totals.out)} valueClass="text-ruby-400" />
        </div>
        <Card className="p-0 divide-y divide-white/5">
          {list.length === 0 && <EmptyState text="No transactions" />}
          {list.slice(0, 100).map((t) => <TxRow key={t.id} t={t} />)}
        </Card>
      </div>
    </div>
  );
};
