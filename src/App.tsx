/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import { motion, AnimatePresence } from "motion/react";
import { RewardsProvider } from "./context/RewardsContext";
import CoinToastStack from "./components/CoinToast";

export interface User {
  username: string;
  firstName: string;
  lastName?: string;
  profileImage?: string;
}

const GUEST_DURATION = 10 * 60; // 10 minutos de acesso total
const GUEST_COOLDOWN = 5 * 60; // 5 minutos de bloqueio após expirar
const COOLDOWN_KEY   = "devgenius_guest_cooldown_until";

export default function App() {
  const [user, setUser]               = useState<User | null>(null);
  const [loading, setLoading]         = useState(true);
  const [showAuth, setShowAuth]       = useState(true);
  const [tourActive, setTourActive]   = useState(false);
  const [guestActive, setGuestActive] = useState(false);
  const [guestTimeLeft, setGuestTimeLeft] = useState(GUEST_DURATION);
  const [cooldownLeft, setCooldownLeft]   = useState(() => {
    const until     = parseInt(localStorage.getItem(COOLDOWN_KEY) || "0");
    const remaining = Math.max(0, Math.floor((until - Date.now()) / 1000));
    return remaining;
  });

  useEffect(() => { setLoading(false); }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setShowAuth(false);
    setCooldownLeft(0);
  };

  const handleStartTour  = () => { setShowAuth(false); setTourActive(true); };

  const handleStartGuest = () => {
    if (cooldownLeft > 0) return;
    Object.keys(localStorage)
      .filter(k =>
        k.startsWith("devgenius_collection") ||
        k.startsWith("guest_") ||
        k.startsWith("tests_v3_guest")
      )
      .forEach(k => localStorage.removeItem(k));
    sessionStorage.setItem("guestSession", Date.now().toString());
    setGuestActive(true);
    setGuestTimeLeft(GUEST_DURATION);
    setShowAuth(false);
  };

  // Countdown visitante (6 min)
  useEffect(() => {
    if (!guestActive || user) return;
    if (guestTimeLeft <= 0) {
      const until = Date.now() + GUEST_COOLDOWN * 1000;
      localStorage.setItem(COOLDOWN_KEY, String(until));
      setCooldownLeft(GUEST_COOLDOWN);
      setGuestActive(false);
      setShowAuth(true);
      return;
    }
    const t = setTimeout(() => setGuestTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [guestActive, guestTimeLeft, user]);

  // Countdown bloqueio (5 min)
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => {
      setCooldownLeft(s => {
        const next = s - 1;
        if (next <= 0) localStorage.removeItem(COOLDOWN_KEY);
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  const handleLogout = () => {
    setUser(null);
    setGuestActive(false);
    setShowAuth(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <RewardsProvider username={user?.username}>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-cyan-500/30">
        <CoinToastStack />

        <Dashboard
          user={user}
          onLogout={handleLogout}
          onAuthRequired={() => setShowAuth(true)}
          tourActive={tourActive}
          onEndTour={() => setTourActive(false)}
          guestTimeLeft={guestActive ? guestTimeLeft : null}
          guestFullAccess={guestActive}
        />

        {/* Badge de tempo de visitante */}
        {guestActive && !user && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`fixed top-3 right-3 z-[500] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 ${
              guestTimeLeft <= 60
                ? "bg-red-500 text-white animate-pulse"
                : "bg-amber-500 text-neutral-950"
            }`}
          >
            ⏱ Visitante: {Math.floor(guestTimeLeft / 60)}:{String(guestTimeLeft % 60).padStart(2, "0")}
            {guestTimeLeft <= 60 && <span className="text-[8px]"> — expirando!</span>}
          </motion.div>
        )}

        <AnimatePresence>
          {showAuth && (
            <motion.div
              key="auth-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md overflow-y-auto py-12"
            >
              <div className="min-h-full flex items-center justify-center p-6">
                <AuthPage
                  onLogin={handleLogin}
                  onClose={user ? () => setShowAuth(false) : undefined}
                  onStartTour={handleStartTour}
                  onStartGuest={cooldownLeft <= 0 ? handleStartGuest : undefined}
                  guestCooldown={cooldownLeft}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RewardsProvider>
  );
}
