/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import { motion, AnimatePresence } from "motion/react";

export interface User {
  username: string;
  firstName: string;
  lastName?: string;
  profileImage?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Force a fresh login every session
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-cyan-500/30">
      <Dashboard 
        user={user} 
        onLogout={handleLogout} 
        onAuthRequired={() => setShowAuth(true)} 
      />
      
      <AnimatePresence>
        {showAuth && (
          <motion.div
            key="auth-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm overflow-y-auto py-12"
          >
            <div className="min-h-full flex items-center justify-center p-6">
              <AuthPage 
                onLogin={handleLogin} 
                onClose={() => setShowAuth(false)} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

