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
const DB_FILE = path.join(process.cwd(), "users.json");
const BCRYPT_ROUNDS = 10;
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

  res.json({ message: "Acesso concedido!", user: { username: user.username, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage } });
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

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));

  if (process.env.NODE_ENV !== "production" && !hasDist) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`DevGenius V12 server running on http://${HOST}:${PORT}`);
  });
}

startServer();
