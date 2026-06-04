import React, { useState, useRef, useEffect } from "react";
import bcrypt from "bcryptjs";
import { User } from "../App";
import { DATA_PLACAS, DATA_COMPONENTES, DATA_PC_HARDWARE, HardwareItem } from "../data/hardware";
import { PROJECTS, Project } from "../data/projects";
import { QUESTIONS, TRILHA_INFO, MODULO_INFO, Question, Trilha, Modulo } from "../data/questions";
import { buscarResposta, IA_GUIDED_CATEGORIES, GuidedCategory } from "../data/iaKnowledge";
import { getProjectsForComponent, ComponentProject } from "../data/componentProjects";
import { IA_LEARN_MODULES, IALearnModule } from "../data/iaLearnContent";
import CircuitView from "./CircuitView";
import CommunityView from "./CommunityView";
import FlappyCode from "./FlappyCode";
import DinoRunner from "./DinoRunner";
import RewardsView from "./RewardsView";
import CoinWidget from "./CoinWidget";
import { useRewards } from "../context/RewardsContext";
import { LevelCard, LevelChip, useLevelInfo } from "./LevelBadge";
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
  Book, StickyNote, Trash2, Edit3, Save, Fuel, ShieldAlert, Smartphone,
  BookMarked, BarChart2, FolderOpen, ChevronDown, BadgeCheck, CircuitBoard, Gamepad2,
  Maximize2, Minimize2, Menu, Home, Share2, Copy, Twitter, Link
} from "lucide-react";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onAuthRequired: () => void;
  tourActive?: boolean;
  onEndTour?: () => void;
  guestTimeLeft?: number | null;
  guestFullAccess?: boolean; // visitante com acesso total (6 min liberados)
}

type Tab = "placas" | "componentes" | "hardware_pc" | "workspace" | "ia" | "code" | "projetos" | "provas" | "sobre" | "configuracoes" | "faq" | "notas" | "circuito" | "aprender_ia" | "comunidade" | "games" | "recompensas";

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
  eletronica:    { best: null, completed: false },
  arduino:       { best: null, completed: false },
  sensores:      { best: null, completed: false },
  eletro_inter:  { best: null, completed: false },
  arduino_inter: { best: null, completed: false },
  redes_inter:   { best: null, completed: false },
  eletro_pro:    { best: null, completed: false },
  firmware_pro:  { best: null, completed: false },
  iot_pro:       { best: null, completed: false },
};

// ─── Sistema de Coleção / Índice ─────────────────────────────────────────
interface ItemCollection {
  marked: boolean;
  markedAt: string | null;
  completedProjects: number[]; // índices 0-9 dos projetos concluídos
}
type CollectionState = Record<string, ItemCollection>;

const COLLECTION_KEY = "devgenius_collection_v1";
const loadCollection = (): CollectionState => {
  try { return JSON.parse(localStorage.getItem(COLLECTION_KEY) || "{}"); } catch { return {}; }
};
const saveCollection = (c: CollectionState) => {
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(c));
};
const defaultEntry = (): ItemCollection => ({ marked: false, markedAt: null, completedProjects: [] });

// ── Definição completa de temas ──────────────────────────────────────────────
type ThemeDef = {
  id: string;
  label: string;
  icon: string;
  rewardId: string | null;  // null = grátis
  accentClass: string;      // cor do acento (cx-400, amber-400, etc.)
  accentHex: string;        // para preview colorido
  fontClass: string;        // font-sans | font-mono
  bgClass: string;          // bg-neutral-950 | bg-[#050f05] etc.
  previewBg: string;        // cor hexadecimal do preview
};

const ALL_THEMES: ThemeDef[] = [
  { id: "kernel",       label: "Kernel (padrão)", icon: "🖤", rewardId: null,               accentClass: "cyan-400",    accentHex: "#22d3ee", fontClass: "font-sans",  bgClass: "bg-neutral-950",    previewBg: "#0a0a0a" },
  { id: "amber_free",   label: "Âmbar",           icon: "🟡", rewardId: "theme_free_amber", accentClass: "amber-400",   accentHex: "#fbbf24", fontClass: "font-sans",  bgClass: "bg-neutral-950",    previewBg: "#1a1200" },
  { id: "retro_free",   label: "Retro Tipo",      icon: "📟", rewardId: "theme_free_retro", accentClass: "cyan-400",    accentHex: "#22d3ee", fontClass: "font-mono",  bgClass: "bg-neutral-950",    previewBg: "#0a1010" },
  { id: "vapor",        label: "Vapor Wave",      icon: "🌊", rewardId: "theme_vapor",      accentClass: "purple-400",  accentHex: "#c084fc", fontClass: "font-sans",  bgClass: "bg-neutral-950",    previewBg: "#100515" },
  { id: "matrix_pro",   label: "Matrix Pro",      icon: "🖥️", rewardId: "theme_matrix_pro", accentClass: "emerald-400", accentHex: "#34d399", fontClass: "font-mono",  bgClass: "bg-neutral-950",    previewBg: "#051505" },
  { id: "rose_neon",    label: "Rosa Neon",       icon: "🌸", rewardId: "theme_rose",       accentClass: "rose-400",    accentHex: "#fb7185", fontClass: "font-sans",  bgClass: "bg-neutral-950",    previewBg: "#150510" },
];

// Legacy (usado por setTheme antigo)
const THEMES = {
  kernel: { bg: "neutral-950", accent: "cyan-400", font: "font-sans" },
  matrix: { bg: "transparent", accent: "emerald-500", font: "font-mono" },
  vapor: { bg: "neutral-950", accent: "purple-500", font: "font-sans" }
};

export default function Dashboard({ user, onLogout, onAuthRequired, tourActive = false, onEndTour, guestTimeLeft, guestFullAccess = false }: DashboardProps) {
  const { claimEvent } = useRewards();
  const [activeTab, setActiveTab] = useState<Tab>("placas");
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const restrictedTabs: Tab[] = ["workspace", "ia", "notas", "provas", "configuracoes", "recompensas"];

  const handleTabChange = (tab: Tab) => {
    // guestFullAccess = visitante com 6 minutos — acesso total a todas as abas
    if (!user && !guestFullAccess && restrictedTabs.includes(tab)) {
      showToast("Para acessar esse recurso faça o cadastro ou faça o login", "warn");
      onAuthRequired();
      return;
    }
    setActiveTab(tab);
    setSidebarOpen(false); // fecha sidebar no mobile ao navegar
  };
  const [subTab, setSubTab] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [showTimeline, setShowTimeline] = useState(!tourActive);
  const [basket, setBasket] = useState<HardwareItem[]>([]);
  const [selectedPlaca, setSelectedPlaca] = useState<HardwareItem | null>(null);
  const [modalItem, setModalItem] = useState<HardwareItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "warn" } | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [notes, setNotes] = useState<string>("");
  const [collection, setCollection] = useState<CollectionState>(loadCollection);
  // Estado para pré-carregar projeto no Circuito
  const [circuitPreload, setCircuitPreload] = useState<{ board: HardwareItem | null; components: HardwareItem[]; code?: string; projectTitle?: string } | null>(null);
  const [lastNoteSync, setLastNoteSync] = useState<string | null>(null);

  // Settings State
  const [theme, setTheme] = useState({
    bg: "neutral-950",
    accent: "cyan-400",
    font: "font-sans"
  });
  const [activeThemeId, setActiveThemeId] = useState<string>(() =>
    localStorage.getItem(`theme_active_${user?.username}`) || "kernel"
  );

  const [colorThemeId, setColorThemeId] = useState<string>(() =>
    localStorage.getItem(`color_theme_${user?.username}`) || "kernel"
  );
  const [fontThemeId, setFontThemeId] = useState<string>(() =>
    localStorage.getItem(`font_theme_${user?.username}`) || "sans"
  );

  // ── Injeta CSS completo: acento + fundo do tema ──────────────────────────────
  React.useEffect(() => {
    const COLORS: Record<string, {
      c300: string; c400: string; c500: string; c600: string;
      bg950: string; bg900: string; bg800: string; bg700: string;
    }> = {
      kernel:     { c300:"#67e8f9", c400:"#22d3ee", c500:"#06b6d4", c600:"#0891b2", bg950:"#030a0d", bg900:"#061318", bg800:"#0a1f26", bg700:"#0e2d36" },
      amber_free: { c300:"#fcd34d", c400:"#fbbf24", c500:"#f59e0b", c600:"#d97706", bg950:"#0d0800", bg900:"#1a1100", bg800:"#261900", bg700:"#332200" },
      vapor:      { c300:"#d8b4fe", c400:"#c084fc", c500:"#a855f7", c600:"#9333ea", bg950:"#08000f", bg900:"#10001e", bg800:"#18002d", bg700:"#22003c" },
      matrix_pro: { c300:"#6ee7b7", c400:"#34d399", c500:"#10b981", c600:"#059669", bg950:"#000d04", bg900:"#001a08", bg800:"#002610", bg700:"#003318" },
      rose_neon:  { c300:"#fda4af", c400:"#fb7185", c500:"#f43f5e", c600:"#e11d48", bg950:"#0d0005", bg900:"#1a000a", bg800:"#260010", bg700:"#330016" },
    };
    const c = COLORS[colorThemeId] || COLORS.kernel;
    const opacities = [5,10,15,20,25,30,40,50,60,70,80,90];
    const hex2 = (pct: number) => Math.round(255 * pct / 100).toString(16).padStart(2,"0");
    const bgOps  = opacities.map(o=>`[class*="bg-cyan-500\\/${o}"] { background-color: ${c.c500}${hex2(o)} !important; }`).join("\n");
    const brOps  = opacities.map(o=>`[class*="border-cyan-500\\/${o}"] { border-color: ${c.c500}${hex2(o)} !important; }`).join("\n");
    const brOps4 = opacities.map(o=>`[class*="border-cyan-400\\/${o}"] { border-color: ${c.c400}${hex2(o)} !important; }`).join("\n");
    const shOps  = opacities.map(o=>`[class*="shadow-cyan-500\\/${o}"] { --tw-shadow-color: ${c.c500}${hex2(o)} !important; }`).join("\n");

    let el = document.getElementById("dg-color-style") as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = "dg-color-style"; document.head.appendChild(el); }
    el.textContent = `
      /* ── Fundo global do tema ── */
      html, body                           { background-color: ${c.bg950} !important; }
      [class*="bg-neutral-950"]            { background-color: ${c.bg950} !important; }
      [class*="bg-neutral-900"]            { background-color: ${c.bg900} !important; }
      [class*="bg-neutral-800"]            { background-color: ${c.bg800} !important; }
      [class*="bg-neutral-700"]            { background-color: ${c.bg700} !important; }
      /* ── Acento: texto ── */
      [class*="text-cyan-"]               { color: ${c.c400} !important; }
      [class~="text-cyan-300"]            { color: ${c.c300} !important; }
      [class~="text-cyan-400"]            { color: ${c.c400} !important; }
      [class~="text-cyan-500"]            { color: ${c.c500} !important; }
      [class~="text-cyan-600"]            { color: ${c.c600} !important; }
      /* ── Acento: background ── */
      [class~="bg-cyan-400"]              { background-color: ${c.c400} !important; }
      [class~="bg-cyan-500"]              { background-color: ${c.c500} !important; }
      [class*="bg-cyan-"]                 { background-color: ${c.c500} !important; }
      ${bgOps}
      /* ── Acento: border ── */
      [class~="border-cyan-400"]          { border-color: ${c.c400} !important; }
      [class~="border-cyan-500"]          { border-color: ${c.c500} !important; }
      [class*="border-cyan-"]             { border-color: ${c.c500} !important; }
      ${brOps}
      ${brOps4}
      /* ── Acento: shadow/ring ── */
      [class*="shadow-cyan-"]             { --tw-shadow-color: ${c.c500}4d !important; }
      [class*="ring-cyan-"]               { --tw-ring-color: ${c.c500} !important; }
      ${shOps}
      /* ── Hover / Focus ── */
      [class*="hover:border-cyan-"]:hover { border-color: ${c.c500}80 !important; }
      [class*="focus:border-cyan-"]:focus { border-color: ${c.c500}66 !important; }
      [class*="hover:bg-cyan-"]:hover     { background-color: ${c.c500}1a !important; }
      [class*="hover:text-cyan-"]:hover   { color: ${c.c400} !important; }
      /* ── Selection ── */
      ::selection { background-color: ${c.c500}4d !important; }
      /* ── Scrollbar ── */
      ::-webkit-scrollbar-thumb           { background-color: ${c.c600}60 !important; }
      ::-webkit-scrollbar-thumb:hover     { background-color: ${c.c500}99 !important; }
      /* ── CSS var global ── */
      :root { --accent-hex: ${c.c400}; --bg-950: ${c.bg950}; --bg-900: ${c.bg900}; }
    `;
    if (user) localStorage.setItem(`color_theme_${user.username}`, colorThemeId);
  }, [colorThemeId, user]);

  // ── Injeta CSS completo para fonte (TODAS as letras) ─────────────────────────
  React.useEffect(() => {
    const FONT_STACKS: Record<string, string> = {
      inter:       '"Inter", ui-sans-serif, system-ui, sans-serif',
      space:       '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
      roboto:      '"Roboto", ui-sans-serif, system-ui, sans-serif',
      orbitron:    '"Orbitron", ui-sans-serif, system-ui, sans-serif',
      jetbrains:   '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
      fira:        '"Fira Code", "JetBrains Mono", ui-monospace, monospace',
      sharetech:   '"Share Tech Mono", ui-monospace, monospace',
      vt323:       '"VT323", ui-monospace, monospace',
      courier:     '"Courier New", "Lucida Console", ui-monospace, monospace',
    };
    const f = FONT_STACKS[fontThemeId] || FONT_STACKS.inter;
    let el = document.getElementById("dg-font-style") as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = "dg-font-style"; document.head.appendChild(el); }
    el.textContent = `
      *, *::before, *::after { font-family: ${f} !important; }
    `;
    if (user) localStorage.setItem(`font_theme_${user.username}`, fontThemeId);
  }, [fontThemeId, user]);
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
    const loadNotes = async () => {
      // Tenta carregar do servidor primeiro, fallback para localStorage
      try {
        const res = await fetch(`/api/notes/${encodeURIComponent(user.username)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.notes && typeof data.notes === "string" && data.notes.trim()) {
            setNotes(data.notes);
            localStorage.setItem(`devgenius_notes_${user.username}`, data.notes);
            return;
          }
        }
      } catch {}
      try {
        const saved = localStorage.getItem(`devgenius_notes_${user.username}`);
        if (saved) setNotes(saved);
      } catch (e) { console.error("Erro ao carregar notas."); }
    };
    loadNotes();
  }, [activeTab, user?.username]);

  // ─── Funções de coleção ────────────────────────────────────────────────
  const toggleMark = (itemId: string) => {
    const prev = collection[itemId] ?? defaultEntry();
    const next: ItemCollection = {
      ...prev,
      marked: !prev.marked,
      markedAt: !prev.marked ? new Date().toISOString() : null,
    };
    const updated = { ...collection, [itemId]: next };
    setCollection(updated);
    saveCollection(updated);
    showToast(next.marked ? "Adicionado à coleção ⭐" : "Removido da coleção");
    // Coins: +5 ao marcar pela primeira vez
    if (next.marked && user) claimEvent(`collection_mark:${itemId}`, 5);
  };

  const toggleProject = (itemId: string, projIdx: number) => {
    const prev = collection[itemId] ?? defaultEntry();
    const wasDone = prev.completedProjects.includes(projIdx);
    const done = wasDone
      ? prev.completedProjects.filter(i => i !== projIdx)
      : [...prev.completedProjects, projIdx];
    const updated = { ...collection, [itemId]: { ...prev, completedProjects: done } };
    setCollection(updated);
    saveCollection(updated);
    // Coins: +20 ao concluir projeto pela primeira vez
    if (!wasDone && user) claimEvent(`project_complete:${itemId}:${projIdx}`, 20);
  };

  const getEntry = (itemId: string) => collection[itemId] ?? defaultEntry();

  const syncNotes = async (content: string) => {
    if (!user) return;
    try {
      localStorage.setItem(`devgenius_notes_${user.username}`, content);
      setLastNoteSync(new Date().toLocaleTimeString());
    } catch (e) {
      showToast("Falha na sincronização das notas.", "warn");
    }
  };

  const saveNotesToServer = async (content: string) => {
    if (!user) return;
    try {
      // Sync para o servidor
      const res = await fetch(`/api/notes/${encodeURIComponent(user.username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: content }),
      });
      if (res.ok) {
        localStorage.setItem(`devgenius_notes_${user.username}`, content);
        setLastNoteSync(new Date().toLocaleTimeString());
        showToast("✅ Notas salvas na sua conta!");
      } else {
        showToast("Falha ao salvar na conta.", "warn");
      }
    } catch {
      showToast("Erro de conexão ao salvar.", "warn");
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

    // ── Coins: acertos + trilha perfeita ──────────────────────────────────
    if (score > 0) {
      // Moedas por acertos (repetível a cada tentativa)
      claimEvent(`provas_correct:${trilha}:${Date.now()}`, score * 2);
    }
    if (score === total && !previous.completed) {
      // Trilha perfeita pela primeira vez
      claimEvent(`trilha_perfect:${trilha}`, 50);
    }
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
    <div className={`flex h-screen h-[100dvh] bg-${theme.bg} overflow-hidden ${theme.font} transition-colors duration-500 ${viewMode === "compact" ? "text-xs" : ""}`}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
        .scrollbar-visible::-webkit-scrollbar { width: 10px; display: block !important; }
        .scrollbar-visible::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.5); border-radius: 10px; border: 2px solid rgba(0,0,0,0.3); }
        .scrollbar-visible::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.8); }
        .viewport-scroll::-webkit-scrollbar { width: 6px; }
        .viewport-scroll::-webkit-scrollbar-track { background: transparent; }
        .viewport-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .viewport-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        @media (max-width: 767px) {
          .scrollbar-visible::-webkit-scrollbar { width: 4px; }
        }
      `}</style>

      {/* ── Mobile Sidebar Backdrop ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[55] md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showTimeline && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-neutral-950 flex flex-col items-center justify-center p-12 overflow-y-auto"
          >
             <div className="max-w-4xl w-full space-y-12">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase">LINHA DO TEMPO <span className="text-cyan-400">DEVGENIUS</span></h2>
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

      {/* Sidebar — overlay no mobile, lateral no desktop */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-[60]
        border-r border-white/5 bg-neutral-900/95 md:bg-neutral-900/40
        flex flex-col transition-all duration-300 ease-in-out
        ${viewMode === "compact" ? "w-20" : "w-72"}
        ${sidebarOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className={`${viewMode === "compact" ? "p-4" : "p-6 md:p-8"} flex items-center justify-between`}>
          <h1 className={`font-black tracking-tighter flex items-center gap-3 ${viewMode === "compact" ? "justify-center w-full" : ""}`}>
            <div className="w-10 h-10 bg-neutral-950 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.png" className="w-full h-full object-cover opacity-80" />
            </div>
            {viewMode === "expanded" && <span className="text-lg">DEVGENIUS <span className="text-cyan-400">V12</span></span>}
          </h1>
          {/* Fechar sidebar no mobile */}
          {viewMode === "expanded" && (
            <button onClick={() => setSidebarOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className={`flex-1 ${viewMode === "compact" ? "px-2" : "px-4"} space-y-2 overflow-y-auto scrollbar-visible min-h-0`}>
          <NavItem icon={Cpu} label={viewMode === "expanded" ? "Controladoras" : ""} active={activeTab === "placas"} onClick={() => handleTabChange("placas")} tourId="placas" />
          <NavItem icon={Layers} label={viewMode === "expanded" ? "Componentes" : ""} active={activeTab === "componentes"} onClick={() => handleTabChange("componentes")} tourId="componentes" />
          <NavItem icon={Monitor} label={viewMode === "expanded" ? "Hardware PC" : ""} active={activeTab === "hardware_pc"} onClick={() => handleTabChange("hardware_pc")} tourId="hardware_pc" />
          <NavItem icon={Layout} label={viewMode === "expanded" ? "Laboratório" : ""} active={activeTab === "workspace"} onClick={() => handleTabChange("workspace")} badge={basket.length + (selectedPlaca ? 1 : 0)} tourId="workspace" />
          <NavItem icon={Box} label={viewMode === "expanded" ? "Projetos Prontos" : ""} active={activeTab === "projetos"} onClick={() => handleTabChange("projetos")} tourId="projetos" />
          <NavItem icon={MessageSquare} label={viewMode === "expanded" ? "DevGenius IA" : ""} active={activeTab === "ia"} onClick={() => handleTabChange("ia")} tourId="ia" />
          <NavItem icon={Book} label={viewMode === "expanded" ? "Bloco de Notas" : ""} active={activeTab === "notas"} onClick={() => handleTabChange("notas")} tourId="notas" />
          <NavItem icon={Terminal} label={viewMode === "expanded" ? "Base de Código" : ""} active={activeTab === "code"} onClick={() => handleTabChange("code")} tourId="code" />
          <NavItem icon={GraduationCap} label={viewMode === "expanded" ? "Provas & Testes" : ""} active={activeTab === "provas"} onClick={() => handleTabChange("provas")} tourId="provas" />
          <NavItem icon={HelpCircle} label={viewMode === "expanded" ? "FAQ Engenharia" : ""} active={activeTab === "faq"} onClick={() => handleTabChange("faq")} tourId="faq" />
          <NavItem icon={CircuitBoard} label={viewMode === "expanded" ? "Circuito" : ""} active={activeTab === "circuito"} onClick={() => handleTabChange("circuito")} tourId="circuito" />
          <NavItem icon={Sparkles} label={viewMode === "expanded" ? "Aprender IA" : ""} active={activeTab === "aprender_ia"} onClick={() => handleTabChange("aprender_ia")} tourId="aprender_ia" />
          <NavItem icon={MessageSquare} label={viewMode === "expanded" ? "Comunidade" : ""} active={activeTab === "comunidade"} onClick={() => handleTabChange("comunidade")} tourId="comunidade" />
          <NavItem icon={Gamepad2} label={viewMode === "expanded" ? "Games" : ""} active={activeTab === "games"} onClick={() => handleTabChange("games")} tourId="games" />
          <NavItem icon={Trophy} label={viewMode === "expanded" ? "Recompensas" : ""} active={activeTab === "recompensas"} onClick={() => handleTabChange("recompensas")} tourId="recompensas" />
          <div className="pt-4 border-t border-white/5 space-y-2">
            <NavItem icon={Info} label={viewMode === "expanded" ? "Sobre o V12" : ""} active={activeTab === "sobre"} onClick={() => handleTabChange("sobre")} tourId="sobre" />
            <NavItem icon={Settings} label={viewMode === "expanded" ? "Configurações" : ""} active={activeTab === "configuracoes"} onClick={() => handleTabChange("configuracoes")} tourId="configuracoes" />
          </div>
        </nav>

        {/* CoinWidget — saldo de DevCoins */}
        {user && viewMode === "expanded" && (
          <div className="px-4 pb-2">
            <CoinWidget onClickPending={() => setActiveTab("recompensas")} />
          </div>
        )}

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
                onClick={() => setShowShare(true)}
                className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-cyan-400 transition-all text-xs font-black py-2 rounded-2xl hover:bg-cyan-500/5 group mb-1"
              >
                <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> {viewMode === "expanded" && "COMPARTILHAR SITE"}
              </button>
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
        {/* Header — Responsivo */}
        <header className="px-4 md:px-10 py-3 md:py-6 flex items-center justify-between border-b border-white/5 bg-neutral-950/40 backdrop-blur-2xl z-40 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] shrink-0 hidden sm:block" />
                <h2 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tighter uppercase truncate">{activeTab}</h2>
              </div>
              <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest hidden sm:block pl-4">Sistema v12.4.0 // Núcleo Ativo</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Modo expandido/compacto — hidden no mobile */}
            <div className="hidden md:flex bg-neutral-900 border border-white/5 rounded-2xl p-1 overflow-hidden">
              <button
                onClick={() => setViewMode("expanded")}
                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === "expanded" ? "bg-cyan-500 text-neutral-950 shadow-lg" : "text-neutral-500 hover:text-white"}`}
              >AMPLIADO</button>
              <button
                onClick={() => setViewMode("compact")}
                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === "compact" ? "bg-cyan-500 text-neutral-950 shadow-lg" : "text-neutral-500 hover:text-white"}`}
              >COMPACTO</button>
            </div>

            {/* Login — compacto no mobile */}
            {!user && (
              <button
                onClick={onAuthRequired}
                className="flex items-center gap-2 bg-cyan-500 text-neutral-950 px-3 md:pl-4 md:pr-1.5 py-2 md:py-1.5 rounded-xl font-black text-[9px] md:text-[10px] tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <span className="hidden sm:inline">ENTRAR</span>
                <UserCircle className="w-4 h-4 sm:hidden" />
                <div className="hidden md:flex w-8 h-8 bg-neutral-950/20 rounded-lg items-center justify-center">
                  <UserCircle className="w-4 h-4" />
                </div>
              </button>
            )}

            {/* Filtros de categoria — scroll horizontal no mobile */}
            {(activeTab === "placas" || activeTab === "componentes" || activeTab === "hardware_pc") && (
              <div className="flex bg-neutral-900 border border-white/5 rounded-2xl p-1 overflow-x-auto max-w-[180px] sm:max-w-none scrollbar-none" style={{ scrollbarWidth: "none" }}>
                {(activeTab === "placas"
                  ? ["todos", "básica", "especial", "avançado"]
                  : activeTab === "componentes"
                  ? ["todos", "normal", "avançado"]
                  : ["todos", "pc master"]
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSubTab(cat)}
                    className={`px-3 md:px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                      subTab === cat ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >{cat}</button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* View Port */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 viewport-scroll">
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
              className={`min-h-full ${activeTab === "placas" || activeTab === "componentes" || activeTab === "hardware_pc" ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-8" : "block"}`}
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
                      isMarked={getEntry(item.id).marked}
                      onMark={() => toggleMark(item.id)}
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
              {activeTab === "notas" && <NotebookView content={notes} setContent={(c: string) => { setNotes(c); syncNotes(c); }} lastSync={lastNoteSync} onSave={() => saveNotesToServer(notes)} />}
              {activeTab === "code" && <CodeSnippets activeTab={activeTab} setActiveTab={setActiveTab} />}
              {activeTab === "projetos" && (
                <ProjectsView
                  onGoToCircuit={(board, comps, code, title) => {
                    // Inclui a placa do projeto para gerar as conexões automáticas
                    setCircuitPreload({ board, components: comps, code, projectTitle: title });
                    setActiveTab("circuito");
                  }}
                />
              )}
              {activeTab === "provas" && (
                <ProvasView 
                  progress={testProgress} 
                  onComplete={updateProgress} 
                />
              )}
              {activeTab === "faq" && <FAQView />}

              {activeTab === "circuito" && (
                <div className="w-full h-full min-h-[700px]">
                  <CircuitView preload={circuitPreload} onClearPreload={() => setCircuitPreload(null)} />
                </div>
              )}

              {activeTab === "aprender_ia" && <IALearnView />}
              {activeTab === "comunidade" && <CommunityView user={user} />}
              {activeTab === "games" && <GamesHub user={user} />}
              {activeTab === "recompensas" && <RewardsView user={user} />}
              {activeTab === "sobre" && <SobreView />}
              {activeTab === "configuracoes" && user && (
                <ConfigView
                  theme={theme}
                  setTheme={setTheme}
                  colorThemeId={colorThemeId}
                  setColorThemeId={setColorThemeId}
                  fontThemeId={fontThemeId}
                  setFontThemeId={setFontThemeId}
                  profile={profile}
                  setProfile={setProfile}
                  user={user}
                  showToast={showToast}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  collection={collection}
                  allItems={[...DATA_PLACAS, ...DATA_COMPONENTES, ...DATA_PC_HARDWARE]}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Action Button — sobe acima do bottom nav no mobile */}
        {basket.length > 0 && activeTab !== "workspace" && (
          <motion.button
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            onClick={() => handleTabChange("workspace")}
            className="absolute bottom-24 md:bottom-10 right-4 md:right-10 bg-cyan-500 text-neutral-950 px-5 md:px-8 py-3 md:py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(6,182,212,0.3)] font-black text-xs tracking-widest flex items-center gap-3 md:gap-4 group z-[100] hover:scale-105 active:scale-95 transition-all"
          >
            <Box className="w-4 md:w-5 h-4 md:h-5 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">ABRIR LABORATÓRIO</span>
            <span className="sm:hidden">LAB</span>
            <div className="bg-neutral-950 text-cyan-400 w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center text-[10px]">
              {basket.length + (selectedPlaca ? 1 : 0)}
            </div>
          </motion.button>
        )}

        {/* ── Bottom Navigation Bar — mobile only ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/95 backdrop-blur-2xl border-t border-white/10 flex items-center safe-area-pb">
          {[
            { tab: "placas" as Tab, icon: Cpu, label: "Placas" },
            { tab: "componentes" as Tab, icon: Layers, label: "Comp." },
            { tab: "workspace" as Tab, icon: Layout, label: "Lab", badge: basket.length + (selectedPlaca ? 1 : 0) },
            { tab: "ia" as Tab, icon: MessageSquare, label: "IA" },
            { tab: "configuracoes" as Tab, icon: Settings, label: "Config" },
          ].map(({ tab, icon: Icon, label, badge }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-all ${
                  isActive ? "text-cyan-400" : "text-neutral-600 hover:text-neutral-400"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-500 text-neutral-950 rounded-full text-[8px] font-black flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-wide">{label}</span>
                {isActive && (
                  <motion.div layoutId="bottomNavIndicator" className="absolute top-0 inset-x-3 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </main>

      {/* ── Modal de Compartilhar ── */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
            onClick={() => setShowShare(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-neutral-900 border border-white/10 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="text-5xl">🚀</div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tight">Compartilhar</h3>
                <p className="text-neutral-500 text-sm font-medium">
                  Convide amigos para o DevGenius — a plataforma de hardware e eletrônica do futuro.
                </p>
              </div>

              {/* URL do site */}
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 pl-1">Link do site</p>
                <div className="flex items-center gap-2 bg-neutral-950 border border-white/10 rounded-2xl p-4">
                  <Link className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                  <span className="flex-1 text-sm font-mono text-neutral-400 truncate">
                    {window.location.origin}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin);
                      showToast("🔗 Link copiado!");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-neutral-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                  >
                    <Copy className="w-3 h-3" /> Copiar
                  </button>
                </div>
              </div>

              {/* Botões de share */}
              <div className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🚀 Descubra o DevGenius — plataforma de hardware, eletrônica e IA!\n\n${window.location.origin}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-all group"
                >
                  <span className="text-2xl">💬</span>
                  <div>
                    <p className="font-black text-sm text-emerald-400">WhatsApp</p>
                    <p className="text-[9px] text-neutral-600 uppercase font-bold">Enviar mensagem</p>
                  </div>
                </a>

                {/* Twitter/X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚀 Descobri o DevGenius — a melhor plataforma de hardware e eletrônica!\n\nValeu demais para aprender Arduino, ESP32, sensores e muito mais.\n\n${window.location.origin}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/15 transition-all group"
                >
                  <span className="text-2xl">🐦</span>
                  <div>
                    <p className="font-black text-sm text-blue-400">Twitter / X</p>
                    <p className="text-[9px] text-neutral-600 uppercase font-bold">Publicar tweet</p>
                  </div>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent("🚀 DevGenius — plataforma de hardware, eletrônica e IA. Vale muito a pena!")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-500/15 transition-all group"
                >
                  <span className="text-2xl">✈️</span>
                  <div>
                    <p className="font-black text-sm text-cyan-400">Telegram</p>
                    <p className="text-[9px] text-neutral-600 uppercase font-bold">Enviar no Telegram</p>
                  </div>
                </a>

                {/* Nativo (Web Share API) */}
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      await navigator.share({ title: "DevGenius V12", text: "🚀 Plataforma de hardware, eletrônica e IA!", url: window.location.origin });
                    } else {
                      navigator.clipboard.writeText(window.location.origin);
                      showToast("🔗 Link copiado!");
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/15 transition-all group"
                >
                  <span className="text-2xl">📤</span>
                  <div className="text-left">
                    <p className="font-black text-sm text-amber-400">Mais opções</p>
                    <p className="text-[9px] text-neutral-600 uppercase font-bold">Compartilhar via...</p>
                  </div>
                </button>
              </div>

              <button onClick={() => setShowShare(false)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-white transition-all">
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Detail Modal — full-screen no mobile */}
      <AnimatePresence>
        {modalItem && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-8 p-0 bg-black/90 backdrop-blur-md" onClick={() => setModalItem(null)}>
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/10 rounded-t-[2rem] sm:rounded-[3rem] max-w-4xl w-full relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] max-h-[92dvh] sm:max-h-[85vh]"
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

                    {/* ── Projetos Guiados ── */}
                    <ModalProjectsSection
                      item={modalItem}
                      entry={getEntry(modalItem.id)}
                      isMarked={getEntry(modalItem.id).marked}
                      onToggleMark={() => toggleMark(modalItem.id)}
                      onToggleProject={(idx) => toggleProject(modalItem.id, idx)}
                      onGoToCircuit={(comps, projCode, projTitle) => {
                        setModalItem(null);
                        setCircuitPreload({ board: null, components: comps, code: projCode, projectTitle: projTitle });
                        setActiveTab("circuito");
                      }}
                      currentItem={modalItem}
                    />

                    <div className="mt-8 flex gap-4">
                       <button
                         onClick={() => { handleTabChange("provas"); setModalItem(null); }}
                         className="flex-1 bg-neutral-800 text-white h-16 rounded-2xl font-black tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all hover:bg-neutral-700"
                       >
                          <GraduationCap className="w-4 h-4" /> TESTAR CONHECIMENTO
                       </button>
                       <button
                         onClick={() => {
                           if (!user) { onAuthRequired(); return; }
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

      {/* ── Tour Overlay ── */}
      <AnimatePresence>
        {tourActive && (
          <TourOverlay
            onEnd={onEndTour ?? (() => {})}
            onTabChange={(tab) => setActiveTab(tab as Tab)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tour Overlay Component ──────────────────────────────────────────────────

interface TourStep {
  id: number;
  title: string;
  emoji: string;
  text: string;
  tourId: string | null;  // data-tour attribute do elemento alvo
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 0, emoji: "🎉", tourId: null,
    title: "Bem-vindo ao DEVGENIUS!",
    text: "O DEVGENIUS é a plataforma completa para aprender e prototipar em hardware embarcado. Aqui você domina Arduino, ESP32, sensores, eletrônica, IA e muito mais — tudo em português e num só lugar. Vamos te mostrar cada seção!",
  },
  {
    id: 1, emoji: "⚡", tourId: "placas",
    title: "Controladoras",
    text: "Catálogo completo de microcontroladores com fichas técnicas detalhadas. Arduino Uno, Mega, ESP32, Raspberry Pi Pico, Teensy 4.1 e mais. Veja specs, voltagem, pinagem, código base e adicione ao Laboratório.",
  },
  {
    id: 2, emoji: "🔧", tourId: "componentes",
    title: "Componentes",
    text: "Sensores, atuadores e módulos com fichas técnicas completas. DHT22, HC-SR04, MPU6050, servos, relés, displays OLED, LCD e muito mais. Cada item tem descrição técnica, forma de uso e 10 projetos guiados.",
  },
  {
    id: 3, emoji: "🖥️", tourId: "hardware_pc",
    title: "Hardware PC",
    text: "Catálogo de componentes de computadores — GPUs, CPUs, placas-mãe e periféricos documentados. Perfeito para entender a ponte entre hardware de PC e sistemas embarcados.",
  },
  {
    id: 4, emoji: "🔬", tourId: "workspace",
    title: "Laboratório IA",
    text: "Seu ambiente de prototipagem virtual! Selecione uma placa CORE e até 5 componentes. A IA Gemini Pro gera automaticamente o esquemático completo com código, diagrama de conexões e guia de montagem.",
  },
  {
    id: 5, emoji: "📦", tourId: "projetos",
    title: "Projetos Prontos",
    text: "Projetos completos prontos para montar! Cada componente tem 10 projetos com código completo sem cortes, diagrama de conexões e guia passo a passo. Organizados por número de componentes e dificuldade.",
  },
  {
    id: 6, emoji: "🤖", tourId: "ia",
    title: "DevGenius IA",
    text: "Seu assistente técnico pessoal! 150 perguntas e respostas técnicas embutidas sobre Arduino, ESP32, sensores, eletrônica e IoT — funciona mesmo offline. Use o modo GUIADO com 12 categorias ou o modo LIVRE para qualquer dúvida.",
  },
  {
    id: 7, emoji: "📝", tourId: "notas",
    title: "Bloco de Notas",
    text: "Seu caderno digital pessoal sincronizado com a nuvem DevGenius. Anote insights de engenharia, snippets de código e ideias de projetos. Acesse de qualquer dispositivo após fazer login.",
  },
  {
    id: 8, emoji: "💻", tourId: "code",
    title: "Base de Código",
    text: "Módulos teóricos completos para aprender na prática. C++ para Hardware, JavaScript IoT e Python — cada linguagem tem 3 aulas com mais de 1000 linhas de conteúdo educacional aprofundado sobre firmware, IoT e IA embarcada.",
  },
  {
    id: 9, emoji: "🎓", tourId: "provas",
    title: "Provas & Testes",
    text: "Teste seus conhecimentos com questões reais! 3 módulos progressivos: Básico, Intermediário e Pro. São 270 questões no total. Cada resposta exibe a explicação educacional completa para você aprender com os erros.",
  },
  {
    id: 10, emoji: "❓", tourId: "faq",
    title: "FAQ Engenharia",
    text: "Manual técnico de referência completo. Pesquise qualquer componente ou placa e veja: descrição técnica detalhada, resumo de hardware, forma de uso e diretrizes de implementação com exemplos de código.",
  },
  {
    id: 11, emoji: "ℹ️", tourId: "sobre",
    title: "Sobre o V12",
    text: "Conheça a história do DEVGENIUS, o ecossistema por trás da plataforma e a filosofia de unir IA, design e engenharia de hardware em uma experiência única de aprendizado. Versão 12.4.0 — Codename: ANTIGRAVITY.",
  },
  {
    id: 12, emoji: "⚙️", tourId: "configuracoes",
    title: "Configurações",
    text: "Personalize tudo: foto de perfil, temas visuais (Kernel, Matrix, Vapor), modo de visualização (Ampliado/Compacto), idioma (PT/EN) e segurança da conta. Veja também seu histórico de coleção e progresso nos projetos.",
  },
  {
    id: 13, emoji: "🚀", tourId: null,
    title: "Você está pronto!",
    text: "Parabéns! Você conheceu todas as 12 seções do DEVGENIUS V12. Crie sua conta gratuita para desbloquear o Laboratório IA, Provas, Bloco de Notas e muito mais. Ou explore as seções públicas como visitante. Bem-vindo à engenharia do futuro!",
  },
];

function TourOverlay({ onEnd, onTabChange }: { onEnd: () => void; onTabChange: (tab: string) => void }) {
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === TOUR_STEPS.length - 1;
  const total   = TOUR_STEPS.length;

  // Tour sem identificadores de aba — apenas balões centralizados na tela
  // (spotlightRect sempre null — sem retângulos, sem destaques, sem mudança de aba)
  useEffect(() => {
    setSpotlightRect(null);
    // Garante a aba inicial visível durante todo o tour
    onTabChange("placas");
  }, [step]);

  const goNext = () => { if (!isLast) setStep(s => s + 1); else onEnd(); };
  const goPrev = () => { if (!isFirst) setStep(s => s - 1); };

  // Altura estimada do balão para cálculo de posição (px)
  const BALLOON_H = 420;
  const BALLOON_W_SIDE = 480;
  const BALLOON_W_CENTER = 560;

  // Posição do balão sempre dentro da tela visível
  const tooltipStyle: React.CSSProperties = spotlightRect
    ? {
        position: "fixed",
        left: Math.min(
          window.innerWidth - BALLOON_W_SIDE - 16,
          300
        ),
        top: Math.max(
          16,
          Math.min(
            window.innerHeight - BALLOON_H - 16,
            spotlightRect.top + spotlightRect.height / 2 - BALLOON_H / 2
          )
        ),
        width: BALLOON_W_SIDE,
        zIndex: 1002,
      }
    : {
        position: "fixed",
        left: Math.max(16, (window.innerWidth - BALLOON_W_CENTER) / 2),
        top: Math.max(16, (window.innerHeight - BALLOON_H) / 2),
        width: Math.min(BALLOON_W_CENTER, window.innerWidth - 32),
        zIndex: 1002,
      };

  // Sem retângulo de destaque — apenas o balão flutua sobre o overlay

  return (
    <>
      {/* Overlay escuro cobrindo toda a tela */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] pointer-events-all"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onEnd(); }}
      />

      {/* Sem retângulo de destaque — overlay escuro + balão são suficientes */}

      {/* Tooltip balão */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: spotlightRect ? -20 : 0, y: spotlightRect ? 0 : 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={tooltipStyle}
        className="pointer-events-all"
      >
        <div className="bg-neutral-900 border border-cyan-500/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(6,182,212,0.1)] overflow-hidden">
          {/* Linha decorativa topo */}
          <div className="h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

          <div className="p-8 space-y-5">
            {/* Passo + emoji + título */}
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner">
                {current.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">
                    Passo {step + 1} de {total}
                  </span>
                  {!isFirst && !isLast && (
                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest px-2 py-0.5 bg-neutral-800 rounded">
                      {current.tourId?.toUpperCase().replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{current.title}</h3>
              </div>
            </div>

            {/* Texto explicativo — maior e mais legível */}
            <p className="text-base text-neutral-300 leading-relaxed font-medium">{current.text}</p>

            {/* Barra de progresso */}
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / total) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
              />
            </div>

            {/* Bolinhas de progresso */}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`transition-all rounded-full ${
                    i === step
                      ? "w-5 h-2 bg-cyan-500"
                      : i < step
                      ? "w-2 h-2 bg-cyan-700"
                      : "w-2 h-2 bg-neutral-700 hover:bg-neutral-600"
                  }`}
                />
              ))}
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onEnd}
                className="text-xs font-black text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors"
              >
                Pular tour
              </button>

              <div className="flex gap-3">
                {!isFirst && (
                  <button
                    onClick={goPrev}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    ← Anterior
                  </button>
                )}
                <button
                  onClick={goNext}
                  className="px-8 py-3 bg-cyan-500 text-neutral-950 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  {isLast ? "🚀 Começar!" : "Próximo →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Aprender IA ─────────────────────────────────────────────────────────────
// ─── Games Hub ───────────────────────────────────────────────────────────────
function GamesHub({ user }: { user: any }) {
  const [activeGame, setActiveGame]     = useState<"flappy" | "dino">("flappy");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitora mudanças no estado de fullscreen (ESC do navegador, etc.)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      try { await containerRef.current?.requestFullscreen(); }
      catch { /* sem suporte */ }
    } else {
      try { await document.exitFullscreen(); }
      catch { /* já fora */ }
    }
  };

  // Esc também minimiza
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`relative transition-all duration-300 ${
        isFullscreen
          ? "bg-neutral-950 p-6 overflow-y-auto"
          : ""
      }`}
      style={isFullscreen ? { minHeight: "100vh" } : {}}
    >
      {/* Seletor de jogo + botão fullscreen */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="flex bg-neutral-900 border border-white/5 p-1.5 rounded-[2rem] gap-2">
          <button
            onClick={() => setActiveGame("flappy")}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeGame === "flappy"
                ? "bg-cyan-500 text-neutral-950 shadow-xl shadow-cyan-500/20 scale-105"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            🐦 Flappy Code
          </button>
          <button
            onClick={() => setActiveGame("dino")}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeGame === "dino"
                ? "bg-emerald-500 text-neutral-950 shadow-xl shadow-emerald-500/20 scale-105"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            🦕 Dino Code
          </button>
        </div>

        {/* Botão Maximizar / Minimizar */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Minimizar (Esc)" : "Maximizar tela"}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
            isFullscreen
              ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:scale-105"
              : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-cyan-500/40 hover:text-cyan-400 hover:scale-105"
          }`}
        >
          {isFullscreen
            ? <><Minimize2 className="w-4 h-4" /> Minimizar</>
            : <><Maximize2 className="w-4 h-4" /> Maximizar</>
          }
        </button>
      </div>

      {/* Jogo ativo */}
      {activeGame === "flappy" && <FlappyCode user={user} />}
      {activeGame === "dino"   && <DinoRunner user={user} />}
    </div>
  );
}

function IALearnView() {
  const { claimEvent, username } = useRewards();
  const progressKey = username ? `ia_progress_${username}` : null;
  const [activeModule, setActiveModule] = useState(0);
  const [progress, setProgress] = useState<Set<number>>(() => {
    if (!progressKey) return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(progressKey) || "[]")); } catch { return new Set(); }
  });

  const mod = IA_LEARN_MODULES[activeModule];
  const paragraphs = mod.content.split('\n').filter(p => p.trim().length > 0);

  const colorMap: Record<string, string> = {
    cyan:    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/50",
    amber:   "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50",
    purple:  "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50",
  };
  const activeColor: Record<string, string> = {
    cyan:    "bg-cyan-500 text-neutral-950 border-cyan-500",
    amber:   "bg-amber-500 text-neutral-950 border-amber-500",
    purple:  "bg-purple-500 text-neutral-950 border-purple-500",
    emerald: "bg-emerald-500 text-neutral-950 border-emerald-500",
  };
  const glowColor: Record<string, string> = {
    cyan:    "shadow-cyan-500/20",
    amber:   "shadow-amber-500/20",
    purple:  "shadow-purple-500/20",
    emerald: "shadow-emerald-500/20",
  };
  const borderColor: Record<string, string> = {
    cyan:    "border-cyan-500/30",
    amber:   "border-amber-500/30",
    purple:  "border-purple-500/30",
    emerald: "border-emerald-500/30",
  };

  const markDone = (idx: number) => {
    setProgress(prev => {
      const s = new Set(prev);
      const wasNew = !s.has(idx);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      const next = new Set(s);
      if (progressKey) localStorage.setItem(progressKey, JSON.stringify([...next]));
      // Dispara claim FORA do setState via microtask para não causar re-render duplo
      if (wasNew) Promise.resolve().then(() => claimEvent(`ia_module_complete:${idx}`, 30));
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black tracking-tighter uppercase">
          APRENDER <span className="text-cyan-400">IA</span>
        </h2>
        <p className="text-neutral-500 font-medium max-w-2xl mx-auto">
          4 módulos completos sobre Inteligência Artificial — do zero ao Edge AI.
          1250+ versos de conteúdo teórico por módulo.
        </p>
        {/* Progresso geral */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-neutral-600 uppercase tracking-widest">
          {progress.size} de 4 módulos concluídos
        </div>
      </div>

      {/* Seletor de módulos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {IA_LEARN_MODULES.map((m, i) => {
          const isActive = activeModule === i;
          const isDone = progress.has(i);
          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(i)}
              className={`p-5 rounded-[2rem] border transition-all text-left space-y-3 relative overflow-hidden ${
                isActive
                  ? `${activeColor[m.color]} shadow-xl ${glowColor[m.color]}`
                  : isDone
                  ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                  : `${colorMap[m.color]} border`
              }`}
            >
              <div className="text-3xl">{m.emoji}</div>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isActive ? "opacity-70" : "opacity-50"}`}>
                  Módulo {i + 1}
                </p>
                <p className={`text-sm font-black leading-tight ${isActive ? "text-neutral-950" : isDone ? "text-emerald-400" : ""}`}>
                  {m.title}
                </p>
              </div>
              {isDone && !isActive && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <p className={`text-[9px] font-medium ${isActive ? "text-neutral-800" : "text-neutral-500"}`}>
                {paragraphs.length}+ versos
              </p>
            </button>
          );
        })}
      </div>

      {/* Conteúdo do módulo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={`bg-neutral-900/40 border ${borderColor[mod.color]} rounded-[3rem] overflow-hidden shadow-2xl`}
        >
          {/* Header do módulo */}
          <div className={`px-10 py-8 bg-neutral-950/60 border-b ${borderColor[mod.color]} flex items-center justify-between gap-6`}>
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${colorMap[mod.color]} border`}>
                {mod.emoji}
              </div>
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Módulo {activeModule + 1} de 4</p>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{mod.title}</h3>
                <p className="text-neutral-500 text-sm font-medium">{mod.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
                {paragraphs.length} versos
              </span>
              <button
                onClick={() => markDone(activeModule)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  progress.has(activeModule)
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                    : `${colorMap[mod.color]} border hover:scale-105`
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {progress.has(activeModule) ? "Concluído ✓" : "Marcar Concluído"}
              </button>
            </div>
          </div>

          {/* Texto do módulo */}
          <div className="p-10 overflow-y-auto max-h-[60vh] scrollbar-visible">
            <div className="max-w-4xl mx-auto space-y-4 text-[15px] text-neutral-300 leading-[1.85] font-medium text-justify">
              {paragraphs.map((para, i) => (
                <p key={i} className={`${
                  para.startsWith('A ') || para.startsWith('O ') || para.startsWith('Um ') || para.startsWith('Uma ')
                    ? ""
                    : para.length < 100
                    ? "font-semibold text-neutral-200"
                    : ""
                }`}>
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Footer de navegação */}
          <div className="px-10 py-6 bg-neutral-950/40 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => setActiveModule(i => Math.max(0, i - 1))}
              disabled={activeModule === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              ← Módulo Anterior
            </button>

            <div className="flex gap-2">
              {IA_LEARN_MODULES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveModule(i)}
                  className={`transition-all rounded-full ${
                    i === activeModule ? "w-6 h-2.5 bg-cyan-500" :
                    progress.has(i) ? "w-2.5 h-2.5 bg-emerald-500" :
                    "w-2.5 h-2.5 bg-neutral-700 hover:bg-neutral-500"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                markDone(activeModule);
                if (activeModule < IA_LEARN_MODULES.length - 1) setActiveModule(i => i + 1);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeModule === IA_LEARN_MODULES.length - 1
                  ? "bg-emerald-500 text-neutral-950 hover:scale-105 shadow-lg shadow-emerald-500/20"
                  : `${activeColor[mod.color]} hover:scale-105 shadow-lg ${glowColor[mod.color]}`
              }`}
            >
              {activeModule === IA_LEARN_MODULES.length - 1 ? "🎓 Concluir Curso!" : "Próximo Módulo →"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Todos concluídos */}
      {progress.size === 4 && (
        <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
          className="text-center p-12 bg-emerald-500/5 border border-emerald-500/20 rounded-[3rem] space-y-4">
          <div className="text-6xl">🎓</div>
          <h3 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">Curso de IA Concluído!</h3>
          <p className="text-neutral-500 font-medium max-w-lg mx-auto">
            Você completou os 4 módulos de Inteligência Artificial do DevGenius.
            Agora pratique com a IA do DevGenius, experimente projetos no Circuito e teste seus conhecimentos nas Provas.
          </p>
        </motion.div>
      )}
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

function ConfigView({ theme, setTheme, colorThemeId, setColorThemeId, fontThemeId, setFontThemeId, profile, setProfile, user, showToast, viewMode, setViewMode, collection, allItems }: any) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [tempPhoto, setTempPhoto] = useState(profile.photo);
  const [showPass, setShowPass] = useState(false);
  const [configSection, setConfigSection] = useState<"perfil" | "codigos">("perfil");

  // Códigos
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoMsg, setCodigoMsg]     = useState<{ text: string; ok: boolean } | null>(null);
  const [codigoUsed, setCodigoUsed]   = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`codigos_usados_${user.username}`) || "[]"); } catch { return []; }
  });
  const [adminData, setAdminData]     = useState<any[] | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const { claimEvent, purchasedItems } = useRewards();

  const TITLES: Record<string, string> = {
    title_elite:     "[ELITE]",
    title_arquiteto: "[ARQUITETO]",
  };
  const ownedTitles = Object.keys(TITLES).filter(k => purchasedItems.includes(k));
  const [activeTitle, setActiveTitleState] = useState<string>(() =>
    localStorage.getItem(`active_title_${user.username}`) || ""
  );
  const applyTitle = (titleId: string) => {
    setActiveTitleState(titleId);
    localStorage.setItem(`active_title_${user.username}`, titleId);
  };

  const SECRET_CODES: Record<string, { coins: number; label: string; unlimited?: boolean; admin?: boolean }> = {
    "DEVGENIUS.DAVI.@.COM.ygde0yudgsydgeygydge7ge7g": { coins: 1000000, label: "Código Fundador" },
    "dede.adm.123.321": { coins: 0, label: "Painel Admin", unlimited: true, admin: true },
  };

  const handleRedeemCode = async () => {
    const codeRaw = codigoInput.trim();
    const matchKey = Object.keys(SECRET_CODES).find(k => k.toLowerCase() === codeRaw.toLowerCase());
    if (!matchKey) {
      setCodigoMsg({ text: "❌ Código inválido. Verifique e tente novamente.", ok: false });
      setTimeout(() => setCodigoMsg(null), 3000);
      return;
    }
    const def = SECRET_CODES[matchKey];

    // ── Código Admin: abre painel de usuários ──────────────────────────────
    if (def.admin) {
      try {
        const res  = await fetch(`/api/admin/users?code=${encodeURIComponent(codeRaw)}`);
        const data = await res.json();
        if (data.ok) {
          setAdminData(data.users);
          setCodigoInput("");
          setCodigoMsg({ text: `🛡️ Acesso Admin concedido — ${data.total} usuário(s) cadastrado(s).`, ok: true });
          setTimeout(() => setCodigoMsg(null), 4000);
        } else {
          setCodigoMsg({ text: data.error || "Erro ao acessar painel.", ok: false });
          setTimeout(() => setCodigoMsg(null), 3000);
        }
      } catch {
        setCodigoMsg({ text: "Erro de conexão.", ok: false });
        setTimeout(() => setCodigoMsg(null), 3000);
      }
      return;
    }

    // ── Código de uso único: verifica se já foi usado ──────────────────────
    if (!def.unlimited && codigoUsed.includes(matchKey)) {
      setCodigoMsg({ text: "⚠️ Este código já foi resgatado por você.", ok: false });
      setTimeout(() => setCodigoMsg(null), 3000);
      return;
    }

    const { coins, label } = def;
    try {
      await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username, eventKey: `codigo_especial:${matchKey.slice(0,20)}`, coins: Math.min(coins, 100) }),
      });
      const addRes = await fetch("/api/rewards/add-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username, coins, reason: label }),
      });
      const addData = await addRes.json();
      if (addData.ok) {
        if (!def.unlimited) {
          const used = [...codigoUsed, matchKey];
          setCodigoUsed(used);
          localStorage.setItem(`codigos_usados_${user.username}`, JSON.stringify(used));
        }
        setCodigoInput("");
        setCodigoMsg({ text: `🎉 ${label} ativado! +${coins.toLocaleString()} DevCoins adicionados!`, ok: true });
        setTimeout(() => setCodigoMsg(null), 6000);
      } else {
        setCodigoMsg({ text: addData.error || "Erro ao processar código.", ok: false });
        setTimeout(() => setCodigoMsg(null), 3000);
      }
    } catch {
      setCodigoMsg({ text: "Erro de conexão. Tente novamente.", ok: false });
      setTimeout(() => setCodigoMsg(null), 3000);
    }
  };

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
    <div className="max-w-6xl mx-auto space-y-12 pb-40">

      {/* ── Tabs internas de Configurações ── */}
      <div className="flex gap-2 bg-neutral-900 border border-white/5 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setConfigSection("perfil")}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            configSection === "perfil" ? "bg-cyan-500 text-neutral-950 shadow-lg" : "text-neutral-500 hover:text-white"
          }`}
        >
          ⚙️ Perfil & Conta
        </button>
        <button
          onClick={() => setConfigSection("codigos")}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            configSection === "codigos" ? "bg-amber-500 text-neutral-950 shadow-lg" : "text-neutral-500 hover:text-white"
          }`}
        >
          🎟️ Códigos
        </button>
      </div>

      {/* ── Painel de Códigos ── */}
      {configSection === "codigos" && (
        <div className="space-y-6">
          {/* Input do código */}
          <div className="max-w-xl p-8 bg-amber-500/5 border border-amber-500/20 rounded-[3rem] space-y-6">
            <div className="text-center space-y-2">
              <div className="text-5xl">🎟️</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Resgatar Código</h3>
              <p className="text-neutral-500 text-sm font-medium">Insira um código especial para ganhar DevCoins ou desbloquear recursos exclusivos.</p>
            </div>
            <div className="space-y-3">
              <input type="text" value={codigoInput} onChange={e => setCodigoInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleRedeemCode(); }}
                placeholder="INSIRA O CÓDIGO AQUI..."
                className="w-full bg-neutral-950 border border-white/10 rounded-2xl p-4 text-sm font-mono font-bold text-white focus:border-amber-500/50 outline-none placeholder:text-neutral-700 tracking-widest"
              />
              <button onClick={handleRedeemCode} disabled={!codigoInput.trim()}
                className="w-full h-14 bg-amber-500 text-neutral-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                ATIVAR CÓDIGO
              </button>
            </div>
            {codigoMsg && (
              <div className={`p-4 rounded-2xl text-sm font-black text-center border ${codigoMsg.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {codigoMsg.text}
              </div>
            )}
            {codigoUsed.length > 0 && (
              <div className="pt-4 border-t border-white/5 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Códigos já resgatados</p>
                {codigoUsed.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                    <span className="text-emerald-500">✓</span>
                    <span className="truncate">{c.slice(0, 30)}...</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Painel Admin */}
          {adminData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400">🛡️ Painel Administrativo</p>
                  <p className="text-neutral-600 text-[9px] mt-0.5">{adminData.length} usuário(s) cadastrado(s)</p>
                </div>
                <div className="flex gap-2">
                  <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)}
                    placeholder="Buscar usuário..."
                    className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500/40 text-white placeholder:text-neutral-700"
                  />
                  <button onClick={() => { setAdminData(null); setAdminSearch(""); }}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-neutral-500 hover:text-white transition-all">
                    ✕ Fechar
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-red-500/20">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-red-500/10 border-b border-red-500/20">
                      {["#","Usuário","Nome","E-mail","Moedas","Streak","Nível","XP","Rank","Foco","Gênero","Títulos","Conquistas"].map(h => (
                        <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-red-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminData
                      .filter((u: any) => !adminSearch ||
                        u.username.toLowerCase().includes(adminSearch.toLowerCase()) ||
                        u.firstName.toLowerCase().includes(adminSearch.toLowerCase()) ||
                        (u.email || "").toLowerCase().includes(adminSearch.toLowerCase())
                      )
                      .map((u: any, i: number) => (
                        <tr key={u.username} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="px-4 py-3 text-[10px] text-neutral-600 font-black">{i + 1}</td>
                          <td className="px-4 py-3 text-[10px] font-black text-white font-mono whitespace-nowrap">@{u.username}</td>
                          <td className="px-4 py-3 text-[10px] text-neutral-300 whitespace-nowrap">{u.firstName} {u.lastName}</td>
                          <td className="px-4 py-3 text-[10px] text-neutral-400 whitespace-nowrap">{u.email || "—"}</td>
                          <td className="px-4 py-3 text-[10px] font-black text-amber-400 whitespace-nowrap">{(u.coins || 0).toLocaleString()} 🪙</td>
                          <td className="px-4 py-3 text-[10px] text-emerald-400 whitespace-nowrap">{u.loginStreak?.count || 0} dias</td>
                          <td className="px-4 py-3 whitespace-nowrap"><LevelChip level={u.levelInfo?.level || 1} title={u.levelInfo?.title || "Iniciante"} /></td>
                          <td className="px-4 py-3 text-[10px] text-purple-400 whitespace-nowrap">{(u.xp || 0).toLocaleString()} XP</td>
                          <td className="px-4 py-3 text-[10px] text-cyan-400 whitespace-nowrap">{u.expLevel || "—"}</td>
                          <td className="px-4 py-3 text-[10px] text-neutral-400">{u.focus || "—"}</td>
                          <td className="px-4 py-3 text-[10px] text-neutral-500">{u.gender || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.titles && u.titles.length > 0
                              ? u.titles.map((t: string, ti: number) => (
                                  <span key={ti} className="inline-block px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[8px] font-black text-amber-400 mr-1">{t}</span>
                                ))
                              : <span className="text-[10px] text-neutral-700">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {u.conquistas && u.conquistas.length > 0
                              ? <div className="flex flex-wrap gap-1 min-w-[120px]">
                                  {u.conquistas.map((c: string, ci: number) => (
                                    <span key={ci} className="inline-block px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[8px] font-black text-purple-400">{c.replace(/_/g," ")}</span>
                                  ))}
                                </div>
                              : <span className="text-[10px] text-neutral-700">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {configSection === "perfil" && (<><div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-4 space-y-8">
        <div className="p-12 bg-neutral-900/40 rounded-[4rem] border border-white/5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="w-32 h-32 bg-neutral-950 border-2 border-cyan-500/30 rounded-[2.5rem] flex items-center justify-center mb-6 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            {safeImageSrc(tempPhoto) ? <img src={safeImageSrc(tempPhoto)} alt="Foto de perfil" className="w-full h-full object-cover" /> : <UserCircle className="w-16 h-16 text-neutral-700" />}
          </div>
          {activeTitle && TITLES[activeTitle] && (
            <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2">
              {TITLES[activeTitle]}
            </span>
          )}
          <h3 className="text-2xl font-black text-white">{user.firstName} {user.lastName}</h3>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-2">{profile.status}</p>

          {/* Nível do perfil */}
          <div className="w-full mt-4">
            <LevelCard username={user.username} />
          </div>

          <div className="w-full mt-6 space-y-4">
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
              {/* ── Cores de Acento ── */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">🎨 Cor do Acento</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { id: "kernel",     label: "Preto",   hex: "#22d3ee", rewardId: null },
                    { id: "amber_free", label: "Âmbar",   hex: "#fbbf24", rewardId: "theme_free_amber" },
                    { id: "vapor",      label: "Roxo",    hex: "#c084fc", rewardId: "theme_vapor" },
                    { id: "matrix_pro", label: "Verde",   hex: "#34d399", rewardId: "theme_matrix_pro" },
                    { id: "rose_neon",  label: "Rosa",    hex: "#fb7185", rewardId: "theme_rose" },
                  ].map(ct => {
                    const isFree   = ct.rewardId === null;
                    const owned    = isFree || (ct.rewardId && purchasedItems.includes(ct.rewardId));
                    const isActive = colorThemeId === ct.id;
                    return (
                      <button
                        key={ct.id}
                        disabled={!owned}
                        onClick={() => { if (owned) setColorThemeId(ct.id); }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          isActive ? "border-white/60 scale-105 shadow-lg" : owned ? "border-white/10 hover:border-white/30" : "border-white/5 opacity-40 cursor-not-allowed"
                        }`}
                        style={{ backgroundColor: "#0a0a0a" }}
                      >
                        <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: ct.hex }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: isActive ? ct.hex : "#666" }}>{ct.label}</span>
                        {!owned && <span className="text-[7px] text-amber-500">🔒 Comprar</span>}
                        {isFree && <span className="text-[7px] text-emerald-500">GRÁTIS</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Fonte ── */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">🔤 Estilo de Fonte</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id:"inter",     label:"Inter",         stack:'"Inter", sans-serif',             cat:"Sans",   rewardId: null },
                    { id:"space",     label:"Space Grotesk", stack:'"Space Grotesk", sans-serif',      cat:"Sans",   rewardId:"font_space" },
                    { id:"roboto",    label:"Roboto",        stack:'"Roboto", sans-serif',             cat:"Sans",   rewardId:"font_roboto" },
                    { id:"orbitron",  label:"Orbitron",      stack:'"Orbitron", sans-serif',           cat:"Sci-Fi", rewardId:"font_orbitron" },
                    { id:"jetbrains", label:"JetBrains Mono",stack:'"JetBrains Mono", monospace',      cat:"Mono",   rewardId:"font_jetbrains" },
                    { id:"fira",      label:"Fira Code",     stack:'"Fira Code", monospace',           cat:"Mono",   rewardId:"font_fira" },
                    { id:"sharetech", label:"Share Tech",    stack:'"Share Tech Mono", monospace',     cat:"Mono",   rewardId:"font_sharetech" },
                    { id:"vt323",     label:"VT323",         stack:'"VT323", monospace',               cat:"Retro",  rewardId:"font_vt323" },
                    { id:"courier",   label:"Courier New",   stack:'"Courier New", monospace',         cat:"Retro",  rewardId:"font_courier" },
                  ] as const).map(ft => {
                    const isFree   = ft.rewardId === null;
                    const owned    = isFree || purchasedItems.includes(ft.rewardId as string);
                    const isActive = fontThemeId === ft.id;
                    const catColor: Record<string,string> = { "Sans":"#22d3ee","Sci-Fi":"#c084fc","Mono":"#34d399","Retro":"#fbbf24" };
                    return (
                      <button
                        key={ft.id}
                        disabled={!owned}
                        onClick={() => { if (owned) setFontThemeId(ft.id); }}
                        className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left ${
                          isActive   ? "border-white/60 shadow-xl bg-white/5" :
                          owned      ? "border-white/10 hover:border-white/30" :
                                       "border-white/5 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ backgroundColor: catColor[ft.cat]+"22", color: catColor[ft.cat] }}>{ft.cat}</span>
                        <span className="text-[11px] font-black uppercase tracking-widest text-white">{ft.label}</span>
                        {isActive  && <span className="text-[7px] font-black uppercase text-emerald-400">● ATIVO</span>}
                        {!owned    && <span className="text-[7px] text-amber-500">🔒 Comprar</span>}
                        {isFree    && <span className="text-[7px] text-emerald-500">GRÁTIS</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Título ativo ── */}
              {ownedTitles.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 pl-2">👑 Título do Perfil</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => applyTitle("")}
                      className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTitle === "" ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-neutral-500 hover:border-white/20"
                      }`}
                    >
                      Nenhum
                    </button>
                    {ownedTitles.map(tk => (
                      <button
                        key={tk}
                        onClick={() => applyTitle(tk)}
                        className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          activeTitle === tk
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
                            : "border-white/10 text-neutral-400 hover:border-amber-500/30"
                        }`}
                      >
                        {TITLES[tk]} {user.username}
                      </button>
                    ))}
                  </div>
                  {activeTitle && (
                    <p className="text-[9px] text-neutral-600 pl-2">
                      Aparece como: <span className="text-amber-400 font-black">{TITLES[activeTitle]} {user.username}</span> na comunidade
                    </p>
                  )}
                </div>
              )}
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
      {/* ── Coleção & Progresso ── */}
      {collection && allItems && (
        <CollectionProgress collection={collection} allItems={allItems} />
      )}
      </>)}

    </div>
  );
}

function CollectionProgress({ collection, allItems }: { collection: CollectionState; allItems: HardwareItem[] }) {
  const [filter, setFilter] = React.useState<"all"|"marked"|"progress">("marked");
  const [openItem, setOpenItem] = React.useState<string | null>(null);

  const markedItems = allItems.filter(i => collection[i.id]?.marked);
  const progressItems = allItems.filter(i => (collection[i.id]?.completedProjects?.length ?? 0) > 0);
  const totalProjects = allItems.reduce((a, i) => a + (collection[i.id]?.completedProjects?.length ?? 0), 0);

  const displayed = filter === "marked" ? markedItems : filter === "progress" ? progressItems : allItems.filter(i => collection[i.id]);

  return (
    <div className="lg:col-span-12 p-10 bg-neutral-900/40 rounded-[3rem] border border-white/5 shadow-2xl mt-0 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-xl font-black flex items-center gap-4 text-white uppercase text-left">
          <FolderOpen className="w-6 h-6 text-amber-400" /> COLEÇÃO &amp; HISTÓRICO DE PROJETOS
        </h3>
        <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest">
          <span className="text-neutral-500">⭐ {markedItems.length} itens coletados</span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-500">✓ {totalProjects} projetos concluídos</span>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Coletados", val: markedItems.length, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Com progresso", val: progressItems.length, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
          { label: "Projetos feitos", val: totalProjects, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ].map(s => (
          <div key={s.label} className={`p-6 rounded-2xl border ${s.bg} text-center space-y-1`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex bg-neutral-950 rounded-2xl p-1 gap-1 w-fit">
        {(["marked","progress","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter===f?"bg-white text-black":"text-neutral-500 hover:text-white"}`}>
            {f==="marked"?"⭐ Coleção":f==="progress"?"📊 Em progresso":"📋 Todos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-neutral-600">
          <BadgeCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-black uppercase tracking-widest text-sm">Nenhum item aqui ainda</p>
          <p className="text-[10px] mt-2 uppercase">Clique em ⭐ nos cards de componentes e placas para coletar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(item => {
            const entry = collection[item.id] ?? { marked: false, markedAt: null, completedProjects: [] };
            const done = entry.completedProjects.length;
            const pct = Math.round((done / 10) * 100);
            const isOpen = openItem === item.id;
            return (
              <div key={item.id} className={`rounded-2xl border overflow-hidden ${entry.marked?"border-amber-500/20":"border-white/5"}`}>
                <button className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
                  onClick={() => setOpenItem(isOpen ? null : item.id)}>
                  <img src={item.image} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-white truncate">{item.nome}</span>
                      {entry.marked && <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      <span className="text-[8px] text-neutral-600 font-black uppercase px-2 py-0.5 bg-neutral-900 rounded">{item.tipo}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all" style={{ width:`${pct}%` }} />
                      </div>
                      <span className="text-[9px] font-black text-neutral-500 uppercase shrink-0">{done}/10 projetos</span>
                    </div>
                  </div>
                  {entry.markedAt && (
                    <span className="text-[8px] text-neutral-600 font-bold shrink-0 hidden md:block">
                      {new Date(entry.markedAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-neutral-600 shrink-0 transition-transform ${isOpen?"rotate-180":""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 p-4 bg-neutral-950/40">
                    <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-3">Projetos concluídos:</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({length:10},(_,i)=>(
                        <span key={i} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${
                          entry.completedProjects.includes(i)
                            ?"bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            :"bg-neutral-900 border-white/5 text-neutral-700"
                        }`}>
                          Proj {String(i+1).padStart(2,"0")} {entry.completedProjects.includes(i)?"✓":""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Seção de Projetos no Modal ─────────────────────────────────────────────
function ModalProjectsSection({ item, entry, isMarked, onToggleMark, onToggleProject, onGoToCircuit, currentItem }: {
  item: HardwareItem;
  entry: { marked: boolean; markedAt: string | null; completedProjects: number[] };
  isMarked: boolean;
  onToggleMark: () => void;
  onToggleProject: (idx: number) => void;
  onGoToCircuit?: (comps: HardwareItem[], code: string, title: string) => void;
  currentItem?: HardwareItem;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [activeProj, setActiveProj] = React.useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);
  const projects = getProjectsForComponent(item);

  // Resolve componentes mencionados no projeto para HardwareItems
  const allHW = [...DATA_PLACAS, ...DATA_COMPONENTES, ...DATA_PC_HARDWARE];
  const resolveProjectComps = (proj: { title: string; connections: string }): HardwareItem[] => {
    // Inclui o próprio componente/placa atual
    const result: HardwareItem[] = currentItem ? [currentItem] : [];
    // Tenta extrair nomes de componentes das conexões do projeto
    const keywords = ["Arduino", "ESP32", "DHT22", "HC-SR04", "servo", "LED", "OLED", "LCD",
      "buzzer", "relé", "MPU6050", "BMP280", "DS18B20", "PIR", "encoder"];
    keywords.forEach(kw => {
      if (proj.connections.toLowerCase().includes(kw.toLowerCase()) || proj.title.toLowerCase().includes(kw.toLowerCase())) {
        const found = allHW.find(h => h.nome.toLowerCase().includes(kw.toLowerCase()));
        if (found && !result.find(r => r.id === found.id)) result.push(found);
      }
    });
    return result;
  };
  const done = entry.completedProjects.length;
  const pct = Math.round((done / 10) * 100);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const diffColor = (d: string) =>
    d === "Iniciante" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : d === "Intermediário" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-red-400 bg-red-500/10 border-red-500/20";

  return (
    <div className="mt-10 pt-10 border-t border-white/5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-3 text-lg font-black text-white uppercase tracking-tight hover:text-cyan-400 transition-colors"
          >
            <BookMarked className="w-5 h-5 text-cyan-400" />
            10 PROJETOS GUIADOS
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">{done}/10 concluídos</span>
        </div>
        {/* Botão coleção */}
        <button
          onClick={onToggleMark}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
            isMarked
              ? "bg-cyan-500 border-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/20"
              : "bg-neutral-900 border-white/10 text-neutral-400 hover:border-cyan-500/40 hover:text-cyan-400"
          }`}
        >
          <BadgeCheck className="w-3.5 h-3.5" />
          {isMarked ? "NA COLEÇÃO" : "COLETAR"}
        </button>
      </div>

      {/* Barra de progresso */}
      <div>
        <div className="flex justify-between text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">
          <span>Progresso dos projetos</span><span>{pct}%</span>
        </div>
        <div className="h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
          />
        </div>
      </div>

      {/* Lista de projetos */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3"
          >
            {projects.map((proj, idx) => {
              const isDone = entry.completedProjects.includes(idx);
              const isOpen = activeProj === idx;
              return (
                <div key={proj.id} className={`rounded-2xl border overflow-hidden transition-all ${isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-neutral-950/40"}`}>
                  {/* Projeto header */}
                  <div className="flex items-center gap-3 p-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => onToggleProject(idx)}
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isDone ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-emerald-500/50"}`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                    {/* Info */}
                    <button className="flex-1 text-left" onClick={() => setActiveProj(isOpen ? null : idx)}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`font-black text-sm ${isDone ? "text-emerald-400 line-through opacity-60" : "text-white"}`}>
                          {String(idx + 1).padStart(2, "0")}. {proj.title}
                        </span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${diffColor(proj.difficulty)}`}>{proj.difficulty}</span>
                        <span className="text-[8px] text-neutral-600 font-bold uppercase">{proj.time}</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1 font-medium">{proj.description}</p>
                    </button>
                    <ChevronDown className={`w-4 h-4 text-neutral-600 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} onClick={() => setActiveProj(isOpen ? null : idx)} />
                  </div>

                  {/* Projeto expandido */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5"
                      >
                        <div className="p-5 space-y-4">
                          {/* Conexões */}
                          <div>
                            <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Zap className="w-3 h-3" /> CONEXÕES
                            </p>
                            <p className="text-xs font-mono text-neutral-400 bg-neutral-950/60 rounded-xl p-3 leading-relaxed">{proj.connections}</p>
                          </div>
                          {/* Código */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                <Terminal className="w-3 h-3" /> CÓDIGO COMPLETO
                              </p>
                              <button
                                onClick={() => copyCode(proj.code, idx)}
                                className="text-[8px] font-black uppercase tracking-widest text-cyan-500 hover:text-white transition-colors flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                {copiedIdx === idx ? "COPIADO!" : "COPIAR"}
                              </button>
                            </div>
                            <pre className="bg-neutral-950 rounded-xl p-4 text-[10px] font-mono text-neutral-300 overflow-x-auto leading-relaxed max-h-96 overflow-y-auto scrollbar-visible whitespace-pre-wrap">
                              {proj.code}
                            </pre>
                          </div>
                          {/* Marcar concluído */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => onToggleProject(idx)}
                              className={`flex-1 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                isDone ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                       : "bg-cyan-500 text-neutral-950 hover:scale-[1.02] active:scale-95"
                              }`}
                            >
                              {isDone ? "✓ CONCLUÍDO — Clique para desmarcar" : "MARCAR COMO CONCLUÍDO"}
                            </button>
                            {onGoToCircuit && (
                              <button
                                onClick={() => onGoToCircuit(resolveProjectComps(proj), proj.code, proj.title)}
                                className="flex items-center gap-1.5 px-5 h-10 bg-emerald-500 text-neutral-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
                                title="Abrir no Circuito com código completo"
                              >
                                <CircuitBoard className="w-3.5 h-3.5" /> GO!
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, badge, tourId }: any) {
  return (
    <button
      onClick={onClick}
      data-tour={tourId}
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

function HardwareCard({ item, onAdd, onView, isAdded, isMarked, onMark }: { item: HardwareItem, onAdd: any, onView: any, isAdded: boolean, isMarked?: boolean, onMark?: () => void }) {
  return (
    <motion.div 
      layout
      className="group bg-neutral-900/30 border border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden p-3 sm:p-6 hover:border-cyan-500/40 transition-all hover:bg-neutral-900 shadow-xl relative"
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
        {/* Botão Coleção */}
        {onMark && (
          <button
            onClick={(e) => { e.stopPropagation(); onMark(); }}
            className={`absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isMarked
                ? "bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/30"
                : "bg-neutral-950/80 text-neutral-600 hover:text-cyan-400 hover:bg-neutral-900"
            }`}
            title={isMarked ? "Remover da coleção" : "Adicionar à coleção"}
          >
            <BadgeCheck className="w-4 h-4" />
          </button>
        )}
      </div>

      <h3 className="font-black text-sm sm:text-xl mb-2 sm:mb-3 truncate group-hover:text-cyan-400 transition-colors uppercase tracking-tight pr-4">{item.nome}</h3>
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

  // Guided mode state
  const [activeCategory, setActiveCategory] = useState<GuidedCategory | null>(null);
  const [mode, setMode] = useState<"guided" | "free">("guided");

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
    <div className="bg-neutral-900 border border-white/5 rounded-[4rem] flex flex-col overflow-hidden shadow-2xl" style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}>

      {/* ── Header ── */}
      <div className="px-8 py-6 bg-neutral-950/60 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center animate-pulse shrink-0">
            <img src="/logo.png" className="w-7 h-7 object-cover" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white uppercase">DEVGENIUS IA</h3>
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">150 respostas embutidas // Modo {mode === "guided" ? "Guiado" : "Livre"}</p>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-neutral-900 border border-white/5 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setMode("guided")}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${mode === "guided" ? "bg-cyan-500 text-neutral-950" : "text-neutral-500 hover:text-white"}`}
          >
            <Layers className="w-3 h-3" /> Guiado
          </button>
          <button
            onClick={() => setMode("free")}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${mode === "free" ? "bg-cyan-500 text-neutral-950" : "text-neutral-500 hover:text-white"}`}
          >
            <MessageSquare className="w-3 h-3" /> Livre
          </button>
        </div>
      </div>

      {/* ── Guided Panel ── */}
      <AnimatePresence>
        {mode === "guided" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 border-b border-white/5 overflow-hidden"
          >
            {/* Category row */}
            <div className="px-6 pt-4 pb-3">
              <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-3">CATEGORIAS</p>
              <div className="flex flex-wrap gap-2">
                {IA_GUIDED_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(activeCategory?.id === cat.id ? null : cat)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                      activeCategory?.id === cat.id
                        ? "bg-cyan-500 border-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/20"
                        : "bg-neutral-950/60 border-white/5 text-neutral-400 hover:border-cyan-500/40 hover:text-white"
                    }`}
                  >
                    <span className="text-sm leading-none">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions chips — appear when category selected */}
            <AnimatePresence>
              {activeCategory && (
                <motion.div
                  key={activeCategory.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4">
                    <div className="bg-neutral-950/40 rounded-2xl border border-white/5 p-4">
                      <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <span>{activeCategory.emoji}</span> {activeCategory.label} — {activeCategory.desc}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeCategory.questions.map((qItem) => (
                          <button
                            key={qItem.label}
                            onClick={() => {
                              onSend(qItem.question);
                              setActiveCategory(null);
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wide text-neutral-300 hover:bg-cyan-500 hover:text-neutral-950 hover:border-cyan-500 transition-all disabled:opacity-30"
                          >
                            {qItem.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-visible" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-5">
            <div className="w-20 h-20 bg-cyan-500/5 rounded-[2rem] flex items-center justify-center border border-cyan-500/10">
              <Sparkles className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-black uppercase tracking-widest text-neutral-400">
                {mode === "guided" ? "Escolha uma categoria acima" : "O que deseja projetar hoje?"}
              </p>
              <p className="text-[10px] text-neutral-600 uppercase tracking-widest">
                {mode === "guided"
                  ? "Selecione uma categoria → clique na pergunta → veja a resposta"
                  : "Digite sua dúvida ou use o modo GUIADO para navegar por categorias"}
              </p>
            </div>
            {mode === "free" && (
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mt-2">
                {["Como ligar LED no Arduino?", "Como usar WiFi no ESP32?", "O que é protocolo I2C?", "Como usar sensor DHT22?"].map(r => (
                  <button
                    key={r}
                    onClick={() => onSend(r)}
                    className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-neutral-400 hover:bg-cyan-500 hover:text-neutral-950 hover:border-cyan-500 transition-all"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "ia" && (
              <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center mr-3 mt-1 shrink-0">
                <img src="/logo.png" className="w-5 h-5 object-cover" />
              </div>
            )}
            <div className={`max-w-[78%] rounded-[1.5rem] px-6 py-5 text-sm font-medium leading-relaxed ${
              m.role === "user"
                ? "bg-cyan-500 text-neutral-950 font-bold rounded-br-sm"
                : "bg-neutral-800/60 border border-white/5 text-neutral-300 rounded-bl-sm"
            }`}>
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-cyan-400 prose-headings:font-black prose-strong:text-white prose-code:text-cyan-300 prose-code:bg-neutral-950/60 prose-code:px-1 prose-code:rounded">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{m.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center shrink-0">
              <img src="/logo.png" className="w-5 h-5 object-cover" />
            </div>
            <div className="bg-neutral-800/50 border border-white/5 rounded-[1.5rem] rounded-bl-sm px-6 py-4 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Buscando resposta...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="px-6 py-4 bg-neutral-950/80 backdrop-blur-2xl border-t border-white/5 shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder={mode === "guided" ? "Ou digite qualquer dúvida técnica..." : "Digite sua dúvida técnica..."}
            className="w-full bg-neutral-900 border border-white/10 rounded-2xl pl-6 pr-16 py-4 text-sm font-medium focus:outline-none focus:border-cyan-500/50 transition-all min-h-[70px] max-h-32 resize-none text-white placeholder:text-neutral-600"
          />
          <button
            onClick={() => onSend()}
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 w-10 h-10 bg-cyan-500 text-neutral-950 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[8px] text-neutral-700 font-bold uppercase tracking-widest mt-3">
          {messages.length > 0
            ? `${messages.filter(m => m.role === "user").length} pergunta(s) nesta sessão // 150 Q&A embutidas`
            : "150 Q&A EMBUTIDAS // MATCHING POR PALAVRAS-CHAVE // GEMINI COMO BACKUP"}
        </p>
      </div>
    </div>
  );
}

function CodeSnippets({ activeTab: dashboardTab, setActiveTab }: { activeTab: string, setActiveTab: (t: any) => void }) {
  const { claimEvent, username } = useRewards();
  const codeProgressKey = username ? `code_progress_${username}` : null;
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => {
    if (!codeProgressKey) return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(codeProgressKey) || "[]")); } catch { return new Set(); }
  });
  const [activeLang, setActiveLang] = useState<"cpp" | "js" | "py">("cpp");
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
    ],
    py: [
      {
        title: "PYTHON FUNDAMENTOS E HARDWARE",
        text: `Python é uma das linguagens mais versáteis do mundo da tecnologia moderna, e no contexto de hardware e IoT ela se tornou indispensável. Sua sintaxe limpa, legibilidade excepcional e enorme ecossistema de bibliotecas fazem de Python a escolha ideal tanto para iniciantes quanto para engenheiros experientes que precisam de prototipagem rápida.
A história de Python começa em 1991, criada por Guido van Rossum como sucessora da linguagem ABC. O nome homenageia o grupo de comédia Monty Python. Hoje, Python está em sua versão 3.x (3.11+ recomendado), com melhorias significativas de performance, tipagem e mensagens de erro.
O interpretador Python executa código linha a linha, tornando o debugging interativo possível. O REPL (Read-Eval-Print Loop) do Python — acessível simplesmente digitando 'python' no terminal — permite testar expressões instantaneamente, algo valioso ao trabalhar com hardware.
Variáveis em Python não precisam de declaração explícita de tipo: x = 42 cria um inteiro; x = 3.14 cria um float; x = "texto" cria uma string. Isso é chamado de tipagem dinâmica. Python é fortemente tipado (não converte implicitamente tipos incompatíveis) mas dinamicamente tipado (tipos são verificados em runtime, não em compilação).
Os tipos primitivos de Python incluem: int (inteiros de precisão arbitrária — sem overflow!), float (ponto flutuante IEEE 754 de 64 bits), complex (números complexos: 3+4j), bool (True/False, subclasse de int), str (strings Unicode imutáveis), bytes (sequência de bytes imutável) e bytearray (sequência de bytes mutável, essencial para buffers de comunicação serial).
Operadores aritméticos: + (soma), - (subtração), * (multiplicação), / (divisão real), // (divisão inteira), % (módulo/resto), ** (potência). Note que 7/2 = 3.5 (float), mas 7//2 = 3 (int). Isso difere de C/C++.
Strings em Python são imutáveis e suportam fatiamento (slicing): s[0] é o primeiro caractere, s[-1] é o último, s[1:4] são os caracteres de índice 1 a 3, s[::2] são os caracteres em índices pares. F-strings (formatted strings literals) são a forma moderna de formatar: f"Temperatura: {temp:.2f} °C" — mais rápido e legível que .format() ou %.
Listas são coleções ordenadas e mutáveis: minha_lista = [1, 2.5, "texto", True]. Métodos importantes: append(x) adiciona ao final, insert(i, x) insere na posição i, pop() remove e retorna o último, remove(x) remove a primeira ocorrência de x, sort() ordena in-place, sorted() retorna nova lista ordenada, len() retorna o tamanho.
Tuples são como listas mas imutáveis: ponto = (10.5, 20.3). Usadas para coordenadas, retornos múltiplos de funções (Python desempacota automaticamente: x, y = obter_posicao()) e como chaves de dicionário.
Dicionários são coleções de pares chave:valor não ordenados (Python 3.7+ mantém ordem de inserção): sensor = {"nome": "DHT22", "pin": 4, "ativo": True}. Acesso: sensor["nome"]. Métodos: keys(), values(), items(), get(chave, padrao), update(outro_dict). Compreensão de dicionário: {k: v*2 for k, v in dados.items()}.
Sets (conjuntos) armazenam elementos únicos não ordenados: dispositivos = {"esp32", "arduino", "rpi"}. Operações de teoria dos conjuntos: union (|), intersection (&), difference (-), symmetric_difference (^). Úteis para remover duplicatas: lista_unica = list(set(lista_com_duplicatas)).
Controle de fluxo com if/elif/else usa indentação obrigatória (4 espaços por convenção PEP 8): if temperatura > 80: ativar_alerta(). Python não tem switch/case tradicional — use if/elif encadeado ou dicionário de dispatch. Python 3.10+ introduz match/case (pattern matching estrutural).
Laços for iteram sobre qualquer iterável: for item in lista: — nativo e idiomático. range(start, stop, step) gera sequência: for i in range(0, 100, 5). enumerate() fornece índice e valor: for i, v in enumerate(lista). zip() combina iteráveis: for a, b in zip(lista1, lista2).
Laços while executam enquanto condição for verdadeira: while not sensor.pronto(): aguardar(). break sai do laço imediatamente; continue passa para a próxima iteração; else após while/for executa quando o laço termina naturalmente (sem break) — pouco conhecido mas útil.
Funções são definidas com def: def calcular_distancia(duracao_us): return duracao_us * 0.034 / 2. Argumentos padrão: def conectar(ssid, senha, timeout=30). Argumentos keyword: conectar(ssid="MinhaRede", senha="123"). *args captura argumentos posicionais variáveis como tupla; **kwargs captura argumentos keyword como dict.
Funções lambda são anônimas e de expressão única: quadrado = lambda x: x**2. Usadas com map(), filter(), sorted(): lista_ordenada = sorted(sensores, key=lambda s: s["temperatura"], reverse=True).
List comprehensions são pythônicas e eficientes: temperaturas_celsius = [(f - 32) * 5/9 for f in temperaturas_fahrenheit]. Generator expressions (parênteses em vez de colchetes) são lazy e economizam memória: soma = sum(x**2 for x in range(1000000)).
Módulos são arquivos .py que contêm definições. Importação: import time; from machine import Pin, I2C; from time import sleep, ticks_ms. Alias: import numpy as np. Pacotes são diretórios com __init__.py. pip é o gerenciador de pacotes: pip install requests pyserial adafruit-blinka.
Ambientes virtuais isolam dependências de projetos: python -m venv meu_projeto; source meu_projeto/bin/activate (Linux/Mac) ou meu_projeto\Scripts\activate (Windows). requirements.txt lista dependências: pip freeze > requirements.txt; pip install -r requirements.txt.
Tratamento de exceções com try/except/finally: try: dados = serial.readline(); except SerialException as e: logging.error(f"Erro serial: {e}"); finally: serial.close(). raise re-lança exceções. Crie exceções personalizadas: class SensorError(Exception): pass.
Classes e orientação a objetos em Python: class Sensor: def __init__(self, pin, tipo): self.pin = pin; self.tipo = tipo. self é a referência ao objeto (como this em C++). Herança: class DHT22(Sensor): pass. super().__init__() chama o construtor da classe pai. Dunder methods (__repr__, __str__, __len__, __eq__) personalizam comportamento.
Property decorators criam getters/setters elegantes: @property def temperatura(self): return self._temp; @temperatura.setter def temperatura(self, v): if -40<=v<=80: self._temp=v. Encapsulamento sem getters/setters explícitos — código pythônico.
MicroPython é uma implementação compacta de Python 3 para microcontroladores com poucos recursos. Roda em ESP32, ESP8266, Raspberry Pi Pico, STM32, nRF52840 e outros. Ocupa tipicamente 256 KB de Flash e 16 KB de RAM. Subconjunto da biblioteca padrão Python + módulos específicos de hardware (machine, network, uasyncio).
No MicroPython, o módulo machine é o coração do controle de hardware: from machine import Pin, I2C, SPI, ADC, PWM, UART, Timer. Pin(14, Pin.OUT) cria saída digital. Pin(2, Pin.IN, Pin.PULL_UP) cria entrada com pull-up. pin.value(1) liga; pin.value(0) desliga; pin.value() lê o estado.
PWM em MicroPython: pwm = PWM(Pin(13)); pwm.freq(1000); pwm.duty(512). duty vai de 0 a 1023 (10 bits) no ESP8266, 0 a 65535 (16 bits resolução) no ESP32 com duty_u16(). Para servos: pwm.freq(50); pwm.duty_u16(int(duty_ciclo * 65535)).
ADC (analógico) em MicroPython no ESP32: adc = ADC(Pin(36)); adc.atten(ADC.ATTN_11DB); adc.width(ADC.WIDTH_12BIT); valor = adc.read(). Tensão: tensao = valor * 3.3 / 4095. Pinos ADC válidos: 32-39 (somente leitura no ESP32).
I2C em MicroPython: i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=400000). Scan: i2c.scan() retorna lista de endereços hex. Escrita: i2c.writeto(addr, bytes([reg, valor])). Leitura: dados = i2c.readfrom_mem(addr, reg, num_bytes). Biblioteca de alto nível para OLED SSD1306: import ssd1306; display = ssd1306.SSD1306_I2C(128, 64, i2c).
SPI em MicroPython: spi = SPI(1, baudrate=8000000, polarity=0, phase=0, sck=Pin(18), mosi=Pin(23), miso=Pin(19)). cs = Pin(5, Pin.OUT); cs.value(0); spi.write(b'\x02\x00'); spi.readinto(buf); cs.value(1). Para SD card: import sdcard, uos; sd = sdcard.SDCard(spi, cs); uos.mount(sd, '/sd').
UART em MicroPython: uart = UART(2, baudrate=9600, tx=Pin(17), rx=Pin(16)); uart.write('Olá\n'); dados = uart.readline(). uart.any() retorna número de bytes disponíveis. Padrão para comunicação com módulos GPS, GSM, displays seriais.
Comunicação serial com pyserial em Python desktop: import serial; ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=1); ser.write(b'LED:ON\n'); resposta = ser.readline().decode('utf-8').strip(). Enumerate portas: from serial.tools.list_ports import comports; [print(p) for p in comports()].
RPi.GPIO para Raspberry Pi: import RPi.GPIO as GPIO; GPIO.setmode(GPIO.BCM); GPIO.setup(18, GPIO.OUT); GPIO.output(18, GPIO.HIGH). GPIO.input(24) lê pino. GPIO.add_event_detect(24, GPIO.RISING, callback=minha_funcao, bouncetime=200) para interrupções. GPIO.cleanup() no finally para liberar pinos.
gpiozero é biblioteca de alto nível para RPi: from gpiozero import LED, Button, DistanceSensor, RotaryEncoder; led = LED(18); led.on(); led.blink(on_time=0.5, off_time=0.5). DistanceSensor: sensor = DistanceSensor(echo=24, trigger=23); print(sensor.distance). Mais simples que RPi.GPIO puro.
smbus2 para I2C no Raspberry Pi: from smbus2 import SMBus; with SMBus(1) as bus: bus.write_byte_data(0x68, 0x6B, 0); data = bus.read_i2c_block_data(0x68, 0x3B, 14). Biblioteca alternativa de alto nível: from adafruit_extended_bus import ExtendedI2C; i2c = ExtendedI2C(1).
spidev para SPI no Raspberry Pi: import spidev; spi = spidev.SpiDev(); spi.open(0, 0); spi.max_speed_hz = 1000000; resp = spi.xfer2([0x02, 0x00, 0xFF]); spi.close(). Para MCP3208 ADC: def ler_canal(ch): return spi.xfer2([0x06|(ch>>2), (ch&3)<<6, 0])[1]&0xF<<8|spi.xfer2(...)[2].
Threading em Python para múltiplas tarefas: import threading; t = threading.Thread(target=ler_sensor, args=(sensor,), daemon=True); t.start(). Lock para seção crítica: lock = threading.Lock(); with lock: dados_compartilhados.append(valor). Event para sincronização: evento = threading.Event(); evento.set(); evento.wait(). Queue para comunicação thread-safe: from queue import Queue; fila = Queue(maxsize=100); fila.put(leitura); dado = fila.get(timeout=5).
asyncio para IO assíncrono (uasyncio no MicroPython): import asyncio. async def ler_sensor(): await asyncio.sleep(1); return sensor.read(). asyncio.run(main()). gather() para tarefas paralelas: await asyncio.gather(tarefa1(), tarefa2()). create_task() para tarefas em background. No MicroPython: loop = uasyncio.get_event_loop(); loop.create_task(coro); loop.run_forever().
Socket programming para comunicação de rede: import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.connect(('192.168.1.100', 8080)); s.sendall(b'GET /sensor HTTP/1.0\r\n\r\n'); resp = s.recv(1024); s.close(). UDP: socket.SOCK_DGRAM; s.sendto(dados, (ip, porta)).
JSON em Python: import json; dados_str = json.dumps({"temp": 25.3, "umid": 65}); dados_dict = json.loads(resposta_servidor). json.dump(objeto, arquivo) e json.load(arquivo) para persistência em arquivo. indent=2 para formatação legível: json.dumps(dados, indent=2, ensure_ascii=False).
Logging para aplicações robustas: import logging; logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s', filename='app.log'); logging.debug('Iniciando sensor'); logging.warning('Temperatura alta: %.1f', temp); logging.critical('Falha de comunicação'). RotatingFileHandler para limitar tamanho do log.
Arquivos e I/O: with open('dados.csv', 'a') as f: f.write(f"{timestamp},{temp},{umid}\n"). pathlib é mais moderna que os.path: from pathlib import Path; p = Path('/home/pi/logs'); p.mkdir(exist_ok=True). Leitura CSV: import csv; with open('dados.csv') as f: reader = csv.DictReader(f); [print(row) for row in reader].
Datetime para timestamps: from datetime import datetime; agora = datetime.now(); iso = agora.isoformat(); ts = agora.timestamp(). time.time() retorna float UNIX timestamp. time.sleep(0.5) pausa 0.5 segundos. timedelta: amanha = datetime.now() + timedelta(days=1).
Requests para HTTP em Python: import requests; resp = requests.get('https://api.openweathermap.org/data/2.5/weather', params={'q':'Brasilia','appid':KEY}); dados = resp.json(); resp.status_code. POST: requests.post(url, json={"temp":25.3}, headers={"Authorization":"Bearer TOKEN"}, timeout=5). Session para reutilizar conexões: s = requests.Session().
paho-mqtt para MQTT em Python: import paho.mqtt.client as mqtt; client = mqtt.Client(); client.on_connect = lambda c,u,f,rc: client.subscribe('sensors/#'); client.on_message = lambda c,u,m: print(m.topic, m.payload.decode()); client.connect('broker.hivemq.com', 1883); client.loop_forever(). TLS: client.tls_set(ca_certs='ca.crt').
SQLite3 embutido no Python: import sqlite3; conn = sqlite3.connect('sensores.db'); cur = conn.cursor(); cur.execute('CREATE TABLE IF NOT EXISTS leituras (ts REAL, temp REAL, umid REAL)'); cur.execute('INSERT INTO leituras VALUES (?,?,?)', (time.time(), temp, umid)); conn.commit(); rows = cur.execute('SELECT * FROM leituras ORDER BY ts DESC LIMIT 10').fetchall(); conn.close().
Geradores são funções com yield que produzem valores sob demanda: def ler_continuo(sensor): while True: yield sensor.ler(); time.sleep(1). Economizam memória para streams de dados. itertools.islice(gerador, 100) pega os primeiros 100 valores. next(gen) avança manualmente.
Decoradores modificam funções: @functools.cache memoiza resultados, @staticmethod remove necessidade de self, @property cria getters. Decorador personalizado: def retry(n): def decorator(f): def wrapper(*a,**k): for i in range(n): try: return f(*a,**k) except: if i==n-1: raise; return wrapper; return decorator.
Context managers (with) garantem cleanup: class SensorContexto: def __enter__(self): self.iniciar(); return self; def __exit__(self,*a): self.finalizar(). contextlib.contextmanager: @contextmanager def sensor_aberto(pin): s = Sensor(pin); s.iniciar(); try: yield s; finally: s.fechar().
Tipagem estática opcional (type hints) melhora manutenção e IDEs: def ler_temperatura(pino: int, tipo: str = 'DHT22') -> float: ... Verificação com mypy: mypy script.py. dataclasses reduzem boilerplate: @dataclass class Leitura: timestamp: float; temperatura: float; umidade: float. Python 3.10+: Union[int, str] = int | str.
Virtual environments e boas práticas: sempre use venv para isolar dependências; use requirements.txt ou pyproject.toml (poetry/pip-tools); siga PEP 8 (4 espaços, linhas de 79 chars, nomes snake_case); docstrings para funções públicas; testes com pytest. Profiling: python -m cProfile meu_script.py.
MicroPython file system: uos.listdir('/'); uos.mkdir('/data'); with open('/data/log.txt','a') as f: f.write(str(temp)). Flash disponível: uos.statvfs('/')[0]*uos.statvfs('/')[3] bytes livres. Para SD card: montar em /sd com uos.mount(). Modo REPL: conecte com tio ou minicom em 115200 baud.
WebREPL no MicroPython permite acesso wireless: import webrepl; webrepl.start(password='senha123'). Acesse via browser em http://micropython.org/webrepl. Transferir arquivos: webrepl_cli.py -p senha arquivo.py 192.168.4.1:/arquivo.py.
Exemplos práticos que combinam tudo: estação meteorológica com DHT22 + BMP280 + WiFi + MQTT; datalogger com DS18B20 + SD card + RTC; alarme com PIR + Buzzer + envio de e-mail via smtplib; monitoramento remoto com asyncio + WebSocket; robô seguidor de linha com PWM + sensores IR.
A força de Python em hardware está na velocidade de prototipagem, na riqueza de bibliotecas e na capacidade de integrar facilmente com backends, bancos de dados e APIs de cloud. Para produção em sistemas críticos de tempo real, C/C++ ainda é superior — mas Python domina a camada de controle, análise e conectividade.`
      },
      {
        title: "PYTHON CIÊNCIA DE DADOS E AUTOMAÇÃO",
        text: `Ciência de dados com Python revolucionou a forma como analisamos e interpretamos informações de sensores IoT, sistemas embarcados e projetos de hardware. O ecossistema científico de Python — NumPy, Pandas, Matplotlib, SciPy, Scikit-learn — é o mais completo e ativo do mundo para análise de dados.
NumPy (Numerical Python) é o fundamento de todo o ecossistema científico. Seu objeto central é o ndarray (N-dimensional array): import numpy as np; arr = np.array([1, 2, 3, 4, 5]). Diferente de listas Python, ndarrays são homogêneos (todos os elementos do mesmo tipo), armazenados em memória contígua, e operações são vetorizadas — executadas em C/Fortran internamente.
Criação de arrays: np.zeros((3,4)) — matriz 3×4 de zeros. np.ones((2,3)) — uns. np.eye(4) — identidade 4×4. np.linspace(0, 2*np.pi, 100) — 100 pontos de 0 a 2π. np.arange(0, 10, 0.5) — de 0 a 9.5 com passo 0.5. np.random.rand(3,3) — uniforme [0,1). np.random.normal(25, 5, 1000) — normal com média 25 e desvio 5.
Indexação e fatiamento de arrays: arr[0] primeiro elemento; arr[-1] último; arr[2:5] elementos 2,3,4; arr[::2] índices pares; matriz[1,3] elemento linha 1 coluna 3; matriz[0:2, 1:3] sub-matriz; arr[arr > 30] indexação booleana (filtrar temperaturas acima de 30°C).
Operações vetorizadas: soma = a + b; produto = a * b (element-wise); dot_product = np.dot(a, b); np.sqrt(arr); np.exp(arr); np.log(arr); np.sin(arr). Broadcasting: arr + 10 adiciona 10 a cada elemento. Operações matriciais: np.linalg.inv(A); np.linalg.eig(A); np.linalg.solve(A, b).
Funções estatísticas: np.mean(arr); np.median(arr); np.std(arr); np.var(arr); np.min/max(arr); np.percentile(arr, [25,50,75]); np.corrcoef(a, b) — correlação. Por eixo: np.mean(matriz, axis=0) — média de cada coluna; axis=1 — média de cada linha.
Pandas é construído sobre NumPy e adiciona estruturas de dados rotuladas para análise de dados tabulares. DataFrame é a estrutura central: tabela com linhas e colunas nomeadas. import pandas as pd; df = pd.read_csv('sensores.csv'). df.head(10); df.tail(5); df.shape; df.dtypes; df.describe() — resumo estatístico.
Criação de DataFrames: pd.DataFrame({'timestamp': datas, 'temp': temperaturas, 'umid': umidades}). pd.read_csv(), pd.read_excel(), pd.read_json(), pd.read_sql(query, conn). Exportar: df.to_csv('saida.csv', index=False); df.to_excel('relatorio.xlsx', sheet_name='Dados').
Seleção e filtragem: df['temperatura'] — Series (coluna); df[['temp','umid']] — DataFrame com múltiplas colunas; df.loc[5, 'temperatura'] — por rótulo; df.iloc[0:10, 2:5] — por posição numérica; df[df['temperatura'] > 30] — filtragem booleana; df.query('temperatura > 30 and umidade < 60').
Limpeza de dados: df.isnull().sum() — conta NaN por coluna; df.dropna() — remove linhas com NaN; df.fillna(df.mean()) — preenche NaN com a média; df.duplicated().sum() — conta duplicatas; df.drop_duplicates(). Detectar outliers: Q1=df.quantile(0.25); Q3=df.quantile(0.75); IQR=Q3-Q1; df[(df>=Q1-1.5*IQR)&(df<=Q3+1.5*IQR)].
Transformações: df['temp_f'] = df['temperatura'] * 9/5 + 32 — nova coluna; df.rename(columns={'temp':'temperatura'}); df['hora'] = pd.to_datetime(df['timestamp']); df['hora'].dt.hour — extrai hora; df.set_index('hora'); df.sort_values('temperatura', ascending=False).
GroupBy para agregação: grupo = df.groupby('dispositivo'); grupo['temperatura'].mean() — média por dispositivo; grupo.agg({'temp':['mean','max','min'], 'umid':'mean'}). resample() para séries temporais: df.resample('1H').mean() — média a cada hora; df.resample('D').agg({'temp':'max','umid':'min'}).
Merge e join de DataFrames: pd.merge(df1, df2, on='device_id') — inner join; pd.merge(df1, df2, how='left') — left join; df1.join(df2) — join por índice. pd.concat([df1, df2]) — empilhar DataFrames verticalmente.
Matplotlib para visualização: import matplotlib.pyplot as plt. plt.plot(x, y, 'b-', linewidth=2, label='Temperatura'); plt.scatter(x, y, c=cores, s=tamanhos); plt.bar(categorias, valores); plt.hist(dados, bins=50, density=True); plt.figure(figsize=(12,6)); plt.xlabel('Tempo'); plt.ylabel('Temperatura (°C)'); plt.title('Monitoramento'); plt.legend(); plt.grid(True, alpha=0.3); plt.savefig('grafico.png', dpi=150, bbox_inches='tight'); plt.show().
Subplots: fig, axes = plt.subplots(2, 2, figsize=(14, 10)); axes[0,0].plot(t, temp); axes[0,1].scatter(umid, temp); axes[1,0].hist(temp, bins=30); axes[1,1].boxplot(dados_por_sensor). plt.tight_layout() evita sobreposição.
Plotly para gráficos interativos: import plotly.express as px; fig = px.line(df, x='timestamp', y='temperatura', color='dispositivo', title='Temperatura por dispositivo'); fig.update_layout(template='plotly_dark'); fig.show(). px.scatter_mapbox para mapas com dispositivos IoT geolocalizados.
SciPy para análise científica: from scipy import signal, stats, optimize. Filtros digitais: b, a = signal.butter(4, 0.1, btype='low'); filtrado = signal.filtfilt(b, a, dados_ruidosos). FFT: freq = np.fft.fftfreq(N, d=1/fs); espectro = np.abs(np.fft.fft(sinal)). stats.ttest_ind(grupo_a, grupo_b) — t-test para comparar médias. optimize.curve_fit(modelo, x, y) — ajuste de curvas.
Scikit-learn para machine learning clássico: from sklearn.preprocessing import StandardScaler; from sklearn.model_selection import train_test_split; from sklearn.ensemble import RandomForestClassifier; from sklearn.metrics import accuracy_score, confusion_matrix.
Pipeline típico ML: X, y = df[features], df['label']; X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42); scaler = StandardScaler(); X_train_scaled = scaler.fit_transform(X_train); X_test_scaled = scaler.transform(X_test); modelo = RandomForestClassifier(n_estimators=100); modelo.fit(X_train_scaled, y_train); acc = accuracy_score(y_test, modelo.predict(X_test_scaled)).
Regressão linear: from sklearn.linear_model import LinearRegression; reg = LinearRegression(); reg.fit(X_train, y_train); print(reg.coef_, reg.intercept_); y_pred = reg.predict(X_test); from sklearn.metrics import mean_squared_error, r2_score; rmse = np.sqrt(mean_squared_error(y_test, y_pred)); r2 = r2_score(y_test, y_pred).
Clustering para análise de dados de sensores: from sklearn.cluster import KMeans; km = KMeans(n_clusters=3, random_state=42); km.fit(X); labels = km.labels_; centroids = km.cluster_centers_. Visualizar: plt.scatter(X[:,0], X[:,1], c=labels, cmap='viridis'). DBSCAN para clusters de forma irregular: from sklearn.cluster import DBSCAN.
Detecção de anomalias em séries temporais de IoT: from sklearn.ensemble import IsolationForest; iso = IsolationForest(contamination=0.05); iso.fit(X); predicoes = iso.predict(X); anomalias = X[predicoes == -1]. Alternativa: z-score = (x - mean) / std; outlier se |z| > 3.
Web scraping com requests e BeautifulSoup: import requests; from bs4 import BeautifulSoup; resp = requests.get('https://exemplo.com', headers={'User-Agent':'Mozilla/5.0'}); soup = BeautifulSoup(resp.text, 'html.parser'); tabela = soup.find('table', class_='dados'); linhas = tabela.find_all('tr'); dados = [td.text.strip() for td in linhas[0].find_all('td')].
Selenium para scraping com JavaScript: from selenium import webdriver; from selenium.webdriver.common.by import By; driver = webdriver.Chrome(); driver.get('https://site.com'); elemento = driver.find_element(By.ID, 'btn-exportar'); elemento.click(); time.sleep(2); dados = driver.find_element(By.CLASS_NAME, 'tabela-dados').text; driver.quit().
Automação com Python: os e shutil para operações de arquivo: import os, shutil; os.makedirs('backups/2024', exist_ok=True); shutil.copy2('dados.csv', 'backups/2024/dados_backup.csv'); os.rename(arquivo_velho, arquivo_novo); glob.glob('logs/*.log') — padrão de arquivos.
subprocess para executar comandos do sistema: import subprocess; resultado = subprocess.run(['ping', '-c', '4', '192.168.1.1'], capture_output=True, text=True); print(resultado.stdout). Para streaming: proc = subprocess.Popen(['tail', '-f', '/var/log/sensor.log'], stdout=subprocess.PIPE, text=True). Automação de SSH com paramiko: import paramiko; ssh.connect('192.168.1.50', username='pi', password='raspberry').
Expressões regulares para parsing de logs de hardware: import re; padrao = r'TEMP:\s*([\d.]+)\s*C\s*UMID:\s*([\d.]+)%'; match = re.search(padrao, linha_log); temp, umid = float(match.group(1)), float(match.group(2)). re.findall() encontra todas as ocorrências. re.sub() faz substituição.
Agendamento de tarefas: schedule library: import schedule; schedule.every(30).seconds.do(ler_sensores); schedule.every().hour.do(enviar_relatorio); schedule.every().day.at('08:00').do(fazer_backup); while True: schedule.run_pending(); time.sleep(1). Para produção, use crontab (Linux) ou Task Scheduler (Windows).
Excel e PDF com Python: openpyxl para Excel: import openpyxl; wb = openpyxl.Workbook(); ws = wb.active; ws.append(['Timestamp', 'Temp', 'Umid']); ws.append([datetime.now().isoformat(), 25.3, 65.1]); wb.save('relatorio.xlsx'). xlsxwriter para formatação avançada: chart = workbook.add_chart({'type':'line'}). reportlab ou fpdf2 para PDF.
Pillow para processamento de imagens: from PIL import Image, ImageDraw, ImageFont; img = Image.open('captura.jpg'); img_redim = img.resize((640, 480)); img_cinza = img.convert('L'); pixels = np.array(img_cinza); hist = np.histogram(pixels, bins=256). Para câmera do RPi: from picamera2 import Picamera2; cam = Picamera2(); cam.start(); frame = cam.capture_array().
FastAPI para criar APIs REST para dados de IoT: from fastapi import FastAPI; app = FastAPI(); @app.get('/api/temperatura/{dispositivo}') async def get_temp(dispositivo: str): dados = db.query(dispositivo); return {'dispositivo': dispositivo, 'temperatura': dados.temp}. uvicorn main:app --host 0.0.0.0 --port 8080. Swagger UI automático em /docs.
SQLAlchemy para ORM: from sqlalchemy import create_engine, Column, Float, String; from sqlalchemy.orm import declarative_base, Session. Base = declarative_base(); class Leitura(Base): __tablename__ = 'leituras'; id = Column(Integer, primary_key=True); temperatura = Column(Float). engine = create_engine('sqlite:///iot.db'); Base.metadata.create_all(engine).
Análise de séries temporais com statsmodels: from statsmodels.tsa.seasonal import seasonal_decompose; resultado = seasonal_decompose(df['temperatura'], model='additive', period=24); resultado.trend.plot(); resultado.seasonal.plot(); resultado.resid.plot(). ARIMA para previsão: from statsmodels.tsa.arima.model import ARIMA; modelo = ARIMA(serie, order=(1,1,1)); ajuste = modelo.fit(); previsao = ajuste.forecast(steps=24).
Integração com InfluxDB: from influxdb_client import InfluxDBClient, Point; from influxdb_client.client.write_api import SYNCHRONOUS; client = InfluxDBClient(url='http://localhost:8086', token=TOKEN, org=ORG); write_api = client.write_api(write_options=SYNCHRONOUS); p = Point('temperatura').tag('device','esp32').field('value', 25.3); write_api.write(bucket='iot', record=p). Consulta: query = 'from(bucket:"iot") |> range(start:-1h)'; df = client.query_api().query_data_frame(query=query).
Jupyter Notebook é o ambiente interativo ideal para exploração de dados de IoT: %matplotlib inline para gráficos inline; %time para medir tempo de célula; %%timeit para benchmark. Widgets interativos: import ipywidgets as widgets; slider = widgets.IntSlider(min=0, max=100, step=1, value=50); @widgets.interact(threshold=slider): def filtrar(threshold): display(df[df['temp']>threshold]).
Boas práticas de ciência de dados: separar exploração (Notebook) de produção (scripts .py); versionar modelos com MLflow ou DVC; documentar experimentos; validação cruzada (cross_val_score) em vez de train/test simples; pipeline sklearn para evitar data leakage; feature engineering antes de modelagem; interpretabilidade com SHAP values.
A automação com Python é transformadora em projetos de IoT: coleta automática de dados de sensores, geração de relatórios, envio de alertas por e-mail (smtplib) ou Telegram (python-telegram-bot), upload para Google Sheets (gspread), backup automatizado, limpeza de logs antigos. Python transforma projetos de hardware em sistemas inteligentes e autônomos.`
      },
      {
        title: "PYTHON IA E MACHINE LEARNING EMBARCADO",
        text: `Inteligência Artificial e Machine Learning embarcado representam a fronteira mais avançada da integração entre Python e hardware. A capacidade de executar modelos de IA diretamente em microcontroladores e computadores de placa única sem conexão com nuvem abre possibilidades revolucionárias para IoT, robótica e automação.
TensorFlow e Keras são o framework mais popular para deep learning em Python. import tensorflow as tf; from tensorflow import keras. TF 2.x usa eager execution por padrão (execução imediata, como PyTorch). Keras é a API de alto nível integrada ao TF 2.
Criação de modelo com Keras Sequential API: model = keras.Sequential([keras.layers.Dense(64, activation='relu', input_shape=(10,)), keras.layers.Dropout(0.3), keras.layers.Dense(32, activation='relu'), keras.layers.Dense(1, activation='sigmoid')]). Para classificação multi-classe: activation='softmax' na última camada.
Compilação e treinamento: model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy']). history = model.fit(X_train, y_train, epochs=50, batch_size=32, validation_split=0.2, callbacks=[keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)]). EarlyStopping evita overfitting ao parar quando val_loss para de melhorar.
Redes Neurais Convolucionais (CNN) para visão computacional embarcada: model = keras.Sequential([keras.layers.Conv2D(32,(3,3),activation='relu',input_shape=(64,64,3)), keras.layers.MaxPooling2D(2,2), keras.layers.Conv2D(64,(3,3),activation='relu'), keras.layers.MaxPooling2D(2,2), keras.layers.Flatten(), keras.layers.Dense(128,activation='relu'), keras.layers.Dense(num_classes,activation='softmax')]).
Arquiteturas pré-treinadas para transfer learning: base = keras.applications.MobileNetV2(input_shape=(96,96,3), include_top=False, weights='imagenet'); base.trainable = False; model = keras.Sequential([base, keras.layers.GlobalAveragePooling2D(), keras.layers.Dense(num_classes,activation='softmax')]). MobileNetV2 é compacto e eficiente para edge.
Data augmentation para aumentar dataset de imagens: datagen = keras.preprocessing.image.ImageDataGenerator(rotation_range=20, width_shift_range=0.2, height_shift_range=0.2, shear_range=0.2, zoom_range=0.2, horizontal_flip=True). train_generator = datagen.flow_from_directory('dataset/train', target_size=(96,96), batch_size=32).
Avaliação de modelos: test_loss, test_acc = model.evaluate(X_test, y_test); y_pred = model.predict(X_test); from sklearn.metrics import classification_report, confusion_matrix; print(classification_report(y_true, np.argmax(y_pred, axis=1))). Matriz de confusão: cm = confusion_matrix(y_true, y_pred_classes); sns.heatmap(cm, annot=True).
Curvas de aprendizado: plt.plot(history.history['loss'], label='Train Loss'); plt.plot(history.history['val_loss'], label='Val Loss'); plt.plot(history.history['accuracy'], label='Train Acc'). Overfitting: train loss cai, val loss sobe. Underfitting: ambas altas. Learning rate scheduling: keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3).
TensorFlow Lite (TFLite) converte modelos Keras/TF para formato compacto binário (.tflite) para edge deployment. Conversão: converter = tf.lite.TFLiteConverter.from_keras_model(model); tflite_model = converter.convert(); with open('model.tflite','wb') as f: f.write(tflite_model). Tamanho típico: MobileNetV1 = 4 MB, MobileNetV2 = 3.4 MB, personalizados <500 KB.
Quantização para reduzir modelo: INT8 post-training quantization: converter.optimizations = [tf.lite.Optimize.DEFAULT]; converter.representative_dataset = lambda: ({'input': [x]} for x in X_calibracao); converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]; converter.inference_input_type = tf.int8; converter.inference_output_type = tf.int8. Redução de 4x no tamanho e 2-4x na velocidade de inferência.
Inferência TFLite em Python (dispositivo edge/RPi): interpreter = tf.lite.Interpreter(model_path='model.tflite'); interpreter.allocate_tensors(); input_details = interpreter.get_input_details(); output_details = interpreter.get_output_details(); input_data = np.expand_dims(imagem_preprocessada, axis=0).astype(np.float32); interpreter.set_tensor(input_details[0]['index'], input_data); interpreter.invoke(); output = interpreter.get_tensor(output_details[0]['index']).
TFLite Micro para MCUs (ESP32, Cortex-M): não é Python puro, mas o modelo .tflite gerado em Python é deployed em C++. Fluxo: treinar em Python/TF → converter para .tflite → quantizar → converter para array C com xxd -i model.tflite > model_data.cc → incluir no projeto C++/Arduino com TFLite Micro library. Arena de 100-300 KB é típica.
PyTorch é o framework preferido para pesquisa e cada vez mais para produção. import torch; import torch.nn as nn. Tensores: t = torch.tensor([[1.0, 2.0], [3.0, 4.0]]); t.shape; t.dtype; t.to('cuda') para GPU. Operações: torch.matmul(A, B); torch.sigmoid(x); F.relu(x); nn.Conv2d(in_ch, out_ch, kernel_size).
Modelo PyTorch: class MeuModelo(nn.Module): def __init__(self): super().__init__(); self.conv1 = nn.Conv2d(1,32,3); self.pool = nn.MaxPool2d(2); self.fc1 = nn.Linear(32*13*13,128); self.fc2 = nn.Linear(128,10). def forward(self,x): x=F.relu(self.conv1(x)); x=self.pool(x); x=x.view(-1,32*13*13); return self.fc2(F.relu(self.fc1(x))).
Training loop PyTorch: optimizer = torch.optim.Adam(model.parameters(), lr=0.001); criterion = nn.CrossEntropyLoss(). for epoch in range(epochs): for batch_x, batch_y in train_loader: optimizer.zero_grad(); outputs = model(batch_x); loss = criterion(outputs, batch_y); loss.backward(); optimizer.step(). torch.save(model.state_dict(), 'model.pt').
Exportar PyTorch para ONNX: dummy_input = torch.randn(1, 3, 224, 224); torch.onnx.export(model, dummy_input, 'model.onnx', input_names=['input'], output_names=['output'], dynamic_axes={'input':{0:'batch_size'}, 'output':{0:'batch_size'}}). ONNX model pode ser otimizado para edge com ONNX Runtime ou convertido para TFLite.
ONNX Runtime para inferência eficiente: import onnxruntime as ort; session = ort.InferenceSession('model.onnx', providers=['CUDAExecutionProvider','CPUExecutionProvider']); input_name = session.get_inputs()[0].name; output = session.run(None, {input_name: input_data}). Suporte nativo a ARM (Raspberry Pi, Jetson).
OpenCV para visão computacional: import cv2. Captura de câmera: cap = cv2.VideoCapture(0); ret, frame = cap.read(); cap.release(). Operações: gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY); blurred = cv2.GaussianBlur(gray, (5,5), 0); edges = cv2.Canny(blurred, 100, 200); contornos, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE).
Detecção de faces com OpenCV Haar Cascades: face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'); faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30,30)); for (x,y,w,h) in faces: cv2.rectangle(frame,(x,y),(x+w,y+h),(255,0,0),2).
Detecção de objetos com YOLOv8 (ultralytics): from ultralytics import YOLO; model = YOLO('yolov8n.pt'); results = model('imagem.jpg'); results[0].boxes.xyxy; results[0].boxes.conf; results[0].boxes.cls. YOLOv8n (nano) cabe em ARM com boa performance. yolov8n.tflite para TFLite Micro.
MobileNet SSD para detecção em tempo real no RPi: baixar tflite model do TF Hub; preprocessar: img = cv2.resize(frame,(300,300)); inp = np.expand_dims(img,0).astype(np.uint8); interpreter.set_tensor(input_id, inp); interpreter.invoke(); scores = interpreter.get_tensor(scores_id)[0]; boxes = interpreter.get_tensor(boxes_id)[0]; classe_detectada = classes[np.argmax(scores)].
Segmentação semântica com DeepLab: útil para robótica (detectar chão, objetos). Mais pesado que detecção; Lite versões disponíveis. Para contagem de plantas em agricultura de precisão: segmenta vegetação (verde) vs solo. Alternativa leve: classificador de patches de imagem com CNN pequena customizada.
Reconhecimento de gestos e poses: MediaPipe (Google) tem soluções pré-treinadas: pip install mediapipe; import mediapipe as mp; hands = mp.solutions.hands.Hands(); results = hands.process(rgb_frame); if results.multi_hand_landmarks: pontos = results.multi_hand_landmarks[0].landmark; dedo_indicador = pontos[8]. Leve o suficiente para RPi 4.
Edge Impulse é uma plataforma no-code/low-code para ML embarcado: coleta dados via Serial/BLE/WiFi diretamente do dispositivo (Arduino, ESP32, RPi); realiza feature extraction (MFCC para áudio, espectrograma, acelerômetro); treina CNN ou Decision Tree na nuvem; exporta modelo como biblioteca Arduino, C++, Python ou TFLite. SDK Python para automação.
Inferência de detecção de anomalias em sinais de sensores: sequências temporais de vibração (MPU6050) → CNN-LSTM → anomalia = componente com defeito. Processo: coletar dados normais → treinar autoencoder → threshold no erro de reconstrução → produção: se erro > threshold, alerta de anomalia. Funciona offline no gateway.
Aceleração de inferência: ONNX Runtime com extensões ARM: pip install ort-nightly-arm; habilita NEON instructions. TFLite com XNNPACK delegate: interpreter = tf.lite.Interpreter(model_path='m.tflite', experimental_delegates=[tf.lite.experimental.load_delegate('libXNNPACK.dylib')]). Coral USB Accelerator (Edge TPU): inferência 100x mais rápida no RPi via USB.
Reconhecimento de voz (Keyword Spotting) embarcado: modelo wake word (Hey Alexa, OK Google) roda localmente. Python: speechbrain, porcupine (Picovoice). No MCU: tflite model de keyword spotting com MFCC features do microfone. Processo: buffer de 1s de áudio → FFT → MFCC (13-40 coeficientes) → CNN-1D → score do keyword.
Análise de qualidade de ar com ML: CO2, VOC, temperatura, umidade → regressão para prever índice de qualidade. Feature engineering: razão CO2/VOC, hora do dia, histórico de 10 min. Modelo leve: Random Forest (sklearn) exportado com joblib: modelo = joblib.load('qualidade_ar.pkl'); predicao = modelo.predict([[co2, voc, temp, umid, hora]]).
Transfer learning para casos de uso customizados: começar com MobileNetV2 pré-treinado no ImageNet (reconhece 1000 classes gerais) → substituir última camada por Dense(num_minhas_classes) → fine-tune somente as últimas N camadas → treinar com dataset pequeno (100-500 imagens por classe é suficiente). Acurácia de 90%+ com dataset limitado.
Data augmentation avançada para datasets de IoT pequenos: from tensorflow.keras.layers import RandomFlip, RandomRotation, RandomZoom, RandomContrast; augmentation = keras.Sequential([RandomFlip('horizontal'), RandomRotation(0.2), RandomZoom(0.2), RandomContrast(0.1)]). Mix-up augmentation: combina pares de imagens com seus labels para regularização.
Quantization-aware training para melhor acurácia em INT8: import tensorflow_model_optimization as tfmot; qat_model = tfmot.quantization.keras.quantize_model(model); qat_model.compile(...); qat_model.fit(X_train, y_train, epochs=10); converter = tf.lite.TFLiteConverter.from_keras_model(qat_model); converter.optimizations = [tf.lite.Optimize.DEFAULT]; tflite_qat_model = converter.convert(). Melhor acurácia que post-training quantization.
MLflow para rastreamento de experimentos: import mlflow; with mlflow.start_run(): mlflow.log_param('learning_rate', 0.001); mlflow.log_param('epochs', 50); mlflow.log_metric('test_accuracy', 0.94); mlflow.tensorflow.log_model(model, 'model'). mlflow ui inicia dashboard web para comparar experimentos.
Federated Learning para IoT com privacidade: dispositivos treinam modelos localmente com dados privados → enviam apenas gradientes (não dados) ao servidor → servidor agrega → modelo global melhorado retorna aos devices. TensorFlow Federated (TFF) e PySyft implementam FL em Python. Preserva privacidade: dados de saúde nunca saem do dispositivo.
Otimização de hiperparâmetros com Optuna: import optuna; def objective(trial): lr=trial.suggest_float('lr',1e-5,1e-1,log=True); n_units=trial.suggest_int('n_units',32,256); ... model = criar_modelo(lr,n_units); ... return val_acc. study=optuna.create_study(direction='maximize'); study.optimize(objective,n_trials=100). Mais eficiente que grid search.
Deployment em produção com ONNX Runtime Server ou TF Serving: docker pull tensorflow/serving; docker run -p 8501:8501 -v /models:/models tensorflow/serving --model_base_path=/models/meu_modelo --model_name=sensor_classifier. requests.post('http://localhost:8501/v1/models/sensor_classifier:predict', json={'instances': X_novo.tolist()}).
O futuro do ML embarcado aponta para modelos cada vez menores e mais eficientes: arquiteturas Neural Architecture Search (NAS) como EfficientNet-Lite, MNASNet, MCUNet; quantização de 4 bits; pruning (poda de neurônios inativos) com 80% de sparsidade sem perda de acurácia. A Arm introduziu ethos-U55 (NPU embarcada em Cortex-M55) para inferência local em microcontroladores. Python continuará sendo a linguagem primária para treinamento, análise e pipeline de dados — mesmo que a inferência final rode em C++ no hardware.`
      }
    ]
  };

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-[4rem] overflow-hidden shadow-2xl flex flex-col min-h-[900px]">
      <div className="px-12 py-10 bg-neutral-950/50 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter">BASE DE CONHECIMENTO V12</h3>
           <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.3em]">C++ & JavaScript & Python Core Training</p>
        </div>
        <div className="flex bg-neutral-900 p-1.5 rounded-2xl border border-white/5 gap-2">
           <button
             onClick={() => { setActiveLang("cpp"); setActivePart(0); }}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeLang === "cpp" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}
           >
             C++ HARDWARE
           </button>
           <button
             onClick={() => { setActiveLang("js"); setActivePart(0); }}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeLang === "js" ? "bg-white text-black" : "text-neutral-500 hover:text-white"}`}
           >
             JAVASCRIPT IoT
           </button>
           <button
             onClick={() => { setActiveLang("py"); setActivePart(0); }}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeLang === "py" ? "bg-amber-500 text-neutral-950" : "text-neutral-500 hover:text-white"}`}
           >
             🐍 PYTHON
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
                   <button
                     onClick={() => {
                       const lessonKey = `${activeLang}:${activePart}`;
                       if (!completedLessons.has(lessonKey)) {
                         const next = new Set(completedLessons);
                         next.add(lessonKey);
                         setCompletedLessons(next);
                         if (codeProgressKey) localStorage.setItem(codeProgressKey, JSON.stringify([...next]));
                         claimEvent(`code_lesson_complete:${activeLang}:${activePart}`, 15);
                       }
                     }}
                     className={`px-10 h-14 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all ${
                       completedLessons.has(`${activeLang}:${activePart}`)
                         ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default"
                         : "bg-cyan-500 text-neutral-950"
                     }`}
                   >
                     {completedLessons.has(`${activeLang}:${activePart}`) ? "✓ CONCLUÍDO" : `CONCLUIR MÓDULO 0${activePart + 1}`}
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
  const [activeModulo, setActiveModulo] = useState<Modulo>("basico");
  const [moduloPanelOpen, setModuloPanelOpen] = useState(false);

  const moduloIcons: Record<Modulo, any> = {
    basico: Layers,
    intermediario: Zap,
    pro: Trophy,
  };

  const moduloColors: Record<Modulo, string> = {
    basico:        "cyan",
    intermediario: "amber",
    pro:           "red",
  };

  const trilhaIcons: Record<Trilha, any> = {
    eletronica:    Zap,
    arduino:       Cpu,
    sensores:      Activity,
    eletro_inter:  Zap,
    arduino_inter: Code,
    redes_inter:   MessageSquare,
    eletro_pro:    Sparkles,
    firmware_pro:  Terminal,
    iot_pro:       Box,
  };

  const currentTrilhas = MODULO_INFO[activeModulo].trilhas;
  const totalQ = currentTrilhas.reduce((a, t) => a + QUESTIONS[t].length, 0);
  const totalBest = currentTrilhas.reduce((a, t) => a + (progress[t]?.best || 0), 0);
  const overallPct = totalQ > 0 ? (totalBest / totalQ) * 100 : 0;

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
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header com seta ao lado do título */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3 relative">
          <h2 className="text-5xl font-black tracking-tighter uppercase">
            CENTRO DE <span className="text-cyan-400">CERTIFICAÇÃO</span>
          </h2>

          {/* Seta ao lado do título */}
          <div className="relative">
            <button
              onClick={() => setModuloPanelOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                moduloPanelOpen
                  ? "bg-cyan-500 text-neutral-950 border-cyan-500 shadow-lg shadow-cyan-500/20"
                  : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-cyan-500/40 hover:text-white"
              }`}
              title="Selecionar módulo"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${moduloPanelOpen ? "rotate-90" : ""}`} />
              <span className="text-[9px]">
                {activeModulo === "basico" ? "Básico" : activeModulo === "intermediario" ? "Inter." : "Pro"}
              </span>
            </button>

            {/* Dropdown de módulos — abre abaixo do botão */}
            <AnimatePresence>
              {moduloPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-12 z-30 bg-neutral-900 border border-white/10 rounded-[1.5rem] p-3 shadow-2xl shadow-black/60 min-w-[230px] space-y-2"
                >
                  <p className="text-[8px] font-black text-neutral-600 uppercase tracking-[0.2em] px-2 pb-1">MÓDULOS</p>
                  {(["basico", "intermediario", "pro"] as Modulo[]).map(m => {
                    const MIcon = moduloIcons[m];
                    const isActive = activeModulo === m;
                    const colorClass = {
                      basico: isActive ? "bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/20" : "text-neutral-400 hover:bg-white/5 hover:text-cyan-400",
                      intermediario: isActive ? "bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20" : "text-neutral-400 hover:bg-white/5 hover:text-amber-400",
                      pro: isActive ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-neutral-400 hover:bg-white/5 hover:text-red-400",
                    }[m];
                    return (
                      <button key={m} onClick={() => { setActiveModulo(m); setModuloPanelOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${colorClass}`}>
                        <MIcon className="w-4 h-4" />
                        {m === "basico" ? "Módulo 1 — Básico" : m === "intermediario" ? "Módulo 2 — Intermediário" : "Módulo 3 — Pro"}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="text-neutral-500 font-medium max-w-xl mx-auto text-sm">3 módulos de dificuldade crescente · cada um com 3 trilhas de 30 questões</p>
      </div>

      {/* Barra de progresso do módulo */}
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
          <span>Performance — {MODULO_INFO[activeModulo].label}</span>
          <span>{totalBest} / {totalQ}</span>
        </div>
        <div className="h-3 bg-neutral-900 rounded-full border border-white/5 overflow-hidden">
          <motion.div
            key={activeModulo}
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            className={`h-full shadow-[0_0_15px] ${
              activeModulo === "basico" ? "bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-cyan-500/40" :
              activeModulo === "intermediario" ? "bg-gradient-to-r from-amber-600 to-amber-400 shadow-amber-500/40" :
              "bg-gradient-to-r from-red-600 to-red-400 shadow-red-500/40"
            }`}
          />
        </div>
      </div>

      {/* Trilha cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModulo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {currentTrilhas.map(trilha => {
            const info = TRILHA_INFO[trilha];
            const prog = progress[trilha] ?? { best: null, completed: false };
            const size = QUESTIONS[trilha].length;
            const isDone = prog.completed;
            const TIcon = trilhaIcons[trilha];

            const accentClass: Record<Modulo, string> = {
              basico: isDone ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40" : "border-white/10 bg-neutral-900 hover:border-cyan-500/50 hover:bg-neutral-800",
              intermediario: isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-neutral-900 hover:border-amber-500/50 hover:bg-neutral-800",
              pro: isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-neutral-900 hover:border-red-500/50 hover:bg-neutral-800",
            };
            const iconClass: Record<Modulo, string> = {
              basico: isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform",
              intermediario: isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform",
              pro: isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform",
            };

            return (
              <button
                key={trilha}
                onClick={() => setActiveTrilha(trilha)}
                className={`text-left p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group ${accentClass[activeModulo]}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${iconClass[activeModulo]}`}>
                  {isDone ? <CheckCircle2 /> : <TIcon />}
                </div>
                <h4 className={`text-xl font-black uppercase tracking-tighter mb-2 ${isDone ? "text-emerald-400" : "text-white"}`}>
                  {info.label}
                </h4>
                <p className="text-neutral-500 text-xs font-medium leading-relaxed">{info.desc}</p>
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{size} questões</span>
                  {prog.best !== null && (
                    <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDone ? "text-emerald-500" : activeModulo === "basico" ? "text-cyan-400" : activeModulo === "intermediario" ? "text-amber-400" : "text-red-400"}`}>
                      {isDone ? <Trophy className="w-3 h-3" /> : null}
                      Melhor: {prog.best}/{size}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 pt-4 border-t border-white/5">
        {(["basico","intermediario","pro"] as Modulo[]).map(m => {
          const done = MODULO_INFO[m].trilhas.filter(t => progress[t]?.completed).length;
          const total = MODULO_INFO[m].trilhas.length;
          return (
            <div key={m} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-neutral-600">
              <div className={`w-2 h-2 rounded-full ${m === "basico" ? "bg-cyan-500" : m === "intermediario" ? "bg-amber-500" : "bg-red-500"}`} />
              {MODULO_INFO[m].label}: {done}/{total} trilhas completas
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectsView({ onGoToCircuit }: { onGoToCircuit?: (board: HardwareItem | null, comps: HardwareItem[], code?: string, title?: string) => void }) {
  const [selectedBoard, setSelectedBoard] = useState<HardwareItem | null>(null);
  const [boardPanelOpen, setBoardPanelOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<number>(2); // Default to 2 components

  // Resolve nomes de componentes para HardwareItems
  const allHardware = [...DATA_PLACAS, ...DATA_COMPONENTES, ...DATA_PC_HARDWARE];
  const resolveComponents = (names: string[]): HardwareItem[] =>
    names.map(name =>
      allHardware.find(h => h.nome.toLowerCase().includes(name.toLowerCase().substring(0, 8))) ||
      allHardware.find(h => name.toLowerCase().includes(h.nome.toLowerCase().substring(0, 8)))
    ).filter(Boolean) as HardwareItem[];

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

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-40">

      {/* Header com seta ao lado do título */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3 relative">
          <h2 className="text-5xl font-black tracking-tighter uppercase">
            PROJETOS <span className="text-cyan-400">PRONTOS</span>
          </h2>

          {/* Seta ao lado do título */}
          <div className="relative">
            <button
              onClick={() => setBoardPanelOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                boardPanelOpen
                  ? "bg-cyan-500 text-neutral-950 border-cyan-500 shadow-lg shadow-cyan-500/20"
                  : "bg-neutral-900 border-white/5 text-neutral-400 hover:border-cyan-500/40 hover:text-white"
              }`}
              title="Selecionar placa"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${boardPanelOpen ? "rotate-90" : ""}`} />
              <span className="text-[9px] max-w-[80px] truncate">
                {selectedBoard ? selectedBoard.nome.split(' ').slice(0,2).join(' ') : "Placa"}
              </span>
            </button>

            {/* Dropdown de placas — abre abaixo do botão */}
            <AnimatePresence>
              {boardPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-12 z-30 bg-neutral-900 border border-white/10 rounded-[1.5rem] p-3 shadow-2xl shadow-black/60 min-w-[240px] space-y-1 max-h-72 overflow-y-auto scrollbar-visible"
                >
                  <p className="text-[8px] font-black text-neutral-600 uppercase tracking-[0.2em] px-2 pb-1">PLACA DO PROJETO</p>
                  <button
                    onClick={() => { setSelectedBoard(null); setBoardPanelOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      !selectedBoard ? "bg-neutral-700 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-base">🔧</span> Qualquer placa
                  </button>
                  {DATA_PLACAS.map(placa => (
                    <button
                      key={placa.id}
                      onClick={() => { setSelectedBoard(placa); setBoardPanelOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedBoard?.id === placa.id
                          ? "bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/20"
                          : "text-neutral-400 hover:bg-white/5 hover:text-cyan-400"
                      }`}
                    >
                      <img src={placa.image} className="w-7 h-7 object-contain shrink-0 grayscale" referrerPolicy="no-referrer" />
                      <span className="truncate">{placa.nome}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-neutral-500 text-sm font-medium">
          {selectedBoard
            ? <><span className="text-cyan-400 font-black">{selectedBoard.nome}</span> · escolha a complexidade abaixo</>
            : "Selecione uma placa para filtrar os projetos"}
        </p>
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
                   <div className="flex items-center gap-2">
                     {onGoToCircuit && (
                       <button
                         onClick={e => {
                           e.stopPropagation();
                           const comps = resolveComponents(proj.components);
                           onGoToCircuit(selectedBoard, comps, proj.code, proj.title);
                         }}
                         className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-neutral-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                       >
                         <CircuitBoard className="w-3.5 h-3.5" /> GO!
                       </button>
                     )}
                     <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-2 transition-transform" />
                   </div>
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
                  {onGoToCircuit && (
                    <button
                      onClick={() => {
                        const comps = resolveComponents(selectedProject.components);
                        setSelectedProject(null);
                        onGoToCircuit(selectedBoard, comps, selectedProject.code, selectedProject.title);
                      }}
                      className="w-full h-14 bg-emerald-500 text-neutral-950 rounded-2xl font-black text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                    >
                      <CircuitBoard className="w-5 h-5" />
                      GO! — ABRIR NO CIRCUITO
                    </button>
                  )}
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

function NotebookView({ content, setContent, lastSync, onSave }: { content: string, setContent: any, lastSync: string | null, onSave: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved]   = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Ctrl+S para salvar
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-40">
      <div className="flex items-center justify-between flex-wrap gap-4">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 shadow-lg">
               <StickyNote className="w-6 h-6" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Bloco de Notas</h3>
               <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  Salvo na conta · {lastSync ? `Última vez: ${lastSync}` : "Não salvo ainda"}
                  {lastSync && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
               </p>
            </div>
         </div>

         {/* Botão de Salvar */}
         <button
           onClick={handleSave}
           disabled={saving}
           className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
             saved
               ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
               : "bg-cyan-500 text-neutral-950 hover:scale-105 active:scale-95 shadow-cyan-500/20 disabled:opacity-60"
           }`}
         >
           {saving ? (
             <><span className="animate-spin">⟳</span> Salvando...</>
           ) : saved ? (
             <><CheckCircle2 className="w-4 h-4" /> Salvo na Conta!</>
           ) : (
             <><Save className="w-4 h-4" /> Salvar na Conta</>
           )}
         </button>
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
