import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DB_FILE = path.join(process.cwd(), "users.json");

// AI Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});
const GEMINI_MODEL = "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY não configurada no ambiente.");
}

// Middleware
app.use(express.json({ limit: "10mb" }));

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
app.post("/api/auth/register", (req, res) => {
  const { firstName, lastName, email, username, password, birthDate, profileImage, gender, focus, expLevel, mainTool, motivation } = req.body;
  const users = getUsers();
  
  if (users.find((u: any) => u.username === username)) {
    return res.status(400).json({ error: "O nome de usuário já está em uso por outro maker." });
  }
  
  const newUser = { firstName, lastName, email, username, password, birthDate, profileImage, gender, focus, expLevel, mainTool, motivation, id: Date.now().toString() };
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

app.post("/api/auth/update-email", (req, res) => {
  const { username, currentEmail, password, newEmail } = req.body;
  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username);

  if (userIdx === -1) return res.status(404).json({ error: "Usuário não encontrado." });

  const user = users[userIdx];
  if (user.email !== currentEmail || user.password !== password) {
    return res.status(401).json({ error: "E-mail ou senha atuais incorretos." });
  }

  users[userIdx].email = newEmail;
  saveUsers(users);

  res.json({ message: "E-mail atualizado com sucesso!", email: newEmail });
});

app.post("/api/auth/delete-account", (req, res) => {
  const { username, email, password } = req.body;
  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username && u.email === email && u.password === password);

  if (userIdx === -1) {
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

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  
  const user = users.find((u: any) => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: "Credenciais inválidas. Verifique seu usuário e senha." });
  }
  
  res.json({ message: "Acesso concedido!", user: { username: user.username, firstName: user.firstName, lastName: user.lastName, profileImage: user.profileImage } });
});

// Temporary store for recovery codes (would be better in a db/cache in production)
const RECOVERY_CODES: Record<string, string> = {};

app.post("/api/auth/forgot-password", (req, res) => {
  const { contact } = req.body;
  const users = getUsers();
  
  const user = users.find((u: any) => u.email === contact || u.username === contact);
  
  if (!user) {
    return res.status(404).json({ error: "Nenhum usuário encontrado com esses dados de registro." });
  }

  // Generate 5-digit code
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  RECOVERY_CODES[user.username] = code;
  
  // Custom message from user request
  res.json({ 
    message: `DEVGENIUS V12 - SEGURANÇA: Um código de verificação foi gerado. (SIMULAÇÃO: O código enviado para seu e-mail é ${code})`, 
    username: user.username 
  });
});

app.post("/api/auth/verify-code", (req, res) => {
  const { username, code } = req.body;
  
  if (RECOVERY_CODES[username] && RECOVERY_CODES[username] === code) {
    // In a real app, you'd mark this session as verified
    res.json({ message: "Identidade verificada com sucesso." });
  } else {
    res.status(400).json({ error: "Código de verificação inválido ou expirado." });
  }
});

app.post("/api/auth/reset-password", (req, res) => {
  const { username, newPassword } = req.body;
  const users = getUsers();
  const userIdx = users.findIndex((u: any) => u.username === username);

  if (userIdx === -1) {
    return res.status(404).json({ error: "Falha crítica: Usuário não localizado para redefinição." });
  }

  users[userIdx].password = newPassword;
  saveUsers(users);
  
  // Clear the code after successful reset
  delete RECOVERY_CODES[username];

  res.json({ message: "Sua chave de acesso DevGenius V12 foi atualizada com sucesso. Proceda para o login." });
});

// IA API Routes
app.post("/api/ai-chat", async (req, res) => {
  const { message, history } = req.body;
  
  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "O DevGenius IA requer uma chave de API válida para operar." });
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
    res.status(500).json({ error: "Erro na conexão neural DevGenius: " + (error.message || "Falha desconhecida") });
  }
});

app.post("/api/ai-schematic", async (req, res) => {
  const { placa, components } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "O DevGenius IA requer uma chave de API válida para operar." });
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
    res.status(500).json({ error: "Falha ao gerar esquemático DevGenius: " + (error.message || "Erro desconhecido") });
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
