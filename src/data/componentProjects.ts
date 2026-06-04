// 10 projetos completos por componente/placa.
// Código Arduino sem cortes — compilável diretamente.

export interface ComponentProject {
  id: string;
  title: string;
  difficulty: "Iniciante" | "Intermediário" | "Avançado";
  time: string;
  description: string;
  connections: string;
  code: string;
}

// ─── Projetos por ID de componente/placa ──────────────────────────────────

const PROJECTS_MAP: Record<string, ComponentProject[]> = {

  // ── Arduino Uno R3 ────────────────────────────────────────────────────────
  p1: [
    {
      id: "p1-01", title: "Blink Personalizado", difficulty: "Iniciante", time: "15 min",
      description: "Pisca o LED embutido com intervalo ajustável via potenciômetro no pino A0.",
      connections: "LED interno no pino 13 (embutido). Potenciômetro: terminal esquerdo → 5V, terminal do meio → A0, terminal direito → GND.",
      code: `// Projeto 1 — Blink Personalizado com Potenciômetro
// Arduino Uno R3 | DEVGENIUS V12
// Controla o intervalo do LED com potenciômetro

const int LED_PIN = 13;
const int POT_PIN = A0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink Personalizado iniciado!");
}

void loop() {
  int leitura = analogRead(POT_PIN);            // 0 a 1023
  int intervalo = map(leitura, 0, 1023, 50, 2000); // 50ms a 2s

  digitalWrite(LED_PIN, HIGH);
  delay(intervalo);
  digitalWrite(LED_PIN, LOW);
  delay(intervalo);

  Serial.print("Intervalo: ");
  Serial.print(intervalo);
  Serial.println(" ms");
}`
    },
    {
      id: "p1-02", title: "Monitor de Temperatura NTC", difficulty: "Iniciante", time: "20 min",
      description: "Lê um termistor NTC 10kΩ no pino A1 e exibe a temperatura em °C via Serial.",
      connections: "Termistor NTC: um terminal → 5V, outro terminal → A1 e simultaneamente → resistor 10kΩ → GND.",
      code: `// Projeto 2 — Monitor de Temperatura com NTC
// Arduino Uno R3 | DEVGENIUS V12

#include <math.h>

const int NTC_PIN = A1;
const float RESISTOR  = 10000.0;  // 10kΩ pull-down
const float NOMINAL_R = 10000.0;  // resistência NTC a 25°C
const float NOMINAL_T = 25.0;     // temperatura nominal (°C)
const float B_COEF    = 3950.0;   // coeficiente B do NTC

float lerTemperatura() {
  int raw = analogRead(NTC_PIN);
  float tensao   = raw * 5.0 / 1023.0;
  float r_ntc    = RESISTOR * tensao / (5.0 - tensao);
  float steinhart = log(r_ntc / NOMINAL_R) / B_COEF;
  steinhart      += 1.0 / (NOMINAL_T + 273.15);
  return (1.0 / steinhart) - 273.15;
}

void setup() {
  Serial.begin(9600);
  Serial.println("=== Monitor NTC ===");
}

void loop() {
  float temp = lerTemperatura();
  Serial.print("Temperatura: ");
  Serial.print(temp, 1);
  Serial.println(" °C");

  if (temp > 40.0) {
    Serial.println("ALERTA: temperatura elevada!");
  }
  delay(1000);
}`
    },
    {
      id: "p1-03", title: "Semáforo Inteligente", difficulty: "Iniciante", time: "25 min",
      description: "Semáforo com LEDs RGB e sensor de presença no botão de pedestre.",
      connections: "LED vermelho → pino 8 → resistor 220Ω → GND. LED amarelo → pino 9 → resistor 220Ω → GND. LED verde → pino 10 → resistor 220Ω → GND. Botão → pino 2 → GND (INPUT_PULLUP).",
      code: `// Projeto 3 — Semáforo Inteligente com Pedestre
// Arduino Uno R3 | DEVGENIUS V12

const int RED    = 8;
const int YELLOW = 9;
const int GREEN  = 10;
const int BTN    = 2;

bool pedestreAguardando = false;

void IRAM_ATTR pedestre() {
  pedestreAguardando = true;
}

void setLeds(bool r, bool y, bool g) {
  digitalWrite(RED,    r);
  digitalWrite(YELLOW, y);
  digitalWrite(GREEN,  g);
}

void setup() {
  pinMode(RED,    OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN,  OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BTN), pedestre, FALLING);
  Serial.begin(9600);
}

void loop() {
  // Verde — carros passam
  setLeds(false, false, true);
  Serial.println("VERDE");
  unsigned long t = millis();
  while (millis() - t < 5000) {
    if (pedestreAguardando) break;
    delay(100);
  }

  // Amarelo
  setLeds(false, true, false);
  Serial.println("AMARELO");
  delay(2000);

  // Vermelho — pedestres atravessam
  setLeds(true, false, false);
  Serial.println("VERMELHO — Pedestre pode atravessar");
  pedestreAguardando = false;
  delay(5000);
}`
    },
    {
      id: "p1-04", title: "Piano de 8 Teclas", difficulty: "Iniciante", time: "30 min",
      description: "8 botões tocam notas musicais em um buzzer passivo usando a função tone().",
      connections: "8 botões em pinos 2-9 (INPUT_PULLUP, outro terminal ao GND). Buzzer passivo no pino 11 com resistor 100Ω em série.",
      code: `// Projeto 4 — Piano de 8 Teclas
// Arduino Uno R3 | DEVGENIUS V12

const int BUZZER = 11;
const int TECLAS[] = {2, 3, 4, 5, 6, 7, 8, 9};
const int NOTAS[]  = {262, 294, 330, 349, 392, 440, 494, 523}; // C4 a C5
const char NOMES[][3] = {"Do","Re","Mi","Fa","Sol","La","Si","Do"};

void setup() {
  for (int i = 0; i < 8; i++) pinMode(TECLAS[i], INPUT_PULLUP);
  Serial.begin(9600);
  Serial.println("Piano pronto!");
}

void loop() {
  bool tocando = false;
  for (int i = 0; i < 8; i++) {
    if (digitalRead(TECLAS[i]) == LOW) {
      tone(BUZZER, NOTAS[i]);
      Serial.print("Nota: "); Serial.println(NOMES[i]);
      tocando = true;
      delay(20); // debounce
    }
  }
  if (!tocando) noTone(BUZZER);
}`
    },
    {
      id: "p1-05", title: "Medidor de Distância Ultrassônico", difficulty: "Iniciante", time: "20 min",
      description: "HC-SR04 mede distância e aciona LEDs por faixa (verde/amarelo/vermelho).",
      connections: "HC-SR04: VCC→5V, GND→GND, Trig→pino 6, Echo→pino 7. LED verde→pino 10, LED amarelo→pino 9, LED vermelho→pino 8 (cada um com 220Ω para GND).",
      code: `// Projeto 5 — Medidor de Distância com LEDs
// Arduino Uno R3 | DEVGENIUS V12

#define TRIG 6
#define ECHO 7
#define LED_G 10
#define LED_Y  9
#define LED_R  8

float medirCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long dur = pulseIn(ECHO, HIGH, 30000);
  return dur * 0.034 / 2.0;
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_Y, OUTPUT);
  pinMode(LED_R, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  float dist = medirCm();
  Serial.print("Distância: "); Serial.print(dist); Serial.println(" cm");

  digitalWrite(LED_G, dist > 30);
  digitalWrite(LED_Y, dist > 10 && dist <= 30);
  digitalWrite(LED_R, dist <= 10);

  delay(200);
}`
    },
    {
      id: "p1-06", title: "Termostato Digital", difficulty: "Intermediário", time: "45 min",
      description: "Controla um relé (aquecedor/cooler) via PID simples com sensor NTC e exibe status via Serial.",
      connections: "NTC 10kΩ em A0 (divisor com 10kΩ para GND). Módulo relé no pino 12 (sinal ativo em LOW). LED de status no pino 13.",
      code: `// Projeto 6 — Termostato Digital com PID Simples
// Arduino Uno R3 | DEVGENIUS V12

#include <math.h>

const int NTC_PIN   = A0;
const int RELE_PIN  = 12;
const int LED_PIN   = 13;

const float SETPOINT   = 28.0; // temperatura alvo °C
const float HISTERESE  = 1.0;  // banda morta ±1°C

float lerTemp() {
  int raw = analogRead(NTC_PIN);
  float v = raw * 5.0 / 1023.0;
  float r = 10000.0 * v / (5.0 - v);
  float s = log(r / 10000.0) / 3950.0 + 1.0 / 298.15;
  return 1.0 / s - 273.15;
}

void setup() {
  pinMode(RELE_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELE_PIN, HIGH); // relé desligado (ativo LOW)
  Serial.begin(9600);
  Serial.println("Termostato Digital");
  Serial.print("Setpoint: "); Serial.println(SETPOINT);
}

void loop() {
  float temp = lerTemp();
  bool aquecendo = (digitalRead(RELE_PIN) == LOW);

  if (temp < SETPOINT - HISTERESE && !aquecendo) {
    digitalWrite(RELE_PIN, LOW);
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[LIGAR] Aquecedor ON");
  } else if (temp > SETPOINT + HISTERESE && aquecendo) {
    digitalWrite(RELE_PIN, HIGH);
    digitalWrite(LED_PIN, LOW);
    Serial.println("[DESLIGAR] Aquecedor OFF");
  }

  Serial.print("Temp: "); Serial.print(temp, 1); Serial.print("°C | Estado: ");
  Serial.println(aquecendo ? "AQUECENDO" : "OK");
  delay(2000);
}`
    },
    {
      id: "p1-07", title: "Registrador de Dados (Datalogger)", difficulty: "Intermediário", time: "1h",
      description: "Registra temperatura, umidade (DHT22) e tempo em EEPROM interna, exibindo ao reiniciar.",
      connections: "DHT22: VCC→5V, GND→GND, DATA→pino 4 (+ resistor 4.7kΩ entre VCC e DATA).",
      code: `// Projeto 7 — Datalogger em EEPROM
// Arduino Uno R3 | DEVGENIUS V12

#include <DHT.h>
#include <EEPROM.h>

#define DHT_PIN  4
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

struct Registro {
  float temperatura;
  float umidade;
  unsigned long tempo_ms;
};

const int MAX_REGISTROS = 20; // EEPROM = 1KB → ~20 registros
int indice = 0;

void salvarRegistro(float t, float u) {
  if (indice >= MAX_REGISTROS) indice = 0;
  Registro r = {t, u, millis()};
  EEPROM.put(indice * sizeof(Registro), r);
  indice++;
  Serial.print("Salvo #"); Serial.println(indice);
}

void exibirHistorico() {
  Serial.println("=== HISTÓRICO EEPROM ===");
  for (int i = 0; i < MAX_REGISTROS; i++) {
    Registro r;
    EEPROM.get(i * sizeof(Registro), r);
    if (r.temperatura > -100 && r.temperatura < 100) {
      Serial.print("["); Serial.print(i); Serial.print("] ");
      Serial.print(r.temperatura, 1); Serial.print("°C ");
      Serial.print(r.umidade, 1); Serial.print("% @ ");
      Serial.print(r.tempo_ms / 1000); Serial.println("s");
    }
  }
}

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("Datalogger DEVGENIUS");
  exibirHistorico();
}

void loop() {
  float t = dht.readTemperature();
  float u = dht.readHumidity();
  if (!isnan(t) && !isnan(u)) salvarRegistro(t, u);
  delay(10000); // grava a cada 10s
}`
    },
    {
      id: "p1-08", title: "Decodificador IR → Servo", difficulty: "Intermediário", time: "40 min",
      description: "Controla ângulo de servo motor com controle remoto IR (protocolo NEC).",
      connections: "Receptor IR TSOP38238: OUT→pino 11, VCC→5V, GND→GND. Servo: sinal→pino 9, VCC→5V externo, GND→GND comum.",
      code: `// Projeto 8 — Controle IR para Servo
// Arduino Uno R3 | DEVGENIUS V12

#include <IRremote.hpp>
#include <Servo.h>

#define IR_PIN   11
#define SERVO_PIN 9

Servo servo;
int angulo = 90;

void setup() {
  Serial.begin(9600);
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
  servo.attach(SERVO_PIN);
  servo.write(angulo);
  Serial.println("Decodificador IR → Servo");
  Serial.println("Vol+ = +10° | Vol- = -10° | Play = 90°");
}

void loop() {
  if (IrReceiver.decode()) {
    uint32_t cmd = IrReceiver.decodedIRData.command;
    Serial.print("Comando recebido: 0x"); Serial.println(cmd, HEX);

    if (cmd == 0x15) { angulo = min(180, angulo + 10); } // Vol+
    if (cmd == 0x07) { angulo = max(0,   angulo - 10); } // Vol-
    if (cmd == 0x43) { angulo = 90; }                     // Play/Pause

    servo.write(angulo);
    Serial.print("Ângulo: "); Serial.println(angulo);
    IrReceiver.resume();
  }
}`
    },
    {
      id: "p1-09", title: "Osciloscópio Serial", difficulty: "Avançado", time: "1h",
      description: "Lê sinal analógico em A0 a 1 kHz e envia amostras via Serial para visualização no Serial Plotter.",
      connections: "Sinal a medir (máx 5V) → A0. Aterramento comum obrigatório. Para medir sinais AC: divisor resistivo para deslocar para ~2.5V.",
      code: `// Projeto 9 — Osciloscópio Serial (1kHz)
// Arduino Uno R3 | DEVGENIUS V12
// Abra o Serial Plotter (115200 baud) para visualizar

const int CANAL_A = A0;
const int CANAL_B = A1;
const unsigned long PERIODO_US = 1000; // 1ms = 1kHz

unsigned long ultimoT = 0;

void setup() {
  Serial.begin(115200);
  analogReference(DEFAULT); // 5V referência
  // Header para Serial Plotter
  Serial.println("CanalA\tCanalB\tReferencia");
}

void loop() {
  unsigned long agora = micros();
  if (agora - ultimoT >= PERIODO_US) {
    ultimoT = agora;
    int a = analogRead(CANAL_A);
    int b = analogRead(CANAL_B);
    // Converte para mV
    float va = a * 4882.8 / 1000.0; // 5000mV / 1023
    float vb = b * 4882.8 / 1000.0;
    Serial.print(va, 1); Serial.print("\t");
    Serial.print(vb, 1); Serial.print("\t");
    Serial.println(2500.0); // linha de referência 2.5V
  }
}`
    },
    {
      id: "p1-10", title: "Estação Meteorológica Completa", difficulty: "Avançado", time: "2h",
      description: "DHT22 + BMP280 + Display OLED 128x64. Exibe temperatura, umidade, pressão e altitude em tempo real.",
      connections: "DHT22→pino 4. BMP280 I2C: SDA→A4, SCL→A5, VCC→3.3V. OLED SSD1306 I2C: SDA→A4, SCL→A5, VCC→3.3V.",
      code: `// Projeto 10 — Estação Meteorológica Completa
// Arduino Uno R3 | DEVGENIUS V12

#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>

#define DHT_PIN  4
#define DHT_TYPE DHT22
#define SCREEN_W 128
#define SCREEN_H  64

DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_BMP280 bmp;
Adafruit_SSD1306 display(SCREEN_W, SCREEN_H, &Wire, -1);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Wire.begin();

  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 nao encontrado!");
    while (1);
  }
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED nao encontrado!");
    while (1);
  }

  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(20, 28);
  display.println("ESTACAO DEVGENIUS");
  display.display();
  delay(2000);
  Serial.println("Estacao Meteorologica DEVGENIUS OK");
}

void loop() {
  float temp_d = dht.readTemperature();
  float umid   = dht.readHumidity();
  float temp_b = bmp.readTemperature();
  float pressao = bmp.readPressure() / 100.0;
  float altitude = bmp.readAltitude(1013.25);

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("T(DHT):"); display.print(temp_d, 1); display.println("C");
  display.print("Umid:  "); display.print(umid,   1); display.println("%");
  display.print("P:     "); display.print(pressao, 1); display.println("hPa");
  display.print("Alt:   "); display.print(altitude, 0); display.println("m");
  display.print("T(BMP):"); display.print(temp_b, 1); display.println("C");
  display.display();

  Serial.printf("T=%.1fC U=%.1f%% P=%.1fhPa Alt=%.0fm\n",
    temp_d, umid, pressao, altitude);
  delay(2000);
}`
    },
  ],

  // ── ESP32 DevKit V1 ──────────────────────────────────────────────────────
  p3: [
    {
      id: "p3-01", title: "Monitor WiFi Dashboard", difficulty: "Iniciante", time: "30 min",
      description: "Servidor web no ESP32 exibe dados de sensores em tempo real via browser na rede local.",
      connections: "Nenhuma conexão externa obrigatória. Opcional: LED no pino 2 para feedback.",
      code: `// Projeto 1 — Dashboard Web Local
// ESP32 DevKit V1 | DEVGENIUS V12

#include <WiFi.h>
#include <WebServer.h>

const char* SSID = "SUA_REDE";
const char* PASS = "SUA_SENHA";

WebServer server(80);
float temperatura = 25.3;
float umidade     = 65.0;

String gerarHTML() {
  return String("<!DOCTYPE html><html><head><meta charset='utf-8'>")
    + "<meta http-equiv='refresh' content='3'>"
    + "<title>DEVGENIUS Dashboard</title>"
    + "<style>body{background:#0a0a0a;color:#00ffff;font-family:monospace;text-align:center;}"
    + "h1{color:#00ffff}.card{display:inline-block;margin:20px;padding:30px;"
    + "border:1px solid #00ffff;border-radius:20px;font-size:2em;}</style></head><body>"
    + "<h1>DEVGENIUS V12</h1>"
    + "<div class='card'>Temperatura<br><b>" + String(temperatura, 1) + " °C</b></div>"
    + "<div class='card'>Umidade<br><b>"    + String(umidade, 1)     + " %</b></div>"
    + "<p>IP: " + WiFi.localIP().toString() + "</p></body></html>";
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(SSID, PASS);
  Serial.print("Conectando");
  while (WiFi.status() != WL_CONNECTED) { Serial.print("."); delay(500); }
  Serial.println("\nIP: " + WiFi.localIP().toString());

  server.on("/", []() { server.send(200, "text/html", gerarHTML()); });
  server.begin();
}

void loop() {
  server.handleClient();
  temperatura = 24.0 + random(-20, 40) / 10.0; // simula leitura
  umidade     = 60.0 + random(-10, 20) / 10.0;
  delay(3000);
}`
    },
    {
      id: "p3-02", title: "Publicador MQTT IoT", difficulty: "Intermediário", time: "45 min",
      description: "Publica dados de temperatura/umidade em broker MQTT a cada 10 segundos via WiFi.",
      connections: "DHT22: DATA→pino 4, VCC→3.3V, GND→GND (+ resistor 4.7kΩ VCC→DATA).",
      code: `// Projeto 2 — MQTT IoT Publisher
// ESP32 DevKit V1 | DEVGENIUS V12

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* SSID         = "SUA_REDE";
const char* PASS         = "SUA_SENHA";
const char* MQTT_SERVER  = "broker.hivemq.com";
const int   MQTT_PORT    = 1883;
const char* TOPICO_TEMP  = "devgenius/temperatura";
const char* TOPICO_UMID  = "devgenius/umidade";

WiFiClient  wifi;
PubSubClient mqtt(wifi);
DHT dht(4, DHT22);

void conectarMQTT() {
  while (!mqtt.connected()) {
    Serial.print("MQTT...");
    if (mqtt.connect("ESP32-DEVGENIUS")) {
      Serial.println("conectado!");
    } else {
      Serial.print("falha rc="); Serial.println(mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi OK: " + WiFi.localIP().toString());
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!mqtt.connected()) conectarMQTT();
  mqtt.loop();

  static unsigned long ultimo = 0;
  if (millis() - ultimo > 10000) {
    ultimo = millis();
    float t = dht.readTemperature();
    float u = dht.readHumidity();
    if (!isnan(t)) {
      mqtt.publish(TOPICO_TEMP, String(t, 2).c_str());
      mqtt.publish(TOPICO_UMID, String(u, 2).c_str());
      Serial.printf("Publicado T=%.1f U=%.1f\n", t, u);
    }
  }
}`
    },
    {
      id: "p3-03", title: "OTA Update Remoto", difficulty: "Avançado", time: "1h",
      description: "Atualização de firmware Over-the-Air via IDE Arduino sem cabo USB.",
      connections: "Apenas conexão WiFi. LED de status no pino 2.",
      code: `// Projeto 3 — OTA Over-The-Air Update
// ESP32 DevKit V1 | DEVGENIUS V12
// Após gravar via USB, futuras atualizações são via WiFi

#include <WiFi.h>
#include <ArduinoOTA.h>

const char* SSID = "SUA_REDE";
const char* PASS = "SUA_SENHA";

const int LED = 2;
int versao = 1; // incrementar a cada update

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);

  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi OK: " + WiFi.localIP().toString());

  ArduinoOTA.setHostname("esp32-devgenius");
  ArduinoOTA.setPassword("devgenius2024");

  ArduinoOTA.onStart([]()   { Serial.println("OTA Iniciando..."); });
  ArduinoOTA.onEnd([]()     { Serial.println("OTA Concluido!"); });
  ArduinoOTA.onProgress([](unsigned int prog, unsigned int total) {
    Serial.printf("Progresso: %u%%\n", prog * 100 / total);
    digitalWrite(LED, !digitalRead(LED));
  });
  ArduinoOTA.onError([](ota_error_t err) {
    Serial.printf("Erro OTA [%u]\n", err);
  });

  ArduinoOTA.begin();
  Serial.printf("OTA pronto! Versao: %d\n", versao);
  digitalWrite(LED, HIGH);
}

void loop() {
  ArduinoOTA.handle();
  // Seu código da aplicação aqui
  static unsigned long t = 0;
  if (millis() - t > 5000) {
    t = millis();
    Serial.printf("[v%d] Em execucao. IP: %s\n", versao, WiFi.localIP().toString().c_str());
  }
}`
    },
    {
      id: "p3-04", title: "Deep Sleep Sensor IoT", difficulty: "Intermediário", time: "45 min",
      description: "Lê DHT22, envia via WiFi+MQTT e dorme por 30s para economizar bateria (~80% de economia).",
      connections: "DHT22→pino 4. Alimentação: bateria LiPo 3.7V + módulo TP4056.",
      code: `// Projeto 4 — Deep Sleep IoT Sensor
// ESP32 DevKit V1 | DEVGENIUS V12

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <esp_sleep.h>

const char* SSID        = "SUA_REDE";
const char* PASS        = "SUA_SENHA";
const char* MQTT_SERVER = "broker.hivemq.com";
const uint64_t SLEEP_US = 30 * 1000000ULL; // 30 segundos

DHT dht(4, DHT22);
WiFiClient wifi;
PubSubClient mqtt(wifi);

RTC_DATA_ATTR int contadorBoot = 0; // persiste em sleep

void setup() {
  Serial.begin(115200);
  contadorBoot++;
  Serial.printf("\nBoot #%d\n", contadorBoot);

  dht.begin();
  float t = dht.readTemperature();
  float u = dht.readHumidity();

  if (!isnan(t)) {
    // Conecta WiFi
    WiFi.begin(SSID, PASS);
    int tentativas = 0;
    while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
      delay(500); tentativas++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      mqtt.setServer(MQTT_SERVER, 1883);
      if (mqtt.connect("ESP32-Sleep")) {
        char payload[64];
        snprintf(payload, sizeof(payload), "{\"t\":%.1f,\"u\":%.1f,\"boot\":%d}", t, u, contadorBoot);
        mqtt.publish("devgenius/sensor", payload);
        mqtt.loop(); delay(100);
        Serial.printf("Enviado: %s\n", payload);
      }
    }
    WiFi.disconnect(true);
  }

  Serial.println("Dormindo 30s...");
  Serial.flush();
  esp_sleep_enable_timer_wakeup(SLEEP_US);
  esp_deep_sleep_start();
}

void loop() {} // nunca executa`
    },
    {
      id: "p3-05", title: "Câmera ESP32-CAM Timelapse", difficulty: "Avançado", time: "2h",
      description: "Captura fotos a cada intervalo e serve via servidor web (requer módulo ESP32-CAM com OV2640).",
      connections: "Módulo ESP32-CAM: câmera OV2640 conectada nos pinos dedicados. LED flash no GPIO 4.",
      code: `// Projeto 5 — ESP32-CAM Web Server Timelapse
// ESP32-CAM | DEVGENIUS V12
// Use a placa "AI Thinker ESP32-CAM" na IDE

#include <Arduino.h>
#include <WiFi.h>
#include <esp_camera.h>
#include <WebServer.h>

const char* SSID = "SUA_REDE";
const char* PASS = "SUA_SENHA";

// Pinout AI Thinker ESP32-CAM
#define PWDN_GPIO  32  #define RESET_GPIO -1
#define XCLK_GPIO   0  #define SIOD_GPIO  26
#define SIOC_GPIO  27  #define Y9_GPIO    35
#define Y8_GPIO    34  #define Y7_GPIO    39
#define Y6_GPIO    36  #define Y5_GPIO    21
#define Y4_GPIO    19  #define Y3_GPIO    18
#define Y2_GPIO     5  #define VSYNC_GPIO 25
#define HREF_GPIO  23  #define PCLK_GPIO  22
#define FLASH_GPIO  4

WebServer server(80);

void capturarFoto(WiFiClient& client) {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { client.println("Erro na câmera"); return; }
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: image/jpeg");
  client.print("Content-Length: "); client.println(fb->len);
  client.println();
  client.write(fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO, OUTPUT);

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO; config.pin_d1 = Y3_GPIO;
  config.pin_d2 = Y4_GPIO; config.pin_d3 = Y5_GPIO;
  config.pin_d4 = Y6_GPIO; config.pin_d5 = Y7_GPIO;
  config.pin_d6 = Y8_GPIO; config.pin_d7 = Y9_GPIO;
  config.pin_xclk  = XCLK_GPIO; config.pin_pclk  = PCLK_GPIO;
  config.pin_vsync = VSYNC_GPIO; config.pin_href  = HREF_GPIO;
  config.pin_sscb_sda = SIOD_GPIO; config.pin_sscb_scl = SIOC_GPIO;
  config.pin_pwdn  = PWDN_GPIO; config.pin_reset = RESET_GPIO;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_VGA;
  config.jpeg_quality = 10;
  config.fb_count     = 1;
  esp_camera_init(&config);

  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("Camera em: http://" + WiFi.localIP().toString() + "/foto");

  server.on("/foto", HTTP_GET, []() {
    WiFiClient client = server.client();
    capturarFoto(client);
  });
  server.on("/flash", HTTP_GET, []() {
    digitalWrite(FLASH_GPIO, !digitalRead(FLASH_GPIO));
    server.send(200, "text/plain", "Flash toggled");
  });
  server.begin();
}

void loop() { server.handleClient(); }`
    },
    {
      id: "p3-06", title: "Controle BLE Smartphone", difficulty: "Intermediário", time: "1h",
      description: "Controla pinos do ESP32 via Bluetooth Low Energy com app BLE Serial genérico.",
      connections: "LED no pino 2, buzzer no pino 4, relay no pino 5. Nenhuma ligação de RF necessária.",
      code: `// Projeto 6 — Controle via BLE
// ESP32 DevKit V1 | DEVGENIUS V12
// Use app "BLE Serial" ou "nRF Connect"

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID "12345678-1234-1234-1234-123456789012"
#define CHAR_UUID    "87654321-4321-4321-4321-210987654321"

const int LED   = 2;
const int BUZZ  = 4;
const int RELAY = 5;

BLEServer*         pServer = nullptr;
BLECharacteristic* pChar   = nullptr;
bool bleConectado = false;

class CallbacksServidor : public BLEServerCallbacks {
  void onConnect(BLEServer*) override    { bleConectado = true;  Serial.println("BLE conectado!"); }
  void onDisconnect(BLEServer*) override { bleConectado = false; Serial.println("BLE desconectado"); BLEDevice::startAdvertising(); }
};

class CallbacksChar : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    std::string val = c->getValue();
    if (val.length() == 0) return;
    Serial.print("BLE recebeu: "); Serial.println(val.c_str());
    if (val == "LED_ON")    digitalWrite(LED,   HIGH);
    if (val == "LED_OFF")   digitalWrite(LED,   LOW);
    if (val == "BUZZ")      { tone(BUZZ, 1000, 500); }
    if (val == "RELAY_ON")  digitalWrite(RELAY, HIGH);
    if (val == "RELAY_OFF") digitalWrite(RELAY, LOW);
    String resp = "CMD_OK: " + String(val.c_str());
    c->setValue(resp.c_str()); c->notify();
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(LED,   OUTPUT);
  pinMode(RELAY, OUTPUT);
  BLEDevice::init("ESP32-DEVGENIUS");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new CallbacksServidor());
  BLEService* svc = pServer->createService(SERVICE_UUID);
  pChar = svc->createCharacteristic(CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  pChar->setCallbacks(new CallbacksChar());
  pChar->addDescriptor(new BLE2902());
  svc->start();
  BLEDevice::startAdvertising();
  Serial.println("BLE pronto — conecte via app BLE Serial");
}

void loop() {
  if (bleConectado) {
    static unsigned long t = 0;
    if (millis() - t > 5000) {
      t = millis();
      String status = "UP:" + String(millis()/1000) + "s";
      pChar->setValue(status.c_str()); pChar->notify();
    }
  }
}`
    },
    {
      id: "p3-07", title: "Relógio NTP com Display", difficulty: "Intermediário", time: "1h",
      description: "Sincroniza hora pela internet (NTP) e exibe em display OLED 128x64.",
      connections: "OLED SSD1306 I2C: SDA→pino 21, SCL→pino 22, VCC→3.3V, GND→GND.",
      code: `// Projeto 7 — Relógio NTP + OLED
// ESP32 DevKit V1 | DEVGENIUS V12

#include <WiFi.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>

const char* SSID = "SUA_REDE";
const char* PASS = "SUA_SENHA";

Adafruit_SSD1306 disp(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  disp.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  WiFi.begin(SSID, PASS);
  disp.clearDisplay(); disp.setTextColor(WHITE); disp.setTextSize(1);
  disp.setCursor(0, 0); disp.println("Conectando WiFi...");
  disp.display();

  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi OK");

  // UTC-3 = Brasília
  configTime(-3 * 3600, 0, "pool.ntp.org", "time.google.com");
  while (!time(nullptr)) delay(100);
  Serial.println("NTP sincronizado!");
}

void loop() {
  time_t agora = time(nullptr);
  struct tm* info = localtime(&agora);

  char hora[16], data[16];
  strftime(hora, sizeof(hora), "%H:%M:%S", info);
  strftime(data, sizeof(data), "%d/%m/%Y", info);

  disp.clearDisplay();
  disp.setTextSize(3);
  disp.setCursor(5, 15);
  disp.println(hora);
  disp.setTextSize(1);
  disp.setCursor(30, 50);
  disp.println(data);
  disp.display();
  delay(1000);
}`
    },
    {
      id: "p3-08", title: "Notificações Telegram", difficulty: "Avançado", time: "1h 30min",
      description: "Envia alertas e recebe comandos via bot do Telegram quando sensor PIR detecta movimento.",
      connections: "Sensor PIR: OUT→pino 14, VCC→3.3V, GND→GND. LED de status→pino 2.",
      code: `// Projeto 8 — Bot Telegram com PIR
// ESP32 DevKit V1 | DEVGENIUS V12
// Instale: UniversalTelegramBot, ArduinoJson

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>

const char* SSID     = "SUA_REDE";
const char* PASS     = "SUA_SENHA";
const char* BOT_TOKEN = "SEU_BOT_TOKEN"; // crie em @BotFather
const char* CHAT_ID   = "SEU_CHAT_ID";  // obtenha em @userinfobot

const int PIR = 14;
const int LED = 2;

WiFiClientSecure client;
UniversalTelegramBot bot(BOT_TOKEN, client);

bool alertaAtivo = true;
unsigned long ultimoMovimento = 0;
const long COOLDOWN = 10000; // 10s entre alertas

void verificarMensagens() {
  int n = bot.getUpdates(bot.last_message_received + 1);
  while (n) {
    String txt = bot.messages[0].text;
    String id  = bot.messages[0].chat_id;
    Serial.println("Telegram: " + txt);

    if (txt == "/status") {
      bot.sendMessage(id, alertaAtivo ? "Alarme: ATIVO" : "Alarme: INATIVO");
    } else if (txt == "/ligar") {
      alertaAtivo = true; bot.sendMessage(id, "Alarme ATIVADO");
    } else if (txt == "/desligar") {
      alertaAtivo = false; bot.sendMessage(id, "Alarme DESATIVADO");
    }
    n = bot.getUpdates(bot.last_message_received + 1);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR, INPUT); pinMode(LED, OUTPUT);
  client.setInsecure();
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("Telegram Bot pronto!");
  bot.sendMessage(CHAT_ID, "ESP32 Online! Comandos: /status /ligar /desligar");
}

void loop() {
  static unsigned long t = 0;
  if (millis() - t > 3000) { verificarMensagens(); t = millis(); }

  if (digitalRead(PIR) && alertaAtivo && millis() - ultimoMovimento > COOLDOWN) {
    ultimoMovimento = millis();
    bot.sendMessage(CHAT_ID, "ALERTA: Movimento detectado!");
    digitalWrite(LED, HIGH); delay(500); digitalWrite(LED, LOW);
    Serial.println("Alerta enviado!");
  }
}`
    },
    {
      id: "p3-09", title: "Monitor de Energia Elétrica", difficulty: "Avançado", time: "2h",
      description: "Mede corrente AC com ACS712, calcula potência e envia dados via MQTT para dashboard.",
      connections: "ACS712 (5A ou 20A): VCC→5V, GND→GND, OUT→pino 34 (ADC1). Tensão da rede: 110V ou 220V (configurar constante).",
      code: `// Projeto 9 — Monitor de Energia com ACS712
// ESP32 DevKit V1 | DEVGENIUS V12
// ATENÇÃO: trabalhar com 110/220V exige conhecimento de segurança!

#include <WiFi.h>
#include <PubSubClient.h>

const char* SSID       = "SUA_REDE";
const char* PASS       = "SUA_SENHA";
const char* MQTT_HOST  = "broker.hivemq.com";

const int   ACS_PIN    = 34;
const float TENSAO_REDE = 127.0; // V (110 ou 220)
const float SENS_ACS   = 185.0;  // mV/A (185=5A, 100=20A, 66=30A)
const float VCC        = 3300.0; // mV (ESP32 ADC = 3.3V)
const int   AMOSTRAS   = 500;

WiFiClient   wifi;
PubSubClient mqtt(wifi);

float medirCorrenteRMS() {
  long soma = 0;
  int  min_v = 4095, max_v = 0;
  for (int i = 0; i < AMOSTRAS; i++) {
    int v = analogRead(ACS_PIN);
    soma += v;
    if (v < min_v) min_v = v;
    if (v > max_v) max_v = v;
    delayMicroseconds(200);
  }
  int offset = soma / AMOSTRAS;
  float amplitude = (max_v - min_v) / 2.0;
  float mV_pico   = amplitude * VCC / 4095.0;
  float I_pico    = mV_pico / SENS_ACS;
  return I_pico / sqrt(2.0); // RMS
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  mqtt.setServer(MQTT_HOST, 1883);
  Serial.println("Monitor de Energia pronto");
}

void loop() {
  if (!mqtt.connected()) { mqtt.connect("ESP32-Energia"); }
  mqtt.loop();

  float corrente = medirCorrenteRMS();
  float potencia = TENSAO_REDE * corrente;
  float kwh_hora = potencia / 1000.0;

  char buf[128];
  snprintf(buf, sizeof(buf), "{\"corrente\":%.3f,\"potencia\":%.1f,\"kwh_h\":%.4f}",
    corrente, potencia, kwh_hora);
  mqtt.publish("devgenius/energia", buf);

  Serial.printf("I=%.3f A | P=%.1f W | %.4f kWh/h\n", corrente, potencia, kwh_hora);
  delay(5000);
}`
    },
    {
      id: "p3-10", title: "Sistema Home Automation Completo", difficulty: "Avançado", time: "4h",
      description: "Controla 4 relés, lê 3 sensores, envia para MQTT e serve dashboard web com auto-atualização.",
      connections: "4 módulos relé→pinos 16,17,18,19. DHT22→pino 4. LDR→pino 34. PIR→pino 14.",
      code: `// Projeto 10 — Home Automation Completo
// ESP32 DevKit V1 | DEVGENIUS V12

#include <WiFi.h>
#include <WebServer.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* SSID      = "SUA_REDE";
const char* PASS      = "SUA_SENHA";
const char* MQTT_HOST = "broker.hivemq.com";

const int RELES[] = {16, 17, 18, 19};
const int DHT_PIN = 4;
const int LDR_PIN = 34;
const int PIR_PIN = 14;

DHT dht(DHT_PIN, DHT22);
WebServer web(80);
WiFiClient   wifi;
PubSubClient mqtt(wifi);

float temp = 0, umid = 0;
int   luz  = 0;
bool  mov  = false;
bool  rele[4] = {false, false, false, false};

void mqttCallback(char* topic, byte* payload, unsigned int len) {
  String t = topic, v = "";
  for (unsigned int i = 0; i < len; i++) v += (char)payload[i];
  Serial.printf("MQTT [%s]: %s\n", t.c_str(), v.c_str());
  for (int i = 0; i < 4; i++) {
    if (t == "devgenius/rele/" + String(i)) {
      rele[i] = (v == "1");
      digitalWrite(RELES[i], rele[i] ? HIGH : LOW);
    }
  }
}

String dashboard() {
  String h = "<!DOCTYPE html><html><head><meta charset='utf-8'>";
  h += "<meta http-equiv='refresh' content='5'>";
  h += "<style>body{background:#000;color:#0ff;font-family:mono;margin:20px}";
  h += ".grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}";
  h += ".card{border:1px solid #0ff;padding:15px;border-radius:10px;text-align:center}";
  h += "button{background:#0ff;color:#000;border:none;padding:10px 20px;border-radius:5px;cursor:pointer}</style></head>";
  h += "<body><h1>HOME AUTOMATION DEVGENIUS</h1><div class='grid'>";
  h += "<div class='card'><h3>Temperatura</h3><h2>" + String(temp,1) + " °C</h2></div>";
  h += "<div class='card'><h3>Umidade</h3><h2>"    + String(umid,1) + " %</h2></div>";
  h += "<div class='card'><h3>Luminosidade</h3><h2>" + String(luz) + "</h2></div>";
  h += "<div class='card'><h3>Movimento</h3><h2>" + String(mov?"SIM":"NÃO") + "</h2></div>";
  for (int i = 0; i < 4; i++) {
    h += "<div class='card'><h3>Relé " + String(i+1) + "</h3>";
    h += "<h2>" + String(rele[i]?"LIGADO":"DESLIGADO") + "</h2>";
    h += "<a href='/toggle?r=" + String(i) + "'><button>" + String(rele[i]?"Desligar":"Ligar") + "</button></a></div>";
  }
  h += "</div></body></html>";
  return h;
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 4; i++) { pinMode(RELES[i], OUTPUT); digitalWrite(RELES[i], LOW); }
  pinMode(PIR_PIN, INPUT);
  dht.begin();
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("IP: " + WiFi.localIP().toString());

  mqtt.setServer(MQTT_HOST, 1883);
  mqtt.setCallback(mqttCallback);

  web.on("/", []() { web.send(200, "text/html", dashboard()); });
  web.on("/toggle", []() {
    if (web.hasArg("r")) {
      int r = web.arg("r").toInt();
      if (r >= 0 && r < 4) { rele[r] = !rele[r]; digitalWrite(RELES[r], rele[r]); }
    }
    web.sendHeader("Location", "/"); web.send(302);
  });
  web.begin();
  Serial.println("Dashboard: http://" + WiFi.localIP().toString());
}

void loop() {
  web.handleClient();
  if (!mqtt.connected()) {
    if (mqtt.connect("ESP32-Home")) {
      mqtt.subscribe("devgenius/rele/#");
    }
  }
  mqtt.loop();

  static unsigned long t = 0;
  if (millis() - t > 5000) {
    t = millis();
    temp = dht.readTemperature();
    umid = dht.readHumidity();
    luz  = analogRead(LDR_PIN);
    mov  = digitalRead(PIR_PIN);

    char buf[128];
    snprintf(buf, sizeof(buf), "{\"t\":%.1f,\"u\":%.1f,\"lux\":%d,\"mov\":%d}",
      temp, umid, luz, (int)mov);
    mqtt.publish("devgenius/status", buf);
  }
}`
    },
  ],

  // ── DHT22 ─────────────────────────────────────────────────────────────────
  c4: [
    {
      id:"c4-01", title:"Monitor Básico Serial", difficulty:"Iniciante", time:"15 min",
      description:"Lê temperatura e umidade a cada 2 segundos e exibe no Monitor Serial.",
      connections:"VCC→5V, GND→GND, DATA→pino 4, resistor 4.7kΩ entre VCC e DATA.",
      code:`// Projeto 1 — Monitor Básico de Temperatura e Umidade
// Sensor DHT22 | DEVGENIUS V12
// Lê e exibe temperatura (°C) e umidade (%) via porta Serial

#include <DHT.h>  // Biblioteca para o sensor DHT

// Configuração do sensor DHT22 no pino 4
#define DHT_PIN  4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);  // Cria objeto do sensor

void setup() {
  Serial.begin(9600);     // Inicia comunicação Serial a 9600 baud
  dht.begin();            // Inicializa o sensor DHT22
  Serial.println("=== Monitor DHT22 Iniciado ===");
  Serial.println("Temperatura | Umidade");
}

void loop() {
  // Lê temperatura em graus Celsius
  float temperatura = dht.readTemperature();

  // Lê umidade relativa em percentual
  float umidade = dht.readHumidity();

  // Verifica se as leituras são válidas (isnan = "is not a number")
  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("ERRO: Falha na leitura do sensor DHT22!");
    delay(2000);
    return;  // Sai do loop e tenta novamente
  }

  // Exibe os valores formatados no Monitor Serial
  Serial.print("Temperatura: ");
  Serial.print(temperatura, 1);  // 1 casa decimal
  Serial.print(" °C  |  Umidade: ");
  Serial.print(umidade, 1);
  Serial.println(" %");

  delay(2000);  // DHT22 precisa de 2 segundos entre leituras
}`
    },
    {
      id:"c4-02", title:"Alerta LED por Temperatura", difficulty:"Iniciante", time:"20 min",
      description:"LED verde abaixo de 25°C, amarelo entre 25-35°C, vermelho acima de 35°C.",
      connections:"DHT22→pino 4. LED verde→pino 10, amarelo→pino 9, vermelho→pino 8 (resistor 220Ω em série com cada LED).",
      code:`// Projeto 2 — Alerta Visual de Temperatura com LEDs RGB
// Sensor DHT22 + 3 LEDs | DEVGENIUS V12
// Verde = confortável, Amarelo = atenção, Vermelho = calor

#include <DHT.h>  // Biblioteca para o sensor DHT

// Pinos dos LEDs indicadores
const int LED_VERDE    = 10;  // Temperatura confortável (< 25°C)
const int LED_AMARELO  =  9;  // Temperatura de atenção (25-35°C)
const int LED_VERMELHO =  8;  // Temperatura alta (> 35°C)

// Configuração do sensor DHT22
#define DHT_PIN  4
DHT dht(DHT_PIN, DHT22);

void setup() {
  // Configura todos os pinos dos LEDs como saída
  pinMode(LED_VERDE,    OUTPUT);
  pinMode(LED_AMARELO,  OUTPUT);
  pinMode(LED_VERMELHO, OUTPUT);

  dht.begin();         // Inicializa o sensor
  Serial.begin(9600);  // Inicia comunicação Serial
  Serial.println("Monitor de Temperatura com LEDs iniciado!");
}

void loop() {
  float temperatura = dht.readTemperature();  // Lê temperatura

  // Verifica se a leitura é válida
  if (isnan(temperatura)) {
    Serial.println("Erro na leitura!");
    delay(2000);
    return;
  }

  // Exibe temperatura no Serial
  Serial.print("Temperatura: ");
  Serial.print(temperatura, 1);
  Serial.print(" °C — Status: ");

  // Liga o LED correspondente à faixa de temperatura
  if (temperatura < 25.0) {
    // Zona de conforto: liga LED verde, apaga os outros
    digitalWrite(LED_VERDE,    HIGH);
    digitalWrite(LED_AMARELO,  LOW);
    digitalWrite(LED_VERMELHO, LOW);
    Serial.println("CONFORTÁVEL");
  } else if (temperatura < 35.0) {
    // Zona de atenção: liga LED amarelo
    digitalWrite(LED_VERDE,    LOW);
    digitalWrite(LED_AMARELO,  HIGH);
    digitalWrite(LED_VERMELHO, LOW);
    Serial.println("ATENÇÃO");
  } else {
    // Zona de calor: liga LED vermelho
    digitalWrite(LED_VERDE,    LOW);
    digitalWrite(LED_AMARELO,  LOW);
    digitalWrite(LED_VERMELHO, HIGH);
    Serial.println("CALOR ELEVADO!");
  }

  delay(2000);  // Aguarda 2 segundos antes da próxima leitura
}`
    },
    {
      id:"c4-03", title:"Display OLED Clima", difficulty:"Intermediário", time:"30 min",
      description:"Exibe temperatura e umidade em OLED 128x64 com barra de progresso de umidade.",
      connections:"DHT22→pino 4 (+ resistor 4.7kΩ). OLED SSD1306 I2C: SDA→A4, SCL→A5, VCC→3.3V, GND→GND.",
      code:`// Projeto 3 — Display OLED com Dados Climáticos
// DHT22 + Display OLED SSD1306 128x64 | DEVGENIUS V12
// Exibe temperatura, umidade e barra visual de progresso

#include <DHT.h>              // Biblioteca do sensor DHT
#include <Wire.h>             // Biblioteca I2C para o OLED
#include <Adafruit_GFX.h>     // Biblioteca gráfica base
#include <Adafruit_SSD1306.h> // Biblioteca do display OLED

// Dimensões do display OLED
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64

// Sensor DHT22 conectado ao pino 4
#define DHT_PIN 4
DHT dht(DHT_PIN, DHT22);

// Cria objeto do display (sem pino de reset: -1)
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

void setup() {
  Serial.begin(9600);
  dht.begin();  // Inicializa sensor

  // Inicializa o display OLED no endereço I2C 0x3C
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("Display OLED não encontrado!");
    while (true);  // Para o programa se o display não inicializar
  }

  // Mensagem de boas-vindas
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(20, 28);
  display.println("DevGenius V12");
  display.display();
  delay(2000);
}

void loop() {
  float temperatura = dht.readTemperature();  // Temperatura em °C
  float umidade     = dht.readHumidity();     // Umidade em %

  // Verifica validade das leituras
  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Erro na leitura do DHT22!");
    delay(2000);
    return;
  }

  // Limpa o display para a nova escrita
  display.clearDisplay();
  display.setTextColor(WHITE);

  // Exibe temperatura com fonte grande (tamanho 2)
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.print("T:");
  display.print(temperatura, 1);  // 1 casa decimal
  display.println("C");

  // Exibe umidade com fonte grande (tamanho 2)
  display.setCursor(0, 20);
  display.print("U:");
  display.print(umidade, 1);
  display.println("%");

  // Barra de progresso da umidade (largura proporcional a 0-100%)
  int largura_barra = map((int)umidade, 0, 100, 0, 127);
  display.fillRect(0, 50, largura_barra, 10, WHITE);  // Barra preenchida
  display.drawRect(0, 50, 127, 10, WHITE);            // Borda da barra

  display.display();  // Envia buffer para o display

  // Exibe também no Serial para debug
  Serial.print("T="); Serial.print(temperatura, 1);
  Serial.print(" U="); Serial.println(umidade, 1);

  delay(2000);  // Atualiza a cada 2 segundos
}`
    },
    {
      id:"c4-04", title:"Logger com Marca de Tempo", difficulty:"Intermediário", time:"45 min",
      description:"Registra leituras com timestamp em millis() em formato CSV e conta alertas de temperatura alta.",
      connections:"DHT22→pino 4 (+ resistor 4.7kΩ entre VCC e DATA).",
      code:`// Projeto 4 — Logger de Dados com Timestamp
// DHT22 | DEVGENIUS V12
// Grava leituras em formato CSV com marca de tempo (millis)
// Abra o Serial Monitor (9600 baud) e copie os dados para Excel

#include <DHT.h>  // Biblioteca do sensor DHT

// Configurações do sensor
#define DHT_PIN  4
DHT dht(DHT_PIN, DHT22);

// Contador de eventos de alerta
int contadorAlertas = 0;

// Limite de temperatura para considerar alerta
const float TEMP_ALERTA = 30.0;

void setup() {
  Serial.begin(9600);  // Inicia comunicação Serial
  dht.begin();         // Inicializa sensor DHT22

  // Imprime cabeçalho CSV (primeira linha)
  Serial.println("timestamp_ms,temperatura_C,umidade_pct,alerta");
}

void loop() {
  // Lê os valores do sensor
  float temperatura = dht.readTemperature();  // Graus Celsius
  float umidade     = dht.readHumidity();     // Percentual

  // Só registra se a leitura for válida
  if (!isnan(temperatura) && !isnan(umidade)) {

    // Verifica se é um evento de alerta (temperatura alta)
    bool alerta = (temperatura > TEMP_ALERTA);
    if (alerta) {
      contadorAlertas++;  // Incrementa o contador de alertas
    }

    // Imprime linha CSV: timestamp,temp,umidade,alerta(0 ou 1)
    Serial.print(millis());        // Tempo em milissegundos desde o boot
    Serial.print(",");
    Serial.print(temperatura, 1);  // Temperatura com 1 decimal
    Serial.print(",");
    Serial.print(umidade, 1);      // Umidade com 1 decimal
    Serial.print(",");
    Serial.println(alerta ? 1 : 0); // 1 = alerta ativo, 0 = normal

  } else {
    Serial.println("ERRO,,,");  // Linha de erro no CSV
  }

  delay(5000);  // Registra a cada 5 segundos
}`
    },
    {
      id:"c4-05", title:"Controle Climatizador", difficulty:"Intermediário", time:"1h",
      description:"Liga ventilador via relé quando temp > 28°C e umidificador quando umid < 40%.",
      connections:"DHT22→pino 4. Módulo relé do ventilador→pino 12. Módulo relé do umidificador→pino 11. Relés ativados em LOW (módulos com optoacoplador).",
      code:`// Projeto 5 — Controle Automático de Climatizador
// DHT22 + 2 Módulos Relé | DEVGENIUS V12
// Liga ventilador quando quente e umidificador quando seco

#include <DHT.h>  // Biblioteca do sensor DHT

// Pinos dos módulos relé (ativo em LOW = relé fecha)
const int PINO_RELE_VENTILADOR  = 12;
const int PINO_RELE_UMIDIFICADOR = 11;

// Limiares de acionamento
const float TEMP_MAXIMA  = 28.0;  // Ventilador liga acima disso
const float UMID_MINIMA  = 40.0;  // Umidificador liga abaixo disso

// Sensor DHT22
#define DHT_PIN 4
DHT dht(DHT_PIN, DHT22);

void setup() {
  // Configura os pinos dos relés como saída
  pinMode(PINO_RELE_VENTILADOR,   OUTPUT);
  pinMode(PINO_RELE_UMIDIFICADOR, OUTPUT);

  // Inicia com os relés desligados (HIGH = relé aberto)
  digitalWrite(PINO_RELE_VENTILADOR,   HIGH);
  digitalWrite(PINO_RELE_UMIDIFICADOR, HIGH);

  dht.begin();         // Inicializa sensor
  Serial.begin(9600);  // Inicia Serial para monitoramento
  Serial.println("Controle de Climatizador ativo!");
}

void loop() {
  float temperatura = dht.readTemperature();  // Lê temperatura
  float umidade     = dht.readHumidity();     // Lê umidade

  // Verifica validade das leituras
  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Erro na leitura do sensor!");
    delay(2000);
    return;
  }

  // Controle do VENTILADOR: liga se temperatura muito alta
  if (temperatura > TEMP_MAXIMA) {
    digitalWrite(PINO_RELE_VENTILADOR, LOW);   // LOW = relé FECHA = ventilador LIGA
    Serial.print("VENTILADOR: LIGADO  ");
  } else {
    digitalWrite(PINO_RELE_VENTILADOR, HIGH);  // HIGH = relé ABRE = ventilador DESLIGA
    Serial.print("VENTILADOR: desligado  ");
  }

  // Controle do UMIDIFICADOR: liga se umidade muito baixa
  if (umidade < UMID_MINIMA) {
    digitalWrite(PINO_RELE_UMIDIFICADOR, LOW);   // Umidificador LIGA
    Serial.println("UMIDIFICADOR: LIGADO");
  } else {
    digitalWrite(PINO_RELE_UMIDIFICADOR, HIGH);  // Umidificador DESLIGA
    Serial.println("UMIDIFICADOR: desligado");
  }

  // Exibe leituras atuais
  Serial.print("T="); Serial.print(temperatura, 1);
  Serial.print("°C | U="); Serial.print(umidade, 1); Serial.println("%");

  delay(2000);  // Verifica a cada 2 segundos
}`
    },
    {
      id:"c4-06", title:"Índice de Conforto Térmico", difficulty:"Intermediário", time:"40 min",
      description:"Calcula o Heat Index (sensação térmica real combinando calor e umidade) e classifica em 5 níveis de conforto.",
      connections:"DHT22→pino 4 (+ resistor 4.7kΩ entre VCC e DATA).",
      code:`// Projeto 6 — Calculadora de Índice de Conforto Térmico
// DHT22 | DEVGENIUS V12
// O Heat Index combina temperatura e umidade para mostrar
// a sensação térmica real que o corpo humano percebe

#include <DHT.h>  // Biblioteca do sensor DHT

// Sensor DHT22 no pino 4
#define DHT_PIN 4
DHT dht(DHT_PIN, DHT22);

// Função que retorna o nível de conforto baseado no Heat Index
String classificarConforto(float heatIndex) {
  if (heatIndex < 27.0) return "CONFORTAVEL";
  if (heatIndex < 32.0) return "CAUTELA — use protetor solar";
  if (heatIndex < 40.0) return "CAUTELA EXTREMA — evite esforço";
  if (heatIndex < 54.0) return "PERIGO — risco de insolacao";
  return "PERIGO EXTREMO — risco de vida!";
}

void setup() {
  Serial.begin(9600);   // Inicia comunicação Serial
  dht.begin();          // Inicializa sensor DHT22
  Serial.println("=== Calculadora de Conforto Termico ===");
  Serial.println("Temperatura | Umidade | Heat Index | Nivel");
}

void loop() {
  float temperatura = dht.readTemperature();  // Lê temperatura (°C)
  float umidade     = dht.readHumidity();     // Lê umidade (%)

  // Verifica validade
  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Erro na leitura!");
    delay(2000);
    return;
  }

  // Calcula o Heat Index (sensação térmica) usando a fórmula da biblioteca
  // false = resultado em Celsius (true seria Fahrenheit)
  float heatIndex = dht.computeHeatIndex(temperatura, umidade, false);

  // Classifica o nível de conforto
  String nivel = classificarConforto(heatIndex);

  // Exibe todos os dados formatados
  Serial.print("Temp: "); Serial.print(temperatura, 1); Serial.print("°C | ");
  Serial.print("Umid: "); Serial.print(umidade, 1);     Serial.print("% | ");
  Serial.print("HI: ");  Serial.print(heatIndex, 1);    Serial.print("°C | ");
  Serial.println(nivel);

  delay(3000);  // Atualiza a cada 3 segundos
}`
    },
    {
      id:"c4-07", title:"Envio WiFi ThingSpeak", difficulty:"Avançado", time:"1h",
      description:"Envia temperatura e umidade para a plataforma ThingSpeak na nuvem a cada 15 segundos via ESP32.",
      connections:"DHT22→pino 4 do ESP32 (+ resistor 4.7kΩ). Alimentação do ESP32 via USB ou 3.3V regulado.",
      code:`// Projeto 7 — Envio de Dados para ThingSpeak via WiFi
// ESP32 + DHT22 | DEVGENIUS V12
// Plataforma gratuita: https://thingspeak.com/
// Crie um canal e copie a Write API Key

#include <WiFi.h>      // Biblioteca WiFi do ESP32
#include <HTTPClient.h> // Biblioteca para requisições HTTP
#include <DHT.h>        // Biblioteca do sensor DHT

// ══ CONFIGURE AQUI ══════════════════════════════════════
const char* WIFI_SSID     = "NOME_DA_SUA_REDE";   // Nome da rede WiFi
const char* WIFI_PASSWORD = "SENHA_DA_REDE";        // Senha da rede WiFi
const char* API_KEY       = "SUA_WRITE_API_KEY";    // Chave do ThingSpeak
// ════════════════════════════════════════════════════════

// Sensor DHT22 no pino 4 do ESP32
#define DHT_PIN 4
DHT dht(DHT_PIN, DHT22);

// Intervalo entre envios (ThingSpeak aceita no mínimo 15 segundos)
const unsigned long INTERVALO_MS = 15000;
unsigned long ultimoEnvio = 0;

void setup() {
  Serial.begin(115200);  // ESP32 usa 115200 baud
  dht.begin();           // Inicializa sensor

  // Conecta ao WiFi
  Serial.print("Conectando ao WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Aguarda conexão (mostra pontos de progresso)
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi conectado!");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Verifica se já passou o intervalo mínimo
  if (millis() - ultimoEnvio < INTERVALO_MS) return;
  ultimoEnvio = millis();

  // Lê dados do sensor
  float temperatura = dht.readTemperature();
  float umidade     = dht.readHumidity();

  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Erro no sensor DHT22!");
    return;
  }

  // Verifica se ainda está conectado ao WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado! Reconectando...");
    WiFi.reconnect();
    return;
  }

  // Monta URL de envio para ThingSpeak
  // field1 = temperatura, field2 = umidade
  String url = "http://api.thingspeak.com/update?api_key=";
  url += API_KEY;
  url += "&field1=";
  url += String(temperatura, 2);  // 2 casas decimais
  url += "&field2=";
  url += String(umidade, 2);

  // Envia requisição HTTP GET
  HTTPClient http;
  http.begin(url);
  int codigoHTTP = http.GET();  // 200 = sucesso

  // Verifica resposta do servidor
  if (codigoHTTP > 0) {
    Serial.print("Enviado! T="); Serial.print(temperatura, 1);
    Serial.print(" U="); Serial.print(umidade, 1);
    Serial.print(" — HTTP: "); Serial.println(codigoHTTP);
  } else {
    Serial.print("Erro no envio: ");
    Serial.println(http.errorToString(codigoHTTP));
  }

  http.end();  // Libera recursos da conexão HTTP
}`
    },
    {
      id:"c4-08", title:"Gráfico Serial Plotter", difficulty:"Iniciante", time:"15 min",
      description:"Formata saída para o Serial Plotter da IDE Arduino exibir gráfico em tempo real de temperatura e umidade.",
      connections:"DHT22→pino 4 (+ resistor 4.7kΩ entre VCC e DATA).",
      code:`// Projeto 8 — Gráfico em Tempo Real com Serial Plotter
// DHT22 | DEVGENIUS V12
// Abra: Ferramentas > Serial Plotter (não Serial Monitor!)
// Use baud rate 9600. Dois valores separados por tab = duas linhas no gráfico

#include <DHT.h>  // Biblioteca do sensor DHT

// Sensor DHT22 no pino 4
#define DHT_PIN 4
DHT dht(DHT_PIN, DHT22);

void setup() {
  Serial.begin(9600);  // Baud rate para o Serial Plotter
  dht.begin();         // Inicializa o sensor DHT22

  // Cabeçalho com nomes das séries (aparece na legenda do gráfico)
  // Separados por TAB para o plotter identificar as séries
  Serial.println("Temperatura\tUmidade");
}

void loop() {
  float temperatura = dht.readTemperature();  // Lê temperatura (°C)
  float umidade     = dht.readHumidity();     // Lê umidade (%)

  // Só envia se as leituras forem válidas
  if (!isnan(temperatura) && !isnan(umidade)) {
    // Formato obrigatório para o Serial Plotter:
    // valor1 TAB valor2 NEWLINE
    Serial.print(temperatura);   // Série 1 (linha azul)
    Serial.print("\t");          // Separador TAB
    Serial.println(umidade);     // Série 2 (linha vermelha) + quebra de linha
  }

  delay(500);  // 2 amostras por segundo (500ms de intervalo)
}`
    },
    {
      id:"c4-09", title:"Alarme de Geada", difficulty:"Intermediário", time:"30 min",
      description:"Aciona buzzer e LED vermelho se temperatura cair abaixo de 5°C — ideal para proteção de plantas sensíveis.",
      connections:"DHT22→pino 4. Buzzer passivo→pino 11. LED vermelho→pino 8 (resistor 220Ω em série).",
      code:`// Projeto 9 — Sistema de Alarme de Geada
// DHT22 + Buzzer + LED | DEVGENIUS V12
// Proteja suas plantas! Alerta sonoro e visual quando a temperatura
// cai para zona de risco de geada (abaixo de 5°C)

#include <DHT.h>  // Biblioteca do sensor DHT

// Pinos dos periféricos de alerta
const int PINO_BUZZER = 11;  // Buzzer passivo para alarme sonoro
const int PINO_LED    =  8;  // LED vermelho de alerta visual

// Temperatura limite de alerta (risco de geada)
const float TEMP_GEADA = 5.0;

// Sensor DHT22 no pino 4
#define DHT_PIN 4
DHT dht(DHT_PIN, DHT22);

// Variável para controlar estado do alarme
bool alarmeAtivo = false;

void setup() {
  // Configura periféricos como saída
  pinMode(PINO_BUZZER, OUTPUT);
  pinMode(PINO_LED,    OUTPUT);

  dht.begin();         // Inicializa sensor DHT22
  Serial.begin(9600);  // Inicia comunicação Serial

  Serial.println("=== Alarme de Geada Ativo ===");
  Serial.print("Limite configurado: ");
  Serial.print(TEMP_GEADA);
  Serial.println(" °C");
}

void loop() {
  float temperatura = dht.readTemperature();  // Lê temperatura atual

  // Verifica validade da leitura
  if (isnan(temperatura)) {
    Serial.println("Erro no sensor!");
    delay(2000);
    return;
  }

  // Exibe temperatura atual
  Serial.print("Temperatura: ");
  Serial.print(temperatura, 1);
  Serial.print(" °C — ");

  // Verifica se está na zona de risco de geada
  if (temperatura < TEMP_GEADA) {
    // ZONA DE ALERTA: temperatura abaixo do limite
    alarmeAtivo = true;

    // Aciona buzzer com tom de 880Hz por 500ms (som de alarme)
    tone(PINO_BUZZER, 880, 500);

    // Liga o LED vermelho de alerta
    digitalWrite(PINO_LED, HIGH);

    Serial.println("⚠ ALERTA DE GEADA! Proteja as plantas!");
  } else {
    // ZONA SEGURA: temperatura normal
    alarmeAtivo = false;

    noTone(PINO_BUZZER);          // Para o buzzer
    digitalWrite(PINO_LED, LOW);  // Apaga o LED

    Serial.println("OK — temperatura segura");
  }

  delay(2000);  // Verifica a cada 2 segundos
}`
    },
    {
      id:"c4-10", title:"Estação Climática Completa", difficulty:"Avançado", time:"2h",
      description:"DHT22 + OLED com dois modos: exibição atual e histórico das últimas 5 leituras. Alterna com botão.",
      connections:"DHT22→pino 4. OLED SSD1306 I2C: SDA→A4, SCL→A5. Botão de modo→pino 2 (INPUT_PULLUP, outro terminal ao GND).",
      code:`// Projeto 10 — Estação Climática Completa com Histórico
// DHT22 + OLED SSD1306 + Botão | DEVGENIUS V12
// Modo 0: exibe leitura atual em tempo real
// Modo 1: exibe histórico das últimas 5 leituras
// Pressione o botão para alternar entre os modos

#include <DHT.h>              // Biblioteca do sensor DHT
#include <Wire.h>             // I2C para o display
#include <Adafruit_GFX.h>     // Gráficos base
#include <Adafruit_SSD1306.h> // Driver do display OLED

// Configuração do display OLED (128x64 pixels)
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Sensor DHT22 e botão de modo
#define DHT_PIN  4
#define BTN_PIN  2      // Botão conectado com INPUT_PULLUP
DHT dht(DHT_PIN, DHT22);

// Variáveis de controle do modo de exibição
int modoAtual = 0;  // 0 = atual, 1 = histórico

// Estrutura para armazenar cada leitura no histórico
struct Leitura {
  float temperatura;  // °C
  float umidade;      // %
};

// Buffer circular para as últimas 10 leituras
const int MAX_HISTORICO = 10;
Leitura historico[MAX_HISTORICO];
int indiceHistorico = 0;   // Posição de escrita no buffer
int totalLeituras   = 0;   // Quantas leituras foram feitas

// Salva uma nova leitura no buffer circular
void salvarLeitura(float t, float u) {
  historico[indiceHistorico] = {t, u};         // Salva no índice atual
  indiceHistorico = (indiceHistorico + 1) % MAX_HISTORICO; // Avança (volta ao 0 quando chega no máximo)
  if (totalLeituras < MAX_HISTORICO) totalLeituras++;       // Conta até o máximo
}

void setup() {
  // Configura botão com resistor pull-up interno
  pinMode(BTN_PIN, INPUT_PULLUP);

  dht.begin();         // Inicializa sensor DHT22
  Serial.begin(9600);  // Inicia Serial para debug

  // Inicializa display OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED nao encontrado!");
    while (true);  // Trava se o display não conectar
  }

  // Tela de boas-vindas
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0, 20);
  display.println("  Estacao Climatica");
  display.println("    DevGenius V12");
  display.display();
  delay(2000);
}

void loop() {
  // Detecta pressionamento do botão (LOW com INPUT_PULLUP = pressionado)
  if (digitalRead(BTN_PIN) == LOW) {
    modoAtual = (modoAtual + 1) % 2;  // Alterna entre modo 0 e 1
    delay(200);  // Debounce para evitar leituras duplas
  }

  // Lê dados do sensor DHT22
  float temperatura = dht.readTemperature();
  float umidade     = dht.readHumidity();

  // Salva leitura no histórico se for válida
  if (!isnan(temperatura) && !isnan(umidade)) {
    salvarLeitura(temperatura, umidade);
  }

  // Limpa display para nova escrita
  display.clearDisplay();
  display.setTextColor(WHITE);

  if (modoAtual == 0) {
    // ── MODO 0: Exibe leitura atual ──────────────────────────────────
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("=== AGORA ===");

    display.setTextSize(2);  // Fonte grande para os valores
    display.setCursor(0, 12);
    display.print("T:");
    display.print(temperatura, 1);  // Ex: "T:25.3"
    display.println("C");

    display.setCursor(0, 36);
    display.print("U:");
    display.print(umidade, 1);      // Ex: "U:65.0"
    display.println("%");

    display.setTextSize(1);
    display.setCursor(0, 57);
    display.println("[BTN] = historico");

  } else {
    // ── MODO 1: Exibe histórico das últimas leituras ─────────────────
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("=== HISTORICO ===");

    // Exibe até 5 leituras na tela (cada linha ~11px de altura)
    int linhasVisiveis = min(totalLeituras, 5);
    for (int i = 0; i < linhasVisiveis; i++) {
      // Calcula índice no buffer circular (do mais recente ao mais antigo)
      int idx = (indiceHistorico - 1 - i + MAX_HISTORICO) % MAX_HISTORICO;
      display.setCursor(0, 10 + i * 10);  // Posição vertical de cada linha
      display.print(i + 1);               // Número da leitura
      display.print(":");
      display.print(historico[idx].temperatura, 0);  // Temperatura sem decimal
      display.print("C ");
      display.print(historico[idx].umidade, 0);       // Umidade sem decimal
      display.println("%");
    }
  }

  display.display();  // Atualiza o display fisicamente

  // Debug no Serial Monitor
  Serial.print("T="); Serial.print(temperatura, 1);
  Serial.print(" U="); Serial.print(umidade, 1);
  Serial.print(" Modo="); Serial.println(modoAtual);

  delay(2000);  // Atualiza a cada 2 segundos
}`
    },
  ],

  // ── HC-SR04 Ultrassônico ─────────────────────────────────────────────────
  c2: [
    {
      id:"c2-01", title:"Medidor de Distância Serial", difficulty:"Iniciante", time:"15 min",
      description:"Mede distância e exibe em cm e polegadas via Serial a cada 300ms.",
      connections:"VCC→5V, GND→GND, Trig→pino 9, Echo→pino 10.",
      code:`// Projeto 1 — Medidor de Distância com HC-SR04
// Sensor Ultrassônico HC-SR04 | DEVGENIUS V12
// Mede a distância por eco de som ultrassônico (40kHz)
// e exibe o resultado em centímetros e polegadas

// Pinos do sensor HC-SR04
const int PINO_TRIG = 9;   // Trig: envia o pulso ultrassônico
const int PINO_ECHO = 10;  // Echo: recebe o eco do pulso

// Função que mede a distância em centímetros
float medirDistanciaCm() {
  // Garante que o Trig está em LOW antes de disparar
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);

  // Envia pulso de 10 microssegundos no Trig
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);   // Pulso de 10µs
  digitalWrite(PINO_TRIG, LOW);

  // Mede o tempo que o Echo fica em HIGH (tempo do eco)
  // Timeout de 30.000µs evita travar se não houver eco
  long duracao = pulseIn(PINO_ECHO, HIGH, 30000);

  // Converte duração para distância:
  // velocidade do som = 0,034 cm/µs
  // divide por 2 pois o som faz o percurso de ida E volta
  return duracao * 0.034 / 2.0;
}

void setup() {
  Serial.begin(9600);              // Inicia comunicação Serial
  pinMode(PINO_TRIG, OUTPUT);      // Trig é saída (dispara o pulso)
  pinMode(PINO_ECHO, INPUT);       // Echo é entrada (recebe o eco)
  Serial.println("=== Medidor HC-SR04 ===");
  Serial.println("Distancia (cm) | Distancia (pol)");
}

void loop() {
  float distanciaCm  = medirDistanciaCm();        // Mede em centímetros
  float distanciaPol = distanciaCm / 2.54;        // Converte para polegadas

  // Exibe os valores formatados
  Serial.print(distanciaCm, 1);    // 1 casa decimal
  Serial.print(" cm  |  ");
  Serial.print(distanciaPol, 1);
  Serial.println(" pol");

  delay(300);  // Aguarda 300ms antes da próxima medição
}`
    },
    {
      id:"c2-02", title:"Régua Eletrônica com OLED", difficulty:"Intermediário", time:"30 min",
      description:"Exibe distância em números grandes e barra gráfica proporcional no OLED SSD1306 128x64.",
      connections:"HC-SR04: Trig→pino 9, Echo→pino 10. OLED SSD1306 I2C: SDA→A4, SCL→A5, VCC→3.3V.",
      code:`// Projeto 2 — Régua Eletrônica com Display OLED
// HC-SR04 + OLED SSD1306 | DEVGENIUS V12
// Exibe distância em cm com número grande e barra de progresso visual

#include <Wire.h>             // Biblioteca I2C para o OLED
#include <Adafruit_GFX.h>     // Biblioteca gráfica base
#include <Adafruit_SSD1306.h> // Driver do display OLED

// Configuração do display OLED
Adafruit_SSD1306 display(128, 64, &Wire, -1);

// Pinos do sensor HC-SR04
const int PINO_TRIG = 9;   // Saída: dispara pulso ultrassônico
const int PINO_ECHO = 10;  // Entrada: recebe o eco

// Função de medição de distância em centímetros
float medirCm() {
  digitalWrite(PINO_TRIG, LOW);           // Garante LOW antes de disparar
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);          // Dispara pulso de 10µs
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);           // Finaliza o pulso
  long duracao = pulseIn(PINO_ECHO, HIGH, 30000);  // Mede tempo do eco
  return duracao * 0.034 / 2.0;           // Converte para centímetros
}

void setup() {
  pinMode(PINO_TRIG, OUTPUT);  // Trig como saída
  pinMode(PINO_ECHO, INPUT);   // Echo como entrada

  // Inicializa display OLED no endereço I2C 0x3C
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();

  // Mensagem inicial
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(20, 28);
  display.println("Regua Eletronica");
  display.display();
  delay(1500);
}

void loop() {
  float distanciaCm = medirCm();  // Lê distância atual

  display.clearDisplay();          // Limpa o display
  display.setTextColor(WHITE);

  // Exibe valor numérico grande (tamanho 3 = ~24px de altura)
  display.setTextSize(3);
  display.setCursor(10, 5);
  display.print(distanciaCm, 1);  // Ex: "42.5"
  display.print(" cm");

  // Barra de progresso na parte inferior (proporcional a 2-200cm)
  int larguraBarra = constrain(map((int)distanciaCm, 2, 200, 0, 127), 0, 127);
  display.drawRect(0, 45, 127, 14, WHITE);            // Borda da barra
  display.fillRect(1, 46, larguraBarra, 12, WHITE);   // Preenchimento proporcional

  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print("min:2cm   max:200cm");

  display.display();  // Envia para o display
  delay(200);         // Atualiza 5x por segundo
}`
    },
    {
      id:"c2-03", title:"Sensor de Estacionamento", difficulty:"Iniciante", time:"20 min",
      description:"Emite beeps com frequência proporcional à proximidade — quanto mais perto, mais rápido o beep.",
      connections:"HC-SR04: Trig→pino 9, Echo→pino 10. Buzzer passivo→pino 11.",
      code:`// Projeto 3 — Sensor de Estacionamento com Buzzer
// HC-SR04 + Buzzer Passivo | DEVGENIUS V12
// Simula o sensor de ré de um carro:
// Distância grande = beeps lentos | Distância pequena = beeps rápidos

// Pinos do sensor e buzzer
const int PINO_TRIG   =  9;   // HC-SR04 Trig (saída)
const int PINO_ECHO   = 10;   // HC-SR04 Echo (entrada)
const int PINO_BUZZER = 11;   // Buzzer passivo

// Distância máxima que aciona o sistema (cm)
const float DIST_MAX = 200.0;
// Distância mínima de alerta crítico (cm)
const float DIST_MIN = 2.0;

// Função de medição de distância
float medirDistancia() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);
  return pulseIn(PINO_ECHO, HIGH, 30000) * 0.034 / 2.0;
}

void setup() {
  pinMode(PINO_TRIG,   OUTPUT);  // Trig como saída
  pinMode(PINO_ECHO,   INPUT);   // Echo como entrada
  Serial.begin(9600);
  Serial.println("Sensor de Estacionamento pronto!");
}

void loop() {
  float distancia = medirDistancia();  // Mede distância

  // Ignora leituras fora do intervalo válido
  if (distancia > DIST_MAX || distancia < DIST_MIN) {
    noTone(PINO_BUZZER);   // Para o buzzer
    delay(300);
    return;
  }

  // Calcula o intervalo entre beeps:
  // Quanto menor a distância, menor o intervalo (beeps mais rápidos)
  // Mapeamento: 2cm → 100ms, 100cm → 1000ms
  int intervaloMs = map(constrain((int)distancia, 2, 100), 2, 100, 100, 1000);

  // Emite beep curto de 50ms na frequência 2000Hz
  tone(PINO_BUZZER, 2000, 50);
  delay(intervaloMs);  // Aguarda o intervalo calculado

  // Exibe informações no Serial
  Serial.print("Distancia: ");
  Serial.print(distancia, 1);
  Serial.print(" cm | Intervalo: ");
  Serial.print(intervaloMs);
  Serial.println(" ms");
}`
    },
    {
      id:"c2-04", title:"Nível de Caixa d'Água", difficulty:"Intermediário", time:"30 min",
      description:"Sensor instalado no topo da caixa mede nível da água em % e alerta quando nível está baixo.",
      connections:"HC-SR04 fixado no topo da caixa: Trig→pino 9, Echo→pino 10. LED vermelho de alerta→pino 13 (220Ω).",
      code:`// Projeto 4 — Monitor de Nível de Caixa d'Água
// HC-SR04 + LED de Alerta | DEVGENIUS V12
// Sensor instalado no topo mede a distância até a água.
// Quanto menor a distância, maior o nível da água.

// Pinos do hardware
const int PINO_TRIG      =  9;   // HC-SR04 Trig
const int PINO_ECHO      = 10;   // HC-SR04 Echo
const int PINO_LED_ALERTA = 13;  // LED vermelho de nível baixo

// Altura total da caixa em centímetros (ajuste para sua caixa)
const float ALTURA_CAIXA_CM = 150.0;

// Nível mínimo antes de acionar o alerta (% de água)
const int NIVEL_ALERTA_PCT = 20;  // Alerta abaixo de 20%

// Função que mede distância do sensor até a superfície da água
float medirDistancia() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);
  return pulseIn(PINO_ECHO, HIGH, 30000) * 0.034 / 2.0;
}

void setup() {
  pinMode(PINO_TRIG,       OUTPUT);  // Trig como saída
  pinMode(PINO_ECHO,       INPUT);   // Echo como entrada
  pinMode(PINO_LED_ALERTA, OUTPUT);  // LED como saída

  Serial.begin(9600);
  Serial.println("=== Monitor de Caixa d'Agua ===");
  Serial.print("Altura da caixa: ");
  Serial.print(ALTURA_CAIXA_CM);
  Serial.println(" cm");
}

void loop() {
  float distanciaAoSensor = medirDistancia();  // Distância sensor→água

  // Calcula o nível de água:
  // Caixa vazia: distância = altura total
  // Caixa cheia: distância ≈ 0
  float nivelAgua = constrain(ALTURA_CAIXA_CM - distanciaAoSensor, 0, ALTURA_CAIXA_CM);

  // Converte o nível para porcentagem (0-100%)
  int nivelPct = map((int)nivelAgua, 0, (int)ALTURA_CAIXA_CM, 0, 100);

  // Verifica se o nível está abaixo do mínimo
  bool nivelBaixo = (nivelPct < NIVEL_ALERTA_PCT);

  // Aciona ou desliga o LED de alerta
  digitalWrite(PINO_LED_ALERTA, nivelBaixo ? HIGH : LOW);

  // Exibe informações no Serial Monitor
  Serial.print("Nivel: ");
  Serial.print((int)nivelAgua);
  Serial.print(" cm (");
  Serial.print(nivelPct);
  Serial.print("%) — ");
  Serial.println(nivelBaixo ? "NIVEL BAIXO! Verificar." : "OK");

  delay(1000);  // Verifica a cada 1 segundo
}`
    },
    {
      id:"c2-05", title:"Radar de Obstáculos 180°", difficulty:"Avançado", time:"1h 30min",
      description:"Servo gira o HC-SR04 de 0° a 180° em passos de 5° e imprime mapa ASCII de distâncias no Serial.",
      connections:"HC-SR04: Trig→pino 9, Echo→pino 10. Servo (suporte do sensor): sinal→pino 6, VCC→5V externo.",
      code:`// Projeto 5 — Radar de Varredura 180°
// HC-SR04 + Servo | DEVGENIUS V12
// O servo gira o sensor ultrassônico varrendo 180°
// e desenha um mapa de distâncias no Serial Monitor

#include <Servo.h>  // Biblioteca para controle de servo

// Objetos e pinos
Servo servoRadar;          // Servo que gira o sensor
const int PINO_TRIG =  9;  // HC-SR04 Trig
const int PINO_ECHO = 10;  // HC-SR04 Echo
const int PINO_SERVO = 6;  // Pino do sinal do servo

// Configurações do radar
const int PASSO_GRAU = 5;      // Passo de varredura em graus
const int DIST_MAX_CM = 150;   // Distância máxima representada no mapa

// Função que mede distância em um ângulo específico
float medirDistancia() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);
  return pulseIn(PINO_ECHO, HIGH, 30000) * 0.034 / 2.0;
}

void setup() {
  servoRadar.attach(PINO_SERVO);  // Conecta servo ao pino
  pinMode(PINO_TRIG, OUTPUT);      // Trig como saída
  pinMode(PINO_ECHO, INPUT);       // Echo como entrada
  Serial.begin(115200);            // Alta velocidade para exibir o mapa
  Serial.println("Radar DEVGENIUS iniciado!");
}

void loop() {
  Serial.println("=== VARREDURA DO RADAR ===");
  Serial.println("Angulo | Distancia | Mapa Visual");

  // Varre de 0° a 180°
  for (int angulo = 0; angulo <= 180; angulo += PASSO_GRAU) {
    servoRadar.write(angulo);   // Move o servo para o ângulo atual
    delay(80);                   // Aguarda servo estabilizar

    float distancia = medirDistancia();  // Mede a distância nesse ângulo

    // Imprime o ângulo formatado
    Serial.print(angulo);
    Serial.print("° : ");
    Serial.print(distancia, 0);
    Serial.print(" cm  ");

    // Desenha barra ASCII proporcional à distância
    // Cada '#' representa ~5cm de distância
    int barras = constrain((int)(distancia / 5), 0, 30);
    for (int i = 0; i < barras; i++) {
      Serial.print('#');  // Cada # = ~5cm
    }
    Serial.println();
  }

  // Pausa entre varreduras
  Serial.println("========================");
  delay(500);
}`
    },
    {
      id:"c2-06", title:"Medidor de Velocidade", difficulty:"Avançado", time:"1h",
      description:"Dois HC-SR04 posicionados a 20cm calculam a velocidade de objetos que passam entre eles.",
      connections:"Sensor 1: Trig→pino 6, Echo→pino 7. Sensor 2: Trig→pino 8, Echo→pino 9. Distância entre sensores = 20cm.",
      code:`// Projeto 6 — Medidor de Velocidade com 2 Sensores
// 2x HC-SR04 | DEVGENIUS V12
// Posicione dois sensores a 20cm de distância.
// Quando um objeto passa pelos dois, calcula a velocidade.

// Pinos do Sensor 1 (primeiro a ser ativado)
const int TRIG1 = 6;
const int ECHO1 = 7;

// Pinos do Sensor 2 (segundo a ser ativado)
const int TRIG2 = 8;
const int ECHO2 = 9;

// Distância entre os dois sensores em metros
const float DISTANCIA_ENTRE_SENSORES = 0.20;  // 20 centímetros = 0,20 metros

// Distância limite para considerar que um objeto foi detectado
const float DIST_DETECCAO_CM = 10.0;

// Função que mede distância de um sensor específico
float medirDistancia(int pino_trig, int pino_echo) {
  digitalWrite(pino_trig, LOW);
  delayMicroseconds(2);
  digitalWrite(pino_trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(pino_trig, LOW);
  return pulseIn(pino_echo, HIGH, 30000) * 0.034 / 2.0;
}

void setup() {
  // Configura pinos dos dois sensores
  pinMode(TRIG1, OUTPUT); pinMode(ECHO1, INPUT);
  pinMode(TRIG2, OUTPUT); pinMode(ECHO2, INPUT);

  Serial.begin(9600);
  Serial.println("=== Medidor de Velocidade ===");
  Serial.println("Posicione os dois sensores a 20cm de distancia.");
  Serial.println("Passe um objeto na frente deles para medir!");
}

void loop() {
  float distancia1 = medirDistancia(TRIG1, ECHO1);  // Lê sensor 1

  // Aguarda objeto entrar na zona de detecção do Sensor 1
  if (distancia1 > DIST_DETECCAO_CM) {
    delay(50);
    return;  // Objeto não detectado, continua verificando
  }

  // Objeto detectado pelo Sensor 1! Registra o instante
  unsigned long tempoSensor1 = millis();
  Serial.println("Objeto detectado pelo Sensor 1...");

  // Aguarda o objeto chegar ao Sensor 2
  while (true) {
    float distancia2 = medirDistancia(TRIG2, ECHO2);
    if (distancia2 < DIST_DETECCAO_CM) {
      // Sensor 2 detectou o objeto!
      unsigned long tempoSensor2 = millis();

      // Calcula o tempo decorrido entre os dois sensores (em segundos)
      float tempoDecorridoSeg = (tempoSensor2 - tempoSensor1) / 1000.0;

      // Calcula velocidade: v = distância / tempo
      float velocidadeMps  = DISTANCIA_ENTRE_SENSORES / tempoDecorridoSeg;
      float velocidadeKmh  = velocidadeMps * 3.6;

      // Exibe resultado
      Serial.print("Velocidade: ");
      Serial.print(velocidadeMps, 2);
      Serial.print(" m/s = ");
      Serial.print(velocidadeKmh, 1);
      Serial.println(" km/h");

      delay(1000);  // Pausa para próxima medição
      break;
    }
    // Timeout: se demorar mais de 5 segundos, cancela
    if (millis() - tempoSensor1 > 5000) {
      Serial.println("Timeout: objeto nao chegou ao Sensor 2.");
      break;
    }
  }
}`
    },
    {
      id:"c2-07", title:"Piano Laser sem Toque", difficulty:"Avançado", time:"2h",
      description:"5 HC-SR04 criam um piano virtual — aproximar a mão de cada sensor toca uma nota musical no buzzer.",
      connections:"5 pares Trig/Echo: pinos 2/3, 4/5, 6/7, 8/9, 10/11. Buzzer passivo→pino 12.",
      code:`// Projeto 7 — Piano Virtual sem Toque
// 5x HC-SR04 + Buzzer Passivo | DEVGENIUS V12
// Cada sensor controla uma nota musical.
// Aproxime a mão (menos de 15cm) para tocar a nota!

// Arrays com os pinos de cada sensor ultrassônico
const int PINOS_TRIG[] = {2, 4, 6, 8,  10};  // 5 pinos Trig
const int PINOS_ECHO[] = {3, 5, 7, 9,  11};  // 5 pinos Echo

// Frequências das notas musicais (Hz) — escala de Dó
// Do4  Re4  Mi4   Fa4   Sol4
const int NOTAS[] = {262, 294, 330, 349, 392};

// Nomes das notas para exibição no Serial
const char* NOMES_NOTAS[] = {"Do", "Re", "Mi", "Fa", "Sol"};

// Número de sensores/notas
const int NUM_NOTAS = 5;

// Pino do buzzer passivo
const int PINO_BUZZER = 12;

// Distância máxima para considerar que a mão está sobre o sensor (cm)
const float DIST_ATIVACAO = 15.0;

// Função que mede distância de um sensor pelo índice (0 a 4)
float medirDistancia(int indice) {
  digitalWrite(PINOS_TRIG[indice], LOW);
  delayMicroseconds(2);
  digitalWrite(PINOS_TRIG[indice], HIGH);
  delayMicroseconds(10);
  digitalWrite(PINOS_TRIG[indice], LOW);
  // Timeout de 20ms (máximo ~340cm)
  return pulseIn(PINOS_ECHO[indice], HIGH, 20000) * 0.034 / 2.0;
}

void setup() {
  // Configura os pinos de todos os 5 sensores
  for (int i = 0; i < NUM_NOTAS; i++) {
    pinMode(PINOS_TRIG[i], OUTPUT);  // Trig como saída
    pinMode(PINOS_ECHO[i], INPUT);   // Echo como entrada
  }
  Serial.begin(9600);
  Serial.println("Piano Laser DevGenius pronto!");
  Serial.println("Aproxime a mao a menos de 15cm de cada sensor:");
  for (int i = 0; i < NUM_NOTAS; i++) {
    Serial.print("Sensor ");
    Serial.print(i + 1);
    Serial.print(" = nota ");
    Serial.println(NOMES_NOTAS[i]);
  }
}

void loop() {
  bool algumaTocando = false;  // Flag: alguma nota está sendo tocada?

  // Verifica cada sensor em sequência
  for (int i = 0; i < NUM_NOTAS; i++) {
    float distancia = medirDistancia(i);  // Lê distância do sensor i

    // Verifica se a mão está próxima o suficiente
    if (distancia > 0 && distancia < DIST_ATIVACAO) {
      tone(PINO_BUZZER, NOTAS[i]);  // Toca a nota correspondente

      // Exibe qual nota está tocando
      Serial.print("Tocando: ");
      Serial.print(NOMES_NOTAS[i]);
      Serial.print(" (");
      Serial.print(NOTAS[i]);
      Serial.print(" Hz) — dist: ");
      Serial.print(distancia, 1);
      Serial.println(" cm");

      algumaTocando = true;
      break;  // Toca apenas uma nota por vez
    }
  }

  // Se nenhum sensor foi ativado, para o buzzer
  if (!algumaTocando) {
    noTone(PINO_BUZZER);
  }

  delay(50);  // 20 verificações por segundo
}`
    },
    {
      id:"c2-08", title:"Portão Automático", difficulty:"Intermediário", time:"45 min",
      description:"Detecta veículo a menos de 50cm, abre o portão servo automaticamente por 5 segundos e fecha.",
      connections:"HC-SR04: Trig→pino 9, Echo→pino 10. Servo representando o portão: sinal→pino 6, VCC→5V externo.",
      code:`// Projeto 8 — Portão Automático com Sensor de Proximidade
// HC-SR04 + Servo Motor | DEVGENIUS V12
// Quando um veículo/pessoa se aproxima (< 50cm),
// o portão abre automaticamente e fecha após 5 segundos.

#include <Servo.h>  // Biblioteca para controle do servo

// Pinos do hardware
const int PINO_TRIG  =  9;  // HC-SR04 Trig (saída)
const int PINO_ECHO  = 10;  // HC-SR04 Echo (entrada)
const int PINO_SERVO =  6;  // Sinal do servo motor

// Configurações do portão
const float DIST_ABERTURA_CM = 50.0;  // Detecta veículo a menos de 50cm
const int ANGULO_FECHADO = 0;          // Ângulo do servo com portão fechado
const int ANGULO_ABERTO  = 90;         // Ângulo do servo com portão aberto
const unsigned long TEMPO_ABERTO_MS = 5000;  // Tempo que o portão fica aberto (5s)

// Servo do portão
Servo servoPortao;

// Estado atual do portão
bool portaoAberto = false;

// Função de medição de distância
float medirDistancia() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);
  return pulseIn(PINO_ECHO, HIGH, 30000) * 0.034 / 2.0;
}

void setup() {
  servoPortao.attach(PINO_SERVO);        // Conecta servo ao pino
  servoPortao.write(ANGULO_FECHADO);     // Inicia com portão fechado
  pinMode(PINO_TRIG, OUTPUT);             // Trig como saída
  pinMode(PINO_ECHO, INPUT);              // Echo como entrada
  Serial.begin(9600);
  Serial.println("Sistema de Portao Automatico pronto!");
}

void loop() {
  float distancia = medirDistancia();  // Verifica distância
  Serial.print("Distancia: "); Serial.print(distancia, 1); Serial.println(" cm");

  // Abre o portão se veículo detectado e portão estiver fechado
  if (distancia < DIST_ABERTURA_CM && !portaoAberto) {
    Serial.println("Veiculo detectado! Abrindo portao...");
    servoPortao.write(ANGULO_ABERTO);  // Abre o portão
    portaoAberto = true;

    delay(TEMPO_ABERTO_MS);  // Mantém aberto por 5 segundos

    Serial.println("Fechando portao...");
    servoPortao.write(ANGULO_FECHADO);  // Fecha o portão
    portaoAberto = false;
  }

  delay(200);  // Verifica a cada 200ms
}`
    },
    {
      id:"c2-09", title:"Boia de Nível com LCD", difficulty:"Intermediário", time:"40 min",
      description:"Exibe nível da caixa d'água em porcentagem e barra gráfica no LCD 16x2 via I2C.",
      connections:"HC-SR04: Trig→pino 9, Echo→pino 10. LCD 16x2 com módulo I2C: SDA→A4, SCL→A5, VCC→5V.",
      code:`// Projeto 9 — Monitor de Nível com LCD 16x2
// HC-SR04 + LCD 16x2 I2C | DEVGENIUS V12
// Exibe nível da água em % e barra visual no LCD
// Instale a biblioteca: LiquidCrystal_I2C

#include <Wire.h>              // Biblioteca I2C
#include <LiquidCrystal_I2C.h> // Biblioteca do LCD I2C

// LCD 16 colunas x 2 linhas, endereço I2C 0x27
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Pinos do HC-SR04
const int PINO_TRIG = 9;
const int PINO_ECHO = 10;

// Altura máxima da caixa em cm (distância do sensor ao fundo vazio)
const float ALTURA_MAXIMA_CM = 100.0;

// Caractere especial para a barra (bloco cheio)
byte BLOCO_CHEIO[8] = {0x1F,0x1F,0x1F,0x1F,0x1F,0x1F,0x1F,0x1F};

// Função que mede distância
float medirDistancia() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);
  return pulseIn(PINO_ECHO, HIGH, 30000) * 0.034 / 2.0;
}

void setup() {
  pinMode(PINO_TRIG, OUTPUT);  // Trig como saída
  pinMode(PINO_ECHO, INPUT);   // Echo como entrada

  lcd.init();            // Inicializa o LCD
  lcd.backlight();       // Liga o backlight
  lcd.createChar(0, BLOCO_CHEIO);  // Registra caractere de bloco

  // Mensagem de inicialização
  lcd.setCursor(0, 0);
  lcd.print("Caixa d'Agua V12");
  lcd.setCursor(0, 1);
  lcd.print("Iniciando...");
  delay(2000);
}

void loop() {
  float distancia = medirDistancia();  // Distância sensor → superfície água

  // Calcula nível em %: distância pequena = nível alto
  int nivelPct = 100 - constrain(map((int)distancia, 0, (int)ALTURA_MAXIMA_CM, 0, 100), 0, 100);

  // ─── Linha 1: texto com porcentagem ─────────────
  lcd.setCursor(0, 0);
  lcd.print("Nivel: ");
  lcd.print(nivelPct);
  lcd.print("%   ");  // Espaços apagam dígitos anteriores

  // ─── Linha 2: barra gráfica (16 blocos = 100%) ──
  lcd.setCursor(0, 1);
  int blocos = map(nivelPct, 0, 100, 0, 16);  // Quantos blocos preencher

  for (int i = 0; i < 16; i++) {
    if (i < blocos) {
      lcd.write(byte(0));  // Bloco cheio (nível preenchido)
    } else {
      lcd.print(" ");      // Espaço (nível vazio)
    }
  }

  delay(500);  // Atualiza 2 vezes por segundo
}`
    },
    {
      id:"c2-10", title:"Robô Desvio de Obstáculos", difficulty:"Avançado", time:"3h",
      description:"Robô com 2 motores DC que detecta obstáculos à frente e desvia automaticamente para a direita.",
      connections:"HC-SR04: Trig→pino 9, Echo→pino 10. Motor esquerdo: IN1→4, IN2→5, EN_A→6(PWM). Motor direito: IN3→7, IN4→8, EN_B→3(PWM).",
      code:`// Projeto 10 — Robô Autônomo com Desvio de Obstáculos
// HC-SR04 + Ponte H L298N + 2 Motores DC | DEVGENIUS V12
// O robô anda em frente e desvia quando detecta obstáculo

// ─── Pinos do sensor HC-SR04 ─────────────────────
const int PINO_TRIG  =  9;   // Sensor: Trig (saída)
const int PINO_ECHO  = 10;   // Sensor: Echo (entrada)

// ─── Pinos do motor ESQUERDO (via L298N) ─────────
const int M_ESQ_IN1 = 4;   // Direção da bobina A+
const int M_ESQ_IN2 = 5;   // Direção da bobina A-
const int M_ESQ_ENA = 6;   // Enable A (PWM para velocidade)

// ─── Pinos do motor DIREITO (via L298N) ──────────
const int M_DIR_IN3 = 7;   // Direção da bobina B+
const int M_DIR_IN4 = 8;   // Direção da bobina B-
const int M_DIR_ENB = 3;   // Enable B (PWM para velocidade)

// Distância mínima antes de desviar (cm)
const float DIST_OBSTACULO_CM = 20.0;

// Velocidade padrão dos motores (0-255)
const int VELOCIDADE = 180;

// ─── Funções de movimento ─────────────────────────

// Anda para frente
void andarFrente(int velocidade) {
  digitalWrite(M_ESQ_IN1, HIGH); digitalWrite(M_ESQ_IN2, LOW);
  analogWrite(M_ESQ_ENA, velocidade);   // Velocidade motor esq
  digitalWrite(M_DIR_IN3, HIGH); digitalWrite(M_DIR_IN4, LOW);
  analogWrite(M_DIR_ENB, velocidade);   // Velocidade motor dir
}

// Vira para a direita (motor esquerdo gira, direito para)
void virarDireita(int velocidade) {
  digitalWrite(M_ESQ_IN1, HIGH); digitalWrite(M_ESQ_IN2, LOW);
  analogWrite(M_ESQ_ENA, velocidade);   // Motor esquerdo anda
  digitalWrite(M_DIR_IN3, LOW);  digitalWrite(M_DIR_IN4, HIGH);
  analogWrite(M_DIR_ENB, velocidade);   // Motor direito recua
}

// Para os dois motores
void parar() {
  analogWrite(M_ESQ_ENA, 0);  // Desliga motor esquerdo
  analogWrite(M_DIR_ENB, 0);  // Desliga motor direito
}

// Mede distância com o HC-SR04
float medirDistancia() {
  digitalWrite(PINO_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PINO_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PINO_TRIG, LOW);
  return pulseIn(PINO_ECHO, HIGH, 30000) * 0.034 / 2.0;
}

void setup() {
  // Configura pinos dos motores como saída
  pinMode(M_ESQ_IN1, OUTPUT); pinMode(M_ESQ_IN2, OUTPUT);
  pinMode(M_DIR_IN3, OUTPUT); pinMode(M_DIR_IN4, OUTPUT);

  // Configura pinos do sensor
  pinMode(PINO_TRIG, OUTPUT);
  pinMode(PINO_ECHO, INPUT);

  Serial.begin(9600);
  Serial.println("Robo Autonomo DevGenius iniciado!");
  delay(2000);  // Pausa de 2s antes de começar a andar
}

void loop() {
  float distancia = medirDistancia();  // Verifica obstáculo à frente

  if (distancia > DIST_OBSTACULO_CM) {
    // Caminho livre: anda para frente
    andarFrente(VELOCIDADE);
    Serial.print("Frente | dist: "); Serial.println(distancia, 1);
  } else {
    // Obstáculo detectado: para e desvia
    Serial.print("OBSTACULO! dist: "); Serial.print(distancia, 1);
    Serial.println(" cm — Desviando...");
    parar();           // Para o robô
    delay(300);        // Breve pausa
    virarDireita(VELOCIDADE);  // Vira para a direita
    delay(600);        // Vira por 600ms
  }

  delay(50);  // Verificações a cada 50ms (20x por segundo)
}`
    },
  ],

  // ── Servo Motor MG996R ───────────────────────────────────────────────────
  c5: [
    {
      id:"c5-01", title:"Varredura Automática 0-180°", difficulty:"Iniciante", time:"15 min",
      description:"Servo varre continuamente de 0 a 180 graus e retorna, criando um movimento de pêndulo.",
      connections:"Sinal (fio laranja/amarelo)→pino 9. VCC (fio vermelho)→5V externo mínimo 1A. GND (fio marrom/preto)→GND comum com o Arduino.",
      code:`// Projeto 1 — Varredura Automática de Servo 0° a 180°
// Servo Motor MG996R | DEVGENIUS V12
// O servo varre de 0° a 180° e volta, criando movimento pendular contínuo

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objeto do servo motor
Servo meuServo;

// Pino onde o sinal do servo está conectado
const int PINO_SERVO = 9;

// Velocidade do movimento (delay entre cada grau em ms)
// Menor = mais rápido | Maior = mais lento
const int DELAY_MS = 10;

void setup() {
  meuServo.attach(PINO_SERVO);  // Conecta o servo ao pino 9
  Serial.begin(9600);
  Serial.println("Varredura de servo iniciada!");
}

void loop() {
  // ── Vai de 0° até 180° (movimento de ida) ──
  for (int angulo = 0; angulo <= 180; angulo++) {
    meuServo.write(angulo);  // Define o ângulo atual
    delay(DELAY_MS);          // Aguarda antes do próximo grau
  }

  // ── Volta de 180° até 0° (movimento de retorno) ──
  for (int angulo = 180; angulo >= 0; angulo--) {
    meuServo.write(angulo);  // Define o ângulo atual
    delay(DELAY_MS);          // Aguarda antes do próximo grau
  }
}`
    },
    {
      id:"c5-02", title:"Controle por Potenciômetro", difficulty:"Iniciante", time:"20 min",
      description:"Potenciômetro no pino A0 controla o ângulo do servo em tempo real com resposta imediata.",
      connections:"Potenciômetro: terminal esquerdo→5V, terminal central→A0, terminal direito→GND. Servo sinal→pino 9.",
      code:`// Projeto 2 — Controle de Servo com Potenciômetro
// Servo Motor + Potenciômetro | DEVGENIUS V12
// Gire o potenciômetro para controlar o ângulo do servo em tempo real

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objeto do servo motor
Servo meuServo;

// Pinos usados
const int PINO_SERVO = 9;   // Pino do sinal do servo
const int PINO_POT   = A0;  // Pino analógico do potenciômetro

void setup() {
  meuServo.attach(PINO_SERVO);  // Conecta servo ao pino 9
  Serial.begin(9600);            // Inicia comunicação Serial
  Serial.println("Controle por Potenciometro ativo!");
}

void loop() {
  // Lê o valor do potenciômetro (0 a 1023 — ADC de 10 bits)
  int valorPotenciometro = analogRead(PINO_POT);

  // Converte o valor do ADC (0-1023) para ângulo do servo (0-180°)
  // map(valor, min_entrada, max_entrada, min_saida, max_saida)
  int angulo = map(valorPotenciometro, 0, 1023, 0, 180);

  // Define o ângulo do servo
  meuServo.write(angulo);

  // Exibe os valores no Serial Monitor para debug
  Serial.print("Potenciometro: ");
  Serial.print(valorPotenciometro);
  Serial.print(" | Angulo: ");
  Serial.print(angulo);
  Serial.println("°");

  delay(15);  // Pequeno delay para estabilizar a leitura (15ms = ~67 leituras/s)
}`
    },
    {
      id:"c5-03", title:"Braço Robótico 3 Servos", difficulty:"Avançado", time:"2h",
      description:"Controla 3 servos independentes via Serial. Envie comandos no formato: A1:90 A2:45 A3:0",
      connections:"Servo 1 (base)→pino 9. Servo 2 (ombro)→pino 10. Servo 3 (cotovelo)→pino 11. Todos com VCC→5V/3A externo e GND comum.",
      code:`// Projeto 3 — Braço Robótico com 3 Servos
// 3x Servo Motor | DEVGENIUS V12
// Controla 3 juntas do braço robótico via Serial Monitor.
// Formato dos comandos: A1:90 A2:45 A3:0
// A1 = servo base (pino 9)
// A2 = servo ombro (pino 10)
// A3 = servo cotovelo (pino 11)

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objetos para os 3 servos
Servo servoBase;      // Servo 1: rotação da base
Servo servoOmbro;     // Servo 2: movimento do ombro
Servo servoCotovelo;  // Servo 3: flexão do cotovelo

void setup() {
  // Conecta cada servo ao seu pino
  servoBase.attach(9);       // Servo da base no pino 9
  servoOmbro.attach(10);     // Servo do ombro no pino 10
  servoCotovelo.attach(11);  // Servo do cotovelo no pino 11

  // Posiciona todos os servos no centro (90°) ao iniciar
  servoBase.write(90);
  servoOmbro.write(90);
  servoCotovelo.write(90);

  Serial.begin(9600);
  Serial.println("=== Braco Robotico Pronto ===");
  Serial.println("Formato: A1:90 A2:45 A3:0");
  Serial.println("A1=Base | A2=Ombro | A3=Cotovelo");
  Serial.println("Angulos validos: 0 a 180 graus");
}

void loop() {
  // Verifica se há dados disponíveis no Serial
  if (Serial.available()) {
    // Lê o comando até encontrar quebra de linha
    String comando = Serial.readStringUntil('\n');
    comando.trim();  // Remove espaços e '\r' extras

    // Processa o servo A1 (Base)
    int posA1 = comando.indexOf("A1:");
    if (posA1 >= 0) {
      int angulo = constrain(comando.substring(posA1 + 3).toInt(), 0, 180);
      servoBase.write(angulo);
      Serial.print("Base → "); Serial.print(angulo); Serial.println("°");
    }

    // Processa o servo A2 (Ombro)
    int posA2 = comando.indexOf("A2:");
    if (posA2 >= 0) {
      int angulo = constrain(comando.substring(posA2 + 3).toInt(), 0, 180);
      servoOmbro.write(angulo);
      Serial.print("Ombro → "); Serial.print(angulo); Serial.println("°");
    }

    // Processa o servo A3 (Cotovelo)
    int posA3 = comando.indexOf("A3:");
    if (posA3 >= 0) {
      int angulo = constrain(comando.substring(posA3 + 3).toInt(), 0, 180);
      servoCotovelo.write(angulo);
      Serial.print("Cotovelo → "); Serial.print(angulo); Serial.println("°");
    }

    Serial.println("OK: " + comando);
  }
}`
    },
    {
      id:"c5-04", title:"Cancela de Estacionamento", difficulty:"Intermediário", time:"30 min",
      description:"Pressione o botão para abrir a cancela (0°→90°). Fecha automaticamente após 3 segundos.",
      connections:"Servo (cancela)→pino 9 com fonte externa. Botão→pino 2 (INPUT_PULLUP, outro terminal ao GND).",
      code:`// Projeto 4 — Cancela de Estacionamento Automática
// Servo Motor + Botão | DEVGENIUS V12
// Pressione o botão para abrir a cancela.
// Ela fecha automaticamente após 3 segundos.

#include <Servo.h>  // Biblioteca para controle de servo

// Pinos do hardware
const int PINO_SERVO = 9;   // Sinal do servo da cancela
const int PINO_BOTAO = 2;   // Botão de abertura (INPUT_PULLUP)

// Ângulos da cancela
const int ANGULO_FECHADA = 0;    // Cancela fechada (bloqueio)
const int ANGULO_ABERTA  = 90;   // Cancela aberta (passagem livre)

// Tempo que a cancela fica aberta (milissegundos)
const unsigned long TEMPO_ABERTA_MS = 3000;  // 3 segundos

// Cria objeto do servo
Servo servoCancela;

// Variáveis de controle
bool cancela_aberta          = false;   // Estado atual da cancela
unsigned long tempo_abertura = 0;        // Quando foi aberta

void setup() {
  servoCancela.attach(PINO_SERVO);         // Conecta servo ao pino 9
  servoCancela.write(ANGULO_FECHADA);      // Inicia com cancela fechada
  pinMode(PINO_BOTAO, INPUT_PULLUP);       // Botão com pull-up interno
  Serial.begin(9600);
  Serial.println("Cancela de Estacionamento pronta!");
  Serial.println("Pressione o botao para abrir.");
}

void loop() {
  // Detecta pressionamento do botão (LOW = pressionado com INPUT_PULLUP)
  bool botao_pressionado = (digitalRead(PINO_BOTAO) == LOW);

  if (botao_pressionado && !cancela_aberta) {
    // Abre a cancela
    servoCancela.write(ANGULO_ABERTA);   // Move para posição aberta
    cancela_aberta = true;                // Atualiza estado
    tempo_abertura = millis();            // Registra o momento da abertura
    Serial.println("CANCELA ABERTA — fecha em 3 segundos...");
  }

  // Verifica se já passou o tempo de abertura
  if (cancela_aberta && (millis() - tempo_abertura >= TEMPO_ABERTA_MS)) {
    // Fecha a cancela automaticamente
    servoCancela.write(ANGULO_FECHADA);  // Move para posição fechada
    cancela_aberta = false;               // Atualiza estado
    Serial.println("CANCELA FECHADA.");
  }
}`
    },
    {
      id:"c5-05", title:"Câmera Pan-Tilt", difficulty:"Avançado", time:"1h 30min",
      description:"2 servos formam suporte pan-tilt para câmera. Controlados via Serial com comandos P:ângulo e T:ângulo.",
      connections:"Servo pan (horizontal, base)→pino 9. Servo tilt (vertical, inclinação)→pino 10. Ambos com fonte externa 5V/2A.",
      code:`// Projeto 5 — Sistema Pan-Tilt para Câmera
// 2x Servo Motor | DEVGENIUS V12
// Controla horizontalmente (Pan) e verticalmente (Tilt) via Serial.
// Comandos: P:90 (pan), T:45 (tilt), CENTER (centraliza ambos)

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objetos para os dois servos
Servo servoPan;   // Servo horizontal (gira esquerda/direita)
Servo servoTilt;  // Servo vertical (inclina cima/baixo)

// Pinos dos servos
const int PINO_PAN  = 9;   // Servo de rotação horizontal
const int PINO_TILT = 10;  // Servo de inclinação vertical

// Ângulos iniciais (centro da câmera)
const int PAN_CENTRO  = 90;  // Centro horizontal
const int TILT_CENTRO = 45;  // Centro vertical (ligeiramente para baixo)

// Limites de ângulo do tilt (evita danos mecânicos)
const int TILT_MIN =  0;   // Mínimo inclinado para baixo
const int TILT_MAX = 90;   // Máximo inclinado para cima

void setup() {
  servoPan.attach(PINO_PAN);       // Conecta servo pan
  servoTilt.attach(PINO_TILT);     // Conecta servo tilt

  // Posiciona no centro ao iniciar
  servoPan.write(PAN_CENTRO);
  servoTilt.write(TILT_CENTRO);

  Serial.begin(9600);
  Serial.println("=== Sistema Pan-Tilt Pronto ===");
  Serial.println("Comandos disponiveis:");
  Serial.println("  P:90    — Pan horizontal (0-180°)");
  Serial.println("  T:45    — Tilt vertical (0-90°)");
  Serial.println("  CENTER  — Centraliza os dois servos");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');  // Lê até quebra de linha
    cmd.trim();  // Remove espaços e '\r'

    if (cmd.startsWith("P:")) {
      // Processa comando de Pan (rotação horizontal)
      int angulo = constrain(cmd.substring(2).toInt(), 0, 180);
      servoPan.write(angulo);
      Serial.print("Pan ajustado para: ");
      Serial.print(angulo); Serial.println("°");

    } else if (cmd.startsWith("T:")) {
      // Processa comando de Tilt (inclinação vertical)
      int angulo = constrain(cmd.substring(2).toInt(), TILT_MIN, TILT_MAX);
      servoTilt.write(angulo);
      Serial.print("Tilt ajustado para: ");
      Serial.print(angulo); Serial.println("°");

    } else if (cmd == "CENTER") {
      // Centraliza ambos os servos
      servoPan.write(PAN_CENTRO);
      servoTilt.write(TILT_CENTRO);
      Serial.println("Camera centralizada.");

    } else {
      Serial.println("Comando nao reconhecido. Use P:90, T:45 ou CENTER");
    }
  }
}`
    },
    {
      id:"c5-06", title:"Velocímetro de Servo", difficulty:"Intermediário", time:"45 min",
      description:"Mede RPM de servo de rotação contínua via encoder óptico com interrupção de hardware.",
      connections:"Servo de rotação contínua→pino 9. Encoder óptico (sensor de garfo)→pino 2 (pino de interrupção INT0).",
      code:`// Projeto 6 — Velocímetro de Servo com Encoder Óptico
// Servo Contínuo + Encoder | DEVGENIUS V12
// Usa interrupção de hardware para contar pulsos do encoder
// e calcular RPM com precisão

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objeto do servo de rotação contínua
Servo servoContínuo;

// Pinos do hardware
const int PINO_SERVO   = 9;  // Sinal do servo contínuo
const int PINO_ENCODER = 2;  // Encoder óptico (pino INT0)

// Configuração do encoder
const int PULSOS_POR_VOLTA = 20;  // Número de furos/ranhuras do disco encoder

// Variáveis de contagem (volatile = pode ser alterada pela ISR)
volatile int contadorPulsos = 0;   // Conta pulsos da ISR
unsigned long tempoUltimaLeitura = 0;  // Controle de tempo

// ISR (Interrupt Service Routine) — chamada a cada pulso do encoder
// Deve ser curta: apenas incrementa o contador
void IRAM_ATTR contarPulso() {
  contadorPulsos++;  // Incrementa contador a cada pulso detectado
}

void setup() {
  servoContínuo.attach(PINO_SERVO);
  servoContínuo.write(100);  // Velocidade lenta (90=parado, 100=lento, 180=máximo)

  // Configura pino do encoder com pull-up interno
  pinMode(PINO_ENCODER, INPUT_PULLUP);

  // Configura interrupção no pino 2 (INT0) acionada na borda de subida
  attachInterrupt(digitalPinToInterrupt(PINO_ENCODER), contarPulso, RISING);

  Serial.begin(9600);
  Serial.println("Velocimetro de Servo iniciado!");
  Serial.println("Pulsos/s | RPM");

  tempoUltimaLeitura = millis();
}

void loop() {
  // Calcula RPM a cada 1 segundo
  if (millis() - tempoUltimaLeitura >= 1000) {
    // Desabilita interrupção temporariamente para ler com segurança
    noInterrupts();
    int pulsosCopia = contadorPulsos;  // Copia valor atual
    contadorPulsos = 0;                // Reseta o contador
    interrupts();                       // Reabilita interrupções

    // Calcula RPM:
    // pulsosCopia = pulsos em 1 segundo
    // RPM = (pulsos/s ÷ pulsos_por_volta) × 60 segundos
    float rpm = ((float)pulsosCopia / PULSOS_POR_VOLTA) * 60.0;

    // Exibe resultado no Serial Monitor
    Serial.print(pulsosCopia);
    Serial.print(" pulsos/s | ");
    Serial.print(rpm, 1);
    Serial.println(" RPM");

    tempoUltimaLeitura = millis();  // Reinicia o timer
  }
}`
    },
    {
      id:"c5-07", title:"Gimbal Estabilizador com MPU6050", difficulty:"Avançado", time:"3h",
      description:"Lê o ângulo de inclinação do MPU6050 e move o servo em tempo real para manter uma plataforma nivelada.",
      connections:"MPU6050 I2C: SDA→A4, SCL→A5, VCC→3.3V, GND→GND. Servo de compensação→pino 9.",
      code:`// Projeto 7 — Gimbal Estabilizador com MPU6050
// MPU6050 + Servo Motor | DEVGENIUS V12
// Detecta inclinação com o giroscópio/acelerômetro MPU6050
// e move o servo para compensar, mantendo a plataforma nivelada
// Instale a biblioteca: MPU6050 by Electronic Cats

#include <Wire.h>    // Biblioteca I2C para o MPU6050
#include <MPU6050.h> // Biblioteca do sensor MPU6050
#include <Servo.h>   // Biblioteca para o servo motor

// Cria objetos dos periféricos
MPU6050 mpu;      // Sensor de movimento MPU6050
Servo servoGimbal; // Servo de compensação

// Pino do servo
const int PINO_SERVO = 9;

// Ângulo central do servo (posição nivelada = 90°)
const int ANGULO_CENTRO = 90;

// Fator de suavização do movimento (0.1 = suave, 1.0 = direto)
const float SUAVIZACAO = 0.3;

// Ângulo atual do servo (usado para suavização)
float anguloAtual = 90.0;

void setup() {
  Wire.begin();          // Inicia comunicação I2C
  mpu.initialize();      // Inicializa o sensor MPU6050

  servoGimbal.attach(PINO_SERVO);  // Conecta o servo ao pino 9
  servoGimbal.write(ANGULO_CENTRO); // Posiciona no centro

  Serial.begin(9600);
  Serial.println("Gimbal Estabilizador iniciado!");

  // Verifica se o MPU6050 está respondendo corretamente
  if (mpu.testConnection()) {
    Serial.println("MPU6050 conectado com sucesso!");
  } else {
    Serial.println("ERRO: MPU6050 nao encontrado!");
  }
}

void loop() {
  // Variáveis para leituras brutas do sensor
  int16_t ax, ay, az;  // Aceleração nos 3 eixos (raw)
  int16_t gx, gy, gz;  // Giroscópio nos 3 eixos (raw)

  // Lê todos os 6 valores de uma vez (eficiente)
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  // Calcula o ângulo de inclinação X usando o acelerômetro
  // atan2 retorna o ângulo em radianos → converte para graus
  float anguloX = atan2((float)ay, (float)az) * 180.0 / PI;

  // Calcula a compensação: se inclinado +10°, servo move -10°
  int anguloCompensacao = constrain(ANGULO_CENTRO - (int)anguloX, 0, 180);

  // Aplica suavização para evitar movimentos bruscos
  anguloAtual = anguloAtual + SUAVIZACAO * (anguloCompensacao - anguloAtual);

  // Move o servo para a posição compensada
  servoGimbal.write((int)anguloAtual);

  // Exibe informações de debug a cada 20ms (~50 atualizações/s)
  Serial.print("Inclinacao: ");
  Serial.print(anguloX, 1);
  Serial.print("° | Servo: ");
  Serial.print((int)anguloAtual);
  Serial.println("°");

  delay(20);  // Taxa de atualização: 50Hz
}`
    },
    {
      id:"c5-08", title:"Persiana Automatizada por Luz", difficulty:"Intermediário", time:"1h",
      description:"Persiana elétrica com servo contínuo: sobe automaticamente ao anoitecer e desce ao amanhecer.",
      connections:"Servo de rotação contínua→pino 9. LDR em divisor resistivo com 10kΩ→pino A0.",
      code:`// Projeto 8 — Persiana Automatizada por Luminosidade
// Servo Contínuo + LDR | DEVGENIUS V12
// A persiana se move automaticamente conforme a luz ambiente:
// NOITE (escuro) → persiana sobe (abre)
// DIA (claro) → persiana desce (fecha)

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objeto do servo de rotação contínua
Servo servoPersiana;

// Pinos do hardware
const int PINO_SERVO = 9;   // Sinal do servo contínuo
const int PINO_LDR   = A0;  // Sensor de luminosidade LDR

// Limiar de luminosidade: abaixo = escuro/noite
// Calibre esse valor para seu ambiente (0-1023)
const int LIMIAR_ESCURO = 300;

// Comandos para o servo contínuo:
// 90 = parado | < 90 = gira sentido A | > 90 = gira sentido B
const int SERVO_PARADO  = 90;   // Sem movimento
const int SERVO_SUBINDO = 70;   // Move para subir a persiana
const int SERVO_DESCENDO = 110; // Move para descer a persiana

// Tempo de movimento (ms) — ajuste para o comprimento da sua persiana
const unsigned long TEMPO_MOVIMENTO_MS = 3000;  // 3 segundos de movimento

// Estado atual da persiana
bool persianaAberta = true;  // Assume aberta ao iniciar

void setup() {
  servoPersiana.attach(PINO_SERVO);
  servoPersiana.write(SERVO_PARADO);  // Inicia parado
  Serial.begin(9600);
  Serial.println("Sistema de Persiana Automatica pronto!");
}

void loop() {
  int luminosidade = analogRead(PINO_LDR);  // Lê luminosidade (0=escuro, 1023=claro)
  bool estaEscuro  = (luminosidade < LIMIAR_ESCURO);  // Verifica se é noite

  // Exibe estado atual
  Serial.print("Luz: "); Serial.print(luminosidade);
  Serial.print(" | "); Serial.println(estaEscuro ? "NOITE" : "DIA");

  if (estaEscuro && !persianaAberta) {
    // É noite e persiana está fechada → abre (sobe)
    Serial.println("Noite detectada! Abrindo persiana...");
    servoPersiana.write(SERVO_SUBINDO);      // Gira para subir
    delay(TEMPO_MOVIMENTO_MS);               // Aguarda o tempo de subida
    servoPersiana.write(SERVO_PARADO);       // Para o servo
    persianaAberta = true;                    // Atualiza estado
    Serial.println("Persiana aberta.");

  } else if (!estaEscuro && persianaAberta) {
    // É dia e persiana está aberta → fecha (desce)
    Serial.println("Dia detectado! Fechando persiana...");
    servoPersiana.write(SERVO_DESCENDO);     // Gira para descer
    delay(TEMPO_MOVIMENTO_MS);               // Aguarda o tempo de descida
    servoPersiana.write(SERVO_PARADO);       // Para o servo
    persianaAberta = false;                   // Atualiza estado
    Serial.println("Persiana fechada.");
  }

  delay(5000);  // Verifica a cada 5 segundos
}`
    },
    {
      id:"c5-09", title:"Válvula de Fluxo Digital", difficulty:"Iniciante", time:"20 min",
      description:"Servo simula válvula de água: 0°=fechada, 90°=aberta. Controlada por botão físico e comandos Serial.",
      connections:"Servo (válvula)→pino 9 com fonte externa. Botão de acionamento→pino 2 (INPUT_PULLUP, outro terminal ao GND).",
      code:`// Projeto 9 — Válvula de Fluxo com Servo
// Servo Motor + Botão | DEVGENIUS V12
// O servo simula uma válvula de controle de fluxo.
// Controle via botão físico OU via Serial (A=abrir, F=fechar)

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objeto do servo (válvula)
Servo servoValvula;

// Pinos do hardware
const int PINO_SERVO = 9;   // Sinal do servo
const int PINO_BOTAO = 2;   // Botão de acionamento (INPUT_PULLUP)

// Ângulos da válvula
const int ANGULO_FECHADA = 0;    // Válvula fechada — fluxo bloqueado
const int ANGULO_ABERTA  = 90;   // Válvula aberta — fluxo liberado

// Estado atual da válvula
bool valvulaAberta = false;

// Funções para abrir e fechar a válvula
void abrirValvula() {
  servoValvula.write(ANGULO_ABERTA);  // Move para posição aberta
  valvulaAberta = true;
  Serial.println("VALVULA ABERTA — fluxo liberado");
}

void fecharValvula() {
  servoValvula.write(ANGULO_FECHADA);  // Move para posição fechada
  valvulaAberta = false;
  Serial.println("VALVULA FECHADA — fluxo bloqueado");
}

void setup() {
  servoValvula.attach(PINO_SERVO);    // Conecta servo
  fecharValvula();                     // Inicia com válvula fechada
  pinMode(PINO_BOTAO, INPUT_PULLUP);  // Botão com pull-up interno
  Serial.begin(9600);
  Serial.println("Controle de Valvula pronto!");
  Serial.println("Botao ou Serial: A=abrir F=fechar");
}

void loop() {
  // ── Controle por BOTÃO FÍSICO ────────────────────────────────────
  if (digitalRead(PINO_BOTAO) == LOW) {
    // Botão pressionado: alterna entre aberta e fechada
    if (valvulaAberta) {
      fecharValvula();
    } else {
      abrirValvula();
    }
    delay(300);  // Debounce: evita leituras duplas do botão
  }

  // ── Controle via SERIAL MONITOR ───────────────────────────────────
  if (Serial.available()) {
    char caractere = Serial.read();  // Lê um caractere do Serial

    if (caractere == 'A' || caractere == 'a') {
      abrirValvula();  // Abre a válvula
    }
    if (caractere == 'F' || caractere == 'f') {
      fecharValvula();  // Fecha a válvula
    }
  }
}`
    },
    {
      id:"c5-10", title:"Roleta Eletrônica Aleatória", difficulty:"Intermediário", time:"1h",
      description:"Pressione o botão para sortear uma posição aleatória com animação giratória e sons.",
      connections:"Servo→pino 9. Botão de sorteio→pino 2 (INPUT_PULLUP). Buzzer passivo→pino 11.",
      code:`// Projeto 10 — Roleta Eletrônica com Servo e Buzzer
// Servo Motor + Botão + Buzzer | DEVGENIUS V12
// Pressione o botão para girar a roleta e sortear uma posição aleatória!
// A animação de "girando" é acompanhada por sons crescentes.

#include <Servo.h>  // Biblioteca para controle de servo

// Cria objeto do servo
Servo servoRoleta;

// Pinos do hardware
const int PINO_SERVO  =  9;  // Sinal do servo
const int PINO_BOTAO  =  2;  // Botão de sorteio (INPUT_PULLUP)
const int PINO_BUZZER = 11;  // Buzzer passivo para sons

void setup() {
  servoRoleta.attach(PINO_SERVO);      // Conecta servo
  servoRoleta.write(0);                 // Posição inicial: 0°
  pinMode(PINO_BOTAO, INPUT_PULLUP);   // Botão com pull-up interno
  randomSeed(analogRead(A3));          // Semente aleatória (pino flutuante)
  Serial.begin(9600);
  Serial.println("=== Roleta Eletronica DevGenius ===");
  Serial.println("Pressione o botao para sortear!");
}

void loop() {
  // Aguarda pressionamento do botão
  if (digitalRead(PINO_BOTAO) == LOW) {

    Serial.println("Girando a roleta...");

    // ── Animação de "girando" ───────────────────────────────────
    // Gira para 5 posições aleatórias com sons acelerados
    for (int i = 0; i < 5; i++) {
      int posicaoAnimacao = random(0, 181);  // Posição aleatória de animação
      servoRoleta.write(posicaoAnimacao);    // Move o servo

      // Toca som com frequência crescente (simula aceleração)
      int frequencia = 500 + (i * 200);     // 500Hz → 1300Hz
      tone(PINO_BUZZER, frequencia, 100);   // Bip de 100ms

      delay(200 - (i * 20));  // Intervalo decrescente (fica mais rápido)
    }

    // ── Posição final sorteada ──────────────────────────────────
    int posicaoFinal = random(0, 181);  // Sorteia posição final (0° a 180°)
    servoRoleta.write(posicaoFinal);    // Move para posição sorteada

    // Som de vitória (dois bipes longos)
    noTone(PINO_BUZZER);
    tone(PINO_BUZZER, 1000, 300);  // Primeiro bipe
    delay(400);
    tone(PINO_BUZZER, 1200, 300);  // Segundo bipe mais agudo
    delay(400);
    noTone(PINO_BUZZER);

    // Exibe resultado no Serial Monitor
    Serial.print("Resultado sorteado: ");
    Serial.print(posicaoFinal);
    Serial.println("° — BOA SORTE!");

    delay(500);  // Pequena pausa antes de aceitar novo sorteio
  }
}`
    },
  ],
};

// ─── Generator Genérico (fallback para componentes sem projetos específicos) ──

function gerarCodigoGenerico(nome: string, proj: number): string {
  const templates: Record<number, string> = {
    1:
`// Projeto 1 — Leitura e Debug Básico
// Componente: ${nome} | DEVGENIUS V12
// Lê o sinal analógico do sensor e exibe via Serial Monitor

// Pino analógico onde o sensor está conectado
const int PINO_SENSOR = A0;

void setup() {
  Serial.begin(9600);  // Inicia comunicação Serial a 9600 baud
  Serial.println("${nome} iniciado — Monitor Serial ativo!");
}

void loop() {
  // Lê o valor bruto do ADC (0 a 1023 para Arduino Uno com 10 bits)
  int leituraBruta = analogRead(PINO_SENSOR);

  // Converte para tensão: 5V / 1023 ≈ 0,00489 V por unidade
  float tensaoV = leituraBruta * (5.0 / 1023.0);

  // Exibe os dados no Serial Monitor
  Serial.print("${nome} | ADC: ");
  Serial.print(leituraBruta);
  Serial.print(" | Tensao: ");
  Serial.print(tensaoV, 3);  // 3 casas decimais
  Serial.println(" V");

  delay(500);  // Aguarda 500ms antes da próxima leitura
}`,

    2:
`// Projeto 2 — Indicador LED por Nível
// Componente: ${nome} | DEVGENIUS V12
// LED acende quando o sensor ultrapassa o limiar definido

// Pino do sensor analógico
const int PINO_SENSOR = A0;

// Pino do LED indicador
const int PINO_LED = 13;

// Limiar: valor acima desse nível acende o LED (0 a 1023)
const int LIMIAR = 512;  // Aproximadamente metade da faixa

void setup() {
  pinMode(PINO_LED, OUTPUT);  // LED como saída
  Serial.begin(9600);          // Inicia comunicação Serial
  Serial.println("Indicador LED ativo!");
}

void loop() {
  int leitura = analogRead(PINO_SENSOR);  // Lê sensor

  // Acende LED se leitura ultrapassar o limiar
  if (leitura > LIMIAR) {
    digitalWrite(PINO_LED, HIGH);  // Acende o LED
    Serial.print("ATIVO | ");
  } else {
    digitalWrite(PINO_LED, LOW);   // Apaga o LED
    Serial.print("inativo | ");
  }

  // Exibe a leitura atual
  Serial.print("Valor: "); Serial.println(leitura);

  delay(200);  // Atualiza 5 vezes por segundo
}`,

    3:
`// Projeto 3 — Alerta Sonoro com Buzzer
// Componente: ${nome} | DEVGENIUS V12
// Buzzer emite alerta quando sensor detecta valor acima do limiar

// Pino do sensor analógico
const int PINO_SENSOR = A0;

// Pino do buzzer passivo
const int PINO_BUZZER = 11;

// Limiar de acionamento do alerta (0 a 1023)
const int LIMIAR_ALERTA = 700;

// Frequência do tom de alerta em Hertz
const int FREQ_ALERTA = 1000;

void setup() {
  Serial.begin(9600);  // Inicia comunicação Serial
  Serial.println("Sistema de alerta pronto!");
}

void loop() {
  int leitura = analogRead(PINO_SENSOR);  // Lê o sensor

  if (leitura > LIMIAR_ALERTA) {
    // ALERTA: valor acima do limite — aciona buzzer
    tone(PINO_BUZZER, FREQ_ALERTA, 200);  // Bip de 200ms
    Serial.print("!!! ALERTA !!! Valor: "); Serial.println(leitura);
  } else {
    noTone(PINO_BUZZER);  // Para o buzzer
    Serial.print("Normal | Valor: "); Serial.println(leitura);
  }

  delay(100);  // Verifica 10 vezes por segundo
}`,

    4:
`// Projeto 4 — Visualização em Display OLED
// Componente: ${nome} | DEVGENIUS V12
// Exibe leitura do sensor no display OLED SSD1306 128x64

#include <Wire.h>             // Biblioteca I2C para o OLED
#include <Adafruit_GFX.h>     // Biblioteca gráfica base
#include <Adafruit_SSD1306.h> // Driver do display OLED

// Cria objeto do display (128x64 pixels, sem pino de reset)
Adafruit_SSD1306 display(128, 64, &Wire, -1);

// Pino do sensor analógico
const int PINO_SENSOR = A0;

void setup() {
  // Inicializa o display OLED no endereço I2C 0x3C
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();     // Limpa o display
  display.setTextColor(WHITE); // Texto branco
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("${nome}");
  display.println("Iniciando...");
  display.display();          // Envia para o display
  delay(1000);
}

void loop() {
  int leitura = analogRead(PINO_SENSOR);  // Lê o sensor

  display.clearDisplay();      // Limpa o frame anterior
  display.setTextColor(WHITE);

  // Exibe o nome do sensor
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("${nome}");

  // Exibe o valor com fonte grande
  display.setTextSize(2);
  display.setCursor(0, 20);
  display.println(leitura);

  // Converte para porcentagem e exibe
  int pct = map(leitura, 0, 1023, 0, 100);
  display.setTextSize(1);
  display.setCursor(0, 50);
  display.print(pct); display.println("%");

  display.display();  // Envia buffer para o display
  delay(500);
}`,

    5:
`// Projeto 5 — Controle por Botão
// Componente: ${nome} | DEVGENIUS V12
// Botão alterna o estado ativo/inativo do sensor

// Pino do sensor analógico
const int PINO_SENSOR = A0;

// Pino do botão (usa resistor pull-up interno)
const int PINO_BOTAO = 2;

// Variável de estado: true = monitorando, false = pausado
bool monitorandoAtivo = false;

void setup() {
  pinMode(PINO_BOTAO, INPUT_PULLUP);  // Botão com pull-up interno
  Serial.begin(9600);
  Serial.println("Pressione o botao para iniciar o monitoramento!");
}

void loop() {
  // Detecta pressionamento do botão (LOW com INPUT_PULLUP = pressionado)
  if (digitalRead(PINO_BOTAO) == LOW) {
    monitorandoAtivo = !monitorandoAtivo;  // Alterna o estado

    if (monitorandoAtivo) {
      Serial.println(">>> ${nome} MONITORANDO <<<");
    } else {
      Serial.println(">>> ${nome} PAUSADO <<<");
    }

    delay(300);  // Debounce: evita leituras duplas
  }

  // Exibe leitura apenas quando ativo
  if (monitorandoAtivo) {
    int leitura = analogRead(PINO_SENSOR);
    Serial.print("Valor: "); Serial.println(leitura);
    delay(500);
  }
}`,

    6:
`// Projeto 6 — Logger de Dados em CSV
// Componente: ${nome} | DEVGENIUS V12
// Registra leituras com timestamp em formato CSV para análise posterior
// Abra o Serial Monitor (9600 baud) e copie para um arquivo .csv

// Pino do sensor
const int PINO_SENSOR = A0;

// Intervalo entre registros em milissegundos
const unsigned long INTERVALO_MS = 1000;  // 1 registro por segundo

unsigned long ultimoRegistro = 0;  // Controle de tempo
int numeroRegistro = 0;             // Contador de registros

void setup() {
  Serial.begin(9600);  // Inicia comunicação Serial
  // Imprime o cabeçalho CSV
  Serial.println("registro,timestamp_ms,valor_bruto,tensao_V");
}

void loop() {
  // Verifica se já passou o intervalo
  if (millis() - ultimoRegistro >= INTERVALO_MS) {
    ultimoRegistro = millis();  // Atualiza o timer
    numeroRegistro++;            // Incrementa o contador

    int leitura = analogRead(PINO_SENSOR);      // Valor bruto (0-1023)
    float tensao = leitura * 5.0 / 1023.0;     // Converte para Volts

    // Imprime linha no formato CSV: número,tempo,valor,tensao
    Serial.print(numeroRegistro);
    Serial.print(",");
    Serial.print(millis());         // Timestamp em ms
    Serial.print(",");
    Serial.print(leitura);          // Valor bruto do ADC
    Serial.print(",");
    Serial.println(tensao, 3);      // Tensão com 3 decimais
  }
}`,

    7:
`// Projeto 7 — Armazenamento em EEPROM
// Componente: ${nome} | DEVGENIUS V12
// Salva leituras do sensor na EEPROM interna do Arduino
// Os dados persistem mesmo após desligar o equipamento

#include <EEPROM.h>  // Biblioteca para acesso à EEPROM interna

// Pino do sensor
const int PINO_SENSOR = A0;

// Endereço atual de escrita na EEPROM
int enderecoAtual = 0;

// EEPROM do Arduino Uno tem 1024 bytes (endereços 0 a 1023)
const int TAMANHO_EEPROM = 512;  // Usamos apenas metade por segurança

void setup() {
  Serial.begin(9600);
  Serial.println("=== ${nome} + EEPROM ===");
  Serial.println("Lendo historico salvo:");

  // Exibe os valores previamente salvos na EEPROM
  for (int i = 0; i < TAMANHO_EEPROM; i++) {
    int valorSalvo = EEPROM.read(i);  // Lê byte da EEPROM
    if (valorSalvo != 255) {           // 255 = célula vazia (padrão de fábrica)
      Serial.print("EEPROM["); Serial.print(i);
      Serial.print("] = "); Serial.println(valorSalvo);
    }
  }
}

void loop() {
  // Lê o sensor e converte de 10 bits para 8 bits (0-255)
  // >> 2 divide por 4 (deslocamento de 2 bits)
  int valorBruto = analogRead(PINO_SENSOR);
  int valor8bits = valorBruto >> 2;  // 0-1023 → 0-255

  // Salva na EEPROM no endereço atual
  EEPROM.write(enderecoAtual, valor8bits);

  Serial.print("Salvo em EEPROM[");
  Serial.print(enderecoAtual);
  Serial.print("] = ");
  Serial.println(valor8bits);

  // Avança para o próximo endereço (volta ao 0 quando chega ao limite)
  enderecoAtual = (enderecoAtual + 1) % TAMANHO_EEPROM;

  delay(2000);  // Salva a cada 2 segundos
}`,

    8:
`// Projeto 8 — Telemetria WiFi para IoT
// Componente: ${nome} | ESP32 | DEVGENIUS V12
// Envia leituras do sensor para um servidor via WiFi a cada 10 segundos

#include <WiFi.h>       // Biblioteca WiFi do ESP32
#include <HTTPClient.h>  // Biblioteca para requisições HTTP

// ══ CONFIGURE AQUI ════════════════════════════════
const char* WIFI_SSID = "NOME_DA_SUA_REDE";   // Nome da rede WiFi
const char* WIFI_PASS = "SENHA_DA_REDE";        // Senha da rede
const char* SERVER_URL = "http://api.servidor.com/sensor"; // URL do servidor
// ═══════════════════════════════════════════════════

// No ESP32, pinos analógicos seguros: 34, 35, 36, 39
const int PINO_SENSOR = 34;

// Intervalo entre envios (10 segundos)
const unsigned long INTERVALO_MS = 10000;
unsigned long ultimoEnvio = 0;

void setup() {
  Serial.begin(115200);  // ESP32 usa 115200 baud

  // Conecta ao WiFi
  Serial.print("Conectando ao WiFi: "); Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi conectado! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (millis() - ultimoEnvio < INTERVALO_MS) return;
  ultimoEnvio = millis();

  int leitura = analogRead(PINO_SENSOR);  // Lê sensor (0-4095 no ESP32)

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(SERVER_URL) + "?sensor=${nome}&valor=" + leitura;
    http.begin(url);
    int codigoHTTP = http.GET();  // Envia a requisição

    Serial.print("Enviado: "); Serial.print(leitura);
    Serial.print(" | HTTP: "); Serial.println(codigoHTTP);
    http.end();
  } else {
    Serial.println("WiFi desconectado! Tentando reconectar...");
    WiFi.reconnect();
  }
}`,

    9:
`// Projeto 9 — Dashboard MQTT em Tempo Real
// Componente: ${nome} | ESP32 | DEVGENIUS V12
// Publica leituras no broker MQTT público HiveMQ a cada 5 segundos
// Visualize em qualquer cliente MQTT (ex: MQTT Explorer, Node-RED)

#include <WiFi.h>         // Biblioteca WiFi do ESP32
#include <PubSubClient.h>  // Biblioteca cliente MQTT

// ══ CONFIGURE AQUI ════════════════════════════════
const char* WIFI_SSID = "NOME_DA_SUA_REDE";   // Nome da rede WiFi
const char* WIFI_PASS = "SENHA_DA_REDE";        // Senha da rede
// ═══════════════════════════════════════════════════

// Configuração do broker MQTT (público, sem senha)
const char* MQTT_HOST   = "broker.hivemq.com";  // Broker gratuito
const int   MQTT_PORT   = 1883;                   // Porta padrão MQTT
const char* MQTT_TOPICO = "devgenius/${nome}";   // Tópico de publicação

// Pino do sensor (ESP32 usa pinos ADC1: 32-39)
const int PINO_SENSOR = 34;

WiFiClient   clienteWifi;
PubSubClient mqtt(clienteWifi);

void conectarMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Conectando ao MQTT...");
    if (mqtt.connect("ESP32_DevGenius")) {
      Serial.println("conectado!");
    } else {
      Serial.print("Falhou (rc="); Serial.print(mqtt.state());
      Serial.println(") tentando de novo em 2s...");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nWiFi OK: " + WiFi.localIP().toString());
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
}

void loop() {
  if (!mqtt.connected()) conectarMQTT();  // Reconecta se necessário
  mqtt.loop();  // Mantém a conexão MQTT ativa

  int leitura = analogRead(PINO_SENSOR);  // Lê sensor

  // Publica o valor no tópico MQTT
  String payload = String(leitura);
  mqtt.publish(MQTT_TOPICO, payload.c_str());

  Serial.print("Publicado em ["); Serial.print(MQTT_TOPICO);
  Serial.print("]: "); Serial.println(leitura);

  delay(5000);  // Publica a cada 5 segundos
}`,

    10:
`// Projeto 10 — Sistema Autônomo Completo
// Componente: ${nome} | DEVGENIUS V12
// Sistema completo com: sensor, display OLED, LED, botão e logger
// Dois modos: Modo A = monitoramento | Modo B = histórico

#include <Wire.h>             // Biblioteca I2C
#include <Adafruit_GFX.h>     // Gráficos base
#include <Adafruit_SSD1306.h> // Driver OLED

// Display OLED 128x64 pixels
Adafruit_SSD1306 display(128, 64, &Wire, -1);

// Pinos do hardware
const int PINO_SENSOR = A0;   // Sensor analógico
const int PINO_BOTAO  =  2;   // Botão de alternância de modo
const int PINO_LED    = 13;   // LED indicador de alerta

// Limiar para acionar o LED de alerta
const int LIMIAR_ALERTA = 700;

// Controle de modo
int modoAtual = 0;  // 0 = monitoramento atual | 1 = histórico

// Histórico das últimas 5 leituras
int historico[5] = {0, 0, 0, 0, 0};
int indiceHistorico = 0;

void setup() {
  // Configura periféricos
  pinMode(PINO_BOTAO, INPUT_PULLUP);  // Botão com pull-up
  pinMode(PINO_LED,   OUTPUT);         // LED de alerta

  // Inicializa display OLED
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  Serial.begin(9600);
  Serial.println("Sistema ${nome} iniciado!");
}

void loop() {
  // Detecta toque no botão para alternar modo
  if (digitalRead(PINO_BOTAO) == LOW) {
    modoAtual = (modoAtual + 1) % 2;  // Alterna entre 0 e 1
    delay(200);  // Debounce
  }

  // Lê o sensor
  int leitura = analogRead(PINO_SENSOR);

  // Salva no histórico (buffer circular)
  historico[indiceHistorico] = leitura;
  indiceHistorico = (indiceHistorico + 1) % 5;

  // Controla LED de alerta
  digitalWrite(PINO_LED, leitura > LIMIAR_ALERTA ? HIGH : LOW);

  // Atualiza display
  display.clearDisplay();
  display.setTextColor(WHITE);

  if (modoAtual == 0) {
    // MODO A: exibe leitura atual
    display.setTextSize(1); display.setCursor(0, 0);
    display.println("${nome}");
    display.setTextSize(2); display.setCursor(0, 12);
    display.println(leitura);
    display.setTextSize(1); display.setCursor(0, 50);
    display.println(leitura > LIMIAR_ALERTA ? "! ALERTA !" : "Normal");
  } else {
    // MODO B: exibe histórico
    display.setTextSize(1); display.setCursor(0, 0);
    display.println("Historico:");
    for (int i = 0; i < 5; i++) {
      display.setCursor(0, 10 + i * 10);
      display.print(i + 1); display.print(":"); display.println(historico[i]);
    }
  }

  display.display();  // Atualiza display

  // Log Serial
  Serial.print("Modo:"); Serial.print(modoAtual);
  Serial.print(" Val:"); Serial.println(leitura);

  delay(300);
}`
  };
  return templates[proj] || `// Projeto ${proj} — ${nome}\n// DEVGENIUS V12\nvoid setup() { Serial.begin(9600); }\nvoid loop() { delay(1000); }`;
}

function gerarProjetosGenericos(item: { id: string; nome: string; tipo: string }): ComponentProject[] {
  const titulos = [
    "Leitura e Debug Básico",
    "Indicador LED por Nível",
    "Alerta Sonoro com Buzzer",
    "Visualização em OLED",
    "Controle por Botão",
    "Logger CSV via Serial",
    "Salvar Dados em EEPROM",
    "Telemetria WiFi (ESP32)",
    "Dashboard MQTT",
    "Sistema Autônomo Completo",
  ];
  const dificuldades: Array<"Iniciante"|"Intermediário"|"Avançado"> = [
    "Iniciante","Iniciante","Iniciante","Intermediário","Iniciante",
    "Intermediário","Intermediário","Avançado","Avançado","Avançado",
  ];
  const tempos = ["15 min","20 min","20 min","30 min","25 min","30 min","45 min","1h","1h","2h"];
  const descs = [
    `Leitura básica do ${item.nome} com exibição de dados via Monitor Serial.`,
    `LED indicador muda de estado conforme leitura do ${item.nome}.`,
    `Buzzer emite alerta quando valor do ${item.nome} ultrapassa limiar.`,
    `Exibe dados do ${item.nome} em tempo real no display OLED 128x64.`,
    `Botão habilita/desabilita leitura do ${item.nome} interativamente.`,
    `Registra leituras do ${item.nome} em formato CSV via Serial.`,
    `Persiste último valor lido do ${item.nome} na EEPROM interna.`,
    `Envia dados do ${item.nome} para servidor via WiFi (ESP32).`,
    `Publica leituras do ${item.nome} em broker MQTT para IoT.`,
    `Sistema completo com ${item.nome}, display, botão, LED e logging.`,
  ];
  const conex = [
    `${item.nome}: consulte datasheet para pinagem. VCC→5V/3.3V, GND→GND, sinal→A0 ou pino digital.`,
  ];

  return Array.from({ length: 10 }, (_, i) => ({
    id:          `${item.id}-${String(i+1).padStart(2,"0")}`,
    title:       titulos[i],
    difficulty:  dificuldades[i],
    time:        tempos[i],
    description: descs[i],
    connections: conex[0],
    code:        gerarCodigoGenerico(item.nome, i + 1),
  }));
}

export function getProjectsForComponent(item: { id: string; nome: string; tipo: string }): ComponentProject[] {
  return PROJECTS_MAP[item.id] ?? gerarProjetosGenericos(item);
}
