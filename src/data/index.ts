export type GameCategory = "lottery" | "mini" | "popular" | "slots" | "casino" | "cards" | "table" | "arcade";
export type ExtraGameMode = "slot" | "roulette" | "cards" | "arcade";

export interface GameDef {
  id: string;
  name: string;
  subtitle: string;
  route: string;
  category: GameCategory[];
  gradient: string;
  emoji: string;
  mode?: ExtraGameMode;
  variant?: string;
  hot?: boolean;
  isNew?: boolean;
}

export const GAMES: GameDef[] = [
  { id: "wingo", name: "Win Go", subtitle: "Guess Number / Color", route: "/wingo", category: ["lottery", "popular"], gradient: "grad-red", emoji: "🎯", hot: true },
  { id: "trx", name: "Trx Win", subtitle: "Block Hash Lottery", route: "/trx", category: ["lottery"], gradient: "grad-green", emoji: "⛓️" },
  { id: "k3", name: "K3 Dice", subtitle: "3 Dice Totals", route: "/k3", category: ["lottery", "popular"], gradient: "grad-violet", emoji: "🎲" },
  { id: "5d", name: "5D Lotre", subtitle: "5 Digit Lottery", route: "/5d", category: ["lottery"], gradient: "grad-blue", emoji: "🔢" },
  { id: "skyrush", name: "Sky Rush", subtitle: "Crash & Cash Out", route: "/skyrush", category: ["mini", "popular"], gradient: "grad-red", emoji: "✈️", hot: true },
  { id: "mines", name: "Mines", subtitle: "Avoid the Bombs", route: "/mines", category: ["mini", "popular"], gradient: "grad-dark", emoji: "💣", hot: true },
  { id: "dice", name: "Dice", subtitle: "Roll Over / Under", route: "/dice", category: ["mini"], gradient: "grad-green", emoji: "🎲" },
  { id: "plinko", name: "Plinko", subtitle: "Drop the Ball", route: "/plinko", category: ["mini", "popular"], gradient: "grad-violet", emoji: "🟣" },
  { id: "limbo", name: "Limbo", subtitle: "Target Multiplier", route: "/limbo", category: ["mini"], gradient: "grad-gold", emoji: "🚀", isNew: true },
  { id: "keno", name: "Keno", subtitle: "Pick 1-10 Numbers", route: "/keno", category: ["mini"], gradient: "grad-blue", emoji: "🔮" },
  { id: "hilo", name: "Hi-Lo", subtitle: "Higher or Lower", route: "/hilo", category: ["mini"], gradient: "grad-red", emoji: "🃏", isNew: true },
  { id: "goal", name: "Goal", subtitle: "Penalty Shootout", route: "/goal", category: ["mini"], gradient: "grad-green", emoji: "⚽" },
  { id: "wheel", name: "Mini Wheel", subtitle: "Spin to Win", route: "/wheel", category: ["mini", "popular"], gradient: "grad-gold", emoji: "🎡" },
  { id: "slot-classic", name: "Classic 777", subtitle: "Three-reel slot", route: "/slot-classic", category: ["slots", "popular"], gradient: "grad-red", emoji: "🎰", mode: "slot", variant: "classic", hot: true },
  { id: "roulette-eu", name: "European Roulette", subtitle: "Single-zero wheel", route: "/roulette-eu", category: ["casino", "table", "popular"], gradient: "grad-red", emoji: "🎡", mode: "roulette", variant: "european", hot: true },
  { id: "roulette-american", name: "American Roulette", subtitle: "Double-zero wheel", route: "/roulette-american", category: ["casino", "table"], gradient: "grad-violet", emoji: "🎯", mode: "roulette", variant: "american" },
  { id: "baccarat", name: "Baccarat", subtitle: "Player · Banker · Tie", route: "/baccarat", category: ["casino", "cards", "popular"], gradient: "grad-red", emoji: "🂡", mode: "cards", variant: "baccarat" },
  { id: "blackjack", name: "Blackjack", subtitle: "Beat the dealer", route: "/blackjack", category: ["casino", "cards", "popular"], gradient: "grad-green", emoji: "🃏", mode: "cards", variant: "blackjack", hot: true },
  { id: "teen-patti", name: "Teen Patti", subtitle: "Three-card showdown", route: "/teen-patti", category: ["casino", "cards"], gradient: "grad-red", emoji: "♠️", mode: "cards", variant: "teen-patti" },
  { id: "andar-bahar", name: "Andar Bahar", subtitle: "Pick the winning side", route: "/andar-bahar", category: ["casino", "cards"], gradient: "grad-blue", emoji: "🃏", mode: "cards", variant: "andar-bahar" },
  { id: "dragon-tiger", name: "Dragon Tiger", subtitle: "One-card duel", route: "/dragon-tiger", category: ["casino", "cards"], gradient: "grad-red", emoji: "🐲", mode: "cards", variant: "dragon-tiger" },
  { id: "casino-war", name: "Casino War", subtitle: "High card wins", route: "/casino-war", category: ["casino", "cards"], gradient: "grad-gold", emoji: "⚔️", mode: "cards", variant: "casino-war" },
  { id: "poker-draw", name: "Video Poker", subtitle: "Five-card draw", route: "/poker-draw", category: ["casino", "cards"], gradient: "grad-violet", emoji: "♦️", mode: "cards", variant: "poker" },
  { id: "sic-bo", name: "Sic Bo", subtitle: "Three dice table", route: "/sic-bo", category: ["casino", "table"], gradient: "grad-green", emoji: "🎲", mode: "arcade", variant: "sicbo" },
  { id: "craps", name: "Craps", subtitle: "Roll the dice", route: "/craps", category: ["casino", "table"], gradient: "grad-red", emoji: "🎲", mode: "arcade", variant: "craps" },
  { id: "coinflip", name: "Coin Flip", subtitle: "Heads or tails", route: "/coinflip", category: ["casino", "table"], gradient: "grad-gold", emoji: "🪙", mode: "arcade", variant: "coinflip" },
  { id: "red-black", name: "Red or Black", subtitle: "Pick a colour", route: "/red-black", category: ["casino", "table"], gradient: "grad-red", emoji: "🔴", mode: "arcade", variant: "red-black" },
  { id: "scratch-cards", name: "Scratch Cards", subtitle: "Reveal three symbols", route: "/scratch-cards", category: ["arcade", "popular"], gradient: "grad-gold", emoji: "🎟️", mode: "arcade", variant: "scratch", hot: true },
  { id: "balloon-pop", name: "Balloon Pop", subtitle: "Pump or cash out", route: "/balloon-pop", category: ["arcade"], gradient: "grad-red", emoji: "🎈", mode: "arcade", variant: "balloon" },
  { id: "tower-climb", name: "Tower Climb", subtitle: "Choose a safe step", route: "/tower-climb", category: ["arcade"], gradient: "grad-violet", emoji: "🗼", mode: "arcade", variant: "tower" },
  { id: "lucky-wheel", name: "Lucky Wheel", subtitle: "Spin the prize wheel", route: "/lucky-wheel", category: ["arcade", "popular"], gradient: "grad-gold", emoji: "🎡", mode: "arcade", variant: "wheel" },
  { id: "mega-wheel", name: "Mega Wheel", subtitle: "High-volatility wheel", route: "/mega-wheel", category: ["arcade"], gradient: "grad-violet", emoji: "🌟", mode: "arcade", variant: "mega-wheel" },
  { id: "bingo-90", name: "Bingo 90", subtitle: "Pick numbers, match the draw", route: "/bingo-90", category: ["arcade", "table"], gradient: "grad-blue", emoji: "🎱", mode: "arcade", variant: "bingo" },
  { id: "keno-speed", name: "Keno Speed", subtitle: "Quick number draw", route: "/keno-speed", category: ["arcade", "table"], gradient: "grad-green", emoji: "🔮", mode: "arcade", variant: "keno" },
  { id: "treasure-dig", name: "Treasure Dig", subtitle: "Choose a hidden chest", route: "/treasure-dig", category: ["arcade"], gradient: "grad-gold", emoji: "🗺️", mode: "arcade", variant: "treasure" },
  { id: "mines-deluxe", name: "Mines Deluxe", subtitle: "A 4×4 gem hunt", route: "/mines-deluxe", category: ["arcade", "popular"], gradient: "grad-dark", emoji: "💣", mode: "arcade", variant: "mines-deluxe" },
  { id: "plinko-pro", name: "Plinko Pro", subtitle: "A new pegboard challenge", route: "/plinko-pro", category: ["arcade"], gradient: "grad-violet", emoji: "🟣", mode: "arcade", variant: "plinko-pro" },
];

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  route: string;
  imageUrl: string;
  enabled: boolean;
}

export interface AnnouncementDef {
  title: string;
  body: string;
}

export const DEFAULT_BANNERS: PromoBanner[] = [
  { id: "poster-main", title: "Welcome bonus up to ₹1,500", subtitle: "Register today — bonus lands in your wallet instantly.", cta: "Register now", route: "/register", imageUrl: "/images/rubywin-poster.png", enabled: true },
  { id: "poster-dragon", title: "Dragon vs Tiger", subtitle: "Live one-card duel. Pick a side and win up to 11x.", cta: "Play Dragon Tiger", route: "/dragon-tiger", imageUrl: "/images/game-dragon-tiger.jpg", enabled: true },
  { id: "poster-roulette", title: "European Roulette", subtitle: "Straight-up numbers pay 36x. Table is always live.", cta: "Spin now", route: "/roulette-eu", imageUrl: "/images/game-roulette.jpg", enabled: true },
  { id: "poster-referral", title: "Referral bonus up to 500%", subtitle: "Get a bonus on every friend's first approved deposit.", cta: "Get invite code", route: "/promotion", imageUrl: "/images/game-slot-classic.jpg", enabled: true },
  { id: "poster-deposit", title: "First deposit up to 900%", subtitle: "Pay by UPI — bonus is credited automatically after approval.", cta: "Deposit now", route: "/deposit", imageUrl: "/images/game-cards-table.jpg", enabled: true },
];

export const GAME_LABELS: Record<string, string> = Object.fromEntries(GAMES.map((g) => [g.id, g.name]));

export const AVATARS = ["🦁", "🐯", "🐉", "🦊", "🐼", "🦄", "🐺", "🦅", "👑", "💎", "🔥", "⚡"];
export const AVATAR_BG = ["grad-red", "grad-gold", "grad-violet", "grad-green", "grad-blue", "grad-red", "grad-dark", "grad-violet", "grad-gold", "grad-blue", "grad-red", "grad-green"];

export interface VipLevel {
  level: number;
  exp: number;
  levelUpReward: number;
  monthlyReward: number;
  rebate: number;
  color: string;
}

export const VIP_LEVELS: VipLevel[] = [
  { level: 0, exp: 0, levelUpReward: 0, monthlyReward: 0, rebate: 0.05, color: "from-slate-400 to-slate-600" },
  { level: 1, exp: 3000, levelUpReward: 60, monthlyReward: 30, rebate: 0.1, color: "from-amber-600 to-amber-800" },
  { level: 2, exp: 30000, levelUpReward: 180, monthlyReward: 90, rebate: 0.15, color: "from-slate-300 to-slate-500" },
  { level: 3, exp: 400000, levelUpReward: 690, monthlyReward: 290, rebate: 0.2, color: "from-yellow-300 to-yellow-600" },
  { level: 4, exp: 4000000, levelUpReward: 1890, monthlyReward: 890, rebate: 0.25, color: "from-cyan-300 to-cyan-600" },
  { level: 5, exp: 20000000, levelUpReward: 6900, monthlyReward: 1890, rebate: 0.3, color: "from-purple-300 to-purple-600" },
  { level: 6, exp: 80000000, levelUpReward: 16900, monthlyReward: 6900, rebate: 0.35, color: "from-rose-300 to-rose-600" },
  { level: 7, exp: 300000000, levelUpReward: 69000, monthlyReward: 16900, rebate: 0.4, color: "from-emerald-300 to-emerald-600" },
  { level: 8, exp: 1000000000, levelUpReward: 169000, monthlyReward: 69000, rebate: 0.45, color: "from-red-400 to-red-700" },
  { level: 9, exp: 5000000000, levelUpReward: 690000, monthlyReward: 169000, rebate: 0.5, color: "from-fuchsia-300 to-fuchsia-700" },
  { level: 10, exp: 9999999999, levelUpReward: 1690000, monthlyReward: 690000, rebate: 0.6, color: "from-yellow-200 via-amber-400 to-orange-600" },
];

export function getVipLevel(exp: number): VipLevel {
  let cur = VIP_LEVELS[0];
  for (const l of VIP_LEVELS) if (exp >= l.exp) cur = l;
  return cur;
}

export const GIFT_CODES: Record<string, number> = {
  RUBYWIN: 100,
  WELCOME50: 50,
  LUCKY777: 77,
  RUBY2026: 26,
};

export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  target: number;
  reward: number;
  type: "bets" | "volume" | "deposit" | "games" | "checkin";
}

export const MISSIONS: MissionDef[] = [
  { id: "bet5", title: "Place 5 bets", desc: "Play any game 5 times today", target: 5, reward: 10, type: "bets" },
  { id: "bet20", title: "Place 20 bets", desc: "Play any game 20 times today", target: 20, reward: 30, type: "bets" },
  { id: "vol500", title: "Bet ₹500 total", desc: "Wager ₹500 across any games today", target: 500, reward: 20, type: "volume" },
  { id: "vol5000", title: "Bet ₹5,000 total", desc: "Wager ₹5,000 across any games today", target: 5000, reward: 100, type: "volume" },
  { id: "games3", title: "Explore 3 games", desc: "Play 3 different games today", target: 3, reward: 15, type: "games" },
  { id: "dep1", title: "Make a deposit", desc: "Complete one approved deposit today", target: 1, reward: 50, type: "deposit" },
  { id: "checkin", title: "Daily attendance", desc: "Check in today", target: 1, reward: 5, type: "checkin" },
];

export const ATTENDANCE_REWARDS = [5, 10, 15, 20, 30, 50, 100];

export const COMMISSION_TIERS = [
  { level: 1, teamSize: 0, teamBet: 0, l1: 0.6, l2: 0.18, l3: 0.054, l4: 0.016, l5: 0.005, l6: 0.0015 },
  { level: 2, teamSize: 5, teamBet: 500000, l1: 0.7, l2: 0.245, l3: 0.085, l4: 0.03, l5: 0.01, l6: 0.0036 },
  { level: 3, teamSize: 10, teamBet: 1000000, l1: 0.75, l2: 0.28, l3: 0.1, l4: 0.039, l5: 0.014, l5b: 0, l6: 0.0055 },
  { level: 4, teamSize: 15, teamBet: 2500000, l1: 0.8, l2: 0.32, l3: 0.128, l4: 0.051, l5: 0.02, l6: 0.0081 },
  { level: 5, teamSize: 20, teamBet: 3500000, l1: 0.85, l2: 0.36, l3: 0.153, l4: 0.065, l5: 0.027, l6: 0.0117 },
  { level: 6, teamSize: 25, teamBet: 5000000, l1: 0.9, l2: 0.405, l3: 0.182, l4: 0.082, l5: 0.036, l6: 0.0166 },
  { level: 7, teamSize: 30, teamBet: 10000000, l1: 0.95, l2: 0.45, l3: 0.213, l4: 0.101, l5: 0.048, l6: 0.0228 },
  { level: 8, teamSize: 40, teamBet: 50000000, l1: 1.0, l2: 0.5, l3: 0.25, l4: 0.125, l5: 0.062, l6: 0.031 },
];

export const BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank", "Bank of Baroda",
  "Kotak Mahindra Bank", "Canara Bank", "Union Bank of India", "IndusInd Bank", "Yes Bank", "IDFC First Bank",
  "Bank of India", "Central Bank of India", "Indian Bank", "Federal Bank", "Paytm Payments Bank", "Airtel Payments Bank",
];

export const UPI_APPS = ["PhonePe", "Google Pay", "Paytm", "BHIM", "Amazon Pay", "Other"];

export interface DepositChannel {
  id: string;
  name: string;
  desc: string;
  min: number;
  max: number;
  bonus: number;
  emoji: string;
}

export const DEPOSIT_CHANNELS: DepositChannel[] = [
  { id: "upi-qr", name: "UPI QR Pay", desc: "Scan & pay instantly", min: 100, max: 50000, bonus: 3, emoji: "📱" },
  { id: "upi-fast", name: "UPI Fast", desc: "PhonePe / GPay / Paytm", min: 200, max: 100000, bonus: 2, emoji: "⚡" },
  { id: "bank", name: "Bank Transfer", desc: "IMPS / NEFT", min: 500, max: 500000, bonus: 1, emoji: "🏦" },
];

export const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000, 10000, 50000];

export const CHAT_KB: { keys: string[]; answer: string }[] = [
  { keys: ["deposit", "add money", "recharge", "qr"], answer: "To deposit, go to Wallet → Deposit, choose a channel and amount, scan the QR code, pay via UPI and submit your 12-digit UTR. Deposits are credited after admin verification (usually within 5-10 minutes)." },
  { keys: ["withdraw", "payout", "cash out money", "bank"], answer: "Withdrawals: Wallet → Withdraw. Add a bank card or UPI ID first. Minimum ₹110 per request, processed within 24 hours. Make sure your betting turnover is complete." },
  { keys: ["gift", "code", "bonus", "promo"], answer: "Redeem gift codes at Activity → Gift. Try the code RUBYWIN for a welcome bonus! Codes can only be used once per account." },
  { keys: ["vip", "level"], answer: "VIP levels are based on your total betting volume (EXP). Each level unlocks level-up rewards, monthly bonuses and higher rebate rates. Check Account → VIP for details." },
  { keys: ["invite", "refer", "agent", "commission", "promotion"], answer: "Share your invitation link from the Promotion tab. You earn up to 1% commission on the bets placed by your direct subordinates and smaller percentages for 6 levels deep." },
  { keys: ["win go", "wingo", "color", "lottery"], answer: "Win Go draws every 30s / 1m / 3m / 5m. Bet on Green/Red/Violet (2x / 4.5x), Big/Small (2x) or an exact number (9x). Results are generated from the period seed and can't be changed." },
  { keys: ["crash", "sky rush", "plane", "aviator"], answer: "Sky Rush: place a bet before take-off, then cash out before the plane flies away. Set an auto cash-out multiplier to lock profits automatically." },
  { keys: ["fair", "rigged", "cheat", "scam"], answer: "All RubyWin games use a provably deterministic RNG seeded by the round period. Each result is reproducible and independent of player bets." },
  { keys: ["password", "login", "account", "forgot"], answer: "You can update your nickname, avatar and login password from Account → Settings. For security, never share your password with anyone." },
  { keys: ["hello", "hi", "hey", "namaste"], answer: "Hello! 👋 Welcome to RubyWin support. How can I help you today? You can ask about deposits, withdrawals, bonuses, VIP or games." },
  { keys: ["thank", "thanks"], answer: "You're welcome! 😊 Have a lucky day on RubyWin. Is there anything else I can help you with?" },
  { keys: ["human", "agent", "person", "live"], answer: "Our live agents are available 09:00 – 23:00 IST via Telegram @RubyWinSupport. For urgent issues, please share your UID and a screenshot." },
];

export const QUICK_QUESTIONS = ["How to deposit?", "How to withdraw?", "Gift code?", "VIP benefits", "Is it fair?", "Talk to human"];

export const ANNOUNCEMENTS: AnnouncementDef[] = [
  { title: "Welcome to RubyWin", body: "Enjoy 13 fully functional games, daily attendance rewards and a transparent VIP system. Use gift code RUBYWIN to claim your welcome bonus!" },
  { title: "UPI deposits now live", body: "Deposit via UPI QR, PhonePe, Google Pay or Paytm with up to 5% extra bonus on first-time deposits." },
  { title: "New Arcade Games", body: "Limbo and Hi-Lo have joined the arcade. Try the new games and share feedback with support." },
  { title: "Fairness statement", body: "All results are produced by a deterministic seeded RNG per period and cannot be altered after the round begins." },
];
