export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export type Subject = "componentes" | "placas" | "js" | "cpp" | "final";
export type Level = "basico" | "intermediario" | "pro";

const generateSet = (level: Level, subject: Subject, count: number) => {
  const levelPrefix = level.toUpperCase();
  const subName = subject.toUpperCase();
  
  const techs: Record<Subject, string[]> = {
    componentes: ["Resistor", "Capacitor", "Diodo", "Transistor", "LED", "Indutor", "Transformador", "Relé", "Cristal", "Potenciômetro", "Buzzer", "Display", "Sensor", "CI 555", "AmpOp"],
    placas: ["Arduino Uno", "ESP32", "Raspberry Pi", "Arduino Mega", "STM32", "Nano Every", "Leonardo", "Due", "Blue Pill", "NodeMCU", "MKR1000", "Teensy", "Jetson", "Pico", "BeagleBone"],
    js: ["Array.map()", "Promises", "Async/Await", "Closure", "Event Loop", "DOM", "Fetch API", "Hoisting", "Strict Mode", "Callbacks", "Prototypes", "JSON", "LocalStorage", "Scope", "Objects"],
    cpp: ["Ponteiros", "Classes", "Templates", "Namespaces", "Structs", "Overrides", "Herança", "Polimorfismo", "Malloc", "Define", "Include", "Setup", "Loop", "Interrupts", "Registers"],
    final: ["Sistema Crítico", "Automação", "Robótica", "IoT", "Firmware", "Hardware", "Software", "Debugging", "Protocólos", "Sincronia", "Latência", "Escalabilidade", "Segurança", "Energia", "Rede"]
  };

  const actions: Record<Level, string[]> = {
    basico: ["identificar", "conectar", "conhecer", "validar", "testar"],
    intermediario: ["otimizar", "sincronizar", "configurar", "depurar", "integrar"],
    pro: ["arquitetar", "encriptar", "modularizar", "escalar", "compilar"]
  };

  const results: string[] = [
    "o fluxo de sinal de controle", "a estabilidade térmica do sistema", "a eficiência energética global", 
    "a largura de banda de dados", "a integridade física do componente", "a velocidade de processamento",
    "a segurança da camada física", "a precisão da amostragem", "o tempo de resposta nominal",
    "a latência de execução", "a coerência da memória cache", "a robustez do barramento",
    "a comunicação full-duplex", "o regime de saturação magnética", "a impedância de entrada"
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const tech = techs[subject][i % techs[subject].length];
    const action = actions[level][i % actions[level].length];
    const difficultyPrefix = level === "basico" ? "Iniciante" : level === "intermediario" ? "Ninja" : "Cyber-Pro";
    
    // Create random unique options by shifting indices or combining different results
    const opts = [
      `Garantir ${results[(i) % results.length]}`,
      `Melhorar ${results[(i + 1) % results.length]}`,
      `Ajustar ${results[(i + 2) % results.length]}`,
      `Monitorar ${results[(i + 3) % results.length]}`,
      `Resetar ${results[(i + 4) % results.length]}`
    ];
    
    return {
      id: `${level}-${subject}-${i}`,
      text: `[${difficultyPrefix}] Como ${action} corretamente o(a) ${tech} para ${results[(i + 7) % results.length]}?`,
      options: opts,
      correctIndex: i % 5
    };
  });
};

export const QUESTIONS: Record<Level, Record<Subject, Question[]>> = {
  basico: {
    componentes: generateSet("basico", "componentes", 30),
    placas: generateSet("basico", "placas", 30),
    js: generateSet("basico", "js", 30),
    cpp: generateSet("basico", "cpp", 30),
    final: generateSet("basico", "final", 40),
  },
  intermediario: {
    componentes: generateSet("intermediario", "componentes", 30),
    placas: generateSet("intermediario", "placas", 30),
    js: generateSet("intermediario", "js", 30),
    cpp: generateSet("intermediario", "cpp", 30),
    final: generateSet("intermediario", "final", 40),
  },
  pro: {
    componentes: generateSet("pro", "componentes", 30),
    placas: generateSet("pro", "placas", 30),
    js: generateSet("pro", "js", 30),
    cpp: generateSet("pro", "cpp", 30),
    final: generateSet("pro", "final", 40),
  }
};
