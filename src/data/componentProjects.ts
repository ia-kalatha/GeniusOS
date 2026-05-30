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
    { id:"c4-01", title:"Monitor Básico Serial", difficulty:"Iniciante", time:"15 min",
      description:"Lê temperatura e umidade a cada 2 segundos e exibe no Monitor Serial.",
      connections:"VCC→5V, GND→GND, DATA→pino 4, resistor 4.7kΩ entre VCC e DATA.",
      code:`// DHT22 — Monitor Serial Básico
#include <DHT.h>
DHT dht(4, DHT22);
void setup() { Serial.begin(9600); dht.begin(); }
void loop() {
  float t = dht.readTemperature(), u = dht.readHumidity();
  if (!isnan(t)) {
    Serial.printf("Temp: %.1f°C | Umid: %.1f%%\\n", t, u);
  } else { Serial.println("Erro na leitura!"); }
  delay(2000);
}` },
    { id:"c4-02", title:"Alerta LED por Temperatura", difficulty:"Iniciante", time:"20 min",
      description:"LED verde abaixo de 25°C, amarelo entre 25-35°C, vermelho acima de 35°C.",
      connections:"DHT22→pino 4. LED verde→pino 10, amarelo→pino 9, vermelho→pino 8 (220Ω cada).",
      code:`#include <DHT.h>
DHT dht(4, DHT22);
const int G=10, Y=9, R=8;
void setup() { dht.begin(); pinMode(G,OUTPUT); pinMode(Y,OUTPUT); pinMode(R,OUTPUT); }
void loop() {
  float t = dht.readTemperature();
  if (isnan(t)) { delay(2000); return; }
  digitalWrite(G, t < 25);
  digitalWrite(Y, t >= 25 && t < 35);
  digitalWrite(R, t >= 35);
  delay(2000);
}` },
    { id:"c4-03", title:"Display OLED Clima", difficulty:"Intermediário", time:"30 min",
      description:"Exibe temperatura e umidade em OLED 128x64 com barra de progresso de umidade.",
      connections:"DHT22→pino 4. OLED SSD1306: SDA→A4, SCL→A5, VCC→3.3V.",
      code:`#include <DHT.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>
DHT dht(4, DHT22);
Adafruit_SSD1306 disp(128, 64, &Wire, -1);
void setup() { dht.begin(); disp.begin(SSD1306_SWITCHCAPVCC, 0x3C); }
void loop() {
  float t = dht.readTemperature(), u = dht.readHumidity();
  disp.clearDisplay(); disp.setTextColor(WHITE);
  disp.setTextSize(2); disp.setCursor(0,0);
  disp.print("T:"); disp.print(t,1); disp.println("C");
  disp.print("U:"); disp.print(u,1); disp.println("%");
  int bar = map(u, 0, 100, 0, 127);
  disp.fillRect(0, 50, bar, 10, WHITE);
  disp.display(); delay(2000);
}` },
    { id:"c4-04", title:"Logger com Marca de Tempo", difficulty:"Intermediário", time:"45 min",
      description:"Registra leituras com timestamp em millis() e conta alertas de temperatura alta.",
      connections:"DHT22→pino 4.",
      code:`#include <DHT.h>
DHT dht(4, DHT22);
int alertas = 0;
void setup() { Serial.begin(9600); dht.begin(); Serial.println("ts_ms,temp,umid,alerta"); }
void loop() {
  float t = dht.readTemperature(), u = dht.readHumidity();
  if (!isnan(t)) {
    bool al = t > 30;
    if (al) alertas++;
    Serial.printf("%lu,%.1f,%.1f,%d\\n", millis(), t, u, (int)al);
  }
  delay(5000);
}` },
    { id:"c4-05", title:"Controle Climatizador", difficulty:"Intermediário", time:"1h",
      description:"Liga ventilador (via relé) quando temp > 28°C e umidificador quando umid < 40%.",
      connections:"DHT22→pino 4. Relé ventilador→pino 12. Relé umidificador→pino 11.",
      code:`#include <DHT.h>
DHT dht(4, DHT22);
const int VENT=12, UMID=11;
void setup() { dht.begin(); pinMode(VENT,OUTPUT); pinMode(UMID,OUTPUT); Serial.begin(9600); }
void loop() {
  float t = dht.readTemperature(), u = dht.readHumidity();
  if (isnan(t)) { delay(2000); return; }
  digitalWrite(VENT, t > 28.0 ? LOW : HIGH);   // relé ativo LOW
  digitalWrite(UMID, u < 40.0 ? LOW : HIGH);
  Serial.printf("T=%.1f°C U=%.1f%% VENT=%s UMID=%s\\n",
    t, u, t>28?"ON":"off", u<40?"ON":"off");
  delay(2000);
}` },
    { id:"c4-06", title:"Índice de Conforto Térmico", difficulty:"Intermediário", time:"40 min",
      description:"Calcula o Heat Index (sensação térmica real) e classifica o conforto em 5 níveis.",
      connections:"DHT22→pino 4.",
      code:`#include <DHT.h>
DHT dht(4, DHT22);
String conforto(float hi) {
  if (hi < 27) return "CONFORTAVEL";
  if (hi < 32) return "CAUTELA";
  if (hi < 40) return "CAUTELA EXTREMA";
  if (hi < 54) return "PERIGO";
  return "PERIGO EXTREMO";
}
void setup() { Serial.begin(9600); dht.begin(); }
void loop() {
  float t = dht.readTemperature(), u = dht.readHumidity();
  if (isnan(t)) { delay(2000); return; }
  float hi = dht.computeHeatIndex(t, u, false);
  Serial.printf("T=%.1f U=%.1f%% HI=%.1f -> %s\\n", t, u, hi, conforto(hi).c_str());
  delay(3000);
}` },
    { id:"c4-07", title:"Envio WiFi ThingSpeak", difficulty:"Avançado", time:"1h",
      description:"Envia temperatura e umidade para ThingSpeak a cada 15 segundos via ESP8266/ESP32.",
      connections:"DHT22→pino 4 do ESP32. WiFi integrado.",
      code:`// Para ESP32
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
DHT dht(4, DHT22);
const char* SSID="SUA_REDE", *PASS="SUA_SENHA";
const char* API_KEY = "SUA_KEY_THINGSPEAK";
void setup() {
  Serial.begin(115200); dht.begin();
  WiFi.begin(SSID, PASS);
  while (WiFi.status()!=WL_CONNECTED) delay(500);
  Serial.println("WiFi OK");
}
void loop() {
  float t = dht.readTemperature(), u = dht.readHumidity();
  if (!isnan(t)) {
    HTTPClient h;
    String url = String("http://api.thingspeak.com/update?api_key=") + API_KEY
               + "&field1=" + t + "&field2=" + u;
    h.begin(url); int code = h.GET();
    Serial.printf("T=%.1f U=%.1f -> HTTP %d\\n", t, u, code);
    h.end();
  }
  delay(15000);
}` },
    { id:"c4-08", title:"Gráfico Serial Plotter", difficulty:"Iniciante", time:"15 min",
      description:"Formata saída para o Serial Plotter da IDE Arduino exibir gráfico em tempo real.",
      connections:"DHT22→pino 4.",
      code:`#include <DHT.h>
DHT dht(4, DHT22);
void setup() { Serial.begin(9600); dht.begin(); Serial.println("Temperatura\tUmidade"); }
void loop() {
  float t = dht.readTemperature(), u = dht.readHumidity();
  if (!isnan(t)) { Serial.print(t); Serial.print("\t"); Serial.println(u); }
  delay(500);
}` },
    { id:"c4-09", title:"Alarme de Geada", difficulty:"Intermediário", time:"30 min",
      description:"Aciona buzzer e LED vermelho se temperatura cair abaixo de 5°C (proteção de plantas).",
      connections:"DHT22→pino 4. Buzzer passivo→pino 11. LED vermelho→pino 8 (220Ω).",
      code:`#include <DHT.h>
DHT dht(4, DHT22);
const int BUZZ=11, LED=8;
const float LIMIAR = 5.0;
void setup() { dht.begin(); pinMode(BUZZ,OUTPUT); pinMode(LED,OUTPUT); Serial.begin(9600); }
void loop() {
  float t = dht.readTemperature();
  if (isnan(t)) { delay(2000); return; }
  if (t < LIMIAR) {
    tone(BUZZ, 880, 500); digitalWrite(LED, HIGH);
    Serial.println("ALERTA DE GEADA! T=" + String(t,1));
  } else {
    noTone(BUZZ); digitalWrite(LED, LOW);
  }
  delay(2000);
}` },
    { id:"c4-10", title:"Estação Climática Completa", difficulty:"Avançado", time:"2h",
      description:"DHT22 + OLED + botão de modo + histórico das últimas 10 leituras em RAM.",
      connections:"DHT22→pino 4. OLED I2C: SDA→A4, SCL→A5. Botão modo→pino 2 (INPUT_PULLUP).",
      code:`#include <DHT.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>
DHT dht(4, DHT22);
Adafruit_SSD1306 disp(128,64,&Wire,-1);
const int BTN=2;
int modo=0; // 0=atual 1=historico
struct Dado { float t,u; };
Dado historico[10]; int idx=0, total=0;
void salvar(float t, float u) { historico[idx]={t,u}; idx=(idx+1)%10; if(total<10)total++; }
void setup() {
  dht.begin(); pinMode(BTN,INPUT_PULLUP);
  disp.begin(SSD1306_SWITCHCAPVCC,0x3C);
  Serial.begin(9600);
}
void loop() {
  if (!digitalRead(BTN)) { modo=(modo+1)%2; delay(200); }
  float t=dht.readTemperature(), u=dht.readHumidity();
  if (!isnan(t)) { salvar(t,u); }
  disp.clearDisplay(); disp.setTextColor(WHITE); disp.setTextSize(1);
  if (modo==0) {
    disp.setTextSize(2); disp.setCursor(0,0); disp.print(t,1); disp.println("C");
    disp.print(u,1); disp.println("%");
  } else {
    disp.setCursor(0,0); disp.println("HISTORICO:");
    for(int i=0;i<min(total,5);i++){
      int p=(idx-total+i+10)%10;
      disp.printf("%.0f %.0f%%\\n",historico[p].t,historico[p].u);
    }
  }
  disp.display(); delay(2000);
}` },
  ],

  // ── HC-SR04 Ultrassônico ─────────────────────────────────────────────────
  c2: [
    { id:"c2-01", title:"Medidor de Distância Serial", difficulty:"Iniciante", time:"15 min",
      description:"Mede distância e exibe em cm e polegadas via Serial.",
      connections:"VCC→5V, GND→GND, Trig→pino 9, Echo→pino 10.",
      code:`const int TRIG=9, ECHO=10;
float medirCm() {
  digitalWrite(TRIG,LOW); delayMicroseconds(2);
  digitalWrite(TRIG,HIGH); delayMicroseconds(10); digitalWrite(TRIG,LOW);
  return pulseIn(ECHO,HIGH,30000) * 0.034 / 2.0;
}
void setup() { Serial.begin(9600); pinMode(TRIG,OUTPUT); pinMode(ECHO,INPUT); }
void loop() {
  float cm = medirCm(), pol = cm / 2.54;
  Serial.printf("%.1f cm | %.1f in\\n", cm, pol);
  delay(300);
}` },
    { id:"c2-02", title:"Régua Eletrônica com OLED", difficulty:"Intermediário", time:"30 min",
      description:"Exibe distância em barra gráfica no OLED SSD1306.",
      connections:"HC-SR04: Trig→9, Echo→10. OLED: SDA→A4, SCL→A5.",
      code:`#include <Wire.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 d(128,64,&Wire,-1);
const int TR=9,EC=10;
float medir(){ digitalWrite(TR,LOW); delayMicroseconds(2); digitalWrite(TR,HIGH);
  delayMicroseconds(10); digitalWrite(TR,LOW); return pulseIn(EC,HIGH,30000)*0.034/2.0; }
void setup(){ pinMode(TR,OUTPUT); pinMode(EC,INPUT); d.begin(SSD1306_SWITCHCAPVCC,0x3C); }
void loop(){
  float cm=medir(); int barra=constrain(map(cm,2,200,0,127),0,127);
  d.clearDisplay(); d.setTextColor(WHITE); d.setTextSize(2);
  d.setCursor(0,0); d.print(cm,1); d.println(" cm");
  d.fillRect(0,40,barra,20,WHITE); d.display(); delay(200);
}` },
    { id:"c2-03", title:"Sensor de Estacionamento", difficulty:"Iniciante", time:"20 min",
      description:"Emite beeps proporcionais à proximidade de um objeto, como sensor de ré de carro.",
      connections:"HC-SR04: Trig→9, Echo→10. Buzzer passivo→pino 11.",
      code:`const int TR=9,EC=10,BZ=11;
float medir(){ digitalWrite(TR,LOW);delayMicroseconds(2);digitalWrite(TR,HIGH);
  delayMicroseconds(10);digitalWrite(TR,LOW);return pulseIn(EC,HIGH,30000)*0.034/2.0; }
void setup(){ pinMode(TR,OUTPUT);pinMode(EC,INPUT);Serial.begin(9600); }
void loop(){
  float d=medir();
  if(d>200||d<2){noTone(BZ);delay(300);return;}
  int intervalo=map(constrain(d,2,100),2,100,100,1000);
  tone(BZ,2000,50); delay(intervalo);
  Serial.printf("%.1f cm | beep a cada %dms\\n",d,intervalo);
}` },
    { id:"c2-04", title:"Nível de Caixa d'Água", difficulty:"Intermediário", time:"30 min",
      description:"Mede nível de líquido em caixa d'água e exibe porcentagem + alerta de nível baixo.",
      connections:"HC-SR04 instalado no topo da caixa: Trig→9, Echo→10. LED vermelho→pino 13.",
      code:`const int TR=9,EC=10,LED=13;
const float CAIXA_CM=150.0; // altura total da caixa
float medir(){ digitalWrite(TR,LOW);delayMicroseconds(2);
  digitalWrite(TR,HIGH);delayMicroseconds(10);digitalWrite(TR,LOW);
  return pulseIn(EC,HIGH,30000)*0.034/2.0; }
void setup(){ pinMode(TR,OUTPUT);pinMode(EC,INPUT);pinMode(LED,OUTPUT);Serial.begin(9600); }
void loop(){
  float dist=medir();
  float nivel=constrain(CAIXA_CM-dist,0,CAIXA_CM);
  int pct=map(nivel,0,CAIXA_CM,0,100);
  bool baixo=(pct<20);
  digitalWrite(LED,baixo);
  Serial.printf("Nivel: %dcm (%d%%) %s\\n",(int)nivel,pct,baixo?"BAIXO!":"OK");
  delay(1000);
}` },
    { id:"c2-05", title:"Radar de Obstáculos 180°", difficulty:"Avançado", time:"1h 30min",
      description:"HC-SR04 acoplado a servo varre 180° e imprime mapa de distâncias no Serial.",
      connections:"HC-SR04: Trig→9, Echo→10. Servo: sinal→pino 6, VCC→5V externo.",
      code:`#include <Servo.h>
Servo sv; const int TR=9,EC=10;
float medir(){ digitalWrite(TR,LOW);delayMicroseconds(2);
  digitalWrite(TR,HIGH);delayMicroseconds(10);digitalWrite(TR,LOW);
  return pulseIn(EC,HIGH,30000)*0.034/2.0; }
void setup(){ sv.attach(6); pinMode(TR,OUTPUT); pinMode(EC,INPUT); Serial.begin(115200); }
void loop(){
  Serial.println("=== RADAR ===");
  for(int a=0;a<=180;a+=5){
    sv.write(a); delay(80);
    float d=medir();
    Serial.printf("%3d° : %.0fcm ", a, d);
    for(int i=0;i<constrain(d/5,0,30);i++) Serial.print('#');
    Serial.println();
  }
  delay(500);
}` },
    { id:"c2-06", title:"Medidor de Velocidade", difficulty:"Avançado", time:"1h",
      description:"Dois HC-SR04 separados medem o tempo de passagem de um objeto e calculam velocidade.",
      connections:"Sensor 1: Trig→6, Echo→7. Sensor 2: Trig→8, Echo→9. Separação medida e configurada no código.",
      code:`const int TR1=6,EC1=7,TR2=8,EC2=9;
const float DISTANCIA_M=0.20; // 20cm entre sensores
float medir(int tr,int ec){
  digitalWrite(tr,LOW);delayMicroseconds(2);
  digitalWrite(tr,HIGH);delayMicroseconds(10);digitalWrite(tr,LOW);
  return pulseIn(ec,HIGH,30000)*0.034/2.0;
}
void setup(){ Serial.begin(9600);
  int pins[]={TR1,TR2}; for(auto p:pins) pinMode(p,OUTPUT);
  pinMode(EC1,INPUT); pinMode(EC2,INPUT); }
void loop(){
  float d1=medir(TR1,EC1);
  if(d1>2 && d1<10){ // objeto detectado pelo sensor 1
    unsigned long t1=millis();
    Serial.println("Objeto detectado pelo sensor 1...");
    while(medir(TR2,EC2)>10); // aguarda sensor 2
    float dt=(millis()-t1)/1000.0;
    float vel=DISTANCIA_M/dt;
    Serial.printf("Velocidade: %.2f m/s = %.1f km/h\\n",vel,vel*3.6);
    delay(1000);
  }
  delay(50);
}` },
    { id:"c2-07", title:"Piano Laser (Teclado Sem Toque)", difficulty:"Avançado", time:"2h",
      description:"5 HC-SR04 formam um piano virtual — agitar a mão em frente toca notas no buzzer.",
      connections:"5 pares Trig/Echo nos pinos 2-11. Buzzer passivo→pino 12.",
      code:`const int TRIG[]={2,4,6,8,10}, ECHO[]={3,5,7,9,11};
const int NOTAS[]={262,294,330,349,392}; // Do Re Mi Fa Sol
const int BUZZ=12;
float medir(int i){
  digitalWrite(TRIG[i],LOW); delayMicroseconds(2);
  digitalWrite(TRIG[i],HIGH); delayMicroseconds(10); digitalWrite(TRIG[i],LOW);
  return pulseIn(ECHO[i],HIGH,20000)*0.034/2.0;
}
void setup(){
  for(int i=0;i<5;i++){pinMode(TRIG[i],OUTPUT);pinMode(ECHO[i],INPUT);}
  Serial.begin(9600); Serial.println("Piano Laser DEVGENIUS");
}
void loop(){
  bool tocando=false;
  for(int i=0;i<5;i++){
    float d=medir(i);
    if(d>2 && d<15){ tone(BUZZ,NOTAS[i]); Serial.printf("Nota %d\\n",i); tocando=true; break; }
  }
  if(!tocando) noTone(BUZZ);
  delay(50);
}` },
    { id:"c2-08", title:"Portão Automático", difficulty:"Intermediário", time:"45 min",
      description:"Detecta veículo em 50cm e abre servo-portão automaticamente.",
      connections:"HC-SR04: Trig→9, Echo→10. Servo (portão): pino 6.",
      code:`#include <Servo.h>
Servo portao; const int TR=9,EC=10;
bool aberto=false;
float medir(){
  digitalWrite(TR,LOW);delayMicroseconds(2);
  digitalWrite(TR,HIGH);delayMicroseconds(10);digitalWrite(TR,LOW);
  return pulseIn(EC,HIGH,30000)*0.034/2.0;
}
void setup(){ portao.attach(6); portao.write(0); pinMode(TR,OUTPUT); pinMode(EC,INPUT); Serial.begin(9600); }
void loop(){
  float d=medir(); Serial.printf("%.1f cm\\n",d);
  if(d<50 && !aberto){
    portao.write(90); aberto=true; Serial.println("PORTAO ABERTO");
    delay(5000); portao.write(0); aberto=false; Serial.println("PORTAO FECHADO");
  }
  delay(200);
}` },
    { id:"c2-09", title:"Boia de Nível com LCD", difficulty:"Intermediário", time:"40 min",
      description:"Exibe nível em percentual e barra gráfica no LCD 16x2 via I2C.",
      connections:"HC-SR04: Trig→9, Echo→10. LCD I2C: SDA→A4, SCL→A5.",
      code:`#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(0x27,16,2);
const int TR=9,EC=10;
const float MAX_DIST=100.0;
float medir(){
  digitalWrite(TR,LOW);delayMicroseconds(2);
  digitalWrite(TR,HIGH);delayMicroseconds(10);digitalWrite(TR,LOW);
  return pulseIn(EC,HIGH,30000)*0.034/2.0;
}
void setup(){ lcd.init();lcd.backlight();pinMode(TR,OUTPUT);pinMode(EC,INPUT); }
void loop(){
  float d=medir();
  int pct=100-constrain(map(d,0,MAX_DIST,0,100),0,100);
  lcd.setCursor(0,0); lcd.printf("Nivel: %3d%%    ",pct);
  lcd.setCursor(0,1);
  int barras=map(pct,0,100,0,16);
  for(int i=0;i<16;i++) lcd.print(i<barras?"\xFF":" ");
  delay(500);
}` },
    { id:"c2-10", title:"Robô Desvio de Obstáculos", difficulty:"Avançado", time:"3h",
      description:"Robô móvel com 2 motores que desvia automaticamente usando HC-SR04 frontal.",
      connections:"HC-SR04: Trig→9, Echo→10. Motor esq: IN1→4, IN2→5, EN→6. Motor dir: IN3→7, IN4→8, EN→3.",
      code:`const int TR=9,EC=10;
const int M1A=4,M1B=5,M1E=6,M2A=7,M2B=8,M2E=3;
float medir(){
  digitalWrite(TR,LOW);delayMicroseconds(2);
  digitalWrite(TR,HIGH);delayMicroseconds(10);digitalWrite(TR,LOW);
  return pulseIn(EC,HIGH,30000)*0.034/2.0;
}
void frente(int v){
  digitalWrite(M1A,HIGH);digitalWrite(M1B,LOW);analogWrite(M1E,v);
  digitalWrite(M2A,HIGH);digitalWrite(M2B,LOW);analogWrite(M2E,v);
}
void direita(int v){
  digitalWrite(M1A,HIGH);digitalWrite(M1B,LOW);analogWrite(M1E,v);
  digitalWrite(M2A,LOW);digitalWrite(M2B,HIGH);analogWrite(M2E,v);
}
void parar(){ analogWrite(M1E,0); analogWrite(M2E,0); }
void setup(){
  int pinos[]={M1A,M1B,M2A,M2B,TR}; for(auto p:pinos) pinMode(p,OUTPUT);
  pinMode(EC,INPUT); Serial.begin(9600);
}
void loop(){
  float d=medir();
  if(d>20){ frente(180); }
  else {
    parar(); delay(300);
    direita(200); delay(600);
  }
  delay(50);
}` },
  ],

  // ── Servo Motor MG996R ───────────────────────────────────────────────────
  c5: [
    { id:"c5-01", title:"Varredura Automática 0-180°", difficulty:"Iniciante", time:"15 min",
      description:"Servo varre de 0 a 180° e volta continuamente.",
      connections:"Sinal→pino 9, VCC→5V externo (mín 1A), GND→GND comum.",
      code:`#include <Servo.h>
Servo s; void setup(){ s.attach(9); }
void loop(){
  for(int a=0;a<=180;a++){s.write(a);delay(10);}
  for(int a=180;a>=0;a--){s.write(a);delay(10);}
}` },
    { id:"c5-02", title:"Controle por Potenciômetro", difficulty:"Iniciante", time:"20 min",
      description:"Potenciômetro no A0 controla o ângulo do servo em tempo real.",
      connections:"Potenciômetro central→A0. Servo sinal→pino 9.",
      code:`#include <Servo.h>
Servo s;
void setup(){ s.attach(9); }
void loop(){
  int raw=analogRead(A0);
  int ang=map(raw,0,1023,0,180);
  s.write(ang);
  Serial.printf("POT:%d ANG:%d\\n",raw,ang);
  delay(15);
}` },
    { id:"c5-03", title:"Braço Robótico 3 Servos", difficulty:"Avançado", time:"2h",
      description:"Controla 3 servos via Serial: envie ângulos no formato 'A1:90 A2:45 A3:0'.",
      connections:"Servo 1→pino 9, Servo 2→pino 10, Servo 3→pino 11. Alimentação 5V/3A externa.",
      code:`#include <Servo.h>
Servo s1,s2,s3;
void setup(){
  s1.attach(9); s2.attach(10); s3.attach(11);
  s1.write(90); s2.write(90); s3.write(90);
  Serial.begin(9600); Serial.println("Formato: A1:90 A2:45 A3:0");
}
void loop(){
  if(Serial.available()){
    String cmd=Serial.readStringUntil('\\n'); cmd.trim();
    int i1=cmd.indexOf("A1:"),i2=cmd.indexOf("A2:"),i3=cmd.indexOf("A3:");
    if(i1>=0) s1.write(constrain(cmd.substring(i1+3).toInt(),0,180));
    if(i2>=0) s2.write(constrain(cmd.substring(i2+3).toInt(),0,180));
    if(i3>=0) s3.write(constrain(cmd.substring(i3+3).toInt(),0,180));
    Serial.println("OK: "+cmd);
  }
}` },
    { id:"c5-04", title:"Cancela de Estacionamento", difficulty:"Intermediário", time:"30 min",
      description:"Servo abre cancela (0→90°) ao pressionar botão e fecha automaticamente após 3s.",
      connections:"Servo→pino 9. Botão→pino 2 (INPUT_PULLUP).",
      code:`#include <Servo.h>
Servo cancela;
const int BTN=2;
bool aberta=false; unsigned long tempo=0;
void setup(){cancela.attach(9);cancela.write(0);pinMode(BTN,INPUT_PULLUP);Serial.begin(9600);}
void loop(){
  if(!digitalRead(BTN) && !aberta){
    cancela.write(90); aberta=true; tempo=millis(); Serial.println("ABERTA");
  }
  if(aberta && millis()-tempo>3000){
    cancela.write(0); aberta=false; Serial.println("FECHADA");
  }
}` },
    { id:"c5-05", title:"Câmera Pan-Tilt", difficulty:"Avançado", time:"1h 30min",
      description:"2 servos formam sistema pan-tilt para câmera. Controlados via Serial (P:45 T:30).",
      connections:"Servo pan (horizontal)→pino 9. Servo tilt (vertical)→pino 10.",
      code:`#include <Servo.h>
Servo pan,tilt;
void setup(){pan.attach(9);tilt.attach(10);pan.write(90);tilt.write(45);Serial.begin(9600);}
void loop(){
  if(Serial.available()){
    String s=Serial.readStringUntil('\\n'); s.trim();
    if(s.startsWith("P:")){pan.write(constrain(s.substring(2).toInt(),0,180));Serial.println("Pan:"+s.substring(2));}
    if(s.startsWith("T:")){tilt.write(constrain(s.substring(2).toInt(),0,90));Serial.println("Tilt:"+s.substring(2));}
    if(s=="CENTER"){pan.write(90);tilt.write(45);Serial.println("Centralizado");}
  }
}` },
    { id:"c5-06", title:"Velocímetro de Servo", difficulty:"Intermediário", time:"45 min",
      description:"Mede e exibe RPM estimado de um servo de rotação contínua via encoder óptico.",
      connections:"Servo contínuo→pino 9. Encoder óptico (fork)→pino 2 (interrupt).",
      code:`#include <Servo.h>
Servo sv; volatile int pulsos=0; unsigned long t=0;
void IRAM_ATTR contarPulso(){ pulsos++; }
void setup(){
  sv.attach(9); sv.write(100); // avança lento
  pinMode(2,INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(2),contarPulso,RISING);
  Serial.begin(9600); t=millis();
}
void loop(){
  if(millis()-t>=1000){
    float rpm=(pulsos/20.0)*60.0; // 20 furos por volta
    Serial.printf("Pulsos/s: %d | RPM: %.1f\\n",pulsos,rpm);
    pulsos=0; t=millis();
  }
}` },
    { id:"c5-07", title:"Gimbal Estabilizador (MPU6050)", difficulty:"Avançado", time:"3h",
      description:"Lê ângulo do MPU6050 e compensa com servo para manter plataforma nivelada.",
      connections:"MPU6050: SDA→A4, SCL→A5. Servo compensação→pino 9.",
      code:`#include <Wire.h>
#include <MPU6050.h>
#include <Servo.h>
MPU6050 mpu; Servo sv;
void setup(){
  Wire.begin(); mpu.initialize(); sv.attach(9); sv.write(90);
  Serial.begin(9600);
}
void loop(){
  int16_t ax,ay,az,gx,gy,gz;
  mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);
  float angX=atan2(ay,az)*180.0/PI;
  int comp=constrain(90-(int)angX,0,180);
  sv.write(comp);
  Serial.printf("AngX=%.1f Servo=%d\\n",angX,comp);
  delay(20);
}` },
    { id:"c5-08", title:"Persiana Automatizada", difficulty:"Intermediário", time:"1h",
      description:"Persiana sobe ao anoitecer (LDR) e desce ao amanhecer automaticamente.",
      connections:"Servo contínuo→pino 9. LDR em divisor com 10kΩ→A0.",
      code:`#include <Servo.h>
Servo persiana;
const int LDR=A0;
const int LIMIAR_ESCURO=300;
bool aberta=true;
void setup(){persiana.attach(9);persiana.write(90);Serial.begin(9600);}
void loop(){
  int luz=analogRead(LDR);
  bool escuro=(luz<LIMIAR_ESCURO);
  Serial.printf("Luz:%d %s\\n",luz,escuro?"NOITE":"DIA");
  if(escuro && !aberta){ persiana.write(180); delay(3000); persiana.write(90); aberta=true; }
  if(!escuro && aberta){ persiana.write(0); delay(3000); persiana.write(90); aberta=false; }
  delay(5000);
}` },
    { id:"c5-09", title:"Válvula Solenoide Digital", difficulty:"Iniciante", time:"20 min",
      description:"Controla servo simulando válvula (0°=fechada, 90°=aberta) via serial ou botão.",
      connections:"Servo→pino 9. Botão→pino 2 (INPUT_PULLUP).",
      code:`#include <Servo.h>
Servo valvula; const int BTN=2; bool aberta=false;
void setup(){valvula.attach(9);valvula.write(0);pinMode(BTN,INPUT_PULLUP);Serial.begin(9600);}
void abrir(){valvula.write(90);aberta=true;Serial.println("VALVULA ABERTA");}
void fechar(){valvula.write(0);aberta=false;Serial.println("VALVULA FECHADA");}
void loop(){
  if(!digitalRead(BTN)){aberta?fechar():abrir();delay(300);}
  if(Serial.available()){
    char c=Serial.read();
    if(c=='A'||c=='a') abrir(); if(c=='F'||c=='f') fechar();
  }
}` },
    { id:"c5-10", title:"Sistema de Sorteio Giratório", difficulty:"Intermediário", time:"1h",
      description:"Gira para posição aleatória ao pressionar botão com animação de 'girar'.",
      connections:"Servo→pino 9. Botão→pino 2 (INPUT_PULLUP). Buzzer→pino 11.",
      code:`#include <Servo.h>
Servo sv; const int BTN=2,BZ=11;
void setup(){sv.attach(9);sv.write(0);pinMode(BTN,INPUT_PULLUP);randomSeed(analogRead(A3));Serial.begin(9600);}
void loop(){
  if(!digitalRead(BTN)){
    // Animação de girar
    for(int i=0;i<5;i++){
      sv.write(random(0,180)); tone(BZ,500+i*100,100); delay(150);
    }
    int pos=random(0,180);
    sv.write(pos); noTone(BZ); tone(BZ,1000,500);
    Serial.printf("Sorteio: posicao %d graus\\n",pos);
    delay(500);
  }
}` },
  ],
};

// ─── Generator Genérico (fallback para componentes sem projetos específicos) ──

function gerarCodigoGenerico(nome: string, proj: number): string {
  const templates: Record<number, string> = {
    1: `// Projeto 1 — Leitura Básica | ${nome}
void setup() { Serial.begin(9600); Serial.println("${nome} iniciado!"); }
void loop() {
  int leitura = analogRead(A0);
  float tensao = leitura * 5.0 / 1023.0;
  Serial.print("${nome} | Raw: "); Serial.print(leitura);
  Serial.print(" | Tensao: "); Serial.print(tensao, 2); Serial.println(" V");
  delay(500);
}`,
    2: `// Projeto 2 — LED Indicador | ${nome}
const int LED = 13;
void setup() { pinMode(LED, OUTPUT); Serial.begin(9600); }
void loop() {
  int v = analogRead(A0);
  digitalWrite(LED, v > 512);
  Serial.printf("${nome} | %d | LED:%s\\n", v, v>512?"ON":"off");
  delay(200);
}`,
    3: `// Projeto 3 — Alerta Buzzer | ${nome}
const int BUZZ = 11;
void setup() { Serial.begin(9600); }
void loop() {
  int v = analogRead(A0);
  if (v > 700) { tone(BUZZ, 1000, 200); Serial.println("ALERTA!"); }
  else noTone(BUZZ);
  delay(100);
}`,
    4: `// Projeto 4 — Display OLED | ${nome}
#include <Wire.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 d(128, 64, &Wire, -1);
void setup() { d.begin(SSD1306_SWITCHCAPVCC, 0x3C); }
void loop() {
  int v = analogRead(A0);
  d.clearDisplay(); d.setTextColor(WHITE); d.setTextSize(2);
  d.setCursor(0, 20); d.println("${nome}");
  d.setTextSize(1); d.printf("Val: %d", v); d.display(); delay(500);
}`,
    5: `// Projeto 5 — Controle por Botão | ${nome}
const int BTN = 2;
bool ativo = false;
void setup() { pinMode(BTN, INPUT_PULLUP); Serial.begin(9600); }
void loop() {
  if (!digitalRead(BTN)) {
    ativo = !ativo;
    Serial.println(ativo ? "${nome} ATIVO" : "${nome} INATIVO");
    delay(300);
  }
}`,
    6: `// Projeto 6 — Logger CSV | ${nome}
void setup() { Serial.begin(9600); Serial.println("timestamp_ms,valor"); }
void loop() {
  int v = analogRead(A0);
  Serial.printf("%lu,%d\\n", millis(), v);
  delay(1000);
}`,
    7: `// Projeto 7 — Salvar em EEPROM | ${nome}
#include <EEPROM.h>
int addr = 0;
void setup() { Serial.begin(9600); Serial.println("${nome} + EEPROM"); }
void loop() {
  int v = analogRead(A0) >> 2; // 10bit → 8bit
  EEPROM.write(addr, v);
  addr = (addr + 1) % 512;
  Serial.printf("EEPROM[%d] = %d\\n", addr, v);
  delay(2000);
}`,
    8: `// Projeto 8 — WiFi IoT | ${nome} (ESP32)
#include <WiFi.h>
#include <HTTPClient.h>
const char* SSID="REDE", *PASS="SENHA", *URL="http://api.servidor.com/sensor";
void setup(){
  WiFi.begin(SSID,PASS); while(WiFi.status()!=WL_CONNECTED)delay(500);
  Serial.begin(115200); Serial.println("WiFi OK");
}
void loop(){
  int v = analogRead(34);
  HTTPClient h; h.begin(String(URL)+"?valor="+v); h.GET(); h.end();
  Serial.printf("${nome} | Enviado: %d\\n", v);
  delay(10000);
}`,
    9: `// Projeto 9 — MQTT Broker | ${nome} (ESP32)
#include <WiFi.h>
#include <PubSubClient.h>
const char* SSID="REDE",*PASS="SENHA",*HOST="broker.hivemq.com";
WiFiClient wc; PubSubClient mqtt(wc);
void setup(){
  WiFi.begin(SSID,PASS); while(WiFi.status()!=WL_CONNECTED)delay(500);
  mqtt.setServer(HOST,1883); while(!mqtt.connect("devgenius"))delay(1000);
  Serial.begin(115200);
}
void loop(){
  mqtt.loop();
  int v = analogRead(34);
  mqtt.publish("devgenius/sensor", String(v).c_str());
  Serial.printf("${nome}: %d\\n", v);
  delay(5000);
}`,
    10: `// Projeto 10 — Sistema Completo | ${nome}
#include <Wire.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 disp(128,64,&Wire,-1);
const int BTN=2, LED=13;
bool modo=false; int contagem=0;
void setup(){
  pinMode(BTN,INPUT_PULLUP); pinMode(LED,OUTPUT);
  Serial.begin(9600); disp.begin(SSD1306_SWITCHCAPVCC,0x3C);
}
void loop(){
  if(!digitalRead(BTN)){modo=!modo;contagem=0;delay(200);}
  int v=analogRead(A0);
  if(!modo && v>700){contagem++;digitalWrite(LED,HIGH);}else digitalWrite(LED,LOW);
  disp.clearDisplay(); disp.setTextColor(WHITE); disp.setTextSize(1);
  disp.setCursor(0,0); disp.println("${nome}");
  disp.printf("Val: %d\\nCont: %d\\nModo: %s",v,contagem,modo?"B":"A");
  disp.display(); delay(300);
}`
  };
  return templates[proj] || `// Projeto ${proj} — ${nome}\nvoid setup(){} void loop(){}`;
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
