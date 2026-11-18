"use strict";
/* =========================================================
   Fórmula CETI — corrida de Fórmula em pseudo-3D
   CETI Prof. José Amável · 1º ano D · InovaTEC
   ========================================================= */

const $ = (id) => document.getElementById(id);
const cv = $("cv"), stage = $("stage");
const ctx = cv.getContext("2d", { alpha: false });
const IS_TOUCH = matchMedia("(pointer: coarse)").matches;
if (IS_TOUCH) document.body.classList.add("touch");
const AUTO_GAS = IS_TOUCH;
let LOW = false;

/* ---------- utilidades ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeIn = (a, b, p) => a + (b - a) * p * p;
const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
const wrap = (v, m) => { v %= m; return v < 0 ? v + m : v; };
function overlap(x1, w1, x2, w2, p) { const h = (p || 1) / 2; return !((x1 + w1 * h) < (x2 - w2 * h) || (x1 - w1 * h) > (x2 + w2 * h)); }
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
function fmt(sec) { if (sec == null || !isFinite(sec)) return "--:--.-"; const t = Math.max(0, sec); const m = Math.floor(t / 60), s = Math.floor(t) % 60, d = Math.floor(t * 10) % 10; return m + ":" + String(s).padStart(2, "0") + "." + d; }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function buzz(p) { try { if (IS_TOUCH && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
function mk(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h); return c; }
function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function ellipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }

/* ---------- constantes ---------- */
const SEG = 200, RUMBLE = 3, ROAD_W = 2000, CAM_H = 1000, FOV = 100;
const CAM_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const PLAYER_Z = CAM_H * CAM_DEPTH;
const MAXSPEED = SEG * 60;
const KMH = 330;
const CAR_W = 620, CAR_X = CAR_W / ROAD_W, CAR_LEN = 170;
const START = 40;
const WALL = 1.35, OFF = 1.1, PIT_X = 1.62;
let DRAW = 300;

/* ---------- equipes ---------- */
const LIVERIES = [
  { name: "CETI Vermelha", desc: "a clássica", color: "#E8202A", dark: "#8E0F15", accent: "#FFFFFF", helmet: "#FFD21F", num: "10" },
  { name: "CETI Azul", desc: "noite azul", color: "#1D3FAF", dark: "#0E1F5C", accent: "#FFD21F", helmet: "#FFFFFF", num: "10" },
  { name: "CETI Branca", desc: "branca e vermelha", color: "#EDEDF2", dark: "#9A9AA8", accent: "#E8202A", helmet: "#E8202A", num: "10" },
  { name: "CETI Preta", desc: "preta e dourada", color: "#25252D", dark: "#0C0C10", accent: "#E8B53A", helmet: "#E8B53A", num: "10" },
];
const RIVALS = [
  { name: "Carnaúba GP", tag: "CAR", color: "#1F8A4C", dark: "#0E4A28", accent: "#FFFFFF", helmet: "#FFD21F", num: "7" },
  { name: "Parnaíba Racing", tag: "PAR", color: "#19B8E6", dark: "#0A6A88", accent: "#0B1E3A", helmet: "#FFFFFF", num: "11" },
  { name: "Serra Motors", tag: "SER", color: "#FF7A1A", dark: "#9A4206", accent: "#1A1A1A", helmet: "#2E66FF", num: "14" },
  { name: "Delta Team", tag: "DEL", color: "#FFD21F", dark: "#9C7E00", accent: "#1A1A1A", helmet: "#E8202A", num: "22" },
  { name: "Oeiras F", tag: "OEI", color: "#7B3FD0", dark: "#3E1A75", accent: "#FFD21F", helmet: "#FFFFFF", num: "27" },
  { name: "Poti Speed", tag: "POT", color: "#2E66FF", dark: "#14318A", accent: "#FFFFFF", helmet: "#19B8E6", num: "31" },
  { name: "Cajuína Team", tag: "CAJ", color: "#FF4FA0", dark: "#9A1A58", accent: "#FFFFFF", helmet: "#1A1A1A", num: "3" },
  { name: "Sete Cidades", tag: "SET", color: "#AEB5C2", dark: "#5E6472", accent: "#E8202A", helmet: "#1F8A4C", num: "5" },
  { name: "Teresina GP", tag: "THE", color: "#7A1F2E", dark: "#3A0A12", accent: "#E8B53A", helmet: "#FFFFFF", num: "8" },
];
const RIVAL_BASE = [0.84, 0.855, 0.87, 0.885, 0.9, 0.915, 0.93, 0.95, 0.97];
const DIFFS = [{ name: "Fácil", mul: 0.84 }, { name: "Normal", mul: 0.92 }, { name: "Difícil", mul: 1.0 }];
const LAPS_OPT = [3, 5];
const CAR = { top: 0.97, acc: 1.05, grip: 1.05 };
const BILL = [["CETI PROF.", "JOSÉ AMÁVEL"], ["NOSSA LÓGICA", "CONSTRÓI O FUTURO"], ["INOVATEC", "1º ANO D"], ["GRANDE PRÊMIO", "CETI"]];

const TRACKS = [
  {
    id: "autodromo", name: "Autódromo do Piauí", desc: "dia de sol, arquibancadas", kind: "day", fogD: 3.2,
    sky: ["#2F7FDB", "#5FA8EC", "#A8D6F7", "#E2F3FF"], fog: "#CFE6F2",
    ground: ["#3E9140", "#368538"], rumble: ["#FFFFFF", "#E8202A"], road: ["#55555E", "#51515A"], edge: "#F2F2F2",
    layout: [[40, 60, 40, 0, 0], [20, 30, 20, 6, 0], [20, 40, 20, -2, 10], [30, 50, 30, 0, 20], [15, 20, 15, -5, 0],
      [15, 15, 15, 4, 0], [15, 15, 15, -4, 0], [25, 40, 25, 0, -20], [15, 25, 15, 7, 0], [30, 60, 30, 0, 0],
      [20, 40, 20, -3, -10], [20, 30, 20, 3, 0], [30, 40, 30, 0, 0]],
  },
  {
    id: "teresina", name: "Rua de Teresina", desc: "circuito de rua à noite", kind: "night", fogD: 3.8,
    sky: ["#03050C", "#0A1124", "#18244A", "#2A3466"], fog: "#0E1220",
    ground: ["#2C2C35", "#28282F"], rumble: ["#FFFFFF", "#E8202A"], road: ["#3B3B45", "#37373F"], edge: "#E6E6EE",
    layout: [[40, 60, 40, 0, 0], [10, 20, 10, 6, 0], [30, 40, 30, 0, 0], [10, 20, 10, -6, 0], [25, 40, 25, 0, 10],
      [10, 15, 10, 6, 0], [10, 15, 10, -5, 0], [30, 60, 30, 0, -10], [15, 25, 15, -6, 0], [20, 30, 20, 0, 0],
      [10, 20, 10, 5, 0], [30, 50, 30, 0, 0], [15, 20, 15, -4, 0], [30, 40, 30, 0, 0]],
  },
  {
    id: "serra", name: "Circuito da Serra", desc: "subidas no pôr do sol", kind: "sunset", fogD: 3,
    sky: ["#2A1D5C", "#7A3E8A", "#FF7A5A", "#FFC27A"], fog: "#E8A27A",
    ground: ["#8A9A4A", "#7F8E44"], rumble: ["#FFFFFF", "#E8202A"], road: ["#5A5560", "#55505B"], edge: "#F2EEE6",
    layout: [[40, 60, 40, 0, 0], [25, 40, 25, 3, 40], [20, 30, 20, -4, 0], [30, 40, 30, 0, -40], [20, 40, 20, 5, 20],
      [15, 20, 15, -5, 0], [30, 60, 30, 0, -30], [20, 30, 20, -3, 30], [15, 25, 15, 6, 0], [30, 40, 30, 0, -20],
      [20, 40, 20, 2, 0], [30, 40, 30, 0, 0]],
  },
];

/* ---------- recordes ---------- */
const REC_KEY = "formula-ceti-v1";
let rec = {};
try { rec = JSON.parse(localStorage.getItem(REC_KEY) || "{}") || {}; } catch (e) { rec = {}; }
function saveRec() { try { localStorage.setItem(REC_KEY, JSON.stringify(rec)); } catch (e) {} }
const prefs = rec._p || {};
let selLiv = clamp(prefs.liv | 0, 0, 3), selTrack = clamp(prefs.track | 0, 0, 2), selDiff = clamp(prefs.diff == null ? 1 : prefs.diff | 0, 0, 2), selLaps = clamp(prefs.laps | 0, 0, 1);
function savePrefs() { rec._p = { liv: selLiv, track: selTrack, diff: selDiff, laps: selLaps }; saveRec(); }
const recKey = () => TRACKS[selTrack].id + "-" + LAPS_OPT[selLaps];

/* =========================================================
   CARRO DE FÓRMULA VISTO DE TRÁS
   ========================================================= */
function tireShape(g, x, y, w, h, band) {
  g.fillStyle = "#0D0D10"; rrect(g, x, y, w, h, w * 0.22); g.fill();
  g.fillStyle = "#24242B"; g.fillRect(x + w * 0.12, y + h * 0.06, w * 0.76, h * 0.05);
  g.fillStyle = band; g.fillRect(x + w * 0.1, y + h * 0.12, w * 0.8, Math.max(1, h * 0.03));
}
function drawF1(g, cx, by, w, t, o) {
  o = o || {};
  const h = w * 0.62;
  g.fillStyle = "rgba(0,0,0,.45)"; ellipse(g, cx, by - h * 0.01, w * 0.56, h * 0.07);
  // pneus dianteiros e asa da frente (mais longe)
  tireShape(g, cx - w * 0.38, by - h * 0.36, w * 0.13, h * 0.27, "#E8202A");
  tireShape(g, cx + w * 0.25, by - h * 0.36, w * 0.13, h * 0.27, "#E8202A");
  g.fillStyle = t.dark; g.fillRect(cx - w * 0.36, by - h * 0.39, w * 0.72, h * 0.04);
  // laterais
  g.fillStyle = t.color;
  g.beginPath(); g.moveTo(cx - w * 0.31, by - h * 0.22); g.quadraticCurveTo(cx - w * 0.3, by - h * 0.46, cx - w * 0.1, by - h * 0.5);
  g.lineTo(cx + w * 0.1, by - h * 0.5); g.quadraticCurveTo(cx + w * 0.3, by - h * 0.46, cx + w * 0.31, by - h * 0.22); g.closePath(); g.fill();
  g.fillStyle = t.dark; g.fillRect(cx - w * 0.31, by - h * 0.27, w * 0.62, h * 0.05);
  // capacete e halo
  const hx = cx + (o.steer || 0) * w * 0.012, hy = by - h * 0.79, hr = w * 0.052;
  g.fillStyle = t.helmet; circle(g, hx, hy, hr);
  g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(hx - hr, hy + hr * 0.1, hr * 2, hr * 0.35);
  g.strokeStyle = "#16161C"; g.lineWidth = Math.max(1.5, w * 0.018);
  g.beginPath(); g.moveTo(cx - w * 0.085, by - h * 0.7); g.quadraticCurveTo(cx - w * 0.085, by - h * 0.92, cx, by - h * 0.92); g.quadraticCurveTo(cx + w * 0.085, by - h * 0.92, cx + w * 0.085, by - h * 0.7); g.stroke();
  // cobertura do motor
  const eg = g.createLinearGradient(0, by - h * 0.78, 0, by - h * 0.24); eg.addColorStop(0, t.color); eg.addColorStop(1, t.dark);
  g.fillStyle = eg;
  g.beginPath(); g.moveTo(cx - w * 0.14, by - h * 0.24); g.lineTo(cx - w * 0.075, by - h * 0.72); g.lineTo(cx + w * 0.075, by - h * 0.72); g.lineTo(cx + w * 0.14, by - h * 0.24); g.closePath(); g.fill();
  g.fillStyle = t.accent; g.fillRect(cx - w * 0.018, by - h * 0.72, w * 0.036, h * 0.3);
  if (w > 70) {
    g.font = `900 italic ${Math.round(h * 0.15)}px "Barlow Condensed",Arial,sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = Math.max(2, h * 0.025); g.strokeStyle = t.dark; g.strokeText(t.num, cx, by - h * 0.34); g.fillStyle = t.accent; g.fillText(t.num, cx, by - h * 0.34);
  }
  // assoalho e difusor
  g.fillStyle = "#141418";
  g.beginPath(); g.moveTo(cx - w * 0.3, by - h * 0.04); g.lineTo(cx - w * 0.24, by - h * 0.22); g.lineTo(cx + w * 0.24, by - h * 0.22); g.lineTo(cx + w * 0.3, by - h * 0.04); g.closePath(); g.fill();
  g.fillStyle = "#2E2E38"; for (let k = -2; k <= 2; k++) g.fillRect(cx + k * w * 0.06 - w * 0.006, by - h * 0.2, w * 0.012, h * 0.15);
  // luz traseira central
  if (o.brake) { g.fillStyle = "rgba(255,40,50,.35)"; ellipse(g, cx, by - h * 0.13, w * 0.09, h * 0.07); }
  g.fillStyle = o.brake || o.blink ? "#FF3B3B" : "#5A1014"; g.fillRect(cx - w * 0.032, by - h * 0.16, w * 0.064, h * 0.05);
  // pneus traseiros
  tireShape(g, cx - w * 0.5, by - h * 0.52, w * 0.2, h * 0.52, o.tireBand || "#E8202A");
  tireShape(g, cx + w * 0.3, by - h * 0.52, w * 0.2, h * 0.52, o.tireBand || "#E8202A");
  // aerofólio traseiro (abre com a asa móvel)
  const wy = by - h * 0.99;
  g.fillStyle = "#16161C"; g.fillRect(cx - w * 0.015, wy + h * 0.16, w * 0.03, h * 0.22);
  g.fillStyle = t.color; g.fillRect(cx - w * 0.355, wy, w * 0.035, h * 0.44); g.fillRect(cx + w * 0.32, wy, w * 0.035, h * 0.44);
  g.fillStyle = "#16161C"; g.fillRect(cx - w * 0.32, wy + h * 0.1, w * 0.64, h * 0.075);
  g.fillStyle = t.dark; g.fillRect(cx - w * 0.32, wy + (o.drs ? -h * 0.01 : h * 0.035), w * 0.64, h * 0.05);
  if (w > 90) { g.fillStyle = "#FFFFFF"; g.font = `800 ${Math.round(h * 0.06)}px Arial,sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CETI", cx, wy + h * 0.138); }
}

/* ---------- cenário ---------- */
function grandstand(r, night) {
  return mk(400, 170, (g, w, h) => {
    g.fillStyle = night ? "#22222B" : "#5A5F6B"; g.beginPath(); g.moveTo(0, 26); g.lineTo(w, 6); g.lineTo(w, 20); g.lineTo(0, 38); g.closePath(); g.fill();
    g.fillStyle = night ? "#1A1A22" : "#8A909C"; for (let x = 10; x < w; x += 64) g.fillRect(x, 20, 6, h - 40);
    g.fillStyle = night ? "#15151C" : "#C9CED8"; g.fillRect(0, 34, w, h - 54);
    const cols = ["#E8202A", "#FFFFFF", "#FFD21F", "#2E66FF", "#1F8A4C", "#FF7A1A", "#FF4FA0", "#19B8E6"];
    for (let y = 40; y < h - 26; y += 8) {
      g.fillStyle = night ? "#2A2A33" : "#9EA4B0"; g.fillRect(0, y + 6, w, 2);
      for (let x = 2; x < w; x += 6) if (r() < 0.82) { g.fillStyle = pick(r, cols); g.fillRect(x, y, 4, 5); g.fillStyle = "#E0B48A"; g.fillRect(x + 1, y - 2, 2, 2); }
    }
    g.fillStyle = "#E8202A"; g.fillRect(0, h - 22, w, 22);
    g.fillStyle = "#FFFFFF"; g.font = "900 italic 15px Arial,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("CETI PROF. JOSÉ AMÁVEL  ·  INOVATEC  ·  1º ANO D", w / 2, h - 11);
  });
}
function tireWall() {
  return mk(240, 70, (g, w, h) => {
    for (let row = 0; row < 2; row++) for (let x = 0; x < w; x += 20) {
      const cx = x + 10 + (row ? 10 : 0), cy = h - 16 - row * 26;
      if (cx > w - 8) continue;
      g.fillStyle = "#121216"; circle(g, cx, cy, 13);
      g.fillStyle = ((x / 20) | 0) % 2 ? "#E8202A" : "#F2F2F2"; g.fillRect(cx - 13, cy - 3, 26, 6);
      g.fillStyle = "#2A2A30"; circle(g, cx, cy, 5);
    }
  });
}
function tree(r) {
  return mk(160, 200, (g) => {
    g.fillStyle = "#5A3A20"; g.fillRect(74, 120, 12, 80);
    for (let i = 0; i < 14; i++) { g.fillStyle = pick(r, ["#2E7A2E", "#3A8E36", "#25652A", "#47A040"]); circle(g, 40 + r() * 80, 50 + r() * 80, 22 + r() * 18); }
  });
}
function carnauba(r) {
  return mk(180, 320, (g, w, h) => {
    g.fillStyle = "#7A6550"; g.fillRect(84, 90, 12, h - 90);
    g.fillStyle = "#5E4C3C"; for (let y = 100; y < h; y += 14) g.fillRect(84, y, 12, 3);
    g.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI + (i / 25) * Math.PI * 1.15 - 0.08, len = 55 + r() * 25;
      g.strokeStyle = pick(r, ["#4E8A3A", "#5FA048", "#3E7430"]); g.lineWidth = 5;
      g.beginPath(); g.moveTo(90, 92); g.lineTo(90 + Math.cos(a) * len, 92 + Math.sin(a) * len * 0.9); g.stroke();
    }
    g.fillStyle = "#3E7430"; circle(g, 90, 92, 10);
  });
}
function floodlight() {
  return mk(90, 340, (g, w, h) => {
    g.strokeStyle = "#4A4A55"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(38, h); g.lineTo(42, 60); g.moveTo(52, h); g.lineTo(48, 60); g.stroke();
    for (let y = 70; y < h; y += 18) { g.beginPath(); g.moveTo(39, y); g.lineTo(51, y + 9); g.stroke(); }
    g.fillStyle = "#2A2A33"; g.fillRect(14, 30, 62, 34);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) { g.fillStyle = "#FFF7D6"; g.fillRect(18 + k * 20, 34 + j * 15, 14, 11); }
    const gl = g.createRadialGradient(45, 47, 10, 45, 47, 45); gl.addColorStop(0, "rgba(255,248,214,.55)"); gl.addColorStop(1, "rgba(255,248,214,0)");
    g.fillStyle = gl; circle(g, 45, 47, 45);
  });
}
function garage(t) {
  return mk(300, 150, (g, w, h) => {
    g.fillStyle = "#D8DAE0"; g.fillRect(0, 10, w, h - 10);
    g.fillStyle = "#A9ACB6"; g.fillRect(0, 0, w, 14);
    for (let k = 0; k < 2; k++) {
      const x = 18 + k * 145;
      g.fillStyle = t.color; g.fillRect(x - 4, 26, 126, 16);
      g.fillStyle = "#FFFFFF"; g.font = "900 italic 12px Arial,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t.name.toUpperCase(), x + 59, 34);
      g.fillStyle = "#1A1A20"; g.fillRect(x, 46, 118, h - 46);
      g.fillStyle = "#2E2E38"; g.fillRect(x + 8, h - 30, 100, 30);
      g.fillStyle = "#FFD21F"; g.fillRect(x, h - 4, 118, 4);
    }
  });
}
function wallAd(text, bg, fg) {
  return mk(320, 64, (g, w, h) => {
    g.fillStyle = "#B8BAC2"; g.fillRect(0, 18, w, h - 18);
    g.fillStyle = "#8A8C96"; g.fillRect(0, h - 8, w, 8);
    g.fillStyle = bg; g.fillRect(6, 22, w - 12, h - 34);
    g.fillStyle = fg; g.font = "900 italic 22px Arial,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, 22 + (h - 34) / 2 + 1);
    g.strokeStyle = "#6A6C76"; g.lineWidth = 2; for (let y = 2; y < 18; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = "#6A6C76"; for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 3, 20);
  });
}
function billboard(lines, night) {
  return mk(320, 200, (g, w, h) => {
    g.fillStyle = night ? "#2A2A33" : "#4A4A55"; g.fillRect(70, 120, 10, 80); g.fillRect(240, 120, 10, 80);
    g.fillStyle = night ? "#15151C" : "#FFFFFF"; rrect(g, 4, 4, w - 8, 124, 8); g.fill();
    g.lineWidth = 6; g.strokeStyle = "#E8202A"; rrect(g, 4, 4, w - 8, 124, 8); g.stroke();
    g.textAlign = "center"; g.textBaseline = "middle";
    const cols = night ? ["#FFFFFF", "#FFD21F"] : ["#16161C", "#E8202A"];
    lines.forEach((t, k) => {
      let fs = k === 0 ? 36 : 30;
      g.font = `900 italic ${fs}px Arial,sans-serif`;
      while (g.measureText(t).width > w - 40 && fs > 12) { fs -= 1; g.font = `900 italic ${fs}px Arial,sans-serif`; }
      g.fillStyle = cols[k]; g.fillText(t, w / 2, k === 0 ? 46 : 92);
    });
  });
}
function gantry(night) {
  return mk(640, 240, (g, w, h) => {
    g.fillStyle = "#2A2A33"; g.fillRect(0, 20, 24, h - 20); g.fillRect(w - 24, 20, 24, h - 20);
    g.fillStyle = "#16161C"; g.fillRect(0, 10, w, 92);
    const sq = 12;
    for (let x = 0; x < w; x += sq) for (let y = 10; y < 34; y += sq) { g.fillStyle = (((x + y - 10) / sq) | 0) % 2 ? "#111" : "#FFF"; g.fillRect(x, y, sq, sq); }
    for (let k = 0; k < 5; k++) { const x = w / 2 - 120 + k * 60; g.fillStyle = "#0A0A0C"; rrect(g, x - 20, 40, 40, 40, 6); g.fill(); g.fillStyle = "#3A0A0E"; circle(g, x, 51, 8); circle(g, x, 70, 8); }
    g.fillStyle = "#FFFFFF"; g.font = "900 italic 14px Arial,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("GRANDE PRÊMIO CETI · INOVATEC", w / 2, 93);
    if (night) { g.fillStyle = "#E8202A"; g.fillRect(0, 100, w, 3); }
  });
}
function mesa(r) {
  return mk(480, 220, (g, w, h) => {
    const pts = [[0, h], [14, 70]];
    let x = 30; while (x < w - 30) { pts.push([x, 44 + r() * 14]); x += 30 + r() * 30; }
    pts.push([w - 16, 60], [w, h]);
    g.save(); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
    const gr = g.createLinearGradient(0, 40, 0, h); gr.addColorStop(0, "#DB8654"); gr.addColorStop(0.5, "#B85A3A"); gr.addColorStop(1, "#8A3A28");
    g.fillStyle = gr; g.fill(); g.clip();
    for (let y = 60; y < h; y += 13) { g.fillStyle = (y / 13) % 2 < 1 ? "rgba(255,220,180,.13)" : "rgba(80,20,10,.12)"; g.fillRect(0, y, w, 6); }
    g.restore();
    for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? "#7D8B4A" : "#5F6B37"; circle(g, r() * w, h - 4 - r() * 8, 10 + r() * 12); }
  });
}
function shrub(r) { return mk(200, 110, (g) => { for (let i = 0; i < 10; i++) { g.fillStyle = pick(r, ["#7D8B4A", "#93A15A", "#5F6B37"]); circle(g, 30 + r() * 140, 60 + r() * 34, 22 + r() * 22); } }); }

const CAR_SPR = { w: 240, h: 150, body: 200, by: 144 };
CAR_SPR.ww = CAR_W * CAR_SPR.w / CAR_SPR.body;
CAR_SPR.ay = CAR_SPR.by / CAR_SPR.h;
const SPR = {};
function makeSprites() {
  const r = rng(11);
  SPR.stand = [{ c: grandstand(r, false), ww: 5200 }, { c: grandstand(r, true), ww: 5200 }];
  SPR.tires = { c: tireWall(), ww: 1700 };
  SPR.tree = [{ c: tree(r), ww: 1500 }, { c: tree(r), ww: 1800 }];
  SPR.palm = [{ c: carnauba(r), ww: 1300 }, { c: carnauba(r), ww: 1450 }];
  SPR.flood = { c: floodlight(), ww: 650 };
  SPR.garage = RIVALS.map((t) => ({ c: garage(t), ww: 3000 }));
  SPR.wall = [{ c: wallAd("INOVATEC", "#E8202A", "#FFFFFF"), ww: 2600 }, { c: wallAd("CETI", "#16161C", "#FFD21F"), ww: 2600 }, { c: wallAd("1º ANO D", "#2E66FF", "#FFFFFF"), ww: 2600 }];
  SPR.bill = { day: BILL.map((t) => ({ c: billboard(t, false), ww: 2000 })), night: BILL.map((t) => ({ c: billboard(t, true), ww: 2000 })) };
  SPR.gantry = { day: { c: gantry(false), ww: 2 * ROAD_W * 1.7 }, night: { c: gantry(true), ww: 2 * ROAD_W * 1.7 } };
  SPR.mesa = [{ c: mesa(r), ww: 7000 }, { c: mesa(r), ww: 8200 }];
  SPR.shrub = [{ c: shrub(r), ww: 900 }, { c: shrub(r), ww: 1100 }];
  SPR.car = RIVALS.map((t) => ({ n: mk(CAR_SPR.w, CAR_SPR.h, (g) => drawF1(g, CAR_SPR.w / 2, CAR_SPR.by, CAR_SPR.body, t, {})), b: mk(CAR_SPR.w, CAR_SPR.h, (g) => drawF1(g, CAR_SPR.w / 2, CAR_SPR.by, CAR_SPR.body, t, { brake: true })) }));
}

/* =========================================================
   PISTA
   ========================================================= */
let segments = [], N = 0, L = 1, track = TRACKS[0], PIT_IN = 0, PIT_OUT = 0, BOX_SEG = 0;
function lastY() { return segments.length ? segments[segments.length - 1].p2.world.y : 0; }
function addSeg(curve, y) {
  const n = segments.length;
  segments.push({ index: n, curve, sprites: [], cars: [], dark: Math.floor(n / RUMBLE) % 2 === 1, fog: 1, clip: 0, check: false, pit: false, drs: false, grid: 0,
    p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} }, p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} } });
}
function addRoad(e, h, l, c, y) {
  const sY = lastY(), eY = sY + y * SEG, t = e + h + l;
  for (let i = 0; i < e; i++) addSeg(easeIn(0, c, i / e), easeInOut(sY, eY, i / t));
  for (let i = 0; i < h; i++) addSeg(c, easeInOut(sY, eY, (e + i) / t));
  for (let i = 0; i < l; i++) addSeg(easeInOut(c, 0, i / l), easeInOut(sY, eY, (e + h + i) / t));
}
function addSprite(n, spr, offset, ax) { if (n < 0 || n >= segments.length) return; segments[n].sprites.push({ spr, offset, ax: ax != null ? ax : offset < 0 ? -1 : 0 }); }
function segAt(z) { return segments[Math.floor(z / SEG) % N]; }
const inPit = (i) => i >= PIT_IN || i <= PIT_OUT;

function buildTrack(t) {
  track = t; segments = [];
  for (const r of t.layout) addRoad(r[0], r[1], r[2], r[3], r[4]);
  addRoad(40, 40, 40, 0, -lastY() / SEG);
  segments[segments.length - 1].p2.world.y = 0;
  N = segments.length; L = N * SEG;
  segments[START].check = true; segments[START + 1].check = true;
  PIT_IN = N - 70; PIT_OUT = START + 40; BOX_SEG = START + 12;
  for (const s of segments) s.pit = inPit(s.index);
  for (let k = 0; k < 10; k++) segments[START - (3 + k * 2)].grid = k % 2 ? 1 : -1;
  // zonas de asa móvel: retas compridas
  let i0 = segments.findIndex((s) => s.curve !== 0);
  let run = [];
  for (let k = 1; k <= N; k++) {
    const s = segments[(i0 + k) % N];
    if (s.curve === 0 && Math.abs(s.p2.world.y - s.p1.world.y) < 60) run.push(s);
    else { if (run.length >= 100) run.slice(15, Math.floor(run.length * 0.62)).forEach((x) => (x.drs = true)); run = []; }
  }
  // cenário
  const r = rng(t.id.length * 53 + 7), night = t.kind === "night";
  const bill = SPR.bill[night ? "night" : "day"];
  addSprite(START, SPR.gantry[night ? "night" : "day"], 0, -0.5);
  for (let i = N - 60; i < N + START + 40; i += 9) addSprite(i % N, SPR.stand[night ? 1 : 0], -1.55);
  for (let i = PIT_IN + 4, k = 0; i < N + PIT_OUT - 6; i += 7, k++) addSprite(i % N, SPR.garage[k % SPR.garage.length], 2.12);
  let bk = 0;
  for (let i = PIT_OUT + 40; i < PIT_IN - 40; i += 120 + Math.floor(r() * 60)) { addSprite(i, bill[bk % bill.length], (bk % 2 ? 1 : -1) * 1.55); bk++; }
  for (let i = PIT_OUT + 10; i < PIT_IN - 10; i++) {
    const s = segments[i];
    if (Math.abs(s.curve) >= 3 && i % 4 === 0) addSprite(i, SPR.tires, s.curve > 0 ? -1.5 : 1.5);
  }
  if (t.id === "autodromo") {
    for (let i = PIT_OUT + 6; i < PIT_IN - 6; i += 6) { if (r() < 0.7) addSprite(i, pick(r, SPR.tree), (r() < 0.5 ? -1 : 1) * (1.9 + r() * 2.2)); }
    for (let i = PIT_OUT + 60; i < PIT_IN - 60; i += 160) for (let k = 0; k < 3; k++) addSprite(i + k * 8, SPR.stand[0], 1.7);
  } else if (t.id === "teresina") {
    for (let i = PIT_OUT + 2; i < PIT_IN - 2; i += 5) { addSprite(i, pick(r, SPR.wall), -1.47); addSprite(i, pick(r, SPR.wall), 1.47); }
    for (let i = 3; i < N; i += 16) { addSprite(i, SPR.flood, -1.62); if (!inPit(i)) addSprite(i, SPR.flood, 1.62); }
    for (let i = PIT_OUT + 8; i < PIT_IN - 8; i += 9) if (r() < 0.6) addSprite(i, pick(r, SPR.palm), (r() < 0.5 ? -1 : 1) * (2.2 + r() * 1.5));
  } else {
    for (let i = PIT_OUT + 4; i < PIT_IN - 4; i += 7) { if (r() < 0.75) addSprite(i, r() < 0.6 ? pick(r, SPR.shrub) : pick(r, SPR.palm), (r() < 0.5 ? -1 : 1) * (1.7 + r() * 2)); }
    for (let i = PIT_OUT + 20; i < PIT_IN - 20; i += 40 + Math.floor(r() * 30)) addSprite(i, pick(r, SPR.mesa), (r() < 0.5 ? -1 : 1) * (3.3 + r() * 1.6));
  }
}

/* =========================================================
   TELA E FUNDO
   ========================================================= */
let W = 0, H = 0, DPR = 1, K = 1, HY = 0, PY = 0, CW = 0, camLift = 1;
let LUP = 0, LDOWN = 0, skyC = null, lay1 = null, lay2 = null;
function resize() {
  const rc = stage.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1 : IS_TOUCH ? 1.5 : 2);
  W = Math.max(1, Math.round(rc.width * DPR)); H = Math.max(1, Math.round(rc.height * DPR));
  cv.width = W; cv.height = H;
  K = Math.min(W * 0.38, H * 0.55);
  CW = 0.62 * K;
  PY = H * 0.88;
  if (IS_TOUCH && W / 2 - CW / 2 < 196 * DPR) PY = Math.min(PY, H - 112 * DPR);
  camLift = clamp((PY - 0.38 * H) / K, 1, 2.6);
  HY = PY - camLift * K;
  buildBackdrop();
}
function buildBackdrop() {
  const t = track, r = rng(t.id.length * 31 + 5);
  LUP = Math.round(H * 0.3); LDOWN = Math.round(H * 0.08);
  const mn = Math.min(W, H);
  skyC = mk(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, HY); t.sky.forEach((c, i) => gr.addColorStop(i / (t.sky.length - 1), c));
    g.fillStyle = gr; g.fillRect(0, 0, W, HY + 2);
    g.fillStyle = t.fog; g.fillRect(0, HY, W, H - HY);
    if (t.kind === "day") {
      for (let i = 0; i < 6; i++) { const cx = r() * W, cy = HY * (0.15 + r() * 0.45), s = mn * (0.03 + r() * 0.03); g.fillStyle = "rgba(255,255,255,.9)"; for (let k = 0; k < 5; k++) circle(g, cx + (k - 2) * s * 0.9, cy + Math.abs(k - 2) * s * 0.18, s * (1 - Math.abs(k - 2) * 0.18)); }
    } else if (t.kind === "night") {
      for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; const s = (0.5 + r()) * DPR; g.fillRect(r() * W, r() * HY * 0.7, s, s); }
      const gl = g.createLinearGradient(0, HY * 0.5, 0, HY); gl.addColorStop(0, "rgba(255,200,120,0)"); gl.addColorStop(1, "rgba(255,200,120,.22)"); g.fillStyle = gl; g.fillRect(0, HY * 0.5, W, HY * 0.5);
    } else {
      const sx = W * 0.62, sr = mn * 0.1;
      const sg = g.createRadialGradient(sx, HY - LUP * 0.15, sr, sx, HY - LUP * 0.15, sr * 4); sg.addColorStop(0, "rgba(255,220,140,.55)"); sg.addColorStop(1, "rgba(255,220,140,0)");
      g.fillStyle = sg; circle(g, sx, HY - LUP * 0.15, sr * 4);
      g.fillStyle = "#FFE6A0"; circle(g, sx, HY - LUP * 0.15, sr);
    }
  });
  const LW = Math.max(W, 600) * 1.5 | 0, LH = LUP + LDOWN;
  const seam = (x, w, fn) => { fn(x); if (x + w > LW) fn(x - LW); };
  const ridge = (g, col, base, amp, p1, p2) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, LUP);
    const ph = r() * 6;
    for (let x = 0; x <= LW; x += 4) { const a = (x / LW) * Math.PI * 2; g.lineTo(x, LUP - LUP * (base + amp * Math.sin(a * p1 + ph) + amp * 0.5 * Math.sin(a * p2))); }
    g.lineTo(LW, LUP); g.closePath(); g.fill();
  };
  if (t.kind === "day") {
    lay1 = mk(LW, LH, (g) => { ridge(g, "#7FA8A8", 0.22, 0.08, 2, 5); g.fillStyle = t.fog; g.fillRect(0, LUP, LW, LDOWN); });
    lay2 = mk(LW, LH, (g) => { for (let i = 0; i < 90; i++) { g.fillStyle = pick(r, ["#2E6A2E", "#367A34", "#2A5E2A"]); circle(g, r() * LW, LUP - r() * LUP * 0.06, (8 + r() * 12) * DPR); } });
  } else if (t.kind === "night") {
    lay1 = mk(LW, LH, (g) => {
      g.fillStyle = "#121A30";
      for (let x = 0; x < LW;) { const w = LW * (0.025 + r() * 0.05), h = LUP * (0.2 + r() * 0.5); seam(x, w, (xx) => g.fillRect(xx, LUP - h, w + 1, h)); x += w * (0.7 + r() * 0.5); }
      g.fillStyle = "rgba(255,216,107,.55)"; for (let i = 0; i < 260; i++) g.fillRect(r() * LW, LUP * (0.45 + r() * 0.5), 2 * DPR, 2 * DPR);
      g.fillStyle = t.fog; g.fillRect(0, LUP, LW, LDOWN);
    });
    lay2 = mk(LW, LH, (g) => {
      for (let i = 0; i < 18; i++) { const x = r() * LW, w = 6 * DPR; g.fillStyle = "#1A1A22"; g.fillRect(x, LUP - LUP * 0.5, w, LUP * 0.5); const gl = g.createRadialGradient(x + w / 2, LUP * 0.5, 2, x + w / 2, LUP * 0.5, 30 * DPR); gl.addColorStop(0, "rgba(255,248,214,.9)"); gl.addColorStop(1, "rgba(255,248,214,0)"); g.fillStyle = gl; circle(g, x + w / 2, LUP * 0.5, 30 * DPR); }
    });
  } else {
    lay1 = mk(LW, LH, (g) => { ridge(g, "#8A5A8A", 0.3, 0.1, 1, 4); g.fillStyle = t.fog; g.fillRect(0, LUP, LW, LDOWN); });
    lay2 = mk(LW, LH, (g) => {
      for (let x = r() * LW * 0.1; x < LW;) {
        const w = LW * (0.12 + r() * 0.18), h = LUP * (0.2 + r() * 0.24), sl = w * 0.08;
        seam(x, w, (xx) => { g.fillStyle = "#B4573A"; g.beginPath(); g.moveTo(xx, LUP); g.lineTo(xx + sl, LUP - h); g.lineTo(xx + w - sl, LUP - h * 0.95); g.lineTo(xx + w, LUP); g.closePath(); g.fill(); g.fillStyle = "rgba(255,225,190,.16)"; for (let y = LUP - h + 6 * DPR; y < LUP; y += 9 * DPR) g.fillRect(xx + sl, y, w - 2 * sl, 3 * DPR); });
        x += w * (1.05 + r() * 0.5);
      }
    });
  }
}

/* =========================================================
   ESTADO
   ========================================================= */
let state = "menu";    // menu | lights | race | done
let paused = false;
let position = 0, bg1 = 0, bg2 = 0, shake = 0, raceT = 0, lightsT = 0, lightsOut = 4, doneT = 0, LAPS = 3;
let ai = [], parts = [], resultsShown = false, lastLight = -1;
const P = { x: 0, speed: 0, dist: 0, steer: 0, lap: 1, lapStart: 0, bestLap: null, finished: false, finishT: 0, rank: 10, lastRank: 10, off: false, wall: false, wallOn: false, braking: false, finishRank: 10,
  tire: 1, drs: false, drsReady: false, slip: false, pit: 0, pitT: 0, lastIdx: 0, tireWarn: false };
const kb = { left: false, right: false, gas: false, brake: false };
const pin = { left: false, right: false, brake: false };

function rel(z, pz) { let d = z - pz; if (d > L / 2) d -= L; else if (d < -L / 2) d += L; return d; }
function placeCar(c) { const s = segAt(c.z); if (c.seg !== s) { if (c.seg) { const i = c.seg.cars.indexOf(c); if (i >= 0) c.seg.cars.splice(i, 1); } s.cars.push(c); c.seg = s; } }
function clearCars() { for (const s of segments) s.cars.length = 0; ai = []; }
function attract() { clearCars(); position = START * SEG + 60 * SEG; P.x = 0; P.speed = MAXSPEED * 0.5; P.steer = 0; P.pit = 0; P.drs = false; }

function startRace() {
  audio();
  paused = false; resultsShown = false; LAPS = LAPS_OPT[selLaps];
  clearCars();
  const mul = DIFFS[selDiff].mul;
  const list = RIVALS.map((t, i) => ({ ...t, base: RIVAL_BASE[i] * mul, spr: SPR.car[i], speed: 0, seg: null, finished: false, finishT: 0, braking: false, laneT: 2 + Math.random() * 4 }));
  list.sort((a, b) => b.base - a.base);
  const startZ = START * SEG;
  list.forEach((c, k) => { c.z = startZ - (3 + k * 2) * SEG; c.x = k % 2 ? 0.45 : -0.45; c.lane = c.x; c.dist = c.z - startZ; placeCar(c); });
  ai = list;
  const pz = startZ - (3 + 9 * 2) * SEG;
  position = wrap(pz - PLAYER_Z, L);
  Object.assign(P, { x: 0.45, speed: 0, dist: pz - startZ, steer: 0, lap: 1, lapStart: 0, bestLap: null, finished: false, finishT: 0, rank: 10, lastRank: 10, off: false, wall: false, wallOn: false, braking: false,
    tire: 1, drs: false, drsReady: false, slip: false, pit: 0, pitT: 0, lastIdx: segAt(pz).index, tireWarn: false });
  bg1 = bg2 = 0; shake = 0; parts = []; raceT = 0; lightsT = 0; doneT = 0; lastLight = -1; lightsOut = 3.3 + Math.random() * 0.9;
  state = "lights";
  $("startScreen").hidden = true; $("overScreen").hidden = true; $("pauseScreen").hidden = true;
  $("hud").hidden = false; $("pad").hidden = !IS_TOUCH;
  $("lights").hidden = false; $("lights").className = "lights";
  [...$("lights").children].forEach((i) => i.classList.remove("on"));
  buildMini();
  toast(IS_TOUCH ? "Espere as luzes apagarem!" : "Segure ↑ e espere as luzes!", "yellow", 2.4);
}
function toMenu() {
  state = "menu"; paused = false;
  $("hud").hidden = true; $("pad").hidden = true; $("overScreen").hidden = true; $("pauseScreen").hidden = true; $("startScreen").hidden = false;
  attract(); refreshBest();
}

let msgT = 0;
function toast(text, cls, dur) { const m = $("msg"); m.textContent = text; m.className = "msg show " + (cls || ""); msgT = dur || 1.4; }

/* =========================================================
   SOM
   ========================================================= */
let soundOn = true;
try { soundOn = localStorage.getItem("fc-sound") !== "0"; } catch (e) {}
let AC = null, master = null, eng = null;
function audio() {
  if (AC) { if (AC.state === "suspended") AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = soundOn ? 0.55 : 0; master.connect(AC.destination);
    const o1 = AC.createOscillator(); o1.type = "sawtooth";
    const o2 = AC.createOscillator(); o2.type = "square";
    const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    const gn = AC.createGain(); gn.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(gn); gn.connect(master); o1.start(); o2.start();
    eng = { o1, o2, f, g: gn };
  } catch (e) { AC = null; }
}
function tone(freq, dur, type, vol, slide) {
  if (!AC || !soundOn) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol, type, f0, f1) {
  if (!AC || !soundOn) return;
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
const sfx = {
  light() { tone(660, 0.18, "square", 0.12); },
  go() { tone(990, 0.5, "square", 0.13); },
  drs() { noise(0.35, 0.2, "bandpass", 600, 2000); },
  crash() { noise(0.4, 0.45, "lowpass", 1200, 150); tone(110, 0.3, "sawtooth", 0.14, -60); },
  bump() { noise(0.14, 0.22, "lowpass", 700, 300); },
  scrape() { noise(0.35, 0.16, "highpass", 2500, 4000); },
  pass() { tone(660, 0.09, "triangle", 0.12); setTimeout(() => tone(990, 0.12, "triangle", 0.12), 80); },
  lap() { tone(784, 0.12, "triangle", 0.14); setTimeout(() => tone(1046, 0.18, "triangle", 0.14), 110); },
  gun() { for (let k = 0; k < 4; k++) setTimeout(() => noise(0.12, 0.3, "bandpass", 3000, 1500), k * 110); },
  finish() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, "triangle", 0.16), i * 120)); },
};
let lastGear = 0;
function gearOf(sp) { if (sp < 30) return 0; return clamp(Math.ceil((sp / (MAXSPEED * 1.12)) * 8), 1, 8); }
function engineTick() {
  if (!eng) return;
  const t = AC.currentTime, sp = P.speed / MAXSPEED;
  const gear = gearOf(P.speed), lo = (gear - 1) / 8 * 1.12, fr = gear ? clamp((sp - lo) / (1.12 / 8), 0, 1) : 0;
  let f = gear ? 150 + fr * 340 + gear * 10 : 110;
  if (state === "lights") f = 140 + ((AUTO_GAS || kb.gas) ? 180 + Math.sin(t * 13) * 40 : 0);
  if (gear > lastGear && state === "race") noise(0.06, 0.1, "bandpass", 1500, 800);
  lastGear = gear;
  eng.o1.frequency.setTargetAtTime(f, t, 0.03);
  eng.o2.frequency.setTargetAtTime(f * 1.5, t, 0.03);
  eng.f.frequency.setTargetAtTime(700 + sp * 2600, t, 0.08);
  const on = (state === "race" || state === "lights" || (state === "done" && !resultsShown)) && !paused;
  eng.g.gain.setTargetAtTime(on ? 0.05 + sp * 0.045 : 0, t, 0.08);
}
function setSound(on) {
  soundOn = on;
  try { localStorage.setItem("fc-sound", on ? "1" : "0"); } catch (e) {}
  if (master) master.gain.value = on ? 0.55 : 0;
  const b = $("btnSound"); b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-label", on ? "Som ligado" : "Som desligado");
}

/* =========================================================
   FÍSICA
   ========================================================= */
function steerAI(c, cseg, pIdx) {
  for (let i = 1; i < 20; i++) {
    const idx = (cseg.index + i) % N;
    if (idx === pIdx && state !== "menu" && P.pit < 2 && c.speed > P.speed && overlap(P.x, CAR_X, c.x, CAR_X, 1.25)) {
      const dir = P.x > 0.5 ? -1 : P.x < -0.5 ? 1 : c.x > P.x ? 1 : -1;
      return (dir / i) * ((c.speed - P.speed) / MAXSPEED) * 1.3;
    }
    for (const o of segments[idx].cars) {
      if (o !== c && c.speed > o.speed && overlap(c.x, CAR_X, o.x, CAR_X, 1.25)) {
        const dir = o.x > 0.5 ? -1 : o.x < -0.5 ? 1 : c.x > o.x ? 1 : -1;
        return (dir / i) * ((c.speed - o.speed) / MAXSPEED) * 1.3;
      }
    }
  }
  return 0;
}
function updateAI(dt, pIdx) {
  for (const c of ai) {
    const seg = c.seg;
    let target = MAXSPEED * c.base * (1 - Math.min(0.22, Math.abs(segments[(seg.index + 6) % N].curve) * 0.034));
    if (state === "race") { const gap = c.dist - P.dist; if (gap > L * 0.15) target *= 0.95; else if (gap < -L * 0.12) target *= 1.05 + 0.03 * selDiff; }
    if (state === "lights") target = 0;
    if (c.finished) target = MAXSPEED * 0.5;
    const prev = c.speed;
    c.speed += clamp(target - c.speed, -MAXSPEED * 0.8 * dt, (MAXSPEED / 4.2) * dt);
    c.braking = c.speed < prev - MAXSPEED * 0.12 * dt;
    c.laneT -= dt; if (c.laneT <= 0) { c.lane = [-0.5, 0, 0.5][Math.floor(Math.random() * 3)]; c.laneT = 3 + Math.random() * 5; }
    if (c.speed > 0) { const d = steerAI(c, seg, pIdx); if (d !== 0) c.x += d * dt * 60; else c.x += (c.lane - c.x) * Math.min(1, dt * 0.7); c.x = clamp(c.x, -0.85, 0.85); }
    const move = c.speed * dt; c.z = wrap(c.z + move, L); c.dist += move; placeCar(c);
    if (!c.finished && c.dist >= LAPS * L && state !== "lights") { c.finished = true; c.finishT = raceT; }
  }
}
function spawn(x, y, vx, vy, life, size, color) { if (parts.length > (LOW ? 40 : 90)) return; parts.push({ x, y, vx, vy, life, max: life, size, color }); }
function rankList() { return [P, ...ai].sort((a, b) => { if (a.finished && b.finished) return a.finishT - b.finishT; if (a.finished) return -1; if (b.finished) return 1; return b.dist - a.dist; }); }
function crossed(prev, now, target) { return prev !== now && ((prev < target && now >= target) || (prev > now && (target > prev || target <= now))); }

function update(dt) {
  const pz = wrap(position + PLAYER_Z, L), pseg = segAt(pz), idx = pseg.index;
  const sp = P.speed / MAXSPEED, racing = state === "race";
  let steerT = 0, gas = false, brake = false;
  if (racing && P.pit < 2) {
    steerT = (kb.right || pin.right ? 1 : 0) - (kb.left || pin.left ? 1 : 0);
    brake = kb.brake || pin.brake; gas = AUTO_GAS ? !brake : kb.gas;
  } else if (state === "menu" || state === "done" || P.pit >= 2) {
    const look = segments[(idx + 8) % N].curve;
    let tx = 0;
    if (P.pit === 2 || P.pit === 3) tx = PIT_X;
    if (P.pit === 4) tx = (idx >= PIT_OUT - 14 && idx <= PIT_OUT + 2) ? 0.6 : PIT_X;
    steerT = clamp((tx - P.x) * 2.4 + look * 0.14 * sp, -1, 1);
    let tgt = MAXSPEED * (state === "menu" ? 0.55 : 0.5);
    if (P.pit >= 2) tgt = MAXSPEED * 0.5;
    gas = P.speed < tgt; brake = P.speed > tgt * 1.15;
  }
  // box
  if (racing) {
    if (P.pit === 1 && crossed(P.lastIdx, idx, PIT_IN) && !P.finished) { P.pit = 2; P.drs = false; toast("ENTRANDO NO BOX", "yellow", 1.6); }
    if (P.pit === 2 && crossed(P.lastIdx, idx, BOX_SEG)) { P.pit = 3; P.pitT = 0; P.speed = 0; $("pitbox").hidden = false; buzz(60); }
    if (P.pit === 3) {
      P.speed = 0; P.pitT += dt;
      $("pitFill").style.width = Math.min(100, (P.pitT / 2.0) * 100) + "%";
      if (P.pitT >= 2.0) { P.tire = 1; P.tireWarn = false; P.pit = 4; $("pitbox").hidden = true; toast("PNEUS NOVOS!", "green", 1.4); sfx.gun(); }
    }
    if (P.pit === 4 && crossed(P.lastIdx, idx, PIT_OUT)) { P.pit = 0; toast("SAIU DO BOX", "", 1); }
  }
  P.lastIdx = idx;
  // asa móvel e vácuo
  P.drsReady = racing && pseg.drs && P.pit === 0 && raceT > 2;
  if (!P.drsReady || brake) P.drs = false;
  P.slip = false;
  if (racing && P.pit === 0) for (const c of ai) { const d = rel(c.z, pz); if (d > CAR_LEN && d < 2400 && Math.abs(c.x - P.x) < 0.32) { P.slip = true; break; } }
  const tireGrip = 0.5 + 0.5 * P.tire, tireTop = 0.92 + 0.08 * P.tire;
  const top = MAXSPEED * CAR.top * tireTop * (P.drs ? 1.1 : 1) * (P.slip ? 1.05 : 1);
  if (state === "lights" || P.pit === 3) P.speed = 0;
  else {
    if (brake) P.speed -= MAXSPEED * 1.25 * dt;
    else if (gas) { const r = P.speed / (MAXSPEED * CAR.top); P.speed += (MAXSPEED / 4.0) * CAR.acc * (P.drs ? 1.3 : 1 - 0.55 * Math.max(0, r - 0.45)) * dt; }
    else P.speed -= (MAXSPEED / 5) * dt;
    if (P.speed > top) P.speed = Math.max(top, P.speed - MAXSPEED * 0.5 * dt);
  }
  P.braking = brake && P.speed > 50;
  P.steer += (steerT - P.steer) * Math.min(1, dt * 9);
  const grip = CAR.grip * tireGrip;
  if (P.speed > 30) {
    P.x += P.steer * 2.35 * grip * Math.min(1, 0.3 + sp) * dt;
    P.x -= dt * 2 * sp * sp * pseg.curve * 0.33 / grip;
  }
  // pneus
  if (racing && P.pit !== 3) {
    P.tire = Math.max(0, P.tire - dt * sp * (0.0068 + 0.0011 * Math.abs(pseg.curve)) * (P.off ? 1.6 : 1) * (LAPS > 3 ? 1 : 1.1));
    if (P.tire < 0.35 && !P.tireWarn && P.pit === 0) { P.tireWarn = true; toast("PNEUS GASTOS! CHAME O BOX", "red", 2.2); buzz([60, 40, 60]); }
  }
  // fora da pista e muro
  P.off = Math.abs(P.x) > OFF && !(P.pit >= 2 && P.x > 0);
  if (P.off) {
    const lim = MAXSPEED * 0.33;
    if (P.speed > lim) P.speed = Math.max(lim, P.speed - MAXSPEED * 0.95 * dt);
    if (P.speed > 300 && Math.random() < dt * 40) spawn(W / 2 + (Math.random() - 0.5) * CW, PY, (Math.random() - 0.5) * 120 * DPR, -(40 + Math.random() * 80) * DPR, 0.6, (6 + Math.random() * 10) * DPR, track.kind === "night" ? "rgba(160,160,170," : "rgba(120,170,90,");
  }
  const rightWall = pseg.pit && P.pit >= 2 ? 1.95 : WALL;
  P.wall = false;
  if (P.x > rightWall || P.x < -WALL) {
    P.x = clamp(P.x, -WALL, rightWall); P.wall = true;
    if (P.speed > 200) {
      P.speed *= 1 - 1.3 * dt; shake = Math.max(shake, 4);
      const sx = W / 2 + Math.sign(P.x) * CW * 0.5;
      for (let k = 0; k < 2; k++) spawn(sx, PY - CW * 0.12, -Math.sign(P.x) * (60 + Math.random() * 160) * DPR, -(80 + Math.random() * 160) * DPR, 0.35, 3 * DPR, "rgba(255,220,120,");
      if (!P.wallOn) { sfx.scrape(); buzz(40); }
    }
  }
  P.wallOn = P.wall;
  P.speed = clamp(P.speed, 0, MAXSPEED * 1.3);
  // faíscas do assoalho em alta velocidade
  if (P.speed > MAXSPEED * 0.9 && Math.random() < dt * 6) for (let k = 0; k < 4; k++) spawn(W / 2 + (Math.random() - 0.5) * CW * 0.4, PY - CW * 0.02, (Math.random() - 0.5) * 140 * DPR, (20 + Math.random() * 90) * DPR, 0.3, 2.5 * DPR, "rgba(255,210,120,");

  for (const c of ai) c.rp = rel(c.z, pz);
  updateAI(dt, idx);
  const d = P.speed * dt;
  position = wrap(position + d, L);
  if (state !== "menu") P.dist += d;

  // batidas
  const pz2 = wrap(position + PLAYER_Z, L);
  for (const c of ai) {
    const r = rel(c.z, pz2);
    if (P.pit < 2 && Math.abs(r) < CAR_LEN && overlap(P.x, CAR_X, c.x, CAR_X, 0.9)) {
      if (c.rp >= CAR_LEN - 20 && P.speed > c.speed) {
        const fix = r - CAR_LEN; position = wrap(position + fix, L); P.dist += fix;
        P.speed = c.speed * 0.82; shake = Math.max(shake, 8); P.tire = Math.max(0, P.tire - 0.02);
        sfx.crash(); buzz(70);
        for (let k = 0; k < 6; k++) spawn(W / 2 + (Math.random() - 0.5) * CW * 0.6, PY - CW * 0.3, (Math.random() - 0.5) * 300 * DPR, -(100 + Math.random() * 200) * DPR, 0.45, 3 * DPR, "rgba(255,230,140,");
      } else if (c.rp <= -(CAR_LEN - 20) && c.speed > P.speed) {
        const fix = -CAR_LEN - r; c.z = wrap(c.z + fix, L); c.dist += fix; placeCar(c);
        c.speed = P.speed * 0.9; shake = Math.max(shake, 5); sfx.bump();
      } else {
        const dir = P.x < c.x ? -1 : 1;
        P.x = c.x + dir * CAR_X * 0.92; c.x = clamp(c.x - dir * 0.04, -0.9, 0.9); P.speed *= 0.985;
        if (!c.touch) { sfx.bump(); shake = Math.max(shake, 3); buzz(25); }
        c.touch = true; continue;
      }
    }
    c.touch = false;
  }
  P.x = clamp(P.x, -WALL, segAt(pz2).pit && P.pit >= 2 ? 1.95 : WALL);

  bg1 = wrap(bg1 + 0.0011 * pseg.curve * (d / SEG), 1);
  bg2 = wrap(bg2 + 0.0022 * pseg.curve * (d / SEG), 1);
  if (P.braking && P.speed > MAXSPEED * 0.5 && Math.random() < dt * 25) spawn(W / 2 + (Math.random() < 0.5 ? -1 : 1) * CW * 0.4, PY, (Math.random() - 0.5) * 60 * DPR, -(20 + Math.random() * 40) * DPR, 0.5, (8 + Math.random() * 8) * DPR, "rgba(200,200,210,");

  if (racing) {
    P.rank = rankList().indexOf(P) + 1;
    if (P.rank < P.lastRank && P.pit === 0) { toast("+1 POSIÇÃO · " + P.rank + "º", "green", 1); sfx.pass(); }
    P.lastRank = P.rank;
    const lapNow = Math.min(LAPS, Math.floor(Math.max(0, P.dist) / L) + 1);
    if (lapNow > P.lap) {
      const lt = raceT - P.lapStart;
      const best = P.bestLap == null || lt < P.bestLap;
      if (best) P.bestLap = lt;
      P.lapStart = raceT; P.lap = lapNow;
      toast(lapNow === LAPS ? "ÚLTIMA VOLTA!" : (best ? "VOLTA MAIS RÁPIDA " + fmt(lt) : "VOLTA " + lapNow), best && lapNow !== LAPS ? "purple" : "yellow", 1.8); sfx.lap();
    }
    if (P.dist >= LAPS * L) finishRace();
  }
}

function finishRace() {
  const lt = raceT - P.lapStart; if (P.bestLap == null || lt < P.bestLap) P.bestLap = lt;
  P.finished = true; P.finishT = raceT; P.finishRank = ai.filter((c) => c.finished).length + 1;
  P.drs = false; P.pit = 0; $("pitbox").hidden = true;
  state = "done"; doneT = 0; $("pad").hidden = true;
  sfx.finish(); buzz([60, 40, 120]);
  toast(P.finishRank === 1 ? "VITÓRIA! 🏆" : P.finishRank + "º LUGAR", P.finishRank === 1 ? "yellow" : "", 2.6);
}
function showResults() {
  resultsShown = true;
  const all = [P, ...ai].map((r) => ({ r, t: r.finished ? r.finishT : raceT + (LAPS * L - r.dist) / Math.max(r.speed, MAXSPEED * 0.6) }));
  all.sort((a, b) => a.t - b.t);
  const pos = P.finishRank, t = TRACKS[selTrack], key = recKey();
  const cur = rec[key] || {};
  const newBest = cur.best == null || P.finishT < cur.best;
  if (newBest) cur.best = P.finishT;
  if (P.bestLap != null && (cur.lap == null || P.bestLap < cur.lap)) cur.lap = P.bestLap;
  rec[key] = cur; saveRec();
  $("overTag").textContent = newBest ? "🏆 Novo recorde no circuito!" : "Bandeira quadriculada";
  $("overTitle").textContent = pos === 1 ? "Vitória!" : pos <= 3 ? pos + "º · Pódio!" : pos + "º lugar";
  $("overPos").textContent = pos + "º"; $("overTime").textContent = fmt(P.finishT); $("overLap").textContent = fmt(P.bestLap);
  const ol = $("standings"); ol.innerHTML = "";
  all.forEach((e, i) => {
    const li = document.createElement("li"), me = e.r === P;
    if (me) li.className = "me";
    const col = me ? LIVERIES[selLiv].color : e.r.color;
    li.innerHTML = `<span class="n">${i + 1}º</span><span class="c" style="background:${col}"></span><span></span><span class="t">${i === 0 ? fmt(e.t) : "+" + (e.t - all[0].t).toFixed(1) + "s"}</span>`;
    li.children[2].textContent = me ? "Você · CETI Racing" : e.r.name;
    ol.appendChild(li);
  });
  $("overBest").textContent = `Recorde (${t.name}, ${LAPS} voltas): ${fmt(cur.best)} · melhor volta ${fmt(cur.lap)}`;
  $("hud").hidden = true; $("overScreen").hidden = false;
}

/* =========================================================
   DESENHO
   ========================================================= */
function poly(a, b, c, d, e, f, g, h, col) { if (col) ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.lineTo(g, h); ctx.closePath(); ctx.fill(); }
function project(p, camX, camY, camZ) {
  const cy = p.world.y - camY, cz = p.world.z - camZ;
  p.camera.y = cy; p.camera.z = cz;
  const s = CAM_DEPTH / cz;
  p.screen.scale = s; p.screen.x = Math.round(W / 2 - s * camX * K); p.screen.y = Math.round(HY - s * cy * K); p.screen.w = Math.round(s * ROAD_W * K);
}
function drawSegment(seg) {
  const t = track, a = seg.p1.screen, b = seg.p2.screen;
  const x1 = a.x, y1 = a.y, w1 = a.w, x2 = b.x, y2 = b.y, w2 = b.w, k = seg.dark ? 1 : 0;
  ctx.fillStyle = t.ground[k]; ctx.fillRect(0, y2, W, y1 - y2);
  if (seg.pit) {
    poly(x1 + w1 * 1.26, y1, x1 + w1 * 2.02, y1, x2 + w2 * 2.02, y2, x2 + w2 * 1.26, y2, t.road[k]);
    poly(x1 + w1 * 1.26, y1, x1 + w1 * 1.29, y1, x2 + w2 * 1.29, y2, x2 + w2 * 1.26, y2, "#F2F2F2");
    if (seg.index >= BOX_SEG - 1 && seg.index <= BOX_SEG + 1) poly(x1 + w1 * 1.4, y1, x1 + w1 * 1.86, y1, x2 + w2 * 1.86, y2, x2 + w2 * 1.4, y2, "#FFD21F");
  }
  const r1 = w1 / 10, r2 = w2 / 10;
  ctx.fillStyle = t.rumble[k];
  poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2);
  poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2);
  if (seg.check) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const ax = x1 - w1 + (2 * w1 * i) / n, bx = x1 - w1 + (2 * w1 * (i + 1)) / n, cx = x2 - w2 + (2 * w2 * (i + 1)) / n, dx = x2 - w2 + (2 * w2 * i) / n;
      poly(ax, y1, bx, y1, cx, y2, dx, y2, (i + seg.index) % 2 ? "#111" : "#F4F4F4");
    }
  } else {
    poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, seg.drs && !k ? "#5A5A64" : t.road[k]);
    const e1 = w1 * 0.035, e2 = w2 * 0.035;
    ctx.fillStyle = t.edge;
    poly(x1 - w1 * 0.95, y1, x1 - w1 * 0.95 + e1, y1, x2 - w2 * 0.95 + e2, y2, x2 - w2 * 0.95, y2);
    poly(x1 + w1 * 0.95, y1, x1 + w1 * 0.95 - e1, y1, x2 + w2 * 0.95 - e2, y2, x2 + w2 * 0.95, y2);
    if (seg.grid) { const gx1 = x1 + seg.grid * w1 * 0.45, gx2 = x2 + seg.grid * w2 * 0.45; poly(gx1 - w1 * 0.17, y1, gx1 + w1 * 0.17, y1, gx2 + w2 * 0.17, y2, gx2 - w2 * 0.17, y2, "#F2F2F2"); }
  }
  if (seg.fog < 1) { ctx.globalAlpha = 1 - seg.fog; ctx.fillStyle = t.fog; ctx.fillRect(0, y2, W, y1 - y2); ctx.globalAlpha = 1; }
}
function drawSprite(img, ww, scale, x, y, ax, ay, clipY) {
  const dw = ww * scale * K; if (dw < 1) return;
  const dh = dw * img.height / img.width, dx = x + dw * ax, dy = y + dh * ay;
  if (dx > W || dx + dw < 0 || dy > H) return;
  const ch = clipY ? Math.max(0, dy + dh - clipY) : 0;
  if (ch < dh) ctx.drawImage(img, 0, 0, img.width, img.height - (img.height * ch) / dh, dx, dy, dw, dh - ch);
}
function drawRival(c, seg) {
  const pct = (c.z % SEG) / SEG, sc = lerp(seg.p1.screen.scale, seg.p2.screen.scale, pct);
  const x = lerp(seg.p1.screen.x, seg.p2.screen.x, pct) + sc * c.x * ROAD_W * K, y = lerp(seg.p1.screen.y, seg.p2.screen.y, pct);
  drawSprite(c.braking ? c.spr.b : c.spr.n, CAR_SPR.ww, sc, x, y, -0.5, -CAR_SPR.ay, seg.clip);
}
function drawPlayer() {
  let y = PY;
  if (P.off && P.speed > 200) y += (Math.random() - 0.5) * CW * 0.04;
  else if (P.speed > 100) y += Math.sin(raceT * 40 + position * 0.01) * CW * 0.003;
  if (track.kind === "night" && state !== "menu") {
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(W / 2, PY - CW * 0.1, CW * 0.1, W / 2, PY - CW * 0.1, CW * 1.1);
    g.addColorStop(0, "rgba(255,240,210,.12)"); g.addColorStop(1, "rgba(255,240,210,0)"); ctx.fillStyle = g; ctx.fillRect(W / 2 - CW * 1.2, PY - CW * 1.2, CW * 2.4, CW * 1.4);
    ctx.globalCompositeOperation = "source-over";
  }
  drawF1(ctx, W / 2, y, CW, LIVERIES[selLiv], { brake: P.braking, steer: P.steer, drs: P.drs, blink: P.pit >= 2 && Math.floor(raceT * 4) % 2 === 0, tireBand: P.tire > 0.6 ? "#E8202A" : P.tire > 0.35 ? "#FFD21F" : "#7A7A85" });
}
function drawLayer(img, off) { const w = img.width, x = -Math.floor(off * w); ctx.drawImage(img, x, HY - LUP); if (x + w < W) ctx.drawImage(img, x + w, HY - LUP); }

function render() {
  const sx = shake > 0.2 ? (Math.random() - 0.5) * shake * DPR : 0, sy = shake > 0.2 ? (Math.random() - 0.5) * shake * DPR : 0;
  ctx.setTransform(1, 0, 0, 1, sx, sy);
  ctx.drawImage(skyC, 0, 0); drawLayer(lay1, bg1); drawLayer(lay2, bg2);
  ctx.fillStyle = track.fog; ctx.fillRect(0, HY + LDOWN - 1, W, H);
  const base = segAt(position), basePct = (position % SEG) / SEG;
  const pz = wrap(position + PLAYER_Z, L), pseg = segAt(pz), pPct = (pz % SEG) / SEG;
  const camY = lerp(pseg.p1.world.y, pseg.p2.world.y, pPct) + CAM_H * camLift;
  let maxy = H, x = 0, dx = -(base.curve * basePct);
  const camXp = P.x * ROAD_W, fogD = track.fogD;
  for (let n = 0; n < DRAW; n++) {
    const seg = segments[(base.index + n) % N], looped = seg.index < base.index, f = n / DRAW;
    seg.fog = Math.exp(-f * f * fogD); seg.clip = maxy;
    const camZ = position - (looped ? L : 0);
    project(seg.p1, camXp - x, camY, camZ); project(seg.p2, camXp - x - dx, camY, camZ);
    x += dx; dx += seg.curve;
    if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
    drawSegment(seg); maxy = seg.p1.screen.y;
  }
  const pN = (pseg.index - base.index + N) % N;
  let drew = false;
  for (let n = DRAW - 1; n > 0; n--) {
    const seg = segments[(base.index + n) % N], a = Math.min(1, seg.fog * 2.2);
    if (a > 0.03) { ctx.globalAlpha = a; const sc = seg.p1.screen.scale; for (const s of seg.sprites) drawSprite(s.spr.c, s.spr.ww, sc, seg.p1.screen.x + sc * s.offset * ROAD_W * K, seg.p1.screen.y, s.ax, -1, seg.clip); }
    if (n === pN) {
      ctx.globalAlpha = 1;
      for (const c of seg.cars) if (c.z % SEG > pz % SEG) drawRival(c, seg);
      drawPlayer(); drew = true;
      for (const c of seg.cars) if (c.z % SEG <= pz % SEG) drawRival(c, seg);
    } else if (seg.cars.length && a > 0.03) { ctx.globalAlpha = a; for (const c of seg.cars) drawRival(c, seg); }
  }
  ctx.globalAlpha = 1;
  if (!drew) drawPlayer();
  for (const p of parts) { const k = p.life / p.max; ctx.fillStyle = p.color + (k * 0.85).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2 * (0.6 + 0.4 * k), 0, Math.PI * 2); ctx.fill(); }
  if (!LOW && P.speed > MAXSPEED * 0.95 && state !== "menu") {
    ctx.strokeStyle = P.drs ? "rgba(140,255,180,.4)" : "rgba(255,255,255,.18)"; ctx.lineWidth = 2 * DPR; ctx.beginPath();
    const R = Math.hypot(W, H) * 0.6, vx = W / 2, vy = HY;
    for (let i = 0; i < 12; i++) { const ang = Math.random() * Math.PI * 2, r1 = R * (0.42 + Math.random() * 0.3), r2 = r1 + R * (0.1 + Math.random() * 0.16); ctx.moveTo(vx + Math.cos(ang) * r1, vy + Math.sin(ang) * r1 * 0.75); ctx.lineTo(vx + Math.cos(ang) * r2, vy + Math.sin(ang) * r2 * 0.75); }
    ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* =========================================================
   MINIMAPA
   ========================================================= */
const miniC = $("mini"), mctx = miniC.getContext("2d");
let miniPts = null, miniBg = null, mDPR = 1, mW = 0, mH = 0;
function buildMini() {
  const n = N, C = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) C[i + 1] = C[i] + segments[i].curve;
  const k = 0.0034, xs = new Float64Array(n + 1), ys = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { const th = Math.PI + (2 * Math.PI * i) / n + k * (C[i] - (C[n] * i) / n); xs[i + 1] = xs[i] + Math.cos(th); ys[i + 1] = ys[i] + Math.sin(th); }
  const ex = xs[n], ey = ys[n];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i <= n; i++) { xs[i] -= (ex * i) / n; ys[i] -= (ey * i) / n; x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); y0 = Math.min(y0, ys[i]); y1 = Math.max(y1, ys[i]); }
  miniPts = { xs, ys, x0, x1, y0, y1 };
  sizeMini();
}
function sizeMini() {
  if (!miniPts) return;
  const rc = miniC.getBoundingClientRect(); if (!rc.width) return;
  mDPR = Math.min(window.devicePixelRatio || 1, 2); mW = Math.round(rc.width * mDPR); mH = Math.round(rc.height * mDPR);
  miniC.width = mW; miniC.height = mH;
  const { xs, ys, x0, x1, y0, y1 } = miniPts, pad = 12 * mDPR;
  const sc = Math.min((mW - 2 * pad) / (x1 - x0 || 1), (mH - 2 * pad) / (y1 - y0 || 1));
  const ox = (mW - (x1 - x0) * sc) / 2, oy = (mH - (y1 - y0) * sc) / 2;
  miniPts.px = (i) => ox + (xs[i] - x0) * sc; miniPts.py = (i) => oy + (ys[i] - y0) * sc;
  miniBg = mk(mW, mH, (g) => {
    g.lineJoin = "round"; g.lineCap = "round";
    const path = (a, b) => { g.beginPath(); for (let i = a; i <= b; i += 2) { const x = miniPts.px(i % N), y = miniPts.py(i % N); i === a ? g.moveTo(x, y) : g.lineTo(x, y); } };
    path(0, N); g.closePath(); g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 7 * mDPR; g.stroke();
    path(0, N); g.closePath(); g.strokeStyle = "#F2F2F2"; g.lineWidth = 3.5 * mDPR; g.stroke();
    g.strokeStyle = "#2BD96B"; g.lineWidth = 3.5 * mDPR;
    for (let i = 0; i < N; i++) if (segments[i].drs && !segments[(i - 1 + N) % N].drs) { let j = i; while (segments[(j + 1) % N].drs && j < i + N) j++; path(i, j); g.stroke(); }
    const sx = miniPts.px(START), sy = miniPts.py(START), dx = miniPts.px(START + 2) - sx, dy = miniPts.py(START + 2) - sy, l = Math.hypot(dx, dy) || 1;
    g.strokeStyle = "#E8202A"; g.lineWidth = 3 * mDPR; g.beginPath(); g.moveTo(sx - (dy / l) * 7 * mDPR, sy + (dx / l) * 7 * mDPR); g.lineTo(sx + (dy / l) * 7 * mDPR, sy - (dx / l) * 7 * mDPR); g.stroke();
  });
}
function miniXY(z) { const f = z / SEG, i = Math.floor(f) % N, t = f - Math.floor(f); return [lerp(miniPts.px(i), miniPts.px(i + 1), t), lerp(miniPts.py(i), miniPts.py(i + 1), t)]; }
function drawMini() {
  if (!miniBg || !mW) return;
  mctx.clearRect(0, 0, mW, mH); mctx.drawImage(miniBg, 0, 0);
  for (const c of ai) { const [x, y] = miniXY(c.z); mctx.fillStyle = "rgba(0,0,0,.75)"; mctx.beginPath(); mctx.arc(x, y, 4.4 * mDPR, 0, Math.PI * 2); mctx.fill(); mctx.fillStyle = c.color; mctx.beginPath(); mctx.arc(x, y, 3.2 * mDPR, 0, Math.PI * 2); mctx.fill(); }
  const [x, y] = miniXY(wrap(position + PLAYER_Z, L)), pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
  mctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.5})`; mctx.lineWidth = 2 * mDPR; mctx.beginPath(); mctx.arc(x, y, (7 + pulse * 3) * mDPR, 0, Math.PI * 2); mctx.stroke();
  mctx.fillStyle = "#000"; mctx.beginPath(); mctx.arc(x, y, 5.6 * mDPR, 0, Math.PI * 2); mctx.fill();
  mctx.fillStyle = LIVERIES[selLiv].color; mctx.beginPath(); mctx.arc(x, y, 4.3 * mDPR, 0, Math.PI * 2); mctx.fill();
}

/* =========================================================
   HUD
   ========================================================= */
const hc = {};
function setText(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
function setCls(el, cls, on) { const k = el.id + cls; if (hc[k] !== on) { hc[k] = on; el.classList.toggle(cls, on); } }
function updateHUD() {
  if (state === "menu") return;
  drawMini();
  setText("hPos", P.rank + "º");
  setText("hLap", Math.min(P.lap, LAPS) + "/" + LAPS);
  setText("hTime", fmt(state === "lights" ? 0 : state === "done" ? P.finishT : raceT));
  setText("hBest", "melhor " + (P.bestLap == null ? "--" : fmt(P.bestLap)));
  setText("hSpd", String(Math.round((P.speed / MAXSPEED) * KMH)));
  const g = gearOf(P.speed); setText("hGear", "km/h · " + (g ? g + "ª" : "N"));
  setText("hTire", Math.round(P.tire * 100) + "%");
  const tc = $("tireChip"); setCls(tc, "mid", P.tire <= 0.6 && P.tire > 0.35); setCls(tc, "low", P.tire <= 0.35);
  const td = $("tagDrs"); setCls(td, "on", P.drsReady || P.drs); setCls(td, "ready", P.drsReady && !P.drs);
  setText("tagDrs", P.drs ? "ASA ABERTA" : "ASA MÓVEL · " + (IS_TOUCH ? "TOQUE" : "ESPAÇO"));
  setCls($("tagSlip"), "on", P.slip && state === "race");
  setCls($("tagBox"), "on", P.pit === 1);
  const db = pad.querySelector(".drsb"); setCls(db, "ready", P.drsReady && !P.drs); setCls(db, "open", P.drs);
  setCls(pad.querySelector(".boxb"), "on", P.pit === 1);
}

/* =========================================================
   LAÇO
   ========================================================= */
function step(dt) {
  if (state === "lights") {
    lightsT += dt;
    const n = Math.min(5, Math.floor(lightsT / 0.6));
    if (n !== lastLight && n > 0) { lastLight = n; [...$("lights").children].forEach((el, i) => el.classList.toggle("on", i < n)); sfx.light(); buzz(20); }
    if (lightsT >= lightsOut) {
      state = "race"; raceT = 0; $("lights").className = "lights go"; [...$("lights").children].forEach((el) => el.classList.remove("on"));
      toast("VAI!", "green", 0.9); sfx.go(); buzz(80);
    }
  } else if (state === "race") { raceT += dt; if (raceT > 0.8 && !$("lights").hidden) $("lights").hidden = true; }
  else if (state === "done") { doneT += dt; if (doneT > 2.6 && !resultsShown) showResults(); }
  update(dt);
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * DPR * dt; }
  shake = Math.max(0, shake - dt * 22);
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) $("msg").classList.remove("show"); }
  updateHUD(); engineTick();
}
const pf = { n: 0, sum: 0, done: false };
function perfTick(dt) {
  if (pf.done || LOW || state !== "race") return;
  pf.sum += dt; pf.n++;
  if (pf.n >= 90) { const avg = pf.sum / pf.n; pf.n = 0; pf.sum = 0; if (avg > 0.024) { LOW = true; DRAW = 160; pf.done = true; resize(); sizeMini(); } }
}
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0 || paused) return;
  step(dt); perfTick(dt); render();
}

/* =========================================================
   CONTROLES
   ========================================================= */
function toggleDrs() { if (P.drsReady && !P.drs) { P.drs = true; sfx.drs(); buzz(25); } else if (P.drs) P.drs = false; }
function toggleBox() {
  if (state !== "race" || P.pit >= 2) return;
  P.pit = P.pit === 1 ? 0 : 1;
  toast(P.pit === 1 ? "BOX CHAMADO!" : "BOX CANCELADO", "yellow", 1.4);
}
const KB = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "gas", KeyW: "gas", ArrowDown: "brake", KeyS: "brake" };
window.addEventListener("keydown", (e) => {
  const k = KB[e.code];
  if (k) { kb[k] = true; if (state !== "menu" || e.code.startsWith("Arrow")) e.preventDefault(); audio(); }
  if (e.code === "Space" && state !== "menu") { e.preventDefault(); if (!e.repeat) toggleDrs(); }
  if (e.code === "KeyB" && !e.repeat) toggleBox();
  if ((e.code === "KeyP" || e.code === "Escape") && (state === "race" || state === "lights")) { e.preventDefault(); setPause(!paused); }
});
window.addEventListener("keyup", (e) => { const k = KB[e.code]; if (k) kb[k] = false; });
window.addEventListener("blur", () => { for (const k in kb) kb[k] = false; padMap.clear(); syncPad(); });

const pad = $("pad"), padMap = new Map();
function padKeyAt(x, y) { const el = document.elementFromPoint(x, y); const b = el && el.closest ? el.closest("[data-k]") : null; return b ? b.dataset.k : null; }
function syncPad() {
  pin.left = pin.right = pin.brake = false;
  for (const k of padMap.values()) if (k in pin) pin[k] = true;
  pad.querySelectorAll("[data-k]").forEach((b) => b.classList.toggle("down", [...padMap.values()].includes(b.dataset.k)));
}
pad.addEventListener("pointerdown", (e) => {
  const k = padKeyAt(e.clientX, e.clientY); if (!k) return;
  e.preventDefault(); audio();
  if (k === "drs") { toggleDrs(); return; }
  if (k === "box") { toggleBox(); return; }
  padMap.set(e.pointerId, k); syncPad();
  if (k === "left" || k === "right") buzz(8);
});
window.addEventListener("pointermove", (e) => {
  if (!padMap.has(e.pointerId)) return;
  const k = padKeyAt(e.clientX, e.clientY);
  if (k && k !== padMap.get(e.pointerId) && k in pin) { padMap.set(e.pointerId, k); syncPad(); }
});
const padUp = (e) => { if (padMap.delete(e.pointerId)) syncPad(); };
window.addEventListener("pointerup", padUp); window.addEventListener("pointercancel", padUp);
pad.addEventListener("contextmenu", (e) => e.preventDefault());

function setPause(p) {
  if (state !== "race" && state !== "lights") return;
  paused = p; $("pauseScreen").hidden = !p;
  if (p) { padMap.clear(); syncPad(); for (const k in kb) kb[k] = false; }
  last = performance.now(); engineTick();
  if (eng && p) eng.g.gain.setTargetAtTime(0, AC.currentTime, 0.05);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) setPause(true); });
$("btnPause").addEventListener("click", () => setPause(true));
$("btnResume").addEventListener("click", () => setPause(false));
$("btnRestart").addEventListener("click", () => { paused = false; startRace(); });
$("btnQuit").addEventListener("click", () => { paused = false; toMenu(); });
$("btnSound").addEventListener("click", () => { audio(); setSound(!soundOn); });
$("btnPlay").addEventListener("click", startRace);
$("btnAgain").addEventListener("click", startRace);
$("btnMenu").addEventListener("click", toMenu);

/* =========================================================
   MENU
   ========================================================= */
function cardCanvas(c, draw) {
  const d = Math.min(window.devicePixelRatio || 1, 2);
  requestAnimationFrame(() => { const rc = c.getBoundingClientRect(); c.width = Math.max(1, Math.round((rc.width || 120) * d)); c.height = Math.max(1, Math.round((rc.height || 60) * d)); draw(c.getContext("2d"), c.width, c.height); });
}
function poly2(g, a, b, c, d, e, f, h2, i2) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.lineTo(h2, i2); g.closePath(); g.fill(); }
function trackPreview(g, w, h, t) {
  const hy = h * 0.5;
  const gr = g.createLinearGradient(0, 0, 0, hy); t.sky.forEach((c, i) => gr.addColorStop(i / (t.sky.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, w, hy);
  if (t.kind === "night") { for (let k = 0; k < 6; k++) { g.fillStyle = "#121A30"; g.fillRect(k * w / 6, hy - h * (0.15 + (k % 3) * 0.08), w / 6 - 2, h); } g.fillStyle = "rgba(255,248,214,.9)"; circle(g, w * 0.15, hy - h * 0.3, 4); circle(g, w * 0.85, hy - h * 0.3, 4); }
  else if (t.kind === "sunset") { g.fillStyle = "#FFE6A0"; circle(g, w * 0.62, hy - h * 0.08, h * 0.12); g.fillStyle = "#B4573A"; poly2(g, w * 0.05, hy, w * 0.1, hy - h * 0.18, w * 0.4, hy - h * 0.16, w * 0.45, hy); }
  else { g.fillStyle = "#FFFFFF"; circle(g, w * 0.25, h * 0.15, h * 0.06); circle(g, w * 0.3, h * 0.15, h * 0.08); g.fillStyle = "#7FA8A8"; poly2(g, 0, hy, w * 0.3, hy - h * 0.12, w * 0.7, hy - h * 0.08, w, hy); }
  g.fillStyle = t.ground[0]; g.fillRect(0, hy, w, h - hy);
  g.fillStyle = "#E8202A"; poly2(g, w / 2 - 3, hy, w / 2 + 3, hy, w * 0.98, h, w * 0.02, h);
  g.fillStyle = t.road[0]; poly2(g, w / 2 - 2, hy, w / 2 + 2, hy, w * 0.9, h, w * 0.1, h);
}
function buildMenu() {
  const pl = $("pickLivery"); pl.innerHTML = "";
  LIVERIES.forEach((lv, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "card"; b.setAttribute("aria-pressed", String(i === selLiv));
    b.innerHTML = `<canvas></canvas><b></b><span></span>`; b.querySelector("b").textContent = lv.name; b.querySelector("span").textContent = lv.desc;
    b.addEventListener("click", () => { selLiv = i; savePrefs(); [...pl.children].forEach((x, k) => x.setAttribute("aria-pressed", String(k === i))); });
    pl.appendChild(b);
    cardCanvas(b.querySelector("canvas"), (g, w, h) => { g.fillStyle = "#2A2A33"; g.fillRect(0, 0, w, h); g.fillStyle = "#55555E"; poly2(g, w * 0.3, 0, w * 0.7, 0, w, h, 0, h); drawF1(g, w / 2, h * 0.94, Math.min(w * 0.7, h * 1.3), lv, {}); });
  });
  const pt = $("pickTrack"); pt.innerHTML = "";
  TRACKS.forEach((t, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "card"; b.setAttribute("aria-pressed", String(i === selTrack));
    b.innerHTML = `<canvas></canvas><b></b><span></span>`; b.querySelector("b").textContent = t.name; b.querySelector("span").textContent = t.desc;
    b.addEventListener("click", () => {
      if (selTrack !== i) { selTrack = i; savePrefs(); buildTrack(TRACKS[i]); buildBackdrop(); attract(); refreshBest(); }
      [...pt.children].forEach((x, k) => x.setAttribute("aria-pressed", String(k === i)));
    });
    pt.appendChild(b); cardCanvas(b.querySelector("canvas"), (g, w, h) => trackPreview(g, w, h, t));
  });
  const seg = (id, opts, get, set) => {
    const el = $(id); el.innerHTML = "";
    opts.forEach((o, i) => { const b = document.createElement("button"); b.type = "button"; b.textContent = o; b.setAttribute("aria-pressed", String(i === get())); b.addEventListener("click", () => { set(i); savePrefs(); refreshBest(); [...el.children].forEach((x, k) => x.setAttribute("aria-pressed", String(k === i))); }); el.appendChild(b); });
  };
  seg("pickLaps", LAPS_OPT.map((n) => n + " voltas"), () => selLaps, (i) => (selLaps = i));
  seg("pickDiff", DIFFS.map((d) => d.name), () => selDiff, (i) => (selDiff = i));
}
function refreshBest() {
  const t = TRACKS[selTrack], r = rec[recKey()], n = LAPS_OPT[selLaps];
  $("bestStart").textContent = r && r.best != null ? `Recorde (${t.name}, ${n} voltas): ${fmt(r.best)} · melhor volta ${fmt(r.lap)}` : `${t.name}, ${n} voltas: ainda sem recorde. Seja o primeiro!`;
}

/* =========================================================
   INÍCIO
   ========================================================= */
makeSprites();
buildTrack(TRACKS[selTrack]);
resize();
attract();
buildMenu();
refreshBest();
setSound(soundOn);
let rzT = 0;
window.addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => { resize(); sizeMini(); }, 120); });
window.addEventListener("orientationchange", () => setTimeout(() => { resize(); sizeMini(); }, 250));
requestAnimationFrame(loop);
