---
name: devgenius-add-question
description: Adicionar uma ou mais questões reais ao quiz do DEVGENIUS (src/data/questions.ts). Garante formato consistente (id-prefix por trilha, 4 alternativas, correctIndex, explanation obrigatória), nivelamento educacional adequado e validação anti-fake.
---

Use esta skill quando o usuário pedir para adicionar questões ao quiz do DEVGENIUS — seja uma única ou um lote temático.

## Estrutura atual do quiz

`src/data/questions.ts` exporta:

```typescript
export type Trilha = "eletronica" | "arduino" | "sensores";

export interface Question {
  id: string;             // "el-XX", "ar-XX", "se-XX"
  text: string;           // enunciado claro
  options: string[];      // exatamente 4 alternativas
  correctIndex: number;   // 0..3
  explanation: string;    // 1-2 linhas mostradas após confirmar resposta
}

export const QUESTIONS: Record<Trilha, Question[]>;
```

Cada trilha tem hoje **30 questões**. Mantenha esse target (ou negocie expansão por trilha com o usuário antes).

## Passo a passo

### 1. Identificar a trilha

- **`eletronica`** — Eletrônica Básica: tensão/corrente/Lei de Ohm, GND, polaridade, LED+resistor, capacitor, divisor de tensão, série/paralelo, cores de resistor, multímetro, fusível, 3,3V vs 5V, segurança AC
- **`arduino`** — Arduino do Zero: setup/loop, pinMode (INPUT/OUTPUT/INPUT_PULLUP), digitalWrite, digitalRead, analogRead (10-bit), PWM analogWrite, Serial.begin/print/println, delay vs millis, tipos C (byte/int/long), arrays, volatile em ISR, map(), bibliotecas, debugging avrdude
- **`sensores`** — Sensores e Atuadores: DHT22, HC-SR04, MPU6050, BMP280, servo PWM 50Hz, relé + flyback, I2C/SPI/1-Wire/UART, LCD/OLED, ponte H, motor DC, stepper, encoder, buzzer ativo vs passivo, MQ-2, PIR, LDR, deep sleep ESP32

ID prefix: `el-`, `ar-`, `se-`. Próximo número = (último na trilha) + 1.

### 2. Princípios para escrever boa questão

- **Enunciado**: pergunta direta, sem floreio. Inclua siglas e termos técnicos que o aluno precisa reconhecer.
- **4 alternativas**: a errada deve ser **plausível** (erro comum, confusão típica). Não fazer 3 absurdas óbvias + 1 correta — perde valor educativo.
- **correctIndex**: distribuir aleatoriamente entre 0-3 ao longo da trilha (não enviesar tudo pra 0 ou 1).
- **explanation** (OBRIGATÓRIA): explicar **por que** a correta é correta, idealmente mencionando uma fórmula/regra prática que o aluno leva pra próxima questão. 1-2 linhas no máximo.

### 3. Exemplos de boas questões já no quiz

Eletrônica:
```typescript
{ id: "el-04", text: "Para um LED comum (~2V, 20mA) alimentado por 5V, qual resistor série é adequado?", options: ["10 Ω", "150 Ω", "220 Ω", "10 kΩ"], correctIndex: 2, explanation: "R = (5−2)/0,02 = 150 Ω no mínimo. 220 Ω é o valor comercial seguro mais próximo." },
```

Arduino:
```typescript
{ id: "ar-19", text: "Para piscar um LED a cada 1 segundo SEM bloquear o loop com delay(), usamos:", options: ["delay(1000) mais rápido", "millis() comparando com último timestamp", "interrupt timer manual", "while(true)"], correctIndex: 1, explanation: "Padrão: `if (millis() - last >= 1000) { last = millis(); toggle(); }`. Não bloqueia outras tarefas." },
```

Sensores:
```typescript
{ id: "se-08", text: "No barramento I2C, geralmente é necessário:", options: ["Cristal externo", "Resistores de pull-up em SDA e SCL (tipicamente 4,7kΩ)", "Transistor em paralelo", "Fonte separada para cada dispositivo"], correctIndex: 1, explanation: "I2C é open-drain — sem pull-ups, as linhas nunca sobem para HIGH. Módulos pequenos já trazem pull-ups internos." },
```

### 4. Adicionar no arquivo

Encontrar o array correto (`ELETRONICA`, `ARDUINO` ou `SENSORES` em `src/data/questions.ts`) e adicionar a(s) nova(s) questão(ões) no final (ou intercalar por tema, se fizer sentido — a ordem afeta a UX porque o `TestInstance` apresenta sequencialmente).

### 5. Validar

```bash
npm run lint
```

Recarregar Provas no app, escolher a trilha tocada, fazer 2-3 questões e confirmar que:
- Feedback verde/vermelho aparece após CONFIRMAR
- Explicação aparece na caixa abaixo
- Placar final conta certo

## Anti-padrões

- ❌ **NUNCA** gerar questões com template procedural (foi exatamente o problema do quiz anterior, ver memory `feedback_no_fake_content`)
- ❌ NÃO criar questão sem `explanation` — é o valor educacional que diferencia quiz real de quiz vazio
- ❌ NÃO usar 5 alternativas — a UI espera 4
- ❌ NÃO usar tom techno ("DEVGENIUS Kernel exige que você") — tom é didático, neutro
- ❌ NÃO criar lote enorme (>10) sem mostrar amostra ao usuário antes — risco de toda a leva precisar revisão
