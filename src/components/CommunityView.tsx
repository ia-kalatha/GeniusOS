// ─── CommunityView — Chat Global + Chat Privado + Perfis ─────────────────────
import React, { useState, useEffect, useRef, useCallback } from "react";
import { User } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { Send, Users, MessageCircle, Trash2, Globe, Activity, BadgeCheck, Lock, ArrowLeft, Search, Circle } from "lucide-react";
import { useRewards } from "../context/RewardsContext";
import { LevelCard, LevelChip, useLevelInfo } from "./LevelBadge";

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  avatar: string | null;
  ts: number;
}

interface DMMessage {
  id: string;
  key: string;
  from: string;
  to: string;
  text: string;
  ts: number;
}

interface CommunityUser {
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
}

interface Conversa {
  outro: string;
  text: string;
  ts: number;
  from: string;
}

interface CommunityStats {
  totalUsers: number;
  totalMessages: number;
  onlineNow: number;
}

const COLORS = [
  "#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444",
  "#3b82f6","#ec4899","#84cc16","#f97316","#a855f7",
];

function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return new Date(ts).toLocaleDateString("pt-BR");
}

export default function CommunityView({ user }: { user: User | null }) {
  const { claimEvent, purchasedItems } = useRewards();
  const myLevelInfo = useLevelInfo(user?.username);

  // Título ativo do usuário
  const TITLE_MAP: Record<string, string> = { title_elite: "[ELITE]", title_arquiteto: "[ARQUITETO]" };
  const activeTitle = user ? (localStorage.getItem(`active_title_${user.username}`) || "") : "";
  const titlePrefix = activeTitle && TITLE_MAP[activeTitle] ? TITLE_MAP[activeTitle] + " " : "";
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [stats, setStats]         = useState<CommunityStats | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "dm" | "pesquisar" | "perfil">("chat");

  // ── Social state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allSocialUsers, setAllSocialUsers] = useState<any[]>([]); // todos os users com ID
  const [socialState, setSocialState]     = useState<{ following: string[]; friends: string[]; pendingReceived: number } | null>(null);
  const [friendReqs, setFriendReqs]       = useState<any[]>([]);
  const [followingAction, setFollowingAction] = useState<string | null>(null);
  const [myUserId, setMyUserId]           = useState<string>("");
  const [lastTs, setLastTs]       = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── DM state ──────────────────────────────────────────────────────────────
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [conversas, setConversas]           = useState<Conversa[]>([]);
  const [selectedUser, setSelectedUser]     = useState<CommunityUser | null>(null);
  const [dmMessages, setDmMessages]         = useState<DMMessage[]>([]);
  const [dmInput, setDmInput]               = useState("");
  const [dmSending, setDmSending]           = useState(false);
  const [dmSearch, setDmSearch]             = useState("");
  const [dmLastTs, setDmLastTs]             = useState(0);
  const dmChatRef = useRef<HTMLDivElement>(null);
  const dmPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : "Visitante";

  // ── Carrega mensagens iniciais e inicia polling (grupo) ──────────────────
  useEffect(() => {
    fetchMessages(true);
    fetchStats();
    fetchCommunityUsers();
    pollRef.current = setInterval(() => { fetchMessages(false); fetchStats(); }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Carrega lista de conversas DM ─────────────────────────────────────────
  useEffect(() => {
    if (!displayName || displayName === "Visitante") return;
    fetchConversas();
    const t = setInterval(fetchConversas, 5000);
    return () => clearInterval(t);
  }, [displayName]);

  // ── Polling de DM quando um usuário está selecionado ─────────────────────
  useEffect(() => {
    if (dmPollRef.current) clearInterval(dmPollRef.current);
    if (!selectedUser) return;
    fetchDMs(true);
    dmPollRef.current = setInterval(() => fetchDMs(false), 2500);
    return () => { if (dmPollRef.current) clearInterval(dmPollRef.current); };
  }, [selectedUser]);

  useEffect(() => {
    if (dmChatRef.current) dmChatRef.current.scrollTop = dmChatRef.current.scrollHeight;
  }, [dmMessages]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages(initial: boolean) {
    try {
      const url = initial
        ? "/api/community/messages?limit=80"
        : `/api/community/messages?since=${lastTs}&limit=40`;
      const res  = await fetch(url);
      const data: ChatMessage[] = await res.json();
      if (data.length > 0) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const novos = data.filter(m => !ids.has(m.id));
          return initial ? data : [...prev, ...novos];
        });
        setLastTs(data[data.length - 1].ts);
      }
    } catch {}
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/community/stats");
      setStats(await res.json());
    } catch {}
  }

  async function fetchCommunityUsers() {
    try {
      const res = await fetch("/api/community/users");
      const data: CommunityUser[] = await res.json();
      setCommunityUsers(data.filter(u => u.username !== displayName));
    } catch {}
  }

  async function fetchConversas() {
    if (!displayName || displayName === "Visitante") return;
    try {
      const res = await fetch(`/api/community/dm-list/${encodeURIComponent(displayName)}`);
      setConversas(await res.json());
    } catch {}
  }

  async function fetchDMs(initial: boolean) {
    if (!selectedUser) return;
    try {
      const since = initial ? 0 : dmLastTs;
      const url = `/api/community/dm/${encodeURIComponent(displayName)}/${encodeURIComponent(selectedUser.username)}?limit=80&since=${since}`;
      const res = await fetch(url);
      const data: DMMessage[] = await res.json();
      if (data.length > 0) {
        setDmMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const novos = data.filter(m => !ids.has(m.id));
          return initial ? data : [...prev, ...novos];
        });
        setDmLastTs(data[data.length - 1].ts);
      }
    } catch {}
  }

  async function sendDM() {
    if (!dmInput.trim() || !selectedUser || dmSending) return;
    setDmSending(true);
    const txt = dmInput.trim();
    setDmInput("");
    try {
      await fetch("/api/community/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: displayName, to: selectedUser.username, text: txt }),
      });
      await fetchDMs(false);
      await fetchConversas();
      if (user) claimEvent("dm_sent", 2);
    } finally {
      setDmSending(false);
    }
  }

  async function deleteDM(id: string) {
    await fetch(`/api/community/dm/${id}`, { method: "DELETE" });
    setDmMessages(prev => prev.filter(m => m.id !== id));
  }

  // ── Social functions ──────────────────────────────────────────────────────
  const fetchSocialState = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/social/state/${encodeURIComponent(user.username)}`);
      if (res.ok) setSocialState(await res.json());
    } catch {}
  }, [user]);

  const fetchFriendReqs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/social/friend-requests/${encodeURIComponent(user.username)}`);
      if (res.ok) setFriendReqs(await res.json());
    } catch {}
  }, [user]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    try {
      const res = await fetch(`/api/social/users?search=${encodeURIComponent(q)}`);
      if (res.ok) setSearchResults(await res.json());
    } catch {}
  }, []);

  const handleFollow = async (targetUsername: string) => {
    if (!user || followingAction) return;
    setFollowingAction(targetUsername);
    try {
      await fetch("/api/social/follow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: user.username, to: targetUsername }),
      });
      await fetchSocialState();
    } catch {}
    setFollowingAction(null);
  };

  const handleUnfollow = async (targetUsername: string) => {
    if (!user) return;
    setFollowingAction(targetUsername);
    try {
      await fetch("/api/social/unfollow", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: user.username, to: targetUsername }),
      });
      await fetchSocialState();
    } catch {}
    setFollowingAction(null);
  };

  const handleFriendAccept = async (reqId: string) => {
    if (!user) return;
    await fetch("/api/social/friend-accept", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reqId, username: user.username }),
    });
    await fetchFriendReqs();
    await fetchSocialState();
  };

  const handleFriendIgnore = async (reqId: string) => {
    if (!user) return;
    await fetch("/api/social/friend-ignore", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reqId, username: user.username }),
    });
    await fetchFriendReqs();
    await fetchSocialState();
  };

  // Carrega estado social ao montar e ao trocar de aba
  useEffect(() => {
    if (user) {
      fetchSocialState();
      fetchFriendReqs();
      // Carrega todos os usuários com IDs
      fetch("/api/social/users?search=")
        .then(r => r.json())
        .then((data: any[]) => {
          setAllSocialUsers(data);
          const me = data.find(u => u.username === user.username);
          if (me?.userId) setMyUserId(me.userId);
        })
        .catch(() => {});
    }
  }, [user, fetchSocialState, fetchFriendReqs]);

  useEffect(() => {
    if (activeTab === "pesquisar") handleSearch(searchQuery);
  }, [activeTab]);

  async function sendMessage() {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch("/api/community/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: displayName,
          text: txt,
          avatar: user?.profileImage || null,
        }),
      });
      await fetchMessages(false);
      if (user) claimEvent("community_message", 3);
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(id: string) {
    await fetch(`/api/community/message/${id}`, { method: "DELETE" });
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-5xl font-black tracking-tighter uppercase">
          COMUNIDADE <span className="text-cyan-400">DEVGENIUS</span>
        </h2>
        <p className="text-neutral-500 font-medium">Chat em tempo real · perfis · atividade global</p>

        {/* Stats */}
        {stats && (
          <div className="flex justify-center gap-6 pt-2">
            {[
              { icon: Users,          label: "Membros",     val: stats.totalUsers },
              { icon: MessageCircle,  label: "Mensagens",   val: stats.totalMessages },
              { icon: Activity,       label: "Online agora",val: Math.max(1, stats.onlineNow) },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                <s.icon className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-cyan-400">{s.val}</span> {s.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-900 border border-white/5 rounded-2xl p-1.5 gap-1.5 w-fit mx-auto">
        {([
          { id: "chat",      label: "💬 Chat",       icon: MessageCircle },
          { id: "dm",        label: "🔒 Privado",    icon: Lock },
          { id: "pesquisar", label: `🔍 Pesquisar${socialState?.pendingReceived ? ` (${socialState.pendingReceived})` : ""}`, icon: Search },
          { id: "perfil",    label: "👤 Perfil",     icon: Users },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? "bg-cyan-500 text-neutral-950 shadow-lg" : "text-neutral-500 hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {activeTab === "chat" && (
        <div className="bg-neutral-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col" style={{ height: "60vh" }}>
          {/* Header do chat */}
          <div className="px-6 py-4 bg-neutral-950/60 border-b border-white/5 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-black text-white uppercase tracking-tight">Chat Global DevGenius</span>
            <span className="text-[9px] text-neutral-600 font-bold uppercase ml-auto">
              {messages.length} mensagens
            </span>
          </div>

          {/* Mensagens */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-visible">
            {messages.length === 0 ? (
              <div className="text-center text-neutral-700 py-20">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-black uppercase tracking-widest text-sm">Seja o primeiro a enviar!</p>
              </div>
            ) : messages.map((msg, i) => {
              const isMe = msg.username === displayName;
              const color = colorForName(msg.username);
              const showAvatar = i === 0 || messages[i-1].username !== msg.username;
              return (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex ${isMe ? "justify-start" : "justify-end"} group`}>
                  <div className="flex gap-3 max-w-[75%]">
                    {/* Avatar — esquerda se minha mensagem, direita se de outro */}
                    {isMe && showAvatar && (
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black overflow-hidden self-end"
                        style={{ background: color + "30", border: `2px solid ${color}40` }}>
                        {msg.avatar
                          ? <img src={msg.avatar} className="w-full h-full object-cover" />
                          : <span style={{ color }}>{msg.username[0]?.toUpperCase()}</span>}
                      </div>
                    )}
                    {isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}

                    <div className={`flex flex-col gap-0.5 ${isMe ? "items-start" : "items-end"}`}>
                      {showAvatar && (
                        <div className="flex items-center gap-2 px-1">
                          {isMe && titlePrefix && (
                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">{titlePrefix.trim()}</span>
                          )}
                          <span className="text-[10px] font-black" style={{ color }}>{msg.username}</span>
                          <span className="text-[8px] text-neutral-700">{timeAgo(msg.ts)}</span>
                          {isMe && <BadgeCheck className="w-3 h-3 text-cyan-500" />}
                        </div>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed relative ${
                        isMe
                          ? "bg-cyan-500/20 border border-cyan-500/30 text-white rounded-bl-sm"
                          : "bg-neutral-800/60 border border-white/5 text-neutral-300 rounded-br-sm"
                      }`}>
                        {msg.text}
                        {isMe && (
                          <button onClick={() => deleteMessage(msg.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Trash2 className="w-2.5 h-2.5 text-white" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Avatar do outro — aparece na DIREITA */}
                    {!isMe && showAvatar && (
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black overflow-hidden self-end"
                        style={{ background: color + "30", border: `2px solid ${color}40` }}>
                        {msg.avatar
                          ? <img src={msg.avatar} className="w-full h-full object-cover" />
                          : <span style={{ color }}>{msg.username[0]?.toUpperCase()}</span>}
                      </div>
                    )}
                    {!isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Input de mensagem */}
          <div className="px-4 py-3 bg-neutral-950/60 border-t border-white/5">
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={`Mensagem como ${displayName}...`}
                  maxLength={500}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-neutral-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-neutral-700 font-bold">
                  {input.length}/500
                </span>
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-10 h-10 bg-cyan-500 text-neutral-950 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-lg shadow-cyan-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[8px] text-neutral-700 font-bold uppercase tracking-widest text-center mt-2">
              Mensagens salvas no servidor · visíveis para todos os dispositivos
            </p>
          </div>
        </div>
      )}

      {/* ── DM TAB — Chat Privado ── */}
      {activeTab === "dm" && (
        <div className="flex gap-4" style={{ height: "60vh" }}>

          {/* Painel esquerdo: lista de usuários/conversas */}
          <div className="w-72 flex-shrink-0 bg-neutral-900/40 border border-white/5 rounded-[2rem] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 bg-neutral-950/40">
              <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">CHAT PRIVADO</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600" />
                <input value={dmSearch} onChange={e => setDmSearch(e.target.value)}
                  placeholder="Nome, @usuário ou #ID..."
                  className="w-full bg-neutral-950/60 border border-white/5 rounded-lg pl-8 pr-2 py-1.5 text-[11px] outline-none text-neutral-400 placeholder:text-neutral-700" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-visible">
              {/* Conversas recentes */}
              {conversas.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest px-1 pb-1">CONVERSAS RECENTES</p>
                  {conversas.filter(c =>
                    dmSearch === "" || c.outro.toLowerCase().includes(dmSearch.toLowerCase())
                  ).map(c => {
                    const u = communityUsers.find(x => x.username === c.outro);
                    const isSelected = selectedUser?.username === c.outro;
                    const isMe = c.from === displayName;
                    const color = colorForName(c.outro);
                    return (
                      <button key={c.outro} onClick={() => {
                        const found = communityUsers.find(x => x.username === c.outro)
                          || { username: c.outro, firstName: c.outro, lastName: "", profileImage: null };
                        setSelectedUser(found as CommunityUser);
                        setDmMessages([]); setDmLastTs(0);
                      }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl mb-1 transition-all text-left ${isSelected ? "bg-cyan-500/15 border border-cyan-500/30" : "hover:bg-white/5"}`}>
                        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black overflow-hidden"
                          style={{ background: color + "25", border: `1.5px solid ${color}40` }}>
                          {u?.profileImage
                            ? <img src={u.profileImage} className="w-full h-full object-cover" />
                            : <span style={{ color }}>{c.outro[0]?.toUpperCase()}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-neutral-200 truncate">{c.outro}</p>
                          <p className="text-[9px] text-neutral-600 truncate">
                            {isMe ? "Você: " : ""}{c.text}
                          </p>
                        </div>
                        <span className="text-[8px] text-neutral-700 flex-shrink-0">{timeAgo(c.ts)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Todos os usuários disponíveis */}
              <div className="px-3 py-2 border-t border-white/5">
                <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest px-1 pb-1">TODOS OS USUÁRIOS</p>
                {communityUsers
                  .filter(u => {
                    if (dmSearch === "") return true;
                    const q = dmSearch.toLowerCase();
                    const socialU = allSocialUsers.find(s => s.username === u.username);
                    return (
                      u.username.toLowerCase().includes(q) ||
                      u.firstName.toLowerCase().includes(q) ||
                      (u.lastName || "").toLowerCase().includes(q) ||
                      (socialU?.userId || "").toLowerCase().includes(q)
                    );
                  })
                  .map(u => {
                    const isSelected = selectedUser?.username === u.username;
                    const color = colorForName(u.username);
                    const hasConv = conversas.some(c => c.outro === u.username);
                    const socialU = allSocialUsers.find(s => s.username === u.username);
                    const isFriend = socialState?.friends.includes(u.username);
                    return (
                      <button key={u.username} onClick={() => {
                        setSelectedUser(u);
                        setDmMessages([]); setDmLastTs(0);
                      }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl mb-1 transition-all text-left ${isSelected ? "bg-cyan-500/15 border border-cyan-500/30" : "hover:bg-white/5"}`}>
                        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black overflow-hidden relative"
                          style={{ background: color + "25", border: `1.5px solid ${color}40` }}>
                          {u.profileImage
                            ? <img src={u.profileImage} className="w-full h-full object-cover" />
                            : <span style={{ color }}>{u.firstName[0]?.toUpperCase()}</span>
                          }
                          {hasConv && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-neutral-900" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-neutral-200 truncate">{u.firstName} {u.lastName}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[9px] text-neutral-600">@{u.username}</p>
                            {socialU?.userId && <span className="text-[8px] font-black text-neutral-700 font-mono">{socialU.userId}</span>}
                            {isFriend && <span className="text-[7px] font-black text-emerald-500 uppercase">Amigo</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                {communityUsers.filter(u => {
                  if (dmSearch === "") return true;
                  const q = dmSearch.toLowerCase();
                  const socialU = allSocialUsers.find(s => s.username === u.username);
                  return u.username.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q) || (socialU?.userId || "").toLowerCase().includes(q);
                }).length === 0 && (
                  <p className="text-[10px] text-neutral-700 text-center py-4">Nenhum usuário encontrado</p>
                )}
              </div>
            </div>
          </div>

          {/* Painel direito: conversa */}
          <div className="flex-1 bg-neutral-900/40 border border-white/5 rounded-[2rem] flex flex-col overflow-hidden">
            {!selectedUser ? (
              /* Estado vazio */
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-neutral-700">
                <Lock className="w-14 h-14 opacity-20" />
                <div>
                  <p className="font-black uppercase tracking-widest text-sm">Selecione um usuário</p>
                  <p className="text-[10px] text-neutral-700 mt-1">Escolha um contato na lista para iniciar uma conversa privada</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header da conversa */}
                <div className="px-5 py-3 bg-neutral-950/50 border-b border-white/5 flex items-center gap-3">
                  <button onClick={() => setSelectedUser(null)}
                    className="text-neutral-600 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black overflow-hidden flex-shrink-0"
                    style={{ background: colorForName(selectedUser.username) + "30", border: `1.5px solid ${colorForName(selectedUser.username)}50` }}>
                    {selectedUser.profileImage
                      ? <img src={selectedUser.profileImage} className="w-full h-full object-cover" />
                      : <span style={{ color: colorForName(selectedUser.username) }}>{selectedUser.firstName[0]}</span>
                    }
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="text-[9px] text-neutral-600">@{selectedUser.username} · Chat privado</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-[9px] text-emerald-500 font-black uppercase">
                    <Circle className="w-2 h-2 fill-current animate-pulse" /> Ao vivo
                  </div>
                </div>

                {/* Mensagens DM */}
                <div ref={dmChatRef} className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-visible">
                  {dmMessages.length === 0 ? (
                    <div className="text-center text-neutral-700 py-16">
                      <Lock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-black uppercase tracking-widest text-xs">Início da conversa</p>
                      <p className="text-[9px] mt-1">Mensagens salvas de forma segura no servidor</p>
                    </div>
                  ) : dmMessages.map((msg, i) => {
                    const isMe = msg.from === displayName;
                    const showHeader = i === 0 || dmMessages[i-1].from !== msg.from;
                    return (
                      <motion.div key={msg.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`w-full flex ${isMe ? "justify-start" : "justify-end"} group`}>
                        <div className="flex gap-2.5 max-w-[75%]">
                          {/* Avatar meu — esquerda */}
                          {isMe && showHeader && (
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black self-end overflow-hidden"
                              style={{ background: colorForName(msg.from)+"30", border:`1.5px solid ${colorForName(msg.from)}40` }}>
                              {user?.profileImage
                                ? <img src={user.profileImage} className="w-full h-full object-cover" />
                                : <span style={{ color: colorForName(msg.from) }}>{displayName[0]}</span>}
                            </div>
                          )}
                          {isMe && !showHeader && <div className="w-7 flex-shrink-0" />}

                          <div className={`flex flex-col gap-0.5 ${isMe ? "items-start" : "items-end"}`}>
                            {showHeader && (
                              <div className="flex items-center gap-1.5 px-1">
                                <span className="text-[9px] font-black" style={{ color: colorForName(msg.from) }}>
                                  {isMe ? "Você" : msg.from}
                                </span>
                                <span className="text-[8px] text-neutral-700">{timeAgo(msg.ts)}</span>
                              </div>
                            )}
                            <div className={`relative px-3.5 py-2 rounded-2xl text-sm font-medium leading-relaxed ${
                              isMe
                                ? "bg-cyan-500/20 border border-cyan-500/30 text-white rounded-bl-sm"
                                : "bg-neutral-800/70 border border-white/5 text-neutral-300 rounded-br-sm"
                            }`}>
                              {msg.text}
                              {isMe && (
                                <button onClick={() => deleteDM(msg.id)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Trash2 className="w-2 h-2 text-white" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Avatar do outro — direita */}
                          {!isMe && showHeader && (
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black self-end overflow-hidden"
                              style={{ background: colorForName(msg.from)+"30", border:`1.5px solid ${colorForName(msg.from)}40` }}>
                              <span style={{ color: colorForName(msg.from) }}>{msg.from[0]?.toUpperCase()}</span>
                            </div>
                          )}
                          {!isMe && !showHeader && <div className="w-7 flex-shrink-0" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Input DM */}
                <div className="px-4 py-3 bg-neutral-950/60 border-t border-white/5">
                  {(!user && displayName === "Visitante") ? (
                    <p className="text-center text-[10px] text-neutral-600 font-bold uppercase tracking-widest py-2">
                      🔒 Faça login para enviar mensagens privadas
                    </p>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input value={dmInput}
                        onChange={e => setDmInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDM(); } }}
                        placeholder={`Mensagem para ${selectedUser.firstName}...`}
                        maxLength={500}
                        className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-neutral-600"
                      />
                      <button onClick={sendDM} disabled={!dmInput.trim() || dmSending}
                        className="w-10 h-10 bg-cyan-500 text-neutral-950 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-lg shadow-cyan-500/20">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-[8px] text-neutral-700 font-bold uppercase tracking-widest text-center mt-1.5">
                    Mensagens privadas · salvas no servidor · só você e {selectedUser.firstName} veem
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PESQUISAR TAB ── */}
      {activeTab === "pesquisar" && (
        <div className="space-y-5">
          {/* Pedidos de amizade pendentes */}
          {friendReqs.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                🤝 Pedidos de amizade ({friendReqs.length})
              </p>
              {friendReqs.map(req => (
                <div key={req.id} className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm flex-shrink-0">
                    {req.fromProfileImage
                      ? <img src={req.fromProfileImage} className="w-full h-full object-cover rounded-xl" />
                      : (req.fromFirstName || req.from)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-sm">{req.fromFirstName || req.from}</p>
                    <p className="text-[9px] text-neutral-500 uppercase font-bold">@{req.from} quer ser seu amigo</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleFriendAccept(req.id)}
                      className="px-3 py-1.5 bg-emerald-500 text-neutral-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                      Aceitar
                    </button>
                    <button onClick={() => handleFriendIgnore(req.id)}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 text-neutral-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">
                      Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Campo de pesquisa */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Pesquisar por nome, @usuário ou #ID..."
              className="w-full bg-neutral-900 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium text-white placeholder:text-neutral-700 outline-none focus:border-cyan-500/40 transition-all"
            />
          </div>

          {/* Resultados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(searchResults.length > 0 ? searchResults : []).map(u => {
              const isMe        = user?.username === u.username;
              const isFollowing = socialState?.following.includes(u.username);
              const isFriend    = socialState?.friends.includes(u.username);
              const isActing    = followingAction === u.username;
              const colorPalette = ["#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899"];
              const color = colorPalette[u.username.length % colorPalette.length];
              return (
                <div key={u.username}
                  className="flex items-center gap-4 p-4 bg-neutral-900/40 border border-white/5 rounded-2xl hover:border-white/15 transition-all">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center text-lg font-black border-2"
                    style={{ borderColor: color + "44", backgroundColor: color + "22", color }}>
                    {u.profileImage
                      ? <img src={u.profileImage} className="w-full h-full object-cover" />
                      : u.firstName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-white text-sm">{u.firstName} {u.lastName}</p>
                      {isFriend && <span className="text-[8px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 font-black uppercase">Amigo</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-neutral-600 font-mono">@{u.username}</span>
                      <span className="text-[9px] font-black text-neutral-700">{u.userId}</span>
                    </div>
                    <div className="mt-1">
                      <LevelChip level={u.level?.level || 1} title={u.level?.title || "Iniciante"} />
                    </div>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => isFollowing ? handleUnfollow(u.username) : handleFollow(u.username)}
                      disabled={isActing}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        isFollowing
                          ? "bg-white/5 border border-white/10 text-neutral-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                          : "bg-cyan-500 text-neutral-950 hover:scale-105 shadow-md"
                      } disabled:opacity-50`}
                    >
                      {isActing ? "..." : isFollowing ? "Seguindo" : "Seguir"}
                    </button>
                  )}
                </div>
              );
            })}
            {searchResults.length === 0 && searchQuery === "" && (
              <div className="col-span-full text-center py-12 text-neutral-700">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">Digite para pesquisar usuários</p>
                <p className="text-[10px] mt-1">Busque por nome, @usuário ou #ID</p>
              </div>
            )}
            {searchResults.length === 0 && searchQuery !== "" && (
              <div className="col-span-full text-center py-8 text-neutral-700">
                <p className="font-black uppercase tracking-widest text-sm">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PERFIL TAB ── */}
      {activeTab === "perfil" && (
        <div className="space-y-6">
          {/* Card do usuário */}
          <div className="bg-neutral-900/40 border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl border-2 border-cyan-500/30 overflow-hidden bg-neutral-950 flex items-center justify-center text-2xl font-black text-cyan-400">
              {user?.profileImage
                ? <img src={user.profileImage} className="w-full h-full object-cover" />
                : (user ? user.firstName[0] : "V")
              }
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {titlePrefix && (
                  <span className="inline-block px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[9px] font-black text-amber-400 uppercase tracking-widest">
                    {titlePrefix.trim()}
                  </span>
                )}
                {myLevelInfo && <LevelChip level={myLevelInfo.level} title={myLevelInfo.title} />}
              </div>
              <h3 className="text-2xl font-black text-white">{displayName}</h3>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                {user ? `@${user.username} · Membro DevGenius` : "Visitante (sessão temporária)"}
                {myUserId && (
                  <span className="ml-2 font-black text-neutral-600 font-mono">{myUserId}</span>
                )}
              </p>
              <div className="flex gap-4 mt-3">
                <div className="text-center">
                  <p className="text-lg font-black text-cyan-400">
                    {messages.filter(m => m.username === displayName).length}
                  </p>
                  <p className="text-[8px] text-neutral-600 uppercase font-bold">mensagens</p>
                </div>
                {stats && (
                  <div className="text-center">
                    <p className="text-lg font-black text-emerald-400">{stats.totalUsers}</p>
                    <p className="text-[8px] text-neutral-600 uppercase font-bold">membros</p>
                  </div>
                )}
              </div>
            </div>
            {user && myUserId && (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-neutral-900/60 border border-white/10 rounded-xl flex items-center gap-2">
                  <span className="text-[9px] text-neutral-600 font-bold uppercase">Seu ID</span>
                  <span className="text-sm font-black text-white font-mono">{myUserId}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(myUserId); }}
                    className="text-[8px] text-neutral-600 hover:text-cyan-400 transition-colors ml-1 font-black uppercase"
                    title="Copiar ID"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
            {user && (
              <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                ✓ Conta ativa
              </div>
            )}
          </div>
          {/* Nível do perfil */}
          {user && <LevelCard username={user.username} />}

          {/* Últimas mensagens do usuário */}
          <div className="bg-neutral-900/40 border border-white/5 rounded-[2rem] p-6 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" /> Suas mensagens recentes
            </h4>
            {messages.filter(m => m.username === displayName).slice(-5).reverse().length === 0 ? (
              <p className="text-neutral-600 text-xs font-medium">Você ainda não enviou mensagens. Vá para o Chat!</p>
            ) : messages.filter(m => m.username === displayName).slice(-5).reverse().map(msg => (
              <div key={msg.id} className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                <div className="flex-1">
                  <p className="text-sm text-neutral-300 font-medium">{msg.text}</p>
                  <p className="text-[9px] text-neutral-600 mt-1">{timeAgo(msg.ts)}</p>
                </div>
                <button onClick={() => deleteMessage(msg.id)}
                  className="text-neutral-700 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Membros ativos */}
          <div className="bg-neutral-900/40 border border-white/5 rounded-[2rem] p-6 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Participantes recentes do chat
            </h4>
            <div className="flex flex-wrap gap-3">
              {[...new Set(messages.slice(-50).map(m => m.username))].slice(0, 20).map(name => {
                const color = colorForName(name);
                const lastMsg = messages.filter(m => m.username === name).at(-1);
                return (
                  <div key={name} className="flex items-center gap-2 px-3 py-2 bg-neutral-950/60 border border-white/5 rounded-xl">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: color + "30", border: `1.5px solid ${color}50`, color }}>
                      {name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-neutral-300">{name}</p>
                      <p className="text-[8px] text-neutral-700">{lastMsg ? timeAgo(lastMsg.ts) : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ranking Flappy Code */}
          <FlappyLeaderboard />
        </div>
      )}
    </div>
  );
}

// ─── Mini-leaderboard do Flappy Code na aba perfil ───────────────────────────
function FlappyLeaderboard() {
  const [scores, setScores] = React.useState<any[]>([]);

  useEffect(() => {
    fetch("/api/games/flappy/leaderboard")
      .then(r => r.json())
      .then(setScores)
      .catch(() => {});
  }, []);

  if (scores.length === 0) return null;
  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="bg-neutral-900/40 border border-white/5 rounded-[2rem] p-6 space-y-4">
      <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
        🎮 Ranking Flappy Code
      </h4>
      <div className="space-y-2">
        {scores.slice(0,10).map((s, i) => (
          <div key={s.username} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-all">
            <span className="text-base w-8 text-center flex-shrink-0">
              {i < 3 ? medals[i] : <span className="text-neutral-600 font-black text-xs">#{i+1}</span>}
            </span>
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black overflow-hidden"
              style={{ background: colorForName(s.username) + "30", border: `1.5px solid ${colorForName(s.username)}40` }}>
              {s.avatar
                ? <img src={s.avatar} className="w-full h-full object-cover" />
                : <span style={{ color: colorForName(s.username) }}>{s.username[0]?.toUpperCase()}</span>
              }
            </div>
            <p className="flex-1 text-[11px] font-black text-neutral-300 truncate">{s.username}</p>
            <p className={`font-black text-sm ${i === 0 ? "text-amber-400" : i === 1 ? "text-neutral-300" : i === 2 ? "text-amber-600" : "text-neutral-500"}`}>
              {s.score} <span className="text-[8px] text-neutral-700 font-bold uppercase">pts</span>
            </p>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-neutral-700 font-bold uppercase tracking-widest text-center">
        Jogue na aba Games para entrar no ranking
      </p>
    </div>
  );
}
