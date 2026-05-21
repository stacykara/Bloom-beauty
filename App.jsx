import { useState, useEffect } from "react";

const MATERIALS_KEY = "bloom:materials_v2";
const SERVICES_KEY  = "bloom:services_v2";
const SETTINGS_KEY  = "bloom:settings_v1";

const DEFAULT_MATERIALS = [
  { id: "1", name: "Гель-лак OPI",        price: 1200, unit: "мл", volume: 15,  stock: 12  },
  { id: "2", name: "База каучуковая",      price: 800,  unit: "мл", volume: 30,  stock: 22  },
  { id: "3", name: "Топ без липкого слоя", price: 950,  unit: "мл", volume: 10,  stock: 3   },
  { id: "4", name: "Ацетон",               price: 120,  unit: "мл", volume: 500, stock: 480 },
  { id: "5", name: "Хна для бровей",       price: 650,  unit: "г",  volume: 10,  stock: 1.5 },
  { id: "6", name: "Перчатки нитрил",      price: 350,  unit: "шт", volume: 100, stock: 8   },
];

const DEFAULT_SETTINGS = {
  laborRate: 600,       // ₽/час
  rentEnabled: false,
  rentType: "day",      // "day" | "hour"
  rentPerDay: 1500,     // ₽/день
  hoursPerDay: 12,      // рабочих часов в дне
  rentPerHour: 150,     // ₽/час (для коворкинга)
};

const UNITS = ["мл", "г", "шт", "уп", "л", "кг"];
const fmt    = (n) => +n % 1 === 0 ? Math.round(n).toLocaleString("ru-RU") : (+n).toFixed(1);
const fmtRub = (n) => Math.round(n).toLocaleString("ru-RU");
const fmtH   = (h) => {
  if (!h) return "0 ч";
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh} ч ${mm} мин` : `${hh} ч`;
};

const stockStatus = (stock, volume) => {
  if (stock == null) return "none";
  const pct = stock / volume;
  if (stock <= 0)  return "empty";
  if (pct < 0.2)   return "low";
  if (pct < 0.5)   return "mid";
  return "ok";
};
const STATUS_COLOR = {
  none:  { bg:"#F0ECEB", fill:"#C8B5B0", text:"#A08880", label:"" },
  ok:    { bg:"#E0F0E4", fill:"#6A9E78", text:"#4A7A58", label:"В норме" },
  mid:   { bg:"#FFF3D6", fill:"#D4A870", text:"#A07840", label:"Мало" },
  low:   { bg:"#FEEAEA", fill:"#D97070", text:"#A04040", label:"Заканчивается!" },
  empty: { bg:"#FEEAEA", fill:"#D97070", text:"#A04040", label:"Закончился!" },
};

const lsGet = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

/* ─────────── STYLES ─────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Nunito:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  :root{
    --cream:#FBF7F4;--white:#fff;
    --rose:#C47B6A;--rose-deep:#A05A4A;--rose-light:#F2DDD7;--rose-pale:#FAF0ED;
    --gold:#D4A870;--gold-light:#F5ECD8;
    --dark:#2C1810;--mid:#7A5A50;--light:#B89990;
    --green:#6A9E78;--green-light:#E0F0E4;
    --blue:#6A8EBB;--blue-light:#E0EAF5;
    --shadow-sm:0 1px 6px rgba(44,24,16,.08);
  }
  body{background:var(--cream);font-family:'Nunito',sans-serif;color:var(--dark)}
  .app{max-width:430px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}

  /* header */
  .header{background:var(--white);padding:16px 20px 12px;border-bottom:1px solid var(--rose-light);position:sticky;top:0;z-index:10}
  .header-logo{display:flex;align-items:center;gap:8px}
  .logo-mark{width:30px;height:30px;background:linear-gradient(135deg,var(--rose),var(--gold));border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .header-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--dark);letter-spacing:-.3px}
  .header-title span{color:var(--rose)}
  .header-sub{font-size:10px;color:var(--light);margin-top:1px}

  /* content */
  .content{flex:1;padding:14px;padding-bottom:84px;overflow-y:auto}

  /* nav */
  .bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:var(--white);border-top:1px solid var(--rose-light);display:flex;z-index:20;padding:6px 0 env(safe-area-inset-bottom,6px)}
  .nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px;border:none;background:none;cursor:pointer;color:var(--light);font-family:'Nunito',sans-serif;font-size:9px;font-weight:600;transition:color .18s}
  .nav-btn.active{color:var(--rose)}
  .nav-dot{width:3px;height:3px;border-radius:50%;background:var(--rose);display:none}
  .nav-btn.active .nav-dot{display:block}

  /* cards */
  .card{background:var(--white);border-radius:16px;padding:14px 16px;box-shadow:var(--shadow-sm);margin-bottom:10px}
  .card-accent{border-left:3px solid var(--rose)}
  .section-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:600;color:var(--dark);margin-bottom:12px;margin-top:2px}

  /* material item */
  .mat-item{padding:11px 0;border-bottom:1px solid var(--rose-pale)}
  .mat-item:last-child{border-bottom:none;padding-bottom:0}
  .mat-row{display:flex;align-items:center;gap:9px}
  .mat-icon{width:36px;height:36px;border-radius:11px;background:var(--rose-pale);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px}
  .mat-info{flex:1;min-width:0}
  .mat-name{font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mat-meta{font-size:11px;color:var(--light);margin-top:1px}
  .mat-right{text-align:right;margin-right:4px;flex-shrink:0}
  .mat-price{font-family:'Playfair Display',serif;font-size:13px;font-weight:600;color:var(--rose-deep)}
  .mat-price-per{font-size:10px;color:var(--light)}
  .icon-btn{width:30px;height:30px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}

  /* stock */
  .stock-wrap{margin-top:7px}
  .stock-bar-bg{height:4px;border-radius:4px;overflow:hidden}
  .stock-bar-fill{height:100%;border-radius:4px;transition:width .4s}
  .stock-footer{display:flex;justify-content:space-between;align-items:center;margin-top:4px}
  .stock-text{font-size:11px;font-weight:600}
  .stock-badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px}
  .restock-btn{font-size:11px;font-weight:700;padding:3px 9px;border-radius:8px;border:1.5px solid var(--rose-light);background:none;color:var(--rose-deep);cursor:pointer;font-family:'Nunito',sans-serif;transition:all .15s}
  .restock-btn:hover{background:var(--rose-pale)}

  /* inputs */
  .input-group{margin-bottom:10px}
  .input-label{font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
  .input{width:100%;padding:10px 13px;border:1.5px solid var(--rose-light);border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;color:var(--dark);background:var(--white);outline:none;transition:border-color .18s}
  .input:focus{border-color:var(--rose)}
  .input-row{display:flex;gap:8px}
  .input-row .input-group{flex:1}
  select.input{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23B89990' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}

  /* buttons */
  .btn{width:100%;padding:13px;border-radius:14px;border:none;font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;letter-spacing:.2px}
  .btn-primary{background:linear-gradient(135deg,var(--rose),var(--rose-deep));color:white;box-shadow:0 4px 14px rgba(196,123,106,.35)}
  .btn-primary:hover{transform:translateY(-1px)}
  .btn-ghost{background:transparent;color:var(--mid);border:1.5px solid var(--rose-light)}
  .btn-sm{padding:7px 13px;border-radius:10px;font-size:12px;width:auto;display:inline-flex;align-items:center;gap:5px}

  /* modal */
  .overlay{position:fixed;inset:0;background:rgba(44,24,16,.4);z-index:50;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(2px)}
  .modal{background:var(--white);border-radius:24px 24px 0 0;padding:20px 20px 32px;width:100%;max-width:430px;animation:slideUp .25s ease;max-height:90vh;overflow-y:auto}
  @keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
  .modal-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}

  /* cost */
  .cost-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--rose-pale);font-size:13px}
  .cost-row:last-child{border-bottom:none}
  .cost-label{color:var(--mid)}
  .cost-val{font-weight:700}
  .cost-total{background:linear-gradient(135deg,var(--rose-pale),var(--gold-light));border-radius:14px;padding:13px 15px;margin:10px 0}
  .cost-total-label{font-size:10px;color:var(--mid);text-transform:uppercase;letter-spacing:.6px;font-weight:700}
  .cost-total-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--rose-deep);margin-top:1px}
  .price-hero{background:linear-gradient(135deg,var(--rose-deep),#7A3828);border-radius:16px;padding:16px;margin:10px 0;color:white}
  .price-hero-label{font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.8px;font-weight:700}
  .price-hero-val{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;margin-top:3px}
  .price-hero-sub{font-size:11px;opacity:.65;margin-top:3px}

  /* slider */
  .slider{width:100%;-webkit-appearance:none;height:4px;border-radius:4px;background:var(--rose-light);outline:none}
  .slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,var(--rose),var(--rose-deep));cursor:pointer;box-shadow:0 2px 8px rgba(196,123,106,.4)}
  .slider-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--light);margin-top:3px}

  /* history */
  .hist-item{padding:12px 0;border-bottom:1px solid var(--rose-pale)}
  .hist-item:last-child{border-bottom:none}
  .hist-header{display:flex;justify-content:space-between;align-items:flex-start}
  .hist-name{font-weight:700;font-size:13px}
  .hist-date{font-size:11px;color:var(--light)}
  .hist-prices{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}
  .hist-chip{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700}
  .hist-chip.cost{background:var(--rose-pale);color:var(--rose-deep)}
  .hist-chip.price{background:var(--green-light);color:var(--green)}
  .hist-mats{font-size:11px;color:var(--light);margin-top:3px}

  /* after-stock */
  .after-stock{background:var(--cream);border-radius:11px;padding:9px 12px;margin-top:6px}
  .after-stock-title{font-size:10px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
  .after-stock-row{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}

  /* mat picker */
  .mat-pick{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--rose-pale)}
  .mat-pick:last-child{border-bottom:none}
  .mat-pick-info{flex:1;min-width:0}
  .mat-pick-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .amount-input{width:64px;padding:5px 8px;border:1.5px solid var(--rose-light);border-radius:8px;font-family:'Nunito',sans-serif;font-size:13px;text-align:center;outline:none}
  .amount-input:focus{border-color:var(--rose)}
  .add-mat-btn{padding:7px;border-radius:8px;border:1.5px dashed var(--rose-light);background:none;color:var(--rose);font-size:12px;font-weight:600;cursor:pointer;font-family:'Nunito',sans-serif;width:100%;text-align:center;margin-top:4px;transition:all .15s}
  .add-mat-btn:hover{border-color:var(--rose);background:var(--rose-pale)}

  /* settings */
  .setting-block{margin-bottom:14px}
  .setting-block-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;color:var(--dark);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rose-pale)}
  .toggle-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .toggle-label{font-size:14px;font-weight:600;color:var(--dark)}
  .toggle-sub{font-size:11px;color:var(--light);margin-top:1px}
  .toggle{position:relative;width:44px;height:24px;flex-shrink:0}
  .toggle input{opacity:0;width:0;height:0}
  .toggle-track{position:absolute;inset:0;background:var(--rose-light);border-radius:24px;transition:background .2s;cursor:pointer}
  .toggle input:checked + .toggle-track{background:var(--rose)}
  .toggle-track:before{content:'';position:absolute;width:18px;height:18px;border-radius:50%;background:white;left:3px;top:3px;transition:transform .2s;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .toggle input:checked + .toggle-track:before{transform:translateX(20px)}
  .seg-control{display:flex;background:var(--rose-pale);border-radius:10px;padding:3px;gap:3px;margin-bottom:10px}
  .seg-btn{flex:1;padding:7px;border-radius:8px;border:none;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;cursor:pointer;background:transparent;color:var(--mid);transition:all .18s}
  .seg-btn.active{background:var(--white);color:var(--rose-deep);box-shadow:0 1px 4px rgba(44,24,16,.1)}
  .rent-preview{background:var(--blue-light);border-radius:11px;padding:9px 13px;font-size:12px;color:#3A5A8A;font-weight:600;margin-top:6px}

  /* misc */
  .empty{text-align:center;padding:28px 16px;color:var(--light)}
  .empty-icon{font-size:32px;margin-bottom:7px}
  .empty-text{font-size:13px}
  .tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:var(--rose-pale);color:var(--rose-deep)}
  .warn-tag{background:#FFF3D6;color:#A07840}
  .warn-stock{font-size:10px;font-weight:700;color:#D97070}
  .toast{position:fixed;top:74px;left:50%;transform:translateX(-50%);background:var(--dark);color:white;padding:9px 18px;border-radius:20px;font-size:12px;font-weight:600;z-index:100;animation:fadeInOut 2.5s forwards;white-space:nowrap}
  @keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-6px)}12%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}
  .info-box{padding:9px 13px;border-radius:12px;font-size:12px;display:flex;gap:7px}
`;

/* ─────────── COMPONENT ─────────── */
export default function BloomApp() {
  const [tab, setTab]           = useState("catalog");
  const [materials, setMaterials] = useState([]);
  const [services,  setServices]  = useState([]);
  const [settings,  setSettings]  = useState(DEFAULT_SETTINGS);
  const [loaded,    setLoaded]    = useState(false);

  // calc
  const [svcName,  setSvcName]  = useState("");
  const [selMats,  setSelMats]  = useState([]);
  const [markup,   setMarkup]   = useState(100);
  const [timeHours, setTimeHours] = useState(1);

  // modals
  const [showAddMat,  setShowAddMat]  = useState(false);
  const [newMat,      setNewMat]      = useState({ name:"", price:"", unit:"мл", volume:"", stock:"" });
  const [showPicker,  setShowPicker]  = useState(false);
  const [restockId,   setRestockId]   = useState(null);
  const [restockAmt,  setRestockAmt]  = useState("");

  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  /* load */
  useEffect(() => {
    const m = lsGet(MATERIALS_KEY); setMaterials(m || DEFAULT_MATERIALS);
    const s = lsGet(SERVICES_KEY);  if (s) setServices(s);
    const st = lsGet(SETTINGS_KEY); if (st) setSettings({ ...DEFAULT_SETTINGS, ...st });
    setLoaded(true);
  }, []);

  const saveMats = (m) => { setMaterials(m); lsSet(MATERIALS_KEY, m); };
  const saveSvcs = (s) => { setServices(s);  lsSet(SERVICES_KEY, s); };
  const saveSett = (s) => { setSettings(s);  lsSet(SETTINGS_KEY, s); };
  const updSett  = (patch) => { const ns = { ...settings, ...patch }; saveSett(ns); };

  /* rent calc */
  const rentPerHourCalc = () => {
    if (!settings.rentEnabled) return 0;
    if (settings.rentType === "hour") return settings.rentPerHour;
    return settings.rentPerDay / settings.hoursPerDay;
  };
  const rentForService  = rentPerHourCalc() * timeHours;

  /* cost */
  const matCost   = selMats.reduce((sum, sel) => {
    const m = materials.find(x => x.id === sel.id);
    if (!m) return sum;
    return sum + (m.price / m.volume) * sel.amount;
  }, 0);
  const laborCost = settings.laborRate * timeHours;
  const totalCost = matCost + laborCost + rentForService;
  const recPrice  = totalCost * (1 + markup / 100);
  const profit    = recPrice - totalCost;

  const stockAfter = selMats.map(sel => {
    const m = materials.find(x => x.id === sel.id);
    if (!m || m.stock == null) return null;
    return { id: sel.id, name: m.name, unit: m.unit, before: m.stock, after: Math.max(0, m.stock - sel.amount) };
  }).filter(Boolean);

  const addMaterial = () => {
    if (!newMat.name.trim() || !newMat.price || !newMat.volume) return;
    const m = { id: Date.now().toString(), name: newMat.name.trim(), price: +newMat.price, unit: newMat.unit, volume: +newMat.volume, stock: newMat.stock !== "" ? +newMat.stock : null };
    saveMats([...materials, m]);
    setNewMat({ name:"", price:"", unit:"мл", volume:"", stock:"" });
    setShowAddMat(false);
    showToast("✓ Материал добавлен");
  };
  const delMat = (id) => saveMats(materials.filter(m => m.id !== id));
  const addToCalc = (id) => { if (selMats.find(s => s.id === id)) return; setSelMats([...selMats, { id, amount: 1 }]); setShowPicker(false); };
  const updateAmt = (id, v) => setSelMats(selMats.map(s => s.id === id ? { ...s, amount: parseFloat(v) || 0 } : s));
  const removeFromCalc = (id) => setSelMats(selMats.filter(s => s.id !== id));

  const saveService = () => {
    if (!svcName.trim()) { showToast("⚠ Введите название услуги"); return; }
    const svc = {
      id: Date.now().toString(), name: svcName.trim(), date: new Date().toLocaleDateString("ru-RU"),
      matCost: Math.round(matCost), laborCost: Math.round(laborCost),
      rentCost: Math.round(rentForService),
      totalCost: Math.round(totalCost), recPrice: Math.round(recPrice), markup,
      timeHours,
      mats: selMats.map(s => { const m = materials.find(x => x.id === s.id); return { name: m?.name, amount: s.amount, unit: m?.unit, stockAfter: m?.stock != null ? Math.max(0, m.stock - s.amount) : null }; }),
    };
    const updatedMats = materials.map(m => { const used = selMats.find(s => s.id === m.id); if (!used || m.stock == null) return m; return { ...m, stock: Math.max(0, m.stock - used.amount) }; });
    saveMats(updatedMats);
    saveSvcs([svc, ...services]);
    setSvcName(""); setSelMats([]); setMarkup(100); setTimeHours(1);
    showToast("✓ Расчёт сохранён, остатки обновлены");
    setTab("history");
  };

  const emoji = (name) => {
    const n = name.toLowerCase();
    if (n.includes("лак") || n.includes("гель")) return "💅";
    if (n.includes("хна") || n.includes("бров")) return "✨";
    if (n.includes("ацетон"))  return "🧴";
    if (n.includes("перч"))    return "🧤";
    if (n.includes("краска"))  return "🎨";
    if (n.includes("масло"))   return "💧";
    if (n.includes("пудра"))   return "🌸";
    return "🧪";
  };

  const restockMat    = materials.find(m => m.id === restockId);
  const lowStockCount = materials.filter(m => { const s = stockStatus(m.stock, m.volume); return s === "low" || s === "empty"; }).length;

  if (!loaded) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:"#FBF7F4", fontFamily:"Nunito,sans-serif" }}>
      <div style={{ fontSize:32, marginBottom:10 }}>🌸</div>
      <div style={{ color:"#B89990", fontSize:13 }}>Загружаем Bloom...</div>
    </div>
  );

  /* ─── SVG helpers ─── */
  const X = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>;
  const Plus = ({ size=13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>;
  const Trash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C47B6A" strokeWidth="2" strokeLinecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;

  return (
    <>
      <style>{css}</style>
      {toast && <div className="toast">{toast}</div>}
      <div className="app">

        {/* ── HEADER ── */}
        <div className="header">
          <div className="header-logo">
            <div className="logo-mark">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 2C6 2 3 7 3 12s3 10 9 10 9-5 9-10S18 2 12 2z"/><path d="M12 7v10M7 12h10"/></svg>
            </div>
            <div>
              <div className="header-title">Bloom<span>.</span></div>
              <div className="header-sub">калькулятор для мастера</div>
            </div>
          </div>
        </div>

        <div className="content">

          {/* ══════════ КАТАЛОГ ══════════ */}
          {tab === "catalog" && (<>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div className="section-title" style={{ margin:0 }}>Материалы</div>
              <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                {lowStockCount > 0 && <div className="tag warn-tag">⚠ {lowStockCount}</div>}
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddMat(true)}><Plus /> Добавить</button>
              </div>
            </div>
            {materials.length === 0
              ? <div className="empty"><div className="empty-icon">🧴</div><div className="empty-text">Каталог пуст</div></div>
              : <div className="card">
                  {materials.map(m => {
                    const st = stockStatus(m.stock, m.volume);
                    const sc = STATUS_COLOR[st];
                    const pct = m.stock != null ? Math.min(100, m.stock / m.volume * 100) : 0;
                    return (
                      <div className="mat-item" key={m.id}>
                        <div className="mat-row">
                          <div className="mat-icon">{emoji(m.name)}</div>
                          <div className="mat-info">
                            <div className="mat-name">{m.name}</div>
                            <div className="mat-meta">{m.volume} {m.unit} · {fmtRub(m.price)} ₽</div>
                          </div>
                          <div className="mat-right">
                            <div className="mat-price">{fmtRub(m.price / m.volume)} ₽</div>
                            <div className="mat-price-per">/ {m.unit}</div>
                          </div>
                          <button className="icon-btn" style={{ background:"#FEEAEA" }} onClick={() => delMat(m.id)}><Trash /></button>
                        </div>
                        {m.stock != null ? (
                          <div className="stock-wrap">
                            <div className="stock-bar-bg" style={{ background:sc.bg }}>
                              <div className="stock-bar-fill" style={{ width:`${pct}%`, background:sc.fill }} />
                            </div>
                            <div className="stock-footer">
                              <span className="stock-text" style={{ color:sc.text }}>Остаток: <b>{fmt(m.stock)} {m.unit}</b></span>
                              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                                {sc.label && <span className="stock-badge" style={{ background:sc.bg, color:sc.text }}>{sc.label}</span>}
                                <button className="restock-btn" onClick={() => { setRestockId(m.id); setRestockAmt(""); }}>+ Пополнить</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="stock-footer" style={{ marginTop:5 }}>
                            <span style={{ fontSize:11, color:"var(--light)" }}>Остаток не отслеживается</span>
                            <button className="restock-btn" onClick={() => { setRestockId(m.id); setRestockAmt(""); }}>Указать</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            }
            <div className="info-box" style={{ background:"var(--gold-light)", color:"#8A6030", marginTop:10 }}>
              <span>💡</span><span>Остатки списываются автоматически после сохранения расчёта</span>
            </div>
          </>)}

          {/* ══════════ РАСЧЁТ ══════════ */}
          {tab === "calc" && (<>
            <div className="section-title">Расчёт услуги</div>
            <div className="card">
              <div className="input-group" style={{ marginBottom:0 }}>
                <div className="input-label">Название услуги</div>
                <input className="input" placeholder="Маникюр с гель-лаком" value={svcName} onChange={e => setSvcName(e.target.value)} />
              </div>
            </div>

            {/* Материалы */}
            <div className="card">
              <div style={{ fontWeight:700, fontSize:12, color:"var(--mid)", marginBottom:9, textTransform:"uppercase", letterSpacing:".6px" }}>Расходные материалы</div>
              {selMats.length === 0 && <div style={{ textAlign:"center", padding:"6px 0 10px", color:"var(--light)", fontSize:13 }}>Добавьте материалы из каталога</div>}
              {selMats.map(sel => {
                const m = materials.find(x => x.id === sel.id);
                if (!m) return null;
                const cost = (m.price / m.volume) * sel.amount;
                const insuf = m.stock != null && sel.amount > m.stock;
                return (
                  <div className="mat-pick" key={sel.id}>
                    <div style={{ fontSize:18 }}>{emoji(m.name)}</div>
                    <div className="mat-pick-info">
                      <div className="mat-pick-name">{m.name}</div>
                      <div style={{ fontSize:11, color:"var(--rose)", fontWeight:700 }}>{fmtRub(cost)} ₽</div>
                      {insuf && <div className="warn-stock">⚠ есть только {fmt(m.stock)} {m.unit}</div>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <input className="amount-input" style={{ borderColor:insuf?"#D97070":"" }} type="number" min="0" step="0.1" value={sel.amount} onChange={e => updateAmt(sel.id, e.target.value)} />
                      <span style={{ fontSize:11, color:"var(--light)", minWidth:18 }}>{m.unit}</span>
                      <button className="icon-btn" style={{ background:"#FEEAEA" }} onClick={() => removeFromCalc(sel.id)}><X /></button>
                    </div>
                  </div>
                );
              })}
              <button className="add-mat-btn" onClick={() => setShowPicker(true)}>+ Добавить из каталога</button>
            </div>

            {/* Время + труд + аренда */}
            <div className="card">
              <div style={{ fontWeight:700, fontSize:12, color:"var(--mid)", marginBottom:9, textTransform:"uppercase", letterSpacing:".6px" }}>Время и стоимость работы</div>

              {/* Время в часах */}
              <div className="input-group">
                <div className="input-label">Длительность услуги (часов)</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input className="input" type="number" min="0.25" step="0.25" value={timeHours}
                    onChange={e => setTimeHours(parseFloat(e.target.value) || 0)}
                    style={{ flex:1 }} />
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {[0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(h => (
                      <button key={h} onClick={() => setTimeHours(h)}
                        style={{ padding:"4px 8px", borderRadius:8, border:"1.5px solid", fontFamily:"Nunito,sans-serif", fontSize:11, fontWeight:700, cursor:"pointer", transition:"all .15s",
                          borderColor: timeHours === h ? "var(--rose)" : "var(--rose-light)",
                          background: timeHours === h ? "var(--rose-pale)" : "transparent",
                          color: timeHours === h ? "var(--rose-deep)" : "var(--light)" }}>
                        {h}ч
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Труд мастера */}
              <div style={{ background:"var(--rose-pale)", borderRadius:11, padding:"9px 12px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--dark)" }}>👩‍🎨 Труд мастера</div>
                    <div style={{ fontSize:11, color:"var(--mid)", marginTop:1 }}>{fmtRub(settings.laborRate)} ₽/ч × {timeHours} ч</div>
                  </div>
                  <div style={{ fontFamily:"Playfair Display,serif", fontSize:16, fontWeight:700, color:"var(--rose-deep)" }}>{fmtRub(laborCost)} ₽</div>
                </div>
              </div>

              {/* Аренда */}
              {settings.rentEnabled ? (
                <div style={{ background:"var(--blue-light)", borderRadius:11, padding:"9px 12px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#2A4A7A" }}>🏠 Аренда</div>
                      <div style={{ fontSize:11, color:"#5A7AAA", marginTop:1 }}>
                        {settings.rentType === "hour"
                          ? `${fmtRub(settings.rentPerHour)} ₽/ч × ${timeHours} ч`
                          : `${fmtRub(settings.rentPerDay)} ₽/день ÷ ${settings.hoursPerDay}ч × ${timeHours} ч`
                        }
                      </div>
                    </div>
                    <div style={{ fontFamily:"Playfair Display,serif", fontSize:16, fontWeight:700, color:"#2A4A7A" }}>{fmtRub(rentForService)} ₽</div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign:"center", fontSize:12, color:"var(--light)", padding:"4px 0" }}>
                  Аренда не настроена — <span style={{ color:"var(--rose)", cursor:"pointer", fontWeight:700 }} onClick={() => setTab("settings")}>настроить →</span>
                </div>
              )}
            </div>

            {/* Наценка */}
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"var(--mid)", textTransform:"uppercase", letterSpacing:".6px" }}>Наценка</div>
                <div style={{ fontFamily:"Playfair Display,serif", fontSize:17, fontWeight:700, color:"var(--rose-deep)" }}>{markup}%</div>
              </div>
              <input className="slider" type="range" min={0} max={300} step={5} value={markup} onChange={e => setMarkup(+e.target.value)} />
              <div className="slider-labels"><span>0%</span><span>100%</span><span>200%</span><span>300%</span></div>
            </div>

            {/* Итог */}
            <div className="card card-accent">
              <div style={{ fontWeight:700, fontSize:12, color:"var(--mid)", marginBottom:7, textTransform:"uppercase", letterSpacing:".6px" }}>Себестоимость</div>
              <div className="cost-row"><span className="cost-label">💅 Материалы</span><span className="cost-val">{fmtRub(matCost)} ₽</span></div>
              <div className="cost-row"><span className="cost-label">👩‍🎨 Труд ({fmtH(timeHours)})</span><span className="cost-val">{fmtRub(laborCost)} ₽</span></div>
              {settings.rentEnabled && <div className="cost-row"><span className="cost-label">🏠 Аренда ({fmtH(timeHours)})</span><span className="cost-val">{fmtRub(rentForService)} ₽</span></div>}
              <div className="cost-total">
                <div className="cost-total-label">Итого себестоимость</div>
                <div className="cost-total-val">{fmtRub(totalCost)} ₽</div>
              </div>
              <div className="price-hero">
                <div className="price-hero-label">Рекомендуемая цена клиенту</div>
                <div className="price-hero-val">{fmtRub(recPrice)} ₽</div>
                <div className="price-hero-sub">Наценка {markup}% · Прибыль {fmtRub(profit)} ₽</div>
              </div>

              {stockAfter.length > 0 && (
                <div className="after-stock">
                  <div className="after-stock-title">📦 Остаток после услуги</div>
                  {stockAfter.map(s => {
                    const st = stockStatus(s.after, materials.find(m => m.id === s.id)?.volume || 1);
                    const sc = STATUS_COLOR[st];
                    return (
                      <div className="after-stock-row" key={s.id}>
                        <span style={{ color:"var(--mid)", fontSize:12 }}>{s.name}</span>
                        <span style={{ fontWeight:700, fontSize:12, color:sc.text }}>{fmt(s.before)} → <b>{fmt(s.after)} {s.unit}</b>{s.after <= 0 ? " ⚠" : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={saveService}>
                Сохранить и списать материалы
              </button>
            </div>
          </>)}

          {/* ══════════ ИСТОРИЯ ══════════ */}
          {tab === "history" && (<>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div className="section-title" style={{ margin:0 }}>История</div>
              {services.length > 0 && <div className="tag">{services.length} услуг</div>}
            </div>
            {services.length === 0
              ? <div className="empty">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">История пуста</div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop:12, width:"auto", paddingLeft:22, paddingRight:22 }} onClick={() => setTab("calc")}>Создать расчёт</button>
                </div>
              : <div className="card">
                  {services.map(s => (
                    <div className="hist-item" key={s.id}>
                      <div className="hist-header">
                        <div className="hist-name">{s.name}</div>
                        <div className="hist-date">{s.date}</div>
                      </div>
                      <div className="hist-prices">
                        <div className="hist-chip cost">себест. {fmtRub(s.totalCost)} ₽</div>
                        <div className="hist-chip price">цена {fmtRub(s.recPrice)} ₽</div>
                        <div className="tag">+{s.markup}%</div>
                        {s.timeHours && <div className="tag" style={{ background:"var(--blue-light)", color:"#3A5A8A" }}>{fmtH(s.timeHours)}</div>}
                      </div>
                      {s.rentCost > 0 && <div style={{ fontSize:11, color:"#5A7AAA", marginTop:3 }}>🏠 аренда: {fmtRub(s.rentCost)} ₽</div>}
                      {s.mats?.length > 0 && (
                        <div className="hist-mats">
                          {s.mats.map((m, i) => (
                            <span key={i}>{m.name} {fmt(m.amount)}{m.unit}{m.stockAfter != null ? ` (ост.${fmt(m.stockAfter)})` : ""}{i < s.mats.length - 1 ? " · " : ""}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            }
          </>)}

          {/* ══════════ НАСТРОЙКИ ══════════ */}
          {tab === "settings" && (<>
            <div className="section-title">Настройки</div>

            {/* Труд */}
            <div className="card">
              <div className="setting-block-title">👩‍🎨 Труд мастера</div>
              <div className="input-group" style={{ marginBottom:0 }}>
                <div className="input-label">Ставка мастера (₽ в час)</div>
                <input className="input" type="number" value={settings.laborRate}
                  onChange={e => updSett({ laborRate: +e.target.value || 0 })} />
              </div>
              <div style={{ fontSize:12, color:"var(--light)", marginTop:6 }}>
                За 1 час = {fmtRub(settings.laborRate)} ₽ · За 8 часов = {fmtRub(settings.laborRate * 8)} ₽
              </div>
            </div>

            {/* Аренда */}
            <div className="card">
              <div className="setting-block-title">🏠 Аренда рабочего места</div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Учитывать аренду</div>
                  <div className="toggle-sub">Будет добавляться к себестоимости</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={settings.rentEnabled} onChange={e => updSett({ rentEnabled: e.target.checked })} />
                  <div className="toggle-track" />
                </label>
              </div>

              {settings.rentEnabled && (<>
                <div className="input-label" style={{ marginBottom:6 }}>Тип расчёта аренды</div>
                <div className="seg-control">
                  <button className={`seg-btn ${settings.rentType === "day" ? "active" : ""}`} onClick={() => updSett({ rentType:"day" })}>
                    📅 По дням
                  </button>
                  <button className={`seg-btn ${settings.rentType === "hour" ? "active" : ""}`} onClick={() => updSett({ rentType:"hour" })}>
                    ⏱ По часам
                  </button>
                </div>

                {settings.rentType === "day" ? (<>
                  <div className="input-row">
                    <div className="input-group">
                      <div className="input-label">Аренда за день (₽)</div>
                      <input className="input" type="number" value={settings.rentPerDay}
                        onChange={e => updSett({ rentPerDay: +e.target.value || 0 })} />
                    </div>
                    <div className="input-group">
                      <div className="input-label">Часов в рабочем дне</div>
                      <input className="input" type="number" min="1" max="24" value={settings.hoursPerDay}
                        onChange={e => updSett({ hoursPerDay: +e.target.value || 1 })} />
                    </div>
                  </div>
                  <div className="rent-preview">
                    💡 {fmtRub(settings.rentPerDay)} ÷ {settings.hoursPerDay} ч = <b>{fmtRub(settings.rentPerDay / settings.hoursPerDay)} ₽/час</b> · За 2 ч услуга = {fmtRub(settings.rentPerDay / settings.hoursPerDay * 2)} ₽
                  </div>
                </>) : (<>
                  <div className="input-group">
                    <div className="input-label">Аренда за час (₽) — для коворкинга</div>
                    <input className="input" type="number" value={settings.rentPerHour}
                      onChange={e => updSett({ rentPerHour: +e.target.value || 0 })} />
                  </div>
                  <div className="rent-preview">
                    💡 За 2 ч услуга = <b>{fmtRub(settings.rentPerHour * 2)} ₽</b> · За 8 ч день = {fmtRub(settings.rentPerHour * 8)} ₽
                  </div>
                </>)}
              </>)}
            </div>

            <div className="info-box" style={{ background:"var(--green-light)", color:"#3A6A4A", marginTop:4 }}>
              <span>✓</span><span>Настройки сохраняются автоматически при изменении</span>
            </div>
          </>)}

        </div>{/* /content */}

        {/* ── NAV ── */}
        <nav className="bottom-nav">
          {[
            { id:"catalog",  label:"Каталог",  path:"M4 6h16M4 12h16M4 18h16" },
            { id:"calc",     label:"Расчёт",   path:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
            { id:"history",  label:"История",  path:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id:"settings", label:"Настройки",path:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
          ].map(t => (
            <button key={t.id} className={`nav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.path}/></svg>
              {t.label}
              <div className="nav-dot" />
            </button>
          ))}
        </nav>
      </div>

      {/* ── Modal: Add Material ── */}
      {showAddMat && (
        <div className="overlay" onClick={() => setShowAddMat(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Новый материал <button className="icon-btn" style={{ background:"var(--rose-pale)" }} onClick={() => setShowAddMat(false)}><X /></button></div>
            <div className="input-group">
              <div className="input-label">Название</div>
              <input className="input" placeholder="Гель-лак OPI" value={newMat.name} onChange={e => setNewMat({ ...newMat, name:e.target.value })} />
            </div>
            <div className="input-row">
              <div className="input-group">
                <div className="input-label">Цена (₽)</div>
                <input className="input" type="number" placeholder="1200" value={newMat.price} onChange={e => setNewMat({ ...newMat, price:e.target.value })} />
              </div>
              <div className="input-group">
                <div className="input-label">Единица</div>
                <select className="input" value={newMat.unit} onChange={e => setNewMat({ ...newMat, unit:e.target.value })}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <div className="input-label">Объём уп.</div>
                <input className="input" type="number" placeholder="15" value={newMat.volume} onChange={e => setNewMat({ ...newMat, volume:e.target.value })} />
              </div>
              <div className="input-group">
                <div className="input-label">Текущий остаток</div>
                <input className="input" type="number" placeholder="необяз." value={newMat.stock} onChange={e => setNewMat({ ...newMat, stock:e.target.value })} />
              </div>
            </div>
            {newMat.price && newMat.volume && (
              <div style={{ background:"var(--rose-pale)", borderRadius:10, padding:"7px 12px", fontSize:12, color:"var(--rose-deep)", marginBottom:12, fontWeight:600 }}>
                💰 {fmtRub(+newMat.price / +newMat.volume)} ₽ за 1 {newMat.unit}
              </div>
            )}
            <button className="btn btn-primary" onClick={addMaterial}>Добавить в каталог</button>
          </div>
        </div>
      )}

      {/* ── Modal: Restock ── */}
      {restockId && restockMat && (
        <div className="overlay" onClick={() => setRestockId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Пополнить запас <button className="icon-btn" style={{ background:"var(--rose-pale)" }} onClick={() => setRestockId(null)}><X /></button></div>
            <div style={{ background:"var(--rose-pale)", borderRadius:12, padding:"9px 13px", marginBottom:13 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{restockMat.name}</div>
              <div style={{ fontSize:12, color:"var(--mid)", marginTop:2 }}>Сейчас: <b>{restockMat.stock != null ? `${fmt(restockMat.stock)} ${restockMat.unit}` : "не указан"}</b></div>
            </div>
            <div className="input-group">
              <div className="input-label">{restockMat.stock != null ? `Добавить (${restockMat.unit})` : `Установить остаток (${restockMat.unit})`}</div>
              <input className="input" type="number" placeholder="0" value={restockAmt} onChange={e => setRestockAmt(e.target.value)} autoFocus />
            </div>
            {restockAmt && +restockAmt > 0 && (
              <div style={{ background:"var(--green-light)", borderRadius:10, padding:"7px 12px", fontSize:12, color:"#4A7A58", marginBottom:12, fontWeight:600 }}>
                {restockMat.stock != null ? `Будет: ${fmt((restockMat.stock || 0) + +restockAmt)} ${restockMat.unit}` : `Установить: ${fmt(+restockAmt)} ${restockMat.unit}`}
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {
              if (!restockAmt || +restockAmt <= 0) return;
              saveMats(materials.map(m => m.id === restockId ? { ...m, stock: restockMat.stock != null ? restockMat.stock + +restockAmt : +restockAmt } : m));
              setRestockId(null); setRestockAmt("");
              showToast("✓ Запас обновлён");
            }}>{restockMat.stock != null ? "Пополнить" : "Сохранить"}</button>
          </div>
        </div>
      )}

      {/* ── Modal: Picker ── */}
      {showPicker && (
        <div className="overlay" onClick={() => setShowPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Выбрать материал <button className="icon-btn" style={{ background:"var(--rose-pale)" }} onClick={() => setShowPicker(false)}><X /></button></div>
            {materials.filter(m => !selMats.find(s => s.id === m.id)).map(m => {
              const st = stockStatus(m.stock, m.volume);
              const sc = STATUS_COLOR[st];
              return (
                <div className="mat-item" key={m.id} style={{ cursor:"pointer" }} onClick={() => addToCalc(m.id)}>
                  <div className="mat-row">
                    <div className="mat-icon">{emoji(m.name)}</div>
                    <div className="mat-info">
                      <div className="mat-name">{m.name}</div>
                      <div className="mat-meta">{fmtRub(m.price / m.volume)} ₽ / {m.unit}</div>
                      {m.stock != null && <div style={{ fontSize:11, fontWeight:700, color:sc.text, marginTop:1 }}>Остаток: {fmt(m.stock)} {m.unit}</div>}
                    </div>
                    <div style={{ color:"var(--rose)", fontSize:20, paddingRight:4 }}>+</div>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:11 }}>
              <button className="btn btn-ghost" onClick={() => { setShowPicker(false); setShowAddMat(true); }}>+ Добавить новый материал</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
