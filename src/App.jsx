import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
async function sGet(k) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } }
async function sSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ─── Recovery Algorithm ───────────────────────────────────────────────────────
function calcRecovery(c) {
  if (!c) return null;
  const sleepScore = Math.min(c.sleepHours / 8, 1) * 100;
  const qualityScore = (c.sleepQuality / 5) * 100;
  const sorenessScore = ((6 - c.soreness) / 5) * 100;
  const energyScore = (c.energy / 5) * 100;
  const moodScore = (c.mood / 5) * 100;
  const stressScore = ((6 - c.stress) / 5) * 100;
  const achillesScore = ((10 - c.achillesPain) / 10) * 100;
  let score = Math.round(
    sleepScore * 0.25 + qualityScore * 0.15 + sorenessScore * 0.15 +
    energyScore * 0.15 + moodScore * 0.10 + stressScore * 0.10 + achillesScore * 0.10
  );
  if (c.rhr && c.rhr > 0) {
    const rhrScore = Math.max(0, Math.min(100, ((65 - c.rhr) / 15) * 100));
    score = Math.round(score * 0.85 + rhrScore * 0.15);
  }
  return Math.max(5, Math.min(99, score));
}

// ─── Plan Data ────────────────────────────────────────────────────────────────
const STYPES = {
  strength:  { l: "Fuerza",    i: "💪", c: "#7c6af7" },
  cardio:    { l: "Aeróbico",  i: "🚴", c: "#3a7afe" },
  technical: { l: "Técnico",   i: "🥏", c: "#ff8c42" },
  mobility:  { l: "Movilidad", i: "🧘", c: "#a085ff" },
  match:     { l: "Partido",   i: "🏃", c: "#ff4757" },
  rest:      { l: "Descanso",  i: "💤", c: "#5a6273" },
};

const BLOCKS = [
  { id:"A", name:"Bloque A", weeks:[1,2,3],   focus:"Rehabilitación + fuerza base sin impacto",       color:"#16f5a7" },
  { id:"B", name:"Bloque B", weeks:[4,5,6],   focus:"Reintroducción de impacto + potencia",            color:"#3a7afe" },
  { id:"C", name:"Bloque C", weeks:[7,8,9],   focus:"Carga específica Ultimate + capacidad aeróbica",  color:"#ffb800" },
  { id:"D", name:"Bloque D", weeks:[10,11,12],focus:"Alta intensidad + retorno a competición",         color:"#ff4757" },
];

const WT = {
  A:[
    {day:1,type:"rest",title:"Descanso activo",dur:30,ex:["Movilidad suave 15 min","Paseo opcional","Foam roller si hay carga residual"]},
    {day:2,type:"strength",title:"Tren inferior + Aquiles + Volumen pierna",dur:110,ex:["Excéntricos Alfredson 3×15","Sentadilla búlgara 4×8","Peso muerto rumano 4×10","Hip thrust 3×12","Curl femoral 3×12","Abducción cadera banda 3×15","— VOLUMEN —","Curl femoral máquina 3×12","Extensión cuádriceps 3×12","Elevación gemelar sentado 3×15","Abducción cadera máquina 3×15"]},
    {day:3,type:"cardio",title:"Aeróbico sin impacto + core",dur:90,ex:["Bici/elíptica 50 min Z2","Plancha frontal 4×45seg","Plancha lateral 3×12","Rollout 3×10","McGill curl-up 3×10"]},
    {day:4,type:"strength",title:"Tren superior + Lanzamiento + Volumen upper",dur:115,ex:["Press banca inclinado 4×8","Dominadas 4×8","Remo barra 4×10","Press militar 3×10","Face pulls 3×15","Lanzamiento técnico 30 min","— VOLUMEN —","Aperturas mancuerna 3×12","Pullover 3×12","Curl bíceps 3×12","Tríceps polea 3×12","Elevaciones laterales 3×15"]},
    {day:5,type:"mobility",title:"Movilidad + táctica",dur:70,ex:["Foam roller 10 min","Estiramientos 15 min","Propioceptivo tobillo","Visionado vídeos tácticos"]},
    {day:6,type:"strength",title:"Full body + Aquiles + Volumen completo",dur:120,ex:["Excéntricos Alfredson 3×15","Sentadilla frontal 4×6","Peso muerto 4×5","Press banca 3×8","Remo 3×10","Farmer carry 3×20m","— VOLUMEN —","Press banca plano 3×10","Remo con mancuerna 3×10","Fondos en paralelas 3×10","Curl inclinado 3×12","Crunch en polea 3×15","Plancha 3×45seg"]},
    {day:7,type:"cardio",title:"Aeróbico largo",dur:105,ex:["Bici/elíptica 90 min Z2","FC 125-140 ppm","Constante y suave"]},
  ],
  B:[
    {day:1,type:"rest",title:"Descanso activo",dur:30,ex:["Movilidad suave","Paseo ligero","Estiramientos cadena posterior"]},
    {day:2,type:"strength",title:"Tren inferior + Aquiles + Volumen pierna",dur:110,ex:["Excéntricos con chaleco 3×12","Sentadilla búlgara 4×8","Peso muerto rumano 4×10","Leg press 4×10","Hip thrust 3×12","Abducción cadera 3×15","— VOLUMEN —","Curl femoral máquina 4×10","Prensa pierna 4×10","Gemelar sentado 4×12","Hip abductor máquina 3×15"]},
    {day:3,type:"cardio",title:"Trote intervalado + core",dur:90,ex:["Trote 2'/caminar 2' ×8","Progresión semana 5→3'/1', semana 6→4'/1'","Plancha 4×50seg","Dead bug 3×12","Pallof press 3×10"]},
    {day:4,type:"strength",title:"Tren superior + Lanzamiento + Volumen upper",dur:115,ex:["Press banca 4×6","Dominadas lastradas 4×6","Remo pesado 4×8","Lanzamiento + desplazamiento lateral","Hucks con carrerilla suave","— VOLUMEN —","Aperturas inclinadas 4×10","Remo en polea alta 4×10","Curl martillo 4×10","Tríceps cuerda 4×10","Elevaciones laterales 4×12"]},
    {day:5,type:"mobility",title:"Propiocepción + saltos básicos",dur:75,ex:["Foam roller","Saltos bilaterales bajos 3×8","Aterrizaje controlado 3×10","Equilibrio inestable 3×30s"]},
    {day:6,type:"strength",title:"Full body + Aquiles + Volumen completo",dur:120,ex:["Excéntricos con carga 3×12","Sentadilla 4×5","Peso muerto 4×5","Press militar 3×8","Remo polea 3×10","Farmer carry 3×25m","— VOLUMEN —","Press banca inclinado 4×8","Dominadas 4×6","Dips lastrados 3×8","Curl bíceps barra 3×10","Rueda abdominal 3×10","Plancha lateral 3×30seg"]},
    {day:7,type:"cardio",title:"Fartlek en bici/elíptica",dur:100,ex:["20 min Z1","Intervalos 20s fuerte / 2 min suave ×8","Intervalos 30s fuerte / 90s suave ×6","20 min Z1"]},
  ],
  C:[
    {day:1,type:"rest",title:"Descanso activo",dur:20,ex:["Movilidad suave","Foam roller si necesario"]},
    {day:2,type:"strength",title:"Potencia tren inferior + Volumen pierna",dur:110,ex:["Excéntricos mantenimiento 3×10","Sentadilla explosiva 5×3","Box jumps 4×5","Peso muerto 4×4","Hip thrust pesado 3×6","Saltos laterales 3×6/lado","— VOLUMEN —","Curl femoral 4×8","Sentadilla hack 4×8","Gemelar de pie 4×12","Zancada lateral 3×10"]},
    {day:3,type:"technical",title:"Cuts + aceleración + disco",dur:90,ex:["Calentamiento dinámico 15 min","Cuts 45° media intensidad 4×6","Cuts 90° (in-cut) 4×6","Aceleraciones 10m ×8","Lanzamiento con presión temporal"]},
    {day:4,type:"strength",title:"Tren superior potencia + Volumen upper",dur:115,ex:["Press banca explosivo 5×3","Dominadas explosivas 4×5","Push press 4×4","Remo Pendlay 4×6","Rotaciones externas 3×15","— VOLUMEN —","Press de pecho máquina 4×10","Pulldown agarre neutro 4×8","Curl concentrado 3×12","Fondos en paralelas 3×10","Face pulls 3×15"]},
    {day:5,type:"mobility",title:"Recuperación activa + táctica",dur:70,ex:["Foam roller completo","Movilidad caderas y tobillos","Sombra 1v1 sin disco","Visionado: zone defense, H-stack"]},
    {day:6,type:"strength",title:"Full body potencia + Volumen completo",dur:120,ex:["Excéntricos mantenimiento 3×10","Sentadilla explosiva 4×3","Peso muerto 4×4","Press banca 3×6","Remo 3×8","Farmer carry 3×25m","— VOLUMEN —","Press banca pesado 4×6","Remo Pendlay 4×6","Fondos lastrados 3×8","Curl martillo 3×10","Ab wheel 3×12","Dragon flag progresión 3×5"]},
    {day:7,type:"cardio",title:"Intervalos tipo punto Ultimate",dur:90,ex:["Calentamiento 15 min","30s máxima / 90s descanso ×12","15s sprint / 45s descanso ×8","Vuelta calma 15 min"]},
  ],
  D:[
    {day:1,type:"rest",title:"Descanso completo",dur:0,ex:["Descanso total","Hidratación y nutrición de recuperación"]},
    {day:2,type:"strength",title:"Fuerza máxima + Aquiles + Volumen pierna",dur:110,ex:["Excéntricos mantenimiento 2×10","Sentadilla 5×3 al 85%","Peso muerto 5×3 al 85%","Hip thrust pesado 3×5","Pistol squat asistido 3×5/pierna","— VOLUMEN —","Curl femoral 3×10","Prensa unilateral 3×10","Gemelar 3×12"]},
    {day:3,type:"technical",title:"Cuts explosivos + lanzamiento máximo",dur:100,ex:["Calentamiento completo","Cuts 45° máxima velocidad 4×5","Cuts 90° máxima velocidad 4×5","Sprints 20-30m ×8 arranque variado","Hucks máxima potencia ×10","Break-mark bajo presión (IO, OI, hammer)"]},
    {day:4,type:"strength",title:"Tren superior + Lanzamiento + Volumen upper",dur:115,ex:["Press banca 4×4","Dominadas lastradas 4×5","Remo pesado 4×6","Lanzamientos con viento","Footwork defensivo 4×30s","— VOLUMEN —","Aperturas 3×10","Remo polea 3×10","Curl bíceps 3×10","Tríceps 3×10"]},
    {day:5,type:"mobility",title:"Recuperación + táctica pre-comp",dur:60,ex:["Movilidad completa","Foam roller","Análisis: set plays, endzone","Visualización pre-partido"]},
    {day:6,type:"match",title:"Partido / entreno con equipo",dur:120,ex:["Semana 10: 50% tiempo de juego","Semana 11: 70% ritmo casi completo","Semana 12: 100% competitivo","Si Aquiles >4/10 → parar"]},
    {day:7,type:"rest",title:"Descanso activo",dur:20,ex:["Movilidad suave","Estiramientos ligeros"]},
  ],
};

function genPlan(startDate, planId="plan-1") {
  const ss = [], start = new Date(startDate);
  for (let w=1; w<=12; w++) {
    const bId = w<=3?"A":w<=6?"B":w<=9?"C":"D";
    for (const t of WT[bId]) {
      const d = new Date(start);
      d.setDate(start.getDate() + (w-1)*7 + (t.day-1));
      ss.push({ id:`${planId}-w${w}-d${t.day}`, planId, week:w, block:bId, date:d.toISOString().split("T")[0], type:t.type, title:t.title, duration:t.dur, exercises:t.ex, status:"pending", log:null });
    }
  }
  return ss;
}

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const rc = r => r>=67?"#16f5a7":r>=34?"#ffb800":"#ff4757";

// ─── AI SYSTEM PROMPT ─────────────────────────────────────────────────────────
function buildSystemPrompt(appState) {
  const { sessions, checkins, planMeta, currentWeek } = appState;
  const done = sessions.filter(s=>s.status==="done");
  const pending = sessions.filter(s=>s.status==="pending");
  const todayCI = checkins[todayISO()];
  const recentCheckins = Object.entries(checkins).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
  const todaySess = sessions.filter(s=>s.date===todayISO());
  const avgPain = recentCheckins.length ? (recentCheckins.reduce((a,[,c])=>a+(c.achillesPain||0),0)/recentCheckins.length).toFixed(1) : null;

  return `Eres el entrenador personal de IA integrado en PULSE, una app de entrenamiento para atleta de Ultimate Frisbee de élite.

PERFIL DEL ATLETA:
- 31 años, nivel selección nacional / internacional
- 8+ años compitiendo, 5-6 días/semana antes
- Recuperándose de tendinopatía de Aquiles (3 meses de baja)
- Puede entrenar 6 días/semana, 90-120 min/sesión, gym completo, sin equipo
- Historial: lesiones rodilla/tobillo/espalda (3-5 años, estables)

ESTADO ACTUAL DEL PLAN:
- Plan: ${planMeta?.name || "Vuelta al Ultimate"} (inicio: ${planMeta?.startDate})
- Semana actual: ${currentWeek}/12
- Sesiones completadas: ${done.length}/${sessions.length}
- Sesiones de hoy: ${todaySess.map(s=>`${s.title} (${s.status})`).join(", ")||"ninguna"}
- Dolor medio Aquiles últimos 7 días: ${avgPain ?? "sin datos"}/10

CHECK-IN DE HOY (${todayISO()}):
${todayCI ? `Recovery: ${todayCI.recovery}% | Sueño: ${todayCI.sleepHours}h (calidad ${todayCI.sleepQuality}/5) | Energía: ${todayCI.energy}/5 | Dolor muscular: ${todayCI.soreness}/5 | Aquiles: ${todayCI.achillesPain}/10 | Estrés: ${todayCI.stress}/5` : "Sin check-in hoy"}

ÚLTIMOS CHECK-INS:
${recentCheckins.map(([d,c])=>`${d}: Recovery ${c.recovery}% | Aquiles ${c.achillesPain}/10 | Energía ${c.energy}/5`).join("\n")||"Sin datos"}

PRÓXIMAS SESIONES (7 días):
${pending.slice(0,7).map(s=>`${s.date} (S${s.week}/${s.block}): ${s.title} - ${s.duration}min`).join("\n")}

CAPACIDADES:
Puedes modificar el plan del atleta devolviendo un objeto JSON con acciones al final de tu respuesta.
SIEMPRE termina con un bloque JSON entre <actions> y </actions> SOLO si necesitas modificar algo en la app.

ACCIONES DISPONIBLES:
1. Marcar sesión como hecha/saltada/pendiente:
   {"action":"update_session","id":"plan-1-w1-d1","status":"done","log":{"pain":2,"feeling":4,"rpe":6,"notes":"Fue bien"}}

2. Cambiar fecha de inicio del plan (regenera todo el plan):
   {"action":"regen_plan","startDate":"2026-05-18","name":"Vuelta al Ultimate"}

3. Modificar ejercicios de una sesión específica:
   {"action":"modify_session_exercises","id":"plan-1-w1-d1","exercises":["Nuevo ejercicio 1","Nuevo ejercicio 2"]}

4. Cambiar duración de una sesión:
   {"action":"update_session_duration","id":"plan-1-w1-d1","duration":60}

5. Guardar check-in de recovery:
   {"action":"save_checkin","date":"2026-05-18","checkin":{"sleepHours":7.5,"sleepQuality":4,"soreness":2,"energy":4,"mood":4,"stress":2,"achillesPain":1,"rhr":0}}

6. Mostrar notificación al usuario:
   {"action":"notify","message":"He actualizado tu sesión de mañana.","type":"success"}

Puedes encadenar múltiples acciones en un array:
<actions>[{"action":"..."},{"action":"..."}]</actions>

INSTRUCCIONES:
- Habla SIEMPRE en español, con tono de entrenador profesional cercano
- Tienes memoria del contexto completo de la conversación
- Cuando el atleta te diga cómo fue un entreno, actualiza automáticamente la sesión
- Si el dolor de Aquiles es alto (>5), recomienda ajustar carga y modifica la sesión
- Aprende de los patrones: si el atleta tiene problemas recurrentes, ajusta el plan
- Si te piden "actualiza", "marca", "cambia", "modifica" → SIEMPRE usa acciones
- Sé proactivo: sugiere ajustes basándote en los datos de recovery y dolor
- Usa los IDs exactos de las sesiones para modificarlas`;
}

// ─── AI API Call ──────────────────────────────────────────────────────────────
async function callAI(messages, appState) {
  const systemPrompt = buildSystemPrompt(appState);
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-app-token": import.meta.env.VITE_APP_SECRET || "" },
    body: JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.content[0]?.text || "";
}

// ─── Parse AI Actions ─────────────────────────────────────────────────────────
function parseActions(text) {
  const match = text.match(/<actions>([\s\S]*?)<\/actions>/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch { return []; }
}

function stripActions(text) {
  return text.replace(/<actions>[\s\S]*?<\/actions>/g, "").trim();
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("today");
  const [sessions, setSessions] = useState([]);
  const [planMeta, setPlanMeta] = useState(null);
  const [checkins, setCheckins] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [modal, setModal] = useState(null);
  const [activeSess, setActiveSess] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [notification, setNotification] = useState(null);
  const [authed, setAuthed] = useState(() => {
    try {
      const raw = localStorage.getItem('pulse_auth');
      if (!raw) return false;
      const { ts } = JSON.parse(raw);
      return Date.now() - ts < 30 * 24 * 60 * 60 * 1000;
    } catch { return false; }
  });

  useEffect(() => {
    (async () => {
      const pm = await sGet("p_meta");
      const ss = await sGet("p_sess");
      const ci = await sGet("p_checkins");
      const ch = await sGet("p_chat");
      if (ci) setCheckins(ci);
      if (ch) setChatHistory(ch);
      if (!pm) {
        const m = { id:"plan-1", name:"Vuelta al Ultimate", startDate:"2026-05-18", athlete:"31 años · selección" };
        setPlanMeta(m); setSessions(genPlan("2026-05-18")); sSet("p_meta", m);
      } else {
        setPlanMeta(pm);
        if (ss) setSessions(ss); else setSessions(genPlan(pm.startDate, pm.id));
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded && sessions.length) sSet("p_sess", sessions); }, [sessions, loaded]);
  useEffect(() => { if (loaded && planMeta) sSet("p_meta", planMeta); }, [planMeta, loaded]);
  useEffect(() => { if (loaded) sSet("p_checkins", checkins); }, [checkins, loaded]);
  useEffect(() => { if (loaded && chatHistory.length) sSet("p_chat", chatHistory); }, [chatHistory, loaded]);

  const showNotif = useCallback((msg, type="success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const applyActions = useCallback((actions, currentSessions, currentPlanMeta, currentCheckins) => {
    let newSessions = [...currentSessions];
    let newPlanMeta = { ...currentPlanMeta };
    let newCheckins = { ...currentCheckins };

    for (const act of actions) {
      switch (act.action) {
        case "update_session":
          newSessions = newSessions.map(s => s.id === act.id ? { ...s, status: act.status, log: act.log || s.log } : s);
          break;
        case "regen_plan":
          newPlanMeta = { ...newPlanMeta, startDate: act.startDate, name: act.name || newPlanMeta.name };
          newSessions = genPlan(act.startDate, newPlanMeta.id);
          break;
        case "modify_session_exercises":
          newSessions = newSessions.map(s => s.id === act.id ? { ...s, exercises: act.exercises } : s);
          break;
        case "update_session_duration":
          newSessions = newSessions.map(s => s.id === act.id ? { ...s, duration: act.duration } : s);
          break;
        case "save_checkin": {
          const score = calcRecovery(act.checkin);
          newCheckins = { ...newCheckins, [act.date]: { ...act.checkin, recovery: score, timestamp: new Date().toISOString() } };
          break;
        }
        case "notify":
          showNotif(act.message, act.type);
          break;
      }
    }
    return { newSessions, newPlanMeta, newCheckins };
  }, [showNotif]);

  const saveCheckin = (date, data) => {
    const score = calcRecovery(data);
    const updated = { ...checkins, [date]: { ...data, recovery: score, timestamp: new Date().toISOString() } };
    setCheckins(updated);
    setModal(null);
  };

  const updateSess = (id, u) => setSessions(p => p.map(s => s.id === id ? { ...s, ...u } : s));
  const regenPlan = (sd, nm) => {
    const m = { ...planMeta, startDate: sd, name: nm || planMeta.name };
    setPlanMeta(m); setSessions(genPlan(sd, m.id));
  };

  const cw = useMemo(() => {
    if (!planMeta) return 1;
    const d = Math.floor((new Date() - new Date(planMeta.startDate)) / 86400000);
    return Math.min(12, Math.max(1, Math.floor(d/7)+1));
  }, [planMeta]);

  const cb = BLOCKS.find(b => b.weeks.includes(cw));
  const todayCI = checkins[todayISO()];
  const todayRec = todayCI?.recovery;

  const appState = useMemo(() => ({ sessions, checkins, planMeta, currentWeek: cw }), [sessions, checkins, planMeta, cw]);

  const handleAIActions = useCallback((actions) => {
    const { newSessions, newPlanMeta, newCheckins } = applyActions(actions, sessions, planMeta, checkins);
    setSessions(newSessions);
    setPlanMeta(newPlanMeta);
    setCheckins(newCheckins);
  }, [sessions, planMeta, checkins, applyActions]);

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;
  if (!loaded || !planMeta) return <div style={{ background:"#000", minHeight:"100vh" }} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.15)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes notifIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn .4s ease-out both}
        .nb:active{transform:scale(.92)}
        ::-webkit-scrollbar{display:none}
      `}</style>

      {/* Notification */}
      {notification && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background: notification.type==="error"?"#ff4757":"#16f5a7", color:"#000", padding:"10px 20px", borderRadius:20, fontSize:12, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", zIndex:999, animation:"notifIn .3s ease-out", whiteSpace:"nowrap", maxWidth:360 }}>
          {notification.msg}
        </div>
      )}

      <div style={S.root}>
        <div style={S.app}>
          <div style={S.bar}>
            <div style={S.logoBox}><div style={S.logoDot}/><span style={S.logoTxt}>PULSE</span></div>
            <div style={S.barR}><span style={S.barW}>S{cw}/12</span></div>
          </div>

          <div style={S.content}>
            {tab==="today"    && <TodayTab sessions={sessions} checkins={checkins} cw={cw} cb={cb} todayRec={todayRec} todayCI={todayCI} onCheckin={()=>setModal("checkin")} onSess={s=>{setActiveSess(s);setModal("session")}} />}
            {tab==="calendar" && <CalTab sessions={sessions} checkins={checkins} onSess={s=>{setActiveSess(s);setModal("session")}} />}
            {tab==="plan"     && <PlanTab pm={planMeta} sessions={sessions} cw={cw} onRegen={()=>setModal("plan")} onSess={s=>{setActiveSess(s);setModal("session")}} />}
            {tab==="recovery" && <RecTab checkins={checkins} onCheckin={()=>setModal("checkin")} />}
            {tab==="coach"    && <CoachTab appState={appState} chatHistory={chatHistory} setChatHistory={setChatHistory} onActions={handleAIActions} showNotif={showNotif} />}
          </div>

          <nav style={S.nav}>
            {[{id:"today",l:"Hoy",ic:"◐"},{id:"calendar",l:"Calendario",ic:"▦"},{id:"plan",l:"Plan",ic:"≡"},{id:"recovery",l:"Recovery",ic:"♥"},{id:"coach",l:"Coach IA",ic:"✦"}].map(t=>(
              <button key={t.id} className="nb" style={{...S.navBtn,...(tab===t.id?S.navAct:{})}} onClick={()=>setTab(t.id)}>
                <span style={S.navIc}>{t.ic}</span><span style={S.navLbl}>{t.l}</span>
              </button>
            ))}
          </nav>
        </div>

        {modal==="checkin"  && <CheckinModal date={todayISO()} existing={todayCI} onSave={saveCheckin} onClose={()=>setModal(null)} />}
        {modal==="session"  && activeSess && <SessModal s={activeSess} sessions={sessions} onClose={()=>{setModal(null);setActiveSess(null)}} onUpdate={u=>{updateSess(activeSess.id,u);setActiveSess({...activeSess,...u})}} />}
        {modal==="plan"     && <PlanModal pm={planMeta} onClose={()=>setModal(null)} onSave={(s,n)=>{regenPlan(s,n);setModal(null)}} />}
      </div>
    </>
  );
}

// ─── Coach Tab (AI Chat) ──────────────────────────────────────────────────────
function CoachTab({ appState, chatHistory, setChatHistory, onActions, showNotif }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatHistory, loading]);

  const QUICK = [
    "¿Cómo está mi recuperación?",
    "Marca la sesión de hoy como hecha",
    "Ajusta el plan si el Aquiles está mal",
    "¿Qué toca esta semana?",
    "Tengo dolor 6/10 en Aquiles hoy",
    "Dame un resumen de mi progreso",
  ];

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role:"user", content:msg, ts: Date.now() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setLoading(true);

    try {
      const apiMessages = newHistory.map(m => ({ role: m.role, content: m.content }));
      const rawResp = await callAI(apiMessages, appState);
      const actions = parseActions(rawResp);
      const cleanText = stripActions(rawResp);

      const aiMsg = { role:"assistant", content:cleanText, actions: actions.length > 0 ? actions : undefined, ts: Date.now() };
      setChatHistory(prev => [...prev, aiMsg]);

      if (actions.length > 0) {
        onActions(actions);
        const notNotifs = actions.filter(a => a.action !== "notify");
        if (notNotifs.length > 0) showNotif(`✓ ${notNotifs.length} cambio${notNotifs.length>1?"s":""} aplicado${notNotifs.length>1?"s":""} en la app`, "success");
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role:"assistant", content:`Error al conectar con la IA: ${e.message}. Comprueba la conexión.`, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => { setChatHistory([]); sSet("p_chat", []); };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)" }}>
      {/* Header */}
      <div style={S.coachH}>
        <div style={S.coachHLeft}>
          <div style={{ ...S.logoDot, width:10, height:10, background:"#a085ff", boxShadow:"0 0 12px #a085ff" }} />
          <div>
            <div style={S.coachHTitle}>Coach IA</div>
            <div style={S.coachHSub}>Accede a tu plan · Lo modifica en tiempo real</div>
          </div>
        </div>
        {chatHistory.length > 0 && <button style={S.clearBtn} onClick={clearChat}>Limpiar</button>}
      </div>

      {/* Messages */}
      <div style={S.msgArea}>
        {chatHistory.length === 0 && (
          <div style={S.emptyChat}>
            <div style={S.emptyChatIcon}>✦</div>
            <div style={S.emptyChatTitle}>Tu entrenador personal IA</div>
            <div style={S.emptyChatSub}>Conoce tu plan completo, tu historial de recovery y puede modificar tus sesiones en tiempo real. Pregúntale lo que necesites.</div>
            <div style={S.quickGrid}>
              {QUICK.map((q,i) => (
                <button key={i} style={S.quickBtn} onClick={()=>send(q)}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((m, i) => (
          <div key={i} style={{ ...S.msgRow, justifyContent: m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && <div style={S.aiAvatar}>✦</div>}
            <div style={{ ...S.bubble, ...(m.role==="user" ? S.bubbleUser : S.bubbleAI) }}>
              <div style={S.bubbleText}>{m.content}</div>
              {m.actions && m.actions.length > 0 && (
                <div style={S.actionBadge}>
                  ⚡ {m.actions.filter(a=>a.action!=="notify").length} cambio{m.actions.filter(a=>a.action!=="notify").length!==1?"s":""} aplicado{m.actions.filter(a=>a.action!=="notify").length!==1?"s":""}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...S.msgRow, justifyContent:"flex-start" }}>
            <div style={S.aiAvatar}>✦</div>
            <div style={{ ...S.bubble, ...S.bubbleAI, ...S.bubbleLoading }}>
              <span style={{ animation:"blink 1.2s infinite" }}>●</span>
              <span style={{ animation:"blink 1.2s infinite .2s" }}>●</span>
              <span style={{ animation:"blink 1.2s infinite .4s" }}>●</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions (only when has history) */}
      {chatHistory.length > 0 && !loading && (
        <div style={S.quickRow}>
          {QUICK.slice(0,3).map((q,i) => (
            <button key={i} style={S.quickChip} onClick={()=>send(q)}>{q}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={S.inputArea}>
        <textarea
          ref={inputRef}
          style={S.chatInput}
          placeholder="Habla con tu coach…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1}
          disabled={loading}
        />
        <button style={{ ...S.sendBtn, opacity: (!input.trim()||loading)?0.4:1 }} onClick={()=>send(input)} disabled={!input.trim()||loading}>
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────
function TodayTab({ sessions, checkins, cw, cb, todayRec, todayCI, onCheckin, onSess }) {
  const td = todayISO();
  const todaySess = sessions.filter(s => s.date === td);
  const doneTot = sessions.filter(s => s.status === "done").length;
  const yesterdayISO = new Date(Date.now()-86400000).toISOString().split("T")[0];
  const delta = (todayRec && checkins[yesterdayISO]?.recovery) ? todayRec - checkins[yesterdayISO].recovery : null;

  const reco = useMemo(() => {
    if (!todayRec) return { t:"Sin check-in", txt:"Haz tu check-in matutino para ver tu recovery.", c:"#7a8599" };
    if (todayRec >= 67) return { t:"Día verde ✓", txt:"Tu cuerpo está listo. Aprovecha para sesión exigente.", c:"#16f5a7" };
    if (todayRec >= 34) return { t:"Día amarillo", txt:"Recovery moderado. Mantén plan sin pico de intensidad.", c:"#ffb800" };
    return { t:"Día rojo", txt:"Tu cuerpo necesita descanso. No fuerces el Aquiles.", c:"#ff4757" };
  }, [todayRec]);

  return (
    <div className="fi">
      <div style={S.greeting}><div style={S.dateLn}>{new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}).toUpperCase()}</div><div style={S.greetTxt}>Buen día.</div></div>

      {todayRec ? (
        <div style={S.hero}><RecRing v={todayRec} sz={200}/>{delta!==null && <div style={{...S.delta, color:delta>=0?"#16f5a7":"#ff4757"}}>{delta>=0?"▲":"▼"} {Math.abs(delta)}% vs ayer</div>}<div style={S.heroMets}>{todayCI && <><HM l="Sueño" v={todayCI.sleepHours} u="h"/><HM l="Energía" v={todayCI.energy} u="/5"/><HM l="Aquiles" v={todayCI.achillesPain} u="/10"/></>}</div></div>
      ) : (
        <button style={S.ciPrompt} onClick={onCheckin}><div style={S.ciIcon}>◐</div><div><div style={S.ciTitle}>Check-in matutino</div><div style={S.ciSub}>Registra cómo te sientes para calcular tu recovery</div></div><span style={{color:"#16f5a7",fontSize:20}}>›</span></button>
      )}

      <div style={{...S.recoCard, borderColor:reco.c+"40"}}><div style={S.recoH}><span style={{...S.recoDot, background:reco.c, boxShadow:`0 0 12px ${reco.c}80`, animation:"pulse 2s infinite"}}/><span style={S.recoT}>{reco.t}</span></div><div style={S.recoTxt}>{reco.txt}</div>{todayRec && <button style={S.recoBtn} onClick={onCheckin}>Actualizar</button>}</div>

      <div style={{...S.blockCard, borderColor:cb?.color+"40"}}><div style={S.blockTop}><div><div style={S.blockLbl}>SEMANA {cw} / 12</div><div style={{...S.blockName, color:cb?.color}}>{cb?.name}</div></div><div style={{...S.blockPct, background:cb?.color+"22", color:cb?.color}}>{Math.round(cw/12*100)}%</div></div><div style={S.blockBar}><div style={{...S.blockFill, width:`${cw/12*100}%`, background:cb?.color}}/></div><div style={S.blockFocus}>{cb?.focus}</div></div>

      <SL>Entreno de hoy</SL>
      {todaySess.length===0 ? <div style={S.empty}>No hay sesiones programadas hoy</div> : todaySess.map(s=><SCard key={s.id} s={s} onClick={()=>onSess(s)}/>)}

      <div style={S.cardGrid}><DC l="Completadas" v={doneTot} u={`/${sessions.length}`} c="#16f5a7"/><DC l="% plan" v={Math.round(doneTot/sessions.length*100)} u="%" c="#a085ff"/></div>

      <SL>Recovery reciente</SL>
      <RecStrip checkins={checkins}/>
    </div>
  );
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────
function CalTab({ sessions, checkins, onSess }) {
  const [ref, setRef] = useState(new Date());
  const [sel, setSel] = useState(todayISO());
  const ms=new Date(ref.getFullYear(),ref.getMonth(),1);
  const me=new Date(ref.getFullYear(),ref.getMonth()+1,0);
  const off=(ms.getDay()+6)%7, tc=Math.ceil((me.getDate()+off)/7)*7;
  const grid=[];for(let i=0;i<tc;i++){const d=new Date(ms);d.setDate(1-off+i);grid.push(d);}
  const selSess=sessions.filter(s=>s.date===sel), selCI=checkins[sel];

  return (
    <div className="fi">
      <div style={S.tH}><div style={S.tT}>Calendario</div><div style={S.tS}>Plan + recovery</div></div>
      <div style={S.calH}><button style={S.calNav} onClick={()=>setRef(new Date(ref.getFullYear(),ref.getMonth()-1,1))}>‹</button><div style={S.calMo}>{ref.toLocaleDateString("es-ES",{month:"long",year:"numeric"})}</div><button style={S.calNav} onClick={()=>setRef(new Date(ref.getFullYear(),ref.getMonth()+1,1))}>›</button></div>
      <div style={S.calWd}>{["L","M","X","J","V","S","D"].map(d=><div key={d} style={S.calWdI}>{d}</div>)}</div>
      <div style={S.calG}>{grid.map((d,i)=>{const iso=d.toISOString().split("T")[0];const inM=d.getMonth()===ref.getMonth();const isT=iso===todayISO();const isS=iso===sel;const ds=sessions.filter(s=>s.date===iso);const ci=checkins[iso];return(<button key={i} onClick={()=>setSel(iso)} style={{...S.calC,opacity:inM?1:.3,borderColor:isS?"#16f5a7":isT?"#16f5a770":"#1a1a1f",background:isS?"#16f5a712":"transparent"}}>{ci&&inM&&<div style={{...S.calRD,background:rc(ci.recovery)}}/>}<div style={{...S.calDN,color:isT?"#16f5a7":"#fff",fontWeight:isT?700:400}}>{d.getDate()}</div>{ds.length>0&&<div style={S.calDs}>{ds.slice(0,3).map((s,j)=><span key={j} style={{...S.calDt,background:s.status==="done"?"#16f5a7":s.status==="skipped"?"#ff4757":STYPES[s.type]?.c,opacity:s.type==="rest"?.3:1}}/>)}</div>}</button>);})}</div>
      <div style={S.dayD}><div style={S.dayHL}>{new Date(sel).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}).toUpperCase()}</div><div style={S.dayHM}>{selSess[0]&&<span>Semana {selSess[0].week} · Bloque {selSess[0].block}</span>}{selCI&&<span style={{marginLeft:8,color:rc(selCI.recovery)}}>Recovery {selCI.recovery}%</span>}</div></div>
      {selSess.length===0?<div style={S.empty}>No hay sesiones</div>:selSess.map(s=><SCard key={s.id} s={s} onClick={()=>onSess(s)}/>)}
    </div>
  );
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────
function PlanTab({ pm, sessions, cw, onRegen, onSess }) {
  const [ew, setEw] = useState(cw);
  return (
    <div className="fi">
      <div style={S.tH}><div style={S.tT}>Plan</div><div style={S.tS}>{pm.name}</div></div>
      <div style={S.planMR}><div style={S.planMT}>Inicio: {new Date(pm.startDate).toLocaleDateString("es-ES")}</div><button style={S.editBtn} onClick={onRegen}>Editar</button></div>
      {BLOCKS.map(b=>{const bs=sessions.filter(s=>s.block===b.id);const dn=bs.filter(s=>s.status==="done").length;const cur=b.weeks.includes(cw);return(<div key={b.id} style={{...S.bBox,borderLeftColor:b.color,opacity:cur?1:.85}}><div style={S.bBoxH}><div><div style={{...S.bBoxN,color:b.color}}>{b.name}</div><div style={S.bBoxW}>Semanas {b.weeks[0]}–{b.weeks[2]}</div></div><div style={{...S.bBoxBdg,background:b.color+"22",color:b.color}}>{dn}/{bs.length}</div></div><div style={S.bBoxF}>{b.focus}</div>{b.weeks.map(w=>{const ws=sessions.filter(s=>s.week===w);const wd=ws.filter(s=>s.status==="done").length;const exp=ew===w;const iC=w===cw;return(<div key={w} style={S.wBox}><button style={{...S.wH,background:iC?"#16f5a712":"transparent"}} onClick={()=>setEw(exp?null:w)}><div style={S.wHL}><span style={S.wN}>Semana {w}</span>{iC&&<span style={S.curT}>actual</span>}</div><span style={S.wP}>{wd}/{ws.length}</span></button>{exp&&<div style={S.wC}>{ws.map(s=><SCard key={s.id} s={s} onClick={()=>onSess(s)} compact/>)}</div>}</div>);})}</div>);})}
      <button style={S.regenB} onClick={onRegen}>Modificar o reiniciar plan</button>
    </div>
  );
}

// ─── Recovery Tab ─────────────────────────────────────────────────────────────
function RecTab({ checkins, onCheckin }) {
  const sorted=Object.entries(checkins).sort((a,b)=>b[0].localeCompare(a[0]));
  const todayCI=checkins[todayISO()];
  const last14=sorted.slice(0,14).reverse();
  const recData=last14.map(([d,c])=>({x:d.slice(5),y:c.recovery}));
  const achData=last14.map(([d,c])=>({x:d.slice(5),y:c.achillesPain}));
  return (
    <div className="fi">
      <div style={S.tH}><div style={S.tT}>Recovery</div><div style={S.tS}>Check-in matutino · datos reales</div></div>
      {todayCI?(<div style={S.hero}><RecRing v={todayCI.recovery} sz={200}/><div style={S.heroMets}><HM l="Sueño" v={todayCI.sleepHours} u="h"/><HM l="Calidad" v={todayCI.sleepQuality} u="/5"/><HM l="Energía" v={todayCI.energy} u="/5"/></div><div style={S.heroMets}><HM l="Dolor musc." v={todayCI.soreness} u="/5"/><HM l="Estrés" v={todayCI.stress} u="/5"/><HM l="Aquiles" v={todayCI.achillesPain} u="/10"/></div><button style={{...S.recoBtn,marginTop:14}} onClick={onCheckin}>Actualizar</button></div>):(<button style={S.ciPrompt} onClick={onCheckin}><div style={S.ciIcon}>◐</div><div><div style={S.ciTitle}>Check-in de hoy</div><div style={S.ciSub}>Registra tus datos para ver recovery</div></div><span style={{color:"#16f5a7",fontSize:20}}>›</span></button>)}
      <SL>Fórmula</SL>
      <div style={S.fCard}>{[{l:"Sueño (horas)",w:"25%"},{l:"Calidad sueño",w:"15%"},{l:"Dolor muscular ↓",w:"15%"},{l:"Energía",w:"15%"},{l:"Ánimo",w:"10%"},{l:"Estrés ↓",w:"10%"},{l:"Aquiles ↓",w:"10%"}].map((f,i)=><div key={i} style={S.fRow}><span style={S.fL}>{f.l}</span><span style={S.fW}>{f.w}</span></div>)}</div>
      {recData.length>1&&<><SL>Recovery</SL><CChart data={recData} max={100} cf={rc}/></>}
      {achData.length>1&&<><SL>Dolor Aquiles</SL><LChart data={achData} color="#ff4757"/></>}
      <SL>Historial</SL>
      {sorted.length===0?<div style={S.empty}>Aún no hay check-ins</div>:sorted.slice(0,10).map(([d,c])=>(<div key={d} style={S.histR}><div style={{...S.histDot,background:rc(c.recovery)}}/><div style={S.histI}><div style={S.histD}>{new Date(d).toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"short"})}</div><div style={S.histM}>Sueño {c.sleepHours}h · Energía {c.energy}/5 · Aquiles {c.achillesPain}/10</div></div><div style={{...S.histRec,color:rc(c.recovery)}}>{c.recovery}%</div></div>))}
    </div>
  );
}

// ─── Checkin Modal ────────────────────────────────────────────────────────────
function CheckinModal({ date, existing, onSave, onClose }) {
  const [f, setF] = useState({ sleepHours:existing?.sleepHours??7, sleepQuality:existing?.sleepQuality??3, soreness:existing?.soreness??2, energy:existing?.energy??3, mood:existing?.mood??3, stress:existing?.stress??2, achillesPain:existing?.achillesPain??1, rhr:existing?.rhr??0 });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const preview=calcRecovery(f);
  return (
    <Modal t="Check-in matutino" sub={new Date(date).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})} onClose={onClose}>
      <div style={{textAlign:"center",margin:"8px 0 16px"}}><div style={{fontSize:11,color:"#7a8599",letterSpacing:2,fontFamily:"'JetBrains Mono',monospace"}}>RECOVERY ESTIMADO</div><div style={{fontSize:52,fontWeight:300,color:rc(preview),lineHeight:1,marginTop:4}}>{preview}<span style={{fontSize:20,color:"#7a8599"}}>%</span></div></div>
      <SL>Sueño</SL>
      <Sl l={`Horas: ${f.sleepHours}h`} v={f.sleepHours} min={3} max={11} step={0.5} set={v=>s("sleepHours",v)}/>
      <Sl l={`Calidad: ${"●".repeat(f.sleepQuality)}${"○".repeat(5-f.sleepQuality)}`} v={f.sleepQuality} min={1} max={5} step={1} set={v=>s("sleepQuality",v)}/>
      <SL>Físico</SL>
      <Sl l={`Dolor muscular: ${f.soreness}/5`} v={f.soreness} min={1} max={5} step={1} set={v=>s("soreness",v)}/>
      <Sl l={`Energía: ${f.energy}/5`} v={f.energy} min={1} max={5} step={1} set={v=>s("energy",v)}/>
      <Sl l={`Dolor Aquiles: ${f.achillesPain}/10`} v={f.achillesPain} min={0} max={10} step={1} set={v=>s("achillesPain",v)} c={f.achillesPain<=2?"#16f5a7":f.achillesPain<=4?"#ffb800":"#ff4757"}/>
      <SL>Mental</SL>
      <Sl l={`Ánimo: ${f.mood}/5`} v={f.mood} min={1} max={5} step={1} set={v=>s("mood",v)}/>
      <Sl l={`Estrés: ${f.stress}/5`} v={f.stress} min={1} max={5} step={1} set={v=>s("stress",v)}/>
      <SL>Opcional (Apple Watch)</SL>
      <Sl l={`FC reposo: ${f.rhr||"—"} bpm`} v={f.rhr} min={0} max={100} step={1} set={v=>s("rhr",v)}/>
      <button style={S.saveBtn} onClick={()=>onSave(date,f)}>Guardar · Recovery {preview}%</button>
    </Modal>
  );
}

// ─── Session Modal ────────────────────────────────────────────────────────────
function SessModal({ s, sessions, onClose, onUpdate }) {
  const [pain,setPain]=useState(s.log?.pain??0);
  const [feel,setFeel]=useState(s.log?.feeling??3);
  const [rpe,setRpe]=useState(s.log?.rpe??5);
  const [notes,setNotes]=useState(s.log?.notes??"");
  const t=STYPES[s.type];
  const done=()=>onUpdate({status:"done",log:{pain,feeling:feel,rpe,notes,completedAt:new Date().toISOString()}});
  return (
    <Modal t={s.title} sub={new Date(s.date).toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})} onClose={onClose}>
      <div style={{...S.sessH,background:t?.c+"15",borderColor:t?.c+"40"}}><span style={{fontSize:28}}>{t?.i}</span><div><div style={S.sessHT}>{t?.l}</div><div style={S.sessHI}>Semana {s.week} · Bloque {s.block} · {s.duration} min</div></div></div>
      <div style={{fontSize:9,color:"#7a8599",fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:10}}>ID: {s.id}</div>
      <Lb>Estado</Lb>
      <div style={S.stRow}><button style={{...S.stBtn,...(s.status==="pending"?S.stAct:{})}} onClick={()=>onUpdate({status:"pending",log:null})}>Pendiente</button><button style={{...S.stBtn,...(s.status==="done"?S.stDone:{})}} onClick={done}>✓ Hecha</button><button style={{...S.stBtn,...(s.status==="skipped"?S.stSkip:{})}} onClick={()=>onUpdate({status:"skipped",log:null})}>Saltada</button></div>
      <Lb>Ejercicios</Lb>
      <div style={S.exL}>{s.exercises.map((e,i)=><div key={i} style={S.exI}><span style={S.exD}>•</span><span>{e}</span></div>)}</div>
      <div style={S.div}/>
      <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>📋 Feedback</div>
      <Sl l={`Dolor Aquiles: ${pain}/10`} v={pain} min={0} max={10} step={1} set={setPain} c={pain<=2?"#16f5a7":pain<=4?"#ffb800":"#ff4757"}/>
      <Sl l={`Sensación: ${"●".repeat(feel)}${"○".repeat(5-feel)}`} v={feel} min={1} max={5} step={1} set={setFeel}/>
      <Sl l={`RPE: ${rpe}/10`} v={rpe} min={1} max={10} step={1} set={setRpe}/>
      <Lb>Notas</Lb>
      <textarea style={S.ta} rows={3} placeholder="¿Cómo fue?" value={notes} onChange={e=>setNotes(e.target.value)}/>
      <button style={S.saveBtn} onClick={done}>Guardar y marcar como hecha</button>
    </Modal>
  );
}

// ─── Plan Modal ───────────────────────────────────────────────────────────────
function PlanModal({ pm, onClose, onSave }) {
  const [n,setN]=useState(pm.name);const [sd,setSd]=useState(pm.startDate);
  return(<Modal t="Editar plan" sub="Regenerar fechas" onClose={onClose}><div style={S.warn}>⚠️ Al cambiar la fecha se perderá el historial de sesiones completadas.</div><Lb>Nombre</Lb><input style={S.inp} value={n} onChange={e=>setN(e.target.value)}/><Lb>Fecha de inicio (lunes)</Lb><input style={S.inp} type="date" value={sd} onChange={e=>setSd(e.target.value)}/><button style={S.saveBtn} onClick={()=>onSave(sd,n)}>Regenerar</button></Modal>);
}

// ─── Shared Components ────────────────────────────────────────────────────────
function RecRing({ v, sz=200 }) {
  const st=14,r=(sz-st)/2,ci=2*Math.PI*r,off=ci-(v/100)*ci,co=rc(v);
  return(<div style={{position:"relative",width:sz,height:sz,margin:"0 auto"}}><svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}><defs><linearGradient id={`g${v}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={co} stopOpacity=".4"/><stop offset="100%" stopColor={co} stopOpacity="1"/></linearGradient></defs><circle cx={sz/2} cy={sz/2} r={r} stroke="#1a1a1f" strokeWidth={st} fill="none"/><circle cx={sz/2} cy={sz/2} r={r} stroke={`url(#g${v})`} strokeWidth={st} fill="none" strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} style={{transition:"stroke-dashoffset 1s ease-out"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:10,color:"#7a8599",letterSpacing:3,fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>RECOVERY</div><div style={{fontSize:52,fontWeight:300,color:co,lineHeight:1,marginTop:4}}>{v}<span style={{fontSize:20,color:"#7a8599"}}>%</span></div></div></div>);
}

function HM({l,v,u}){return <div style={S.hm}><div style={S.hmL}>{l}</div><div style={S.hmV}>{v}<span style={S.hmU}>{u}</span></div></div>}
function DC({l,v,u,c}){return <div style={S.dc}><div style={S.dcL}>{l}</div><div style={{...S.dcV,color:c}}>{v}<span style={S.dcU}>{u}</span></div></div>}
function SCard({s,onClick,compact=false}){const t=STYPES[s.type];return(<button onClick={onClick} style={{...S.sc,borderLeftColor:t?.c,opacity:s.status==="skipped"?.5:1}}><div style={S.scT}><span style={S.scI}>{t?.i}</span><div style={S.scIn}><div style={S.scTt}>{s.title}</div><div style={S.scM}>{t?.l} · {s.duration} min · S{s.week}</div></div>{s.status==="done"&&<div style={S.scD}>✓</div>}{s.status==="skipped"&&<div style={S.scSk}>—</div>}</div>{!compact&&s.exercises&&<div style={S.scEx}>{s.exercises.slice(0,2).map((e,i)=><div key={i} style={S.scExI}>· {e}</div>)}{s.exercises.length>2&&<div style={S.scExM}>+{s.exercises.length-2} más</div>}</div>}</button>);}
function RecStrip({checkins}){const last7=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const iso=d.toISOString().split("T")[0];const ci=checkins[iso];last7.push({iso,label:["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d.getDay()],rec:ci?.recovery});}return(<div style={S.strip}>{last7.map(d=><div key={d.iso} style={S.stripD}><span style={S.stripL}>{d.label}</span><div style={{...S.stripDot,background:d.rec?rc(d.rec):"#1a1a1f",boxShadow:d.rec?`0 0 8px ${rc(d.rec)}60`:"none"}}/><span style={S.stripR}>{d.rec??"—"}</span></div>)}</div>);}
function LChart({data,color}){if(data.length<2)return null;const w=340,h=100,p=16;const vs=data.map(d=>d.y),mn=Math.min(...vs)-1,mx=Math.max(...vs)+1;const pts=data.map((d,i)=>({x:p+(i/(data.length-1))*(w-p*2),y:p+(1-(d.y-mn)/(mx-mn))*(h-p*2)}));const path=pts.map((pt,i)=>`${i===0?"M":"L"}${pt.x},${pt.y}`).join(" ");return <div style={S.chB}><svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:100}}><path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>{pts.map((pt,i)=><circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill={color}/>)}</svg></div>;}
function CChart({data,max,cf}){if(data.length<2)return null;const w=340,h=100,p=16;const pts=data.map((d,i)=>({x:p+(i/(data.length-1))*(w-p*2),y:p+(1-d.y/max)*(h-p*2),v:d.y}));return <div style={S.chB}><svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:100}}>{pts.slice(0,-1).map((pt,i)=><line key={i} x1={pt.x} y1={pt.y} x2={pts[i+1].x} y2={pts[i+1].y} stroke={cf((pt.v+pts[i+1].v)/2)} strokeWidth="2" strokeLinecap="round"/>)}{pts.map((pt,i)=><circle key={i} cx={pt.x} cy={pt.y} r="3" fill={cf(pt.v)}/>)}</svg></div>;}
function SL({children}){return <div style={S.sl}>{children}</div>}
function Lb({children}){return <div style={S.lb}>{children}</div>}
function Sl({l,v,min,max,step,set,c}){return <div style={{marginBottom:8}}><div style={{...S.slL,color:c||"#7a8599"}}>{l}</div><input type="range" min={min} max={max} step={step} value={v} onChange={e=>set(+e.target.value)} style={S.rng}/></div>}
function Modal({t,sub,onClose,children}){return(<div style={S.ov} onClick={onClose}><div style={{...S.mo,animation:"slideUp .3s ease-out"}} onClick={e=>e.stopPropagation()}><div style={S.moH}/><div style={S.moHd}><div><div style={S.moT}>{t}</div>{sub&&<div style={S.moS}>{sub}</div>}</div><button style={S.moX} onClick={onClose}>✕</button></div><div style={S.moB}>{children}</div></div></div>);}

// ─── Pin Screen ───────────────────────────────────────────────────────────────
function PinScreen({ onAuth }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const F2 = "'JetBrains Mono',monospace";

  const submit = async () => {
    if (pin.length !== 4 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        localStorage.setItem('pulse_auth', JSON.stringify({ ts: Date.now() }));
        onAuth();
      } else {
        setError('PIN incorrecto. Inténtalo de nuevo.');
        setPin('');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Grotesk',-apple-system,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');*{box-sizing:border-box}body{margin:0}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.15)}}`}</style>
      <div style={{ width:'100%', maxWidth:320, padding:'0 24px', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:40 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#16f5a7', boxShadow:'0 0 12px #16f5a7', animation:'pulse 2s infinite' }}/>
          <span style={{ fontFamily:F2, fontSize:16, fontWeight:700, letterSpacing:3, color:'#fff' }}>PULSE</span>
        </div>
        <div style={{ fontSize:24, fontWeight:300, color:'#fff', marginBottom:6 }}>Acceso</div>
        <div style={{ fontSize:11, color:'#7a8599', marginBottom:32, fontFamily:F2, letterSpacing:1 }}>Introduce tu PIN de 4 dígitos</div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g,'')); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="••••"
          autoFocus
          style={{ width:'100%', background:'#0e0e14', border:`1px solid ${error?'#ff4757':'#1a1a1f'}`, borderRadius:14, padding:'16px', color:'#fff', fontSize:32, textAlign:'center', outline:'none', letterSpacing:12, marginBottom:error?8:24, boxSizing:'border-box', fontFamily:F2 }}
        />
        {error && <div style={{ color:'#ff4757', fontSize:11, fontFamily:F2, marginBottom:16 }}>{error}</div>}
        <button
          onClick={submit}
          disabled={pin.length !== 4 || loading}
          style={{ width:'100%', background:'#16f5a7', border:'none', borderRadius:14, padding:14, color:'#000', fontSize:13, fontWeight:700, letterSpacing:1.5, cursor: pin.length===4&&!loading?'pointer':'not-allowed', opacity: pin.length===4&&!loading?1:0.4, fontFamily:F2 }}
        >
          {loading ? '...' : 'ENTRAR'}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const F="'JetBrains Mono',monospace";
const S={
  root:{minHeight:"100vh",background:"#000",display:"flex",justifyContent:"center",fontFamily:"'Space Grotesk',-apple-system,sans-serif",color:"#fff"},
  app:{width:"100%",maxWidth:420,minHeight:"100vh",background:"linear-gradient(180deg,#0a0a0f,#000)",position:"relative"},
  bar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 20px 14px",borderBottom:"1px solid #1a1a1f"},
  logoBox:{display:"flex",alignItems:"center",gap:8},
  logoDot:{width:8,height:8,borderRadius:"50%",background:"#16f5a7",boxShadow:"0 0 12px #16f5a7",animation:"pulse 2s infinite"},
  logoTxt:{fontFamily:F,fontSize:13,fontWeight:700,letterSpacing:3},
  barR:{display:"flex",alignItems:"center",gap:8},
  barW:{fontFamily:F,fontSize:11,color:"#16f5a7",fontWeight:600,background:"#16f5a715",padding:"4px 10px",borderRadius:12},
  content:{padding:"16px 16px 100px",overflowY:"auto"},

  greeting:{marginBottom:16},
  dateLn:{fontSize:10,color:"#7a8599",letterSpacing:2.5,fontFamily:F,fontWeight:500},
  greetTxt:{fontSize:28,fontWeight:300,marginTop:4,letterSpacing:-.5},

  hero:{background:"linear-gradient(135deg,#0e0e14,#14141c)",border:"1px solid #1a1a1f",borderRadius:24,padding:"24px 20px 20px",marginBottom:14},
  delta:{textAlign:"center",fontSize:12,fontWeight:600,fontFamily:F,marginTop:6},
  heroMets:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14,paddingTop:14,borderTop:"1px solid #1a1a1f"},
  hm:{textAlign:"center"},hmL:{fontSize:9,color:"#7a8599",letterSpacing:1.5,marginBottom:4,fontFamily:F,fontWeight:500},
  hmV:{fontSize:20,fontWeight:400,lineHeight:1},hmU:{fontSize:11,color:"#7a8599",marginLeft:2},

  ciPrompt:{width:"100%",display:"flex",alignItems:"center",gap:14,background:"linear-gradient(135deg,#0e0e14,#14141c)",border:"1px solid #16f5a730",borderRadius:20,padding:"18px 16px",marginBottom:14,color:"#fff",cursor:"pointer"},
  ciIcon:{fontSize:34,color:"#16f5a7",lineHeight:1},
  ciTitle:{fontSize:15,fontWeight:600},
  ciSub:{fontSize:11,color:"#7a8599",marginTop:2},

  recoCard:{background:"#0e0e14",border:"1px solid",borderRadius:16,padding:"14px 16px",marginBottom:14},
  recoH:{display:"flex",alignItems:"center",gap:8,marginBottom:6},
  recoDot:{width:8,height:8,borderRadius:"50%"},
  recoT:{fontSize:12,fontWeight:700,letterSpacing:1.5,fontFamily:F,textTransform:"uppercase"},
  recoTxt:{fontSize:13,color:"#a0a4b0",lineHeight:1.5},
  recoBtn:{background:"#16f5a712",border:"1px solid #16f5a730",color:"#16f5a7",padding:"6px 14px",borderRadius:12,fontSize:11,fontFamily:F,fontWeight:600,cursor:"pointer",marginTop:8},

  blockCard:{background:"#0e0e14",border:"1px solid",borderRadius:16,padding:"14px 16px",marginBottom:14},
  blockTop:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8},
  blockLbl:{fontSize:9,color:"#7a8599",letterSpacing:2,fontFamily:F,fontWeight:500},
  blockName:{fontSize:16,fontWeight:600,marginTop:2},
  blockPct:{borderRadius:16,padding:"4px 10px",fontSize:11,fontWeight:700,fontFamily:F},
  blockBar:{height:4,background:"#1a1a1f",borderRadius:2,marginBottom:8},
  blockFill:{height:"100%",borderRadius:2,transition:"width .5s"},
  blockFocus:{fontSize:11,color:"#a0a4b0",lineHeight:1.4},

  cardGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14},
  dc:{background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:16,padding:"14px"},
  dcL:{fontSize:10,color:"#7a8599",letterSpacing:1.5,fontFamily:F,fontWeight:500,marginBottom:6},
  dcV:{fontSize:24,fontWeight:300,lineHeight:1},dcU:{fontSize:11,color:"#7a8599",marginLeft:3},

  strip:{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4},
  stripD:{flex:"1 1 0",minWidth:42,background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:14,padding:"10px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:6},
  stripL:{fontSize:9,color:"#7a8599",letterSpacing:1,fontFamily:F,fontWeight:600},
  stripDot:{width:10,height:10,borderRadius:"50%"},
  stripR:{fontSize:11,fontWeight:600,fontFamily:F},

  calH:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  calMo:{fontSize:17,fontWeight:500,textTransform:"capitalize"},
  calNav:{background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:10,padding:"4px 14px",color:"#fff",cursor:"pointer",fontSize:18,fontWeight:300},
  calWd:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6},
  calWdI:{textAlign:"center",fontSize:9,fontWeight:700,color:"#7a8599",letterSpacing:1.5,fontFamily:F},
  calG:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:12},
  calC:{position:"relative",aspectRatio:"1",border:"1px solid",borderRadius:10,padding:"4px 2px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:"#fff",background:"transparent"},
  calRD:{position:"absolute",top:4,right:4,width:6,height:6,borderRadius:2},
  calDN:{fontSize:12,fontFamily:F},calDs:{display:"flex",gap:2,justifyContent:"center",flexWrap:"wrap"},
  calDt:{width:5,height:5,borderRadius:"50%"},
  dayD:{marginBottom:10},dayHL:{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#a0a4b0",fontFamily:F},
  dayHM:{fontSize:11,color:"#7a8599",marginTop:4,fontFamily:F},

  tH:{marginBottom:14},tT:{fontSize:28,fontWeight:300,letterSpacing:-.5},tS:{fontSize:12,color:"#7a8599",marginTop:2,fontFamily:F},
  planMR:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,padding:"10px 14px",background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:12},
  planMT:{fontSize:11,color:"#7a8599",fontFamily:F},
  editBtn:{background:"#16f5a715",border:"1px solid #16f5a730",color:"#16f5a7",padding:"4px 12px",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F},

  bBox:{background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:14,padding:"14px 14px 8px",marginBottom:10,borderLeft:"3px solid"},
  bBoxH:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4},
  bBoxN:{fontSize:15,fontWeight:600},bBoxW:{fontSize:10,color:"#7a8599",marginTop:2,fontFamily:F},
  bBoxBdg:{borderRadius:16,padding:"3px 10px",fontSize:11,fontWeight:700,fontFamily:F},
  bBoxF:{fontSize:11,color:"#a0a4b0",marginBottom:10,lineHeight:1.4},
  wBox:{marginBottom:4},
  wH:{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",border:"1px solid #1a1a1f",borderRadius:8,cursor:"pointer",color:"#fff"},
  wHL:{display:"flex",alignItems:"center",gap:8},wN:{fontSize:12,fontWeight:500,fontFamily:F},
  curT:{fontSize:9,background:"#16f5a7",color:"#000",padding:"2px 6px",borderRadius:4,fontWeight:700,letterSpacing:.5,fontFamily:F},
  wP:{fontSize:11,color:"#7a8599",fontWeight:500,fontFamily:F},wC:{padding:"8px 0 4px 8px"},
  regenB:{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"transparent",border:"1px dashed #1a1a1f",borderRadius:12,padding:12,color:"#16f5a7",cursor:"pointer",fontSize:12,fontWeight:600,marginTop:12,fontFamily:F},

  sc:{width:"100%",textAlign:"left",background:"#0e0e14",borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid #1a1a1f",borderLeft:"3px solid",cursor:"pointer",color:"#fff"},
  scT:{display:"flex",alignItems:"center",gap:10},scI:{fontSize:22},scIn:{flex:1},
  scTt:{fontSize:13,fontWeight:600},scM:{fontSize:10,color:"#7a8599",marginTop:2,fontFamily:F},
  scD:{background:"#16f5a720",color:"#16f5a7",width:24,height:24,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12},
  scSk:{background:"#ff475720",color:"#ff4757",width:24,height:24,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14},
  scEx:{marginTop:8,paddingLeft:32},scExI:{fontSize:11,color:"#a0a4b0",marginBottom:2},scExM:{fontSize:11,color:"#16f5a7",marginTop:2,fontFamily:F},

  fCard:{background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:14,padding:14,marginBottom:14},
  fRow:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1a1a1f"},
  fL:{fontSize:12,color:"#a0a4b0"},fW:{fontSize:12,color:"#16f5a7",fontFamily:F,fontWeight:600},
  histR:{display:"flex",alignItems:"center",gap:10,background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:12,padding:"10px 14px",marginBottom:6},
  histDot:{width:10,height:10,borderRadius:"50%"},histI:{flex:1},
  histD:{fontSize:12,fontWeight:500,textTransform:"capitalize"},
  histM:{fontSize:10,color:"#7a8599",marginTop:2,fontFamily:F},
  histRec:{fontSize:16,fontWeight:600,fontFamily:F},

  chB:{background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:14,padding:12,marginBottom:14},
  empty:{textAlign:"center",color:"#7a8599",fontSize:12,padding:"16px 12px",fontFamily:F},

  // Coach tab
  coachH:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0 12px",borderBottom:"1px solid #1a1a1f",marginBottom:0},
  coachHLeft:{display:"flex",alignItems:"center",gap:10},
  coachHTitle:{fontSize:16,fontWeight:600},
  coachHSub:{fontSize:10,color:"#7a8599",marginTop:2,fontFamily:F},
  clearBtn:{background:"transparent",border:"1px solid #1a1a1f",color:"#7a8599",padding:"4px 10px",borderRadius:10,fontSize:10,fontFamily:F,cursor:"pointer"},

  msgArea:{flex:1,overflowY:"auto",padding:"14px 0 8px",display:"flex",flexDirection:"column",gap:10,minHeight:0},

  emptyChat:{textAlign:"center",padding:"20px 0"},
  emptyChatIcon:{fontSize:40,color:"#a085ff",marginBottom:12},
  emptyChatTitle:{fontSize:18,fontWeight:500,marginBottom:8},
  emptyChatSub:{fontSize:12,color:"#7a8599",lineHeight:1.6,marginBottom:20,maxWidth:300,margin:"0 auto 20px"},
  quickGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,textAlign:"left"},
  quickBtn:{background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:12,padding:"10px 12px",fontSize:11,color:"#a0a4b0",cursor:"pointer",textAlign:"left",lineHeight:1.4},

  msgRow:{display:"flex",alignItems:"flex-end",gap:8},
  aiAvatar:{width:26,height:26,borderRadius:13,background:"linear-gradient(135deg,#a085ff,#16f5a7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0},
  bubble:{maxWidth:"80%",borderRadius:18,padding:"10px 14px"},
  bubbleUser:{background:"#16f5a7",color:"#000",borderBottomRightRadius:4,alignSelf:"flex-end"},
  bubbleAI:{background:"#0e0e14",border:"1px solid #1a1a1f",borderBottomLeftRadius:4},
  bubbleLoading:{display:"flex",gap:4,alignItems:"center",padding:"12px 16px",fontSize:18},
  bubbleText:{fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap"},
  actionBadge:{marginTop:8,background:"#a085ff20",border:"1px solid #a085ff40",color:"#a085ff",borderRadius:10,padding:"4px 10px",fontSize:10,fontFamily:F,fontWeight:600},

  quickRow:{display:"flex",gap:6,overflowX:"auto",padding:"8px 0",flexShrink:0},
  quickChip:{background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:20,padding:"6px 12px",fontSize:10,color:"#a0a4b0",cursor:"pointer",whiteSpace:"nowrap",fontFamily:F,flexShrink:0},

  inputArea:{display:"flex",gap:8,padding:"10px 0 0",borderTop:"1px solid #1a1a1f",flexShrink:0},
  chatInput:{flex:1,background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:16,padding:"10px 14px",color:"#fff",fontSize:13,outline:"none",resize:"none",fontFamily:"inherit",lineHeight:1.4},
  sendBtn:{width:42,height:42,borderRadius:21,background:"#16f5a7",border:"none",color:"#000",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"},

  // Session modal
  sessH:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,border:"1px solid",marginBottom:8,marginTop:8},
  sessHT:{fontSize:13,fontWeight:700},sessHI:{fontSize:10,color:"#a0a4b0",marginTop:2,fontFamily:F},
  stRow:{display:"flex",gap:6,marginBottom:4},
  stBtn:{flex:1,background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:10,padding:8,color:"#7a8599",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F},
  stAct:{background:"#16f5a720",borderColor:"#16f5a7",color:"#16f5a7"},
  stDone:{background:"#16f5a720",borderColor:"#16f5a7",color:"#16f5a7"},
  stSkip:{background:"#ff475720",borderColor:"#ff4757",color:"#ff4757"},
  exL:{background:"#0e0e14",borderRadius:10,padding:"10px 12px",border:"1px solid #1a1a1f"},
  exI:{display:"flex",gap:6,fontSize:12,color:"#a0a4b0",marginBottom:4,lineHeight:1.4},exD:{color:"#16f5a7"},
  div:{height:1,background:"#1a1a1f",margin:"18px 0 12px"},

  sl:{fontSize:10,color:"#7a8599",letterSpacing:2,fontFamily:F,fontWeight:500,textTransform:"uppercase",marginBottom:10,marginTop:14},
  lb:{fontSize:10,color:"#7a8599",letterSpacing:1.5,fontFamily:F,fontWeight:500,textTransform:"uppercase",marginBottom:6,marginTop:14},
  slL:{fontSize:11,color:"#7a8599",fontFamily:F,fontWeight:500,marginBottom:4},
  inp:{width:"100%",background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:10,padding:"10px 12px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  ta:{width:"100%",background:"#0e0e14",border:"1px solid #1a1a1f",borderRadius:10,padding:"10px 12px",color:"#fff",fontSize:13,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"},
  rng:{width:"100%",accentColor:"#16f5a7",cursor:"pointer"},
  warn:{background:"#ffb80015",border:"1px solid #ffb80040",color:"#ffb800",padding:"10px 12px",borderRadius:10,fontSize:11,marginBottom:8,lineHeight:1.4,marginTop:12},
  saveBtn:{width:"100%",background:"#16f5a7",border:"none",borderRadius:14,padding:14,color:"#000",fontSize:13,fontWeight:700,letterSpacing:1,cursor:"pointer",marginTop:20,fontFamily:F},

  nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:"rgba(10,10,15,.95)",backdropFilter:"blur(20px)",borderTop:"1px solid #1a1a1f",display:"flex",padding:"10px 2px 14px",zIndex:10},
  navBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",color:"#5a6273",cursor:"pointer",padding:"6px 0",transition:"all .2s"},
  navAct:{color:"#16f5a7"},navIc:{fontSize:18,lineHeight:1},
  navLbl:{fontSize:9,fontWeight:600,letterSpacing:1,fontFamily:F},

  ov:{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"},
  mo:{background:"#0a0a0f",borderRadius:"28px 28px 0 0",width:"100%",maxWidth:420,maxHeight:"92vh",display:"flex",flexDirection:"column",border:"1px solid #1a1a1f",borderBottom:"none"},
  moH:{width:40,height:4,background:"#1a1a1f",borderRadius:2,margin:"12px auto 0"},
  moHd:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"14px 20px 10px"},
  moT:{fontSize:18,fontWeight:400},moS:{fontSize:11,color:"#7a8599",marginTop:4,textTransform:"capitalize",fontFamily:F},
  moX:{background:"#1a1a1f",border:"none",color:"#fff",width:30,height:30,borderRadius:15,cursor:"pointer",fontSize:13},
  moB:{overflowY:"auto",padding:"0 20px 32px"},
};
