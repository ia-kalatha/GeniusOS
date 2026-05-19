export interface ProjectStep {
  title: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  difficulty: "Básico" | "Fácil" | "Intermediário" | "Avançado" | "Supremacy";
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
    code: `/* GENIUS V12 - EMERGENCY BEACON */
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
  },
  {
    id: "p2",
    title: "Alarme de Toque Tátil",
    description: "Um buzzer que toca quando você encosta no sensor capacitivo integrado do ESP32.",
    difficulty: "Básico",
    compCount: 2,
    components: ["ESP32", "Buzzer Passivo"],
    connections: "- Buzzer Positivo -> D5\n- Buzzer Negativo -> GND",
    code: `/* GENIUS V12 - TOUCH ALARM */
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
  },

  // --- 3 COMPONENTES ---
  {
    id: "p3",
    title: "Termômetro Digital Simples",
    description: "Lê a temperatura ambiente e exibe no monitor serial com alerta visual.",
    difficulty: "Fácil",
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
  },
  {
    id: "p4",
    title: "Controle de Brilho via Potenciômetro",
    description: "Ajuste a intensidade de um LED utilizando a entrada analógica e saída PWM.",
    difficulty: "Fácil",
    compCount: 3,
    components: ["Arduino Uno", "Potenciômetro Rotativo 10k", "LED Amarelo Difuso 5mm"],
    connections: "- Potenciômetro: Pinos laterais -> 5V e GND, Central -> A0\n- LED: Anodo -> D9 (PWM), Catodo -> GND",
    code: `/* GENIUS V12 - PWM DIMMER */
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
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
    code: `/* GENIUS V12 - LINE FOLLOWER */
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
  },

  // --- 6+ COMPONENTES ---
  {
    id: "p9",
    title: "Braço Robótico Manipulador",
    description: "Controle preciso de 4 eixos utilizando joysticks analógicos e SG90.",
    difficulty: "Supremacy",
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
  },
  {
    id: "p10",
    title: "Smart Home Controller V12",
    description: "Controle por voz, sensor de movimento e display informativo em um único hub.",
    difficulty: "Supremacy",
    compCount: 7,
    components: ["ESP32", "Módulo Sensor de Som", "Módulo Sensor de Movimento PIR", "Módulo Relé 5V", "Display LCD 16x2 com I2C", "Módulo DFPlayer Mini MP3", "Buzzer Passivo"],
    connections: "- LCD: SDA(D21), SCL(D22)\n- DFPlayer: TX(D17), RX(D16)\n- Sensores: D4 e D5",
    code: `/* GENIUS V12 KERNEL - INTEGRATED HOME HUB */
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
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp"
  }
];
