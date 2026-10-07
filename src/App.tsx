import React, { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { BottomNav } from "./components/BottomNav";
import { Toasts, Button } from "./components/UI";
import { initAudio } from "./utils/audio";
import { GamesLibrary, Home } from "./pages/Home";
import { Activity, Attendance, GiftPage, Jackpot, Missions, Rebate } from "./pages/Activity";
import { CommissionDetail, Invite, Promotion, PromotionRules, Subordinates } from "./pages/Promotion";
import { Deposit, DepositHistory, Transactions, Wallet, Withdraw, WithdrawHistory } from "./pages/Funds";
import { About, Account, Announcement, BetHistory, CustomerService, Feedback, GameStats, Notifications, Settings, Vip } from "./pages/Account";
import { Admin } from "./pages/Admin";
import { Auth } from "./pages/Auth";
import { TrxWin, WinGo } from "./games/lottery/WinGo";
import { FiveD, K3 } from "./games/lottery/K3FiveD";
import { SkyRush } from "./games/SkyRush";
import { Dice, Mines } from "./games/MinesDice";
import { Keno, Plinko } from "./games/PlinkoKeno";
import { Goal, HiLo, Limbo, MiniWheel } from "./games/Arcade";
import { CasinoGame } from "./games/CasinoGames";
import { GAMES } from "./data";

const ROUTES: Record<string, React.FC> = {
  "/home": Home,
  "/games": GamesLibrary,
  "/activity": Activity,
  "/attendance": Attendance,
  "/gift": GiftPage,
  "/missions": Missions,
  "/rebate": Rebate,
  "/jackpot": Jackpot,
  "/promotion": Promotion,
  "/invite": Invite,
  "/subordinates": Subordinates,
  "/commission": CommissionDetail,
  "/promotion-rules": PromotionRules,
  "/wallet": Wallet,
  "/deposit": Deposit,
  "/withdraw": Withdraw,
  "/deposit-history": DepositHistory,
  "/withdraw-history": WithdrawHistory,
  "/transactions": Transactions,
  "/account": Account,
  "/settings": Settings,
  "/vip": Vip,
  "/game-stats": GameStats,
  "/bet-history": BetHistory,
  "/notifications": Notifications,
  "/service": CustomerService,
  "/announcement": Announcement,
  "/feedback": Feedback,
  "/about": About,
  "/wingo": WinGo,
  "/trx": TrxWin,
  "/k3": K3,
  "/5d": FiveD,
  "/skyrush": SkyRush,
  "/mines": Mines,
  "/dice": Dice,
  "/plinko": Plinko,
  "/limbo": Limbo,
  "/keno": Keno,
  "/hilo": HiLo,
  "/goal": Goal,
  "/wheel": MiniWheel,
};

const PUBLIC_ROUTES = new Set(["/login", "/register", "/admin"]);
const NO_NAV = new Set(["/admin", "/service", "/login", "/register"]);
/** Hide the bottom nav on game, deposit and withdraw pages so it never covers the bet / payment buttons. The top back button still works. */
const HIDE_NAV = new Set([
  "/wingo", "/trx", "/k3", "/5d", "/skyrush", "/mines", "/dice", "/plinko", "/limbo", "/keno", "/hilo", "/goal", "/wheel",
  "/deposit", "/withdraw",
]);
/** Pages that require an account (money / profile). Everything else is browsable as a guest; betting itself prompts login. */
const AUTH_REQUIRED = new Set(["/wallet", "/deposit", "/withdraw", "/deposit-history", "/withdraw-history", "/transactions", "/account", "/settings", "/vip", "/game-stats", "/bet-history", "/notifications", "/promotion", "/invite", "/subordinates", "/commission", "/attendance", "/gift", "/missions", "/rebate", "/jackpot"]);

const NotFound: React.FC = () => {
  const { navigate } = useApp();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-black text-xl">Page not found</h1>
      <p className="text-sm text-white/50">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate("/home")}>Go home</Button>
    </div>
  );
};

const Shell: React.FC = () => {
  const { route, isLoggedIn } = useApp();
  useEffect(() => {
    initAudio();
  }, []);

  const isAdmin = route === "/admin";
  const extraGame = GAMES.find((game) => game.route === route && game.mode);
  const needsAuth = !isLoggedIn && (route === "/login" || route === "/register" || AUTH_REQUIRED.has(route));
  let content: React.ReactNode;
  if (isAdmin) content = <Admin />;
  else if (needsAuth) content = <Auth />;
  else if (route === "/login" || route === "/register") content = <Home />;
  else if (ROUTES[route]) {
    const Page = ROUTES[route];
    content = <Page />;
  } else if (extraGame) content = <CasinoGame game={extraGame} />;
  else content = <NotFound />;

  const showNav = !needsAuth && !NO_NAV.has(route) && !PUBLIC_ROUTES.has(route) && !HIDE_NAV.has(route) && !extraGame && !!ROUTES[route];

  return (
    <div className="min-h-screen app-shell text-white">
      <div className={`relative mx-auto w-full ${isAdmin ? "max-w-none" : "max-w-[430px]"} min-h-screen bg-night-900/60 shadow-[0_0_60px_rgba(0,0,0,0.6)]`}>
        <div key={`${route}-${isLoggedIn ? "in" : "out"}`} className="animate-fade-in">
          {content}
        </div>
        {showNav && <BottomNav />}
        <Toasts />
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <Shell />
  </AppProvider>
);

export default App;
