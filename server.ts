import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DB_FILE           = path.join(process.cwd(), "users.json");
const MESSAGES_FILE     = path.join(process.cwd(), "messages.json");
const DMS_FILE          = path.join(process.cwd(), "dms.json");
const SCORES_FILE       = path.join(process.cwd(), "scores.json");
const REWARD_EVENTS_FILE= path.join(process.cwd(), "reward_events.json");
const REWARDS_CATALOG   = path.join(process.cwd(), "rewards_catalog.json");
const FOLLOWS_FILE      = path.join(process.cwd(), "follows.json");
const FRIEND_REQ_FILE   = path.join(process.cwd(), "friend_requests.json");
const MAX_SCORES    = 1000;
const MAX_MESSAGES  = 500;
const MAX_DMS       = 2000;
const MAX_EVENTS    = 10000;
const BCRYPT_ROUNDS = 10;

// ─── Rewards helpers ──────────────────────────────────────────────────────────
function loadEvents(): any[] {
  try { return JSON.parse(fs.readFileSync(REWARD_EVENTS_FILE, "utf-8")); } catch { return []; }
}
function saveEvents(evts: any[]) {
  fs.writeFileSync(REWARD_EVENTS_FILE, JSON.stringify(evts.slice(-MAX_EVENTS)));
}
function loadCatalog(): any[] {
  try { return JSON.parse(fs.readFileSync(REWARDS_CATALOG, "utf-8")); } catch { return []; }
}
function todayStr(): string {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

// Extrai prefixo do eventKey (antes do primeiro ":")
function eventPrefix(key: string): string { return key.split(":")[0]; }

// Mapa de eventos válidos: prefixo → maxCoins por chamada
const VALID_EVENTS: Record<string, { maxCoins: number; requiresMeta?: string }> = {
  trilha_perfect:        { maxCoins: 50 },
  provas_correct:        { maxCoins: 60 },
  collection_mark:       { maxCoins: 5 },
  project_complete:      { maxCoins: 20 },
  ia_module_complete:    { maxCoins: 30 },
  code_lesson_complete:  { maxCoins: 15 },
  community_message:     { maxCoins: 3 },
  dm_sent:               { maxCoins: 2 },
  flappy_milestone:      { maxCoins: 60, requiresMeta: "score" },
  dino_milestone:        { maxCoins: 60, requiresMeta: "score" },
  flappy_rank1:          { maxCoins: 25 },
  dino_rank1:            { maxCoins: 25 },
  login_streak:          { maxCoins: 25 },
};

// Caps diários por prefixo (null = sem cap)
const DAILY_CAPS: Record<string, number> = {
  community_message: 5,
  dm_sent: 10,
};

// Aplica multiplicador de boost se ativo no usuário
function applyBoost(user: any, coins: number): number {
  if (!user.boostUntil || Date.now() > user.boostUntil) return coins;
  return coins * 2;
}

// ─── Chat helpers ─────────────────────────────────────────────────────────────
function loadMessages(): any[] {
  try { return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8")); } catch { return []; }
}
function saveMessages(msgs: any[]) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
}

// ─── DM (Direct Messages) helpers ────────────────────────────────────────────
function loadDMs(): any[] {
  try { return JSON.parse(fs.readFileSync(DMS_FILE, "utf-8")); } catch { return []; }
}
function saveDMs(dms: any[]) {
  fs.writeFileSync(DMS_FILE, JSON.stringify(dms.slice(-MAX_DMS)));
}
function dmKey(a: string, b: string): string {
  return [a, b].sort().join("___");
}
const RECOVERY_TTL_MS = 15 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

// AI Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});
const GEMINI_MODEL = "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY não configurada no ambiente.");
}

// Security middleware — CSP intencionalmente permissivo para Vite dev (HMR ws + inline scripts)
// e para o app de produção que usa Google Fonts e imagens externas dos catálogos.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json({ limit: "2mb" }));

// Rate limits — uma instância da Gemini API por IP, e limites apertados no auth.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas requisições à IA. Aguarde um minuto antes de tentar novamente." },
});
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde antes de tentar de novo." },
});
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Limite de recuperação atingido. Tente novamente em 15 minutos." },
});

// Senhas pré-bcrypt eram salvas em plaintext. Detectamos pelo prefixo $2 do bcrypt
// e migramos no primeiro login bem-sucedido.
const isHashed = (pw: string) => typeof pw === "string" && pw.startsWith("$2");
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!plain || !stored) return false;
  if (isHashed(stored)) return bcrypt.compare(plain, stored);
  return plain === stored;
}

// Mock DB Initialization
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

function getUsers() {
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data);
}

function saveUsers(users: any[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

// ── Sistema de Nível ────────────────────────────────────────────────────────
function calcLevel(xp: number): { level: number; title: string; xpForCurrent: number; xpForNext: number; progress: number } {
  const level       = Math.floor(Math.sqrt(xp / 80)) + 1;
  const xpForCurrent= Math.pow(level - 1, 2) * 80;
  const xpForNext   = Math.pow(level, 2) * 80;
  const progress    = xpForNext > xpForCurrent ? (xp - xpForCurrent) / (xpForNext - xpForCurrent) : 1;
  const TITLES      = ["Iniciante","Aprendiz","Hacker","Desenvolvedor","Engenheiro","Arquiteto","Mestre","Lenda"];
  const titleIdx    = Math.min(Math.floor((level - 1) / 6), TITLES.length - 1);
  return { level, title: TITLES[titleIdx], xpForCurrent, xpForNext, progress: Math.min(progress, 1) };
}

// Adiciona XP ao usuário (usado sempre que coins são creditados)
function addXp(users: any[], uIdx: number, amount: number) {
  if (uIdx < 0 || uIdx >= users.length) return;
  users[uIdx].xp = (users[uIdx].xp || 0) + amount;
}

// Endpoint público: nível de um usuário
app.get("/api/profile/level/:username", (req, res) => {
  const { username } = req.params;
  const users = getUsers();
  const u = users.find((x: any) => x.username === username);
  if (!u) return res.status(404).json({ error: "Usuário não encontrado" });
  const xp = u.xp || 0;
  res.json({ xp, ...calcLevel(xp) });
});

// Sincroniza usuário do localStorage com o servidor (para sistema de recompensas)
app.post("/api/auth/sync", (req, res) => {
  const { username, firstName, lastName, profileImage } = req.body;
  if (!username) return res.status(400).json({ error: "username obrigatório" });
  const users = getUsers();
  const exists = users.findIndex((u: any) => u.username === username);
  if (exists === -1) {
    users.push({ username, firstName: firstName || username, lastName: lastName || "", profileImage: profileImage || null, coins: 0, purchasedItems: [], loginStreak: { lastLogin: "", count: 0 } });
    saveUsers(users);
  }
  const uIdx = exists === -1 ? users.length - 1 : exists;
  const userId = ensureUserId(users, uIdx);
  const u = users[uIdx];
  res.json({ ok: true, coins: u.coins || 0, purchasedItems: u.purchasedItems || [], userId });
});

// Auth API Routes
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { firstName, lastName, email, username, password, birthDate, profileImage, gender, focus, expLevel, mainTool, motivation } = req.body;

  if (!username || !password || !email || !firstName) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
  }

  const users = getUsers();

  if (users.find((u: any) => u.username === username)) {
    return res.status(400).json({ error: "O nome de usuário já está em uso por outro maker." });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const newUser = { firstName, lastName, email, username, password: passwordHash, birthDate, profileImage, gender, focus, expLevel, mainTool, motivation, id: Date.now().toString() };
  users.push(newUser);
  saveUsers(users);

  res.json({ message: "Usuário registrado com sucesso!", user: { username, firstName, lastName, profileImage, notes: [] } });
});

app.post("/api/auth/update-name", (req, res) => {
  const { username, firstName, lastName } = req.body;
  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username);

  if (userIdx === -1) return res.status(404).json({ error: "Usuário não encontrado." });

  const user = users[userIdx];
  const now = new Date();
  const lastChange = user.lastNameChange ? new Date(user.lastNameChange) : null;

  if (lastChange && (now.getTime() - lastChange.getTime()) < 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: "Você só pode mudar seu nome uma vez a cada 24 horas." });
  }

  users[userIdx].firstName = firstName;
  users[userIdx].lastName = lastName;
  users[userIdx].lastNameChange = now.toISOString();
  saveUsers(users);

  res.json({ message: "Nome atualizado com sucesso!", user: { firstName, lastName } });
});

app.post("/api/auth/update-email", authLimiter, async (req, res) => {
  const { username, currentEmail, password, newEmail } = req.body;
  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username);

  if (userIdx === -1) return res.status(404).json({ error: "Usuário não encontrado." });

  const user = users[userIdx];
  const ok = user.email === currentEmail && (await verifyPassword(password, user.password));
  if (!ok) {
    return res.status(401).json({ error: "E-mail ou senha atuais incorretos." });
  }

  users[userIdx].email = newEmail;
  saveUsers(users);

  res.json({ message: "E-mail atualizado com sucesso!", email: newEmail });
});

app.post("/api/auth/delete-account", authLimiter, async (req, res) => {
  const { username, email, password } = req.body;
  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username && u.email === email);

  if (userIdx === -1 || !(await verifyPassword(password, users[userIdx].password))) {
    return res.status(401).json({ error: "A validação falhou. Verifique os dados de exclusão." });
  }

  users.splice(userIdx, 1);
  saveUsers(users);

  res.json({ message: "Conta excluída permanentemente. Sentiremos sua falta no DevGenius." });
});

app.get("/api/notes/:username", (req, res) => {
  const { username } = req.params;
  const users = getUsers();
  const user = users.find((u: any) => u.username === username);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ notes: user.notes || [] });
});

app.post("/api/notes/:username", (req, res) => {
  const { username } = req.params;
  const { notes } = req.body;
  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username);
  if (userIdx === -1) return res.status(404).json({ error: "Usuário não encontrado." });
  
  users[userIdx].notes = notes;
  saveUsers(users);
  res.json({ message: "Bloco de notas sincronizado." });
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();

  const userIdx = users.findIndex((u: any) => u.username === username);
  if (userIdx === -1 || !(await verifyPassword(password, users[userIdx].password))) {
    return res.status(401).json({ error: "Credenciais inválidas. Verifique seu usuário e senha." });
  }

  // Migração transparente: senha legada em plaintext vira hash bcrypt no primeiro login OK.
  const user = users[userIdx];
  if (!isHashed(user.password)) {
    users[userIdx].password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    saveUsers(users);
  }

  // ── Login streak + coins automáticos ────────────────────────────────────
  let coinsAwarded = 0;
  const today = todayStr();
  const streak = user.loginStreak || { lastLogin: "", count: 0 };
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (streak.lastLogin !== today) {
    if (streak.lastLogin === yesterday) {
      streak.count = (streak.count || 0) + 1;
    } else if (streak.lastLogin < yesterday) {
      streak.count = 1;
    }
    streak.lastLogin = today;
    const baseCoins = streak.count > 0 && streak.count % 7 === 0 ? 25 : 10;
    coinsAwarded = applyBoost(users[userIdx], baseCoins);
    users[userIdx].loginStreak = streak;
    // Registra evento como PENDENTE (usuário resgata no histórico)
    const evts = loadEvents();
    evts.push({ id: Date.now().toString(36), username: user.username, eventKey: `login_streak:${today}`, coins: coinsAwarded, ts: Date.now(), status: "pending" });
    saveEvents(evts);
    saveUsers(users);
  }

  res.json({
    message: "Acesso concedido!",
    user: { username: user.username, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage,
            coins: users[userIdx].coins || 0, purchasedItems: users[userIdx].purchasedItems || [],
            boostUntil: users[userIdx].boostUntil || null },
    coinsAwarded,
    loginStreak: streak,
  });
});

// Recovery codes persistidos no users.json com TTL de 15 min.
type RecoveryRecord = { code: string; expiresAt: number };
function getRecoveryStore(): Record<string, RecoveryRecord> {
  try {
    const raw = fs.existsSync(DB_FILE + ".codes") ? fs.readFileSync(DB_FILE + ".codes", "utf-8") : "{}";
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function saveRecoveryStore(store: Record<string, RecoveryRecord>) {
  // Limpa entradas expiradas a cada gravação.
  const now = Date.now();
  for (const k of Object.keys(store)) if (store[k].expiresAt < now) delete store[k];
  fs.writeFileSync(DB_FILE + ".codes", JSON.stringify(store));
}

app.post("/api/auth/forgot-password", recoveryLimiter, (req, res) => {
  const { contact } = req.body;
  const users = getUsers();

  const user = users.find((u: any) => u.email === contact || u.username === contact);

  // Responder de forma genérica mesmo se o usuário não existe (evita enumeration).
  if (!user) {
    return res.json({ message: "Se o contato estiver cadastrado, um código foi enviado.", username: null });
  }

  const code = Math.floor(10000 + Math.random() * 90000).toString();
  const store = getRecoveryStore();
  store[user.username] = { code, expiresAt: Date.now() + RECOVERY_TTL_MS };
  saveRecoveryStore(store);

  // SMTP real ainda não integrado: em produção o código sai apenas no log do servidor.
  // Em dev devolvemos o código no JSON para facilitar teste local.
  if (isProd) {
    console.log(`[recovery] code for ${user.username}: ${code}`);
    return res.json({ message: "Código de verificação enviado para o canal cadastrado.", username: user.username });
  }
  return res.json({
    message: "Código de verificação gerado.",
    username: user.username,
    devCode: code,
  });
});

app.post("/api/auth/verify-code", authLimiter, (req, res) => {
  const { username, code } = req.body;
  const store = getRecoveryStore();
  const record = store[username];

  if (!record || record.code !== code || record.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Código de verificação inválido ou expirado." });
  }

  res.json({ message: "Identidade verificada com sucesso." });
});

app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
  const { username, newPassword, code } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 8 caracteres." });
  }

  // Exige código de recuperação válido para resetar — não basta o username.
  const store = getRecoveryStore();
  const record = store[username];
  if (!record || record.code !== code || record.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Código de verificação inválido ou expirado." });
  }

  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username);
  if (userIdx === -1) {
    return res.status(404).json({ error: "Falha crítica: Usuário não localizado para redefinição." });
  }

  users[userIdx].password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  saveUsers(users);

  delete store[username];
  saveRecoveryStore(store);

  res.json({ message: "Sua chave de acesso DevGenius V12 foi atualizada com sucesso. Proceda para o login." });
});

// IA API Routes
app.post("/api/ai-chat", aiLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "O DevGenius IA está temporariamente indisponível." });
  }

  try {
    const contents = [
      ...(history || []).map((m: any) => ({
        role: m.role === "ia" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
    });

    res.json({ response: result.text || "Sem resposta da IA." });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: "Falha na conexão neural DevGenius. Tente novamente em instantes." });
  }
});

app.post("/api/ai-schematic", aiLimiter, async (req, res) => {
  const { placa, components } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "O DevGenius IA está temporariamente indisponível." });
  }

  const prompt = `Você é o Arquiteto de Hardware do DevGenius Pro. Sua missão é gerar uma documentação de engenharia IMPECÁVEL para o seguinte setup:
  PLACA MESTRE (CÓRTEX): ${placa}
  PERIFÉRICOS CONECTADOS: ${components.join(", ")}
  
  Siga rigorosamente esta estrutura de 2000+ palavras de conhecimento técnico:
  1. 🛠️ NOME DO PROJETO (Crie um nome futurista)
  2. 📝 SUMÁRIO EXECUTIVO (Objetivo e visão geral do sistema)
  3. 🔬 ANÁLISE DE COMPATIBILIDADE (Explique a pinagem, protocolos [I2C, SPI, UART, PWM] e níveis de tensão [3.3V vs 5V])
  4. 📦 LISTA DE MATERIAIS - BOM (Bill of Materials com especificações exatas)
  5. 🔌 GUIA DE FIAÇÃO PASSO-A-PASSO (Tabela de conexões PINO a PINO: De [Componente] -> Para [Placa])
  6. 💻 CÓDIGO FONTE AVANÇADO (Escrito em C++/Arduino ou Python conforme a placa. Inclua tratamento de erros, debounce e comentários profundos)
  7. ⚠️ PROTOCOLO DE TESTES E SEGURANÇA (Como validar o sistema antes de ligar na energia e limites de corrente)
  8. 🚀 SUGESTÕES DE EXPANSÃO (Como evoluir este projeto no futuro)
  
  Use Markdown rico. Seja exaustivo e didático.`;

  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    res.json({ response: result.text || "Falha ao gerar o conteúdo." });
  } catch (error: any) {
    console.error("Gemini Schematic Error:", error);
    res.status(500).json({ error: "Falha ao gerar esquemático DevGenius. Tente novamente em instantes." });
  }
});

// ─── Rewards endpoints ────────────────────────────────────────────────────────
const rewardsLimiter = rateLimit({ windowMs: 60*1000, limit: 30, standardHeaders:"draft-7", legacyHeaders:false, message:{error:"Muitas requisições. Aguarde."} });

// GET balance
app.get("/api/rewards/balance/:username", (req, res) => {
  const { username } = req.params;
  const users = getUsers();
  const user = users.find((u:any) => u.username === username);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  res.json({
    coins: user.coins || 0,
    purchasedItems: user.purchasedItems || [],
    loginStreak: user.loginStreak || { lastLogin: "", count: 0 },
    boostUntil: user.boostUntil || null,
  });
});

// GET catalog
app.get("/api/rewards/catalog", (_req, res) => {
  res.json(loadCatalog());
});

// GET events (history)
app.get("/api/rewards/events/:username", (req, res) => {
  const { username } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
  const evts = loadEvents().filter((e:any) => e.username === username);
  res.json(evts.slice(-limit).reverse());
});

// GET contagem de pendentes (para badge no sidebar)
app.get("/api/rewards/pending-count/:username", (req, res) => {
  const { username } = req.params;
  const evts = loadEvents().filter((e:any) => e.username === username && e.status === "pending");
  const totalCoins = evts.reduce((s:number, e:any) => s + (e.coins || 0), 0);
  res.json({ count: evts.length, totalCoins });
});

// POST claim
app.post("/api/rewards/claim", rewardsLimiter, (req, res) => {
  const { username, eventKey, coins, meta } = req.body;
  if (!username || !eventKey || typeof coins !== "number" || coins <= 0)
    return res.status(400).json({ error: "Dados inválidos" });

  const prefix = eventPrefix(eventKey);
  const rule   = VALID_EVENTS[prefix];
  if (!rule) return res.status(400).json({ error: "Evento desconhecido" });
  if (coins > rule.maxCoins) return res.status(400).json({ error: "Moedas acima do máximo" });

  // Valida score para milestones de jogos
  if (rule.requiresMeta === "score") {
    if (!meta || typeof meta.score !== "number") return res.status(400).json({ error: "meta.score obrigatório" });
    // Verifica se o usuário tem esse score nos arquivos do servidor
    const scoresFile = prefix === "flappy_milestone" ? SCORES_FILE : path.join(process.cwd(), "dino_scores.json");
    let scores: any[] = [];
    try { scores = JSON.parse(fs.readFileSync(scoresFile, "utf-8")); } catch {}
    const userBest = scores.filter((s:any) => s.username === username).reduce((m:number,s:any) => Math.max(m,s.score), 0);
    const threshold = parseInt(eventKey.split(":")[1] || "0");
    if (userBest < threshold) return res.status(403).json({ error: "Score insuficiente para este milestone" });
  }

  const evts = loadEvents();
  const today = todayStr();

  // Deduplicação
  const dailyCap = DAILY_CAPS[prefix];
  if (dailyCap) {
    const todayCount = evts.filter((e:any) => e.username === username && eventPrefix(e.eventKey) === prefix && e.eventKey.endsWith(today)).length;
    if (todayCount >= dailyCap) return res.json({ ok: false, alreadyClaimed: true, newBalance: undefined, message: "Cap diário atingido" });
    // Para eventos com cap diário, o key inclui a data
    const dedupKey = `${username}:${prefix}:${today}:${todayCount}`;
    // Não verifica dedup exato — o cap diário é suficiente
  } else {
    // One-time: verifica dedup exato por username:eventKey
    const dedupKey = `${username}:${eventKey}`;
    const exists = evts.some((e:any) => `${e.username}:${e.eventKey}` === dedupKey);
    if (exists) return res.json({ ok: false, alreadyClaimed: true, newBalance: undefined });
  }

  // Verifica o usuário
  const users = getUsers();
  const uIdx  = users.findIndex((u:any) => u.username === username);
  if (uIdx === -1) return res.status(404).json({ error: "Usuário não encontrado" });

  const finalCoins = applyBoost(users[uIdx], coins);

  // Registra evento como PENDENTE (sem creditar ainda)
  const keyToStore = dailyCap ? `${eventKey}:${today}` : eventKey;
  const newEvt = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), username, eventKey: keyToStore, coins: finalCoins, ts: Date.now(), status: "pending" };
  evts.push(newEvt);
  saveEvents(evts);

  res.json({ ok: true, pending: true, eventId: newEvt.id, coinsPending: finalCoins, boosted: finalCoins !== coins });
});

// GET admin/users — retorna lista de usuários cadastrados (requer código admin)
app.get("/api/admin/users", (req, res) => {
  const code = req.query.code as string;
  if (code !== "dede.adm.123.321") return res.status(403).json({ error: "Código inválido" });
  const users = getUsers();
  const TITLE_MAP: Record<string,string> = { title_elite:"[ELITE]", title_arquiteto:"[ARQUITETO]" };
  const safe = users.map((u: any) => {
    const purchased: string[] = u.purchasedItems || [];
    const titles = purchased.filter((id:string) => TITLE_MAP[id]).map((id:string) => TITLE_MAP[id]);
    const conquistas = purchased.filter((id:string) => !TITLE_MAP[id]);
    return {
      username:    u.username,
      firstName:   u.firstName,
      lastName:    u.lastName   || "",
      email:       u.email      || "",
      gender:      u.gender     || "",
      expLevel:    u.expLevel   || "",
      focus:       u.focus      || "",
      coins:       u.coins      || 0,
      loginStreak: u.loginStreak || { count: 0, lastLogin: "" },
      titles,
      conquistas,
      xp:        u.xp || 0,
      levelInfo: calcLevel(u.xp || 0),
    };
  });
  res.json({ ok: true, total: safe.length, users: safe });
});

// POST add-coins — crédito direto (usado por códigos especiais)
app.post("/api/rewards/add-coins", rewardsLimiter, (req, res) => {
  const { username, coins, reason } = req.body;
  if (!username || typeof coins !== "number" || coins <= 0)
    return res.status(400).json({ error: "Dados inválidos" });
  const users = getUsers();
  const idx   = users.findIndex((u: any) => u.username === username);
  if (idx === -1) return res.status(404).json({ error: "Usuário não encontrado" });
  users[idx].coins = (users[idx].coins || 0) + coins;
  addXp(users, idx, coins);
  saveUsers(users);
  const evts = loadEvents();
  evts.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,5), username, eventKey: `add_coins:${reason || "code"}`, coins, ts: Date.now(), status: "redeemed" });
  saveEvents(evts);
  res.json({ ok: true, newBalance: users[idx].coins, xp: users[idx].xp, ...calcLevel(users[idx].xp || 0) });
});

// POST redeem — confirma resgate de evento pendente e credita coins
app.post("/api/rewards/redeem/:id", rewardsLimiter, (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  if (!username || !id) return res.status(400).json({ error: "Dados inválidos" });

  const evts = loadEvents();
  const idx  = evts.findIndex((e:any) => e.id === id && e.username === username);
  if (idx === -1) return res.status(404).json({ error: "Evento não encontrado" });
  if (evts[idx].status !== "pending") return res.json({ ok: false, error: "Evento já resgatado ou inválido" });

  const coins = evts[idx].coins;

  // Credita moedas agora
  const users = getUsers();
  const uIdx  = users.findIndex((u:any) => u.username === username);
  if (uIdx === -1) return res.status(404).json({ error: "Usuário não encontrado" });

  users[uIdx].coins = (users[uIdx].coins || 0) + coins;
  addXp(users, uIdx, coins);
  saveUsers(users);

  // Marca evento como resgatado
  evts[idx].status    = "redeemed";
  evts[idx].redeemedTs = Date.now();
  saveEvents(evts);

  const lvlInfo = calcLevel(users[uIdx].xp || 0);
  res.json({ ok: true, newBalance: users[uIdx].coins, coinsAdded: coins, xp: users[uIdx].xp, ...lvlInfo });
});

// POST purchase
app.post("/api/rewards/purchase", rewardsLimiter, (req, res) => {
  const { username, rewardId } = req.body;
  if (!username || !rewardId) return res.status(400).json({ error: "Dados inválidos" });

  const catalog = loadCatalog();
  const reward  = catalog.find((r:any) => r.id === rewardId);
  if (!reward) return res.status(404).json({ error: "Recompensa não encontrada" });

  const users = getUsers();
  const uIdx  = users.findIndex((u:any) => u.username === username);
  if (uIdx === -1) return res.status(404).json({ error: "Usuário não encontrado" });

  const user = users[uIdx];
  user.purchasedItems = user.purchasedItems || [];

  if (user.purchasedItems.includes(rewardId)) return res.status(409).json({ error: "Recompensa já adquirida" });
  if ((user.coins || 0) < reward.cost) return res.status(402).json({ error: "Saldo insuficiente" });

  user.coins = (user.coins || 0) - reward.cost;
  user.purchasedItems.push(rewardId);

  // Efeitos especiais
  if (rewardId === "coin_boost_24h") {
    user.boostUntil = Date.now() + 24 * 60 * 60 * 1000;
  }

  saveUsers(users);
  res.json({ ok: true, newBalance: user.coins, purchasedItems: user.purchasedItems, boostUntil: user.boostUntil || null });
});
// ─────────────────────────────────────────────────────────────────────────────
// ── Sistema Social: Follows + Friend Requests ────────────────────────────────

function loadFollows(): any[] { try { return JSON.parse(fs.readFileSync(FOLLOWS_FILE,"utf-8")); } catch { return []; } }
function saveFollows(d: any[]) { fs.writeFileSync(FOLLOWS_FILE, JSON.stringify(d)); }
function loadFriendReqs(): any[] { try { return JSON.parse(fs.readFileSync(FRIEND_REQ_FILE,"utf-8")); } catch { return []; } }
function saveFriendReqs(d: any[]) { fs.writeFileSync(FRIEND_REQ_FILE, JSON.stringify(d)); }

// Garante userId único ao sincronizar usuário
function ensureUserId(users: any[], idx: number): string {
  if (!users[idx].userId) {
    users[idx].userId = "#" + String(1000 + idx).padStart(4,"0");
    saveUsers(users);
  }
  return users[idx].userId;
}

// GET lista pública de usuários (para busca/perfis)
app.get("/api/social/users", (req, res) => {
  const search = ((req.query.search as string) || "").toLowerCase();
  const users  = getUsers();
  const result = users
    .map((u: any, i: number) => {
      ensureUserId(users, i);
      return {
        username:    u.username,
        firstName:   u.firstName,
        lastName:    u.lastName || "",
        profileImage:u.profileImage || null,
        userId:      u.userId || ("#" + String(1000 + i).padStart(4,"0")),
        xp:          u.xp || 0,
        level:       calcLevel(u.xp || 0),
      };
    })
    .filter((u: any) =>
      !search ||
      u.username.toLowerCase().includes(search) ||
      u.firstName.toLowerCase().includes(search) ||
      (u.lastName || "").toLowerCase().includes(search) ||
      (u.userId || "").toLowerCase().includes(search)
    );
  res.json(result);
});

// POST seguir usuário → cria follow + envia pedido de amizade
app.post("/api/social/follow", (req, res) => {
  const { from, to } = req.body;
  if (!from || !to || from === to) return res.status(400).json({ error: "Dados inválidos" });

  const follows = loadFollows();
  const already = follows.some((f: any) => f.from === from && f.to === to);
  if (!already) {
    follows.push({ from, to, ts: Date.now() });
    saveFollows(follows);
  }

  // Envia pedido de amizade se não existir
  const reqs = loadFriendReqs();
  const reqExists = reqs.some((r: any) =>
    (r.from === from && r.to === to) || (r.from === to && r.to === from)
  );
  if (!reqExists) {
    reqs.push({ id: Date.now().toString(36), from, to, ts: Date.now(), status: "pending" });
    saveFriendReqs(reqs);
  }
  res.json({ ok: true, alreadyFollowing: already });
});

// POST deixar de seguir
app.post("/api/social/unfollow", (req, res) => {
  const { from, to } = req.body;
  const follows = loadFollows().filter((f: any) => !(f.from === from && f.to === to));
  saveFollows(follows);
  res.json({ ok: true });
});

// GET pedidos de amizade recebidos (pendentes)
app.get("/api/social/friend-requests/:username", (req, res) => {
  const { username } = req.params;
  const reqs  = loadFriendReqs().filter((r: any) => r.to === username && r.status === "pending");
  const users = getUsers();
  const result = reqs.map((r: any) => {
    const u = users.find((x: any) => x.username === r.from) || {};
    return { ...r, fromFirstName: u.firstName || r.from, fromProfileImage: u.profileImage || null };
  });
  res.json(result);
});

// POST aceitar pedido de amizade
app.post("/api/social/friend-accept", (req, res) => {
  const { id, username } = req.body;
  const reqs = loadFriendReqs();
  const idx  = reqs.findIndex((r: any) => r.id === id && r.to === username);
  if (idx === -1) return res.status(404).json({ error: "Pedido não encontrado" });
  reqs[idx].status = "accepted";
  saveFriendReqs(reqs);
  res.json({ ok: true });
});

// POST ignorar pedido de amizade
app.post("/api/social/friend-ignore", (req, res) => {
  const { id, username } = req.body;
  const reqs = loadFriendReqs();
  const idx  = reqs.findIndex((r: any) => r.id === id && r.to === username);
  if (idx === -1) return res.status(404).json({ error: "Pedido não encontrado" });
  reqs[idx].status = "ignored";
  saveFriendReqs(reqs);
  res.json({ ok: true });
});

// GET estado social do usuário (following, followers, friends, requests)
app.get("/api/social/state/:username", (req, res) => {
  const { username } = req.params;
  const follows = loadFollows();
  const reqs    = loadFriendReqs();
  res.json({
    following:       follows.filter((f: any) => f.from === username).map((f: any) => f.to),
    followers:       follows.filter((f: any) => f.to   === username).map((f: any) => f.from),
    friends:         reqs.filter((r: any) => r.status === "accepted" && (r.from === username || r.to === username))
                         .map((r: any) => r.from === username ? r.to : r.from),
    pendingReceived: reqs.filter((r: any) => r.to === username && r.status === "pending").length,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");

  // Em dev sempre usamos Vite middleware (HMR + source ao vivo).
  // Só servimos dist/ estático em produção — caso contrário, um dist/ stale
  // gerado em um build local mascara mudanças em src/ silenciosamente.
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      console.error("❌ Produção sem build: dist/index.html não existe. Rode `npm run build` antes de iniciar.");
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`DevGenius V12 server running on http://${HOST}:${PORT}`);
  });
}

// ─── Community / Chat endpoints ───────────────────────────────────────────────
app.get("/api/community/messages", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 80, 200);
  const since = req.query.since ? parseInt(req.query.since as string) : 0;
  res.json(loadMessages().filter((m: any) => (m.ts||0) > since).slice(-limit));
});

app.post("/api/community/message", aiLimiter, (req, res) => {
  const { username, text, avatar } = req.body;
  if (!text || typeof text !== "string" || text.trim().length === 0)
    return res.status(400).json({ error: "Mensagem vazia" });
  if (text.trim().length > 500)
    return res.status(400).json({ error: "Mensagem muito longa (máx 500 chars)" });
  const msg = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    username: (username || "Visitante").substring(0,24),
    text: text.trim(), avatar: avatar || null, ts: Date.now(),
  };
  const msgs = loadMessages(); msgs.push(msg); saveMessages(msgs);
  res.json(msg);
});

app.get("/api/community/stats", (_req, res) => {
  const users = getUsers();
  const msgs  = loadMessages();
  const agora = Date.now();
  const online = users.filter((u: any) =>
    msgs.some((m: any) => m.username === u.username && (agora - m.ts) < 5*60*1000)
  ).length;
  res.json({ totalUsers: users.length, totalMessages: msgs.length, onlineNow: online });
});

app.delete("/api/community/message/:id", (req, res) => {
  saveMessages(loadMessages().filter((m: any) => m.id !== req.params.id));
  res.json({ ok: true });
});

// ─── Flappy / Dino scores ──────────────────────────────────────────────────────
function loadScores(): any[] { try { return JSON.parse(fs.readFileSync(SCORES_FILE,"utf-8")); } catch { return []; } }
function saveScores(s: any[]) { fs.writeFileSync(SCORES_FILE, JSON.stringify(s.slice(-MAX_SCORES))); }
const DINO_SCORES_FILE = path.join(process.cwd(), "dino_scores.json");
function loadDinoScores(): any[] { try { return JSON.parse(fs.readFileSync(DINO_SCORES_FILE,"utf-8")); } catch { return []; } }
function saveDinoScores(s: any[]) { fs.writeFileSync(DINO_SCORES_FILE, JSON.stringify(s.slice(-MAX_SCORES))); }

app.post("/api/games/flappy/score", (req, res) => {
  const { username, score, avatar } = req.body;
  if (typeof score !== "number" || score < 0 || score > 9999)
    return res.status(400).json({ error: "Score inválido" });
  const entry = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,5), username:(username||"Anônimo").substring(0,24), score:Math.floor(score), avatar:avatar||null, ts:Date.now() };
  const scores = loadScores(); scores.push(entry); saveScores(scores);
  res.json(entry);
});

app.get("/api/games/flappy/leaderboard", (_req, res) => {
  const best: Record<string,any> = {};
  loadScores().forEach((s: any) => { if (!best[s.username] || s.score > best[s.username].score) best[s.username] = s; });
  res.json(Object.values(best).sort((a: any,b: any) => b.score-a.score).slice(0,20));
});

app.get("/api/games/flappy/recent", (_req, res) => { res.json(loadScores().slice(-30).reverse()); });

app.post("/api/games/dino/score", (req, res) => {
  const { username, score, avatar } = req.body;
  if (typeof score !== "number" || score < 0 || score > 99999)
    return res.status(400).json({ error: "Score inválido" });
  const entry = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,5), username:(username||"Anônimo").substring(0,24), score:Math.floor(score), avatar:avatar||null, ts:Date.now() };
  const scores = loadDinoScores(); scores.push(entry); saveDinoScores(scores);
  res.json(entry);
});

app.get("/api/games/dino/leaderboard", (_req, res) => {
  const best: Record<string,any> = {};
  loadDinoScores().forEach((s: any) => { if (!best[s.username] || s.score > best[s.username].score) best[s.username] = s; });
  res.json(Object.values(best).sort((a: any,b: any) => b.score-a.score).slice(0,20));
});

// ─── Direct Messages (chat privado) ───────────────────────────────────────────
app.get("/api/community/users", (req, res) => {
  const users = getUsers().map((u: any) => ({ username:u.username, firstName:u.firstName, lastName:u.lastName||"", profileImage:u.profileImage||null }));
  const chatUsers = [...new Set(loadMessages().slice(-200).map((m: any) => m.username))]
    .filter(name => !users.find((u: any) => u.username === name))
    .map(name => ({ username:name, firstName:name, lastName:"", profileImage:null }));
  res.json([...users, ...chatUsers]);
});

app.get("/api/community/dm/:user1/:user2", (req, res) => {
  const { user1, user2 } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string)||80, 200);
  const since = req.query.since ? parseInt(req.query.since as string) : 0;
  res.json(loadDMs().filter((m: any) => m.key === dmKey(user1,user2) && (m.ts||0) > since).slice(-limit));
});

app.post("/api/community/dm", aiLimiter, (req, res) => {
  const { from, to, text } = req.body;
  if (!from || !to || !text || typeof text !== "string" || text.trim().length === 0)
    return res.status(400).json({ error: "Dados inválidos" });
  if (from === to) return res.status(400).json({ error: "Não pode enviar para si mesmo" });
  const msg = { id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), key:dmKey(from,to), from:from.substring(0,24), to:to.substring(0,24), text:text.trim(), ts:Date.now() };
  const dms = loadDMs(); dms.push(msg); saveDMs(dms);
  res.json(msg);
});

app.delete("/api/community/dm/:id", (req, res) => {
  saveDMs(loadDMs().filter((m: any) => m.id !== req.params.id));
  res.json({ ok: true });
});

app.get("/api/community/dm-list/:username", (req, res) => {
  const { username } = req.params;
  const conversas: Record<string,any> = {};
  loadDMs().filter((m: any) => m.from === username || m.to === username)
    .forEach((m: any) => {
      const outro = m.from === username ? m.to : m.from;
      if (!conversas[outro] || m.ts > conversas[outro].ts) conversas[outro] = { ...m, outro };
    });
  res.json(Object.values(conversas).sort((a: any,b: any) => b.ts-a.ts));
});

startServer();
