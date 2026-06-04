// ─── CircuitView — Simulador Real com Sons e Auto-Fiação ─────────────────────
import React, { useState, useRef, useEffect } from "react";
import { DATA_PLACAS, DATA_COMPONENTES, HardwareItem } from "../data/hardware";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2, Code, ChevronDown, ChevronUp, Search, Minus, Plus,
  Cpu, Layers, MousePointer, GitBranch, Eraser, Play, Square,
  CircuitBoard, Terminal, ZoomIn, Copy, CheckCircle2, Volume2, VolumeX
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface CPin { id:string;label:string;color:string;wireColor:string;side:"L"|"R"|"T"|"B";index:number;total:number; }
export interface PlacedComp { uid:string;item:HardwareItem;x:number;y:number;flipped:boolean;rotation:number;isBoard:boolean;pins:CPin[]; }
interface Wire { id:string;fromUid:string;fromPin:string;fx:number;fy:number;toUid:string;toPin:string;tx:number;ty:number;color:string; }
interface DrawingWire { fromUid:string;fromPin:string;startX:number;startY:number;color:string;mouseX:number;mouseY:number; }
type Tool = "select"|"wire"|"erase";
interface CompSimState {
  powered:boolean; ledOn:boolean; ledBrightness:number; blinkPhase:number;
  temperature:number;tempDir:number; humidity:number;humDir:number;
  distance:number;distDir:number; servoAngle:number;servoDir:number;
  motion:boolean;motionTimer:number; buzzing:boolean;buzzPhase:number;
  analogVal:number;analogDir:number;
}

// ─── Motor de Som (Web Audio API) ────────────────────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null;
  private continuous = new Map<string, { osc: OscillatorNode; gain: GainNode }>();

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  /** LED piscando — bip curto "zop" */
  zop(freq = 1100, vol = 0.12, dur = 0.045) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur + 0.01);
    } catch {}
  }

  /** LED continuamente aceso — zumzumzum suave */
  startHum(id: string, vol = 0.04) {
    if (this.continuous.has(id)) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 60;
      gain.gain.value = vol;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      this.continuous.set(id, { osc, gain });
    } catch {}
  }

  /** Buzzer — onda quadrada na frequência correta */
  startBuzzer(id: string, freq = 440, vol = 0.18) {
    if (this.continuous.has(id)) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      this.continuous.set(id, { osc, gain });
    } catch {}
  }

  stopContinuous(id: string) {
    const node = this.continuous.get(id);
    if (!node) return;
    try { node.gain.gain.linearRampToValueAtTime(0, this.getCtx().currentTime + 0.05); node.osc.stop(this.getCtx().currentTime + 0.06); } catch {}
    this.continuous.delete(id);
  }

  stopAll() {
    this.continuous.forEach((_, id) => this.stopContinuous(id));
  }
  setMuted(m: boolean) {
    this.continuous.forEach(n => { try { n.gain.gain.value = m ? 0 : n.gain.gain.defaultValue; } catch {} });
  }
}
const soundEngine = new SoundEngine();

// ─── Cores de pino ────────────────────────────────────────────────────────────
const PC: Record<string,string> = {
  vcc5:"#ef4444",vcc33:"#f97316",gnd:"#4b5563",dig:"#eab308",ana:"#3b82f6",
  sda:"#22c55e",scl:"#86efac",tx:"#a855f7",rx:"#c084fc",sig:"#f59e0b",out:"#eab308",
  trig:"#06b6d4",echo:"#0e7490",mosi:"#ec4899",miso:"#f472b6",sck:"#db2777",cs:"#be185d",rst:"#dc2626",en:"#ea580c",
};
type PD = {id:string;label:string;type:keyof typeof PC;side:"L"|"R"|"T"|"B"};
const BUno:PD[]=[
  {id:"5v",label:"5V",type:"vcc5",side:"L"},{id:"33v",label:"3V3",type:"vcc33",side:"L"},{id:"gnd1",label:"GND",type:"gnd",side:"L"},
  {id:"d2",label:"D2",type:"dig",side:"R"},{id:"d3",label:"D3~",type:"dig",side:"R"},{id:"d4",label:"D4",type:"dig",side:"R"},
  {id:"d5",label:"D5~",type:"dig",side:"R"},{id:"d6",label:"D6~",type:"dig",side:"R"},{id:"d7",label:"D7",type:"dig",side:"R"},
  {id:"d8",label:"D8",type:"dig",side:"R"},{id:"d9",label:"D9~",type:"dig",side:"R"},{id:"d10",label:"D10~",type:"dig",side:"R"},
  {id:"d11",label:"D11~",type:"dig",side:"R"},{id:"d12",label:"D12",type:"dig",side:"R"},{id:"d13",label:"D13",type:"dig",side:"R"},
  {id:"a0",label:"A0",type:"ana",side:"T"},{id:"a1",label:"A1",type:"ana",side:"T"},{id:"a2",label:"A2",type:"ana",side:"T"},
  {id:"a3",label:"A3",type:"ana",side:"T"},{id:"a4",label:"A4/SDA",type:"sda",side:"T"},{id:"a5",label:"A5/SCL",type:"scl",side:"T"},
  {id:"tx",label:"TX",type:"tx",side:"B"},{id:"rx",label:"RX",type:"rx",side:"B"},{id:"gnd2",label:"GND",type:"gnd",side:"B"},{id:"vin",label:"VIN",type:"vcc5",side:"B"},
];
const BESP32:PD[]=[
  {id:"33v",label:"3V3",type:"vcc33",side:"L"},{id:"gnd1",label:"GND",type:"gnd",side:"L"},{id:"en",label:"EN",type:"en",side:"L"},
  {id:"io36",label:"IO36",type:"ana",side:"L"},{id:"io39",label:"IO39",type:"ana",side:"L"},{id:"io34",label:"IO34",type:"ana",side:"L"},
  {id:"io35",label:"IO35",type:"ana",side:"L"},{id:"io32",label:"IO32",type:"ana",side:"L"},{id:"io33",label:"IO33",type:"ana",side:"L"},
  {id:"io25",label:"IO25",type:"dig",side:"R"},{id:"io26",label:"IO26",type:"dig",side:"R"},{id:"io27",label:"IO27",type:"dig",side:"R"},
  {id:"io14",label:"IO14",type:"dig",side:"R"},{id:"io12",label:"IO12",type:"dig",side:"R"},{id:"io13",label:"IO13",type:"dig",side:"R"},
  {id:"io5",label:"IO5",type:"dig",side:"R"},{id:"io23",label:"MOSI",type:"mosi",side:"R"},{id:"io22",label:"SCL",type:"scl",side:"R"},
  {id:"tx",label:"TX",type:"tx",side:"B"},{id:"rx",label:"RX",type:"rx",side:"B"},{id:"io21",label:"SDA",type:"sda",side:"B"},
  {id:"io19",label:"MISO",type:"miso",side:"B"},{id:"io18",label:"SCK",type:"sck",side:"B"},{id:"gnd2",label:"GND",type:"gnd",side:"B"},{id:"vin",label:"VIN",type:"vcc5",side:"B"},
];
const P3L:PD[]=[{id:"vcc",label:"VCC",type:"vcc5",side:"L"},{id:"out",label:"OUT",type:"out",side:"L"},{id:"gnd",label:"GND",type:"gnd",side:"L"}];
const P4L_DHT:PD[]=[{id:"vcc",label:"VCC",type:"vcc5",side:"L"},{id:"data",label:"DATA",type:"dig",side:"L"},{id:"nc",label:"NC",type:"gnd",side:"L"},{id:"gnd",label:"GND",type:"gnd",side:"L"}];
const P4L_HC:PD[]=[{id:"vcc",label:"VCC",type:"vcc5",side:"L"},{id:"trig",label:"TRIG",type:"trig",side:"L"},{id:"echo",label:"ECHO",type:"echo",side:"L"},{id:"gnd",label:"GND",type:"gnd",side:"L"}];
const P4L_I2C:PD[]=[{id:"vcc",label:"VCC",type:"vcc5",side:"L"},{id:"gnd",label:"GND",type:"gnd",side:"L"},{id:"sda",label:"SDA",type:"sda",side:"L"},{id:"scl",label:"SCL",type:"scl",side:"L"}];
const P3T_S:PD[]=[{id:"vcc",label:"VCC",type:"vcc5",side:"T"},{id:"sig",label:"SIG",type:"sig",side:"T"},{id:"gnd",label:"GND",type:"gnd",side:"T"}];
const P2:PD[]=[{id:"a",label:"+",type:"dig",side:"L"},{id:"c",label:"−",type:"gnd",side:"R"}];
const P2L:PD[]=[{id:"vcc",label:"+",type:"vcc5",side:"L"},{id:"gnd",label:"GND",type:"gnd",side:"L"}];
const PSPI:PD[]=[{id:"vcc",label:"VCC",type:"vcc5",side:"L"},{id:"gnd",label:"GND",type:"gnd",side:"L"},{id:"rst",label:"RST",type:"rst",side:"L"},{id:"cs",label:"CS",type:"cs",side:"R"},{id:"mosi",label:"MOSI",type:"mosi",side:"R"},{id:"miso",label:"MISO",type:"miso",side:"R"},{id:"sck",label:"SCK",type:"sck",side:"R"}];

function selectPins(item:HardwareItem):PD[]{
  const n=item.nome.toLowerCase(),id=item.id;
  if(id.startsWith("p"))return(n.includes("esp32")||n.includes("pico"))?BESP32:BUno;
  if(n.includes("dht"))return P4L_DHT;
  if(n.includes("hc-sr04")||n.includes("ultras"))return P4L_HC;
  if(n.includes("servo"))return P3T_S;
  if(n.includes("led rgb")||n.includes("fita"))return P3L;
  if(n.includes("buzzer")||n.includes("led"))return P2;
  if(n.includes("rfid")||n.includes("sd card")||n.includes("nfc")||n.includes("nrf24"))return PSPI;
  if(n.includes("oled")||n.includes("lcd")||n.includes("bmp")||n.includes("mpu")||n.includes("rtc")||n.includes("ds3231"))return P4L_I2C;
  if(n.includes("protoboard")||n.includes("resistor")||n.includes("kit"))return P2L;
  return P3L;
}
function buildCPins(defs:PD[]):CPin[]{
  const cnt:Record<string,number>={},idx:Record<string,number>={};
  defs.forEach(d=>{cnt[d.side]=(cnt[d.side]||0)+1;});
  return defs.map(d=>{idx[d.side]=(idx[d.side]||0);return{id:d.id,label:d.label,color:PC[d.type]||"#6b7280",wireColor:PC[d.type]||"#6b7280",side:d.side,index:idx[d.side]++,total:cnt[d.side]};});
}

const PIN_SIZE=9,PIN_OFFSET=16,PIN_SPACING=22;
function compSize(pins:CPin[],isBoard:boolean):{w:number;h:number}{
  const lr=Math.max(pins.filter(p=>p.side==="L").length,pins.filter(p=>p.side==="R").length);
  const tb=Math.max(pins.filter(p=>p.side==="T").length,pins.filter(p=>p.side==="B").length);
  if(isBoard)return{w:Math.max(210,tb*PIN_SPACING+40),h:Math.max(170,lr*PIN_SPACING+40)};
  return{w:Math.max(140,tb*PIN_SPACING+30),h:Math.max(75,lr*PIN_SPACING+30)};
}
function pinXY(pin:CPin,comp:PlacedComp,w:number,h:number):{x:number;y:number}{
  const{x,y,flipped}=comp;
  const isL=(!flipped&&pin.side==="L")||(flipped&&pin.side==="R");
  const isR=(!flipped&&pin.side==="R")||(flipped&&pin.side==="L");
  if(isL)return{x:x-PIN_OFFSET,y:y+20+pin.index*PIN_SPACING+PIN_SPACING/2};
  if(isR)return{x:x+w+PIN_OFFSET,y:y+20+pin.index*PIN_SPACING+PIN_SPACING/2};
  if(pin.side==="T")return{x:x+20+pin.index*PIN_SPACING+PIN_SPACING/2,y:y-PIN_OFFSET};
  return{x:x+20+pin.index*PIN_SPACING+PIN_SPACING/2,y:y+h+PIN_OFFSET};
}

function emoji(item:HardwareItem):string{
  const n=item.nome.toLowerCase();
  if(n.includes("arduino"))return"🤖";if(n.includes("esp32")||n.includes("esp8266"))return"📡";
  if(n.includes("raspberry")||n.includes("pico"))return"🍓";if(n.includes("dht"))return"🌡️";
  if(n.includes("hc-sr04")||n.includes("ultras"))return"📡";if(n.includes("servo"))return"⚙️";
  if(n.includes("oled")||n.includes("display"))return"🖥️";if(n.includes("lcd"))return"📟";
  if(n.includes("buzzer"))return"🔊";if(n.includes("led"))return"💡";if(n.includes("rfid"))return"💳";
  if(n.includes("mpu")||n.includes("aceler"))return"🔄";if(n.includes("rtc"))return"🕐";
  if(n.includes("relé"))return"🔌";if(n.includes("pir"))return"👁️";if(n.includes("bmp"))return"🌡️";
  if(n.includes("gps"))return"📍";if(n.includes("bluetooth"))return"📶";if(n.includes("sd card"))return"💾";
  return"🔧";
}

// ─── Auto-fiação ao carregar projeto ─────────────────────────────────────────
function autoWire(boardComp:PlacedComp, sensors:PlacedComp[]): Wire[] {
  const wires: Wire[] = [];
  const{w:bw,h:bh}=compSize(boardComp.pins,true);
  const digPins=['d2','d3','d4','d5','d6','d7','d8','d9','d10','d11','d12','d13'];
  const gndPins=['gnd1','gnd2'];
  let digIdx=0,gndIdx=0;

  sensors.forEach(sensor=>{
    const{w:sw,h:sh}=compSize(sensor.pins,false);
    const n=sensor.item.nome.toLowerCase();
    const conn:{sp:string;bp:string}[]=[];
    const isI2C=n.includes("oled")||n.includes("lcd")||n.includes("bmp")||n.includes("mpu")||n.includes("rtc")||n.includes("ds3231");
    const needsV33=isI2C||n.includes("esp");

    // VCC
    const vccBP=needsV33?"33v":"5v";
    conn.push({sp:"vcc",bp:vccBP});
    // GND
    conn.push({sp:"gnd",bp:gndPins[gndIdx%gndPins.length]});
    gndIdx++;

    // Signal pins
    if(n.includes("dht")){
      conn.push({sp:"data",bp:digPins[digIdx++]||"d13"});
    } else if(n.includes("hc-sr04")||n.includes("ultras")){
      conn.push({sp:"trig",bp:digPins[digIdx++]||"d12"});
      conn.push({sp:"echo",bp:digPins[digIdx++]||"d11"});
    } else if(n.includes("servo")){
      conn.push({sp:"sig",bp:digPins[digIdx++]||"d9"});
    } else if(isI2C){
      conn.push({sp:"sda",bp:"a4"});
      conn.push({sp:"scl",bp:"a5"});
    } else if(n.includes("rfid")||n.includes("sd card")){
      conn.push({sp:"cs",bp:"d10"});
      conn.push({sp:"mosi",bp:"d11"});
      conn.push({sp:"miso",bp:"d12"});
      conn.push({sp:"sck",bp:"d13"});
    } else {
      // generic: OUT/SIG/A pin → next digital
      const outPin=sensor.pins.find(p=>["out","sig","a","data"].includes(p.id));
      if(outPin) conn.push({sp:outPin.id,bp:digPins[digIdx++]||"d13"});
    }

    conn.forEach(c=>{
      const sp=sensor.pins.find(p=>p.id===c.sp);
      const bp=boardComp.pins.find(p=>p.id===c.bp);
      if(!sp||!bp) return;
      const{x:sx,y:sy}=pinXY(sp,sensor,sw,sh);
      const{x:bx,y:by}=pinXY(bp,boardComp,bw,bh);
      wires.push({id:`w${Math.random().toString(36).slice(2)}`,fromUid:boardComp.uid,fromPin:bp.id,fx:bx,fy:by,toUid:sensor.uid,toPin:sp.id,tx:sx,ty:sy,color:sp.color});
    });
  });
  return wires;
}

// ─── Gerador de código completo ───────────────────────────────────────────────
function generateFullCode(placed:PlacedComp[],wires:Wire[]):string{
  const board=placed.find(p=>p.isBoard);
  if(!board) return"// ⚠️ Adicione uma placa ao canvas\n";
  const sensors=placed.filter(p=>!p.isBoard);
  function pinFor(uid:string,pinId:string):string{
    const w=wires.find(x=>(x.fromUid===uid&&x.fromPin===pinId)||(x.toUid===uid&&x.toPin===pinId));
    if(!w)return"?";
    const bp=w.fromUid===board.uid?w.fromPin:w.toUid===board.uid?w.toPin:"?";
    return bp.replace("d","").replace("a","A").replace("io","");
  }
  const inc:string[]=[],decl:string[]=[],setup:string[]=["  Serial.begin(115200);"],loop:string[]=[];
  sensors.forEach(s=>{
    const n=s.item.nome.toLowerCase();
    if(n.includes("dht22")||n.includes("dht11")){
      const p=pinFor(s.uid,"data")==="?"?"4":pinFor(s.uid,"data");
      inc.push("#include <DHT.h>");
      decl.push(`#define DHT_PIN ${p}\n#define DHT_TYPE DHT22\nDHT dht(DHT_PIN, DHT_TYPE);`);
      setup.push("  dht.begin();");
      loop.push(`  float temperatura = dht.readTemperature();\n  float umidade    = dht.readHumidity();\n  if (!isnan(temperatura)) {\n    Serial.print("Temperatura: "); Serial.print(temperatura,1); Serial.println(" C");\n    Serial.print("Umidade:     "); Serial.print(umidade,1);    Serial.println(" %");\n  } else { Serial.println("Erro DHT22!"); }`);
    } else if(n.includes("hc-sr04")||n.includes("ultras")){
      const t=pinFor(s.uid,"trig")==="?"?"9":pinFor(s.uid,"trig");
      const e=pinFor(s.uid,"echo")==="?"?"10":pinFor(s.uid,"echo");
      decl.push(`#define TRIG_PIN ${t}\n#define ECHO_PIN ${e}`);
      setup.push("  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);");
      loop.push(`  digitalWrite(TRIG_PIN, LOW);  delayMicroseconds(2);\n  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);\n  digitalWrite(TRIG_PIN, LOW);\n  long dur = pulseIn(ECHO_PIN, HIGH);\n  float dist = dur * 0.034 / 2.0;\n  Serial.print("Distancia: "); Serial.print(dist,1); Serial.println(" cm");`);
    } else if(n.includes("servo")){
      const p=pinFor(s.uid,"sig")==="?"?"9":pinFor(s.uid,"sig");
      inc.push("#include <Servo.h>");
      decl.push(`Servo meuServo;\nconst int SERVO_PIN = ${p};`);
      setup.push("  meuServo.attach(SERVO_PIN);");
      loop.push("  for(int a=0;a<=180;a++){meuServo.write(a);delay(10);}\n  for(int a=180;a>=0;a--){meuServo.write(a);delay(10);}");
    } else if(n.includes("oled")){
      inc.push("#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>");
      decl.push("Adafruit_SSD1306 display(128,64,&Wire,-1);");
      setup.push("  display.begin(SSD1306_SWITCHCAPVCC,0x3C);\n  display.clearDisplay();\n  display.setTextColor(WHITE); display.setTextSize(1);\n  display.setCursor(0,0); display.println(\"DevGenius V12\"); display.display();");
      loop.push("  display.clearDisplay(); display.setCursor(0,0);\n  display.println(\"Uptime: \" + String(millis()/1000) + \"s\"); display.display();");
    } else if(n.includes("lcd")){
      inc.push("#include <Wire.h>\n#include <LiquidCrystal_I2C.h>");
      decl.push("LiquidCrystal_I2C lcd(0x27,16,2);");
      setup.push("  lcd.init(); lcd.backlight();\n  lcd.setCursor(0,0); lcd.print(\"DevGenius V12\");");
      loop.push("  lcd.setCursor(0,1); lcd.print(\"T=\"+String(millis()/1000)+\"s   \");");
    } else if(n.includes("bmp280")||n.includes("altímetro")){
      inc.push("#include <Wire.h>\n#include <Adafruit_BMP280.h>");
      decl.push("Adafruit_BMP280 bmp;");
      setup.push("  bmp.begin(0x76);");
      loop.push("  Serial.print(\"Temp: \"); Serial.print(bmp.readTemperature(),1); Serial.println(\" C\");\n  Serial.print(\"P: \");    Serial.print(bmp.readPressure()/100.0,1); Serial.println(\" hPa\");\n  Serial.print(\"Alt: \"); Serial.print(bmp.readAltitude(1013.25),0); Serial.println(\" m\");");
    } else if(n.includes("mpu6050")||n.includes("aceler")){
      inc.push("#include <Wire.h>\n#include <MPU6050.h>");
      decl.push("MPU6050 mpu;");
      setup.push("  Wire.begin(); mpu.initialize();");
      loop.push("  int16_t ax,ay,az,gx,gy,gz;\n  mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);\n  Serial.printf(\"Acc X:%.2f Y:%.2f Z:%.2f\\n\",ax/16384.0,ay/16384.0,az/16384.0);");
    } else if(n.includes("buzzer")){
      const p=pinFor(s.uid,"a")==="?"?"11":pinFor(s.uid,"a");
      decl.push(`const int BUZZER_PIN = ${p};`);
      setup.push("  pinMode(BUZZER_PIN, OUTPUT);");
      loop.push("  tone(BUZZER_PIN, 1000, 200); delay(400);\n  tone(BUZZER_PIN, 2000, 200); delay(400);\n  noTone(BUZZER_PIN);");
    } else if(n.includes("led")){
      const p=pinFor(s.uid,"a")==="?"?"13":pinFor(s.uid,"a");
      decl.push(`const int LED_PIN = ${p};`);
      setup.push("  pinMode(LED_PIN, OUTPUT);");
      loop.push("  digitalWrite(LED_PIN, HIGH); delay(500);\n  digitalWrite(LED_PIN, LOW);  delay(500);");
    } else if(n.includes("pir")){
      const p=pinFor(s.uid,"out")==="?"?"2":pinFor(s.uid,"out");
      decl.push(`const int PIR_PIN = ${p};`);
      setup.push("  pinMode(PIR_PIN, INPUT);");
      loop.push("  if(digitalRead(PIR_PIN)==HIGH){\n    Serial.println(\"Movimento detectado!\");\n  }");
    }
  });
  return `// ╔═══════════════════════════════════════════════════════════════════╗
// ║  Código gerado pelo DevGenius Circuit Simulator                   ║
// ║  Placa: ${board.item.nome.padEnd(53)}║
// ╚═══════════════════════════════════════════════════════════════════╝

${[...new Set(inc)].join("\n")}

// ─── Declarações globais ──────────────────────────────────────────────────────
${decl.join("\n\n")}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
${setup.join("\n")}
  Serial.println("DevGenius V12 — Iniciado!");
}

// ─── Loop principal ───────────────────────────────────────────────────────────
void loop() {
${loop.length?loop.map(l=>"  "+l.split("\n").join("\n  ")).join("\n\n"):"  // Conecte componentes para gerar código"}
  delay(1000);
}
`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _uid=0; const nextUid=()=>`c${++_uid}`;
function defaultSimState(item:HardwareItem):CompSimState{
  return{powered:true,ledOn:false,ledBrightness:0,blinkPhase:0,
    temperature:22+Math.random()*6,tempDir:1,humidity:55+Math.random()*20,humDir:1,
    distance:30+Math.random()*20,distDir:1,servoAngle:0,servoDir:1,
    motion:false,motionTimer:0,buzzing:false,buzzPhase:0,analogVal:512,analogDir:1};
}
function parseBlinkMs(code:string):number{
  const m=[...code.matchAll(/delay\((\d+)\)/g)].map(x=>parseInt(x[1])).filter(d=>d>0);
  return m.length?Math.min(...m):500;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function CircuitView({preload,onClearPreload}:{
  preload?:{board:HardwareItem|null;components:HardwareItem[];code?:string;projectTitle?:string}|null;
  onClearPreload?:()=>void;
}){
  const wrapRef=useRef<HTMLDivElement>(null);
  const [placed,setPlaced]=useState<PlacedComp[]>([]);
  const [wires,setWires]=useState<Wire[]>([]);
  const [drawing,setDrawing]=useState<DrawingWire|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [tool,setTool]=useState<Tool>("select");
  const [search,setSearch]=useState("");
  const [palTab,setPalTab]=useState<"boards"|"components">("boards");
  const [codeOpen,setCodeOpen]=useState(true);
  const [serialOpen,setSerialOpen]=useState(false);
  const [code,setCode]=useState("// Adicione uma placa e componentes\n");
  const [offset,setOffset]=useState({x:40,y:40});
  const [zoom,setZoom]=useState(1);
  const [dragging,setDragging]=useState<{uid:string;ox:number;oy:number}|null>(null);
  const [panStart,setPanStart]=useState<{mx:number;my:number;ox:number;oy:number}|null>(null);
  const [simulating,setSimulating]=useState(false);
  const [simStates,setSimStates]=useState<Record<string,CompSimState>>({});
  const [simSerial,setSimSerial]=useState<string[]>([]);
  const [banner,setBanner]=useState<string|null>(null);
  // Pilha de undo — guarda estado anterior antes de cada deleção
  const [undoStack,setUndoStack]=useState<{placed:PlacedComp[];wires:Wire[];label:string}[]>([]);
  const [copied,setCopied]=useState(false);
  const [muted,setMuted]=useState(false);
  const codeFromProject=useRef(false);
  const simTickRef=useRef(0);
  const [simTickState,setSimTickState]=useState(0);
  const prevLedStates=useRef<Record<string,boolean>>({});

  const items=palTab==="boards"?DATA_PLACAS:DATA_COMPONENTES;
  const filtered=items.filter(i=>i.nome.toLowerCase().includes(search.toLowerCase()));

  // Regenera código apenas quando não veio de projeto
  useEffect(()=>{if(!codeFromProject.current)setCode(generateFullCode(placed,wires));},[placed,wires]);

  // ── Carrega projeto com espaçamento e auto-fiação ─────────────────────────
  useEffect(()=>{
    if(!preload)return;
    const newPlaced:PlacedComp[]=[];

    // Layout: board à esquerda, componentes em grade à direita com espaçamento generoso
    const BOARD_X=60, BOARD_Y=140;
    const COMP_START_X=360, COMP_START_Y=60;
    const COLS=2, GAP_X=260, GAP_Y=220;

    if(preload.board){
      const pins=buildCPins(selectPins(preload.board));
      newPlaced.push({uid:nextUid(),item:preload.board,x:BOARD_X,y:BOARD_Y,flipped:false,rotation:0,isBoard:true,pins});
    }
    preload.components.forEach((comp,i)=>{
      const pins=buildCPins(selectPins(comp));
      const col=i%COLS, row=Math.floor(i/COLS);
      newPlaced.push({uid:nextUid(),item:comp,x:COMP_START_X+col*GAP_X,y:COMP_START_Y+row*GAP_Y,flipped:false,rotation:0,isBoard:false,pins});
    });

    setPlaced(newPlaced);
    setSimulating(false); soundEngine.stopAll();
    setSimSerial([]); setOffset({x:30,y:30}); setZoom(0.9);

    // Auto-fiação entre board e sensores
    const board=newPlaced.find(p=>p.isBoard);
    const sensors=newPlaced.filter(p=>!p.isBoard);
    const autoWires=board?autoWire(board,sensors):[];
    setWires(autoWires);
    setSelected(null);

    // Código do projeto
    if(preload.code){codeFromProject.current=true;setCode(preload.code);setCodeOpen(true);}
    else{codeFromProject.current=false;}

    const t=preload.projectTitle||preload.board?.nome||"Projeto";
    setBanner(`✅ "${t}" carregado — ${sensors.length} componente(s) + fiação automática`);
    setTimeout(()=>setBanner(null),4000);
    onClearPreload?.();
  },[preload]);

  // ── Sons sincronizados com mute ──────────────────────────────────────────
  useEffect(()=>{soundEngine.setMuted(muted);},[muted]);

  // ── Teclado: Delete/Backspace (apagar) + Ctrl+Z (undo) ──────────────────
  useEffect(()=>{
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      const inInput = tag === "input" || tag === "textarea";

      // Ctrl+Z — desfaz a última deleção
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !inInput) {
        e.preventDefault();
        undoLast();
        return;
      }

      // Delete / Backspace — apaga componente selecionado
      if ((e.key === "Delete" || e.key === "Backspace") && selected && !inInput) {
        e.preventDefault();
        deleteComp(selected);
      }

      if (e.key === "Escape") { setDrawing(null); setTool("select"); setSelected(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, placed, wires, undoStack]);

  // ── Simulação real com sons ───────────────────────────────────────────────
  useEffect(()=>{
    if(!simulating){setSimStates({});setSimSerial([]);soundEngine.stopAll();prevLedStates.current={};return;}
    const init:Record<string,CompSimState>={};
    placed.forEach(p=>{init[p.uid]=defaultSimState(p.item);});
    setSimStates(init);
    setSimSerial(["[DevGenius Sim] Simulação iniciada!"]);
    simTickRef.current=0;
    const blinkMs=parseBlinkMs(code);

    const iv=setInterval(()=>{
      simTickRef.current++;
      setSimTickState(simTickRef.current);
      const tick=simTickRef.current;
      const newLog:string[]=[];

      setSimStates(prev=>{
        const next={...prev};
        placed.filter(p=>!p.isBoard).forEach(comp=>{
          const n=comp.item.nome.toLowerCase();
          const s={...next[comp.uid]};
          const prevLed=prevLedStates.current[comp.uid]??false;

          if(n.includes("led")){
            // Pisca conforme delay do código (120ms/tick)
            const blinkTicks=Math.max(1,Math.round(blinkMs/120));
            s.blinkPhase=(s.blinkPhase+1)%(blinkTicks*2);
            s.ledOn=s.blinkPhase<blinkTicks;
            s.ledBrightness=s.ledOn?255:0;

            if(!muted){
              // OFF→ON: zop
              if(!prevLed&&s.ledOn) soundEngine.zop(1100,0.13,0.04);
              // Continuamente ligado sem piscar: zumzum
              if(blinkMs>=2000){
                if(s.ledOn) soundEngine.startHum(comp.uid+"_hum",0.04);
                else soundEngine.stopContinuous(comp.uid+"_hum");
              }
            }
            prevLedStates.current[comp.uid]=s.ledOn;
            if(s.blinkPhase===0) newLog.push(`LED → ${s.ledOn?"💡 HIGH":"⬛ LOW"}`);
          }
          else if(n.includes("dht")){
            s.temperature=Math.max(15,Math.min(40,s.temperature+s.tempDir*0.05+(Math.random()-0.5)*0.02));
            s.humidity=Math.max(20,Math.min(90,s.humidity+s.humDir*0.1+(Math.random()-0.5)*0.05));
            if(s.temperature>=40||s.temperature<=15)s.tempDir*=-1;
            if(s.humidity>=90||s.humidity<=20)s.humDir*=-1;
            if(tick%5===0){newLog.push(`Temperatura: ${s.temperature.toFixed(1)} °C`);newLog.push(`Umidade:     ${s.humidity.toFixed(1)} %`);}
          }
          else if(n.includes("hc-sr04")||n.includes("ultras")){
            s.distance=Math.max(2,Math.min(400,s.distance+s.distDir*0.8+(Math.random()-0.5)*0.3));
            if(s.distance>=400||s.distance<=2)s.distDir*=-1;
            if(tick%4===0)newLog.push(`Distancia: ${s.distance.toFixed(1)} cm`);
          }
          else if(n.includes("servo")){
            s.servoAngle=Math.max(0,Math.min(180,s.servoAngle+s.servoDir));
            if(s.servoAngle>=180||s.servoAngle<=0)s.servoDir*=-1;
            if(tick%20===0)newLog.push(`Servo: ${Math.round(s.servoAngle)}°`);
          }
          else if(n.includes("pir")){
            s.motionTimer=(s.motionTimer||0)+1;
            if(s.motionTimer>30&&Math.random()<0.1){s.motion=true;s.motionTimer=0;newLog.push("🚨 Movimento detectado!");}
            else if(s.motion&&Math.random()<0.3){s.motion=false;newLog.push("✅ Sem movimento");}
          }
          else if(n.includes("buzzer")){
            // Frequência conforme código (tone() típico 440-2000Hz)
            const freqMatch=code.match(/tone\([^,]+,\s*(\d+)/);
            const freq=freqMatch?parseInt(freqMatch[1]):880;
            s.buzzPhase=(s.buzzPhase+1)%8;
            s.buzzing=s.buzzPhase<4;
            if(!muted){
              if(s.buzzing) soundEngine.startBuzzer(comp.uid+"_buzz",freq,0.15);
              else soundEngine.stopContinuous(comp.uid+"_buzz");
            }
            if(tick%4===0)newLog.push(`Buzzer: ${s.buzzing?"🔊 "+freq+"Hz":"🔇"}`);
          }
          else if(n.includes("bmp")){
            s.temperature=Math.max(15,Math.min(35,s.temperature+(Math.random()-0.5)*0.1));
            if(tick%5===0)newLog.push(`P: ${(1010+Math.random()*10).toFixed(1)} hPa | Alt: ${(850+Math.random()*10).toFixed(0)} m`);
          }
          else if(n.includes("mpu")){
            if(tick%4===0)newLog.push(`Acc X:${(Math.random()*2-1).toFixed(2)} Y:${(Math.random()*2-1).toFixed(2)} Z:${(1+Math.random()*0.05).toFixed(2)}`);
          }
          else{
            s.analogVal=Math.max(0,Math.min(1023,s.analogVal+s.analogDir*5+(Math.random()-0.5)*3));
            if(s.analogVal>=1023||s.analogVal<=0)s.analogDir*=-1;
          }
          next[comp.uid]=s;
        });
        return next;
      });

      if(newLog.length) setSimSerial(p=>[...p.slice(-80),...newLog.map(l=>`[${(tick*120/1000).toFixed(1)}s] ${l}`)]);
    },120);
    return()=>{clearInterval(iv);soundEngine.stopAll();};
  },[simulating,placed,code,muted]);

  // ── Recalcula posições dos fios ──────────────────────────────────────────
  const liveWires=wires.map(w=>{
    const fc=placed.find(c=>c.uid===w.fromUid),tc=placed.find(c=>c.uid===w.toUid);
    if(!fc||!tc)return w;
    const fp=fc.pins.find(p=>p.id===w.fromPin),tp=tc.pins.find(p=>p.id===w.toPin);
    if(!fp||!tp)return w;
    const{w:fw,h:fh}=compSize(fc.pins,fc.isBoard),{w:tw,h:th}=compSize(tc.pins,tc.isBoard);
    const{x:fx,y:fy}=pinXY(fp,fc,fw,fh),{x:tx,y:ty}=pinXY(tp,tc,tw,th);
    return{...w,fx,fy,tx,ty};
  });

  function svgXY(e:React.MouseEvent){const r=wrapRef.current!.getBoundingClientRect();return{x:(e.clientX-r.left-offset.x)/zoom,y:(e.clientY-r.top-offset.y)/zoom};}
  function addToCanvas(item:HardwareItem,isBoard:boolean){
    const pins=buildCPins(selectPins(item));
    const c:PlacedComp={uid:nextUid(),item,isBoard,x:80+Math.random()*200,y:80+Math.random()*100,flipped:false,rotation:0,pins};
    setPlaced(p=>[...p,c]);setSelected(c.uid);
  }
  function deleteComp(uid:string){
    // Salva estado atual antes de deletar (para undo)
    const compToDelete = placed.find(c=>c.uid===uid);
    if(compToDelete){
      const label = compToDelete.item.nome;
      setUndoStack(prev=>[...prev.slice(-19),{placed:[...placed],wires:[...wires],label}]);
    }
    setPlaced(p=>p.filter(c=>c.uid!==uid));
    setWires(w=>w.filter(x=>x.fromUid!==uid&&x.toUid!==uid));
    if(selected===uid)setSelected(null);
  }

  function undoLast(){
    setUndoStack(prev=>{
      if(prev.length===0)return prev;
      const last=prev[prev.length-1];
      setPlaced(last.placed);
      setWires(last.wires);
      setBanner(`↩ Restaurado: ${last.label}`);
      setTimeout(()=>setBanner(null),2000);
      return prev.slice(0,-1);
    });
  }
  function onCanvasMD(e:React.MouseEvent){setPanStart({mx:e.clientX,my:e.clientY,ox:offset.x,oy:offset.y});setSelected(null);}
  function onCanvasMM(e:React.MouseEvent){
    if(panStart&&!dragging)setOffset({x:panStart.ox+(e.clientX-panStart.mx),y:panStart.oy+(e.clientY-panStart.my)});
    if(dragging){const{x,y}=svgXY(e);setPlaced(p=>p.map(c=>c.uid===dragging.uid?{...c,x:x-dragging.ox,y:y-dragging.oy}:c));}
    if(drawing){const{x,y}=svgXY(e);setDrawing(d=>d?{...d,mouseX:x,mouseY:y}:null);}
  }
  function onCanvasMU(){setPanStart(null);setDragging(null);}
  function onCompMD(e:React.MouseEvent,uid:string){
    if(tool==="erase"){deleteComp(uid);return;}
    if(tool!=="select")return;
    e.stopPropagation();
    const{x,y}=svgXY(e);const comp=placed.find(c=>c.uid===uid)!;
    setDragging({uid,ox:x-comp.x,oy:y-comp.y});setSelected(uid);
  }
  function onPinClick(e:React.MouseEvent,comp:PlacedComp,pin:CPin){
    e.stopPropagation();
    if(tool==="erase")return;
    const{w,h}=compSize(comp.pins,comp.isBoard);
    const{x,y}=pinXY(pin,comp,w,h);
    if(!drawing){setDrawing({fromUid:comp.uid,fromPin:pin.id,startX:x,startY:y,color:pin.wireColor,mouseX:x,mouseY:y});setTool("wire");}
    else{
      if(drawing.fromUid===comp.uid&&drawing.fromPin===pin.id){setDrawing(null);return;}
      setWires(prev=>[...prev,{id:nextUid(),fromUid:drawing.fromUid,fromPin:drawing.fromPin,fx:drawing.startX,fy:drawing.startY,toUid:comp.uid,toPin:pin.id,tx:x,ty:y,color:drawing.color}]);
      setDrawing(null);
    }
  }
  function copyCode(){navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000);}

  return(
    <div className="flex h-full overflow-hidden rounded-[2rem] border border-white/5 bg-neutral-950/90 shadow-2xl">
      {/* Paleta */}
      <div className="w-60 shrink-0 border-r border-white/5 bg-neutral-900/60 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/5 space-y-2">
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em]">COMPONENTES</p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full bg-neutral-950/60 border border-white/5 rounded-lg pl-7 pr-2 py-1.5 text-[11px] outline-none text-neutral-400 placeholder:text-neutral-700"/>
          </div>
          <div className="flex bg-neutral-950/60 rounded-lg p-0.5 gap-0.5">
            {(["boards","components"] as const).map(t=>(
              <button key={t} onClick={()=>setPalTab(t)} className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 ${palTab===t?"bg-cyan-500 text-black":"text-neutral-500 hover:text-white"}`}>
                {t==="boards"?<><Cpu className="w-2.5 h-2.5"/>Placas</>:<><Layers className="w-2.5 h-2.5"/>Peças</>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-visible">
          {filtered.map(item=>(
            <button key={item.id} onClick={()=>addToCanvas(item,palTab==="boards")}
              className="w-full flex items-center gap-2 p-2 bg-neutral-950/40 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 rounded-lg transition-all text-left group">
              <div className="w-8 h-8 bg-neutral-900 border border-white/5 rounded-md flex items-center justify-center text-base shrink-0">{emoji(item)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-neutral-300 truncate group-hover:text-cyan-400">{item.nome}</p>
                <p className="text-[8px] text-neutral-600 font-bold uppercase">{item.tipo}</p>
              </div>
              <Plus className="w-3 h-3 text-neutral-700 group-hover:text-cyan-400 shrink-0"/>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas + painéis */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-white/5 bg-neutral-950/60 flex items-center gap-2 flex-wrap shrink-0">
          {([{id:"select",icon:MousePointer,label:"Selec."},{id:"wire",icon:GitBranch,label:"Fio"},{id:"erase",icon:Eraser,label:"Apagar"}] as const).map(t=>(
            <button key={t.id} onClick={()=>{setTool(t.id);setDrawing(null);}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${tool===t.id?"bg-cyan-500 text-neutral-950":"bg-neutral-900 text-neutral-500 hover:text-white border border-white/5"}`}>
              <t.icon className="w-3 h-3"/>{t.label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/5 mx-1"/>
          <button onClick={()=>setZoom(z=>Math.min(2,z+0.1))} className="w-6 h-6 bg-neutral-900 border border-white/5 rounded flex items-center justify-center hover:bg-white/10"><Plus className="w-3 h-3 text-neutral-400"/></button>
          <span className="text-[9px] font-black text-neutral-600 w-8 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.max(0.3,z-0.1))} className="w-6 h-6 bg-neutral-900 border border-white/5 rounded flex items-center justify-center hover:bg-white/10"><Minus className="w-3 h-3 text-neutral-400"/></button>
          <button onClick={()=>{setZoom(1);setOffset({x:40,y:40});}} className="w-6 h-6 bg-neutral-900 border border-white/5 rounded flex items-center justify-center hover:bg-white/10" title="Reset view"><ZoomIn className="w-3 h-3 text-neutral-400"/></button>
          <div className="w-px h-4 bg-white/5 mx-1"/>
          {/* Botão UNDO (Ctrl+Z) */}
          <button
            onClick={undoLast}
            disabled={undoStack.length===0}
            title={undoStack.length>0?`Desfazer: ${undoStack[undoStack.length-1]?.label} (Ctrl+Z)`:"Nada para desfazer"}
            className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 border border-white/5 rounded-lg text-[9px] font-black uppercase text-neutral-500 hover:text-amber-400 transition-all disabled:opacity-30"
          >
            ↩ <span className="text-[8px]">Ctrl+Z</span>
            {undoStack.length>0&&<span className="w-4 h-4 bg-amber-500 text-neutral-950 rounded-full text-[8px] font-black flex items-center justify-center">{undoStack.length}</span>}
          </button>
          <button onClick={()=>{setUndoStack([]);setPlaced([]);setWires([]);setSelected(null);setDrawing(null);soundEngine.stopAll();setSimulating(false);codeFromProject.current=false;}}
            className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 border border-white/5 rounded-lg text-[9px] font-black uppercase text-neutral-500 hover:text-red-400 transition-all">
            <Trash2 className="w-3 h-3"/>Limpar
          </button>
          <div className="ml-auto flex items-center gap-2">
            {drawing&&<span className="text-[9px] font-black text-cyan-400 uppercase animate-pulse">🔴 Fio — clique em outro pino</span>}
            <button onClick={()=>{setDrawing(null);setTool("select");}} className="px-2 py-1.5 bg-neutral-900 border border-white/5 rounded-lg text-[9px] font-black uppercase text-neutral-500 hover:text-white">ESC</button>
            {/* Mute */}
            <button onClick={()=>setMuted(m=>!m)} className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${muted?"bg-red-500/20 border-red-500/30 text-red-400":"bg-neutral-900 border-white/5 text-neutral-500 hover:text-white"}`} title={muted?"Som desligado":"Som ligado"}>
              {muted?<VolumeX className="w-3.5 h-3.5"/>:<Volume2 className="w-3.5 h-3.5"/>}
            </button>
            {/* SIMULAR */}
            <button onClick={()=>setSimulating(s=>!s)} disabled={placed.length===0}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 ${simulating?"bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20":"bg-emerald-500 text-neutral-950 hover:scale-105 shadow-lg shadow-emerald-500/20"}`}>
              {simulating?<><Square className="w-3.5 h-3.5"/>PARAR</>:<><Play className="w-3.5 h-3.5 fill-current"/>SIMULAR</>}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={wrapRef} className={`flex-1 overflow-hidden relative ${tool==="wire"?"cursor-crosshair":tool==="erase"?"cursor-not-allowed":"cursor-default"}`}
          style={{background:"radial-gradient(#1f293780 1px,transparent 1px)",backgroundSize:"24px 24px"}}
          onMouseDown={onCanvasMD} onMouseMove={onCanvasMM} onMouseUp={onCanvasMU} onMouseLeave={onCanvasMU}>

          <AnimatePresence>
            {banner&&(
              <motion.div initial={{y:-40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-40,opacity:0}}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-emerald-500 text-neutral-950 px-5 py-2.5 rounded-2xl text-xs font-black shadow-xl flex items-center gap-2 pointer-events-none">
                <CircuitBoard className="w-4 h-4"/>{banner}
              </motion.div>
            )}
          </AnimatePresence>

          {simulating&&(
            <div className="absolute top-3 right-3 z-20 bg-emerald-500/90 text-neutral-950 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 bg-neutral-950 rounded-full animate-ping"/>EXECUTANDO
            </div>
          )}

          {/* ── Overlays interativos por tipo de componente ── */}
          {placed.filter(p=>!p.isBoard).map(comp=>{
            const s=simStates[comp.uid];
            const n=comp.item.nome.toLowerCase();
            const{w,h}=compSize(comp.pins,comp.isBoard);
            const cx=comp.x*zoom+offset.x;
            const cy=comp.y*zoom+offset.y;
            const cw=w*zoom; const ch=h*zoom;

            // ─ LED: lâmpada piscante ─────────────────────────────────────────
            if(n.includes("led")&&!n.includes("matriz")){
              const on=simulating&&s?.ledOn;
              return(
                <motion.div key={comp.uid+"_led"} className="absolute pointer-events-none"
                  style={{left:cx+cw/2-14,top:cy-38,width:28,height:28}}>
                  <div className="relative w-full h-full">
                    {/* Halo de luz */}
                    {on&&<div className="absolute inset-0 rounded-full animate-ping" style={{background:"#fbbf2440",transform:"scale(2)"}}/>}
                    {/* Lâmpada */}
                    <div className="w-full h-full rounded-full flex items-center justify-center text-base shadow-lg transition-all duration-200"
                      style={{background:on?"#fbbf24":"#374151",boxShadow:on?"0 0 16px #fbbf2480":undefined}}>
                      💡
                    </div>
                  </div>
                </motion.div>
              );
            }

            // ─ Servo: mostrador de ângulo ───────────────────────────────────
            if(n.includes("servo")){
              const ang=simulating&&s?s.servoAngle:0;
              const rad=(ang-90)*Math.PI/180;
              const x2=Math.cos(rad)*22, y2=Math.sin(rad)*22;
              return(
                <div key={comp.uid+"_sv"} className="absolute pointer-events-none"
                  style={{left:cx+cw/2-30,top:cy-70,width:60,height:60}}>
                  <svg width="60" height="60">
                    {/* Arco de fundo */}
                    <path d="M 5 35 A 25 25 0 0 1 55 35" fill="none" stroke="#374151" strokeWidth="4" strokeLinecap="round"/>
                    {/* Arco preenchido */}
                    <path d={`M 30 35 A 25 25 0 ${ang>90?1:0} 1 ${30+Math.cos((0-90)*Math.PI/180)*25} ${35+Math.sin((0-90)*Math.PI/180)*25}`}
                      fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" opacity="0"/>
                    {/* Ponteiro */}
                    <line x1="30" y1="35" x2={30+x2} y2={35+y2} stroke="#06b6d4" strokeWidth="3" strokeLinecap="round"/>
                    {/* Centro */}
                    <circle cx="30" cy="35" r="4" fill="#06b6d4"/>
                    <text x="30" y="14" textAnchor="middle" fill="#06b6d4" fontSize="9" fontWeight="900">{Math.round(ang)}°</text>
                  </svg>
                </div>
              );
            }

            // ─ HC-SR04: régua de distância ──────────────────────────────────
            if((n.includes("hc-sr04")||n.includes("ultras"))&&simulating&&s){
              const dist=s.distance;
              const barW=Math.min(120,Math.max(4,dist*0.5));
              return(
                <div key={comp.uid+"_hc"} className="absolute pointer-events-none"
                  style={{left:cx+cw+4,top:cy+ch/2-18,width:130}}>
                  <div className="bg-neutral-950/90 border border-cyan-500/30 rounded-lg p-1.5 space-y-1">
                    <p className="text-[8px] text-cyan-400 font-black uppercase">Distância</p>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full transition-all" style={{width:`${(dist/400)*100}%`}}/>
                    </div>
                    <p className="text-[11px] text-white font-black">{dist.toFixed(1)} cm</p>
                    {/* Régua simples */}
                    <div className="flex justify-between text-[6px] text-neutral-600 font-bold">
                      <span>0</span><span>100</span><span>200</span><span>400</span>
                    </div>
                  </div>
                </div>
              );
            }

            // ─ Potenciômetro / Joystick: slider ────────────────────────────
            if(n.includes("potenci")||n.includes("joystick")){
              const val=s?.analogVal??512;
              const pct=Math.round(val/10.23);
              return(
                <div key={comp.uid+"_pot"} className="absolute z-20"
                  style={{left:cx+cw/2-55,top:cy-64,width:110}}>
                  <div className="bg-neutral-950/95 border border-amber-500/30 rounded-xl p-2 space-y-1.5">
                    <p className="text-[8px] text-amber-400 font-black uppercase text-center">Potência: {pct}%</p>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setSimStates(p=>({...p,[comp.uid]:{...p[comp.uid],analogVal:Math.max(0,(p[comp.uid]?.analogVal??512)-51)}}))}
                        className="w-5 h-5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 rounded text-xs font-black flex items-center justify-center">−</button>
                      <input type="range" min="0" max="1023" value={val}
                        onChange={e=>setSimStates(p=>({...p,[comp.uid]:{...p[comp.uid],analogVal:parseInt(e.target.value)}}))}
                        className="flex-1 h-1.5 accent-amber-500 cursor-pointer"/>
                      <button onClick={()=>setSimStates(p=>({...p,[comp.uid]:{...p[comp.uid],analogVal:Math.min(1023,(p[comp.uid]?.analogVal??512)+51)}}))}
                        className="w-5 h-5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 rounded text-xs font-black flex items-center justify-center">+</button>
                    </div>
                  </div>
                </div>
              );
            }

            // ─ OLED / LCD: display de texto ─────────────────────────────────
            if(n.includes("oled")||n.includes("lcd")){
              return(
                <div key={comp.uid+"_disp"} className="absolute pointer-events-none"
                  style={{left:cx,top:cy,width:cw,height:ch}}>
                  <div className="w-full h-full bg-black/80 rounded flex flex-col items-start justify-start p-1 font-mono text-emerald-400 overflow-hidden"
                    style={{fontSize:Math.max(6,cw/22)+"px",lineHeight:"1.2"}}>
                    <p className="font-bold">DevGenius V12</p>
                    {simulating&&s?<>
                      <p>T:{(s.temperature||22).toFixed(1)}C</p>
                      <p>Up:{Math.floor(simTickState*0.12)}s</p>
                    </>:<p>_</p>}
                  </div>
                </div>
              );
            }

            // ─ WiFi / BT / NRF: barras de sinal ────────────────────────────
            if(n.includes("wifi")||n.includes("bluetooth")||n.includes("nrf24")||n.includes("esp-now")){
              const sinal=simulating?Math.floor(3+Math.random()*2):0;
              return(
                <div key={comp.uid+"_wifi"} className="absolute pointer-events-none"
                  style={{left:cx+cw/2-18,top:cy-34,width:36,height:24}}>
                  <div className="flex items-end justify-center gap-0.5 h-full">
                    {[1,2,3,4].map(b=>(
                      <div key={b} className="w-2 rounded-sm transition-all"
                        style={{height:`${b*22}%`,background:simulating&&b<=sinal?"#06b6d4":"#374151"}}/>
                    ))}
                  </div>
                  {simulating&&<p className="text-[7px] text-cyan-400 font-black text-center mt-0.5">{sinal>0?"-"+(60+sinal*5)+"dBm":"off"}</p>}
                </div>
              );
            }

            // ─ Sensor genérico: tooltip de leitura ──────────────────────────
            if(simulating&&s){
              let txt="";
              if(n.includes("dht"))txt=`${s.temperature.toFixed(1)}°C ${s.humidity.toFixed(0)}%`;
              else if(n.includes("pir"))txt=s.motion?"🚨 Mov!":"✅ Livre";
              else if(n.includes("buzzer"))txt=s.buzzing?"🔊":"🔇";
              else if(n.includes("bmp")||n.includes("altímetro"))txt=`${(1013+s.analogVal*0.005).toFixed(0)}hPa`;
              else if(n.includes("mpu"))txt="IMU ativo";
              else txt=`${s.analogVal.toFixed(0)}`;
              return(
                <div key={comp.uid+"_gen"} className="absolute pointer-events-none"
                  style={{left:cx+cw/2,top:cy-28,transform:"translateX(-50%)"}}>
                  <div className="bg-neutral-950/90 border border-emerald-500/40 rounded-lg px-2 py-0.5 text-center whitespace-nowrap">
                    <p className="text-[11px] text-white font-black leading-none">{txt}</p>
                  </div>
                </div>
              );
            }
            return null;
          })}

          <svg className="w-full h-full" style={{overflow:"visible"}} onMouseDown={e=>{if(e.target instanceof SVGSVGElement)onCanvasMD(e);}}>
            <g transform={`translate(${offset.x},${offset.y}) scale(${zoom})`}>
              {/* Fios com pontos animados */}
              {liveWires.map(w=>{
                const mx=(w.fx+w.tx)/2;
                return(
                  <g key={w.id}>
                    <path d={`M${w.fx} ${w.fy} C${mx} ${w.fy},${mx} ${w.ty},${w.tx} ${w.ty}`}
                      fill="none" stroke={w.color} strokeWidth={simulating?3:2.5} strokeLinecap="round"
                      style={{filter:`drop-shadow(0 0 ${simulating?7:3}px ${w.color}80)`,transition:"stroke-width 0.3s,filter 0.3s"}}/>
                    {simulating&&(
                      <circle r={3.5} fill={w.color} opacity={0.95}>
                        <animateMotion dur="1.2s" repeatCount="indefinite"
                          path={`M${w.fx} ${w.fy} C${mx} ${w.fy},${mx} ${w.ty},${w.tx} ${w.ty}`}/>
                      </circle>
                    )}
                    {tool==="erase"&&(
                      <path d={`M${w.fx} ${w.fy} C${mx} ${w.fy},${mx} ${w.ty},${w.tx} ${w.ty}`}
                        fill="none" stroke="transparent" strokeWidth={14}
                        className="cursor-pointer" onClick={e=>{e.stopPropagation();setWires(p=>p.filter(x=>x.id!==w.id));}}/>
                    )}
                  </g>
                );
              })}

              {/* Fio em desenho */}
              {drawing&&(
                <path d={`M${drawing.startX} ${drawing.startY} C${(drawing.startX+drawing.mouseX)/2} ${drawing.startY},${(drawing.startX+drawing.mouseX)/2} ${drawing.mouseY},${drawing.mouseX} ${drawing.mouseY}`}
                  fill="none" stroke={drawing.color} strokeWidth={2} strokeDasharray="6 4" opacity={0.7} pointerEvents="none"/>
              )}

              {/* Componentes */}
              {placed.map(comp=>{
                const{w,h}=compSize(comp.pins,comp.isBoard);
                const isSel=selected===comp.uid;
                const simS=simStates[comp.uid];
                const n=comp.item.nome.toLowerCase();
                const isLedOn=simulating&&simS?.ledOn&&n.includes("led");
                const isBuzzing=simulating&&simS?.buzzing&&n.includes("buzzer");
                const bgColor=comp.isBoard?"#0f172a":"#1e293b";
                const borderColor=simulating?"#22c55e":isSel?"#06b6d4":comp.isBoard?"#06b6d430":"#ffffff10";
                return(
                  <g key={comp.uid} style={{transform:`rotate(${comp.rotation}deg)`,transformOrigin:`${comp.x+w/2}px ${comp.y+h/2}px`}}>
                    {isSel&&<rect x={comp.x-5} y={comp.y-5} width={w+10} height={h+10} rx={16} fill="none" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5}/>}
                    <rect x={comp.x} y={comp.y} width={w} height={h} rx={comp.isBoard?12:8} fill={bgColor}
                      stroke={isLedOn?"#fbbf24":isBuzzing?"#f97316":borderColor}
                      strokeWidth={(isSel||simulating)?2:1}
                      className="cursor-move" onMouseDown={e=>onCompMD(e,comp.uid)}
                      style={{filter:simulating?(isLedOn?"drop-shadow(0 0 14px #fbbf2490)":isBuzzing?"drop-shadow(0 0 10px #f97316)":comp.isBoard?"drop-shadow(0 0 10px #06b6d440)":"drop-shadow(0 0 6px #22c55e30)"):comp.isBoard?"drop-shadow(0 4px 12px rgba(6,182,212,0.15))":"none",transition:"filter 0.25s,stroke 0.25s"}}/>
                    {comp.isBoard&&<rect x={comp.x} y={comp.y} width={w} height={22} rx={12} fill="#0891b240"/>}
                    {isLedOn&&<circle cx={comp.x+w/2} cy={comp.y+h/2} r={16} fill="#fbbf24" opacity={0.2}/>}
                    <text x={comp.x+w/2} y={comp.y+(comp.isBoard?42:h/2-6)} textAnchor="middle" fill="#94a3b8" fontSize={comp.isBoard?20:16} className="pointer-events-none select-none">{emoji(comp.item)}</text>
                    <text x={comp.x+w/2} y={comp.y+(comp.isBoard?64:h/2+12)} textAnchor="middle" fill={comp.isBoard?"#06b6d4":simulating?"#22c55e":"#94a3b8"} fontSize={comp.isBoard?9:8} fontWeight={700} className="pointer-events-none select-none">
                      {comp.item.nome.length>18?comp.item.nome.substring(0,16)+"…":comp.item.nome}
                    </text>
                    {isSel&&<>
                      {/* Flip ↔ */}
                      <g style={{cursor:"pointer"}}
                        onMouseDown={e=>e.stopPropagation()}
                        onClick={e=>{e.stopPropagation();setPlaced(p=>p.map(c=>c.uid===comp.uid?{...c,flipped:!c.flipped}:c));}}>
                        <rect x={comp.x+w-20} y={comp.y-24} width={20} height={20} rx={5} fill="#0891b2"/>
                        <text x={comp.x+w-10} y={comp.y-11} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={900}>↔</text>
                      </g>
                      {/* Rotate ↺ */}
                      <g style={{cursor:"pointer"}}
                        onMouseDown={e=>e.stopPropagation()}
                        onClick={e=>{e.stopPropagation();setPlaced(p=>p.map(c=>c.uid===comp.uid?{...c,rotation:(c.rotation+90)%360}:c));}}>
                        <rect x={comp.x+w-44} y={comp.y-24} width={20} height={20} rx={5} fill="#0e7490"/>
                        <text x={comp.x+w-34} y={comp.y-11} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={900}>↺</text>
                      </g>
                      {/* Delete ✕ — clicável + tecla Delete/Backspace */}
                      <g style={{cursor:"pointer"}}
                        onMouseDown={e=>e.stopPropagation()}
                        onClick={e=>{e.stopPropagation();deleteComp(comp.uid);}}>
                        <rect x={comp.x+w-68} y={comp.y-24} width={20} height={20} rx={5} fill="#be123c"/>
                        <text x={comp.x+w-58} y={comp.y-11} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontWeight={900}>✕</text>
                      </g>
                    </>}
                    {comp.pins.map(pin=>{
                      const{x:px,y:py}=pinXY(pin,comp,w,h);
                      const lx=pin.side==="L"?comp.x:pin.side==="R"?comp.x+w:px;
                      const ly=pin.side==="T"?comp.y:pin.side==="B"?comp.y+h:py;
                      const isSrc=drawing?.fromUid===comp.uid&&drawing?.fromPin===pin.id;
                      return(
                        <g key={pin.id}>
                          <line x1={lx} y1={ly} x2={px} y2={py} stroke={pin.color} strokeWidth={1.5} opacity={0.5} pointerEvents="none"/>
                          <circle cx={px} cy={py} r={isSrc?PIN_SIZE+2:PIN_SIZE} fill={pin.color}
                            stroke={isSrc?"#fff":"#00000060"} strokeWidth={isSrc?2:1}
                            className="cursor-pointer"
                            style={{filter:`drop-shadow(0 0 ${simulating?6:4}px ${pin.color}80)`,transition:"r 0.15s"}}
                            onClick={e=>onPinClick(e,comp,pin)} onMouseDown={e=>e.stopPropagation()}/>
                          <text x={pin.side==="L"?px-PIN_SIZE-3:pin.side==="R"?px+PIN_SIZE+3:px}
                            y={pin.side==="T"?py-PIN_SIZE-3:pin.side==="B"?py+PIN_SIZE+6:py+3.5}
                            textAnchor={pin.side==="L"?"end":pin.side==="R"?"start":"middle"}
                            fill={pin.color} fontSize={7} fontWeight={700} className="pointer-events-none select-none">{pin.label}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </svg>

          {placed.length===0&&(
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-3 opacity-25">
                <div className="text-5xl">🔌</div>
                <p className="font-black uppercase text-neutral-500 text-base tracking-widest">Canvas vazio</p>
                <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Clique em uma peça na paleta<br/>ou clique GO! em um projeto</p>
              </div>
            </div>
          )}
        </div>

        {/* Painéis inferiores */}
        <div className="border-t border-white/5 bg-neutral-950/90 shrink-0">
          <div className="flex items-center border-b border-white/5">
            <button onClick={()=>setCodeOpen(o=>!o)}
              className="flex items-center gap-2 px-4 h-9 text-[9px] font-black uppercase tracking-widest text-cyan-400 hover:bg-white/5 transition-colors border-r border-white/5">
              <Code className="w-3 h-3"/>Código{codeOpen?<ChevronDown className="w-3 h-3"/>:<ChevronUp className="w-3 h-3"/>}
            </button>
            <button onClick={()=>setSerialOpen(o=>!o)}
              className={`flex items-center gap-2 px-4 h-9 text-[9px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors border-r border-white/5 ${simulating?"text-emerald-400":"text-neutral-600"}`}>
              <Terminal className="w-3 h-3"/>Monitor Serial
              {simulating&&<span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>}
              {serialOpen?<ChevronDown className="w-3 h-3"/>:<ChevronUp className="w-3 h-3"/>}
            </button>
            <div className="ml-auto pr-3 flex items-center gap-2">
              {codeFromProject.current&&<span className="text-[8px] text-amber-400 font-black uppercase">📦 Código do projeto</span>}
              <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 border border-white/5 rounded-lg text-[9px] font-black uppercase text-neutral-500 hover:text-cyan-400 transition-colors">
                {copied?<><CheckCircle2 className="w-3 h-3 text-emerald-400"/>COPIADO!</>:<><Copy className="w-3 h-3"/>COPIAR</>}
              </button>
            </div>
          </div>
          {(codeOpen||serialOpen)&&(
            <div className="flex h-52">
              {codeOpen&&(
                <div className="flex-1 border-r border-white/5 overflow-hidden">
                  <textarea value={code} onChange={e=>{setCode(e.target.value);codeFromProject.current=true;}}
                    className="w-full h-full bg-transparent resize-none outline-none px-4 py-3 text-[11px] font-mono text-neutral-300 leading-relaxed scrollbar-visible"
                    spellCheck={false} style={{tabSize:2}}/>
                </div>
              )}
              {serialOpen&&(
                <div className="w-80 shrink-0 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1 border-b border-white/5">
                    <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">SAÍDA SERIAL</span>
                    <button onClick={()=>setSimSerial([])} className="text-[8px] text-neutral-700 hover:text-red-400 font-black uppercase">LIMPAR</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-relaxed scrollbar-visible space-y-0.5">
                    {simSerial.length===0?<p className="text-neutral-700 text-[9px]">Pressione SIMULAR...</p>:
                      simSerial.map((l,i)=>(
                        <div key={i} className={l.includes("🚨")?"text-red-400":l.includes("✅")?"text-emerald-400":l.startsWith("[DevGenius")?"text-cyan-400":"text-neutral-400"}>{l}</div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
