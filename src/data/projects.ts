export interface ProjectStep {
  title: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  difficulty: "Básico" | "Intermediário" | "Avançado" | "Expert";
  compCount: number;
  components: string[];
  connections: string;
  code: string;
  steps: ProjectStep[];
  image: string;
}

export const PROJECTS: Project[] = [
  // --- 2 COMPONENTES ---
  {
    id: "p1",
    title: "Sinalizador de Emergência",
    description: "Um LED piscante clássico para sinalização visual de alerta. Utiliza o pino interno 13 ou um LED externo.",
    difficulty: "Básico",
    compCount: 2,
    components: ["Arduino Uno", "LED Vermelho Difuso 5mm"],
    connections: "- LED: Anodo (longo) -> D13\n- LED: Catodo (curto) -> GND (via resistor 220R)",
    code: `/* DEVGENIUS - EMERGENCY BEACON */
void setup() {
  pinMode(13, OUTPUT); // Define pino 13 como saída
}

void loop() {
  digitalWrite(13, HIGH); // Liga o LED
  delay(200);             // Pulso curto
  digitalWrite(13, LOW);  // Desliga
  delay(100);
  digitalWrite(13, HIGH); // Segundo pulso
  delay(200);
  digitalWrite(13, LOW);
  delay(1000);            // Pausa longa
}`,
    steps: [
      { title: "Preparação", description: "Identifique o anodo e catodo do LED." },
      { title: "Fiação", description: "Conecte o catodo ao GND e o anodo ao pino 13." },
      { title: "Upload", description: "Configure a placa Arduino Uno e faça o upload." }
    ],
    image: "/img/projetos/led-blink.jpg"
  },
  {
    id: "p2",
    title: "Alarme de Toque Tátil",
    description: "Um buzzer que toca quando você encosta no sensor capacitivo integrado do ESP32.",
    difficulty: "Básico",
    compCount: 2,
    components: ["ESP32", "Buzzer Passivo"],
    connections: "- Buzzer Positivo -> D5\n- Buzzer Negativo -> GND",
    code: `/* DEVGENIUS - TOUCH ALARM */
const int TOUCH_PIN = T0; // GPIO4
const int BUZZER_PIN = 5;
const int THRESHOLD = 30;

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int touchValue = touchRead(TOUCH_PIN);
  Serial.println(touchValue);
  
  if(touchValue < THRESHOLD) {
    // Toca som de alerta
    for(int i=0; i<500; i++) {
       digitalWrite(BUZZER_PIN, HIGH);
       delayMicroseconds(500);
       digitalWrite(BUZZER_PIN, LOW);
       delayMicroseconds(500);
    }
  }
  delay(100);
}`,
    steps: [
      { title: "Conexão", description: "Ligue o buzzer ao GPIO5." },
      { title: "Calibração", description: "Ajuste o THRESHOLD monitorando o Serial Plotter." },
      { title: "Teste", description: "Toque no pino GPIO4 para disparar." }
    ],
    image: "/img/projetos/esp32-buzzer.jpg"
  },

  // --- 3 COMPONENTES ---
  {
    id: "p3",
    title: "Termômetro Digital Simples",
    description: "Lê a temperatura ambiente e exibe no monitor serial com alerta visual.",
    difficulty: "Básico",
    compCount: 3,
    components: ["Arduino Uno", "Sensor de Temperatura DS18B20", "LED Azul Difuso 5mm"],
    connections: "- DS18B20: Data -> D2, VCC -> 5V, GND -> GND\n- Pull-up: Resistor 4.7k entre Data e VCC\n- LED: D13 -> GND",
    code: `#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(9600);
  sensors.begin();
  pinMode(13, OUTPUT);
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  Serial.print("Temp: ");
  Serial.println(tempC);
  
  if(tempC > 30.0) digitalWrite(13, HIGH);
  else digitalWrite(13, LOW);
  delay(1000);
}`,
    steps: [
      { title: "Pull-up", description: "O DS18B20 exige um resistor de 4.7k entre o pino de dados e o VCC." },
      { title: "Bibliotecas", description: "Instale 'OneWire' e 'DallasTemperature'." },
      { title: "Monitoramento", description: "Abra o monitor serial em 9600 baud." }
    ],
    image: "/img/projetos/termometro-dht.jpg"
  },
  {
    id: "p4",
    title: "Controle de Brilho via Potenciômetro",
    description: "Ajuste a intensidade de um LED utilizando a entrada analógica e saída PWM.",
    difficulty: "Básico",
    compCount: 3,
    components: ["Arduino Uno", "Potenciômetro Rotativo 10k", "LED Amarelo Difuso 5mm"],
    connections: "- Potenciômetro: Pinos laterais -> 5V e GND, Central -> A0\n- LED: Anodo -> D9 (PWM), Catodo -> GND",
    code: `/* DEVGENIUS - PWM DIMMER */
const int potPin = A0;
const int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int sensorValue = analogRead(potPin); // 0 a 1023
  int brightness = map(sensorValue, 0, 1023, 0, 255); // Mapeia para PWM
  analogWrite(ledPin, brightness);
  delay(10);
}`,
    steps: [
      { title: "Entrada Analógica", description: "Conecte o pino central do pot ao A0." },
      { title: "Saída PWM", description: "Certifique-se de usar pins com o símbolo '~' (como o 9)." },
      { title: "Teste", description: "Gire o eixo e observe a suavidade do brilho." }
    ],
    image: "/img/projetos/potenciometro-led.jpg"
  },

  // --- 4 COMPONENTES ---
  {
    id: "p5",
    title: "Medidor de Distância Digital",
    description: "Calcula a distância em cm e exibe em um display TM1637.",
    difficulty: "Intermediário",
    compCount: 4,
    components: ["Arduino Uno", "Sensor Ultrassônico HC-SR04", "Display 7 Segmentos 4 Dígitos", "Buzzer Passivo"],
    connections: "- HC-SR04: Trig -> D9, Echo -> D10\n- Display: CLK -> D2, DIO -> D3\n- Buzzer: D5 -> GND",
    code: `#include <TM1637Display.h>
#define CLK 2
#define DIO 3
#define TRIG 9
#define ECHO 10

TM1637Display display(CLK, DIO);

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  display.setBrightness(0x0f);
}

void loop() {
  long duration, distance;
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  
  duration = pulseIn(ECHO, HIGH);
  distance = duration * 0.034 / 2;
  
  display.showNumberDec(distance);
  if(distance < 10) tone(5, 1000, 100);
  delay(200);
}`,
    steps: [
      { title: "Disparo", description: "O pulso de 10us no Trig inicia a leitura." },
      { title: "Display", description: "Use a biblioteca TM1637 para facilitar a escrita." },
      { title: "Fator de Conversão", description: "A velocidade do som no ar é aprox. 340m/s." }
    ],
    image: "/img/projetos/medidor-distancia.jpg"
  },
  {
    id: "p6",
    title: "Fechadura RFID com Relé",
    description: "Sistema de controle de acesso que aciona um relé ao detectar um cartão cadastrado.",
    difficulty: "Intermediário",
    compCount: 4,
    components: ["Arduino Uno", "Módulo Leitor RFID-RC522", "Módulo Relé 5V", "LED Verde Difuso 5mm"],
    connections: "- RFID SPI: SS -> 10, RST -> 9, MOSI -> 11, MISO -> 12, SCK -> 13\n- Relé: IN -> D7\n- LED: D6 -> GND",
    code: `#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9
MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  SPI.begin();
  rfid.PCD_Init();
  pinMode(7, OUTPUT);
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;
  
  // Tag Permitida (Exemplo: UID do usuário)
  if(rfid.uid.uidByte[0] == 0xDE && rfid.uid.uidByte[1] == 0xAD) {
    digitalWrite(7, HIGH);
    delay(2000);
    digitalWrite(7, LOW);
  }
  rfid.PICC_HaltA();
}`,
    steps: [
      { title: "UID", description: "Use o Serial para descobrir o UID da sua tag." },
      { title: "Relé", description: "Cuidado ao manipular tensões AC no relé." },
      { title: "Finalização", description: "HaltA limpa o estado da tag para nova leitura." }
    ],
    image: "/img/projetos/rfid-fechadura.jpg"
  },

  // --- 5 COMPONENTES ---
  {
    id: "p7",
    title: "Robô Seguidor de Linha (Drone Hunter)",
    description: "Utiliza sensores infravermelhos para manter o chassi sobre uma linha preta.",
    difficulty: "Avançado",
    compCount: 5,
    components: ["Arduino Uno", "Chassis Robótico 2 Rodas", "Módulo Driver Ponte H L298N", "2x Módulo Seguidor de Linha IR"],
    connections: "- Sensores IR: Out -> D2 (Esq) e D3 (Dir)\n- Motor E: IN1(D4), IN2(D5)\n- Motor D: IN3(D6), IN4(D7)",
    code: `/* DEVGENIUS - LINE FOLLOWER */
void setup() {
  pinMode(2, INPUT); pinMode(3, INPUT); // Sensores
  for(int i=4; i<=7; i++) pinMode(i, OUTPUT); // Motores
}

void loop() {
  int left = digitalRead(2);
  int right = digitalRead(3);
  
  if(left == HIGH && right == HIGH) { // Frente
    digitalWrite(4, HIGH); digitalWrite(5, LOW);
    digitalWrite(6, HIGH); digitalWrite(7, LOW);
  } else if(left == LOW) { // Ajuste Esq
    digitalWrite(4, LOW); digitalWrite(5, HIGH);
    digitalWrite(6, HIGH); digitalWrite(7, LOW);
  } else if(right == LOW) { // Ajuste Dir
    digitalWrite(4, HIGH); digitalWrite(5, LOW);
    digitalWrite(6, LOW); digitalWrite(7, HIGH);
  }
}`,
    steps: [
      { title: "Montagem do Chassis", description: "Fixe os motores e as rodas no chassi acrílico e instale a roda boba." },
      { title: "Fiação e Sensores", description: "Conecte os sensores infravermelhos na parte frontal e ligue-os à ponte H e ao Arduino." },
      { title: "Calibração e Teste", description: "Ajuste a sensibilidade dos sensores e teste a lógica de curva sobre a pista." }
    ],
    image: "/img/projetos/robo-seguidor.jpg"
  },
  {
    id: "p8",
    title: "Estação Meteorológica I2C",
    description: "Coleta e exibe dados climáticos em um display OLED de alta fidelidade.",
    difficulty: "Avançado",
    compCount: 5,
    components: ["ESP32", "Altímetro BMP280", "Sensor DHT22", "Módulo Leitor de Cartão SD", "Display OLED 0.96 pol I2C"],
    connections: "- OLED & BMP: SDA(D21), SCL(D22)\n- DHT22: Pin D4\n- SD: SCK(D18), MISO(D19), MOSI(D23), CS(D5)",
    code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

DHT dht(4, DHT22);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  dht.begin();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(WHITE);
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  display.setCursor(0,0);
  display.print("Temp: "); display.println(t);
  display.print("Humid: "); display.println(h);
  display.display();
  delay(2000);
}`,
    steps: [
      { title: "I2C Share", description: "O display e o BMP280 compartilham as mesmas linhas SDA/SCL." },
      { title: "OLED Setup", description: "Confirme o endereço I2C (geralmente 0x3C ou 0x3D)." },
      { title: "Buffer", description: "Sempre chame display.display() para atualizar a tela." }
    ],
    image: "/img/projetos/estacao-meteorologica.jpg"
  },

  // --- 6+ COMPONENTES ---
  {
    id: "p9",
    title: "Braço Robótico Manipulador",
    description: "Controle preciso de 4 eixos utilizando joysticks analógicos e SG90.",
    difficulty: "Expert",
    compCount: 6,
    components: ["Arduino Uno", "4x Servo Motor MG996R", "2x Módulo Joystick KY-023"],
    connections: "- Joy 1: A0 (X), A1 (Y)\n- Joy 2: A2 (X), A3 (Y)\n- Servos: D3, D5, D6, D9 (PWM)",
    code: `#include <Servo.h>
Servo s1, s2, s3, s4;

void setup() {
  s1.attach(3); s2.attach(5);
  s3.attach(6); s4.attach(9);
}

void loop() {
  int x1 = analogRead(A0);
  int y1 = analogRead(A1);
  s1.write(map(x1, 0, 1023, 0, 180));
  s2.write(map(y1, 0, 1023, 0, 180));
  // Repetir para x2, y2...
  delay(15);
}`,
    steps: [
      { title: "Montagem Mecânica", description: "Monte a estrutura do braço, prendendo os servos nos eixos de rotação." },
      { title: "Conexão dos Servos", description: "Ligue os servos ao Arduino (usando alimentação externa se possível)." },
      { title: "Controle por Joystick", description: "Conecte os joysticks e mapeie os eixos analógicos para os ângulos dos servos." }
    ],
    image: "/img/projetos/braco-robotico.jpg"
  },
  {
    id: "p10",
    title: "Smart Home Controller V12",
    description: "Controle por voz, sensor de movimento e display informativo em um único hub.",
    difficulty: "Expert",
    compCount: 7,
    components: ["ESP32", "Módulo Sensor de Som", "Módulo Sensor de Movimento PIR", "Módulo Relé 5V", "Display LCD 16x2 com I2C", "Módulo DFPlayer Mini MP3", "Buzzer Passivo"],
    connections: "- LCD: SDA(D21), SCL(D22)\n- DFPlayer: TX(D17), RX(D16)\n- Sensores: D4 e D5",
    code: `/* DEVGENIUS KERNEL - INTEGRATED HOME HUB */
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init(); lcd.backlight();
  pinMode(5, INPUT); // PIR
  pinMode(4, OUTPUT); // Relay
}

void loop() {
  if(digitalRead(5) == HIGH) {
    lcd.setCursor(0,0);
    lcd.print("MOVER DETECTED");
    digitalWrite(4, HIGH);
  } else {
    lcd.setCursor(0,0);
    lcd.print("SYSTEM SECURE");
    digitalWrite(4, LOW);
  }
  delay(500);
}`,
    steps: [
      { title: "Setup Multi-Bus", description: "O ESP32 gerencia UART para o MP3 e I2C para o LCD." },
      { title: "PIR", description: "Aguarde o tempo de estabilização do PIR ao iniciar." },
      { title: "MP3", description: "Prepare o cartão SD com a pasta 'mp3' e arquivos renomeados." }
    ],
    image: "/img/projetos/smart-home.jpg"
  },

  // ─── PROJETOS VARIADOS POR PLACA ──────────────────────────────────────────

  // ── Arduino Uno ───────────────────────────────────────────────────────────
  {
    id: "puno-01",
    title: "Piano de 4 Teclas",
    description: "Quatro botões mapeados a notas musicais tocadas em um buzzer passivo. Perfeito para aprender entradas digitais e a função tone().",
    difficulty: "Básico",
    compCount: 2,
    components: ["Arduino Uno R3", "Buzzer Passivo"],
    connections: "- Buzzer: + → D11, − → GND\n- 4 Botões: cada um de D2/D3/D4/D5 para GND (INPUT_PULLUP)",
    code: `// Piano de 4 Teclas | Arduino Uno R3 | DEVGENIUS V12
const int BUZZER = 11;          // Pino do buzzer passivo
const int TECLAS[] = {2,3,4,5}; // Pinos dos 4 botões
const int NOTAS[]  = {262,294,330,349}; // Do, Re, Mi, Fa (Hz)

void setup() {
  // Configura os 4 pinos dos botões com pull-up interno
  for (int i = 0; i < 4; i++) {
    pinMode(TECLAS[i], INPUT_PULLUP);
  }
  Serial.begin(9600);
  Serial.println("Piano de 4 Teclas pronto!");
}

void loop() {
  bool tocando = false;
  // Verifica qual botão está pressionado
  for (int i = 0; i < 4; i++) {
    if (digitalRead(TECLAS[i]) == LOW) { // Pressionado = LOW
      tone(BUZZER, NOTAS[i]);            // Toca a nota correspondente
      tocando = true;
      break;
    }
  }
  if (!tocando) noTone(BUZZER); // Para o som se nenhum botão
  delay(10);
}`,
    steps: [
      { title: "Botões", description: "Conecte 4 botões dos pinos D2-D5 para o GND." },
      { title: "Buzzer", description: "Conecte o + do buzzer ao D11 e − ao GND." },
      { title: "Teste", description: "Pressione cada botão para ouvir Do, Re, Mi e Fa." }
    ],
    image: "/img/projetos/piano.jpg"
  },
  {
    id: "puno-02",
    title: "Termômetro Digital com LEDs",
    description: "Sensor NTC + 3 LEDs formam um termômetro visual: verde = frio, amarelo = normal, vermelho = quente. Aprenda leitura analógica e saídas digitais.",
    difficulty: "Básico",
    compCount: 2,
    components: ["Arduino Uno R3", "Sensor de Temperatura DS18B20"],
    connections: "- DS18B20: VCC→5V, GND→GND, DATA→D4 (+resistor 4.7kΩ VCC→DATA)\n- LED Verde→D10, LED Amarelo→D9, LED Vermelho→D8 (cada um com 220Ω para GND)",
    code: `// Termômetro Visual com LEDs | Arduino Uno R3 | DEVGENIUS V12
#include <OneWire.h>
#include <DallasTemperature.h>

const int DS_PIN    =  4;  // Pino DATA do DS18B20
const int LED_VERDE   = 10; // Temperatura fria (< 20°C)
const int LED_AMARELO =  9; // Temperatura normal (20-30°C)
const int LED_VERMELHO = 8; // Temperatura alta (> 30°C)

OneWire oneWire(DS_PIN);
DallasTemperature sensors(&oneWire);

void setup() {
  pinMode(LED_VERDE,    OUTPUT);
  pinMode(LED_AMARELO,  OUTPUT);
  pinMode(LED_VERMELHO, OUTPUT);
  sensors.begin();
  Serial.begin(9600);
  Serial.println("Termometro Visual pronto!");
}

void loop() {
  sensors.requestTemperatures();
  float temp = sensors.getTempCByIndex(0); // Lê temperatura

  // Apaga todos os LEDs
  digitalWrite(LED_VERDE,    LOW);
  digitalWrite(LED_AMARELO,  LOW);
  digitalWrite(LED_VERMELHO, LOW);

  // Acende o LED da faixa correspondente
  if (temp < 20.0) {
    digitalWrite(LED_VERDE, HIGH);     // Frio
    Serial.println("FRIO: " + String(temp,1) + " C");
  } else if (temp < 30.0) {
    digitalWrite(LED_AMARELO, HIGH);   // Normal
    Serial.println("NORMAL: " + String(temp,1) + " C");
  } else {
    digitalWrite(LED_VERMELHO, HIGH);  // Quente
    Serial.println("QUENTE: " + String(temp,1) + " C");
  }
  delay(1000);
}`,
    steps: [
      { title: "DS18B20", description: "Conecte o sensor com resistor pull-up de 4.7kΩ no pino D4." },
      { title: "LEDs", description: "Verde=D10, Amarelo=D9, Vermelho=D8, cada um com resistor 220Ω." },
      { title: "Calibrar", description: "Ajuste os limiares (20°C e 30°C) conforme necessário." }
    ],
    image: "/img/projetos/termometro.jpg"
  },

  // ── ESP32 ─────────────────────────────────────────────────────────────────
  {
    id: "pesp-01",
    title: "Monitor WiFi com Dashboard Web",
    description: "ESP32 cria um servidor web local. Acesse pelo browser para ver temperatura e umidade do DHT22 em tempo real com auto-atualização a cada 3 segundos.",
    difficulty: "Intermediário",
    compCount: 2,
    components: ["ESP32 DevKit V1", "Sensor de Umidade e Temperatura DHT22"],
    connections: "- DHT22: VCC→3.3V, GND→GND, DATA→GPIO4 (+resistor 4.7kΩ entre VCC e DATA)",
    code: `// Dashboard Web com DHT22 | ESP32 DevKit V1 | DEVGENIUS V12
#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

// ══ Configure sua rede WiFi ═══════════
const char* SSID = "SUA_REDE_WIFI";
const char* PASS = "SUA_SENHA";
// ══════════════════════════════════════

DHT dht(4, DHT22);   // Sensor no GPIO4
WebServer server(80); // Servidor HTTP na porta 80

// Página HTML com atualização automática
String paginaHTML(float t, float u) {
  return "<!DOCTYPE html><html><head>"
    "<meta charset='utf-8'><meta http-equiv='refresh' content='3'>"
    "<title>DevGenius Monitor</title>"
    "<style>body{background:#050a10;color:#fff;font-family:monospace;text-align:center;}"
    "h1{color:#06b6d4}.card{display:inline-block;margin:20px;padding:40px;"
    "background:#111;border:1px solid #06b6d4;border-radius:20px;font-size:3em;}</style>"
    "</head><body>"
    "<h1>DEVGENIUS MONITOR</h1>"
    "<div class='card'>" + String(t,1) + " C</div>"
    "<div class='card'>" + String(u,1) + " %</div>"
    "<p style='color:#374151'>Atualiza a cada 3s | IP: " + WiFi.localIP().toString() + "</p>"
    "</body></html>";
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(SSID, PASS);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nConectado! IP: " + WiFi.localIP().toString());

  server.on("/", []() {
    float t = dht.readTemperature();
    float u = dht.readHumidity();
    server.send(200, "text/html", paginaHTML(t, u));
  });
  server.begin();
  Serial.println("Dashboard em: http://" + WiFi.localIP().toString());
}

void loop() {
  server.handleClient(); // Processa requisições do browser
}`,
    steps: [
      { title: "Rede WiFi", description: "Edite SSID e PASS com os dados da sua rede." },
      { title: "Upload", description: "Selecione a placa ESP32 Dev Module na IDE." },
      { title: "Acesso", description: "Abra o Serial Monitor para ver o IP e acesse pelo browser." }
    ],
    image: "/img/projetos/wifi-monitor.jpg"
  },
  {
    id: "pesp-02",
    title: "Alarme IoT por Telegram",
    description: "PIR detecta movimento e envia alerta instantâneo para o Telegram. O ESP32 usa WiFi para comunicação. Controle remoto via comandos /ativar e /desativar.",
    difficulty: "Avançado",
    compCount: 3,
    components: ["ESP32 DevKit V1", "Módulo Sensor de Movimento PIR", "Buzzer Passivo"],
    connections: "- PIR: VCC→5V, GND→GND, OUT→GPIO14\n- Buzzer: +→GPIO12, −→GND",
    code: `// Alarme IoT com Telegram | ESP32 | DEVGENIUS V12
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>

// ══ Configure aqui ════════════════════
const char* SSID      = "SUA_REDE";
const char* PASS      = "SUA_SENHA";
const char* BOT_TOKEN = "SEU_TOKEN"; // Crie via @BotFather
const char* CHAT_ID   = "SEU_CHAT_ID"; // Obtenha via @userinfobot
// ══════════════════════════════════════

const int PIR_PIN    = 14; // GPIO do sensor PIR
const int BUZZER_PIN = 12; // GPIO do buzzer

WiFiClientSecure client;
UniversalTelegramBot bot(BOT_TOKEN, client);

bool alarmeAtivo = true;
unsigned long ultimoMovimento = 0;
const unsigned long COOLDOWN = 15000; // 15s entre alertas

void verificarComandos() {
  int n = bot.getUpdates(bot.last_message_received + 1);
  while (n) {
    String txt = bot.messages[0].text;
    String id  = bot.messages[0].chat_id;
    if (txt == "/ativar")   { alarmeAtivo = true;  bot.sendMessage(id, "Alarme ATIVADO!"); }
    if (txt == "/desativar"){ alarmeAtivo = false; bot.sendMessage(id, "Alarme desativado."); }
    if (txt == "/status")   { bot.sendMessage(id, alarmeAtivo ? "Status: ATIVO" : "Status: inativo"); }
    n = bot.getUpdates(bot.last_message_received + 1);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN,    INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  client.setInsecure();
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi OK! Bot pronto.");
  bot.sendMessage(CHAT_ID, "ESP32 Alarme online!\\nComandos: /ativar /desativar /status");
}

void loop() {
  static unsigned long tVerifica = 0;
  if (millis() - tVerifica > 3000) { verificarComandos(); tVerifica = millis(); }

  if (digitalRead(PIR_PIN) && alarmeAtivo && millis() - ultimoMovimento > COOLDOWN) {
    ultimoMovimento = millis();
    bot.sendMessage(CHAT_ID, "ALERTA: Movimento detectado!");
    tone(BUZZER_PIN, 1000, 500);
    Serial.println("MOVIMENTO DETECTADO!");
  }
}`,
    steps: [
      { title: "Bot Telegram", description: "Crie um bot via @BotFather e obtenha o TOKEN." },
      { title: "Chat ID", description: "Envie /start para o bot e use @userinfobot para obter seu CHAT_ID." },
      { title: "Deploy", description: "Após upload, o bot começa a monitorar e enviar alertas." }
    ],
    image: "/img/projetos/telegram-alarm.jpg"
  },

  // ── Arduino Mega ──────────────────────────────────────────────────────────
  {
    id: "pmega-01",
    title: "Central de Sensores (5 sensores simultâneos)",
    description: "Arduino Mega monitora DHT22, ultrassônico, PIR, LDR e potenciômetro ao mesmo tempo. Exibe tudo no Serial em formato de dashboard atualizado a cada segundo.",
    difficulty: "Intermediário",
    compCount: 5,
    components: ["Arduino Mega 2560", "Sensor de Umidade e Temperatura DHT22", "Sensor Ultrassônico HC-SR04", "Módulo Sensor de Movimento PIR", "Módulo Sensor de Luz LDR"],
    connections: "- DHT22: DATA→D22 (+4.7kΩ)\n- HC-SR04: TRIG→D24, ECHO→D26\n- PIR: OUT→D28\n- LDR: OUT→A0 (divisor 10kΩ)\n- Pot: saída→A1",
    code: `// Central de 5 Sensores | Arduino Mega 2560 | DEVGENIUS V12
#include <DHT.h>

DHT dht(22, DHT22);       // DHT22 no pino D22

// Pinos dos sensores
const int TRIG  = 24;      // HC-SR04 Trig
const int ECHO  = 26;      // HC-SR04 Echo
const int PIR   = 28;      // Sensor PIR
const int LDR   = A0;      // Sensor de luz
const int POT   = A1;      // Potenciômetro

float medirDistancia() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) * 0.034 / 2.0;
}

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT); pinMode(PIR, INPUT);
  Serial.println("=== CENTRAL DE SENSORES DEVGENIUS ===");
}

void loop() {
  float t    = dht.readTemperature();
  float u    = dht.readHumidity();
  float dist = medirDistancia();
  bool  mov  = digitalRead(PIR);
  int   luz  = analogRead(LDR);
  int   pot  = analogRead(POT);

  Serial.println("============================");
  Serial.print("TEMP:   "); Serial.print(t,1);  Serial.println(" C");
  Serial.print("UMID:   "); Serial.print(u,1);  Serial.println(" %");
  Serial.print("DIST:   "); Serial.print(dist,1);Serial.println(" cm");
  Serial.print("MOTION: "); Serial.println(mov?"DETECTADO":"livre");
  Serial.print("LUZ:    "); Serial.println(luz);
  Serial.print("POT:    "); Serial.print(map(pot,0,1023,0,100)); Serial.println("%");
  delay(1000);
}`,
    steps: [
      { title: "Mega", description: "O Mega tem mais pinos e memória — ideal para múltiplos sensores." },
      { title: "Ligações", description: "Use pinos D22-D28 para sensores digitais e A0/A1 para analógicos." },
      { title: "Monitor", description: "Abra o Serial Monitor (9600 baud) para ver o dashboard." }
    ],
    image: "/img/projetos/central-sensores.jpg"
  },
  {
    id: "pmega-02",
    title: "Controlador de Braço Robótico",
    description: "4 servos controlados simultaneamente via joystick analógico e botões. O Mega gerencia todos os servos sem conflito graças aos seus múltiplos pinos.",
    difficulty: "Avançado",
    compCount: 4,
    components: ["Arduino Mega 2560", "Servo Motor MG996R High Torque", "Joystick Analógico", "Display LCD 16x2 com I2C"],
    connections: "- Servos: S1→D2, S2→D3, S3→D4, S4→D5 (VCC externo 5V/3A)\n- Joystick: VRX→A0, VRY→A1, SW→D22\n- LCD: SDA→D20, SCL→D21",
    code: `// Braço Robótico com Joystick | Mega 2560 | DEVGENIUS V12
#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

Servo s1, s2, s3, s4;      // 4 servos do braço
LiquidCrystal_I2C lcd(0x27, 16, 2);

const int JOY_X = A0, JOY_Y = A1, JOY_SW = 22;

int angulos[4] = {90, 90, 90, 90}; // Ângulos iniciais (centro)
int servoSel = 0;                    // Servo selecionado pelo botão

void moverServos() {
  s1.write(angulos[0]); s2.write(angulos[1]);
  s3.write(angulos[2]); s4.write(angulos[3]);
}

void atualizarLCD() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Servo " + String(servoSel+1) + ": " + angulos[servoSel] + " graus");
  lcd.setCursor(0,1); lcd.print("S1:" + String(angulos[0]) + " S2:" + String(angulos[1]));
}

void setup() {
  s1.attach(2); s2.attach(3); s3.attach(4); s4.attach(5);
  moverServos();
  pinMode(JOY_SW, INPUT_PULLUP);
  lcd.init(); lcd.backlight();
  lcd.print("Braco Robotico"); delay(1500);
}

void loop() {
  // Botão do joystick muda o servo selecionado
  if (digitalRead(JOY_SW) == LOW) {
    servoSel = (servoSel + 1) % 4;
    delay(300);
  }

  // Joystick X controla o servo selecionado
  int jx = analogRead(JOY_X);
  if (jx < 400)      angulos[servoSel] = max(0,   angulos[servoSel] - 2);
  else if (jx > 600) angulos[servoSel] = min(180, angulos[servoSel] + 2);

  moverServos();
  atualizarLCD();
  delay(20);
}`,
    steps: [
      { title: "Fonte externa", description: "Servos MG996R precisam de fonte 5V/3A separada. GND comum com o Mega." },
      { title: "Joystick", description: "Eixo X controla o ângulo; botão SW alterna qual servo está ativo." },
      { title: "LCD", description: "Conectado ao I2C do Mega: SDA=D20, SCL=D21." }
    ],
    image: "/img/projetos/braco-robotico.jpg"
  },

  // ── Raspberry Pi Pico ──────────────────────────────────────────────────────
  {
    id: "ppico-01",
    title: "Estação Meteorológica MicroPython",
    description: "Raspberry Pi Pico com MicroPython lê DHT22 e exibe dados no OLED. Usa a elegância do Python para hardware embarcado — ideal para quem vem do Python.",
    difficulty: "Intermediário",
    compCount: 3,
    components: ["Raspberry Pi Pico", "Sensor de Umidade e Temperatura DHT22", "Display OLED I2C 128x64"],
    connections: "- DHT22: VCC→3.3V, GND→GND, DATA→GP4 (+4.7kΩ pull-up)\n- OLED: SDA→GP6, SCL→GP7, VCC→3.3V, GND→GND",
    code: `# Estação Meteorológica MicroPython | Raspberry Pi Pico | DEVGENIUS V12
# Instale os arquivos: dht.py e ssd1306.py no Pico via Thonny

import machine
import utime
import dht
from machine import Pin, I2C
import ssd1306

# Configuração dos periféricos
sensor = dht.DHT22(Pin(4))              # Sensor no GP4
i2c    = I2C(1, sda=Pin(6), scl=Pin(7)) # I2C1 no GP6/GP7
display = ssd1306.SSD1306_I2C(128, 64, i2c)

print("Estação Meteorológica DevGenius - MicroPython")

while True:
    try:
        sensor.measure()                    # Inicia medição
        temperatura = sensor.temperature()  # Temperatura em °C
        umidade     = sensor.humidity()     # Umidade em %

        # Atualiza o display OLED
        display.fill(0)                     # Limpa o display
        display.text("DevGenius", 20, 0)
        display.text("Meteorologia", 10, 10)
        display.hline(0, 20, 128, 1)        # Linha separadora

        display.text(f"Temp: {temperatura:.1f} C", 0, 30)
        display.text(f"Umid: {umidade:.1f} %", 0, 45)
        display.show()                      # Envia para o OLED

        print(f"T={temperatura:.1f}C | U={umidade:.1f}%")

    except Exception as e:
        display.fill(0)
        display.text("Erro sensor!", 10, 28)
        display.show()
        print(f"Erro: {e}")

    utime.sleep(2)  # Aguarda 2 segundos`,
    steps: [
      { title: "MicroPython", description: "Instale MicroPython no Pico via Thonny. Baixe o firmware em micropython.org/download/rp2-pico." },
      { title: "Bibliotecas", description: "Copie dht.py e ssd1306.py para o Pico via Thonny (arquivos disponíveis no GitHub MicroPython)." },
      { title: "Executar", description: "Salve o código como main.py no Pico para executar automaticamente ao ligar." }
    ],
    image: "/img/projetos/pico-meteo.jpg"
  },
  {
    id: "ppico-02",
    title: "Servo Controller USB-HID",
    description: "O Pico emula um dispositivo USB HID e controla 3 servos com comandos enviados pelo computador via Serial. Interface Python no PC controla o braço.",
    difficulty: "Avançado",
    compCount: 2,
    components: ["Raspberry Pi Pico", "Servo Motor MG996R High Torque"],
    connections: "- Servo 1: sinal→GP0, Servo 2: sinal→GP1, Servo 3: sinal→GP2\n- VCC servos: fonte externa 5V/2A (GND comum com Pico)",
    code: `# Controle de Servos via Serial USB | Raspberry Pi Pico | DEVGENIUS V12
# Envie comandos pelo Serial: "S1:90 S2:45 S3:120" ou "CENTER"

from machine import Pin, PWM
import sys
import utime

class Servo:
    """Controla servo motor via PWM no Raspberry Pi Pico"""
    def __init__(self, pin):
        self.pwm = PWM(Pin(pin))
        self.pwm.freq(50)         # 50 Hz = período de 20ms (padrão servo)
        self.angulo = 90
        self.write(90)            # Inicia no centro

    def write(self, angulo):
        """Define ângulo do servo (0 a 180 graus)"""
        angulo = max(0, min(180, angulo))
        self.angulo = angulo
        # Converte ângulo para largura de pulso (1ms-2ms → 0-180°)
        pulse = int((angulo / 180.0) * 5000 + 2000)  # Duty cycle em unidades PWM
        self.pwm.duty_u16(pulse)

# Cria os 3 servos nos pinos GP0, GP1, GP2
servos = [Servo(0), Servo(1), Servo(2)]
print("Controle de 3 Servos via USB Serial")
print("Comandos: S1:90 S2:45 S3:120 | CENTER | ANGULOS")

while True:
    try:
        linha = sys.stdin.readline().strip()  # Lê comando via USB Serial
        if not linha:
            continue

        if linha == "CENTER":
            for s in servos: s.write(90)
            print("OK: Todos centrados em 90 graus")

        elif linha == "ANGULOS":
            print(f"S1:{servos[0].angulo} S2:{servos[1].angulo} S3:{servos[2].angulo}")

        else:
            # Processa comandos do tipo "S1:90 S2:45"
            partes = linha.split()
            for parte in partes:
                if parte.startswith("S") and ":" in parte:
                    idx_str, ang_str = parte.split(":")
                    idx = int(idx_str[1:]) - 1  # S1 → índice 0
                    ang = int(ang_str)
                    if 0 <= idx < 3:
                        servos[idx].write(ang)
                        print(f"OK: Servo {idx+1} = {ang} graus")

    except Exception as e:
        print(f"Erro: {e}")`,
    steps: [
      { title: "MicroPython", description: "Instale MicroPython no Pico. Salve o código como main.py." },
      { title: "Servos", description: "Conecte 3 servos nos GP0, GP1, GP2. Use fonte externa de 5V/2A." },
      { title: "Controle", description: "Abra o Serial no Thonny e envie comandos: 'S1:90 S2:45 S3:120'." }
    ],
    image: "/img/projetos/pico-servo.jpg"
  },

  // ── Teensy 4.1 ────────────────────────────────────────────────────────────
  {
    id: "pteensy-01",
    title: "Analisador de Áudio em Tempo Real",
    description: "Teensy 4.1 + microfone analisam o áudio ambiente usando FFT em tempo real. O LED RGB muda de cor conforme a frequência dominante — visualizador musical.",
    difficulty: "Expert",
    compCount: 3,
    components: ["Teensy 4.1", "Sensor de Som High Sensitivity", "Módulo LED RGB DevGenius"],
    connections: "- Microfone: OUT→A0, VCC→3.3V, GND→GND\n- LED RGB: R→D2, G→D3, B→D4 (cátodo comum ao GND)",
    code: `// Analisador de Áudio FFT | Teensy 4.1 | DEVGENIUS V12
// O Teensy 4.1 executa a FFT a 600MHz — ideal para DSP
#include <arm_math.h>  // DSP otimizado para ARM Cortex-M7

const int MIC_PIN   = A0;
const int LED_R = 2, LED_G = 3, LED_B = 4;
const int FFT_SIZE  = 256; // Tamanho da janela FFT

float amostras[FFT_SIZE * 2]; // Buffer de amostras (interleaved real/imag)
float magnitude[FFT_SIZE / 2]; // Magnitudes das frequências

void capturarAmostras() {
  for (int i = 0; i < FFT_SIZE; i++) {
    amostras[i * 2]     = analogRead(MIC_PIN) - 512.0; // Parte real
    amostras[i * 2 + 1] = 0;                            // Parte imaginária = 0
    delayMicroseconds(40); // ~25kHz de taxa de amostragem
  }
}

int frequenciaDominante() {
  arm_cfft_f32(&arm_cfft_sR_f32_len256, amostras, 0, 1); // FFT in-place
  arm_cmplx_mag_f32(amostras, magnitude, FFT_SIZE / 2);   // Calcula magnitudes

  int idxMax = 0;
  float magMax = 0;
  for (int i = 2; i < FFT_SIZE / 2; i++) { // Ignora DC e frequência muito baixa
    if (magnitude[i] > magMax) { magMax = magnitude[i]; idxMax = i; }
  }
  return idxMax * 25000 / FFT_SIZE; // Converte índice para Hz
}

void setRGB(int r, int g, int b) {
  analogWrite(LED_R, r); analogWrite(LED_G, g); analogWrite(LED_B, b);
}

void setup() {
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT);
  analogReadResolution(12); // 12 bits no Teensy (0-4095)
  Serial.begin(115200);
  Serial.println("Analisador FFT - Teensy 4.1 | DevGenius V12");
}

void loop() {
  capturarAmostras();
  int freq = frequenciaDominante();

  // Cor baseada na frequência dominante
  if (freq < 300)       setRGB(255, 0,   0);   // Grave → Vermelho
  else if (freq < 1000) setRGB(255, 128, 0);   // Médio grave → Laranja
  else if (freq < 3000) setRGB(0,   255, 0);   // Médio → Verde
  else if (freq < 6000) setRGB(0,   128, 255); // Médio agudo → Azul claro
  else                  setRGB(128, 0,   255); // Agudo → Roxo

  Serial.print("Freq dominante: "); Serial.print(freq); Serial.println(" Hz");
}`,
    steps: [
      { title: "Teensy 4.1", description: "Configure a board Teensy 4.1 na Teensyduino IDE. Instale a arm_math.h via biblioteca CMSIS." },
      { title: "Microfone", description: "Conecte o sensor de som analógico ao A0 do Teensy." },
      { title: "LED RGB", description: "Cátodo comum ao GND, R/G/B nos pinos PWM D2, D3, D4." }
    ],
    image: "/img/projetos/audio-fft.jpg"
  },
  {
    id: "pteensy-02",
    title: "MIDI Controller USB",
    description: "Teensy 4.1 emula um dispositivo MIDI USB. Potenciômetros e botões controlam instrumentos virtuais no computador. Plug-and-play com DAWs.",
    difficulty: "Expert",
    compCount: 3,
    components: ["Teensy 4.1", "Potenciômetro Rotativo 10k", "Encoder Rotativo KY-040"],
    connections: "- 4 Potenciômetros: A0, A1, A2, A3\n- 4 Botões (notas): D2, D3, D4, D5 (INPUT_PULLUP)\n- Encoder: CLK→D6, DT→D7, SW→D8",
    code: `// MIDI Controller USB | Teensy 4.1 | DEVGENIUS V12
// Selecione "MIDI" no USB Type da Teensyduino!
// (Tools → USB Type → MIDI)

// Pinos dos 4 potenciômetros (Control Change)
const int POT_PINS[] = {A0, A1, A2, A3};
const int CC_NUMS[]  = {7, 10, 11, 74}; // Volume, Pan, Expression, Filtro

// Pinos dos 4 botões (notas)
const int BTN_PINS[]  = {2, 3, 4, 5};
const int BTN_NOTAS[] = {60, 62, 64, 65}; // C4, D4, E4, F4

// Encoder (ajusta preset/banco)
const int ENC_CLK = 6, ENC_DT = 7, ENC_SW = 8;

int pot_anterior[4]  = {-1,-1,-1,-1};
bool btn_anterior[4] = {false,false,false,false};
int enc_clk_ant = HIGH;
int programa = 0; // Programa MIDI atual (0-127)

void setup() {
  for (int i = 0; i < 4; i++) pinMode(BTN_PINS[i], INPUT_PULLUP);
  pinMode(ENC_CLK, INPUT_PULLUP);
  pinMode(ENC_DT,  INPUT_PULLUP);
  pinMode(ENC_SW,  INPUT_PULLUP);
  Serial.begin(115200);
  Serial.println("MIDI Controller pronto!");
}

void loop() {
  // ── Potenciômetros → Control Change ─────────────────────────────
  for (int i = 0; i < 4; i++) {
    int val = analogRead(POT_PINS[i]) >> 3; // 0-1023 → 0-127
    if (abs(val - pot_anterior[i]) > 1) {   // Só envia se mudou
      usbMIDI.sendControlChange(CC_NUMS[i], val, 1);
      pot_anterior[i] = val;
    }
  }

  // ── Botões → Note On/Off ─────────────────────────────────────────
  for (int i = 0; i < 4; i++) {
    bool pressionado = (digitalRead(BTN_PINS[i]) == LOW);
    if (pressionado && !btn_anterior[i]) {
      usbMIDI.sendNoteOn(BTN_NOTAS[i], 100, 1);  // Nota ligada
    }
    if (!pressionado && btn_anterior[i]) {
      usbMIDI.sendNoteOff(BTN_NOTAS[i], 0, 1);   // Nota desligada
    }
    btn_anterior[i] = pressionado;
  }

  // ── Encoder → Mudança de programa ────────────────────────────────
  int clk = digitalRead(ENC_CLK);
  if (clk != enc_clk_ant && clk == LOW) {
    if (digitalRead(ENC_DT) != clk) programa = min(127, programa + 1);
    else                             programa = max(0,   programa - 1);
    usbMIDI.sendProgramChange(programa, 1);
    Serial.print("Programa: "); Serial.println(programa);
  }
  enc_clk_ant = clk;

  usbMIDI.read(); // Necessário para manter o MIDI USB funcionando
  delay(5);
}`,
    steps: [
      { title: "USB MIDI", description: "Na Teensyduino: Tools → USB Type → MIDI. Isso transforma o Teensy em um controlador MIDI plug-and-play." },
      { title: "DAW", description: "Abra seu DAW (FL Studio, Ableton, Reaper). O Teensy aparece automaticamente como dispositivo MIDI." },
      { title: "Mapeamento", description: "Os CCs 7, 10, 11 e 74 controlam Volume, Pan, Expression e Filtro respectivamente." }
    ],
    image: "/img/projetos/midi-controller.jpg"
  }
];
