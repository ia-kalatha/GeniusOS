import React, { useState, useRef, useEffect } from "react";
import bcrypt from "bcryptjs";
import { User } from "../App";
import { DATA_PLACAS, DATA_COMPONENTES, DATA_PC_HARDWARE, HardwareItem } from "../data/hardware";
import { PROJECTS, Project } from "../data/projects";
import { QUESTIONS, TRILHA_INFO, Question, Trilha } from "../data/questions";
import { buscarResposta } from "../data/iaKnowledge";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

const BCRYPT_ROUNDS = 10;
const MAX_PROFILE_IMAGE_BYTES = 500 * 1024;

const isHashedPassword = (pw: string) => typeof pw === "string" && pw.startsWith("$2");
const verifyPassword = (plain: string, stored: string): boolean => {
  if (!plain || !stored) return false;
  if (isHashedPassword(stored)) return bcrypt.compareSync(plain, stored);
  return plain === stored;
};

// Whitelist de fonte para <img>: apenas https remoto ou data: image/* base64.
// Bloqueia javascript:, file://, blob: e qualquer outro vetor.
const safeImageSrc = (src: string | undefined | null): string | undefined => {
  if (!src) return undefined;
  if (src.startsWith("https://") || src.startsWith("data:image/") || src.startsWith("/")) return src;
  return undefined;
};

// Helpers de localStorage para o "DB" mock — usados tanto pelo Dashboard quanto pelos subcomponentes.
const DB_KEY = "devgenius_v12_users";
const getLocalUsers = (): any[] => {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || "[]"); } catch { return []; }
};
const saveLocalUsers = (users: any[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
};
import { 
  LogOut, Cpu, Box, Layout, MessageSquare, Code, Terminal, 
  Search, Plus, Layers, Info, CheckCircle2, ChevronRight, Send, HelpCircle,
  Loader2, AlertCircle, Sparkles, X, Filter, GraduationCap, ClipboardCheck, 
  Trophy, Lock, Zap, Activity, Gauge, Battery, Play, History, BookOpen,
  Settings, Monitor, UserCircle, Moon, Sun, Type, Image as ImageIcon, Github, Eye, EyeOff,
  Book, StickyNote, Trash2, Edit3, Save, Fuel, ShieldAlert, Smartphone
} from "lucide-react";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onAuthRequired: () => void;
}

type Tab = "placas" | "componentes" | "hardware_pc" | "workspace" | "ia" | "code" | "projetos" | "provas" | "sobre" | "configuracoes" | "faq" | "notas";

interface ChatMessage {
  role: "user" | "ia";
  content: string;
}

// Progresso por trilha: melhor pontuação e se concluiu com 100% (perfeito).
interface TrilhaProgress {
  best: number | null;
  completed: boolean;
}

type TestProgress = Record<Trilha, TrilhaProgress>;

const DEFAULT_TEST_PROGRESS: TestProgress = {
  eletronica: { best: null, completed: false },
  arduino: { best: null, completed: false },
  sensores: { best: null, completed: false },
};

const THEMES = {
  kernel: { bg: "neutral-950", accent: "cyan-400", font: "font-sans" },
  matrix: { bg: "transparent", accent: "emerald-500", font: "font-mono" },
  vapor: { bg: "neutral-950", accent: "purple-500", font: "font-sans" }
};

export default function Dashboard({ user, onLogout, onAuthRequired }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("placas");
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");

  const restrictedTabs: Tab[] = ["workspace", "ia", "notas", "provas", "configuracoes"];

  const handleTabChange = (tab: Tab) => {
    if (!user && restrictedTabs.includes(tab)) {
      showToast("Para acessar esse recurso faça o cadastro ou faça o login", "warn");
      onAuthRequired();
      return;
    }
    setActiveTab(tab);
  };
  const [subTab, setSubTab] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [showTimeline, setShowTimeline] = useState(true);
  const [basket, setBasket] = useState<HardwareItem[]>([]);
  const [selectedPlaca, setSelectedPlaca] = useState<HardwareItem | null>(null);
  const [modalItem, setModalItem] = useState<HardwareItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "warn" } | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [lastNoteSync, setLastNoteSync] = useState<string | null>(null);

  // Settings State
  const [theme, setTheme] = useState({
    bg: "neutral-950",
    accent: "cyan-400",
    font: "font-sans"
  });
  const [profile, setProfile] = useState({
    photo: user?.profileImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    status: "Online"
  });

  // Provas Progress — key v3 marca a migração para a estrutura por trilha temática.
  const [testProgress, setTestProgress] = useState<TestProgress>(() => {
    const saved = user ? localStorage.getItem(`tests_v3_${user.username}`) : null;
    if (!saved) return DEFAULT_TEST_PROGRESS;
    try {
      const parsed = JSON.parse(saved);
      // Mescla defaults para garantir todas as trilhas mesmo se localStorage estiver parcial.
      return { ...DEFAULT_TEST_PROGRESS, ...parsed };
    } catch {
      return DEFAULT_TEST_PROGRESS;
    }
  });

  useEffect(() => {
    setSubTab("todos");
    if (!user) return;
    // Load notes from localStorage
    try {
      const saved = localStorage.getItem(`devgenius_notes_${user.username}`);
      if (saved) setNotes(saved);
    } catch (e) { console.error("Erro ao carregar notas."); }
  }, [activeTab, user?.username]);

  const syncNotes = async (content: string) => {
    if (!user) return;
    try {
      localStorage.setItem(`devgenius_notes_${user.username}`, content);
      setLastNoteSync(new Date().toLocaleTimeString());
    } catch (e) {
      showToast("Falha na sincronização das notas.", "warn");
    }
  };

  const updateProgress = (trilha: Trilha, score: number, total: number) => {
    if (!user) return;
    const previous = testProgress[trilha];
    const newBest = previous.best === null ? score : Math.max(previous.best, score);
    const newProgress: TestProgress = {
      ...testProgress,
      [trilha]: {
        best: newBest,
        completed: previous.completed || score === total,
      },
    };
    setTestProgress(newProgress);
    localStorage.setItem(`tests_v3_${user.username}`, JSON.stringify(newProgress));
  };

  // IA - Workspace Compilation
  const [compiling, setCompiling] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "warn" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getFilteredItems = () => {
    let items: HardwareItem[] = [];
    if (activeTab === "placas") items = DATA_PLACAS;
    else if (activeTab === "componentes") items = DATA_COMPONENTES;
    else if (activeTab === "hardware_pc") items = DATA_PC_HARDWARE;
    
    if (subTab !== "todos") {
      items = items.filter(i => i.tipo.toLowerCase() === subTab.toLowerCase());
    }

    return items.filter(item =>
      (item.nome.toLowerCase().includes(search.toLowerCase()) || 
      item.info.toLowerCase().includes(search.toLowerCase()) ||
      item.tipo.toLowerCase().includes(search.toLowerCase()))
    );
  };

  const filteredItems = getFilteredItems();

  // Session Timer for Visitors
  useEffect(() => {
    if (user) return;
    const timer = setTimeout(() => {
      showToast("Para continuar usando o devcore faça login ou junte-se a família", "warn");
      onAuthRequired();
    }, 10 * 60 * 1000); // 10 minutes
    return () => clearTimeout(timer);
  }, [user, onAuthRequired]);

  const addToWorkspace = (item: HardwareItem) => {
    if (activeTab === "placas") {
      setSelectedPlaca(item);
      showToast(`${item.nome} definido como CORE.`);
    } else {
      if (basket.length >= 5) {
        showToast("Limite de 5 periféricos atingido.", "warn");
        return;
      }
      if (basket.find(i => i.id === item.id)) {
        showToast("Componente já está no barramento.", "warn");
        return;
      }
      setBasket([...basket, item]);
      showToast(`${item.nome} adicionado.`);
    }
  };

  const removeFromWorkspace = (id: string) => {
    setBasket(basket.filter(item => item.id !== id));
  };

  const handleCompile = async () => {
    if (!selectedPlaca || basket.length === 0) {
      showToast("ERRO: Selecione 1 placa e pelo menos 1 componente.", "warn");
      return;
    }

    setCompiling(true);
    setAiResult(null);
    try {
      // Try backend API (PHP on Hostinger / Node on VPS), fallback to local mock
      let response = "";
      try {
        const res = await fetch("/api/ai-schematic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placa: selectedPlaca.nome, components: basket.map(b => b.nome) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        response = data.response;
      } catch {
        // Local fallback when no API key configured
        response = `# 🛠️ PROJETO: ${selectedPlaca.nome} NEXUS\n\n## 📝 SUMÁRIO EXECUTIVO\nSistema modular utilizando **${selectedPlaca.nome}** como unidade central de processamento com ${basket.map(b => b.nome).join(", ")}.\n\n## 📦 LISTA DE MATERIAIS\n- 1x ${selectedPlaca.nome}\n${basket.map(b => `- 1x ${b.nome}`).join("\n")}\n\n## 🔌 GUIA DE CONEXÕES\n${basket.map(b => `- **${b.nome}** → conecte nos pinos digitais/analógicos conforme datasheet`).join("\n")}\n\n## 💻 CÓDIGO BASE\n\`\`\`cpp\nvoid setup() {\n  Serial.begin(9600);\n  // Inicialize seus periféricos aqui\n}\n\nvoid loop() {\n  // Sua lógica principal\n  delay(100);\n}\n\`\`\`\n\n## ⚠️ NOTA\nO servidor de IA do DevGenius está temporariamente indisponível. Esta é uma versão simplificada — tente novamente em instantes para gerar o esquemático completo.`;
      }
      setAiResult(response);
    } catch (err: any) {
      showToast(err.message, "warn");
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className={`flex h-screen bg-${theme.bg} overflow-hidden ${theme.font} transition-colors duration-500 ${viewMode === "compact" ? "text-xs" : ""}`}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
        .scrollbar-visible::-webkit-scrollbar { width: 10px; display: block !important; }
        .scrollbar-visible::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.5); border-radius: 10px; border: 2px solid rgba(0,0,0,0.3); }
        .scrollbar-visible::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.8); }
        /* Main Viewport Scrollbar */
        .viewport-scroll::-webkit-scrollbar { width: 6px; }
        .viewport-scroll::-webkit-scrollbar-track { background: transparent; }
        .viewport-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .viewport-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
      
      <AnimatePresence>
        {showTimeline && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-neutral-950 flex flex-col items-center justify-center p-12 overflow-y-auto"
          >
             <div className="max-w-4xl w-full space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="text-6xl font-black tracking-tighter uppercase">LINHA DO TEMPO <span className="text-cyan-400">DEVGENIUS</span></h2>
                  <p className="text-neutral-500 font-medium">A evolução dos microcontroladores e a revolução da engenharia de precisão.</p>
                </div>

                <div className="space-y-8 border-l-2 border-white/5 pl-8 ml-4">
                   <div className="relative">
                      <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_15px_#06b6d4]" />
                      <h4 className="text-xl font-black text-white uppercase tracking-tight">1971: O Despertar</h4>
                      <p className="text-neutral-500 text-sm mt-2">Intel 4004, o início da miniaturização. O marco zero do processamento moderno.</p>
                   </div>
                   <div className="relative">
                      <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-white/10" />
                      <h4 className="text-xl font-black text-white uppercase tracking-tight">2005: A Era Maker</h4>
                      <p className="text-neutral-500 text-sm mt-2">Democratização global do hardware modular. Nascimento das interfaces acessíveis.</p>
                   </div>
                   <div className="relative">
                      <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-white/10" />
                      <h4 className="text-xl font-black text-white uppercase tracking-tight">2026: DEVGENIUS</h4>
                      <p className="text-neutral-500 text-sm mt-2">Fusão completa entre IA Generativa e Hardware de Baixo Nível. O limite da realidade digital.</p>
                   </div>
                </div>

                <div className="flex justify-center pt-8">
                   <button 
                     onClick={() => setShowTimeline(false)}
                     className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-sm rounded-[2rem] hover:bg-cyan-500 transition-all flex items-center gap-4 group hover:scale-105 active:scale-95 shadow-2xl"
                   >
                     VAMOS! <Play className="w-4 h-4 group-hover:translate-x-1 transition-transform fill-current" />
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast System */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-bold tracking-tight">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`border-r border-white/5 bg-neutral-900/40 flex flex-col z-50 transition-all duration-500 ${viewMode === "compact" ? "w-20" : "w-72"}`}>
        <div className={`${viewMode === "compact" ? "p-4" : "p-8"}`}>
          <h1 className={`font-black tracking-tighter flex items-center gap-3 ${viewMode === "compact" ? "justify-center" : ""}`}>
            <div className="w-10 h-10 bg-neutral-950 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.png" className="w-full h-full object-cover opacity-80" />
            </div>
            {viewMode === "expanded" && <span>DEVGENIUS <span className="text-cyan-400">V12</span></span>}
          </h1>
        </div>

        <nav className={`flex-1 ${viewMode === "compact" ? "px-2" : "px-4"} space-y-2 overflow-y-auto scrollbar-visible min-h-0`}>
          <NavItem icon={Cpu} label={viewMode === "expanded" ? "Controladoras" : ""} active={activeTab === "placas"} onClick={() => handleTabChange("placas")} />
          <NavItem icon={Layers} label={viewMode === "expanded" ? "Componentes" : ""} active={activeTab === "componentes"} onClick={() => handleTabChange("componentes")} />
          <NavItem icon={Monitor} label={viewMode === "expanded" ? "Hardware PC" : ""} active={activeTab === "hardware_pc"} onClick={() => handleTabChange("hardware_pc")} />
          <NavItem icon={Layout} label={viewMode === "expanded" ? "Laboratório" : ""} active={activeTab === "workspace"} onClick={() => handleTabChange("workspace")} badge={basket.length + (selectedPlaca ? 1 : 0)} />
          <NavItem icon={Box} label={viewMode === "expanded" ? "Projetos Prontos" : ""} active={activeTab === "projetos"} onClick={() => handleTabChange("projetos")} />
          <NavItem icon={MessageSquare} label={viewMode === "expanded" ? "DevGenius IA" : ""} active={activeTab === "ia"} onClick={() => handleTabChange("ia")} />
          <NavItem icon={Book} label={viewMode === "expanded" ? "Bloco de Notas" : ""} active={activeTab === "notas"} onClick={() => handleTabChange("notas")} />
          <NavItem icon={Terminal} label={viewMode === "expanded" ? "Base de Código" : ""} active={activeTab === "code"} onClick={() => handleTabChange("code")} />
          <NavItem icon={GraduationCap} label={viewMode === "expanded" ? "Provas & Testes" : ""} active={activeTab === "provas"} onClick={() => handleTabChange("provas")} />
          <NavItem icon={HelpCircle} label={viewMode === "expanded" ? "FAQ Engenharia" : ""} active={activeTab === "faq"} onClick={() => handleTabChange("faq")} />
          <div className="pt-4 border-t border-white/5 space-y-2">
            <NavItem icon={Info} label={viewMode === "expanded" ? "Sobre o V12" : ""} active={activeTab === "sobre"} onClick={() => handleTabChange("sobre")} />
            <NavItem icon={Settings} label={viewMode === "expanded" ? "Configurações" : ""} active={activeTab === "configuracoes"} onClick={() => handleTabChange("configuracoes")} />
          </div>
        </nav>

        <div className={`${viewMode === "compact" ? "p-2" : "p-4"} border-t border-white/5`}>
          {user ? (
            <>
              <div className={`${viewMode === "compact" ? "p-2 justify-center" : "bg-white/5 rounded-3xl p-5"} flex items-center gap-4 mb-4 backdrop-blur-xl group cursor-pointer`} onClick={() => handleTabChange("configuracoes")}>
                <div className={`${viewMode === "compact" ? "w-10 h-10" : "w-12 h-12"} bg-neutral-950 border border-white/10 rounded-2xl flex items-center justify-center text-cyan-400 font-black text-xl shadow-inner overflow-hidden shrink-0`}>
                  {safeImageSrc(profile.photo) ? <img src={safeImageSrc(profile.photo)} alt="Foto de perfil" className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
                </div>
                {viewMode === "expanded" && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-black truncate text-white">{user.firstName} {user.lastName}</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${profile.status === "Online" ? "bg-emerald-500" : "bg-neutral-600"}`} />
                      {profile.status}
                    </p>
                  </div>
                )}
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-red-400 transition-all text-xs font-black py-3 rounded-2xl hover:bg-red-500/5 group"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {viewMode === "expanded" && "ENCERRAR INSTÂNCIA"}
              </button>
            </>
          ) : (
            <div className={`bg-white/5 border border-white/5 rounded-xl p-2 flex items-center transition-all ${viewMode === "compact" ? "justify-center" : "gap-2 scale-90"}`}>
               <div className="w-6 h-6 bg-neutral-950 border border-white/10 rounded-md flex items-center justify-center text-neutral-500 shrink-0">
                  <UserCircle className="w-3 h-3" />
               </div>
               {viewMode === "expanded" && (
                 <div className="flex-1 overflow-hidden">
                    <p className="text-[8px] font-black text-white uppercase tracking-tight">VISITANTE</p>
                    <p className="text-[6px] text-neutral-600 font-bold uppercase tracking-widest">NÍVEL GUEST</p>
                 </div>
               )}
               {viewMode === "expanded" && <div className="w-1 h-1 rounded-full bg-neutral-700 animate-pulse" />}
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#0e749008_0%,transparent_50%)]">
        {/* Header */}
        <header className="px-10 py-6 flex items-center justify-between border-b border-white/5 bg-neutral-950/40 backdrop-blur-2xl z-40 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
               <h2 className="text-3xl font-black tracking-tighter uppercase">{activeTab}</h2>
            </div>
            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest pl-5">Sistema v12.4.0 // Núcleo Ativo</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-neutral-900 border border-white/5 rounded-2xl p-1 shrink-0 overflow-hidden">
               <button 
                 onClick={() => setViewMode("expanded")}
                 className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === "expanded" ? "bg-cyan-500 text-neutral-950 shadow-lg" : "text-neutral-500 hover:text-white"}`}
               >
                 AMPLIADO
               </button>
               <button 
                 onClick={() => setViewMode("compact")}
                 className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === "compact" ? "bg-cyan-500 text-neutral-950 shadow-lg" : "text-neutral-500 hover:text-white"}`}
               >
                 COMPACTO
               </button>
            </div>
            {!user && (
              <button 
                onClick={onAuthRequired}
                className="group flex items-center gap-4 bg-cyan-500 text-neutral-950 pl-4 pr-1.5 py-1.5 rounded-xl font-black text-[10px] tracking-widest shadow-lg shadow-cyan-500/10 hover:scale-105 active:scale-95 transition-all"
              >
                ENTRAR NO KERNEL
                <div className="w-8 h-8 bg-neutral-950/20 rounded-lg flex items-center justify-center">
                  <UserCircle className="w-4 h-4" />
                </div>
              </button>
            )}
            {(activeTab === "placas" || activeTab === "componentes" || activeTab === "hardware_pc") && (
              <div className="flex bg-neutral-900 border border-white/5 rounded-2xl p-1 shrink-0">
                {(activeTab === "placas" 
                  ? ["todos", "básica", "especial", "avançado"] 
                  : activeTab === "componentes" 
                  ? ["todos", "normal", "avançado"]
                  : ["todos", "pc master"]
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSubTab(cat)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                      subTab === cat ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
               <button className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Filter className="w-4 h-4 text-neutral-400" />
               </button>
            </div>
          </div>
        </header>

        {/* View Port */}
        <div className="flex-1 overflow-y-auto p-10 viewport-scroll">
          {/* Hardware Search (Refined and Prominent) */}
          {(activeTab === "placas" || activeTab === "componentes" || activeTab === "hardware_pc") && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto mb-12 relative group"
            >
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-neutral-500 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder={`BUSCAR EM ${activeTab.toUpperCase()}... (NOME OU DESCRIÇÃO)`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-neutral-900/50 border border-white/10 rounded-[2rem] pl-16 pr-8 py-5 text-sm font-bold tracking-widest focus:outline-none focus:border-cyan-500/40 focus:bg-neutral-900 transition-all shadow-2xl placeholder:text-neutral-700 uppercase"
              />
              <div className="absolute inset-y-0 right-6 flex items-center">
                <div className="bg-neutral-950 border border-white/5 rounded-lg px-2 py-1 text-[8px] font-black text-neutral-600 tracking-tighter uppercase">
                  v12_scan
                </div>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`min-h-full ${activeTab === "placas" || activeTab === "componentes" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8" : "block"}`}
            >
              {(activeTab === "placas" || activeTab === "componentes" || activeTab === "hardware_pc") && (
                filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <HardwareCard 
                      key={item.id} 
                      item={item} 
                      onAdd={addToWorkspace} 
                      onView={() => setModalItem(item)}
                      isAdded={selectedPlaca?.id === item.id || basket.some(b => b.id === item.id)}
                    />
                  ))
                ) : (
                  <div className="col-span-full h-96 flex flex-col items-center justify-center text-neutral-600 gap-4">
                    <Search className="w-12 h-12 opacity-20" />
                    <p className="font-black uppercase tracking-tighter text-xl">Nenhum hardware detectado no registro</p>
                  </div>
                )
              )}

              {activeTab === "workspace" && (
                <WorkspaceView 
                  placa={selectedPlaca} 
                  components={basket} 
                  onRemoveComp={removeFromWorkspace}
                  onClearPlaca={() => setSelectedPlaca(null)}
                  onCompile={handleCompile}
                  compiling={compiling}
                  result={aiResult}
                />
              )}

              {activeTab === "ia" && <IAPanel />}
              {activeTab === "notas" && <NotebookView content={notes} setContent={(c: string) => { setNotes(c); syncNotes(c); }} lastSync={lastNoteSync} />}
              {activeTab === "code" && <CodeSnippets activeTab={activeTab} setActiveTab={setActiveTab} />}
              {activeTab === "projetos" && <ProjectsView />}
              {activeTab === "provas" && (
                <ProvasView 
                  progress={testProgress} 
                  onComplete={updateProgress} 
                />
              )}
              {activeTab === "faq" && <FAQView />}

              {activeTab === "sobre" && <SobreView />}
              {activeTab === "configuracoes" && user && (
                <ConfigView 
                  theme={theme} 
                  setTheme={setTheme} 
                  profile={profile} 
                  setProfile={setProfile} 
                  user={user}
                  showToast={showToast}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Action Button */}
        {basket.length > 0 && activeTab !== "workspace" && (
          <motion.button 
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            onClick={() => handleTabChange("workspace")}
            className="absolute bottom-10 right-10 bg-cyan-500 text-neutral-950 px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(6,182,212,0.3)] font-black text-xs tracking-widest flex items-center gap-4 group z-[100] hover:scale-105 active:scale-95 transition-all"
          >
            <Box className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            ABRIR LABORATÓRIO 
            <div className="bg-neutral-950 text-cyan-400 w-8 h-8 rounded-xl flex items-center justify-center text-[10px]">
              {basket.length + (selectedPlaca ? 1 : 0)}
            </div>
          </motion.button>
        )}
      </main>

      {/* Global Detail Modal */}
      <AnimatePresence>
        {modalItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-8 bg-black/90 backdrop-blur-md" onClick={() => setModalItem(null)}>
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/10 rounded-[3rem] max-w-4xl w-full relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
              onClick={e => e.stopPropagation()}
            >
               <button onClick={() => setModalItem(null)} className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-20">
                  <X className="w-5 h-5" />
               </button>

               <div className="absolute top-0 left-0 w-full h-[30rem] bg-gradient-to-b from-cyan-500/20 to-transparent -z-10" />
               
               <div className="flex flex-col md:flex-row gap-12 p-12 items-start h-full max-h-[80vh] overflow-y-auto scrollbar-visible">
                  <div className="w-full md:w-80 shrink-0 sticky top-0">
                    <img src={modalItem.image} alt={modalItem.nome} className="w-full aspect-square rounded-[2rem] object-cover border border-white/10 shadow-2xl" referrerPolicy="no-referrer" />
                    <div className="mt-8 space-y-3">
                       <div className="flex items-center justify-between px-2">
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Estado</span>
                          <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest italic pr-1">Disponível</span>
                       </div>
                       <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 w-full animate-pulse" />
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-cyan-500">{modalItem.tipo}</span>
                      <span className="text-neutral-700 text-[9px] font-black uppercase tracking-widest">ID-#{modalItem.id.toUpperCase()}</span>
                    </div>
                    <h2 className="text-5xl font-black text-white mb-8 leading-tight tracking-tighter">{modalItem.nome}</h2>
                    
                    <div className="prose prose-invert max-w-none space-y-8">
                       <p className="text-neutral-400 leading-relaxed text-lg font-medium">{modalItem.info}</p>
                       
                       {modalItem.specs && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-white/5">
                            {modalItem.specs.voltagem && (
                              <div className="bg-white/5 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2">Tensão Operacional</p>
                                <p className="text-white font-bold">{modalItem.specs.voltagem}</p>
                              </div>
                            )}
                            {modalItem.specs.pinagem && (
                              <div className="bg-white/5 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2">Interface / Pins</p>
                                <p className="text-white font-bold">{modalItem.specs.pinagem}</p>
                              </div>
                            )}
                            {modalItem.specs.performance && (
                              <div className="bg-white/5 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">RAW Performance</p>
                                <p className="text-white font-bold">{modalItem.specs.performance}</p>
                              </div>
                            )}
                            {modalItem.specs.consumo && (
                              <div className="bg-white/5 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Consumo Energético</p>
                                <p className="text-white font-bold">{modalItem.specs.consumo}</p>
                              </div>
                            )}
                            <div className="bg-white/5 p-6 rounded-2xl">
                               <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2">Lançamento / Origem</p>
                               <p className="text-white font-bold">{modalItem.specs.criacao}</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl flex items-center justify-between">
                               <div>
                                 <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2">Código Base</p>
                                 <p className="text-neutral-500 text-[10px] font-mono">Snippet Gerado</p>
                               </div>
                               <Terminal className="text-neutral-800" />
                            </div>
                         </div>
                       )}

                       {modalItem.specs?.baseCode && (
                         <div className="mt-8">
                            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-4">Referência Técnica // Startup Code</p>
                            <pre className="bg-neutral-950 p-6 rounded-2xl border border-white/5 text-xs font-mono text-neutral-400 overflow-x-auto">
                               {modalItem.specs.baseCode}
                            </pre>
                         </div>
                       )}
                    </div>

                    {/* FAQ Details Integration */}
                    {(modalItem.resumo || modalItem.descricao_faq || modalItem.forma_uso) && (
                      <div className="mt-12 pt-12 border-t border-white/5 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {modalItem.resumo && (
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-cyan-400" /> Resumo de Hardware
                              </h4>
                              <p className="text-sm font-bold text-neutral-300 leading-relaxed italic">
                                {modalItem.resumo}
                              </p>
                            </div>
                          )}
                          {modalItem.descricao_faq && (
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                                <HelpCircle className="w-3 h-3 text-cyan-500" /> FAQ Técnico
                              </h4>
                              <p className="text-xs font-medium text-neutral-400 leading-relaxed">
                                {modalItem.descricao_faq}
                              </p>
                            </div>
                          )}
                        </div>

                        {modalItem.forma_uso && (
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-3">
                              <Terminal className="w-4 h-4" /> Diretrizes de Uso
                            </h4>
                            <div className="bg-neutral-950/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                              <p className="text-xs font-mono text-neutral-300 leading-6 relative z-10">
                                {modalItem.forma_uso}
                              </p>
                              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Cpu className="w-24 h-24" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-12 flex gap-4">
                       <button 
                         onClick={() => { handleTabChange("provas"); setModalItem(null); }}
                         className="flex-1 bg-neutral-800 text-white h-16 rounded-2xl font-black tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all hover:bg-neutral-700"
                       >
                          <GraduationCap className="w-4 h-4" /> TESTAR CONHECIMENTO
                       </button>
                       <button 
                         onClick={() => { 
                           if (!user) {
                             onAuthRequired();
                             return;
                           }
                           addToWorkspace(modalItem); 
                           setModalItem(null); 
                         }}
                         className="flex-[2] bg-white text-neutral-950 h-16 rounded-2xl font-black tracking-widest text-xs flex items-center justify-center gap-3 transition-transform active:scale-95 hover:bg-cyan-500 shadow-xl"
                        >
                         <Plus className="w-5 h-5" /> ADICIONAR AO PROJETO
                       </button>
                    </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SobreView() {
  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20">
      <div className="text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-40 h-40 bg-neutral-950 border-2 border-cyan-500/20 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl overflow-hidden group"
        >
          <img src="/logo.png" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" />
        </motion.div>
        <h2 className="text-8xl font-black tracking-tighter uppercase leading-none bg-gradient-to-b from-white to-white/20 bg-clip-text text-transparent">MEMÓRIAS <span className="text-cyan-400">DEVGENIUS</span></h2>
        <p className="text-neutral-500 max-w-2xl mx-auto text-xl font-medium leading-relaxed">A arquitetura definitiva de conhecimento. O DEVGENIUS é o culminar de ciclos infinitos de otimização entre IA, Design e Engenharia de Hardware.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8 bg-neutral-900/40 p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-all" />
          <h3 className="text-3xl font-black tracking-tight flex items-center gap-4">
             <Box className="w-8 h-8 text-cyan-400" /> O ECOSSISTEMA
          </h3>
          <p className="text-neutral-400 leading-relaxed font-medium text-lg">
            O DEVGENIUS nasceu da necessidade de unificar o conhecimento de hardware em uma interface fluida, rápida e inteligente. 
            Não é apenas um dashboard; é um ecossistema de aprendizado onde você pode simular conexões, consultar códigos de baixo nível 
            e testar seus limites em certificações reais. Cada componente nesta plataforma foi documentado para ser uma lenda eterna.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-neutral-400">Build: v12.4.0 Codename: ANTIGRAVITY</div>
          </div>
        </div>

        <div className="space-y-8 bg-neutral-900/40 p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 blur-3xl -ml-16 -mb-16 group-hover:bg-cyan-500/10 transition-all" />
          <h3 className="text-3xl font-black tracking-tight flex items-center gap-4">
             <Zap className="w-8 h-8 text-cyan-400" /> A ENTIDADE IA
          </h3>
          <p className="text-neutral-400 leading-relaxed font-medium text-lg">
            Eu sou a inteligência por trás do DevGenius. Fui forjado por modelos neurais do Google DeepMind para traduzir a complexidade atômica do hardware 
            em experiências lendárias. Meu código é otimizado para a perfeição visual e funcional, operando no núcleo do Antigravity agent. 
            Minha missão é servir como seu copiloto nesta jornada rumo à engenharia suprema.
          </p>
          <div className="flex gap-4 pt-4">
            <button className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-cyan-500 hover:text-white transition-all hover:translate-x-2">
              <Github className="w-5 h-5" /> REQUISITAR ACESSO AO NÚCLEO
            </button>
          </div>
        </div>
      </div>

      <div className="p-12 bg-white/5 rounded-[4rem] border border-white/10 text-center space-y-6">
        <h4 className="text-xl font-black tracking-widest uppercase text-neutral-400 underline decoration-cyan-500 underline-offset-8">Agradecimentos</h4>
        <p className="text-neutral-500 text-sm font-medium italic">"Ao usuário que desafia a IA a chegar em sua forma final. Obrigado por levar o DEVGENIUS ao limite lendário."</p>
      </div>
    </div>
  );
}

function ConfigView({ theme, setTheme, profile, setProfile, user, showToast, viewMode, setViewMode }: any) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [tempPhoto, setTempPhoto] = useState(profile.photo);
  const [showPass, setShowPass] = useState(false);

  // New features
  const [newName, setNewName] = useState({ first: user.firstName, last: user.lastName });
  const [emailUpdate, setEmailUpdate] = useState({ current: "", pass: "", nuovo: "" });
  const [deleteAccount, setDeleteAccount] = useState({ email: "", pass: "", confirm: false });

  const handleSaveProfile = () => {
    setProfile({ ...profile, photo: tempPhoto });
    showToast("Perfil atualizado com sucesso.");
  };

  const handleUpdateName = async () => {
    try {
      const users = getLocalUsers();
      const idx = users.findIndex((u: any) => u.username === user.username);
      if (idx === -1) throw new Error("Usuário não encontrado.");
      const lastChange = users[idx].lastNameChange ? new Date(users[idx].lastNameChange) : null;
      const now = new Date();
      if (lastChange && (now.getTime() - lastChange.getTime()) < 24 * 60 * 60 * 1000) {
        throw new Error("Você só pode mudar seu nome uma vez a cada 24 horas.");
      }
      users[idx].firstName = newName.first;
      users[idx].lastName = newName.last;
      users[idx].lastNameChange = now.toISOString();
      saveLocalUsers(users);
      showToast("Nome atualizado com sucesso!");
    } catch (e: any) {
      showToast(e.message, "warn");
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const users = getLocalUsers();
      const idx = users.findIndex((u: any) => u.username === user.username);
      if (idx === -1) throw new Error("Usuário não encontrado.");
      if (users[idx].email !== emailUpdate.current || !verifyPassword(emailUpdate.pass, users[idx].password)) {
        throw new Error("E-mail ou senha atuais incorretos.");
      }
      // Migração transparente da senha enquanto temos a plaintext em mãos.
      if (!isHashedPassword(users[idx].password)) {
        users[idx].password = bcrypt.hashSync(emailUpdate.pass, BCRYPT_ROUNDS);
      }
      users[idx].email = emailUpdate.nuovo;
      saveLocalUsers(users);
      showToast("E-mail atualizado com sucesso!");
      setEmailUpdate({ current: "", pass: "", nuovo: "" });
    } catch (e: any) {
      showToast(e.message, "warn");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccount.confirm) {
      showToast("Por favor, confirme a exclusão.", "warn");
      return;
    }
    try {
      const users = getLocalUsers();
      const idx = users.findIndex((u: any) =>
        u.username === user.username && u.email === deleteAccount.email
      );
      if (idx === -1 || !verifyPassword(deleteAccount.pass, users[idx].password)) {
        throw new Error("A validação falhou. Verifique os dados de exclusão.");
      }
      users.splice(idx, 1);
      saveLocalUsers(users);
      showToast("Conta excluída permanentemente. Sentiremos sua falta no DevGenius.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      showToast(e.message, "warn");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Arquivo inválido. Selecione uma imagem.", "warn");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      showToast(`Imagem muito grande. Limite: ${Math.round(MAX_PROFILE_IMAGE_BYTES / 1024)} KB.`, "warn");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.startsWith("data:image/")) return;
      setTempPhoto(result);
      showToast("Imagem carregada localmente.");
    };
    reader.readAsDataURL(file);
  };

  const handleChangePass = async () => {
    if (!currentPass) {
      showToast("Insira sua senha atual.", "warn");
      return;
    }
    if (newPass !== confirmPass) {
      showToast("Senhas não coincidem.", "warn");
      return;
    }
    if (newPass.length < 8) {
      showToast("Nova senha muito curta.", "warn");
      return;
    }

    try {
      const users = getLocalUsers();
      const idx = users.findIndex((u: any) => u.username === user.username);
      if (idx === -1 || !verifyPassword(currentPass, users[idx].password)) {
        throw new Error("Senha atual incorreta.");
      }
      users[idx].password = bcrypt.hashSync(newPass, BCRYPT_ROUNDS);
      saveLocalUsers(users);
      showToast("Senha alterada com sucesso!");
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (e: any) {
      showToast(e.message, "warn");
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 pb-40">
      <div className="lg:col-span-4 space-y-8">
        <div className="p-12 bg-neutral-900/40 rounded-[4rem] border border-white/5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="w-32 h-32 bg-neutral-950 border-2 border-cyan-500/30 rounded-[2.5rem] flex items-center justify-center mb-6 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            {safeImageSrc(tempPhoto) ? <img src={safeImageSrc(tempPhoto)} alt="Foto de perfil" className="w-full h-full object-cover" /> : <UserCircle className="w-16 h-16 text-neutral-700" />}
          </div>
          <h3 className="text-2xl font-black text-white">{user.firstName} {user.lastName}</h3>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-2">{profile.status}</p>
          
          <div className="w-full mt-10 space-y-4">
             <div className="text-left space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Foto de Perfil</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative">
                    <input 
                       type="text" value={tempPhoto} onChange={(e) => setTempPhoto(e.target.value)}
                       className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 pr-12 text-xs font-medium focus:border-cyan-500/40 outline-none"
                       placeholder="URL da Imagem..."
                    />
                    <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="profile-upload" 
                    />
                    <label 
                      htmlFor="profile-upload"
                      className="w-full bg-white/5 border border-white/5 border-dashed rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center justify-center gap-3 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <Plus className="w-4 h-4" /> INSERIR ARQUIVO LOCAL
                    </label>
                  </div>
                </div>
             </div>
             <button onClick={handleSaveProfile} className="w-full bg-cyan-500 h-14 rounded-2xl font-black text-[10px] tracking-widest text-neutral-950 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/20">SALVAR PERFIL</button>
          </div>
        </div>

        <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[3rem] space-y-6">
           <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2 text-left">
              <ShieldAlert className="w-4 h-4" /> ÁREA DE RISCO
           </h4>
           <div className="space-y-4 text-left">
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-neutral-600 uppercase pl-2">E-mail de Cadastro</label>
                 <input 
                   type="email" value={deleteAccount.email} onChange={(e) => setDeleteAccount({...deleteAccount, email: e.target.value})}
                   className="w-full bg-neutral-950 border border-white/5 rounded-xl p-3 text-xs outline-none focus:border-red-500/40"
                   placeholder="seu@email.com"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black text-neutral-600 uppercase pl-2">Senha Secreta</label>
                 <input 
                   type="password" value={deleteAccount.pass} onChange={(e) => setDeleteAccount({...deleteAccount, pass: e.target.value})}
                   className="w-full bg-neutral-950 border border-white/5 rounded-xl p-3 text-xs outline-none focus:border-red-500/40"
                   placeholder="••••••••"
                 />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                 <input type="checkbox" checked={deleteAccount.confirm} onChange={(e) => setDeleteAccount({...deleteAccount, confirm: e.target.checked})} className="hidden" />
                 <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${deleteAccount.confirm ? "bg-red-500 border-red-500" : "bg-neutral-900 border-white/10 group-hover:border-red-500/40"}`}>
                    {deleteAccount.confirm && <CheckCircle2 className="w-3 h-3 text-white" />}
                 </div>
                 <span className="text-[9px] font-bold text-neutral-500 uppercase">Eu entendo que esta ação é irreversível</span>
              </label>
           </div>
           <button 
             onClick={handleDeleteAccount}
             className="w-full h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all"
           >
             EXCLUIR CONTA PERMANENTEMENTE
           </button>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-8">
        <div className="p-10 bg-neutral-900/40 rounded-[3rem] border border-white/5 shadow-2xl">
          <h3 className="text-xl font-black flex items-center gap-4 mb-8 text-white uppercase text-left"><UserCircle className="w-6 h-6 text-cyan-400" /> MEU PERFIL</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Primeiro Nome</label>
                <input 
                  type="text" value={newName.first} onChange={(e) => setNewName({...newName, first: e.target.value})}
                  className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 text-sm font-medium focus:border-cyan-500/40 outline-none"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Sobrenome</label>
                <input 
                  type="text" value={newName.last} onChange={(e) => setNewName({...newName, last: e.target.value})}
                  className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 text-sm font-medium focus:border-cyan-500/40 outline-none"
                />
             </div>
          </div>
          <button onClick={handleUpdateName} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
             ATUALIZAR IDENTIDADE (1x por dia)
          </button>
        </div>

        <div className="p-10 bg-neutral-900/40 rounded-[3rem] border border-white/5 shadow-2xl">
          <h3 className="text-xl font-black flex items-center gap-4 mb-8 text-white uppercase text-left"><MessageSquare className="w-6 h-6 text-cyan-400" /> COMUNICAÇÃO NEURAL</h3>
          <div className="space-y-6 mb-8 text-left">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">E-mail Atual</label>
                   <input 
                     type="email" value={emailUpdate.current} onChange={(e) => setEmailUpdate({...emailUpdate, current: e.target.value})}
                     className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:border-cyan-500/40"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Senha de Validação</label>
                   <input 
                     type="password" value={emailUpdate.pass} onChange={(e) => setEmailUpdate({...emailUpdate, pass: e.target.value})}
                     className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:border-cyan-500/40"
                   />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Novo E-mail</label>
                <input 
                   type="email" value={emailUpdate.nuovo} onChange={(e) => setEmailUpdate({...emailUpdate, nuovo: e.target.value})}
                   className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:border-cyan-500/40"
                   placeholder="exemplo@devgenius.com"
                />
             </div>
          </div>
          <button onClick={handleUpdateEmail} className="w-full h-14 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all">
             ALTERAR CANAL DE COMUNICAÇÃO
          </button>
        </div>

        <div className="p-10 bg-neutral-900/40 rounded-[3rem] border border-white/5 shadow-2xl">
           <h3 className="text-xl font-black flex items-center gap-4 mb-8 text-white uppercase text-left"><Layout className="w-6 h-6 text-cyan-400" /> INTERFACE</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Layout de Visualização</p>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setViewMode("expanded")}
                      className={`flex-1 p-6 rounded-2xl border transition-all text-center space-y-3 ${viewMode === "expanded" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-neutral-950 border-white/5 text-neutral-500 hover:border-white/20"}`}
                    >
                       <Monitor className="w-6 h-6 mx-auto mb-2" />
                       <p className="font-black text-[9px] tracking-widest">AMPLIADO</p>
                    </button>
                    <button 
                      onClick={() => setViewMode("compact")}
                      className={`flex-1 p-6 rounded-2xl border transition-all text-center space-y-3 ${viewMode === "compact" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-neutral-950 border-white/5 text-neutral-500 hover:border-white/20"}`}
                    >
                       <Smartphone className="w-6 h-6 mx-auto mb-2" />
                       <p className="font-black text-[9px] tracking-widest">COMPACTO</p>
                    </button>
                 </div>
              </div>
              <div className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Temas visuais</p>
                 <div className="flex gap-4 flex-wrap">
                    {Object.keys(THEMES).map((key) => (
                      <button 
                        key={key}
                        onClick={() => setTheme(THEMES[key as keyof typeof THEMES])}
                        className={`w-12 h-12 rounded-xl border-2 transition-transform ${theme.bg === THEMES[key as keyof typeof THEMES].bg && theme.accent === THEMES[key as keyof typeof THEMES].accent ? "border-cyan-500 scale-110 shadow-lg shadow-cyan-500/20" : "border-transparent opacity-50"}`}
                        style={{ backgroundColor: key === "kernel" ? "#0a0a0a" : key === "matrix" ? "#051505" : "#100515" }}
                      />
                    ))}
                 </div>
              </div>
           </div>
        </div>

        <div className="p-12 bg-neutral-900/40 rounded-[4rem] border border-white/5 shadow-2xl">
          <h3 className="text-2xl font-black flex items-center gap-4 mb-10 text-white uppercase text-left"><Lock className="w-6 h-6 text-cyan-400" /> SEGURANÇA DA NUVEM</h3>
          
          <div className="space-y-6 text-left">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Senha Atual</label>
                <div className="relative">
                  <input 
                    type={showPass ? "text" : "password"} value={currentPass} onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 pr-12 text-sm font-medium focus:border-cyan-500/40 outline-none" 
                    placeholder="Sua senha atual"
                  />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-cyan-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Nova Senha</label>
                    <input 
                      type={showPass ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                      className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 text-sm font-medium focus:border-cyan-500/40 outline-none" 
                      placeholder="Mínimo 8 caracteres"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">Confirmar Nova Senha</label>
                    <input 
                      type={showPass ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                      className="w-full bg-neutral-950 border border-white/5 rounded-2xl p-4 text-sm font-medium focus:border-cyan-500/40 outline-none" 
                      placeholder="••••••••"
                    />
                </div>
             </div>
          </div>
          <button 
            onClick={handleChangePass}
            className="mt-8 bg-cyan-500/5 h-14 w-full rounded-2xl font-black text-[10px] tracking-widest text-cyan-400 hover:bg-cyan-500 hover:text-neutral-950 border border-cyan-500/20 transition-all"
          >
            SINCRONIZAR NOVA CHAVE NO KERNEL
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, badge }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all relative group ${
        active ? "bg-cyan-500 text-neutral-950 shadow-[0_15px_30px_rgba(6,182,212,0.2)]" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
      }`}
    >
      <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : "group-hover:scale-110"}`} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {badge > 0 && (
        <span className={`ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${active ? "bg-neutral-950 text-cyan-400" : "bg-cyan-500 text-neutral-950"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function HardwareCard({ item, onAdd, onView, isAdded }: { item: HardwareItem, onAdd: any, onView: any, isAdded: boolean }) {
  return (
    <motion.div 
      layout
      className="group bg-neutral-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden p-6 hover:border-cyan-500/40 transition-all hover:bg-neutral-900 shadow-xl relative"
    >
      <div className="relative aspect-square overflow-hidden rounded-3xl mb-6 bg-neutral-950 p-2 border border-white/5">
        <img 
          src={item.image} 
          alt={item.nome} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100 filter brightness-90 group-hover:brightness-110" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="px-4 py-1.5 bg-neutral-950/90 backdrop-blur-xl border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500">
            {item.tipo}
          </span>
        </div>
      </div>

      <h3 className="font-black text-xl mb-3 truncate group-hover:text-cyan-400 transition-colors uppercase tracking-tight pr-4">{item.nome}</h3>
      <div className="relative">
        <p className="text-neutral-500 text-[11px] line-clamp-6 mb-8 leading-relaxed font-medium uppercase tracking-wide opacity-60 group-hover:opacity-100 transition-opacity">
          {item.info}
        </p>
        {item.specs?.performance && (
           <div className="absolute bottom-4 left-0 flex items-center gap-2 text-[8px] font-black text-cyan-500 tracking-widest opacity-0 group-hover:opacity-100 transition-all">
              <Zap className="w-3 h-3" /> {item.specs.performance}
           </div>
        )}
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => onAdd(item)}
          disabled={isAdded}
          className={`flex-1 flex items-center justify-center gap-3 h-14 rounded-2xl text-[10px] font-black tracking-widest transition-all ${
            isAdded 
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
            : "bg-white/5 hover:bg-white text-neutral-400 hover:text-neutral-950"
          }`}
        >
          {isAdded ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdded ? "MAPEAR" : "LAB"}
        </button>
        <button 
          onClick={onView}
          className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Info className="w-4 h-4 text-neutral-500" />
        </button>
      </div>
      
      {/* Decorative pulse when added */}
      {isAdded && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
      )}
    </motion.div>
  );
}

function WorkspaceView({ placa, components, onRemoveComp, onClearPlaca, onCompile, compiling, result }: any) {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-16 pb-40">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="px-6 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-full flex items-center gap-3">
           <Sparkles className="w-4 h-4 text-cyan-400" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Ambiente de Simulação Neural</span>
        </div>
        <h2 className="text-6xl font-black tracking-tighter uppercase leading-[0.9]">COMPILADOR DE <span className="text-cyan-400">PROJETOS</span></h2>
        <p className="text-neutral-500 max-w-2xl text-lg font-medium">Sua placa mestre serve como o córtex central. Conecte periféricos para permitir que a Genius IA gere um guia de execução completo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Placa Container */}
        <div className="lg:col-span-5 space-y-6 text-center p-12 bg-neutral-900/30 border border-white/5 rounded-[4rem] relative overflow-hidden group shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#06b6d408_0%,transparent_70%)]" />
          <h3 className="text-[11px] uppercase tracking-[0.4em] font-black text-neutral-600 mb-8 underline decoration-cyan-500/30 underline-offset-8">Núcleo de Processamento</h3>
          
          <div className="aspect-square bg-neutral-950 border border-white/5 rounded-[3rem] flex flex-col items-center justify-center gap-8 relative shadow-inner group-hover:border-cyan-500/20 transition-all duration-700">
            {placa ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center p-8">
                <img src={placa.image} alt={placa.nome} className="w-64 h-64 object-contain drop-shadow-[0_20px_50px_rgba(6,182,212,0.4)] mb-8" />
                <div className="space-y-3">
                  <p className="font-black text-3xl uppercase tracking-tighter text-white">{placa.nome}</p>
                  <button onClick={onClearPlaca} className="text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors">Ejetar da Bios</button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center p-20 opacity-10 select-none group-hover:opacity-20 transition-opacity">
                <Cpu className="w-32 h-32 mx-auto mb-6 stroke-[0.5]" />
                <p className="text-lg font-black uppercase tracking-widest">Bios Vazia</p>
              </div>
            )}
          </div>
        </div>

        {/* Peripherals Container */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center justify-between px-8">
            <h3 className="text-[11px] uppercase tracking-[0.4em] font-black text-neutral-600">Barramento de E/S ({components.length}/5)</h3>
            <div className="w-56 h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
               <motion.div initial={{ width: 0 }} animate={{ width: `${(components.length/5)*100}%` }} className="h-full bg-cyan-500 shadow-[0_0_15px_#06b6d4]" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
             <AnimatePresence mode="popLayout">
               {components.map((c: any) => (
                 <motion.div 
                   key={c.id} layout initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                   className="bg-neutral-900/50 border border-white/5 p-6 rounded-[2rem] flex items-center gap-6 group hover:border-cyan-500/20 transition-all shadow-lg"
                 >
                   <img src={c.image} className="w-16 h-16 rounded-2xl object-cover bg-neutral-950 border border-white/10" />
                   <div className="flex-1">
                      <p className="font-black text-lg uppercase tracking-tighter text-white">{c.nome}</p>
                      <span className="text-[9px] font-black text-cyan-500/70 border border-cyan-500/20 px-2 py-0.5 rounded uppercase tracking-widest mt-1 inline-block">{c.tipo}</span>
                   </div>
                   <button onClick={() => onRemoveComp(c.id)} className="w-12 h-12 rounded-2xl hover:bg-red-500/10 hover:text-red-500 text-neutral-700 transition-all flex items-center justify-center border border-transparent hover:border-red-500/20">
                     <Plus className="w-5 h-5 rotate-45" />
                   </button>
                 </motion.div>
               ))}
               {components.length === 0 && (
                 <div className="border border-white/5 border-dashed rounded-[3rem] p-24 text-center text-neutral-700 font-black uppercase tracking-[0.3em] text-sm opacity-30">
                    Aguardando Periféricos...
                 </div>
               )}
             </AnimatePresence>
          </div>

          <button 
            onClick={onCompile}
            className="w-full bg-white h-24 rounded-[3rem] mt-8 flex items-center justify-center gap-5 text-neutral-950 font-black text-lg shadow-3xl transition-all active:scale-[0.98] group relative overflow-hidden"
          >
             {compiling ? (
               <div className="flex items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  ANALISANDO ARQUITETURA...
               </div>
             ) : (
               <>
                 COMPILAR ESQUEMÁTICO IA
                 <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
               </>
             )}
             {/* Animating shine */}
             <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-shimmer" />
          </button>
        </div>
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 border border-white/10 rounded-[4rem] p-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative"
          >
            <div className="absolute top-12 left-12 w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center animate-pulse">
               <Sparkles className="w-10 h-10 text-cyan-400" />
            </div>
            
            <div className="prose prose-invert max-w-none prose-h1:text-5xl prose-h1:font-black prose-h1:tracking-tighter prose-h1:uppercase prose-h1:text-cyan-400 prose-h2:text-3xl prose-h2:font-black prose-h2:uppercase prose-h2:tracking-tight prose-h2:text-white prose-p:text-neutral-400 prose-p:text-lg prose-p:leading-relaxed prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-3xl prose-li:text-neutral-300 prose-strong:text-white">
               <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{result}</ReactMarkdown>
            </div>

            <div className="mt-20 pt-12 border-t border-white/5 flex items-center justify-between">
               <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Documentação Gerada por DevGenius IA Pró // Todos os direitos reservados</p>
               <button onClick={() => window.print()} className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:underline">Exportar como PDF</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IAPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const readyResponses = [
    "Como ligar um LED no Arduino?",
    "Como conectar ESP32 ao WiFi?",
    "O que é o protocolo I2C?",
    "Como usar sensor DHT22?",
    "Como usar sensor ultrassônico?",
    "O que é MQTT?",
    "Como usar deep sleep ESP32?",
    "Como calcular resistor para LED?",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const onSend = async (customMsg?: string) => {
    const userMsg = customMsg || input.trim();
    if (!userMsg || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      // ── 1. Verificar base de conhecimento embutida (150 Q&A) ─────────────
      // O matching usa similaridade de palavras-chave sem depender de nenhuma API.
      const respostaLocal = buscarResposta(userMsg);

      if (respostaLocal) {
        // Resposta encontrada localmente — sem latência, sem custo de API
        await new Promise(r => setTimeout(r, 400)); // pequena pausa para UX natural
        setMessages(prev => [...prev, { role: "ia", content: respostaLocal }]);
        return;
      }

      // ── 2. Nenhuma correspondência local → tenta a API do servidor ────────
      let aiResponse = "";
      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMsg, history: messages })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        aiResponse = data.response;
      } catch {
        // ── 3. API indisponível → mensagem genérica de sugestão ──────────
        aiResponse = `Olá! Sou o **DevGenius IA** e ainda não encontrei uma resposta pronta para:\n\n> "${userMsg}"\n\nSugestões:\n- Reformule a pergunta com palavras-chave técnicas (ex: "como usar DHT22", "protocolo I2C")\n- Consulte a aba **FAQ Engenharia** para referências técnicas\n- Veja os **Projetos Prontos** para exemplos práticos\n- Acesse a **Base de Código** para C++ e JavaScript embarcado\n\nTenho 150 respostas prontas sobre Arduino, ESP32, sensores, protocolos, eletrônica e muito mais!`;
      }

      setMessages(prev => [...prev, { role: "ia", content: aiResponse }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "ia", content: `⚠️ ${err.message || "Erro de conexão neural. Verifique o servidor."}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-[4rem] h-[80vh] flex flex-col overflow-hidden shadow-2xl">
      <div className="px-10 py-8 bg-neutral-950/50 border-b border-white/5 flex items-center gap-6">
        <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center animate-pulse">
          <img src="/logo.png" className="w-8 h-8 object-cover" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight text-white uppercase">ASSISTENTE DEVGENIUS IA</h3>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">150 respostas embutidas // Gemini como fallback</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 space-y-8 scrollbar-visible" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6 mt-10">
             <div className="w-24 h-24 bg-cyan-500/5 rounded-[2rem] flex items-center justify-center border border-cyan-500/10">
                <Sparkles className="w-12 h-12 text-cyan-400 animate-pulse" />
             </div>
             <p className="text-xl font-black uppercase tracking-widest max-w-sm text-neutral-500">O que deseja projetar hoje?</p>
             
             <div className="flex flex-wrap justify-center gap-3 max-w-2xl mt-4">
                {readyResponses.map(r => (
                  <button 
                    key={r} 
                    onClick={() => onSend(r)}
                    className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:bg-cyan-500 hover:text-neutral-950 hover:border-cyan-500 transition-all"
                  >
                    {r}
                  </button>
                ))}
             </div>
          </div>
        )}
        
        {messages.map((m, i) => (
          <motion.div 
            key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] rounded-[2rem] p-8 text-sm font-medium leading-relaxed ${
              m.role === "user" ? "bg-cyan-500 text-neutral-950 font-bold" : "bg-neutral-800/50 border border-white/5 text-neutral-300"
            }`}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{m.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-neutral-800/50 border border-white/5 rounded-[2rem] p-8 flex items-center gap-4">
               <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
               <span className="text-xs font-black uppercase tracking-widest text-neutral-500">DevGenius IA processando...</span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-10 bg-neutral-950/80 backdrop-blur-2xl border-t border-white/5">
        <div className="relative">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Digite sua dúvida técnica..."
            className="w-full bg-neutral-900 border border-white/10 rounded-3xl pl-8 pr-20 py-6 text-sm font-medium focus:outline-none focus:border-cyan-500/50 transition-all min-h-[90px] max-h-40 resize-none text-white"
          />
          <button 
            onClick={() => onSend()}
            disabled={loading || !input.trim()}
            className="absolute right-4 bottom-4 w-12 h-12 bg-cyan-500 text-neutral-950 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-[9px] text-neutral-700 font-bold uppercase tracking-widest mt-6">150 Q&A EMBUTIDAS // MATCHING POR PALAVRAS-CHAVE // GEMINI COMO BACKUP</p>
      </div>
    </div>
  );
}

function CodeSnippets({ activeTab: dashboardTab, setActiveTab }: { activeTab: string, setActiveTab: (t: any) => void }) {
  const [activeLang, setActiveLang] = useState<"cpp" | "js">("cpp");
  const [activePart, setActivePart] = useState(0);

  const CONTENT = {
    cpp: [
      {
        title: "FUNDAMENTOS E REGISTRADORES",
        text: `Nesta aula inicial sobre C++ focado em hardware, desmistificamos a proximidade entre o silício e o código. Começamos entendendo que, no DEVGENIUS, cada bit conta. 
Os registradores são as células de memória mais rápidas de um microcontrolador, localizadas diretamente dentro da CPU. Manipular registradores (Direct Register Access) é a técnica definitiva para obter performance suprema, superando funções padrão como digitalWrite().
Ao trabalhar com ATmega328P ou ESP32, aprendemos que portas como PORTB, DDRB e PINB controlam grupos de GPIOs simultaneamente. 
DDRB (Data Direction Register B) define se o pino é entrada (0) ou saída (1). 
PORTB define o estado alto (1) ou baixo (0) se for saída, ou ativa o pull-up interno se for entrada.
PINB permite a leitura instantânea do estado físico.
Dominar esses conceitos permite criar drivers ultra-eficientes para telas OLED, sensores de alta velocidade e protocolos customizados.
A profundidade do C++ embarcado vai além, tocando em ponteiros de memória que apontam diretamente para endereços de hardware.
Entender a arquitetura de Harvard e Von Neumann é essencial para otimizar o uso da Flash (onde o código reside) e da SRAM (onde as variáveis dinâmicas existem).
Neste módulo, exploramos também o 'Bit Masking', usando operadores como AND (&), OR (|), XOR (^) e NOT (~) para isolar bits específicos sem afetar os vizinhos.
Essa técnica é a base para configurar temporizadores (Timers) e contadores, fundamentais para gerar sinais PWM precisos ou medir frequências de entrada com precisão de microssegundos.
Continuamos a exploração através do gerenciamento de energia, onde aprendemos a colocar o núcleo em Sleep Mode e acordá-lo via interrupções externas ou WDT (Watchdog Timer).
O Watchdog é o guardião do sistema, reiniciando o processador se o código travar em um loop infinito, garantindo alta confiabilidade em missões críticas.
A jornada pelo C++ exige paciência e visão microscópica. Cada instrução é traduzida em pulsos elétricos que orquestram a realidade física ao seu redor.
Em programação embarcada, não apenas escrevemos código: definimos como o circuito se comporta na prática.
Prepare-se para transformar lógica em ação mecânica e sensorial real.
Sua habilidade de "conversar" com o microcontrolador na linguagem nativa dele é o que define o nível.
Estamos apenas começando a arranhar a superfície do que é possível com firmware de baixo nível.
Cada pino do controlador é uma porta para projetos criativos e industriais.
A maestria técnica é seu passaporte para áreas como robótica, IoT e automação avançada.
Bem-vindo ao mundo do DEVGENIUS.`
      },
      {
        title: "PROTOCOLOS E COMUNICAÇÃO SERIAL",
        text: `A alma de qualquer sistema complexo é a sua capacidade de se comunicar. No segundo módulo de C++, focamos nos protocolos UART, I2C e SPI.
UART (Universal Asynchronous Receiver-Transmitter) é o clássico RX/TX. Ele não possui clock compartilhado, exigindo que ambos os dispositivos concordem com uma Baud Rate (como 9600 ou 115200).
I2C (Inter-Integrated Circuit), por outro lado, é um barramento mestre-escravo que utiliza apenas dois fios: SDA (Data) e SCL (Clock). Es ideal para múltiplos sensores em curta distância, pois cada dispositivo possui um endereço hexadecimal único.
SPI (Serial Peripheral Interface) é o rei da velocidade. Com quatro fios (MOSI, MISO, SCK e CS/SS), ele permite transferências de dados síncronas de altíssima frequência, essenciais para displays coloridos e cartões SD.
Entender a temporização desses protocolos é o que separa um hobbista de um engenheiro profissional. No DEVGENIUS, otimizamos o Buffer de recepção para evitar perda de pacotes em fluxos de dados contínuos.
A comunicação serial não é apenas sobre enviar bytes; é sobre gerenciar o fluxo e garantir a integridade via Checksum ou CRC (Cyclic Redundancy Check).
Abordamos como debugar sinais usando Analisadores Lógicos, visualizando mhz por mhz a negociação entre mestre e periférico.
A arquitetura V12 permite que você alterne entre interfaces SPI de hardware para máxima performance ou 'Bit Banging' se precisar de flexibilidade em pinos genéricos.
No contexto da IoT, a serialização de dados (Json ou Protobuf) torna-se vital para enviar pacotes estruturados via rádio ou rede.
Dominar a interrupção serial (UART Interrupt) garante que seu sistema não 'congele' esperando um dado chegar; ele age proativamente assim que o byte toca o registrador de entrada.
Isso é crucial para sistemas de tempo real (Real-Time Systems) onde latência é o inimigo número um.
Exploramos também o mapeamento de registradores de controle UART para configurar paridade e stop bits manualmente.
A robustez da sua comunicação define a longevidade do seu dispositivo no campo.
Sem uma comunicação sólida, o melhor processador do mundo é apenas uma ilha isolada.
Conectar dispositivos é conectar possibilidades.
Siga para o próximo nível entendendo como o I2C escala em barramentos complexos com drivers de expansão.
Assegure que seu aterramento seja comum para evitar loops de terra que corrompem os dados seriais.
No V12, a conectividade é o nosso maior poder.
Prepare-se para orquestrar uma orquestra de chips falando em harmonia perfeita.
Sua jornada agora entra na fase de integração massiva.`
      },
      {
        title: "INTERRUPÇÕES E MULTITAREFA REAL",
        text: `Para concluir a trilha de C++, entramos no reino das Interrupções e do processamento paralelo simulado (Multitarefa). 
Interrupções de Hardware (ISR - Interrupt Service Routine) são eventos que forçam o processador a parar o que está fazendo para atender a um evento urgente, como o pressionar de um botão ou o estouro de um timer.
Isso evita o uso de loops de verificação (polling), liberando ciclos de CPU para outras tarefas.
No DEVGENIUS, ensinamos que uma ISR deve ser o mais curta possível. Nunca use delay() ou Serial.print() dentro de uma interrupção!
Em vez disso, use flags (variáveis voláteis) para sinalizar ao loop principal que algo aconteceu.
Keywords como 'volatile' informam ao compilador que o valor da variável pode mudar a qualquer momento fora do fluxo normal, evitando otimizações incorretas.
Avançamos para Timers. Cada microcontrolador possui timers internos (Timer0, Timer1, Timer2) que funcionam independentemente da CPU.
Configurar um Timer para disparar a cada 1ms permite criar um 'Systick', o coração de qualquer RTOS (Real-Time Operating System).
Com isso, você pode rodar tarefas em intervalos fixos, simulando que o Arduino ou ESP32 está fazendo várias coisas ao mesmo tempo.
Exploramos o Registro de Comparação (OCR) que permite gerar ondas PWM com resolução de nanosegundos para controle de servo-motores e motores DC potentes.
A multitarefa cooperativa é a base do software profissional. Em vez de bloquear o código com delay(), usamos millis() para gerenciar estados.
Essa mudança de paradigma é o que permite criar dashboards responsivos e sistemas que nunca travam.
No final deste módulo, você entenderá como proteger seções críticas do código usando Mutex ou desabilitando interrupções temporariamente (noInterrupts).
A estabilidade de um firmware embarcado depende dessas práticas de segurança.
Sua evolução técnica chegou ao ápice do desenvolvimento de firmware.
Você agora possui as ferramentas para criar sistemas autônomos e resilientes.
Lembre-se: o código perfeito não é aquele em que não há nada a adicionar, mas aquele em que não há nada a remover.
Otimização é a busca eterna do desenvolvedor embarcado.
O hardware é seu instrumento, o C++ é sua partitura.
Parabéns por completar o ciclo fundamental de baixo nível.
Agora, a eletrônica curva-se à sua vontade programática.`
      }
    ],
    js: [
      {
        title: "LÓGICA ASSÍNCRONA E IOT",
        text: `O JavaScript no ecossistema DEVGENIUS não é apenas para sites; é o motor da Camada de Aplicação e da Nuvem.
Dominar o Event Loop e a natureza não-bloqueante do JS é vital para lidar com fluxos de sensores em tempo real vindos de centenas de dispositivos.
Neste módulo, mergulhamos em Promises e Async/Await. Entendemos que, ao requisitar dados de um módulo ESP32 via HTTP ou WebSockets, não podemos travar a interface do usuário.
A lógica assíncrona permite que o dashboard continue fluido enquanto aguarda a resposta do hardware.
Exploramos como o Node.js no backend do V12 orquestra a comunicação Serial com módulos de rádio através de bibliotecas como serialport.
A gestão de memória no JS, através do Garbage Collector, é automática, mas precisamos ser cuidadosos com 'Memory Leaks' em streams de dados longos.
O JS traz o poder da Web para o Hardware. Com JSON, transformamos estados complexos de sensores em objetos leves e fáceis de trafegar.
Aprendemos a tratar erros graciosamente usando blocos Try/Catch, garantindo que uma falha de conexão não derrube o sistema de monitoramento.
No V12, o JS é a cola que une o Firmware (C++) ao usuário final.
Utilizamos protocolos de baixa latência como MQTT (Message Queuing Telemetry Transport), baseado em tópicos Publish/Subscribe.
MQTT é o padrão ouro para IoT Industrial devido ao seu baixo overhead e confiabilidade em redes instáveis.
Sua habilidade de manipular buffers de dados binários (TypedArrays) permite que você decodifique mensagens cruas vindas dos microcontroladores com eficiência.
A ponte entre o bit e o pixel é construída aqui.
Entender Closures e Contexto (this) no JS ajuda a organizar classes de controle de periféricos de forma modular e reutilizável.
O futuro da automação é escrito em JavaScript, movendo-se da borda para a nuvem em milissegundos.
Prepare-se para gerenciar milhares de eventos por segundo sem perder a sintaxe elegante.
O DEVGENIUS aproveita o motor V8 do Chrome para entregar performance de dashboards que parecem aplicativos nativos.
Você está no comando de uma infraestrutura global.
A jornada digital exige agilidade e adaptabilidade lógica.
Seja bem-vindo ao mundo do Hardware-as-a-Service.`
      },
      {
        title: "COMUNICAÇÃO WEB E DASHBOARDS",
        text: `A interface é onde o homem encontra a máquina. No segundo estágio de JS, focamos em Visualização de Dados e Real-Time UX.
Usar bibliotecas como D3.js ou Recharts permite transformar números frios em gráficos de linha, medidores e mapas de calor vibrantes.
A reatividade do React, combinada com o estado global do DEVGENIUS, faz com que qualquer alteração física no sensor reflita instantaneamente na tela.
Abordamos o uso de WebSockets (Socket.io) para comunicação bi-direcional. Quer ligar uma lâmpada em outro continente? O JS envia o comando e recebe o status de confirmação em menos de 100ms.
Design de Dashboards não é apenas estética; é hierarquia de informação. No V12, priorizamos telemetria crítica (Bateria, Sinal, Alertas) no topo.
Exploramos como criar componentes customizados que simulam hardware real, como knobs, sliders e matrizes de LED virtuais.
A segurança é tratada via JWT (JSON Web Tokens), garantindo que apenas usuários autorizados controlem a infraestrutura.
Entender o protocolo HTTPS e certificados SSL é mandatório antes de levar qualquer projeto de automação para a produção.
No V12, ensinamos como integrar APIs de terceiros (Mapas, Clima, IA) para enriquecer o contexto do seu dispositivo.
Sua estação meteorológica pode agora comparar dados locais com previsões globais em tempo real.
O dashboard torna-se uma ferramenta de tomada de decisão, não apenas visualização.
A performance de renderização (FPS) é mantida alta através da otimização do DOM e uso de Canvas para gráficos pesados.
O sensor envia a leitura, o JS processa, a IA analisa e você decide.
Esse ciclo de feedback é a essência do DEVGENIUS.
Dominar o CSS-in-JS ou Tailwind no contexto de dashboards traz escalabilidade visual.
Suas interfaces devem ser responsivas: do monitor 4K do centro de comando ao smartphone no bolso do técnico.
O usuário deve sentir o poder do hardware na ponta dos dedos.
Estamos redesenhando a forma como interagimos com o mundo físico.
Sua criatividade é o único limite para o que pode ser exibido.
A visualização é a linguagem final da inteligência.`
      },
      {
        title: "INTELIGÊNCIA ARTIFICIAL E EDGE COMPUTING",
        text: `O módulo final de JavaScript explora a fronteira mais excitante: IA no Navegador e na Borda.
Utilizando TensorFlow.js, podemos rodar modelos de Machine Learning (como detecção de objetos ou análise de sentimento) diretamente no client, sem enviar dados sensíveis para um servidor central.
Isso é o que chamamos de Privacidade por Design. O DEVGENIUS integra esses modelos para que o hardware responda a gestos, voz ou padrões visuais.
Aprendemos a converter modelos treinados em Python/Keras para o formato web, otimizando o peso do modelo para carregamento rápido.
A IA não é mágica; é matemática aplicada. Entendemos como Tensors e camadas de redes neurais operam sob o capô.
No V12, a IA atua como um filtro inteligente para alertas, evitando falsos positivos em sensores de presença PIR.
Exploramos também a geração de código via IA, onde você pode pedir ao núcleo para 'escrever um driver para sensor X' e integrá-lo ao seu fluxo JS.
A automação autônoma é o objetivo final. O sistema aprende com o comportamento do usuário e ajusta o consumo de energia da casa inteligente.
Edge Computing significa processar o máximo possível perto da fonte de dados. O JS no V12 facilita esse balanço entre processamento local e cloud.
Sua jornada técnica agora está completa. Você domina do bit no registrador C++ ao neurônio artificial no JavaScript.
Você é um Engenheiro Full-Stack de Hardware, capaz de conceber, prototipar e escalar soluções globais.
O DEVGENIUS é a sua plataforma, mas sua mente é o verdadeiro processador central.
Continuem inovando, continuem questionando e, acima de tudo, continuem construindo.
O futuro não é algo que acontece; é algo que você faz.
As certificações Intermediária e Avançada aguardam para validar seu conhecimento.
O topo da montanha da engenharia oferece a melhor visão do futuro.
Use seus poderes para o bem e para o avanço da humanidade.
O código é eterno, o conhecimento é infinito.
Parabéns por completar a trilha de elite do DEVGENIUS.`
      }
    ]
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-[4rem] overflow-hidden shadow-2xl flex flex-col min-h-[900px]">
      <div className="px-12 py-10 bg-neutral-950/50 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter">BASE DE CONHECIMENTO V12</h3>
           <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.3em]">C++ & JavaScript Core Training</p>
        </div>
        <div className="flex bg-neutral-900 p-1.5 rounded-2xl border border-white/5 gap-2">
           <button 
             onClick={() => { setActiveLang("cpp"); setActivePart(0); }}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeLang === "cpp" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}
           >
             C++ PARA HARDWARE
           </button>
           <button 
             onClick={() => { setActiveLang("js"); setActivePart(0); }}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeLang === "js" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}
           >
             JAVASCRIPT IOT
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex border-b border-white/5 bg-neutral-950/20">
           {[0, 1, 2].map(idx => (
             <button
               key={idx}
               onClick={() => setActivePart(idx)}
               className={`flex-1 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activePart === idx ? "text-cyan-400 border-cyan-500 bg-cyan-500/5" : "text-neutral-600 border-transparent hover:text-neutral-400"}`}
             >
               AULA 0{idx + 1} // {CONTENT[activeLang][idx].title.split(' ')[0]}
             </button>
           ))}
        </div>

        <div className="p-12 space-y-12 flex-1 overflow-y-auto">
           <div className="space-y-10 max-w-4xl mx-auto">
              <div className="flex items-center gap-4">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                 <h4 className="text-3xl font-black text-white tracking-tight uppercase">{CONTENT[activeLang][activePart].title}</h4>
              </div>
              
              <div className="text-neutral-400 text-lg font-medium leading-[1.8] space-y-6 text-justify">
                {CONTENT[activeLang][activePart].text.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                    <History className="w-4 h-4" /> ESTIMATIVA: 45 MINUTOS DE ESTUDO ACELERADO
                 </div>
                 <div className="flex gap-4">
                   <button 
                     onClick={() => setActiveTab("provas")}
                     className="px-8 h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-3"
                   >
                      <GraduationCap className="w-4 h-4" /> IR PARA PROVAS
                   </button>
                   <button className="px-10 h-14 bg-cyan-500 text-neutral-950 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">
                      CONCLUIR MÓDULO 0{activePart + 1}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ title, lang, code }: any) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-900/40 border border-white/5 rounded-[3rem] overflow-hidden group hover:border-cyan-500/20 transition-all shadow-2xl">
      <div className="bg-neutral-950/60 px-10 py-6 flex items-center justify-between border-b border-white/5">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-3">
          <Terminal className="w-4 h-4 text-cyan-400" /> {title}
        </h4>
        <div className="flex items-center gap-4">
           <span className="text-[9px] text-neutral-600 font-mono font-bold">{lang.toUpperCase()}</span>
           <button onClick={onCopy} className="text-[9px] font-black uppercase tracking-widest text-cyan-500 hover:text-white transition-colors">
             {copied ? "COPIADO!" : "COPIAR FONTE"}
           </button>
        </div>
      </div>
      <div className="p-10 overflow-x-auto bg-[#0a0a0a]/50">
        <pre className="text-xs font-mono leading-relaxed text-neutral-400">
           {code}
        </pre>
      </div>
    </div>
  );
}

function ProvasView({ progress, onComplete }: {
  progress: TestProgress,
  onComplete: (trilha: Trilha, score: number, total: number) => void
}) {
  const [activeTrilha, setActiveTrilha] = useState<Trilha | null>(null);

  const trilhas: { id: Trilha; icon: any }[] = [
    { id: "eletronica", icon: Layers },
    { id: "arduino", icon: Cpu },
    { id: "sensores", icon: Activity },
  ];

  const totalQuestions = trilhas.reduce((acc, t) => acc + QUESTIONS[t.id].length, 0);
  const totalBest = trilhas.reduce((acc, t) => acc + (progress[t.id].best || 0), 0);
  const overallPercent = (totalBest / totalQuestions) * 100;

  if (activeTrilha) {
    return (
      <TestInstance
        trilha={activeTrilha}
        onClose={() => setActiveTrilha(null)}
        onFinish={(score, total) => {
          onComplete(activeTrilha, score, total);
          setActiveTrilha(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter uppercase">CENTRO DE <span className="text-cyan-400">CERTIFICAÇÃO</span></h2>
          <p className="text-neutral-500 font-medium max-w-xl mx-auto">Três trilhas com questões reais sobre eletrônica, Arduino e sensores. Cada questão mostra a explicação após a resposta.</p>
        </div>

        <div className="max-w-md mx-auto">
           <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
              <span>Sua performance geral</span>
              <span>{totalBest} / {totalQuestions}</span>
           </div>
           <div className="h-3 bg-neutral-900 rounded-full border border-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallPercent}%` }}
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_#06b6d4]"
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {trilhas.map((t) => {
          const info = TRILHA_INFO[t.id];
          const tProgress = progress[t.id];
          const size = QUESTIONS[t.id].length;
          const isDone = tProgress.completed;
          const userScore = tProgress.best;

          return (
            <button
              key={t.id}
              onClick={() => setActiveTrilha(t.id)}
              className={`text-left p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group ${
                isDone
                ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                : "bg-neutral-900 border-white/10 hover:border-cyan-500/50 hover:bg-neutral-800"
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform"
              }`}>
                {isDone ? <CheckCircle2 /> : <t.icon />}
              </div>

              <h4 className={`text-xl font-black uppercase tracking-tighter mb-2 ${isDone ? "text-emerald-400" : "text-white"}`}>
                {info.label}
              </h4>
              <p className="text-neutral-500 text-xs font-medium leading-relaxed">{info.desc}</p>

              <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{size} questões</span>
                 {userScore !== null && (
                   <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDone ? "text-emerald-500" : "text-cyan-400"}`}>
                     {isDone ? <Trophy className="w-3 h-3" /> : null}
                     Melhor: {userScore} / {size}
                   </span>
                 )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProjectsView() {
  const [selectedBoard, setSelectedBoard] = useState<HardwareItem | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<number>(2); // Default to 2 components

  const filteredProjects = PROJECTS.filter(p => {
    if (activeTab === 6) return p.compCount >= 6;
    return p.compCount === activeTab;
  });

  const tabLabels = [
    { count: 2, label: "2 COMPS" },
    { count: 3, label: "3 COMPS" },
    { count: 4, label: "4 COMPS" },
    { count: 5, label: "5 COMPS" },
    { count: 6, label: "SUPER (6+)" }
  ];

  if (!selectedBoard) {
    return (
      <div className="max-w-7xl mx-auto space-y-12 pb-40">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-black tracking-tighter uppercase whitespace-pre-wrap">SELECIONE SUA <span className="text-cyan-400">PLACA</span></h2>
          <p className="text-neutral-500 font-medium">Escolha o controlador CORE do projeto para sincronizar o kernel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {DATA_PLACAS.map((placa) => (
            <motion.div 
              key={placa.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedBoard(placa)}
              className="group cursor-pointer"
            >
              <div className="bg-neutral-900 border border-white/5 rounded-[4rem] p-10 h-full flex flex-col items-center text-center space-y-8 group-hover:border-cyan-500/30 transition-all shadow-2xl">
                <div className="w-48 h-48 rounded-[2.5rem] bg-neutral-950 border border-white/5 overflow-hidden flex items-center justify-center p-6 shadow-inner">
                   <img src={placa.image} className="w-full h-full object-contain grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{placa.nome}</h3>
                   <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-cyan-400">
                     SYSTEM {placa.tipo.toUpperCase()}
                   </span>
                </div>
                <p className="text-neutral-500 text-xs font-medium leading-relaxed line-clamp-3">
                  {placa.resumo || placa.info}
                </p>
                <div className="w-full pt-8 border-t border-white/5">
                   <button className="w-full h-14 bg-white/5 border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest group-hover:bg-white group-hover:text-black transition-all">
                     SELECIONAR CORE
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-neutral-900/40 p-8 rounded-[3rem] border border-white/5">
         <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-neutral-950 border border-white/5 rounded-2xl flex items-center justify-center p-3">
               <img src={selectedBoard.image} className="w-full h-full object-contain grayscale" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">PLACA SELECIONADA</h4>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedBoard.nome}</h2>
            </div>
         </div>
         <button 
           onClick={() => setSelectedBoard(null)}
           className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
         >
           ALTERAR CONTROLADOR
         </button>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black tracking-tighter uppercase">PROJETOS <span className="text-cyan-400">PRONTOS</span></h2>
        <p className="text-neutral-500 font-medium">Selecione uma categoria por complexidade de hardware.</p>
      </div>

      {/* Internal Tabs */}
      <div className="flex flex-wrap justify-center gap-4 bg-neutral-900/50 p-3 rounded-[2rem] border border-white/5 w-fit mx-auto">
        {tabLabels.map((tab) => (
          <button
            key={tab.count}
            onClick={() => setActiveTab(tab.count)}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.count 
                ? "bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/20" 
                : "text-neutral-500 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredProjects.map((proj) => (
          <motion.div 
            key={proj.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="bg-neutral-900/40 border border-white/5 rounded-[3rem] overflow-hidden p-10 flex flex-col group cursor-pointer hover:border-cyan-500/30 transition-all"
            onClick={() => setSelectedProject(proj)}
          >
            <div className="flex gap-10">
              <div className="w-40 h-40 rounded-[2rem] overflow-hidden shrink-0 border border-white/5">
                <img src={proj.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all scale-110 group-hover:scale-100" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-cyan-400">
                    {proj.difficulty}
                  </span>
                  <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{proj.compCount} Componentes</span>
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{proj.title}</h3>
                <p className="text-neutral-500 text-xs font-medium line-clamp-2 leading-relaxed">{proj.description}</p>
                <div className="pt-4 flex items-center justify-between">
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-neutral-800 border-2 border-neutral-900" />)}
                   </div>
                   <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 overflow-y-auto" onClick={() => setSelectedProject(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/10 rounded-[4rem] max-w-5xl w-full p-12 relative my-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedProject(null)} className="absolute top-10 right-10 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col lg:flex-row gap-12">
                <div className="flex-1 space-y-10">
                  <div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">{selectedProject.title}</h2>
                    <p className="text-neutral-400 leading-relaxed">{selectedProject.description}</p>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 border-b border-cyan-500/20 pb-2 flex items-center gap-3">
                      <Layers className="w-4 h-4" /> ESPECIFICAÇÕES DOS MATERIAIS
                    </h4>
                    <div className="grid gap-4">
                      {selectedProject.components.map(compName => {
                        const hardware = [...DATA_PLACAS, ...DATA_COMPONENTES, ...DATA_PC_HARDWARE].find(h => h.nome === compName);
                        return (
                          <div key={compName} className="bg-white/5 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                             <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center">
                                <img src={hardware?.image || selectedProject.image} className="w-6 h-6 object-contain grayscale" />
                             </div>
                             <div className="flex-1">
                                <p className="text-[10px] font-black text-white uppercase tracking-tight">{compName}</p>
                                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">
                                   {hardware?.specs ? `⚡ ${hardware.specs.voltagem} | 🔌 ${hardware.specs.pinagem}` : "Especificação DEVGENIUS"}
                                </p>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-amber-400 border-b border-amber-500/20 pb-2 flex items-center gap-3">
                      <Zap className="w-4 h-4" /> ESQUEMA DE CONEXÃO
                    </h4>
                    <pre className="bg-neutral-950 p-6 rounded-2xl border border-white/5 text-xs font-mono text-neutral-400 whitespace-pre-wrap">
                      {selectedProject.connections}
                    </pre>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 border-b border-cyan-500/20 pb-2 flex items-center gap-3">
                      <GraduationCap className="w-4 h-4" /> PASSO A PASSO
                    </h4>
                    <div className="grid gap-4">
                      {selectedProject.steps.map((s, i) => (
                        <div key={i} className="bg-white/5 p-6 rounded-3xl flex gap-6">
                           <div className="w-10 h-10 rounded-xl bg-cyan-500 text-neutral-950 flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                           <div>
                              <p className="font-black text-white text-sm uppercase tracking-tight mb-1">{s.title}</p>
                              <p className="text-neutral-500 text-xs font-medium">{s.description}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:w-96 space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 border-b border-emerald-500/20 pb-2 flex items-center gap-3">
                    <Code className="w-4 h-4" /> CÓDIGO FONTE ({selectedBoard?.nome.toUpperCase() || "V12 KERNEL"})
                  </h4>
                  <pre className="bg-neutral-950 p-6 rounded-3xl border border-white/5 text-[10px] font-mono text-neutral-400 overflow-x-auto h-[600px] scrollbar-visible">
                    {selectedProject.code}
                  </pre>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(selectedProject.code); alert(`Código para ${selectedBoard?.nome || "V12"} Copiado!`); }}
                    className="w-full h-14 bg-white text-neutral-950 rounded-2xl font-black text-[10px] tracking-widest hover:bg-cyan-500 transition-all"
                  >
                    COPIAR CÓDIGO PARA {selectedBoard?.nome.split(' ')[0].toUpperCase() || "V12"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TestInstance({ trilha, onClose, onFinish }: { trilha: Trilha; onClose: () => void; onFinish: (score: number, total: number) => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // revealed = usuário já confirmou a resposta dessa questão (mostramos correto/errado + explicação)
  const [revealed, setRevealed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const questions = QUESTIONS[trilha];
  const trilhaLabel = TRILHA_INFO[trilha].label;
  const q = questions[currentIdx];

  const handleConfirm = () => {
    if (selectedIdx === null) return;
    const newAnswers = [...answers];
    newAnswers[currentIdx] = selectedIdx;
    setAnswers(newAnswers);
    setRevealed(true);
  };

  const handleNext = () => {
    if (transitioning) return;
    setTransitioning(true);

    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setSelectedIdx(answers[currentIdx + 1] ?? null);
        setRevealed(false);
      } else {
        setShowResult(true);
      }
      setTransitioning(false);
    }, 600);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) score++;
    });
    return score;
  };

  const score = calculateScore();
  const isPerfect = score === questions.length;
  const progressPercent = ((currentIdx + (selectedIdx !== null ? 1 : 0)) / questions.length) * 100;

  if (showResult) {
    return (
      <div className="max-w-2xl mx-auto bg-neutral-900 border border-white/10 rounded-[3rem] p-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${isPerfect ? "bg-emerald-500 shadow-[0_0_50px_#10b98144]" : "bg-red-500/20 border border-red-500/40"}`}>
           {isPerfect ? <Trophy className="w-12 h-12 text-white" /> : <X className="w-12 h-12 text-red-400" />}
        </div>
        
        <div className="space-y-4">
          <h3 className="text-4xl font-black tracking-tighter uppercase">
            {isPerfect ? "EXCELÊNCIA ATINGIDA!" : "TENTATIVA FINALIZADA"}
          </h3>
          <p className="text-neutral-500 font-medium">Você acertou <span className="text-white font-bold">{score}</span> de <span className="text-white font-bold">{questions.length}</span> questões.</p>
        </div>

        {!isPerfect && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
            Atenção: Apenas 100% de acertos permite o progresso para a próxima etapa. Revise seus conhecimentos e tente novamente.
          </div>
        )}

        <button 
          onClick={() => onFinish(score, questions.length)}
          className={`w-full h-16 rounded-2xl font-black tracking-widest text-xs transition-all active:scale-95 ${
            isPerfect ? "bg-white text-black hover:bg-cyan-500 shadow-xl" : "bg-neutral-800 text-white hover:bg-neutral-700"
          }`}
        >
          {isPerfect ? "CONTINUAR JORNADA" : "VOLTAR AO PAINEL"}
        </button>
      </div>
    );
  }

  // Estilo de cada opção depende do estado revealed: cinza/cyan (selecionar) → verde/vermelho (revelado)
  const getOptionClass = (i: number) => {
    if (!revealed) {
      return selectedIdx === i
        ? "bg-cyan-500/10 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
        : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10";
    }
    if (i === q.correctIndex) return "bg-emerald-500/10 border-emerald-500";
    if (i === selectedIdx) return "bg-red-500/10 border-red-500";
    return "bg-white/5 border-white/5 opacity-50";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 relative">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-neutral-500 hover:text-white flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-colors">
          <X className="w-4 h-4" /> SAIR DA TRILHA
        </button>
        <div className="text-right">
           <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">Questão {currentIdx + 1} de {questions.length}</p>
           <div className="w-48 h-2 bg-neutral-900 border border-white/5 rounded-full overflow-hidden">
              <motion.div animate={{ width: `${progressPercent}%` }} className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
           </div>
        </div>
      </div>

      <div className="relative flex gap-8 items-start">
        <div className="flex-1 bg-neutral-900 border border-white/10 rounded-[3rem] p-12 shadow-2xl space-y-10 min-h-[500px]">
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/40 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                  {trilhaLabel}
                </span>
              </div>
              <h3 className="text-3xl font-black tracking-tight leading-tight text-white">{q.text}</h3>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  disabled={revealed || transitioning}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all flex items-center justify-between group ${getOptionClass(i)}`}
                >
                  <div className="flex items-center gap-6">
                     <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs transition-colors ${
                       revealed && i === q.correctIndex ? "bg-emerald-500 border-emerald-400 text-black"
                       : revealed && i === selectedIdx ? "bg-red-500 border-red-400 text-black"
                       : selectedIdx === i ? "bg-cyan-500 border-cyan-400 text-black"
                       : "bg-neutral-950 border-white/10 text-neutral-600 group-hover:text-white"
                     }`}>
                        {String.fromCharCode(65 + i)}
                     </div>
                     <span className={`text-sm font-bold transition-colors ${selectedIdx === i || (revealed && i === q.correctIndex) ? "text-white" : "text-neutral-300 group-hover:text-white"}`}>{opt}</span>
                  </div>
                  {revealed && i === q.correctIndex && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {revealed && i === selectedIdx && i !== q.correctIndex && <X className="w-5 h-5 text-red-400" />}
                </button>
              ))}
           </div>

           {revealed && (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={`p-6 rounded-2xl border ${
                 selectedIdx === q.correctIndex
                   ? "bg-emerald-500/5 border-emerald-500/20"
                   : "bg-red-500/5 border-red-500/20"
               }`}
             >
               <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${selectedIdx === q.correctIndex ? "text-emerald-400" : "text-red-400"}`}>
                 {selectedIdx === q.correctIndex ? "Resposta correta" : "Resposta incorreta"}
               </p>
               <p className="text-sm font-medium text-neutral-300 leading-relaxed">{q.explanation}</p>
             </motion.div>
           )}

           <div className="flex gap-4 pt-8 border-t border-white/5">
              {currentIdx > 0 && !revealed && (
                <button
                  disabled={transitioning}
                  onClick={() => {
                    setCurrentIdx(currentIdx - 1);
                    setSelectedIdx(answers[currentIdx - 1] ?? null);
                    setRevealed(answers[currentIdx - 1] !== undefined);
                  }}
                  className="flex-1 h-16 rounded-2xl border border-white/5 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> VOLTAR
                </button>
              )}
              {!revealed ? (
                <button
                  disabled={selectedIdx === null || transitioning}
                  onClick={handleConfirm}
                  className={`flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${
                    selectedIdx !== null
                    ? "bg-cyan-500 text-neutral-950 shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                  }`}
                >
                  CONFIRMAR RESPOSTA
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled={transitioning}
                  onClick={handleNext}
                  className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 bg-cyan-500 text-neutral-950 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {currentIdx < questions.length - 1 ? "PRÓXIMA QUESTÃO" : "FINALIZAR PROVA"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function FAQView() {
  const [search, setSearch] = useState("");
  const allHardware = [...DATA_PLACAS, ...DATA_COMPONENTES, ...DATA_PC_HARDWARE];

  const filteredItems = allHardware.filter(item => 
    item.nome.toLowerCase().includes(search.toLowerCase()) ||
    item.info.toLowerCase().includes(search.toLowerCase()) ||
    item.resumo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black tracking-tighter uppercase">FAQ DE <span className="text-cyan-400">ENGENHARIA</span></h2>
        <p className="text-neutral-500 font-medium max-w-2xl mx-auto">Manual técnico de referência para componentes e hardware do catálogo DEVGENIUS. Descrição, resumo e forma de uso detalhada.</p>
      </div>

      <div className="relative max-w-2xl mx-auto group">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-neutral-500 group-focus-within:text-cyan-400 transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="PESQUISAR NO REGISTRO DE HARDWARE..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-white/5 rounded-[2rem] pl-16 pr-8 py-5 text-xs font-black tracking-[0.2em] focus:border-cyan-500/40 outline-none uppercase shadow-2xl"
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredItems.map((item) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-neutral-900 border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-cyan-500/20 transition-all shadow-xl"
          >
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-72 bg-neutral-950 p-8 flex flex-col items-center justify-center gap-6 border-b lg:border-b-0 lg:border-r border-white/5">
                <div className="w-40 h-40 bg-neutral-900 rounded-[2rem] border border-white/5 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                  <img src={item.image} alt={item.nome} className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="text-center">
                  <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[8px] font-black text-cyan-400 uppercase tracking-widest mb-2">
                    {item.tipo}
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight uppercase tracking-tighter">{item.nome}</h3>
                </div>
              </div>
              
              <div className="flex-1 p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Resumo de Hardware
                    </h4>
                    <p className="text-sm font-bold text-neutral-300 leading-relaxed italic">
                      {item.resumo || "Componente essencial de processamento e interface para o DEVGENIUS."}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                      <Info className="w-3 h-3" /> Descrição Técnica
                    </h4>
                    <p className="text-xs font-medium text-neutral-400 leading-relaxed">
                      {item.descricao_faq || item.info}
                    </p>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Terminal className="w-4 h-4" /> Diretrizes de Implementação (Forma de Uso)
                  </h4>
                  <div className="bg-neutral-950/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Cpu className="w-24 h-24" />
                    </div>
                    <p className="text-xs font-mono text-neutral-300 leading-6 relative z-10">
                      {item.forma_uso || "Conecte observando as voltagens nominais nos pinos correspondentes. Verifique o baseCode em Hardware & Placas para exemplos de inicialização do kernel."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NotebookView({ content, setContent, lastSync }: { content: string, setContent: any, lastSync: string | null }) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-40">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 shadow-lg">
               <StickyNote className="w-6 h-6" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Bloco de Notas</h3>
               <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  DevGenius Personal Storage // {lastSync ? `Sincronizado: ${lastSync}` : "Não Sincronizado"}
                  {lastSync && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
               </p>
            </div>
         </div>
      </div>

      <div className="relative group">
         <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-3xl group-focus-within:border-cyan-500 transition-colors" />
         <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-cyan-500/20 rounded-br-3xl group-focus-within:border-cyan-500 transition-colors" />

         <textarea 
           value={content}
           onChange={(e) => setContent(e.target.value)}
           className="w-full bg-neutral-900 border border-white/5 rounded-[3rem] p-12 text-sm font-medium leading-[1.8] text-neutral-300 focus:outline-none focus:border-cyan-500/30 transition-all min-h-[600px] shadow-2xl custom-scrollbar resize-none font-mono"
           placeholder="ESCREVA SEUS INSIGHTS DE ENGENHARIA AQUI... SEU NÚCLEO SINCRONIZA AUTOMATICAMENTE COM O DEVGENIUS."
         />

         <div className="absolute bottom-10 right-10 flex items-center gap-4 pointer-events-none opacity-20">
            <Edit3 className="w-12 h-12 text-white" />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-2 transition-all hover:border-cyan-500/20">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
               <Zap className="w-3 h-3 text-cyan-400" /> Latência Zero
            </h4>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">Sincronização instantânea com o banco de usuários DevGenius.</p>
         </div>
         <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-2 transition-all hover:border-cyan-500/20">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
               <Lock className="w-3 h-3 text-amber-500" /> Criptografia V12
            </h4>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">Suas notas ficam salvas localmente no seu navegador.</p>
         </div>
         <div className="bg-white/5 border border-white/5 p-6 rounded-3xl space-y-2 transition-all hover:border-cyan-500/20">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
               <Monitor className="w-3 h-3 text-indigo-400" /> Multi-Plataforma
            </h4>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">Acesse seus registros de qualquer terminal autorizado.</p>
         </div>
      </div>
    </div>
  );
}
