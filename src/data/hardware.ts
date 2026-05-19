export interface HardwareItem {
  id: string;
  nome: string;
  tipo: "Básica" | "Especial" | "Normal" | "Avançado" | "PC Master";
  info: string;
  resumo?: string;
  descricao_faq?: string;
  forma_uso?: string;
  image: string;
  specs?: {
    voltagem?: string;
    pinagem?: string;
    criacao?: string;
    baseCode?: string;
    performance?: string;
    consumo?: string;
  };
}

const PC_URL = "https://www.esgamingpc.com/lifisher-m5725/1760603909597-01/jpg100-t3-scale100.jpg";
const COMPONENT_URL = "https://http2.mlstatic.com/D_NQ_NP_2X_633566-MLA99983751151_112025-F.webp";
const BOARD_URL = "https://blog.avell.com.br/wp-content/uploads/2022/11/Imagem13.jpg";
const GLOBAL_IMAGE = "/logo.png";

export const DATA_PLACAS: HardwareItem[] = [
  { 
    id: "p1", nome: "Arduino Uno R3", tipo: "Básica",
    info: "O pilar absoluto da eletrônica moderna e o núcleo de entrada do DEVGENIUS. Equipado com o microcontrolador ATmega328P de 8 bits, o Uno R3 representa a harmonia perfeita entre simplicidade e robustez industrial. Sua arquitetura de hardware é projetada para suportar variações térmicas e picos de corrente, tornando-o a unidade fundamental para prototipagem de sistemas de automação residencial, controle de malha fechada e interfaces de comunicação serial de baixa latência. No plataforma DEVGENIUS, ele atua como o controlador periférico primário para sensores analógicos e digitais.\n\nAprofundando na arquitetura, o Uno R3 utiliza um cristal de 16MHz que dita o pulso de todas as operações lógicas. Possui 32KB de memória flash, onde o seu código (o 'kernel') reside permanentemente, e 2KB de SRAM para variáveis dinâmicas. O barramento de energia é triplamente protegido por capacitores de desacoplamento, garantindo que mesmo motores de pequeno porte não causem instabilidade no processamento central. É o ponto de partida para qualquer aspirante a engenheiro no DevGenius.",
    resumo: "Placa de microcontrolador versátil e robusta para iniciantes.",
    descricao_faq: "O Arduino Uno é uma placa baseada no microcontrolador ATmega328P. Possui 14 pinos de entrada/saída digital, 6 entradas analógicas e uma conexão USB para programação. Sua construção sólida permite que suporte erros comuns de iniciantes, como inversão leve de polaridade em alguns pinos, embora não seja recomendado.",
    forma_uso: "Conecte ao PC via cabo USB, escreva seu código na IDE Arduino (C++) e faça o upload. Use os pinos digitais para sensores e atuadores simples.",
    image: "/img/placas/arduino-uno-r3.jpg",
    specs: { voltagem: "5V (7-12V Input)", pinagem: "14 Digital (6 PWM), 6 Analog", criacao: "2010 - Smart Projects", baseCode: "void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n}" }
  },
  { 
    id: "p2", nome: "Arduino Mega 2560", tipo: "Básica",
    info: "A força computacional bruta para sistemas de escala massiva. Com 256KB de memória flash e uma matriz densa de 54 pinos de entrada/saída, a Mega 2560 é a escolha definitiva para projetos que exigem múltiplos barramentos de comunicação simultâneos (I2C, SPI e 4 canais UART). No ambiente DEVGENIUS, ela é frequentemente utilizada para gerenciar algoritmos complexos de cinemática inversa em braços robóticos, controle multi-eixo de impressoras 3D e sistemas de monitoramento industrial que demandam alta densidade de pinagem sem comprometer a estabilidade do kernel.\n\nHistoricamente, a Mega foi o hardware que permitiu o nascimento de grandes projetos de código aberto, como o Marlin para impressoras 3D. Seus quatro canais seriais (UART) permitem que ela fale simultaneamente com um computador, um módulo GPS, um módulo WiFi e um display inteligente. É o 'supercomputador' das placas de 8 bits no DevGenius.",
    image: "/img/placas/arduino-mega-2560.jpg",
    specs: { voltagem: "5V", pinagem: "54 Digital, 16 Analog, 4 UART", criacao: "2010 - High Density", baseCode: "Serial.begin(115200);\nSerial.println(\"Mega Initialized\");" }
  },
  { 
    id: "p3", nome: "ESP32 DevKit V1", tipo: "Especial",
    info: "O cérebro nervoso da Internet das Coisas (IoT). Este módulo integra um processador Xtensa® Dual-Core de 32 bits rodando a 240MHz, oferecendo uma potência de cálculo que rivaliza com microcomputadores. Com stack de rede WiFi 802.11 b/g/n e Bluetooth Dual-Mode integrados nativamente ao silício, o ESP32 é capaz de processar criptografia SSL/TLS em tempo real para comunicações seguras com a nuvem DEVGENIUS. Sua tecnologia de baixo consumo 'Deep Sleep' permite que sistemas autônomos operem por meses com uma única carga de bateria, enquanto gerenciam webservers embarcados e interfaces de voz.\n\nDiferente dos Arduinos convencionais, o ESP32 opera em lógica de 3.3V, o que exige atenção redobrada ao conectar periféricos de 5V. Possui sensores de toque capacitivo, sensor de temperatura interno e o acelerador criptográfico por hardware, tornando-o a escolha perfeita para segurança biométrica e hubs inteligentes.",
    resumo: "Placa potente com WiFi e Bluetooth integrados para projetos IoT.",
    descricao_faq: "Microcontrolador de 32 bits com conectividade sem fio de alta performance. Suporta multitarefa e processamento de IA leve na borda.",
    forma_uso: "Programável via Arduino IDE ou MicroPython. Ideal para enviar dados de sensores para dashboards web ou controle remoto via smartphone.",
    image: "/img/placas/esp32-devkit.jpg",
    specs: { voltagem: "3.3V", pinagem: "38 Pinos Gpio", criacao: "2016 - Espressif Systems", baseCode: "#include <WiFi.h>\nvoid startWiFi() {\n  WiFi.begin(ssid, password);\n}" }
  },
  { 
    id: "p4", nome: "Raspberry Pi Pico", tipo: "Básica",
    info: "Uma obra-prima da engenharia de semicondutores britânica, equipada com o chip RP2040 desenvolvido internamente pela Raspberry Pi. Sua característica 'lendária' reside no subsistema PIO (Programmable I/O), que permite aos desenvolvedores DEVGENIUS criar máquinas de estado personalizadas para emular protocolos de hardware de ultra-velocidade que seriam impossíveis em outros microcontroladores. Com dois núcleos ARM Cortex-M0+ e suporte nativo a MicroPython/C++, o Pico redefine o custo-benefício em automação de precisão e controle de lógica síncrona.\n\nSua estrutura simplista porém poderosa suporta fontes de alimentação chaveadas integradas (SMPS), permitindo que receba de 1.8V a 5.5V, tornando-o perfeito para baterias AA ou carregadores de lítio. No plataforma DEVGENIUS, ele é responsável por tarefas que exigem determinismo absoluto e baixíssima latência.",
    image: "/img/placas/raspberry-pi-pico.jpg",
    specs: { voltagem: "1.8V - 5.5V", pinagem: "40 Pinos (26 Multifunção)", criacao: "2021 - RP Foundation", baseCode: "import machine\nled = machine.Pin(25, machine.Pin.OUT)" }
  },
  { 
    id: "p5", nome: "Teensy 4.1", tipo: "Avançado",
    info: "O monstro da performance no universo de microcontroladores. Operando a uma frequência recorde de 600MHz (Cortex-M7), o Teensy 4.1 é a plataforma preferida para processamento digital de sinais (DSP), áudio de alta fidelidade e cálculos matemáticos pesados de inteligência artificial na borda. Possui suporte nativo para Ethernet de alta velocidade e slots microSD, permitindo o armazenamento de gigabytes de telemetria DEVGENIUS. No nosso ecossistema, ele é o hardware de referência para simulações físicas de tempo real e controle de dinâmica de voo.\n\nA arquitetura do Teensy permite que ele 'finja' ser quase qualquer dispositivo USB: de teclado a controlador de áudio. Suas capacidades de overclock chegam a impressionantes 1GHz em condições de refrigeração adequadas. No V12, ele é o cérebro central para sistemas onde o atraso de microssegundos significa a diferença entre o sucesso e o fracasso catastrófico.",
    image: "/img/placas/teensy-4-1.jpg",
    specs: { voltagem: "3.3V", pinagem: "55 I/O, Ethernet ready", criacao: "PJRC - High Speed", baseCode: "// Otimizado para Overclock" }
  }
];

export const DATA_COMPONENTES: HardwareItem[] = [
  { 
    id: "c1", nome: "Módulo LED RGB DevGenius", tipo: "Normal", 
    info: "Uma matriz compacta de emissores semicondutores de Nitreto de Gálio (GaN) e Fosfeto de Índio e Gálio (InGaP). Este componente do DEVGENIUS permite a representação de estados do sistema através de milhões de combinações cromáticas. Cada canal (R, G, B) possui controle de intensidade via PWM, permitindo a criação de efeitos visuais dinâmicos, indicadores de erro atmosférico e interfaces de usuário táteis com feedback visual de alta fidelidade.", 
    resumo: "Um LED que pode brilhar em qualquer cor combinando Vermelho, Verde e Azul.",
    descricao_faq: "Módulo com três LEDs integrados em um único encapsulamento. Possui pinos dedicados para cada cor primária.",
    forma_uso: "Conecte os pinos R, G e B a saídas PWM do microcontrolador com resistores de 220 ohms. Use analogWrite() para misturar as cores.",
    image: "/img/componentes/led-rgb.jpg",
    specs: { voltagem: "2.0V - 3.4V", pinagem: "4 Pinos (R, G, B, Catodo)", criacao: "Optoeletrônica Avançada" }
  },
  { 
    id: "c2", nome: "Sensor Ultrassônico HC-SR04", tipo: "Avançado", 
    info: "O sonar digital de alta precisão do plataforma DEVGENIUS. Este dispositivo emite pulsos mecânicos de 40kHz, inaudíveis ao ouvido humano, e mede o tempo de retorno do eco para calcular distâncias com precisão de 3mm. É o componente vital para a consciência espacial de robôs autônomos e sistemas de prevenção de colisão, processando o tempo de voo (ToF) da onda sonora através do kernel de cálculo GENIUS para mapear ambientes em tempo real.", 
    resumo: "Mede distâncias de até 4 metros usando ondas sonoras.",
    descricao_faq: "Funciona emitindo um sinal ultrassônico e medindo o tempo que ele leva para retornar após bater em um objeto.",
    forma_uso: "Alimente com 5V, envie um pulso de 10us no pino 'Trig' e meça a duração do pulso de nível alto no pino 'Echo'.",
    image: "/img/componentes/hc-sr04.jpg",
    specs: { voltagem: "5V", pinagem: "4 Pinos (VCC, Trig, Echo, GND)", criacao: "Acústica Digital" }
  },
  { 
    id: "c3", nome: "Display OLED I2C 128x64", tipo: "Avançado", 
    info: "Uma tela de matriz ativa composta por diodos orgânicos que emitem luz própria. Ao contrário dos LCDs convencionais, este display OLED não necessita de backlight, resultando em pretos absolutos e uma visibilidade impressionante sob luz solar direta. No DEVGENIUS, ele é o portal de saída de dados primário, exibindo gráficos de telemetria, logs de depuração e interfaces gráficas ricas com consumo energético minimalista via protocolo I2C.", 
    image: "/img/componentes/oled-128x64.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "4 Pinos (VCC, GND, SDA, SCL)", criacao: "Micro Display Semicondutores" }
  },
  { 
    id: "c4", nome: "Sensor de Umidade e Temperatura DHT22", tipo: "Avançado", 
    info: "O sensor de clima profissional para estações de monitoramento GENIUS. Utilizando um termistor NTC de alta precisão e um sensor capacitivo de polímero para umidade, o DHT22 fornece saídas digitais calibradas com baixa latência. Sua capacidade de medir umidade relativa de 0 a 100% o torna indispensável para controle climático automatizado em estufas e data centers monitorados pelo firmware V12.", 
    resumo: "Sensor digital para medir temperatura e umidade com alta precisão.",
    descricao_faq: "Sensor calibrado em fábrica que fornece leituras estáveis através de um protocolo serial de fio único.",
    forma_uso: "Conecte o pino de dados a uma entrada digital e use a biblioteca DHT.h. Requer um resistor de pull-up entre VCC e Dados.",
    image: "/img/componentes/dht22.jpg",
    specs: { voltagem: "3.3V - 5.5V", pinagem: "4 Pinos (1 NC)", criacao: "Atmosférica Digital" }
  },
  { 
    id: "c5", nome: "Servo Motor MG996R High Torque", tipo: "Avançado", 
    info: "A musculatura mecânica do DEVGENIUS. Este servo de alto torque possui engrenagens metálicas que garantem durabilidade e força em movimentos de precisão. Capaz de girar 180 graus com posicionamento exato controlado por sinal PWM, é o componente principal para direção de veículos robóticos, movimentação de câmeras e articulações de exoesqueletos controlados digitalmente.", 
    image: "/img/componentes/servo-mg996r.jpg",
    specs: { voltagem: "4.8V - 7.2V", pinagem: "3 Pinos (VCC, GND, PWM)", criacao: "Dinâmica Mecatrônica" }
  },
  { 
    id: "c6", nome: "Módulo RTC DS3231 Precision", tipo: "Avançado", 
    info: "O guardião do tempo cronológico para o plataforma DEVGENIUS. Este Real-Time Clock possui um cristal compensado por temperatura (TCXO) que garante um erro de tempo inferior a 2 minutos por ano. Mesmo em caso de falha de energia na placa principal, o DS3231 mantém a contagem de segundos, minutos, horas e datas, permitindo que sistemas GENIUS agendem tarefas críticas com precisão de milissegundos.", 
    image: "/img/componentes/ds3231-rtc.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "6 Pinos (I2C)", criacao: "Cronometria de Silício" }
  },
  { 
    id: "c7", nome: "Relé de Estado Sólido 5V", tipo: "Normal", 
    info: "A ponte de comando entre a eletrônica de controle GENIUS e a potência residencial. Este módulo permite que sinais digitais de baixa voltagem acionem cargas de 110V/220V AC (lâmpadas, motores, eletrodomésticos) com isolamento galvânico total através de um optoacoplador, garantindo que o processador V12 esteja protegido contra surtos da rede elétrica externa.", 
    image: "/img/componentes/rele-estado-solido.jpg",
    specs: { voltagem: "5V Trigger", pinagem: "3 In / 3 Out", criacao: "Interface de Potência" }
  },
  { 
    id: "c8", nome: "Acelerômetro e Giroscópio MPU6050", tipo: "Avançado", 
    info: "O sentido de equilíbrio e orientação do DEVGENIUS. Integrando um giroscópio de 3 eixos e um acelerômetro de 3 eixos no mesmo chip, o MPU6050 detecta inclinação, rotação e aceleração linear com 16 bits de resolution. Essencial para estabilização de drones e dispositivos vestíveis que interagem com o movimento humano através do processador de movimento digital (DMP).", 
    image: "/img/componentes/mpu6050.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "8 Pinos (I2C / SPI)", criacao: "Sensores Inerciais MEMS" }
  },
  { 
    id: "c9", nome: "Teclado Matricial 4x4", tipo: "Normal", 
    info: "A interface de entrada tátil clássica. Com 16 botões organizados em uma malha de linhas e colunas, permite ao usuário DEVGENIUS inserir códigos numéricos, senhas e comandos de configuração. Sua estrutura mecânica de membrana é projetada para durabilidade extrema e economia de pinos I/O do microcontrolador através da técnica de multiplexação.", 
    image: "/img/componentes/teclado-4x4.jpg",
    specs: { voltagem: "3V - 12V", pinagem: "8 Pinos", criacao: "Interface Humano-Máquina" }
  },
  { 
    id: "c10", nome: "Sensor de Corrente ACS712", tipo: "Avançado", 
    info: "O medidor de fluxo energético para o DEVGENIUS. Baseado no efeito Hall, este sensor permite medir correntes AC ou DC de forma não invasiva e com isolamento total. É fundamental para sistemas de monitoramento de consumo elétrico que enviam dados para o dashboard GENIUS, permitindo diagnósticos preventivos em motores e fontes de alimentação.", 
    image: "/img/componentes/acs712.jpg",
    specs: { voltagem: "5V", pinagem: "3 Pinos Out", criacao: "Metrologia de Potência" }
  },
  { 
    id: "c11", nome: "Módulo Bluetooth HC-05", tipo: "Avançado", 
    info: "A ponte de comunicação sem fio clássica para o ecossistema Arduino. Este módulo permite que seu projeto se comunique com smartphones e outros dispositivos via Bluetooth. Com alcance de até 10 metros, é ideal para controle remoto de robôs e automação residencial simples via comandos seriais.", 
    image: "/img/componentes/hc-05.jpg",
    specs: { voltagem: "3.6V - 6V", pinagem: "6 Pinos", criacao: "Comunicação Modular" }
  },
  { 
    id: "c12", nome: "Módulo Leitor RFID-RC522", tipo: "Avançado", 
    info: "Identificação por radiofrequência para sistemas de controle de acesso. Este módulo opera em 13.56 MHz e permite ler e escrever dados em tags e cartões RFID. No sistema DEVGENIUS, é a solução padrão para segurança de portas e sistemas de inventário inteligente.", 
    image: "/img/componentes/rfid-rc522.jpg",
    specs: { voltagem: "3.3V", pinagem: "8 Pinos SPI", criacao: "Segurança de Proximidade" }
  },
  { 
    id: "c13", nome: "Sensor de Chuva e Umidade de Solo", tipo: "Normal", 
    info: "Duo de sensores para monitoramento ambiental externo. Detecta a presença de gotas de água em sua superfície ou a condutividade elétrica do solo para determinar a necessidade de irrigação. No DEVGENIUS, este conjunto gerencia jardins inteligentes e telhados retráteis automáticos.", 
    image: "/img/componentes/sensor-umidade-solo.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "4 Pinos (AO/DO)", criacao: "AgroTech Digital" }
  },
  { 
    id: "c14", nome: "Display LCD 16x2 com I2C", tipo: "Normal", 
    info: "O visor de caracteres alfanuméricos mais versátil. Com o adaptador I2C integrado, utiliza apenas dois pinos do microcontrolador para exibir mensagens, valores de sensores e menus de configuração. Essencial para interfaces de usuário compactas no plataforma DEVGENIUS.", 
    image: "/img/componentes/lcd-16x2-i2c.jpg",
    specs: { voltagem: "5V", pinagem: "4 Pinos I2C", criacao: "Interface Visual Clássica" }
  },
  { 
    id: "c15", nome: "Driver Motor de Passo A4988", tipo: "Avançado", 
    info: "O controlador de precisão para motores de passo. Com suporte a microstepping, permite movimentos extremamente suaves e precisos em eixos de impressoras 3D e máquinas CNC. O kernel GENIUS utiliza este driver para orquestrar movimentos complexos de posicionamento linear.", 
    image: "/img/componentes/driver-a4988.jpg",
    specs: { voltagem: "8V - 35V Motor", pinagem: "16 Pinos", criacao: "Controle de Movimento Final" }
  },
  {
    id: "c16", nome: "Módulo GPS NEO-6M V2", tipo: "Especial",
    info: "Localização por satélite global de alta sensibilidade. Equipado com uma antena cerâmica integrada, o NEO-6M fornece coordenadas geográficas, altitude e tempo preciso via protocolo NMEA. No plataforma DEVGENIUS, é o componente chave para navegação de drones e rastreamento de frotas em tempo real.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "3V - 5V", pinagem: "4 Pinos UART", criacao: "u-blox Position Engine" }
  },
  {
    id: "c17", nome: "Joystick Analógico", tipo: "Normal",
    info: "Interface de controle de dois eixos e um botão. Proporciona controle preciso para movimentação de robôs e navegação em menus complexos. No DEVGENIUS, é utilizado para simulação de direção humana.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "5V", pinagem: "5 Pinos", criacao: "Interface Gamer" }
  },
  {
    id: "c18", nome: "Sensor de Chama", tipo: "Normal",
    info: "Detecta radiação infravermelha emitida pelo fogo. Essencial para sistemas de segurança e robôs de combate a incêndio baseados no DEVGENIUS.",
    image: "/img/componentes/sensor-chama.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "3 Pinos", criacao: "Segurança Térmica" }
  },
  {
    id: "c19", nome: "Potenciômetro Rotativo 10k", tipo: "Normal",
    info: "Resistor variável fundamental para controle analógico. No sistema V12, regula volume, brilho de displays e parâmetros de algoritmos em tempo real.",
    image: "/img/componentes/potenciometro.jpg",
    specs: { voltagem: "0V - 12V", pinagem: "3 Pinos", criacao: "Controle Analógico" }
  },
  {
    id: "c20", nome: "Buzzer Passivo", tipo: "Normal",
    info: "Transdutor piezoelétrico para geração de sons e tons musicais. Utilizado no DEVGENIUS para feedback sonoro e alarmes personalizados via frequências PWM.",
    image: "/img/componentes/buzzer-passivo.jpg",
    specs: { voltagem: "3V - 12V", pinagem: "2 Pinos", criacao: "Feedback Acústico" }
  },
  {
    id: "c21", nome: "Módulo Sensor de Luz LDR", tipo: "Normal",
    info: "Mede a intensidade da luz ambiente. Perfeito para acionamento automático de lâmpadas ou ajuste de brilho de telas no ecossistema Genius.",
    image: "/img/componentes/ldr.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "3 Pinos", criacao: "Óptica Digital" }
  },
  {
    id: "c22", nome: "Módulo Laser 5mW", tipo: "Normal",
    info: "Emissor de laser de baixa potência para sistemas de alarme e mira. No DEVGENIUS, serve para detecção de passagem e barreiras ópticas.",
    image: "/img/componentes/laser-5mw.jpg",
    specs: { voltagem: "5V", pinagem: "3 Pinos", criacao: "Sinalização Fotônica" }
  },
  {
    id: "c23", nome: "Sensor de Som High Sensitivity", tipo: "Normal",
    info: "Microfone com ajuste de sensibilidade que detecta níveis de ruído. Utilizado para controle de iluminação por palmas ou detecção de incidentes sonoros.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "4V - 6V", pinagem: "4 Pinos", criacao: "Acústica Ambiental" }
  },
  {
    id: "c24", nome: "Sensor de Temperatura DS18B20", tipo: "Avançado",
    info: "Sensor digital de um fio (OneWire) para medições precisas em ambientes industriais. Pode ser usado em série com dezenas de outros sensores no mesmo pino do V12.",
    image: "/img/componentes/ds18b20.jpg",
    specs: { voltagem: "3V - 5.5V", pinagem: "3 Pinos", criacao: "Cálculo Térmico" }
  },
  {
    id: "c25", nome: "Sensor de Toque Capacitivo", tipo: "Normal",
    info: "Substitui botões mecânicos por uma interface tátil moderna. Detecta a mudança de capacitância ao toque humano, sem necessidade de contato metálico.",
    image: "/img/componentes/toque-capacitivo.jpg",
    specs: { voltagem: "2V - 5.5V", pinagem: "3 Pinos", criacao: "Interface Haptics" }
  },
  {
    id: "c26", nome: "Sensor de Inclinação de Mercúrio", tipo: "Normal",
    info: "Detecta a mudança de posição física do componente. Importante para sistemas de segurança contra tombamento em dispositivos portáteis GENIUS.",
    image: "/img/componentes/sensor-inclinacao.jpg",
    specs: { voltagem: "Varia", pinagem: "2 Pinos", criacao: "Estática e Dinâmica" }
  },
  {
    id: "c27", nome: "Sensor de Batida (Knock)", tipo: "Normal",
    info: "Detecta impactos mecânicos e vibrações bruscas. No DEVGENIUS, atua como sistema de alarme contra intrusão e monitoramento de integridade estrutural.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "5V", pinagem: "3 Pinos", criacao: "Mecânica Digital" }
  },
  {
    id: "c28", nome: "Módulo Reed Switch", tipo: "Normal",
    info: "Sensor magnético que aciona na presença de um imã. Principal componente para alarmes de janelas e portas no ecossistema de automação V12.",
    image: "/img/componentes/reed-switch.jpg",
    specs: { voltagem: "Varia", pinagem: "3 Pinos", criacao: "Indução Magnética" }
  },
  {
    id: "c29", nome: "Display 7 Segmentos 1 Dígito", tipo: "Básica",
    info: "Display clássico para exibição numérica de 0 a 9. Baseado em LEDs individuais, é utilizado para contadores e indicadores de estado simples.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "1.8V - 2.2V", pinagem: "10 Pinos", criacao: "Display Visual" }
  },
  {
    id: "c30", nome: "Display 7 Segmentos 4 Dígitos", tipo: "Normal",
    info: "Versão expandida para exibir horas, pontuações e valores decimais. No DEVGENIUS, serve como visor secundário de telemetria.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "3.3V - 5V", pinagem: "12 Pinos", criacao: "Metrologia Visual" }
  },
  {
    id: "c31", nome: "Matriz de LED 8x8 MAX7219", tipo: "Avançado",
    info: "Interface gráfica de baixa resolução para animações e mensagens roláveis. Controlada via barramento SPI para economizar pinos do microcontrolador.",
    image: "/img/componentes/matriz-led-8x8.jpg",
    specs: { voltagem: "5V", pinagem: "5 Pinos SPI", criacao: "Interface Dinâmica" }
  },
  {
    id: "c32", nome: "Módulo NFC PN532", tipo: "Especial",
    info: "Comunicação de campo próximo para pagamentos e tags de alta tecnologia. O portal de entrada para o mundo sem fio de curto alcance do V12.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "3.3V - 5V", pinagem: "Barramento I2C/SPI", criacao: "Near Field Tech" }
  },
  {
    id: "c33", nome: "Altímetro BMP280", tipo: "Avançado",
    info: "Mede pressão atmosférica e temperatura com precisão cirúrgica. Essencial para drones calcularem altitude absoluta e estações meteorológicas V12.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "1.8V - 3.6V", pinagem: "6 Pinos I2C", criacao: "Barometria de Precisão" }
  },
  {
    id: "c34", nome: "Encoder Rotativo KY-040", tipo: "Normal",
    info: "Dispositivo de entrada sem limites que conta incrementos e decrementos. Ideal para navegação fluida em menus do sistema operacional Genius.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "5V", pinagem: "5 Pinos", criacao: "Controle de Interface" }
  },
  {
    id: "c35", nome: "Sensor de Gás MQ-2", tipo: "Avançado",
    info: "Detecta vazamentos de GLP, Fumaça e Gás Metano. O pulmão de segurança para ambientes industriais monitorados pelo firmware do plataforma DEVGENIUS.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "5V", pinagem: "4 Pinos", criacao: "Química Digital" }
  },
  {
    id: "c36", nome: "Módulo NRF24L01 + Antena", tipo: "Especial",
    info: "Rádio de ultra-longo alcance opera em 2.4GHz. Permite a criação de redes mesh entre múltiplos dispositivos Genius a distâncias de até 1km.",
    image: "/img/componentes/nrf24l01.jpg",
    specs: { voltagem: "3.3V", pinagem: "8 Pinos SPI", criacao: "RF Networking" }
  },
  {
    id: "c37", nome: "Motor de Passo 28BYJ-48", tipo: "Normal",
    info: "Motor de alta precisão angular para movimentos discretos. Acompanha driver ULN2003 para facilitar o controle via lógica digital GENIUS.",
    image: "/img/componentes/motor-28byj48.jpg",
    specs: { voltagem: "5V - 12V", pinagem: "5 Pinos Motor", criacao: "Mecânica Linear" }
  },
  {
    id: "c38", nome: "Protoboard 830 Pontos", tipo: "Básica",
    info: "O campo de batalha da prototipagem rápida. Onde cada circuito do sistema V12 nasce antes de se tornar hardware definitivo.",
    image: "/img/componentes/protoboard-830.jpg",
    specs: { voltagem: "Varia", pinagem: "830 Pontos", criacao: "Base de Testes" }
  },
  {
    id: "c39", nome: "Módulo Sensor de Movimento PIR", tipo: "Normal",
    info: "Detecta a presença humana através de infravermelho passivo. O sentinela invisível para sistemas de segurança residencial automatizados.",
    image: "/img/componentes/pir-hc-sr501.jpg",
    specs: { voltagem: "4.5V - 20V", pinagem: "3 Pinos", criacao: "Detecção Biológica" }
  },
  {
    id: "c40", nome: "Sensor de Cores TCS3200", tipo: "Avançado",
    info: "Analisa a luz e retorna a composição RGB do objeto. Utilizado em sistemas de separação automática e visão computacional de baixo custo do V12.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "2.7V - 5.5V", pinagem: "8 Pinos", criacao: "Visão Cromática" }
  },
  {
    id: "c41", nome: "Módulo Leitor de Cartão SD", tipo: "Avançado",
    info: "Expansão de memória massiva para logs de dados e arquivos mp3. No plataforma DEVGENIUS, permite o armazenamento de terabytes de telemetria.",
    image: "/img/componentes/leitor-sd.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "6 Pinos SPI", criacao: "Storage Modular" }
  },
  {
    id: "c42", nome: "Sensor de Pulso Cardíaco", tipo: "Especial",
    info: "Monitora a frequência cardíaca em tempo real através de pletismografia óptica. Integra dados de saúde humana diretamente ao DEVGENIUS.",
    image: "/img/componentes/sensor-pulso.jpg",
    specs: { voltagem: "3.3V - 5V", pinagem: "3 Pinos Analógicos", criacao: "Bio-Feedback Digital" }
  },
  {
    id: "c43", nome: "Módulo Sensor de Obstáculos IR", tipo: "Normal",
    info: "Detecta objetos próximos por reflexão infravermelha. Essencial para robôs que precisam evitar colisões enquanto exploram ambientes desconhecidos.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "3.3V - 5V", pinagem: "3 Pinos", criacao: "Navegação Tact" }
  },
  {
    id: "c44", nome: "Kit Resistores 300 Unid", tipo: "Básica",
    info: "O exército silencioso da eletrônica. Protegem cada LED e componente do sistema Genius contra excesso de corrente.",
    image: "/img/componentes/kit-resistores.jpg",
    specs: { voltagem: "Varia", pinagem: "Axial", criacao: "Resistência Base" }
  },
  {
    id: "c45", nome: "Capacitor Eletrolítico Kit", tipo: "Básica",
    info: "Estabilizadores de voltagem e filtros de ruído. Garantem que a energia fornecida ao DEVGENIUS seja limpa e estável.",
    image: "/img/componentes/kit-capacitores.jpg",
    specs: { voltagem: "Varia", pinagem: "Radial", criacao: "Filtro Capacitivo" }
  },
  {
    id: "c46", nome: "Módulo DFPlayer Mini MP3", tipo: "Especial",
    info: "A voz do DEVGENIUS. Capaz de reproduzir arquivos sonoros reais com alta qualidade diretamente de um cartão micro SD.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "3.3V - 5V", pinagem: "16 Pinos", criacao: "Processamento de Áudio" }
  },
  {
    id: "c47", nome: "Chassis Robótico 2 Rodas", tipo: "Normal",
    info: "A estrutura física para mobilidade robótica. Onde o cérebro V12 e os sensores são montados para criar veículos inteligentes.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "Varia", pinagem: "Chassis Acrílico", criacao: "Mecânica Estrutural" }
  },
  {
    id: "c48", nome: "Cabo USB A-B Blue", tipo: "Básica",
    info: "O cordão umbilical que conecta o desenvolvedor ao hardware V12. Responsável pelo upload de firmware e depuração serial.",
    image: "/img/componentes/cabo-usb-ab.jpg",
    specs: { voltagem: "5V Data", pinagem: "USB Standard", criacao: "Link de Dados" }
  },
  {
    id: "c49", nome: "Bateria Recarregável Li-Ion", tipo: "Especial",
    info: "Densidade energética superior para robôs autônomos. Alimenta o sistema DEVGENIUS em missões remotas fora da rede elétrica.",
    image: "/img/componentes/bateria-li-ion.jpg",
    specs: { voltagem: "3.7V - 7.4V", pinagem: "2 Pinos JST", criacao: "Energia Química" }
  },
  {
    id: "c50", nome: "Módulo Conversor de Tensão LM2596", tipo: "Avançado",
    info: "Regulador step-down que transforma altas voltagens em energia estável para o DEVGENIUS com eficiência industrial.",
    image: "/img/componentes/lm2596.jpg",
    specs: { voltagem: "Varia Out", pinagem: "4 Pinos Terminal", criacao: "Regulação de Potência" }
  },
  {
    id: "c51", nome: "LED Azul Difuso 5mm", tipo: "Normal",
    info: "Componente optoeletrônico básico de 5mm com acabamento difuso para melhor espalhamento da luz azul. Ideal para indicadores de estado e sinalização simples em projetos baseados no DEVGENIUS.",
    image: "/img/componentes/_placeholder.svg",
    specs: { voltagem: "2.8V - 3.2V", pinagem: "2 Pinos (Anodo/Catodo)", criacao: "Semicondutores Básicos" }
  }
];

export const DATA_PC_HARDWARE: HardwareItem[] = [
  { 
    id: "h1", nome: "NVIDIA RTX 4090 Legend Edition", tipo: "PC Master", 
    info: "O ápice absoluto do processamento gráfico e computação paralela. Com assombrosos 24GB de VRAM GDDR6X e uma matriz de núcleos Tensor e RT de quarta geração, esta GPU é o motor visual por trás do DEVGENIUS. Ela processa trilhas de Ray Tracing em tempo real e acelera modelos de deep learning locais with uma largura de banda que ultrapassa os 1TB/s. No nosso ambiente, é utilizada para renderizar simulações físicas hiper-realistas e interfaces neurais com fidelidade absoluta.", 
    resumo: "A placa de vídeo mais poderosa do mundo para IA e Ray Tracing.",
    descricao_faq: "Processador gráfico de ultra-performance com 16.384 núcleos CUDA. Projetada para cargas de trabalho massivas de IA, renderização 3D e gaming em 8K.",
    forma_uso: "Instale em um slot PCIe 5.0 x16 e conecte uma fonte de no mínimo 850W. Use drivers oficiais NVIDIA para habilitar aceleração DLSS 3 e Ray Tracing.",
    image: "/img/pcs/rtx-4090.jpg",
    specs: { performance: "83 TFLOPS / CUDA Elite", consumo: "450W TDP Nominal", criacao: "Arquitetura Ada Lovelace de Titânio", baseCode: "nvidia-smi --query-gpu=utilization.gpu --format=csv" }
  },
  { 
    id: "h2", nome: "Intel Core i9-14900K Unlocked", tipo: "PC Master", 
    info: "O coração computacional indomável. Com 24 núcleos de alto processamento operando a uma frequência recorde de 6.0GHz, o i9-14900K é o responsável por orquestrar cada thread do kernel GENIUS. Sua tecnologia Intel® Thermal Velocity Boost permite alcançar picos de performance que compilam sistemas inteiros em frações de segundo. É a unidade de processamento central necessária para rodar simulações simultâneas de hardware enquanto mantém o sistema operacional fluido e responsivo.", 
    image: "/img/pcs/i9-14900k.jpg",
    specs: { performance: "6.0GHz Turbo / 36MB Cache", consumo: "125W Base / 253W Boost", criacao: "Raptor Lake Refresh Platinum", baseCode: "stress-ng --cpu 24" }
  },
  { 
    id: "h3", nome: "Memória RAM DDR5 64GB Dominator", tipo: "PC Master", 
    info: "Barramento de dados de ultra-velocidade com latência zero. Operando a extraordinários 7200MT/s, este kit de memória DDR5 garante que o DEVGENIUS nunca enfrente gargalos de acesso aleatório. Possui dissipadores de calor forjados em alumínio aeronáutico e controle térmico inteligente via software. Fundamental para manter bibliotecas gigantescas de ativos 3D e bancos de dados de hardware carregados instantaneamente na memória volátil do sistema.", 
    image: "/img/pcs/ram-ddr5.jpg",
    specs: { performance: "7200 MT/s / Dual-Path", consumo: "1.4V XMP 3.0 High-End", criacao: "Dual-Channel High Bandwidth", baseCode: "free -h" }
  },
  { 
    id: "h4", nome: "SSD NVMe Gen5 4TB Fury", tipo: "PC Master", 
    info: "A fronteira final do armazenamento de estado sólido. Com velocidades de leitura sequencial que atingem 12.000 MB/s, este drive PCIe 5.0 elimina os tempos de carregamento no ecossistema GENIUS. Seus controladores de memória de última geração e gerenciamento térmico ativo permitem que o sistema operacional acesse terabytes de informação em microssegundos, garantindo uma experiência de desenvolvimento sem interrupções.", 
    image: "/img/pcs/ssd-nvme.jpg",
    specs: { performance: "12,000 MB/s Read / 11,000 Write", consumo: "Active 11W / Stealth Idle", criacao: "PCIe 5.0 NVMe Technology", baseCode: "df -h" }
  },
  { 
    id: "h5", nome: "Fonte Rog Thor 1200W Titanium", tipo: "PC Master", 
    info: "A usina de força que alimenta o DEVGENIUS. Com certificação 80 PLUS Titanium, esta fonte garante uma eficiência energética superior a 94%, reduzindo o calor e o ruído elétrico. Possui um painel OLED integrado que exibe o consumo de energia em tempo real, permitindo aos usuários ter controle total sobre a demanda elétrica dos seus sistemas PC Master de alta performance.", 
    image: "/img/pcs/fonte-1200w.jpg",
    specs: { performance: "1200W Pure Power", consumo: "Eff > 94%", criacao: "Estabilidade de Voltagem Platina", baseCode: "sensor -u" }
  }
];
