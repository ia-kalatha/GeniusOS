// ─── RewardsContext — DevCoins global state ───────────────────────────────────
// Toast isolado em contexto separado para NÃO re-renderizar Dashboard ao exibir toast
import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, useMemo,
} from "react";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface RewardsCatalogItem { id: string; name: string; cost: number; type: string; icon: string; desc: string; }
type ToastItem = { id: string; amount: number; redeemed: boolean };

// ── Contexto de Toast (isolado) ───────────────────────────────────────────────
const ToastContext = createContext<{
  queue: ToastItem[];
  dismiss: (id: string) => void;
}>({ queue: [], dismiss: () => {} });

export function useToastQueue() { return useContext(ToastContext); }

// ── Contexto principal (sem toast) ────────────────────────────────────────────
interface RewardsContextType {
  balance: number;
  purchasedItems: string[];
  boostActive: boolean;
  catalog: RewardsCatalogItem[];
  username: string | undefined;
  pendingCount: number;
  pendingCoins: number;
  claimEvent: (eventKey: string, coins: number, meta?: Record<string, any>) => Promise<void>;
  redeemEvent: (eventId: string) => Promise<{ ok: boolean; error?: string }>;
  purchaseReward: (rewardId: string) => Promise<{ ok: boolean; error?: string }>;
  fetchBalance: (username: string) => Promise<void>;
  refreshPending: () => void;
  // mantido por compatibilidade — não faz nada
  toastQueue: ToastItem[];
  dismissToast: (id: string) => void;
}

const RewardsContext = createContext<RewardsContextType>({
  balance: 0, purchasedItems: [], boostActive: false, catalog: [],
  username: undefined, pendingCount: 0, pendingCoins: 0,
  toastQueue: [], dismissToast: () => {},
  claimEvent: async () => {}, redeemEvent: async () => ({ ok: false }),
  purchaseReward: async () => ({ ok: false }),
  fetchBalance: async () => {}, refreshPending: () => {},
});

export function useRewards() { return useContext(RewardsContext); }

// ── Provider ──────────────────────────────────────────────────────────────────
export function RewardsProvider({ children, username }: { children: React.ReactNode; username?: string }) {
  const [balance, setBalance]           = useState(0);
  const [purchasedItems, setPurchased]  = useState<string[]>([]);
  const [boostUntil, setBoostUntil]     = useState<number | null>(null);
  const [catalog, setCatalog]           = useState<RewardsCatalogItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingCoins, setPendingCoins] = useState(0);

  // Toast em ref + estado local isolado — nunca propaga para cima
  const [toastQueue, setToastQueue]     = useState<ToastItem[]>([]);
  const toastRef = useRef(setToastQueue); // ref estável para não precisar de deps
  toastRef.current = setToastQueue;

  const claimInFlight   = useRef(new Set<string>());
  const pendingDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boostActive = boostUntil != null && Date.now() < boostUntil;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const pushToast = useCallback((amount: number, redeemed: boolean) => {
    if (amount <= 0) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    toastRef.current(q => [...q.slice(-2), { id, amount, redeemed }]);
    setTimeout(() => toastRef.current(q => q.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToastQueue(q => q.filter(t => t.id !== id));
  }, []);

  // ── Carrega catálogo ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/rewards/catalog").then(r => r.json()).then(setCatalog).catch(() => {});
  }, []);

  // ── fetchBalance ─────────────────────────────────────────────────────────────
  const fetchBalance = useCallback(async (uname: string) => {
    try {
      const res = await fetch(`/api/rewards/balance/${encodeURIComponent(uname)}`);
      if (!res.ok) return;
      const d = await res.json();
      setBalance(d.coins || 0);
      setPurchased(d.purchasedItems || []);
      setBoostUntil(d.boostUntil || null);
    } catch {}
  }, []);

  // ── refreshPending ────────────────────────────────────────────────────────────
  const refreshPending = useCallback(() => {
    if (!username) { setPendingCount(0); setPendingCoins(0); return; }
    fetch(`/api/rewards/pending-count/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(d => { setPendingCount(d.count || 0); setPendingCoins(d.totalCoins || 0); })
      .catch(() => {});
  }, [username]);

  // ── Sync ao logar ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!username) {
      setBalance(0); setPendingCount(0); setPendingCoins(0); return;
    }
    fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) { setBalance(d.coins || 0); setPurchased(d.purchasedItems || []); } })
      .catch(() => {});
    fetchBalance(username);
    refreshPending();
  }, [username, fetchBalance, refreshPending]);

  // ── claimEvent (fire-and-forget, sem re-render síncrono) ──────────────────────
  const claimEvent = useCallback(async (eventKey: string, coins: number, meta?: Record<string, any>) => {
    if (!username) return;
    const key = `${username}:${eventKey}`;
    if (claimInFlight.current.has(key)) return;
    claimInFlight.current.add(key);
    try {
      const res  = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, eventKey, coins, meta }),
      });
      const data = await res.json();
      if (data.ok && data.pending) {
        // Toast isolado — não afeta Dashboard
        pushToast(data.coinsPending || coins, false);
        // Badge atualiza com debounce de 800ms
        if (pendingDebounce.current) clearTimeout(pendingDebounce.current);
        pendingDebounce.current = setTimeout(() => {
          setPendingCount(c => c + 1);
          setPendingCoins(c => c + (data.coinsPending || coins));
        }, 800);
      }
    } catch {
    } finally {
      claimInFlight.current.delete(key);
    }
  }, [username, pushToast]);

  // ── redeemEvent ───────────────────────────────────────────────────────────────
  const redeemEvent = useCallback(async (eventId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!username) return { ok: false, error: "Não autenticado" };
    try {
      const res  = await fetch(`/api/rewards/redeem/${eventId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.ok) {
        setBalance(data.newBalance);
        setPendingCount(c => Math.max(0, c - 1));
        setPendingCoins(c => Math.max(0, c - (data.coinsAdded || 0)));
        pushToast(data.coinsAdded, true);
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch {
      return { ok: false, error: "Erro de conexão" };
    }
  }, [username, pushToast]);

  // ── purchaseReward ────────────────────────────────────────────────────────────
  const purchaseReward = useCallback(async (rewardId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!username) return { ok: false, error: "Não autenticado" };
    try {
      const res  = await fetch("/api/rewards/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, rewardId }),
      });
      const data = await res.json();
      if (data.ok) {
        setBalance(data.newBalance);
        setPurchased(data.purchasedItems || []);
        if (data.boostUntil) setBoostUntil(data.boostUntil);
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch {
      return { ok: false, error: "Erro de conexão" };
    }
  }, [username]);

  // ── Valor estável com useMemo ─────────────────────────────────────────────────
  const value = useMemo(() => ({
    balance, purchasedItems, boostActive, catalog, username,
    pendingCount, pendingCoins,
    // compat
    toastQueue, dismissToast: dismiss,
    claimEvent, redeemEvent, purchaseReward, fetchBalance, refreshPending,
  }), [
    balance, purchasedItems, boostActive, catalog, username,
    pendingCount, pendingCoins,
    toastQueue, dismiss,
    claimEvent, redeemEvent, purchaseReward, fetchBalance, refreshPending,
  ]);

  const toastCtx = useMemo(() => ({ queue: toastQueue, dismiss }), [toastQueue, dismiss]);

  return (
    <RewardsContext.Provider value={value}>
      {/* Toast isolado: só CoinToastStack re-renderiza quando toast muda */}
      <ToastContext.Provider value={toastCtx}>
        {children}
      </ToastContext.Provider>
    </RewardsContext.Provider>
  );
}
