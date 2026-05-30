// 150 pares de perguntas e respostas embutidos no código.
// O sistema de matching usa similaridade de palavras (sem IA externa).

export interface QAPair {
  q: string;   // pergunta de referência (normalizada para matching)
  a: string;   // resposta completa em Markdown
}

export const IA_KNOWLEDGE: QAPair[] = [
  // ─── ARDUINO / BÁSICO (1-20) ──────────────────────────────────────────────
  {
    q: "como ligar led arduino acender",
    a: `## Como ligar um LED no Arduino

**Materiais:** Arduino Uno, LED, resistor de 220Ω, jumpers, protoboard.

**Ligação:**
- Anodo do LED (perna longa) → pino digital (ex: D13) → resistor 220Ω
- Catodo (perna curta) → GND

**Código:**
\`\`\`cpp
void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH); // Liga
  delay(1000);
  digitalWrite(13, LOW);  // Desliga
  delay(1000);
}
\`\`\`

> **Dica:** Sempre use resistor em série. Sem ele, o LED pode queimar e danificar o pino do Arduino.`
  },
  {
    q: "como usar botao arduino ler pressionar",
    a: `## Como usar botão no Arduino

**Ligação com INPUT_PULLUP (mais simples):**
- Um terminal do botão → pino digital (ex: D2)
- Outro terminal → GND

**Código:**
\`\`\`cpp
void setup() {
  pinMode(2, INPUT_PULLUP); // resistor interno ativado
  Serial.begin(9600);
}
void loop() {
  int estado = digitalRead(2);
  if (estado == LOW) {       // pressionado = LOW (lógica invertida)
    Serial.println("Botão pressionado!");
  }
}
\`\`\`

> Com INPUT_PULLUP, o pino fica em HIGH quando solto e vai para LOW quando o botão é pressionado.`
  },
  {
    q: "como ler sensor analogico analogread potenciometro",
    a: `## Como ler sensor analógico (analogRead)

O Arduino Uno possui 6 entradas analógicas (A0–A5) com ADC de 10 bits (0 a 1023).

**Ligação de um potenciômetro:**
- Pino esquerdo → 5V
- Pino do meio → A0
- Pino direito → GND

**Código:**
\`\`\`cpp
void setup() {
  Serial.begin(9600);
}
void loop() {
  int valor = analogRead(A0);           // 0 a 1023
  float tensao = valor * (5.0 / 1023.0); // converte para volts
  Serial.print("Valor: "); Serial.print(valor);
  Serial.print(" | Tensão: "); Serial.println(tensao);
  delay(200);
}
\`\`\`

> Para converter para percentual: \`int pct = map(valor, 0, 1023, 0, 100);\``
  },
  {
    q: "como usar pwm analogwrite controlar intensidade",
    a: `## Como usar PWM (analogWrite)

PWM simula tensão analógica variando o tempo em HIGH. No Arduino Uno, pinos com **~** suportam PWM: 3, 5, 6, 9, 10, 11.

**Controlar brilho de LED:**
\`\`\`cpp
int brilho = 0;
int incremento = 5;

void setup() {
  pinMode(9, OUTPUT);
}
void loop() {
  analogWrite(9, brilho);  // 0 (desligado) a 255 (máximo)
  brilho += incremento;
  if (brilho >= 255 || brilho <= 0) incremento = -incremento;
  delay(30);
}
\`\`\`

**Usos comuns de PWM:**
- Controle de brilho de LEDs
- Velocidade de motores DC
- Geração de sinais de áudio
- Controle de servos (via biblioteca Servo)`
  },
  {
    q: "como usar serial monitor print println debug",
    a: `## Como usar o Monitor Serial

O Monitor Serial permite debugar seu código enviando dados pelo USB.

**Inicialização:**
\`\`\`cpp
void setup() {
  Serial.begin(9600); // baud rate: deve bater com o monitor
}
\`\`\`

**Funções principais:**
\`\`\`cpp
Serial.print("texto");         // sem quebra de linha
Serial.println("texto");       // com quebra de linha
Serial.print(valor);           // imprime número
Serial.print(valor, HEX);      // em hexadecimal
Serial.available()             // bytes disponíveis para leitura
Serial.read()                  // lê um byte da serial
\`\`\`

> **Dica:** Use 115200 como baud rate para leituras mais rápidas e estáveis.`
  },
  {
    q: "diferenca setup loop funcao arduino",
    a: `## Diferença entre setup() e loop()

| Função | Quando executa | Para quê serve |
|--------|---------------|----------------|
| **setup()** | Uma única vez ao ligar/resetar | Inicializações: pinMode, Serial.begin, biblioteca.begin |
| **loop()** | Repetidamente, sem parar | Lógica principal do programa |

**Exemplo:**
\`\`\`cpp
void setup() {
  pinMode(13, OUTPUT);   // executa 1x
  Serial.begin(9600);    // executa 1x
}

void loop() {
  digitalWrite(13, HIGH); // executa sempre
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
\`\`\`

> Nunca coloque \`while(true)\` dentro de loop() sem uma saída — o Arduino vai travar.`
  },
  {
    q: "diferenca delay millis sem bloquear tempo",
    a: `## delay() vs millis() — Sem bloquear o processador

**delay()** para tudo por X milissegundos. Nenhuma outra leitura acontece nesse período.

**millis()** retorna o tempo decorrido desde o boot — permite "esperar" sem bloquear.

**Padrão blink sem delay:**
\`\`\`cpp
unsigned long lastTime = 0;
const long intervalo = 1000;

void loop() {
  unsigned long agora = millis();
  if (agora - lastTime >= intervalo) {
    lastTime = agora;
    // executa a cada 1 segundo
    digitalWrite(13, !digitalRead(13));
  }
  // outras leituras acontecem aqui sem travamento
}
\`\`\`

> Use **millis()** sempre que precisar de múltiplas tarefas simultâneas.`
  },
  {
    q: "como usar interrupcao attachinterrupt isr arduino",
    a: `## Como usar Interrupções no Arduino

Interrupções permitem reagir a eventos externos imediatamente, sem polling no loop().

**Pinos de interrupção no Uno:** D2 (INT0) e D3 (INT1).

\`\`\`cpp
volatile bool flagBotao = false;

void IRAM_ATTR tratarBotao() {
  flagBotao = true;  // nunca faça Serial dentro de ISR!
}

void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(2), tratarBotao, FALLING);
}

void loop() {
  if (flagBotao) {
    flagBotao = false;
    Serial.println("Interrupção detectada!");
  }
}
\`\`\`

**Modos:** RISING, FALLING, CHANGE, LOW.
> Use **volatile** em variáveis compartilhadas com ISR. Mantenha a ISR curta!`
  },
  {
    q: "como usar eeprom arduino salvar dados persistente",
    a: `## Como usar EEPROM no Arduino

A EEPROM guarda dados mesmo sem energia (Uno: 1KB).

\`\`\`cpp
#include <EEPROM.h>

void setup() {
  Serial.begin(9600);

  // Escrever
  int valor = 42;
  EEPROM.write(0, valor);         // endereço 0, valor 0-255
  EEPROM.put(10, 3.14f);          // gravar float no endereço 10

  // Ler
  int lido = EEPROM.read(0);
  float f;
  EEPROM.get(10, f);

  Serial.println(lido); // 42
  Serial.println(f);    // 3.14
}
\`\`\`

> A EEPROM suporta ~100.000 ciclos de escrita. Evite gravar a cada loop; grave só quando o valor mudar.`
  },
  {
    q: "como usar servo motor biblioteca arduino angulo",
    a: `## Como usar Servo Motor no Arduino

\`\`\`cpp
#include <Servo.h>

Servo meuServo;

void setup() {
  meuServo.attach(9);  // pino do sinal do servo
}
void loop() {
  meuServo.write(0);    delay(1000); // 0°
  meuServo.write(90);   delay(1000); // 90°
  meuServo.write(180);  delay(1000); // 180°
}
\`\`\`

**Ligação:**
- Fio vermelho → 5V (fonte externa recomendada)
- Fio marrom/preto → GND
- Fio laranja/amarelo → pino de sinal (ex: D9)

> Servos consomem muito — use fonte externa de 5V para não sobrecarregar o Arduino.`
  },
  {
    q: "como configurar pino entrada saida pinmode digitalread digitalwrite",
    a: `## Configuração de pinos digitais

**pinMode:** define o modo do pino.
\`\`\`cpp
pinMode(pino, OUTPUT);      // saída
pinMode(pino, INPUT);       // entrada (sem resistor interno)
pinMode(pino, INPUT_PULLUP);// entrada com pull-up interno
\`\`\`

**Escrita digital:**
\`\`\`cpp
digitalWrite(pino, HIGH); // 5V (Uno) ou 3.3V (ESP32)
digitalWrite(pino, LOW);  // 0V
\`\`\`

**Leitura digital:**
\`\`\`cpp
int estado = digitalRead(pino); // retorna HIGH ou LOW
\`\`\`

> Pinos do Uno suportam até ~40mA (seguro: 20mA). Para cargas maiores use transistor ou relé.`
  },
  {
    q: "como ler temperatura arduino dht22 dht11 sensor",
    a: `## Lendo temperatura com DHT22

\`\`\`cpp
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}
void loop() {
  float temp  = dht.readTemperature();   // °C
  float umid  = dht.readHumidity();      // %

  if (isnan(temp) || isnan(umid)) {
    Serial.println("Erro na leitura!");
    return;
  }
  Serial.print("Temp: "); Serial.print(temp); Serial.println(" °C");
  Serial.print("Umid: "); Serial.print(umid); Serial.println(" %");
  delay(2000); // DHT22 precisa de 2s entre leituras
}
\`\`\`

**Ligação:** VCC→5V, GND→GND, DATA→D4 (+ resistor pull-up 4.7kΩ entre VCC e DATA).`
  },
  {
    q: "o que e bootloader arduino como funciona",
    a: `## O que é o Bootloader do Arduino

O **bootloader** é um pequeno programa gravado na memória Flash do microcontrolador que roda nos primeiros instantes após o reset e verifica se há um novo sketch chegando pela serial (USB).

**Como funciona:**
1. Você pressiona Upload na IDE
2. A IDE reseta o Arduino (via DTR/RTS)
3. O bootloader acorda e escuta a porta serial
4. Recebe o binário compilado via protocolo STK500
5. Grava o sketch na Flash
6. Transfere controle para o sketch

**Placas originais vs. clones:**
- Placas originais: chip CH340 (clone) ou FTDI para USB-Serial
- Bootloaders: Optiboot (Uno), Caterina (Leonardo), Stk500v2 (Mega)

> Se o bootloader corrompeu, você precisa de um programador ISP (Arduino como ISP) para regravar.`
  },
  {
    q: "como fazer upload enviar codigo sketch arduino ide",
    a: `## Como fazer Upload do Sketch

**Passo a passo:**
1. Conecte o Arduino via USB
2. Abra a Arduino IDE
3. Vá em **Ferramentas → Placa** → selecione o modelo correto
4. Vá em **Ferramentas → Porta** → selecione a porta COM correta
5. Clique no botão **Upload** (seta →) ou Ctrl+U

**Erros comuns:**

| Erro | Causa | Solução |
|------|-------|---------|
| avrdude not responding | Porta errada | Verifique Tools → Port |
| Porta não aparece | Driver ausente | Instale driver CH340 ou FTDI |
| expected declaration | Sintaxe inválida | Corrija o código |

> Cabo USB de celular pode ser só de carga (sem dados). Use cabo com dados confirmado.`
  },
  {
    q: "como usar wire i2c arduino biblioteca sensor display",
    a: `## Como usar I2C com Wire.h

\`\`\`cpp
#include <Wire.h>

void setup() {
  Wire.begin();        // inicia como mestre (Uno: SDA=A4, SCL=A5)
  Serial.begin(9600);
}

// Escrever para dispositivo I2C
void escreverI2C(uint8_t addr, uint8_t reg, uint8_t valor) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(valor);
  Wire.endTransmission();
}

// Ler de dispositivo I2C
uint8_t lerI2C(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(addr, (uint8_t)1);
  return Wire.read();
}
\`\`\`

**Pinos I2C por placa:**
- Uno/Nano: A4 (SDA), A5 (SCL)
- ESP32: GPIO21 (SDA), GPIO22 (SCL)
- Mega: 20 (SDA), 21 (SCL)`
  },
  {
    q: "como usar spi arduino biblioteca mosi miso sck",
    a: `## Como usar SPI no Arduino

**Pinos SPI no Uno:** MOSI=11, MISO=12, SCK=13, SS=10

\`\`\`cpp
#include <SPI.h>

const int SS_PIN = 10;

void setup() {
  SPI.begin();
  pinMode(SS_PIN, OUTPUT);
  digitalWrite(SS_PIN, HIGH);
  Serial.begin(9600);
}

uint8_t transferirSPI(uint8_t dado) {
  digitalWrite(SS_PIN, LOW);
  uint8_t resposta = SPI.transfer(dado);
  digitalWrite(SS_PIN, HIGH);
  return resposta;
}
\`\`\`

**Configurações SPI:**
\`\`\`cpp
SPI.beginTransaction(SPISettings(4000000, MSBFIRST, SPI_MODE0));
// 4MHz, bit mais significativo primeiro, modo 0
\`\`\`

> SPI é mais rápido que I2C mas usa mais pinos. Ideal para cartões SD, displays TFT e sensores de alta taxa.`
  },
  {
    q: "o que e volatile variavel arduino isr interrupcao",
    a: `## O que é "volatile" em C++/Arduino

A palavra-chave **volatile** diz ao compilador que o valor de uma variável pode mudar a qualquer momento, de fora do fluxo normal do programa — por exemplo, dentro de uma ISR (Interrupt Service Routine).

**Sem volatile (problema):**
\`\`\`cpp
bool flag = false;  // compilador pode otimizar e "cachear" em registrador
void ISR() { flag = true; }
void loop() {
  if (flag) { /* nunca detecta a mudança! */ }
}
\`\`\`

**Com volatile (correto):**
\`\`\`cpp
volatile bool flag = false;  // compilador sempre relê da memória
void ISR() { flag = true; }
void loop() {
  if (flag) { flag = false; Serial.println("ok"); }
}
\`\`\`

> Use volatile em TODA variável compartilhada entre o loop principal e uma ISR.`
  },
  {
    q: "como usar array vetor arduino declarar",
    a: `## Arrays no Arduino (C++)

**Declaração:**
\`\`\`cpp
int numeros[5] = {10, 20, 30, 40, 50};  // array de 5 inteiros
float leituras[10];                       // array de 10 floats (não inicializado)
char texto[] = "Olá";                     // array de char (string C)
\`\`\`

**Acesso:**
\`\`\`cpp
numeros[0]  // primeiro elemento = 10
numeros[4]  // último elemento = 50
\`\`\`

**Percorrer:**
\`\`\`cpp
int soma = 0;
for (int i = 0; i < 5; i++) {
  soma += numeros[i];
}
Serial.println(soma); // 150
\`\`\`

> Arduino não verifica limites de array! Acessar `numeros[5]` é undefined behavior — causa bugs difíceis de encontrar.`
  },
  {
    q: "como declarar variavel global constante define const arduino",
    a: `## Declarar variáveis e constantes no Arduino

**Variável global:**
\`\`\`cpp
int contador = 0;          // muda durante execução
String nome = "Arduino";   // string (evite em Uno — consome muita SRAM)
\`\`\`

**Constantes:**
\`\`\`cpp
const int LED_PIN = 13;    // boa prática: nome em maiúsculas
#define DELAY_MS 500       // pré-processador (sem tipo, sem verificação)
\`\`\`

**Diferença const vs #define:**
| | `const int` | `#define` |
|--|--|--|
| Tipo | Sim | Não |
| Debug | Aparece no depurador | Não |
| Recomendação | Prefira este | Use com cautela |

**Escopo:** variáveis declaradas dentro de funções são locais. Fora de todas as funções, são globais.`
  },
  {
    q: "o que e sketch arduino programa projeto",
    a: `## O que é um Sketch no Arduino

**Sketch** é o nome dado ao programa/projeto no ecossistema Arduino. Um sketch é um arquivo **.ino** (na IDE padrão) que contém:

\`\`\`
NomeDoProjeto/
  NomeDoProjeto.ino   ← sketch principal
  bibliotecas.h        ← arquivos extras opcionais
\`\`\`

**Estrutura mínima:**
\`\`\`cpp
void setup() {
  // inicialização — roda 1 vez
}

void loop() {
  // lógica principal — roda infinitamente
}
\`\`\`

**Compilação:** a IDE Arduino usa GCC (compilador C/C++) e gera um binário **.hex** para gravar na Flash do microcontrolador.

> Internamente, o sketch é C++ com algumas simplificações (ex: inclusão automática de Arduino.h). Você pode usar toda a linguagem C++.`
  },

  // ─── ESP32 (21-35) ───────────────────────────────────────────────────────
  {
    q: "como conectar esp32 wifi configurar credenciais",
    a: `## Como conectar o ESP32 ao WiFi

\`\`\`cpp
#include <WiFi.h>

const char* ssid     = "NomeDaRede";
const char* password = "SenhaWiFi";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  Serial.print("Conectando");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {}
\`\`\`

**Status do WiFi:**
- \`WL_CONNECTED\` — conectado
- \`WL_NO_SSID_AVAIL\` — rede não encontrada
- \`WL_CONNECT_FAILED\` — senha errada

> Use \`WiFi.disconnect()\` para desconectar e \`WiFi.mode(WIFI_OFF)\` para desligar e economizar energia.`
  },
  {
    q: "como usar bluetooth esp32 ble classic serial",
    a: `## Bluetooth no ESP32

**Bluetooth Classic (SPP — como serial):**
\`\`\`cpp
#include <BluetoothSerial.h>

BluetoothSerial SerialBT;

void setup() {
  Serial.begin(115200);
  SerialBT.begin("ESP32-BT");  // nome visível
  Serial.println("Bluetooth pronto!");
}
void loop() {
  if (SerialBT.available()) {
    char c = SerialBT.read();
    Serial.print(c);
    SerialBT.print("Recebi: "); SerialBT.println(c);
  }
}
\`\`\`

**BLE (Bluetooth Low Energy):** use a biblioteca NimBLE-Arduino (mais leve) ou o BLE nativo da esp32 arduino core.

> Bluetooth Classic e BLE não funcionam simultaneamente em modo duplo por padrão — escolha um.`
  },
  {
    q: "como fazer ota update atualizacao arduino esp32",
    a: `## OTA (Over-The-Air) no ESP32

OTA permite atualizar o firmware via WiFi, sem cabo USB.

\`\`\`cpp
#include <WiFi.h>
#include <ArduinoOTA.h>

void setup() {
  WiFi.begin("ssid", "senha");
  while (WiFi.status() != WL_CONNECTED) delay(500);

  ArduinoOTA.setHostname("meu-esp32");
  ArduinoOTA.setPassword("admin");  // proteja com senha!

  ArduinoOTA.onStart([]() { Serial.println("OTA iniciando..."); });
  ArduinoOTA.onEnd([]()   { Serial.println("OTA concluído!"); });
  ArduinoOTA.onError([](ota_error_t err) { Serial.println("Erro OTA"); });

  ArduinoOTA.begin();
  Serial.println("OTA pronto. IP: " + WiFi.localIP().toString());
}
void loop() {
  ArduinoOTA.handle(); // deve ser chamado no loop
}
\`\`\`

> Reserve pelo menos 50% da Flash para OTA. Partições OTA: usa esquema "Default" no partition scheme.`
  },
  {
    q: "como usar deep sleep esp32 economizar energia bateria",
    a: `## Deep Sleep no ESP32

Em deep sleep, o consumo cai para ~10µA (vs ~240mA ativo).

\`\`\`cpp
#include <esp_sleep.h>

#define TEMPO_SLEEP_US 30000000ULL // 30 segundos

void setup() {
  Serial.begin(115200);
  Serial.println("Acordando...");

  // faz leitura, envia dados, etc.

  // dorme por 30 segundos
  esp_sleep_enable_timer_wakeup(TEMPO_SLEEP_US);
  Serial.println("Indo dormir...");
  Serial.flush();
  esp_deep_sleep_start();
}
void loop() {} // nunca chega aqui
\`\`\`

**Tipos de acordar:** timer, GPIO (ext0/ext1), touch, ULP.

> Variáveis normais são perdidas no deep sleep. Use **RTC_DATA_ATTR** para persistir dados:
> \`RTC_DATA_ATTR int contagem = 0;\``
  },
  {
    q: "diferenca esp32 esp8266 comparativo",
    a: `## ESP32 vs ESP8266 — Comparativo

| Característica | ESP8266 | ESP32 |
|---|---|---|
| CPU | 1 core, 80/160MHz | 2 cores, até 240MHz |
| RAM | 80KB | 520KB |
| Flash | 1-16MB | 4-16MB |
| WiFi | 802.11 b/g/n | 802.11 b/g/n |
| Bluetooth | Não | Classic + BLE 4.2 |
| GPIO | 17 | 34+ |
| ADC | 1 canal (10 bits) | 18 canais (12 bits) |
| DAC | Não | 2 canais (8 bits) |
| Tensão | 3.3V | 3.3V |
| Preço | Mais barato | Ligeiramente mais caro |

**Quando usar ESP8266:** projetos simples de WiFi, custo mínimo.
**Quando usar ESP32:** projetos com Bluetooth, múltiplos sensores, processamento paralelo, IoT avançado.`
  },
  {
    q: "como criar webserver servidor web esp32 http",
    a: `## WebServer no ESP32

\`\`\`cpp
#include <WiFi.h>
#include <WebServer.h>

WebServer server(80);

void handleRoot() {
  server.send(200, "text/html",
    "<h1>ESP32 Web Server</h1><p>Olá DevGenius!</p>");
}

void handleSensor() {
  float temp = 25.3; // substitua por leitura real
  String json = "{\\"temp\\":" + String(temp) + "}";
  server.send(200, "application/json", json);
}

void setup() {
  WiFi.begin("ssid", "senha");
  while (WiFi.status() != WL_CONNECTED) delay(500);

  server.on("/", handleRoot);
  server.on("/sensor", handleSensor);
  server.begin();
  Serial.println("Servidor em: " + WiFi.localIP().toString());
}
void loop() {
  server.handleClient();
}
\`\`\`

Acesse \`http://[IP_DO_ESP32]/sensor\` no browser para ver os dados.`
  },
  {
    q: "como usar mqtt esp32 publicar subscrever broker",
    a: `## MQTT no ESP32 com PubSubClient

\`\`\`cpp
#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

void callback(char* topic, byte* payload, unsigned int len) {
  String msg = String((char*)payload).substring(0, len);
  Serial.println("Recebido [" + String(topic) + "]: " + msg);
}

void setup() {
  WiFi.begin("ssid","senha");
  while (WiFi.status() != WL_CONNECTED) delay(500);

  mqtt.setServer("broker.hivemq.com", 1883); // broker público para testes
  mqtt.setCallback(callback);

  mqtt.connect("ESP32-Client");
  mqtt.subscribe("devgenius/comando");
}
void loop() {
  mqtt.loop();
  mqtt.publish("devgenius/temperatura", "26.5"); // publicar dado
  delay(5000);
}
\`\`\`

> **Brokers gratuitos para teste:** broker.hivemq.com, test.mosquitto.org`
  },
  {
    q: "como usar adc analogico esp32 leitura tensao",
    a: `## ADC (Analógico) no ESP32

O ESP32 tem ADC de 12 bits (0–4095) em até 18 pinos.

\`\`\`cpp
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);       // 12 bits = 0 a 4095 (padrão)
  analogSetAttenuation(ADC_11db); // faixa até 3.3V
}

void loop() {
  int raw = analogRead(34);                    // pino ADC
  float tensao = raw * (3.3 / 4095.0);
  Serial.print("ADC: "); Serial.print(raw);
  Serial.print(" | Tensão: "); Serial.println(tensao, 3);
  delay(500);
}
\`\`\`

**Atenuações disponíveis:**
- ADC_0db → faixa 0–0.8V
- ADC_2_5db → 0–1.1V
- ADC_6db → 0–1.35V
- ADC_11db → 0–3.3V ← mais usado

> **Atenção:** ADC2 não funciona quando WiFi está ativo. Use sempre ADC1 (GPIO 32–39) em projetos WiFi.`
  },
  {
    q: "como usar dac saida analogica esp32",
    a: `## DAC no ESP32

O ESP32 possui 2 canais DAC de 8 bits (GPIO25 e GPIO26).

\`\`\`cpp
#include <driver/dac.h>

void setup() {
  dac_output_enable(DAC_CHANNEL_1); // GPIO25
  dac_output_enable(DAC_CHANNEL_2); // GPIO26
}

void loop() {
  // Gerar onda senoidal
  for (int i = 0; i < 360; i++) {
    float seno = sin(i * PI / 180.0);
    uint8_t valor = (uint8_t)((seno + 1.0) * 127.5); // 0 a 255
    dac_output_voltage(DAC_CHANNEL_1, valor);
    delayMicroseconds(100);
  }
}
\`\`\`

> DAC gera tensão real entre 0V e 3.3V com resolução de ~13mV por passo. Útil para áudio simples e referências de tensão.`
  },
  {
    q: "como usar dual core esp32 dois nucleos tarefa",
    a: `## Dual Core no ESP32 (FreeRTOS)

O ESP32 tem 2 núcleos (Core 0 e Core 1). Por padrão, o código roda no Core 1.

\`\`\`cpp
TaskHandle_t tarefaCore0;

void tarefaA(void* param) {
  while (true) {
    Serial.println("Core 0 rodando");
    vTaskDelay(1000 / portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);
  xTaskCreatePinnedToCore(
    tarefaA,         // função
    "TarefaA",       // nome
    10000,           // stack (bytes)
    NULL,            // parâmetro
    1,               // prioridade
    &tarefaCore0,    // handle
    0                // core (0 ou 1)
  );
}

void loop() {
  Serial.println("Core 1 rodando");
  delay(1000);
}
\`\`\`

> Use cores separados para tarefas críticas (ex: WiFi no 0, sensores no 1).`
  },
  {
    q: "como usar spiffs littlefs filesystem esp32 arquivo",
    a: `## SPIFFS/LittleFS no ESP32 — Sistema de Arquivos

\`\`\`cpp
#include <SPIFFS.h>

void setup() {
  Serial.begin(115200);
  if (!SPIFFS.begin(true)) { // true = formatar se necessário
    Serial.println("Erro ao montar SPIFFS");
    return;
  }

  // Escrever arquivo
  File f = SPIFFS.open("/config.txt", "w");
  f.println("ssid=MinhaRede");
  f.println("pass=SenhaSecreta");
  f.close();

  // Ler arquivo
  f = SPIFFS.open("/config.txt", "r");
  while (f.available()) {
    Serial.println(f.readStringUntil('\n'));
  }
  f.close();
}
\`\`\`

> Use LittleFS em vez de SPIFFS para projetos novos — é mais robusto. Inclua \`#include <LittleFS.h>\` e substitua \`SPIFFS\` por \`LittleFS\`.`
  },
  {
    q: "como configurar gpio esp32 pino entrada saida",
    a: `## GPIO no ESP32

\`\`\`cpp
void setup() {
  pinMode(4,  OUTPUT);         // saída
  pinMode(5,  INPUT);          // entrada sem pull
  pinMode(15, INPUT_PULLUP);   // entrada com pull-up interno
  pinMode(16, INPUT_PULLDOWN); // entrada com pull-down interno
}

void loop() {
  digitalWrite(4, HIGH);
  int estado = digitalRead(15);

  // Pinos touch-sensitive (T0-T9)
  int touch = touchRead(T0); // GPIO4

  // Interrupt
  attachInterrupt(digitalPinToInterrupt(5), isr, FALLING);
}
\`\`\`

**Pinos especiais:**
- GPIO 34, 35, 36, 39 → somente entrada (sem pull-up interno)
- GPIO 6–11 → conectados à Flash interna (NÃO use!)
- GPIO 0, 2, 15 → boot strapping (cuidado durante reset)`
  },
  {
    q: "como usar ntp relogio horario esp32 tempo",
    a: `## NTP (Hora da Internet) no ESP32

\`\`\`cpp
#include <WiFi.h>
#include <time.h>

void setup() {
  Serial.begin(115200);
  WiFi.begin("ssid", "senha");
  while (WiFi.status() != WL_CONNECTED) delay(500);

  // Configurar NTP (offset Brasil: UTC-3 = -10800 segundos)
  configTime(-3 * 3600, 0, "pool.ntp.org", "time.google.com");

  struct tm info;
  if (getLocalTime(&info)) {
    char buf[64];
    strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &info);
    Serial.println(buf);
  }
}
void loop() {}
\`\`\`

**Fusos brasileiros:**
- Brasília (BRT): UTC-3 → offset = -10800
- Manaus (AMT): UTC-4 → offset = -14400
- Acre (ACT):   UTC-5 → offset = -18000`
  },

  // ─── SENSORES (36-55) ────────────────────────────────────────────────────
  {
    q: "como usar sensor ultrasonico hcsr04 distancia",
    a: `## Sensor Ultrassônico HC-SR04

**Ligação:** VCC→5V, GND→GND, Trig→D9, Echo→D10

\`\`\`cpp
#define TRIG_PIN 9
#define ECHO_PIN 10

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  // Dispara pulso de 10µs
  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Mede o tempo do eco
  long duracao = pulseIn(ECHO_PIN, HIGH);
  float distancia = duracao * 0.034 / 2.0; // cm

  Serial.print("Distância: "); Serial.print(distancia); Serial.println(" cm");
  delay(200);
}
\`\`\`

> Faixa: 2cm a 400cm. Ângulo de 15°. Pode usar biblioteca **NewPing** para simplificar o código.`
  },
  {
    q: "como usar sensor pir hcsr501 movimento deteccao",
    a: `## Sensor PIR HC-SR501 (Movimento)

O PIR detecta mudança de calor infravermelho — movimento de pessoas e animais.

**Ligação:** VCC→5V, GND→GND, OUT→D2

\`\`\`cpp
#define PIR_PIN 2

void setup() {
  Serial.begin(9600);
  pinMode(PIR_PIN, INPUT);
  delay(2000); // tempo de calibração do sensor
  Serial.println("PIR pronto!");
}

void loop() {
  if (digitalRead(PIR_PIN) == HIGH) {
    Serial.println("Movimento detectado!");
    delay(1000);
  }
}
\`\`\`

**Ajustes no HC-SR501:**
- Potenciômetro de sensibilidade (esquerdo)
- Potenciômetro de tempo (direito: 5s a 5min)
- Jumper: H = modo de retrigger, L = modo único

> Faixa de detecção: até 7m, ângulo de ~120°.`
  },
  {
    q: "como usar ldr foto resistor sensor luz",
    a: `## LDR (Sensor de Luz) — Foto-resistor

LDR varia sua resistência com a luz: escuro (~1MΩ), iluminado (~100Ω).

**Ligação em divisor de tensão:**
- 5V → LDR → A0 → Resistor 10kΩ → GND

\`\`\`cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  int valor = analogRead(A0); // 0 (escuro) a 1023 (claro)
  int percentual = map(valor, 0, 1023, 0, 100);

  Serial.print("Luminosidade: "); Serial.print(percentual); Serial.println("%");

  if (valor < 300) {
    Serial.println("Ambiente escuro - acender luz!");
  }
  delay(500);
}
\`\`\`

> Calibre os limites (300, 700) conforme seu ambiente — varia muito de sensor para sensor.`
  },
  {
    q: "como usar mpu6050 acelerometro giroscopio imu",
    a: `## MPU6050 — Acelerômetro + Giroscópio

**Ligação (I2C):** VCC→3.3V, GND→GND, SDA→A4, SCL→A5

\`\`\`cpp
#include <Wire.h>
#include <MPU6050.h>

MPU6050 mpu;

void setup() {
  Wire.begin();
  Serial.begin(9600);
  mpu.initialize();
  Serial.println(mpu.testConnection() ? "MPU OK" : "Falha!");
}

void loop() {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  Serial.print("Acc X:"); Serial.print(ax / 16384.0, 2);
  Serial.print(" Y:"); Serial.print(ay / 16384.0, 2);
  Serial.print(" Z:"); Serial.println(az / 16384.0, 2);
  delay(200);
}
\`\`\`

> Divisor: ±2g range → divide por 16384. Para ±4g → 8192. Use **DMP** para ângulos Euler estáveis.`
  },
  {
    q: "como usar sensor chuva modulo fc37",
    a: `## Sensor de Chuva (FC-37 / YL-83)

O sensor tem duas saídas: digital (HIGH/LOW) e analógica (intensidade).

**Ligação:** VCC→5V, GND→GND, A0→A0 (analógico), D0→D2 (digital)

\`\`\`cpp
#define PINO_DIGITAL 2
#define PINO_ANALOG  A0

void setup() {
  Serial.begin(9600);
  pinMode(PINO_DIGITAL, INPUT);
}

void loop() {
  int analog  = analogRead(PINO_ANALOG);
  bool chuva  = (digitalRead(PINO_DIGITAL) == LOW); // LOW = detectou chuva

  Serial.print("Intensidade: "); Serial.print(analog);
  Serial.print(" | Chuva: "); Serial.println(chuva ? "SIM" : "NÃO");
  delay(500);
}
\`\`\`

> Ajuste o potenciômetro do módulo para definir o limiar de detecção digital.`
  },
  {
    q: "como usar bmp280 pressao barometrica altitude temperatura",
    a: `## BMP280 — Pressão e Temperatura

**Ligação (I2C):** VCC→3.3V, GND→GND, SDA→A4, SCL→A5

\`\`\`cpp
#include <Wire.h>
#include <Adafruit_BMP280.h>

Adafruit_BMP280 bmp;

void setup() {
  Serial.begin(9600);
  if (!bmp.begin(0x76)) { // endereço padrão 0x76 (ou 0x77)
    Serial.println("Sensor não encontrado!");
    while (1);
  }
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);
}

void loop() {
  Serial.print("Temp: ");    Serial.print(bmp.readTemperature()); Serial.println(" °C");
  Serial.print("Pressão: "); Serial.print(bmp.readPressure()/100); Serial.println(" hPa");
  Serial.print("Altitude: ");Serial.print(bmp.readAltitude(1013.25)); Serial.println(" m");
  delay(2000);
}
\`\`\``
  },
  {
    q: "como usar ds18b20 temperatura onewire dallas",
    a: `## DS18B20 — Temperatura (1-Wire)

**Ligação:** VCC→5V, GND→GND, DATA→D4 (+ resistor 4.7kΩ entre VCC e DATA)

\`\`\`cpp
#include <OneWire.h>
#include <DallasTemperature.h>

OneWire oneWire(4);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(9600);
  sensors.begin();
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("Sensor desconectado!");
  } else {
    Serial.print("Temperatura: ");
    Serial.print(tempC, 2); Serial.println(" °C");
  }
  delay(1000);
}
\`\`\`

> 1-Wire permite múltiplos sensores no mesmo pino. Cada DS18B20 tem ID único de 64 bits.`
  },
  {
    q: "como usar sensor gas mq2 mq135 qualidade ar",
    a: `## Sensor de Gás MQ-2 / MQ-135

MQ-2 detecta GLP, fumaça, metano. MQ-135 detecta CO2, NH3, álcool.

**Ligação:** VCC→5V, GND→GND, A0→A0

\`\`\`cpp
#define MQ_PIN A0

void setup() {
  Serial.begin(9600);
  Serial.println("Aquecendo sensor (60s)...");
  delay(60000); // pré-aquecimento obrigatório
}

void loop() {
  int leitura = analogRead(MQ_PIN);
  float ppm = leitura * (5.0 / 1023.0) * 200; // aproximado

  Serial.print("Raw: "); Serial.print(leitura);
  Serial.print(" | PPM aprox: "); Serial.println(ppm);

  if (leitura > 700) {
    Serial.println("⚠️ CONCENTRAÇÃO ALTA!");
  }
  delay(1000);
}
\`\`\`

> Para leitura precisa de PPM, use a curva logarítmica do datasheet e calibre com gás de referência.`
  },
  {
    q: "como usar encoder rotativo ky040 knob",
    a: `## Encoder Rotativo KY-040

\`\`\`cpp
#define CLK 2
#define DT  3
#define SW  4

int contador = 0;
int ultimoClk;

void setup() {
  Serial.begin(9600);
  pinMode(CLK, INPUT);
  pinMode(DT,  INPUT);
  pinMode(SW,  INPUT_PULLUP);
  ultimoClk = digitalRead(CLK);
}

void loop() {
  int clkAtual = digitalRead(CLK);

  if (clkAtual != ultimoClk) {
    if (digitalRead(DT) != clkAtual) contador++;
    else contador--;
    Serial.println(contador);
  }
  ultimoClk = clkAtual;

  if (digitalRead(SW) == LOW) { // botão pressionado
    contador = 0;
    Serial.println("Resetado!");
    delay(200);
  }
}
\`\`\``
  },
  {
    q: "como usar rfid rc522 cartao leitora",
    a: `## RFID RC522 — Leitura de Cartões

**Ligação (SPI):** SDA→10, SCK→13, MOSI→11, MISO→12, RST→9, VCC→3.3V, GND→GND

\`\`\`cpp
#include <SPI.h>
#include <MFRC522.h>

MFRC522 rfid(10, 9); // SS_PIN, RST_PIN

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("Aproxime o cartão...");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  Serial.print("UID: ");
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    Serial.print(rfid.uid.uidByte[i], HEX);
    Serial.print(" ");
  }
  Serial.println();
  rfid.PICC_HaltA();
}
\`\`\``
  },

  // ─── ELETRÔNICA BÁSICA (56-75) ────────────────────────────────────────────
  {
    q: "o que e resistor para que serve ohm",
    a: `## O que é um Resistor

Um resistor é um componente passivo que **limita o fluxo de corrente elétrica** em um circuito.

**Unidade:** Ohm (Ω)
**Lei de Ohm:** V = I × R

**Tipos:**
- **Fixo:** valor constante (mais comum)
- **Variável (potenciômetro):** valor ajustável manualmente
- **LDR:** varia com a luz
- **NTC/PTC:** varia com a temperatura

**Código de cores (4 faixas):**
| Cor | Valor |
|-----|-------|
| Preto | 0 |
| Marrom | 1 |
| Vermelho | 2 |
| Laranja | 3 |
| Amarelo | 4 |
| Verde | 5 |
| Azul | 6 |
| Violeta | 7 |
| Cinza | 8 |
| Branco | 9 |

> Marrom-Preto-Vermelho-Dourado = **1kΩ ±5%**`
  },
  {
    q: "como calcular resistor led corrente formula",
    a: `## Como calcular o resistor para LED

**Fórmula:**
$$R = \\frac{V_{fonte} - V_{LED}}{I_{LED}}$$

**Valores típicos:**
- LED vermelho: Vf ≈ 2.0V, I = 20mA
- LED verde/azul: Vf ≈ 3.2V, I = 20mA
- LED branco: Vf ≈ 3.4V, I = 20mA

**Exemplos:**

| Fonte | LED | Cálculo | Resistor comercial |
|-------|-----|---------|-------------------|
| 5V | Vermelho (2V, 20mA) | (5-2)/0.02 = 150Ω | **220Ω** |
| 5V | Azul (3.2V, 20mA) | (5-3.2)/0.02 = 90Ω | **100Ω** |
| 3.3V | Vermelho (2V, 20mA) | (3.3-2)/0.02 = 65Ω | **68Ω** |

> Sempre arredonde para o valor comercial **acima** — menos corrente = LED mais seguro.`
  },
  {
    q: "o que e capacitor funcao carga eletrica",
    a: `## O que é um Capacitor

Capacitor armazena energia em campo elétrico. Unidade: **Farad (F)**. Na prática usamos µF, nF, pF.

**Tipos:**
- **Eletrolítico:** grande capacitância (µF a mF), polarizado, para filtros de fonte
- **Cerâmico:** pequena capacitância (pF a µF), não polarizado, para desacoplamento
- **Tantalum:** compacto, polarizado, alta capacitância/volume

**Usos em eletrônica embarcada:**
1. **Desacoplamento:** 100nF em paralelo ao Vcc de cada CI — filtra ruído de alta frequência
2. **Filtro de fonte:** 100µF–1000µF após ponte retificadora
3. **Debounce:** capacitor em paralelo ao botão (junto com resistor)
4. **Timer RC:** com resistor define frequência em circuitos osciladores

> **Atenção:** capacitor eletrolítico tem polaridade! Perna curta (ou listra) = negativo.`
  },
  {
    q: "o que e transistor bjt npn pnp funciona chave",
    a: `## O que é um Transistor BJT

Transistor é um componente semicondutor que amplifica ou comuta corrente elétrica.

**NPN (mais comum em projetos embarcados):**
- Base (B): entrada de controle
- Coletor (C): corrente de carga
- Emissor (E): referência (GND)

**Funcionamento como chave:**
\`\`\`
Pino MCU → Resistor 1kΩ → Base
Carga (relé, motor, LED) → Coletor
GND → Emissor
\`\`\`

**Exemplo:** BD139 (0.5A), BC337, 2N2222 (0.6A), TIP120 (5A Darlington)

**Cálculo do resistor de base:**
$$R_B = \\frac{V_{MCU} - 0.7}{I_B} = \\frac{V_{MCU} - 0.7}{I_{carga} / h_{FE}}$$

> **MOSFET** (ex: IRF540) é preferido para cargas maiores — não precisa de corrente de gate, só tensão.`
  },
  {
    q: "o que e diodo funcao polarizacao led zener",
    a: `## O que é um Diodo

Diodo conduz corrente em apenas **um sentido** (anodo→catodo quando polarizado diretamente).

**Tipos:**
| Tipo | Uso | Exemplo |
|------|-----|---------|
| Retificador | AC→DC, proteção reversa | 1N4007 |
| LED | Emite luz | Vários |
| Zener | Regulação de tensão | 5V1 |
| Schottky | Alta velocidade, baixa queda | 1N5819 |
| Flyback | Proteção de bobinas | 1N4007 |

**Queda de tensão típica:**
- Silício: ~0.7V
- LED: 1.8V a 3.4V
- Schottky: ~0.3V
- Zener: tensão de regulação (ex: 5.1V)

**Diodo flyback (freewheeling):** coloque sempre em paralelo com relés, solenoides e motores (catodo no positivo) para absorver o pico de tensão ao desligar.`
  },
  {
    q: "o que e rele como funciona controlar carga 220v",
    a: `## Como funciona um Relé

Relé é um **interruptor eletromecânico** acionado por eletromagneto. Permite controlar cargas de alta potência com sinal de baixa potência.

**Partes:**
- **Bobina:** quando energizada, fecha/abre os contatos mecânicos
- **NO (Normally Open):** aberto sem energia, fecha quando acionado
- **NC (Normally Closed):** fechado sem energia, abre quando acionado
- **COM:** terminal comum

**Ligação com Arduino:**
\`\`\`cpp
// Módulo relé (já tem transistor e optoacoplador)
#define RELE_PIN 8
void setup() { pinMode(RELE_PIN, OUTPUT); }
void loop() {
  digitalWrite(RELE_PIN, LOW);  delay(2000); // liga (módulo ativo em LOW)
  digitalWrite(RELE_PIN, HIGH); delay(2000); // desliga
}
\`\`\`

> **Nunca** conecte direto ao pino I/O sem driver. Use módulo relé pré-montado com optoacoplador.`
  },
  {
    q: "lei de ohm formula tensao corrente resistencia",
    a: `## Lei de Ohm — Fundamento da Eletrônica

**A lei mais importante em eletrônica:**

$$V = I \\times R$$

| Símbolo | Grandeza | Unidade |
|---------|----------|---------|
| V | Tensão | Volt (V) |
| I | Corrente | Ampère (A) |
| R | Resistência | Ohm (Ω) |

**Derivações:**
- $I = V / R$
- $R = V / I$

**Potência:**
$$P = V \\times I = I^2 \\times R = V^2 / R$$

**Exemplo prático:**
Um LED com 2V e 20mA:
- Resistor necessário: R = (5 - 2) / 0.02 = **150Ω**
- Potência no resistor: P = 0.02² × 150 = **60mW** (resistor de 1/8W serve)

> Memorize: **V = I × R**. Todo o resto em eletrônica deriva daí.`
  },
  {
    q: "o que e divisor de tensao circuito resistores",
    a: `## Divisor de Tensão

Dois resistores em série dividem a tensão proporcionalmente.

**Fórmula:**
$$V_{out} = V_{in} \\times \\frac{R_2}{R_1 + R_2}$$

**Exemplo:**
- Vin = 5V, R1 = 10kΩ, R2 = 10kΩ
- Vout = 5 × 10/(10+10) = **2.5V**

**Uso prático:** Adaptar 5V para 3.3V (para não queimar ESP32):
- R1 = 10kΩ, R2 = 20kΩ
- Vout = 5 × 20/30 = **3.33V** ✓

**Para ler sensor 5V no ESP32 (3.3V):**
\`\`\`
Sensor (5V) → R1(10kΩ) → GPIO_ESP32 → R2(20kΩ) → GND
\`\`\`

> Divisores de tensão perdem eficiência com cargas (corrente alta). Use buffer opamp para cargas significativas.`
  },
  {
    q: "como funciona ponte h motor dc direcao",
    a: `## Ponte H — Controle de Motor DC

Ponte H permite inverter o sentido de rotação de um motor DC alterando a polaridade.

**Componentes:** L298N (clássico, 2A), L293D (0.6A), TB6612FNG (1.2A), MOSFET N-channel ×4

**Usando L298N com Arduino:**
\`\`\`cpp
#define IN1 4
#define IN2 5
#define ENA 6  // pino PWM para velocidade

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENA, OUTPUT);
}

void motorFrente(int vel) {
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  analogWrite(ENA, vel); // 0-255
}
void motorTras(int vel) {
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  analogWrite(ENA, vel);
}
void motorParar() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
}
\`\`\``
  },
  {
    q: "o que e pullup pulldown resistor pino digital",
    a: `## Pull-up e Pull-down

Resistores pull-up e pull-down garantem um estado definido (HIGH ou LOW) quando o pino não está sendo acionado.

**Pull-up:**
\`\`\`
VCC → Resistor (10kΩ) → Pino → [Botão] → GND
\`\`\`
- Pino em HIGH por padrão
- Botão puxa para LOW

**Pull-down:**
\`\`\`
VCC → [Botão] → Pino → Resistor (10kΩ) → GND
\`\`\`
- Pino em LOW por padrão
- Botão puxa para HIGH

**Pull-up interno do Arduino:**
\`\`\`cpp
pinMode(pino, INPUT_PULLUP); // ativa ~20-50kΩ interno
\`\`\`

> Sem pull-up/down, pinos flutuam — leem valores aleatórios. Sempre defina o estado padrão!`
  },

  // ─── COMUNICAÇÃO SERIAL (76-85) ───────────────────────────────────────────
  {
    q: "o que e protocolo i2c como funciona barramento",
    a: `## Protocolo I2C — Inter-Integrated Circuit

I2C é um protocolo de comunicação serial **mestre-escravo** usando apenas 2 fios:
- **SDA** (Serial Data) — dados bidirecionais
- **SCL** (Serial Clock) — clock gerado pelo mestre

**Características:**
- Endereços de 7 bits (até 127 dispositivos no mesmo barramento)
- Velocidades: 100kHz (standard), 400kHz (fast), 1MHz (fast+)
- Necessita resistores pull-up (4.7kΩ típico)
- Half-duplex (não envia e recebe simultaneamente)

**Pinos por placa:**
| Placa | SDA | SCL |
|-------|-----|-----|
| Uno/Nano | A4 | A5 |
| Mega | 20 | 21 |
| ESP32 | 21 | 22 |
| ESP8266 | D2 | D1 |

**Verificar dispositivos no barramento:**
Use o sketch "I2C Scanner" — encontra todos os endereços conectados.`
  },
  {
    q: "o que e protocolo spi como funciona mosi miso sck",
    a: `## Protocolo SPI — Serial Peripheral Interface

SPI usa 4 fios e é **full-duplex** (envia e recebe ao mesmo tempo):
- **MOSI:** Master Out Slave In — dado do mestre para escravo
- **MISO:** Master In Slave Out — dado do escravo para mestre
- **SCK/SCLK:** Clock
- **CS/SS:** Chip Select (1 por dispositivo)

**Características:**
- Velocidades até 80MHz
- Sem endereçamento — usa CS dedicado por dispositivo
- Full-duplex
- Modos 0-3 (combinações de CPOL e CPHA)

**Devices SPI comuns:**
- Cartão SD (25MHz)
- Display TFT ILI9341 (40MHz)
- RFID RC522
- ADC externo MCP3208

> SPI é mais rápido que I2C mas usa mais pinos. Ideal para displays e cartões SD.`
  },
  {
    q: "o que e uart protocolo serial tx rx baud",
    a: `## UART — Universal Asynchronous Receiver/Transmitter

UART é o protocolo serial mais simples: apenas 2 fios (TX e RX), sem clock compartilhado.

**Características:**
- Assíncrono — sem clock (por isso "Asynchronous")
- Pinos: TX (transmissão) e RX (recepção)
- Cruzado: TX do emissor → RX do receptor
- Parâmetros: baud rate, bits de dados (8), paridade, stop bits (1)

**Baud rates comuns:**
9600, 19200, 38400, 57600, **115200**, 230400, 921600

**No Arduino:**
- Hardware UART: pinos 0 (RX) e 1 (TX) — evite usar com USB conectado!
- SoftwareSerial: emula UART em qualquer pino (até ~57600 baud estável)
- Mega/ESP32: múltiplas UARTs nativas

\`\`\`cpp
#include <SoftwareSerial.h>
SoftwareSerial mySerial(10, 11); // RX, TX
mySerial.begin(9600);
mySerial.println("Olá via SoftSerial");
\`\`\``
  },
  {
    q: "como configurar serial begin velocidade baud rate",
    a: `## Configurando Serial.begin()

\`\`\`cpp
void setup() {
  Serial.begin(9600);    // padrão para iniciantes
  Serial.begin(115200);  // recomendado para ESP32
  Serial.begin(115200, SERIAL_8N1); // 8 bits, sem paridade, 1 stop bit
}
\`\`\`

**Onde configurar no monitor:**
No canto inferior direito do Serial Monitor da IDE — deve bater com o código.

**Baud rates e quando usar:**
| Baud | Uso |
|------|-----|
| 9600 | Debug básico, sensores lentos |
| 115200 | Recomendado ESP32/ESP8266 |
| 921600 | Upload rápido de firmware |

**Flush e wait:**
\`\`\`cpp
Serial.flush();          // espera buffer de transmissão esvaziar
while (!Serial) delay(10); // espera USB estabilizar (Leonardo/Pro Micro)
\`\`\``
  },
  {
    q: "como debugar comunicacao serial analisador logico osciloscópio",
    a: `## Debugar Comunicação Serial

**Ferramentas:**
1. **Monitor Serial (IDE):** mais simples, para texto legível
2. **Analisador Lógico:** visualiza bits individuais — barato (Saleae clone ~R$30)
3. **Osciloscópio:** mede timing e níveis de tensão com precisão

**Dicas de debug com Serial:**
\`\`\`cpp
// Print com contexto
Serial.print("[DEBUG] Temperatura: ");
Serial.println(temp, 3); // 3 casas decimais

// Hex dump de buffer
for (int i = 0; i < len; i++) {
  if (buf[i] < 0x10) Serial.print("0");
  Serial.print(buf[i], HEX);
  Serial.print(" ");
}
\`\`\`

**Problemas comuns:**
| Problema | Causa | Solução |
|----------|-------|---------|
| Texto embaralhado | Baud diferente | Sincronize baud rates |
| Nada aparece | Serial.begin não chamado | Adicione no setup() |
| Dados corrompidos | Cabo longo sem shielding | Reduza comprimento ou velocidade |`
  },

  // ─── ATUADORES (86-95) ───────────────────────────────────────────────────
  {
    q: "como controlar motor passo stepper driver a4988",
    a: `## Motor de Passo (Stepper) com A4988

**Ligação do A4988:**
- VMOT: 8-35V (fonte do motor)
- VDD: 3.3V ou 5V (lógica)
- DIR: pino de direção
- STEP: pino de passo

\`\`\`cpp
#define STEP_PIN 3
#define DIR_PIN  4

void setup() {
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN,  OUTPUT);
}

void moverPassos(int passos, bool direcao) {
  digitalWrite(DIR_PIN, direcao);
  for (int i = 0; i < passos; i++) {
    digitalWrite(STEP_PIN, HIGH); delayMicroseconds(800);
    digitalWrite(STEP_PIN, LOW);  delayMicroseconds(800);
  }
}

void loop() {
  moverPassos(200, HIGH); delay(1000); // 200 passos = 1 volta (1.8°/passo)
  moverPassos(200, LOW);  delay(1000);
}
\`\`\`

> Configure microstep com MS1/MS2/MS3: full, 1/2, 1/4, 1/8, 1/16 passo.`
  },
  {
    q: "como usar buzzer tom som melodia",
    a: `## Buzzer — Sons e Melodias

**Buzzer Ativo** (tem oscilador interno — só liga e apita):
\`\`\`cpp
digitalWrite(BUZZER_PIN, HIGH); delay(500); // apita
digitalWrite(BUZZER_PIN, LOW);
\`\`\`

**Buzzer Passivo** (precisa de PWM — escolhe a frequência):
\`\`\`cpp
tone(BUZZER_PIN, 440, 500);  // Lá (440Hz) por 500ms
delay(600);
noTone(BUZZER_PIN);

// Melodia: Parabéns
int notas[] = {262, 262, 294, 262, 349, 330, 0, 262, 262, 294};
int tempo[]  = {200, 200, 400, 400, 400, 800, 200, 200, 200, 400};

for (int i = 0; i < 10; i++) {
  if (notas[i]) tone(4, notas[i], tempo[i]);
  else noTone(4);
  delay(tempo[i] + 50);
}
\`\`\`

> \`tone()\` bloqueia PWM nos pinos 3 e 11 no Uno. Use outro pino ou biblioteca AsyncTone.`
  },
  {
    q: "como controlar fita led enderecavel ws2812 neopixel",
    a: `## Fita LED WS2812B (NeoPixel)

**Biblioteca:** Adafruit NeoPixel ou FastLED

\`\`\`cpp
#include <Adafruit_NeoPixel.h>

#define LED_PIN  6
#define NUM_LEDS 30

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  strip.begin();
  strip.setBrightness(50);  // 0-255 (não exceda sem fonte adequada!)
  strip.show();
}

void loop() {
  // Cor sólida vermelha
  strip.fill(strip.Color(255, 0, 0));
  strip.show();
  delay(1000);

  // Apagar
  strip.clear();
  strip.show();
  delay(500);

  // Pixel individual
  strip.setPixelColor(0, strip.Color(0, 0, 255)); // LED 0 = azul
  strip.show();
  delay(1000);
}
\`\`\`

> Cada LED consome ~60mA em branco total. 30 LEDs = 1.8A. Use fonte externa de 5V adequada!`
  },
  {
    q: "como usar display oled ssd1306 i2c texto grafico",
    a: `## Display OLED 128x64 (SSD1306)

**Ligação I2C:** VCC→3.3V, GND→GND, SDA→A4, SCL→A5

\`\`\`cpp
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C); // endereço 0x3C ou 0x3D
  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("DevGenius V12");
  display.println("Temperatura: 25.3C");
  display.display();

  // Desenhar formas
  display.drawRect(0, 30, 128, 30, WHITE);   // retângulo
  display.fillCircle(64, 45, 10, WHITE);      // círculo cheio
  display.display();
}
void loop() {}
\`\`\``
  },
  {
    q: "como usar lcd 16x2 display i2c caractere texto",
    a: `## LCD 16x2 com Módulo I2C

**Ligação:** VCC→5V, GND→GND, SDA→A4, SCL→A5

\`\`\`cpp
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2); // endereço 0x27 (ou 0x3F)

void setup() {
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0); // coluna 0, linha 0
  lcd.print("DevGenius V12");
  lcd.setCursor(0, 1); // linha 1
  lcd.print("Temp: 25.3 C");
}

void loop() {
  // Atualizar valor específico
  lcd.setCursor(6, 1);
  lcd.print("26.1");
  delay(1000);
}
\`\`\`

**Endereço não encontrado?** Use o I2C Scanner — endereços comuns: 0x27, 0x3F, 0x20.

> Sem módulo I2C: LCD usa 6 pinos do Arduino (RS, EN, D4-D7). Com I2C: apenas 2 pinos!`
  },

  // ─── IoT / CLOUD (96-105) ─────────────────────────────────────────────────
  {
    q: "o que e mqtt protocolo iot publish subscribe topico",
    a: `## MQTT — Message Queuing Telemetry Transport

MQTT é um protocolo **publish/subscribe** leve, ideal para IoT.

**Funcionamento:**
\`\`\`
Sensor (Publisher) → [Broker] ← Dashboard (Subscriber)
                       ↑
                   tópico: "casa/sala/temperatura"
\`\`\`

**Componentes:**
- **Broker:** servidor central (Mosquitto, HiveMQ, AWS IoT)
- **Publisher:** publica mensagens em tópicos
- **Subscriber:** recebe mensagens dos tópicos assinados
- **Tópico:** path hierárquico (ex: \`home/sensor/temp\`)

**QoS (Quality of Service):**
| Nível | Garantia |
|-------|----------|
| QoS 0 | At most once (sem confirmação) |
| QoS 1 | At least once (confirmado, pode duplicar) |
| QoS 2 | Exactly once (mais lento, sem duplicata) |

**Brokers públicos para teste:**
- \`broker.hivemq.com:1883\`
- \`test.mosquitto.org:1883\``
  },
  {
    q: "como enviar dados thingspeak nuvem sensor",
    a: `## ThingSpeak — Enviar dados para Nuvem

ThingSpeak é uma plataforma gratuita de IoT para visualizar dados de sensores.

**Passos:**
1. Crie conta em thingspeak.com
2. Crie um Channel e anote o **Write API Key**
3. Use o código abaixo:

\`\`\`cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* apiKey = "SUA_API_KEY";
const char* server = "http://api.thingspeak.com";

void enviarThingSpeak(float temperatura, float umidade) {
  HTTPClient http;
  String url = String(server) + "/update?api_key=" + apiKey
             + "&field1=" + temperatura
             + "&field2=" + umidade;
  http.begin(url);
  int code = http.GET();
  Serial.println("HTTP: " + String(code));
  http.end();
}

void loop() {
  float temp = 25.3, umid = 65.0;
  enviarThingSpeak(temp, umid);
  delay(15000); // ThingSpeak: mínimo 15s entre envios
}
\`\`\``
  },
  {
    q: "o que e api rest http get post json",
    a: `## REST API — Comunicação com Servidores

REST usa HTTP para trocar dados (geralmente em JSON).

**Métodos HTTP:**
- **GET:** busca dados
- **POST:** envia dados (cria recurso)
- **PUT:** atualiza recurso
- **DELETE:** remove recurso

**ESP32 fazendo GET:**
\`\`\`cpp
#include <HTTPClient.h>

HTTPClient http;
http.begin("https://api.openweathermap.org/data/2.5/weather?q=Brasilia&appid=KEY");
int code = http.GET();
if (code == 200) {
  String body = http.getString();
  Serial.println(body); // JSON da resposta
}
http.end();
\`\`\`

**Parsear JSON:**
\`\`\`cpp
#include <ArduinoJson.h>
DynamicJsonDocument doc(2048);
deserializeJson(doc, body);
float temp = doc["main"]["temp"];
Serial.println(temp);
\`\`\``
  },
  {
    q: "como usar websocket comunicacao tempo real esp32",
    a: `## WebSocket no ESP32 (Tempo Real)

WebSocket mantém conexão bidirecional aberta — ideal para controle em tempo real.

\`\`\`cpp
#include <WiFi.h>
#include <WebSocketsServer.h>

WebSocketsServer ws(81);

void onMessage(uint8_t num, WStype_t type, uint8_t* payload, size_t len) {
  if (type == WStype_TEXT) {
    String msg = String((char*)payload).substring(0, len);
    Serial.println("Recebido: " + msg);
    ws.sendTXT(num, "Echo: " + msg); // responder ao cliente
  }
}

void setup() {
  WiFi.begin("ssid","senha");
  while (WiFi.status() != WL_CONNECTED) delay(500);
  ws.begin();
  ws.onEvent(onMessage);
}

void loop() {
  ws.loop();
}
\`\`\`

**No browser (JavaScript):**
\`\`\`javascript
const socket = new WebSocket('ws://192.168.x.x:81/');
socket.onmessage = (e) => console.log(e.data);
socket.send('Olá ESP32!');
\`\`\``
  },
  {
    q: "o que e broker mqtt mosquitto hivemq servidor",
    a: `## Brokers MQTT

Um **broker** é o servidor central do MQTT que gerencia todas as mensagens.

**Brokers populares:**

| Broker | Tipo | Uso |
|--------|------|-----|
| **Mosquitto** | Open source, local | Raspberry Pi, VPS |
| **HiveMQ** | Cloud/community | Produção, comunidade |
| **EMQX** | Open source | Alta escala |
| **AWS IoT Core** | Cloud pago | Produção empresarial |
| **Azure IoT Hub** | Cloud pago | Integração Microsoft |

**Instalar Mosquitto (Raspberry Pi):**
\`\`\`bash
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
\`\`\`

**Testar localmente:**
\`\`\`bash
mosquitto_sub -t "teste/#" &          # subscribe
mosquitto_pub -t "teste/sensor" -m "25.3"  # publish
\`\`\``
  },

  // ─── ENERGIA E BATERIAS (106-115) ─────────────────────────────────────────
  {
    q: "como alimentar projeto bateria lipo 18650 powerbank",
    a: `## Como alimentar projetos com bateria

**Opções de alimentação:**

| Tipo | Tensão | Capacidade | Uso |
|------|--------|------------|-----|
| Bateria 9V | 9V | ~500mAh | Protótipos rápidos (não ideal para IoT) |
| 18650 Li-Ion | 3.7V | 2000-3500mAh | ESP32 com step-up |
| LiPo 1S | 3.7V | 100-5000mAh | Drones, wearables |
| LiPo 2S | 7.4V | variável | Robótica |
| Powerbank | 5V USB | 5000-20000mAh | Projetos 5V, prático |

**Converter tensões:**
- 3.7V → 5V: módulo step-up MT3608
- 3.7V → 3.3V: regulador AMS1117-3.3 (ou LDO)
- 5V → 3.3V: AMS1117-3.3 (80mA perdido em calor)

**Cálculo de autonomia:**
\`\`\`
Horas = Capacidade_mAh / Consumo_mA
Exemplo: 2000mAh / 80mA = 25 horas
\`\`\``
  },
  {
    q: "o que e regulador tensao ams1117 lm7805 ldo",
    a: `## Reguladores de Tensão

**Reguladores lineares (simples, geram calor):**
- **LM7805:** 5V, 1A — entrada 7-35V
- **LM7833:** 3.3V, 0.5A
- **AMS1117-3.3:** 3.3V, 1A — muito usado com ESP8266/ESP32
- **LM317:** ajustável, 1.5A

\`\`\`
Potência dissipada = (Vin - Vout) × I
Exemplo: (9V - 5V) × 0.5A = 2W → precisa de dissipador!
\`\`\`

**Reguladores de chaveamento (eficientes, 80-95%):**
- **MT3608:** step-up (boost), até 28V saída
- **MP1584EN:** step-down (buck), 1.5A
- **LM2596:** step-down, 3A
- **IP5306:** gerenciamento de bateria Li-Ion

> Para projetos com bateria, use **buck/boost** — lineares desperdiçam energia em calor.`
  },
  {
    q: "como carregar bateria lipo tp4056 modulo",
    a: `## Carregador de Bateria LiPo com TP4056

O TP4056 é um CI de carregamento de baterias Li-Ion/LiPo via USB.

**Módulo TP4056 (com proteção):**
- **IN+/IN-:** entrada USB 5V
- **BAT+/BAT-:** bateria
- **OUT+/OUT-:** saída protegida para o circuito

\`\`\`
                    TP4056
USB 5V ──────────► IN+ │ BAT+ ─────► 18650 (+)
GND   ──────────► IN- │ BAT- ─────► 18650 (-)
                       │ OUT+ ─────► Circuito
                       │ OUT- ─────► GND
\`\`\`

**LEDs indicadores:**
- Vermelho: carregando
- Azul/Verde: carga completa

**Corrente de carga:** padrão 1A — pode ser reduzida trocando o resistor PROG (R3):
- 1.2kΩ → 1A | 2kΩ → 580mA | 5kΩ → 240mA`
  },

  // ─── PCB E HARDWARE AVANÇADO (116-120) ────────────────────────────────────
  {
    q: "o que e pcb placa circuito impresso camadas",
    a: `## PCB — Printed Circuit Board

PCB é a placa onde componentes eletrônicos são montados e interconectados por trilhas de cobre.

**Camadas típicas:**
- **Top:** componentes (solder mask verde, silkscreen branca)
- **Bottom:** trilhas de retorno/GND
- **Inner layers:** placas multicamadas (4, 6, 8+ camadas)

**Parâmetros importantes:**
| Parâmetro | Valor típico hobby | Valor típico pro |
|-----------|-------------------|-----------------|
| Largura mínima trilha | 0.2mm | 0.1mm |
| Via mínima | 0.6mm drill | 0.3mm drill |
| Espaçamento | 0.2mm | 0.1mm |
| Camadas | 2 | 4+ |

**Ferramentas gratuitas:**
- **EasyEDA:** online, integrado com JLCPCB
- **KiCad:** open source, profissional
- **Fritzing:** para iniciantes (menos recomendado para produção)

**Fabricação:** JLCPCB, PCBWay — 5 placas 10x10cm por ~$2 com envio.`
  },
  {
    q: "como fazer pcb em casa transferencia laser impressao",
    a: `## Fazer PCB em Casa

**Método: Transferência com Papel Glossy + Percloreto de Ferro**

1. **Design:** crie no EasyEDA ou KiCad, espelhe horizontalmente
2. **Impressão:** imprima em papel glossy (papel de revista) com laser
3. **Transferência:** cole o papel na placa de cobre limpa, passe ferro quente 2-3 min
4. **Revelação:** mergulhe em água, remova o papel devagar
5. **Corrosão:** percloreto de ferro 35% por 15-30 min, agitando
6. **Limpeza:** acetona remove o toner
7. **Furação:** broca 0.8-1.0mm

**Método mais moderno: Exposição UV**
- Placa fotossensível + filme transparente + caixa UV

**Limitações do caseiro:**
- Trilhas mínimas ~0.5mm (profissional: 0.1mm)
- Dificuldade com SMD
- Sem via plated through

> Para SMD e produção, use JLCPCB/PCBWay — mais barato e confiável que fazer em casa.`
  },

  // ─── PROGRAMAÇÃO AVANÇADA (121-130) ──────────────────────────────────────
  {
    q: "o que e ponteiro pointer cpp embarcado",
    a: `## Ponteiros em C++ para Embarcados

Ponteiro armazena o **endereço de memória** de uma variável.

\`\`\`cpp
int x = 42;
int* ptr = &x;    // ptr aponta para x

Serial.println(*ptr);    // 42  — desreferência: acessa o valor
Serial.println((int)ptr);// endereço de memória

*ptr = 100;              // modifica x via ponteiro
Serial.println(x);       // 100
\`\`\`

**Uso em embarcados:**
\`\`\`cpp
// Acesso a registradores de hardware
volatile uint8_t* reg = (volatile uint8_t*)0x25; // endereço do PORTB
*reg |= (1 << 5);  // seta bit 5 (pino 13 do Uno)

// Arrays e ponteiros
uint8_t buffer[64];
uint8_t* p = buffer;  // p aponta para buffer[0]
p[3] = 0xFF;          // mesmo que buffer[3] = 0xFF
\`\`\`

> Em embarcados, ponteiros são essenciais para manipulação de registradores e acesso eficiente a memória.`
  },
  {
    q: "o que e progmem flash pgm ler string memoria",
    a: `## PROGMEM — Armazenar dados na Flash (Arduino AVR)

No Arduino Uno, a SRAM é de apenas 2KB. Strings longas esgotam rapidamente.
**PROGMEM** armazena constantes na Flash (32KB) em vez da SRAM.

\`\`\`cpp
#include <avr/pgmspace.h>

// Declarar string na Flash
const char msg1[] PROGMEM = "Olá DevGenius!";
const char msg2[] PROGMEM = "Sistema iniciado.";

void setup() {
  Serial.begin(9600);

  // Ler da Flash (não leia direto como string normal!)
  char buffer[30];
  strcpy_P(buffer, msg1);       // copia Flash → SRAM
  Serial.println(buffer);

  // Usando F() macro (mais simples para Serial)
  Serial.println(F("Essa string fica na Flash!"));
}
\`\`\`

**Regra prática:** use `F()` em todo `Serial.print()` para economizar SRAM:
\`\`\`cpp
Serial.println(F("Inicializando sensor DHT22..."));
\`\`\``
  },
  {
    q: "como usar watchdog timer wdt reiniciar arduino trava",
    a: `## Watchdog Timer (WDT)

O WDT reinicia o microcontrolador se o código travar por muito tempo sem "resetar o cão de guarda".

\`\`\`cpp
#include <avr/wdt.h>

void setup() {
  Serial.begin(9600);
  wdt_enable(WDTO_2S); // reinicia se não receber wdt_reset() em 2s
  Serial.println("WDT ativo — timeout de 2s");
}

void loop() {
  // Simular operação normal
  Serial.println("Loop rodando...");
  wdt_reset(); // "alimenta" o watchdog — não vai reiniciar
  delay(1000);

  // Se descomentar abaixo, reinicia após 2s:
  // while(true); // trava proposital para demonstrar
}
\`\`\`

**Tempos disponíveis:** WDTO_15MS, WDTO_30MS, WDTO_60MS, WDTO_120MS, WDTO_250MS, WDTO_500MS, WDTO_1S, WDTO_2S, WDTO_4S, WDTO_8S

> Use WDT em todos os projetos críticos que rodam sozinhos (não supervisionados).`
  },

  // ─── PLATAFORMA DEVGENIUS (131-140) ───────────────────────────────────────
  {
    q: "o que e devgenius plataforma para que serve",
    a: `## O que é o DEVGENIUS

O **DEVGENIUS** é uma plataforma completa de aprendizado e prototipagem em hardware embarcado e eletrônica.

**O que você encontra aqui:**

| Seção | Conteúdo |
|-------|----------|
| 🔌 **Controladoras** | Catálogo de placas: Arduino, ESP32, STM32, Raspberry Pi |
| 🧩 **Componentes** | Sensores, atuadores, displays e módulos |
| 🖥️ **Hardware PC** | Componentes de computadores desktop |
| 🔬 **Laboratório** | Simulador de conexões de projetos |
| 📁 **Projetos Prontos** | Guias passo-a-passo com código completo |
| 🤖 **DevGenius IA** | Assistente de dúvidas técnicas (você está aqui!) |
| 📚 **Base de Código** | Módulos didáticos de C++ e JavaScript para hardware |
| 📝 **Bloco de Notas** | Anotações pessoais sincronizadas |
| 🎓 **Provas & Testes** | Certificação em eletrônica, Arduino e sensores |
| ❓ **FAQ Engenharia** | Manual técnico de referência dos componentes |

> Desenvolvido para estudantes, makers e engenheiros que querem dominar hardware embarcado.`
  },
  {
    q: "como usar laboratorio simulador workspace projeto",
    a: `## Como usar o Laboratório (Workspace)

O **Laboratório** é o simulador de projetos do DEVGENIUS. Funciona assim:

**Passo 1 — Selecionar a placa CORE:**
- Vá em **Controladoras** (menu lateral)
- Clique no botão **+LAB** em qualquer placa (Arduino, ESP32, etc.)
- A placa vira o "núcleo" do seu projeto

**Passo 2 — Adicionar componentes:**
- Vá em **Componentes** ou **Hardware PC**
- Clique em **+LAB** nos componentes desejados (até 5)

**Passo 3 — Compilar esquemático IA:**
- Acesse a aba **Laboratório**
- Clique em **COMPILAR ESQUEMÁTICO IA**
- A IA gera automaticamente:
  - Diagrama de conexões
  - Código de exemplo
  - Dicas de montagem

> Você pode remover componentes clicando no ✕ dentro do Laboratório.`
  },
  {
    q: "como fazer provas certificacao devgenius trilhas",
    a: `## Provas & Certificação DEVGENIUS

**Trilhas disponíveis:**

| Trilha | Conteúdo | Questões |
|--------|----------|----------|
| ⚡ Eletrônica Básica | Tensão, corrente, Lei de Ohm, componentes | 30 |
| 🤖 Arduino do Zero | Sketch, pinos, serial, PWM, bibliotecas | 30 |
| 🔭 Sensores e Atuadores | DHT, HC-SR04, PIR, servos, motores | 30 |

**Como funciona:**
1. Acesse **Provas & Testes** no menu
2. Escolha uma trilha
3. Responda todas as questões (você pode navegar entre elas)
4. Após confirmar cada resposta, vê a explicação imediata
5. Resultado final com pontuação e explicações completas

**Regras:**
- Questões mostram a explicação após confirmar (acertou ou errou)
- Melhor pontuação fica salva no perfil
- 30 acertos = perfeição na trilha (badge de conclusão)

> Estude a aba **FAQ Engenharia** e **Base de Código** antes das provas!`
  },
  {
    q: "como usar base codigo aprender cpp javascript modulo",
    a: `## Base de Código — Módulos de Aprendizado

A **Base de Código** tem conteúdo didático estruturado em módulos:

**C++ para Hardware (3 módulos):**
1. Fundamentos e Registradores
2. Protocolos e Comunicação Serial
3. Interrupções e Multitarefa Real

**JavaScript IoT (3 módulos):**
1. Lógica Assíncrona e IoT
2. Comunicação Web e Dashboards
3. Inteligência Artificial e Edge Computing

**Como navegar:**
- Escolha a linguagem (botões superiores)
- Navegue entre as aulas (Aula 01, 02, 03)
- Leia o conteúdo teórico completo
- Clique em **IR PARA PROVAS** para testar o conhecimento
- Clique em **CONCLUIR MÓDULO** ao terminar

> Todo o conteúdo é teórico e educacional — cada módulo tem profundidade equivalente a um curso focado no tema.`
  },
  {
    q: "como configurar perfil foto status conta devgenius",
    a: `## Configurações de Perfil DEVGENIUS

Acesse **Configurações** no menu lateral (ícone de engrenagem).

**O que você pode configurar:**

**Identidade Maker:**
- Primeiro nome e sobrenome
- Atualização permitida 1x por dia

**Foto de Perfil:**
- Cole uma URL de imagem (HTTPS)
- Ou faça upload de arquivo local (JPG/PNG)

**Segurança:**
- Alterar senha (mínimo 8 caracteres)
- Alterar e-mail vinculado à conta

**Interface:**
- **Layout:** AMPLIADO ou COMPACTO (barra lateral)
- **Temas do Kernel:** Kernel (escuro padrão), Matrix (verde), Vapor (roxo)

**Área de Risco:**
- Excluir conta permanentemente (irreversível)

> Todas as configurações são salvas e sincronizadas com o servidor DevGenius.`
  },

  // ─── PROJETOS PRÁTICOS (141-150) ──────────────────────────────────────────
  {
    q: "como fazer estacao meteorologica temperatura umidade pressao",
    a: `## Estação Meteorológica com ESP32

**Componentes:** ESP32, DHT22, BMP280, Display OLED SSD1306

**Arquitetura:**
\`\`\`
ESP32 ──I2C──► BMP280 (pressão + temp)
     ──I2C──► OLED 128x64
     ──GPIO─► DHT22 (umidade + temp)
     ──WiFi─► ThingSpeak / MQTT
\`\`\`

**Lógica:**
\`\`\`cpp
void loop() {
  float tempDHT = dht.readTemperature();
  float umid    = dht.readHumidity();
  float pressao = bmp.readPressure() / 100.0;
  float altitude = bmp.readAltitude(1013.25);

  // Exibir no OLED
  display.clearDisplay();
  display.setCursor(0,0);
  display.printf("Temp: %.1f C", tempDHT);
  display.setCursor(0,16);
  display.printf("Umid: %.1f %%", umid);
  display.setCursor(0,32);
  display.printf("P: %.1f hPa", pressao);
  display.display();

  // Enviar para nuvem
  enviarMQTT(tempDHT, umid, pressao);
  delay(30000);
}
\`\`\``
  },
  {
    q: "como fazer sistema alarme deteccao presenca alerta",
    a: `## Sistema de Alarme com Sensor PIR + Buzzer + Email

**Componentes:** ESP32, PIR HC-SR501, Buzzer ativo, LED

\`\`\`cpp
#include <WiFi.h>
#include <HTTPClient.h>

#define PIR_PIN 14
#define BUZZER  12
#define LED_RED 13

volatile bool alarme = false;

void IRAM_ATTR detectaMovimento() {
  alarme = true;
}

void setup() {
  WiFi.begin("ssid", "senha");
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER,  OUTPUT);
  pinMode(LED_RED, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(PIR_PIN), detectaMovimento, RISING);
  delay(2000); // calibração PIR
}

void loop() {
  if (alarme) {
    alarme = false;
    // Alertas visuais e sonoros
    for (int i = 0; i < 10; i++) {
      digitalWrite(LED_RED, !digitalRead(LED_RED));
      digitalWrite(BUZZER, !digitalRead(BUZZER));
      delay(200);
    }
    digitalWrite(BUZZER, LOW);
    // Notificação via Telegram ou email
    enviarAlerta();
  }
}
\`\`\``
  },
  {
    q: "como fazer controlador temperatura pid heater cooler",
    a: `## Controlador de Temperatura com PID

PID (Proporcional-Integral-Derivativo) mantém a temperatura em um setpoint.

**Componentes:** Arduino, DS18B20, relé (aquecedor), ventoinha (cooler)

\`\`\`cpp
#include <PID_v1.h>
#include <OneWire.h>
#include <DallasTemperature.h>

OneWire ow(4);
DallasTemperature sensors(&ow);

double setpoint = 60.0;   // temperatura desejada
double input, output;
double Kp=2, Ki=5, Kd=1;

PID pid(&input, &output, &setpoint, Kp, Ki, Kd, DIRECT);

void setup() {
  sensors.begin();
  pid.SetMode(AUTOMATIC);
  pid.SetOutputLimits(0, 255);
  pinMode(9, OUTPUT); // relé/aquecedor
}

void loop() {
  sensors.requestTemperatures();
  input = sensors.getTempCByIndex(0);
  pid.Compute();
  analogWrite(9, output); // controla potência do aquecedor via PWM
  delay(200);
}
\`\`\`

> Ajuste Kp, Ki, Kd através de auto-tuning ou método de Ziegler-Nichols.`
  },
  {
    q: "como fazer irrigacao automatica umidade solo sensor",
    a: `## Sistema de Irrigação Automática

**Componentes:** Arduino/ESP32, sensor de umidade do solo, bomba d'água + relé, RTC DS3231

\`\`\`cpp
#define SENSOR_SOLO A0
#define BOMBA_PIN   8
#define LIMIAR_SECO 400  // calibre conforme seu solo e sensor

void setup() {
  Serial.begin(9600);
  pinMode(BOMBA_PIN, OUTPUT);
  digitalWrite(BOMBA_PIN, LOW);
}

void loop() {
  int umidade = analogRead(SENSOR_SOLO);
  // Valores típicos: ~200 (molhado) a ~800 (seco)
  // Sensor capacitivo é mais durável que resistivo!

  Serial.print("Umidade do solo: "); Serial.println(umidade);

  if (umidade > LIMIAR_SECO) {
    Serial.println("Solo seco → IRRIGANDO por 10 segundos");
    digitalWrite(BOMBA_PIN, HIGH);
    delay(10000);
    digitalWrite(BOMBA_PIN, LOW);
    delay(60000); // aguarda 1 min antes de nova leitura
  }
  delay(5000);
}
\`\`\`

> Use sensor capacitivo (não enferruja) e adicione RTC para irrigar em horários específicos.`
  },
  {
    q: "como fazer robo seguidor linha sensor infravermelho",
    a: `## Robô Seguidor de Linha

**Componentes:** Arduino, 2 motores DC + ponte H L298N, módulo sensor IR (2 ou 5 sensores)

\`\`\`cpp
// Sensores IR: LOW = sobre linha branca, HIGH = sobre fundo preto
#define S_ESQ 2
#define S_DIR 3

// Ponte H L298N
#define M1_IN1 4  #define M1_IN2 5  #define M1_EN 6  // Motor esquerdo
#define M2_IN1 7  #define M2_IN2 8  #define M2_EN 9  // Motor direito

void setup() {
  pinMode(S_ESQ, INPUT); pinMode(S_DIR, INPUT);
  // ... configura pinos do motor como OUTPUT
  analogWrite(M1_EN, 180); analogWrite(M2_EN, 180); // velocidade base
}

void loop() {
  bool esq = !digitalRead(S_ESQ); // true = sensor na linha
  bool dir = !digitalRead(S_DIR);

  if (esq && dir)       frente();    // linha no centro
  else if (esq && !dir) virarEsq();  // linha à esquerda → corrige
  else if (!esq && dir) virarDir();  // linha à direita → corrige
  else                  frente();    // sem sensor → continua
}
\`\`\`

> Use 5 sensores (módulo TCRT5000) para seguimento suave com PID.`
  },
  {
    q: "como fazer datalogger registrar dados sd card csv",
    a: `## Datalogger — Registrar Dados em SD Card

**Componentes:** Arduino/ESP32, módulo micro SD, RTC DS3231, sensor DHT22

\`\`\`cpp
#include <SD.h>
#include <SPI.h>
#include <RTClib.h>
#include <DHT.h>

RTC_DS3231 rtc;
DHT dht(4, DHT22);

void setup() {
  SD.begin(10); // pino CS
  rtc.begin();
  dht.begin();

  // Cabeçalho do CSV
  File f = SD.open("dados.csv", FILE_WRITE);
  if (f) {
    f.println("Datetime,Temperatura,Umidade");
    f.close();
  }
}

void loop() {
  DateTime now = rtc.now();
  float temp = dht.readTemperature();
  float umid = dht.readHumidity();

  File f = SD.open("dados.csv", FILE_WRITE);
  if (f) {
    f.printf("%04d/%02d/%02d %02d:%02d:%02d,%.2f,%.2f\n",
      now.year(), now.month(), now.day(),
      now.hour(), now.minute(), now.second(),
      temp, umid);
    f.close();
  }
  delay(60000); // registra a cada 1 minuto
}
\`\`\``
  },
  {
    q: "como fazer smart home casa inteligente automacao esp32",
    a: `## Smart Home com ESP32 + MQTT

**Arquitetura:**
\`\`\`
Celular/Browser ──► MQTT Broker ◄── ESP32 ──► Relés/LEDs/Sensores
                       (HiveMQ)
\`\`\`

**ESP32 — Controle via MQTT:**
\`\`\`cpp
#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient wc;
PubSubClient mqtt(wc);

#define RELE_LUZ_SALA 12
#define RELE_AR       13

void callback(char* topic, byte* payload, unsigned int len) {
  String t = topic;
  String v = String((char*)payload).substring(0, len);

  if (t == "casa/sala/luz")   digitalWrite(RELE_LUZ_SALA, v == "ON" ? HIGH : LOW);
  if (t == "casa/sala/ar")    digitalWrite(RELE_AR,       v == "ON" ? HIGH : LOW);
}

void setup() {
  pinMode(RELE_LUZ_SALA, OUTPUT); pinMode(RELE_AR, OUTPUT);
  WiFi.begin("ssid","senha");
  mqtt.setServer("broker.hivemq.com", 1883);
  mqtt.setCallback(callback);
  mqtt.connect("SmartHome-ESP32");
  mqtt.subscribe("casa/#"); // assina todos os tópicos da casa
}
void loop() {
  mqtt.loop();
  // Publicar temperatura a cada 30s
  mqtt.publish("casa/temperatura", String(25.3).c_str());
  delay(30000);
}
\`\`\``
  }
];

// ─── Sistema de Matching por Similaridade de Palavras ───────────────────────

// Palavras irrelevantes em português (stop words)
const STOP_WORDS = new Set([
  "o","a","os","as","um","uma","uns","umas","de","do","da","dos","das",
  "em","no","na","nos","nas","por","para","com","sem","que","se","não",
  "e","é","ou","mas","sim","como","qual","quais","quando","onde",
  "me","te","se","nos","vos","lhe","lhes","eu","tu","ele","ela",
  "nós","vós","eles","elas","isso","este","esse","aquele","isto",
  "meu","minha","seu","sua","seus","suas","ao","à","pelo","pela",
  "entre","sobre","mais","menos","muito","pouco","já","ainda"
]);

function normalizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ")                     // remove pontuação
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Retorna a resposta embutida se a similaridade for suficiente,
 * ou null se não houver correspondência confiável.
 *
 * Score = interseção de palavras / máximo dos dois conjuntos (Jaccard-like)
 */
export function buscarResposta(perguntaUsuario: string): string | null {
  const palavrasUsuario = normalizar(perguntaUsuario);
  if (palavrasUsuario.length === 0) return null;

  let melhorScore = 0;
  let melhorResposta: string | null = null;

  for (const par of IA_KNOWLEDGE) {
    const palavrasRef = normalizar(par.q);
    if (palavrasRef.length === 0) continue;

    // Calcula interseção
    const setRef = new Set(palavrasRef);
    const setUsr = new Set(palavrasUsuario);
    let intersecao = 0;
    for (const w of setUsr) {
      if (setRef.has(w)) intersecao++;
    }

    // Score Jaccard: |A ∩ B| / |A ∪ B|
    const uniao = new Set([...setRef, ...setUsr]).size;
    const score = uniao > 0 ? intersecao / uniao : 0;

    if (score > melhorScore) {
      melhorScore = score;
      melhorResposta = par.a;
    }
  }

  // Limiar: pelo menos 20% de sobreposição de palavras-chave
  return melhorScore >= 0.20 ? melhorResposta : null;
}
