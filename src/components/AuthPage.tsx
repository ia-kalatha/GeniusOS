import React, { useState } from "react";
import bcrypt from "bcryptjs";
import { User } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Mail, User as UserIcon, Calendar, ArrowRight, ShieldCheck, Cpu, Key, Eye, EyeOff, Sparkles, X, ChevronRight, Play, Layout, MessageSquare, Terminal, GraduationCap, Target, PenTool, HandMetal, Zap } from "lucide-react";

const BCRYPT_ROUNDS = 10;
const RECOVERY_TTL_MS = 15 * 60 * 1000;
const MAX_PROFILE_IMAGE_BYTES = 500 * 1024;

const isHashedPassword = (pw: string) => typeof pw === "string" && pw.startsWith("$2");
const verifyPassword = (plain: string, stored: string): boolean => {
  if (!plain || !stored) return false;
  if (isHashedPassword(stored)) return bcrypt.compareSync(plain, stored);
  return plain === stored;
};

interface AuthPageProps {
  onLogin: (user: User) => void;
  onClose?: () => void;
}

type AuthMode = "login" | "register" | "forgot" | "verify" | "reset" | "welcome" | "questionnaire";

export default function AuthPage({ onLogin, onClose }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryUser, setRecoveryUser] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [qStep, setQStep] = useState(0);

  const tourSlides = [
    { title: "PLACAS", desc: "Conheça as principais placas de microcontroladores, do Arduino ao ESP32, com specs e exemplos.", icon: Cpu },
    { title: "WORKSPACE", desc: "Monte seu circuito virtualmente e gere documentação técnica completa com IA.", icon: Layout },
    { title: "ASSISTENTE IA", desc: "Tire dúvidas de hardware e código em tempo real com IA treinada para eletrônica.", icon: MessageSquare },
    { title: "TRILHAS DE CÓDIGO", desc: "Aulas estruturadas de C++ e JavaScript voltadas a microcontroladores.", icon: Terminal },
    { title: "CERTIFICAÇÃO", desc: "Teste seu conhecimento por nível e receba certificado ao concluir cada trilha.", icon: GraduationCap },
  ];

  const questions = [
    { id: "focus", label: "QUAL O SEU FOCO?", options: ["Robótica", "IoT", "IA de Borda", "Automação Residencial", "Aprender do zero"], icon: Target },
    { id: "expLevel", label: "QUAL SEU NÍVEL DE EXPERIÊNCIA?", options: ["Iniciante", "Intermediário", "Avançado", "Profissional"], icon: Zap }
  ];

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    recoveryContact: "",
    recoveryCode: "",
    newPassword: "",
    profileImage: "",
    focus: "",
    expLevel: "",
    mainTool: "",
    motivation: ""
  });

  const handleQuestionAnswer = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
    if (qStep < questions.length - 1) {
      setQStep(qStep + 1);
    } else {
      setMode("register");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Arquivo inválido. Selecione uma imagem (PNG, JPG, WEBP).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError(`Imagem muito grande. Limite: ${Math.round(MAX_PROFILE_IMAGE_BYTES / 1024)} KB.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.startsWith("data:image/")) return;
      setFormData({ ...formData, profileImage: result });
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  // ── LOCAL STORAGE AUTH (Netlify-compatible, no backend required) ──────────
  // Senhas guardadas com hash bcrypt. Códigos de recuperação têm TTL de 15 min.
  // Migração: contas antigas com senha plaintext são re-hashadas no primeiro login OK.
  const DB_KEY = "devgenius_v12_users";
  const CODES_KEY = "devgenius_v12_codes";
  type RecoveryRecord = { code: string; expiresAt: number };

  const getLocalUsers = (): any[] => {
    try { return JSON.parse(localStorage.getItem(DB_KEY) || "[]"); } catch { return []; }
  };
  const saveLocalUsers = (users: any[]) => {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
  };
  const getLocalCodes = (): Record<string, RecoveryRecord> => {
    try {
      const raw: Record<string, unknown> = JSON.parse(localStorage.getItem(CODES_KEY) || "{}");
      const now = Date.now();
      const out: Record<string, RecoveryRecord> = {};
      for (const k of Object.keys(raw)) {
        const v = raw[k];
        if (v && typeof v === "object" && typeof (v as RecoveryRecord).code === "string" && typeof (v as RecoveryRecord).expiresAt === "number") {
          if ((v as RecoveryRecord).expiresAt > now) out[k] = v as RecoveryRecord;
        }
      }
      return out;
    } catch { return {}; }
  };
  const saveLocalCodes = (codes: Record<string, RecoveryRecord>) => {
    localStorage.setItem(CODES_KEY, JSON.stringify(codes));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const users = getLocalUsers();
        const idx = users.findIndex((u: any) => u.username === formData.username);
        if (idx === -1 || !verifyPassword(formData.password, users[idx].password)) {
          throw new Error("Credenciais inválidas. Verifique seu usuário e senha.");
        }
        // Migração transparente plaintext → bcrypt no primeiro login OK.
        if (!isHashedPassword(users[idx].password)) {
          users[idx].password = bcrypt.hashSync(formData.password, BCRYPT_ROUNDS);
          saveLocalUsers(users);
        }
        const user = users[idx];
        onLogin({ username: user.username, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage });

      } else if (mode === "register") {
        if (!formData.firstName || !formData.email || !formData.username || !formData.password) {
          throw new Error("Preencha todos os campos obrigatórios.");
        }
        if (formData.password.length < 8) {
          throw new Error("A senha deve ter pelo menos 8 caracteres.");
        }
        const users = getLocalUsers();
        if (users.find((u: any) => u.username === formData.username)) {
          throw new Error("O nome de usuário já está em uso por outro maker.");
        }
        const passwordHash = bcrypt.hashSync(formData.password, BCRYPT_ROUNDS);
        const newUser = { ...formData, password: passwordHash, id: Date.now().toString(), notes: "" };
        saveLocalUsers([...users, newUser]);
        onLogin({ username: formData.username, firstName: formData.firstName, lastName: formData.lastName, profileImage: formData.profileImage });

      } else if (mode === "forgot") {
        const users = getLocalUsers();
        const user = users.find((u: any) => u.email === formData.recoveryContact || u.username === formData.recoveryContact);
        // Sem user enumeration: avança o fluxo mesmo se o contato não existe, mas só gera código real se existir.
        const code = Math.floor(10000 + Math.random() * 90000).toString();
        if (user) {
          const codes = getLocalCodes();
          codes[user.username] = { code, expiresAt: Date.now() + RECOVERY_TTL_MS };
          saveLocalCodes(codes);
          setRecoveryUser(user.username);
          // Sem SMTP integrado: em dev mostramos no console para facilitar teste.
          // Em produção (sem backend de email), a UX será "código não recebido" — limitação conhecida.
          if (import.meta.env.DEV) {
            console.info(`[devgenius] recovery code for ${user.username}: ${code}`);
          }
        } else {
          setRecoveryUser(null);
        }
        setMode("verify");

      } else if (mode === "verify") {
        const codes = getLocalCodes();
        const record = recoveryUser ? codes[recoveryUser] : undefined;
        if (!record || record.code !== formData.recoveryCode || record.expiresAt < Date.now()) {
          throw new Error("Código de verificação inválido ou expirado.");
        }
        setMode("reset");

      } else if (mode === "reset") {
        if (!formData.newPassword || formData.newPassword.length < 8) {
          throw new Error("Nova senha deve ter pelo menos 8 caracteres.");
        }
        if (!recoveryUser) throw new Error("Sessão de recuperação inválida. Reinicie o processo.");
        const codes = getLocalCodes();
        const record = codes[recoveryUser];
        if (!record || record.expiresAt < Date.now()) {
          throw new Error("Código de recuperação expirado. Solicite um novo.");
        }
        const users = getLocalUsers();
        const idx = users.findIndex((u: any) => u.username === recoveryUser);
        if (idx === -1) throw new Error("Falha crítica: Usuário não localizado.");
        users[idx].password = bcrypt.hashSync(formData.newPassword, BCRYPT_ROUNDS);
        saveLocalUsers(users);
        delete codes[recoveryUser];
        saveLocalCodes(codes);
        setMode("login");
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      <div className="w-full">
        <p className="mb-6 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
          FEITO POR DAVI <span className="text-red-500 animate-pulse">❤️</span> NO BR
        </p>
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-neutral-950 border border-white/10 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <img src="/logo.png" className="w-full h-full object-cover opacity-80" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">
            DEVGENIUS <span className="text-cyan-400">V12</span>
          </h1>
          <p className="text-neutral-400 text-sm mt-1 uppercase font-bold tracking-widest text-[10px]">Ultimate Hardware Tech Hub</p>
        </div>

        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 z-10" />
          
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-30 group"
            >
              <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}

          <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 z-20">
            <AnimatePresence mode="wait">
            {mode === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col items-center py-6 text-center space-y-8"
              >
                  <div className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/20 rounded-[2.5rem] flex items-center justify-center text-cyan-400 shadow-2xl">
                    <HandMetal className="w-10 h-10" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">BEM-VINDO AO <br/> <span className="text-cyan-400">DEVGENIUS</span></h2>
                    <p className="text-neutral-500 font-medium text-sm leading-relaxed max-w-[250px] mx-auto">Plataforma de estudo e prototipagem em hardware embarcado. Aprenda, construa e teste.</p>
                  </div>
                  <div className="w-full space-y-4 pt-4">
                    <button
                      onClick={() => setMode("login")}
                      className="w-full h-14 bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      JÁ TENHO CONTA
                    </button>
                    <button
                      onClick={() => setMode("questionnaire")}
                      className="w-full h-16 bg-cyan-500 text-neutral-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-cyan-500/20"
                    >
                      CRIAR MINHA CONTA
                    </button>
                  </div>
              </motion.div>
            )}

            {mode === "questionnaire" && (
              <motion.div
                key="questionnaire"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100, filter: "blur(10px)" }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-8 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-cyan-400">
                        {React.createElement(questions[qStep].icon, { className: "w-5 h-5" })}
                      </div>
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Passo {qStep + 1} de {questions.length}</span>
                   </div>
                   <div className="flex gap-1">
                      {questions.map((_, i) => (
                        <div key={i} className={`w-4 h-1 rounded-full transition-all ${i <= qStep ? "bg-cyan-500" : "bg-neutral-800"}`} />
                      ))}
                   </div>
                </div>

                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-8">
                  {questions[qStep].label}
                </h2>

                <div className="space-y-3 flex-1">
                   {questions[qStep].options.map((opt) => (
                     <button
                       key={opt}
                       onClick={() => handleQuestionAnswer(questions[qStep].id, opt)}
                       className="w-full p-4 bg-neutral-950 border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 rounded-2xl text-left text-sm font-bold text-neutral-400 hover:text-white transition-all flex items-center justify-between group"
                     >
                       {opt}
                       <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                     </button>
                   ))}
                </div>
              </motion.div>
            )}

            {mode !== "welcome" && mode !== "questionnaire" && (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
                  {mode === "login" && <><Lock className="w-5 h-5 text-cyan-400" /> Entrar na conta</>}
                  {mode === "register" && <><UserIcon className="w-5 h-5 text-cyan-400" /> Criar conta</>}
                  {mode === "forgot" && <><ShieldCheck className="w-5 h-5 text-cyan-400" /> Recuperar acesso</>}
                  {mode === "verify" && <><Key className="w-5 h-5 text-cyan-400" /> Verificar identidade</>}
                  {mode === "reset" && <><Lock className="w-5 h-5 text-emerald-400" /> Nova senha</>}
                </h2>

                <form onSubmit={handleAuth} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg animate-pulse">
                      {error}
                    </div>
                  )}

                  {mode === "register" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Nome</label>
                          <input
                            required
                            name="firstName"
                            autoComplete="given-name"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="Ex: João"
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Sobrenome</label>
                          <input
                            name="lastName"
                            autoComplete="family-name"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Opcional"
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Imagem de Perfil</label>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-center overflow-hidden">
                             {formData.profileImage ? (
                               <img src={formData.profileImage} className="w-full h-full object-cover" />
                             ) : (
                               <UserIcon className="w-5 h-5 text-neutral-700" />
                             )}
                          </div>
                          <label className="flex-1">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            <div className="w-full bg-neutral-950 border border-white/5 border-dashed rounded-xl p-3 text-[10px] font-black uppercase text-neutral-500 text-center cursor-pointer hover:bg-white/5 transition-all">
                              Selecionar Arquivo
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">E-mail</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            required
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="seu@email.com"
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Data de Nascimento</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            required
                            type="date"
                            name="birthDate"
                            autoComplete="bday"
                            value={formData.birthDate}
                            onChange={handleChange}
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {(mode === "login" || mode === "register") && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Nome de Usuário</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            required
                            name="username"
                            autoComplete="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="username_tech"
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            required
                            type={showPassword ? "text" : "password"}
                            name="password"
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-cyan-400 p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {mode === "forgot" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Usuário ou E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          required
                          name="recoveryContact"
                          value={formData.recoveryContact}
                          onChange={handleChange}
                          placeholder="Insira seu contato cadastrado"
                          className="w-full bg-neutral-950 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {mode === "verify" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                         <p className="text-[10px] font-black text-white uppercase tracking-tighter leading-tight">
                           // E-MAIL ENVIADO // <br/>
                           INSIRA O CÓDIGO DE 5 DÍGITOS DISPONÍVEL NO SEU CANAL DE COMUNICAÇÃO PARA PROSSEGUIR.
                         </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">CÓDIGO DE VERIFICAÇÃO</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            required
                            maxLength={5}
                            name="recoveryCode"
                            value={formData.recoveryCode}
                            onChange={handleChange}
                            placeholder="00000"
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-3xl font-black tracking-[0.3em] text-center focus:outline-none focus:border-cyan-500/50 transition-all placeholder:tracking-normal placeholder:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === "reset" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                         <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-relaxed">
                           Canal Seguro DevGenius V12 // Identidade Verificada para: <span className="text-white">{recoveryUser}</span>
                         </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 ml-1">Nova Senha</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            required
                            type="password"
                            name="newPassword"
                            autoComplete="new-password"
                            value={formData.newPassword}
                            onChange={handleChange}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full bg-neutral-950 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 pt-4">
                    <button
                      disabled={loading}
                      type="button"
                      onClick={() => setShowTour(true)}
                      className="w-full flex items-center justify-center gap-2 text-cyan-400 border border-cyan-500/20 bg-cyan-500/5 font-black py-4 rounded-xl hover:bg-cyan-500/10 transition-all text-xs tracking-widest"
                    >
                      <Play className="w-4 h-4 group-hover:scale-110 transition-transform" /> CONHECER A PLATAFORMA
                    </button>

                    <button
                      disabled={loading}
                      className={`w-full font-black py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50 ${
                        mode === "reset" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-cyan-500 hover:bg-cyan-400 text-neutral-950"
                      }`}
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          {mode === "login" ? "INICIAR SESSÃO" : mode === "register" ? "CRIAR CONTA" : mode === "forgot" ? "SOLICITAR CÓDIGO" : mode === "verify" ? "VERIFICAR CÓDIGO" : "ATUALIZAR CHAVE"}
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                    
                    {mode !== "login" && mode !== "register" && (
                    <button 
                      type="button"
                      onClick={() => setMode("login")}
                      className="w-full text-center text-neutral-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Voltar ao Login
                    </button>
                    )}
                  </div>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
                  {mode === "login" ? (
                    <>
                      <button 
                        type="button"
                        onClick={() => setMode("questionnaire")}
                        className="text-cyan-400 font-medium text-xs hover:underline decoration-cyan-400/30 text-left"
                      >
                        Não tem uma conta? <span className="font-bold">Cadastre-se</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-neutral-500 font-medium text-xs hover:text-neutral-300 transition-colors text-left"
                      >
                        Esqueceu sua senha?
                      </button>
                    </>
                  ) : mode === "register" && (
                    <button 
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-cyan-400 font-medium text-xs hover:underline decoration-cyan-400/30 text-left"
                    >
                      Já possui uma conta? <span className="font-bold">Entrar agora</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTour && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-[80vh] bg-neutral-900 border border-white/10 rounded-[3rem] overflow-hidden flex flex-col md:flex-row relative shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
            >
              <button 
                onClick={() => setShowTour(false)} 
                className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full md:w-1/2 bg-neutral-950 p-12 flex flex-col justify-between border-r border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] -mr-32 -mt-32" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                     <Sparkles className="w-5 h-5 text-cyan-400" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Tour DEVGENIUS</span>
                  </div>
                  <h3 className="text-5xl font-black text-white tracking-tighter uppercase leading-none mb-6">
                    O QUE VOCÊ <br/> <span className="text-cyan-400">ENCONTRA AQUI</span>
                  </h3>
                  <p className="text-neutral-500 font-medium text-lg leading-relaxed">
                    Catálogo de hardware, projetos guiados, assistente IA e certificação. Em um só lugar.
                  </p>
                </div>

                <div className="flex gap-2">
                   {tourSlides.map((_, i) => (
                     <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === tourIndex ? "w-12 bg-cyan-500" : "w-1.5 bg-neutral-800"}`} />
                   ))}
                </div>
              </div>

              <div className="flex-1 p-12 flex flex-col justify-center items-center text-center relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#0e749020_0%,transparent_70%)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tourIndex}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "anticipate" }}
                    className="flex flex-col items-center gap-8"
                  >
                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl">
                      {React.createElement(tourSlides[tourIndex].icon, { className: "w-10 h-10 text-cyan-400" })}
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-3xl font-black text-white tracking-tight uppercase">{tourSlides[tourIndex].title}</h4>
                      <p className="text-neutral-400 font-medium max-w-xs mx-auto leading-relaxed">{tourSlides[tourIndex].desc}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-12 w-full max-w-xs flex gap-4">
                  <button 
                    onClick={() => setTourIndex(prev => (prev > 0 ? prev - 1 : tourSlides.length - 1))}
                    className="w-16 h-16 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all border border-white/5"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <button 
                    onClick={() => {
                        if (tourIndex < tourSlides.length - 1) setTourIndex(tourIndex + 1);
                        else setShowTour(false);
                    }}
                    className="flex-1 bg-white text-neutral-950 rounded-2xl font-black tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
                  >
                    {tourIndex === tourSlides.length - 1 ? "FINALIZAR" : "PRÓXIMO"} <ChevronRight className="w-4 h-4" />
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
