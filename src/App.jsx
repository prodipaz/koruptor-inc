import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://jxyrzmousitcqmcplwip.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eXJ6bW91c2l0Y3FtY3Bsd2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTQxOTMsImV4cCI6MjA4ODU3MDE5M30.0nONQS7tQ5kSQWw30DMAfuoskoldlwE6jojpt43a3TQ";
const SAWERIA_URL = "https://saweria.co/korincdev";

const PROVINCES = [
  "Aceh","Sumatera Utara","Sumatera Barat","Riau","Kepulauan Riau",
  "Jambi","Sumatera Selatan","Kepulauan Bangka Belitung","Bengkulu","Lampung",
  "DKI Jakarta","Jawa Barat","Banten","Jawa Tengah","DI Yogyakarta",
  "Jawa Timur","Bali","Nusa Tenggara Barat","Nusa Tenggara Timur",
  "Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur","Kalimantan Utara",
  "Sulawesi Utara","Gorontalo","Sulawesi Tengah","Sulawesi Barat","Sulawesi Selatan","Sulawesi Tenggara",
  "Maluku","Maluku Utara","Papua Barat","Papua","Papua Selatan","Papua Tengah","Papua Pegunungan","Papua Barat Daya"
];

// Semua nilai dalam satuan rupiah nyata (x1.000.000 dari versi lama)
// Base click = Rp 1.000.000 per klik
const M = 1_000_000; // 1 Juta

const UPGRADES = [
  { id:"staf",      name:"Staf Fiktif",       emoji:"👤", desc:"Auto +1Jt/detik",          baseCost:100*M,    baseIncome:1*M,   maxLevel:50 },
  { id:"proyek",    name:"Proyek Fiktif",      emoji:"📄", desc:"Klik power x1.5",          baseCost:500*M,    baseIncome:5*M,   maxLevel:30 },
  { id:"pengacara", name:"Pengacara Handal",   emoji:"👨‍⚖️", desc:"KPK slowdown -10%",       baseCost:1000*M,   baseIncome:0,     maxLevel:10 },
  { id:"rekening",  name:"Rekening Offshore",  emoji:"🏦", desc:"+20Jt passive/detik",      baseCost:5000*M,   baseIncome:20*M,  maxLevel:20 },
  { id:"kolusi",    name:"Jaringan Kolusi",    emoji:"🤝", desc:"Klik bonus x3",            baseCost:10000*M,  baseIncome:50*M,  maxLevel:15 },
  { id:"launder",   name:"Cuci Uang",          emoji:"🧺", desc:"Amankan 30% dari sitaan",  baseCost:25000*M,  baseIncome:0,     maxLevel:5  },
  { id:"pulau",     name:"Beli Pulau Pribadi", emoji:"🏝️", desc:"+200Jt passive/detik",     baseCost:100000*M, baseIncome:200*M, maxLevel:10 },
];

const EVENTS = [
  { msg:"Whistleblower muncul! KPK naik +20%", kpcBoost:20 },
  { msg:"Berita bocor ke media! KPK naik +15%", kpcBoost:15 },
  { msg:"Dana proyek cair! Bonus x5 selama 10 detik!", kpcBoost:0 },
  { msg:"Saksi bungkam! KPK turun -10%", kpcBoost:-10 },
  { msg:"Viral di Twitter! KPK naik +10%", kpcBoost:10 },
  { msg:"Pemilu! Semua bingung, KPK turun -15%", kpcBoost:-15 },
  { msg:"Proyek mercusuar disetujui! Passive x2 selama 15 detik!", kpcBoost:5 },
];

const formatRp = (n) => {
  n = Math.floor(Number(n) || 0);
  if (n >= 1e15) return "Rp " + Math.floor(n/1e15) + " Kuadriliun";
  if (n >= 1e12) return "Rp " + Math.floor(n/1e12) + " Triliun";
  if (n >= 1e9)  return "Rp " + Math.floor(n/1e9)  + " Miliar";
  if (n >= 1e6)  return "Rp " + Math.floor(n/1e6)  + " Juta";
  if (n >= 1e3)  return "Rp " + Math.floor(n/1e3)  + " Ribu";
  return "Rp " + n;
};

const db = {
  async upsertPlayer(data) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(data)
      });
    } catch(e) { console.error(e); }
  },
  async getLeaderboard() {
    try {
      const r = await fetch(
        SUPABASE_URL + "/rest/v1/players?select=name,province,total_korupsi,prestige_count&order=total_korupsi.desc&limit=50",
        { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY } }
      );
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },
  async getDonations() {
    try {
      const r = await fetch(
        SUPABASE_URL + "/rest/v1/donations?select=name,amount,message,created_at&order=amount.desc&limit=20",
        { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY } }
      );
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },
  async getLatestDonation() {
    try {
      const r = await fetch(
        SUPABASE_URL + "/rest/v1/donations?select=name,amount,message,created_at&order=created_at.desc&limit=1",
        { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY } }
      );
      const data = r.ok ? await r.json() : [];
      return data[0] || null;
    } catch { return null; }
  }
};

export default function App() {
  const [money,         setMoney]         = useState(0);
  const [totalKorupsi,  setTotalKorupsi]  = useState(0);
  const [kpcMeter,      setKpcMeter]      = useState(0);
  const [prestige,      setPrestige]      = useState(0);
  const [upgrades,      setUpgrades]      = useState({});
  const [clickPower,    setClickPower]    = useState(1*M);
  const [passiveIncome, setPassiveIncome] = useState(0);
  const [kpcSlowdown,   setKpcSlowdown]   = useState(0);
  const [launderPct,    setLaunderPct]    = useState(0);
  const [bonusActive,   setBonusActive]   = useState(false);
  const [bonusType,     setBonusType]     = useState(null);
  const [shaking,       setShaking]       = useState(false);
  const [raidAnim,      setRaidAnim]      = useState(false);

  const [tab,           setTab]           = useState("game");
  const [playerName,    setPlayerName]    = useState("");
  const [province,      setProvince]      = useState("");
  const [setupDone,     setSetupDone]     = useState(false);
  const [clicks,        setClicks]        = useState([]);
  const [ticker,        setTicker]        = useState([
    "Selamat datang di Koruptor Inc.! Game satir anti-korupsi!",
    "Klik tombol MARKUP untuk korupsi pertamamu!",
    "Hati-hati KPK terus mengintai...",
    "Siapa koruptor terkaya se-Indonesia?",
  ]);
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [donations,     setDonations]     = useState([]);
  const [toast,         setToast]         = useState(null);
  const [detecting,     setDetecting]     = useState(false);

  const playerId    = useRef(null);
  const lastDonTs   = useRef(localStorage.getItem("last_don_ts") || "");
  const moneyRef    = useRef(0);
  const totalRef    = useRef(0);
  const passiveRef  = useRef(0);
  const bonusRef    = useRef(false);
  const kpcSlowRef  = useRef(0);

  useEffect(() => { moneyRef.current   = money;         }, [money]);
  useEffect(() => { totalRef.current   = totalKorupsi;  }, [totalKorupsi]);
  useEffect(() => { passiveRef.current = passiveIncome; }, [passiveIncome]);
  useEffect(() => { bonusRef.current   = bonusActive;   }, [bonusActive]);
  useEffect(() => { kpcSlowRef.current = kpcSlowdown;   }, [kpcSlowdown]);

  useEffect(() => {
    let id = localStorage.getItem("koruptor_pid");
    if (!id) {
      id = "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem("koruptor_pid", id);
    }
    playerId.current = id;
  }, []);

  useEffect(() => {
    const s = localStorage.getItem("koruptor_v2");
    if (!s) return;
    try {
      const d = JSON.parse(s);
      setMoney(d.money || 0);
      setTotalKorupsi(d.total || 0);
      setKpcMeter(d.kpc || 0);
      setPrestige(d.prestige || 0);
      setUpgrades(d.upgrades || {});
      setPlayerName(d.name || "");
      setProvince(d.prov || "");
      if (d.name && d.prov) setSetupDone(true);
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!setupDone) return;
    const t = setTimeout(() => {
      localStorage.setItem("koruptor_v2", JSON.stringify({
        money, total: totalKorupsi, kpc: kpcMeter,
        prestige, upgrades, name: playerName, prov: province
      }));
    }, 2000);
    return () => clearTimeout(t);
  }, [money, totalKorupsi, kpcMeter, prestige, upgrades, playerName, province, setupDone]);

  useEffect(() => {
    let cp = M * (1 + prestige * 0.5); // base Rp 1 Juta per klik
    let pi = 0, ks = 0, lp = 0;
    UPGRADES.forEach(u => {
      const lvl = upgrades[u.id] || 0;
      if (!lvl) return;
      if (u.id === "staf")      pi += u.baseIncome * lvl;
      if (u.id === "proyek")    cp *= (1 + 0.5 * lvl);
      if (u.id === "pengacara") ks += 10 * lvl;
      if (u.id === "rekening")  pi += u.baseIncome * lvl;
      if (u.id === "kolusi")    cp *= (1 + 1.5 * lvl);
      if (u.id === "launder")   lp += 30 * lvl;
      if (u.id === "pulau")     pi += u.baseIncome * lvl;
    });
    setClickPower(Math.max(1, Math.floor(cp)));
    setPassiveIncome(Math.floor(pi));
    setKpcSlowdown(Math.min(ks, 80));
    setLaunderPct(Math.min(lp, 90));
  }, [upgrades, prestige]);

  const addTicker = useCallback((msg) => {
    setTicker(prev => [...prev.slice(-30), msg]);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!setupDone) return;
    const iv = setInterval(() => {
      const pi = passiveRef.current;
      const bonus = bonusRef.current;
      const income = bonus ? pi * 2 : pi;
      if (income > 0) {
        setMoney(m => m + income);
        setTotalKorupsi(t => t + income);
      }
      const slowdown = kpcSlowRef.current;
      setKpcMeter(k => Math.min(100, k + Math.max(0.04, 0.18 - (slowdown / 500))));
    }, 1000);
    return () => clearInterval(iv);
  }, [setupDone]);

  useEffect(() => {
    if (kpcMeter >= 100 && setupDone) triggerRaid();
  }, [kpcMeter]);

  useEffect(() => {
    if (!setupDone) return;
    const iv = setInterval(() => {
      if (Math.random() > 0.25) return;
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      addTicker("BREAKING: " + ev.msg);
      showToast(ev.msg);
      if (ev.kpcBoost === 0) {
        setBonusActive(true);
        setBonusType("click");
        setTimeout(() => { setBonusActive(false); setBonusType(null); }, 10000);
      } else {
        setKpcMeter(k => Math.max(0, Math.min(100, k + ev.kpcBoost)));
      }
    }, 18000);
    return () => clearInterval(iv);
  }, [setupDone, addTicker, showToast]);

  useEffect(() => {
    if (!setupDone) return;
    const sync = async () => {
      await db.upsertPlayer({
        player_id: playerId.current,
        name: playerName,
        province: province,
        total_korupsi: Math.floor(totalRef.current),
        prestige_count: prestige,
        updated_at: new Date().toISOString()
      });
      const lb = await db.getLeaderboard();
      setLeaderboard(lb);
      const don = await db.getDonations();
      setDonations(don);
      const latest = await db.getLatestDonation();
      if (latest && latest.created_at !== lastDonTs.current) {
        lastDonTs.current = latest.created_at;
        localStorage.setItem("last_don_ts", latest.created_at);
        const msg = "DONASI MASUK! " + latest.name + " nyumbang " + formatRp(Number(latest.amount)) + "! \"" + (latest.message || "Semangat korupsinya!") + "\"";
        addTicker(msg);
        showToast("Donasi baru dari " + latest.name + "! Terima kasih!");
      }
    };
    sync();
    const iv = setInterval(sync, 15000);
    return () => clearInterval(iv);
  }, [setupDone, playerName, province, prestige, addTicker, showToast]);

  const triggerRaid = () => {
    const lp = launderPct;
    const safe = Math.floor(totalRef.current * (lp / 100));
    setRaidAnim(true);
    setShaking(true);
    setTimeout(() => { setRaidAnim(false); setShaking(false); }, 2000);
    addTicker("KPK RAID! " + playerName + " dari " + province + " ditangkap! Hanya " + lp + "% uang aman!");
    showToast("KPK DATANG! Prestige +1! Uang aman: " + formatRp(safe));
    setMoney(safe);
    setKpcMeter(0);
    setPrestige(p => p + 1);
  };

  const handleClick = (e) => {
    const power = bonusActive ? clickPower * 5 : clickPower;
    setMoney(m => m + power);
    setTotalKorupsi(t => t + power);
    setKpcMeter(k => Math.min(100, k + 0.08));
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setClicks(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top, power }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 900);
  };

  const buyUpgrade = (uid) => {
    const u = UPGRADES.find(x => x.id === uid);
    const lvl = upgrades[uid] || 0;
    if (lvl >= u.maxLevel) return;
    const cost = Math.floor(u.baseCost * Math.pow(1.55, lvl));
    if (moneyRef.current < cost) { showToast("Uang belum cukup!"); return; }
    setMoney(m => m - cost);
    setUpgrades(prev => ({ ...prev, [uid]: (prev[uid] || 0) + 1 }));
    addTicker(playerName + " beli " + u.name + " Lv." + (lvl + 1) + "!");
  };

  const suapKPK = () => {
    const cost = Math.floor(3000*M * Math.pow(1.4, Math.floor(kpcMeter / 10)));
    if (moneyRef.current < cost) { showToast("Kurang uang untuk nyuap!"); return; }
    setMoney(m => m - cost);
    setKpcMeter(k => Math.max(0, k - 30));
    addTicker(playerName + " berhasil nyuap KPK sebesar " + formatRp(cost) + "!");
    showToast("KPK berhasil disuap! Meter -30%");
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { showToast("GPS tidak tersedia"); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(
          "https://nominatim.openstreetmap.org/reverse?lat=" + pos.coords.latitude +
          "&lon=" + pos.coords.longitude + "&format=json&accept-language=id"
        );
        const d = await r.json();
        const state = ((d.address && (d.address.state || d.address.province)) || "").toLowerCase();
        const match = PROVINCES.find(p => {
          const pl = p.toLowerCase();
          return state.includes(pl) || pl.includes(state.split(" ")[0]);
        });
        if (match) { setProvince(match); showToast("Terdeteksi: " + match); }
        else showToast("Pilih provinsi manual ya!");
      } catch { showToast("Gagal deteksi lokasi"); }
      setDetecting(false);
    }, () => { showToast("Akses GPS ditolak"); setDetecting(false); });
  };

  const kpcColor = kpcMeter < 35 ? "#22c55e" : kpcMeter < 65 ? "#f59e0b" : "#ef4444";
  const tickerStr = ticker.join("   ---   ");

  // SETUP SCREEN
  if (!setupDone) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Segoe UI',sans-serif"}}>
      <style>{`
        @keyframes floatIn { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .setup-card { animation: floatIn 0.6s ease-out; }
        input:focus, select:focus { border-color: #fbbf24 !important; outline: none; }
      `}</style>
      <div className="setup-card" style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",borderRadius:"28px",padding:"40px 32px",maxWidth:"400px",width:"100%",border:"1px solid rgba(255,255,255,0.12)",textAlign:"center"}}>
        <div style={{fontSize:"72px",marginBottom:"8px",filter:"drop-shadow(0 0 20px rgba(251,191,36,0.5))"}}>🏛</div>
        <h1 style={{fontSize:"30px",fontWeight:"900",color:"#fbbf24",margin:"0 0 4px",letterSpacing:"2px"}}>KORUPTOR INC.</h1>
        <p style={{color:"rgba(255,255,255,0.4)",margin:"0 0 28px",fontSize:"13px"}}>Game satir idle clicker — bukan glorifikasi korupsi</p>
        <input
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          placeholder="Nama pejabatmu..."
          style={{width:"100%",padding:"14px 18px",borderRadius:"14px",border:"2px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.07)",color:"white",fontSize:"16px",marginBottom:"12px",boxSizing:"border-box",transition:"border 0.2s"}}
        />
        <div style={{display:"flex",gap:"8px",marginBottom:"20px"}}>
          <select
            value={province}
            onChange={e => setProvince(e.target.value)}
            style={{flex:1,padding:"14px 12px",borderRadius:"14px",border:"2px solid rgba(255,255,255,0.1)",background:"rgba(30,30,60,0.95)",color:province?"white":"rgba(255,255,255,0.4)",fontSize:"14px"}}
          >
            <option value="">-- Pilih Provinsi --</option>
            {PROVINCES.map(p => <option key={p} value={p} style={{color:"white",background:"#302b63"}}>{p}</option>)}
          </select>
          <button
            onClick={detectLocation}
            disabled={detecting}
            title="Deteksi lokasi otomatis"
            style={{padding:"14px 16px",borderRadius:"14px",border:"2px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.07)",color:"white",cursor:"pointer",fontSize:"20px"}}
          >
            {detecting ? "..." : "📍"}
          </button>
        </div>
        <button
          onClick={() => {
            if (playerName.trim() && province) {
              setSetupDone(true);
              addTicker(playerName + " dari " + province + " resmi jadi koruptor!");
            }
          }}
          disabled={!playerName.trim() || !province}
          style={{width:"100%",padding:"16px",borderRadius:"16px",border:"none",background:playerName.trim()&&province?"linear-gradient(135deg,#f59e0b,#ef4444)":"rgba(255,255,255,0.1)",color:"white",fontSize:"17px",fontWeight:"900",cursor:playerName.trim()&&province?"pointer":"not-allowed",letterSpacing:"1px",boxShadow:playerName.trim()&&province?"0 8px 30px rgba(245,158,11,0.4)":"none"}}
        >
          MULAI BERKORUPSI!
        </button>
        <p style={{fontSize:"11px",color:"rgba(255,255,255,0.25)",marginTop:"16px",lineHeight:"1.6"}}>
          Korupsi nyata merugikan rakyat dan negara Indonesia. Say NO to corruption!
        </p>
      </div>
    </div>
  );

  // MAIN GAME
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0a1a,#1a1040,#0d1a2e)",fontFamily:"'Segoe UI',sans-serif",color:"white",display:"flex",flexDirection:"column",animation:shaking?"shake 0.6s":"none",position:"relative"}}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-15px)} 30%{transform:translateX(15px)} 45%{transform:translateX(-10px)} 60%{transform:translateX(10px)} 75%{transform:translateX(-5px)} 90%{transform:translateX(5px)} }
        @keyframes floatUp { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-90px) scale(1.8)} }
        @keyframes ticker { 0%{transform:translateX(100vw)} 100%{transform:translateX(-100%)} }
        @keyframes pulse { 0%,100%{transform:scale(1);box-shadow:0 0 30px rgba(245,158,11,0.3)} 50%{transform:scale(1.06);box-shadow:0 0 60px rgba(245,158,11,0.7)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .click-btn:active { transform: scale(0.88) !important; }
        .upg-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
      `}</style>

      {raidAnim && (
        <div style={{position:"fixed",inset:0,background:"rgba(239,68,68,0.2)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{textAlign:"center",animation:"slideIn 0.3s"}}>
            <div style={{fontSize:"100px"}}>🚔</div>
            <div style={{fontSize:"32px",fontWeight:"900",color:"#ef4444",textShadow:"0 0 30px rgba(239,68,68,0.8)"}}>KPK DATANG!</div>
            <div style={{color:"rgba(255,255,255,0.7)",marginTop:"8px"}}>Semua aset disita!</div>
          </div>
        </div>
      )}

      {/* NEWS TICKER */}
      <div style={{background:"linear-gradient(90deg,#b91c1c,#dc2626,#b91c1c)",padding:"7px 0",overflow:"hidden",whiteSpace:"nowrap",flexShrink:0}}>
        <div style={{display:"inline-block",animation:"ticker 60s linear infinite",fontSize:"12px",fontWeight:"700"}}>
          📺 KORUPSI NEWS &nbsp;◆&nbsp; {tickerStr} &nbsp;◆&nbsp;
        </div>
      </div>

      {/* HEADER */}
      <div style={{padding:"10px 14px",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:"16px",fontWeight:"900",letterSpacing:"2px",color:"#fbbf24"}}>KORUPTOR INC.</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>👤 {playerName} &nbsp;•&nbsp; 📍 {province}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"20px",fontWeight:"900",color:"#fbbf24",textShadow:"0 0 15px rgba(251,191,36,0.5)"}}>{formatRp(money)}</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>Total: {formatRp(totalKorupsi)}</div>
        </div>
      </div>

      {/* KPK METER */}
      <div style={{padding:"8px 14px",background:"rgba(0,0,0,0.25)",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"5px"}}>
          <span style={{color:"rgba(255,255,255,0.5)"}}>⚖️ KPK RADAR {kpcSlowdown > 0 ? "(slowdown " + kpcSlowdown + "%)" : ""}</span>
          <span style={{color:kpcColor,fontWeight:"800"}}>{Math.floor(kpcMeter)}% {kpcMeter > 80 ? "BAHAYA!" : kpcMeter > 50 ? "Waspada" : ""}</span>
        </div>
        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:"999px",height:"10px",overflow:"hidden"}}>
          <div style={{width:kpcMeter+"%",height:"100%",background:"linear-gradient(90deg,#22c55e,"+kpcColor+")",borderRadius:"999px",transition:"width 0.5s,background 0.5s",boxShadow:"0 0 10px "+kpcColor}} />
        </div>
        <div style={{display:"flex",gap:"10px",marginTop:"5px",fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>
          <span>+{formatRp(clickPower)}/klik</span>
          <span>+{formatRp(passiveIncome)}/det</span>
          {prestige > 0 && <span style={{color:"#fbbf24"}}>Prestige {prestige}</span>}
          {bonusActive && <span style={{color:"#ef4444",fontWeight:"700"}}>BONUS AKTIF!</span>}
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",background:"rgba(0,0,0,0.3)",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        {[["game","🎮","Game"],["upgrade","⬆️","Upgrade"],["lb","🏆","Papan"],["donasi","💎","Donasi"]].map(([id,icon,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{flex:1,padding:"10px 2px",border:"none",background:tab===id?"rgba(251,191,36,0.1)":"transparent",color:tab===id?"#fbbf24":"rgba(255,255,255,0.35)",fontSize:"11px",fontWeight:tab===id?"800":"400",cursor:"pointer",borderBottom:tab===id?"2px solid #fbbf24":"2px solid transparent",transition:"all 0.2s"}}>
            {icon}<br/>{label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>

        {tab === "game" && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px"}}>
            {bonusActive && (
              <div style={{background:"linear-gradient(135deg,#ef4444,#f59e0b)",borderRadius:"12px",padding:"8px 24px",fontWeight:"900",fontSize:"13px"}}>
                {bonusType === "click" ? "KLIK x5" : "PASSIVE x2"} AKTIF!
              </div>
            )}
            <div style={{position:"relative",marginTop:"8px"}}>
              <button
                className="click-btn"
                onClick={handleClick}
                style={{width:"180px",height:"180px",borderRadius:"50%",border:"3px solid rgba(251,191,36,0.6)",background:"radial-gradient(circle at 40% 35%,#2a2060,#0f0c29)",cursor:"pointer",fontSize:"75px",animation:"pulse 2.5s infinite",transition:"transform 0.1s",display:"flex",alignItems:"center",justifyContent:"center"}}
              >
                🏛
              </button>
              {clicks.map(c => (
                <div key={c.id} style={{position:"absolute",left:c.x,top:c.y,color:"#fbbf24",fontWeight:"900",fontSize:"18px",pointerEvents:"none",animation:"floatUp 0.9s ease-out forwards",whiteSpace:"nowrap",textShadow:"0 0 10px rgba(251,191,36,0.8)"}}>
                  +{formatRp(bonusActive ? c.power * 5 : c.power)}
                </div>
              ))}
            </div>

            <div style={{textAlign:"center",fontSize:"13px",color:"rgba(255,255,255,0.4)"}}>Klik untuk markup anggaran!</div>

            <button onClick={suapKPK} style={{padding:"11px 0",borderRadius:"14px",border:"1.5px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:"13px",fontWeight:"700",cursor:"pointer",width:"100%",maxWidth:"320px",transition:"all 0.2s"}}>
              SUAP KPK — {formatRp(Math.floor(3000*M * Math.pow(1.4, Math.floor(kpcMeter / 10))))}
              <div style={{fontSize:"10px",fontWeight:"400",opacity:0.7}}>Turunkan KPK meter -30%</div>
            </button>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",width:"100%",maxWidth:"360px"}}>
              {[
                ["💰","Total",formatRp(totalKorupsi)],
                ["⭐","Prestige",prestige],
                ["⚡","Klik",formatRp(clickPower)],
                ["💸","Passive",`+${formatRp(passiveIncome)}/s`],
                ["🛡️","KPK Slow",`${kpcSlowdown}%`],
                ["🧺","Aman",`${launderPct}%`],
              ].map(([ico,lbl,val]) => (
                <div key={lbl} style={{background:"rgba(255,255,255,0.04)",borderRadius:"12px",padding:"10px 6px",textAlign:"center",border:"1px solid rgba(255,255,255,0.07)"}}>
                  <div style={{fontSize:"18px"}}>{ico}</div>
                  <div style={{fontSize:"9px",color:"rgba(255,255,255,0.35)",marginTop:"2px"}}>{lbl}</div>
                  <div style={{fontSize:"12px",fontWeight:"800",color:"#fbbf24",marginTop:"2px"}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "upgrade" && (
          <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
            <div style={{textAlign:"center",fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"4px"}}>Tersedia: {formatRp(money)}</div>
            {UPGRADES.map(u => {
              const lvl = upgrades[u.id] || 0;
              const cost = Math.floor(u.baseCost * Math.pow(1.55, lvl));
              const maxed = lvl >= u.maxLevel;
              const can = money >= cost;
              return (
                <button key={u.id} className="upg-btn" onClick={() => buyUpgrade(u.id)} disabled={maxed || !can}
                  style={{display:"flex",alignItems:"center",gap:"12px",padding:"13px",borderRadius:"14px",border:"none",background:maxed?"rgba(255,255,255,0.02)":can?"rgba(251,191,36,0.08)":"rgba(255,255,255,0.04)",cursor:maxed||!can?"not-allowed":"pointer",borderLeft:"3px solid "+(maxed?"#1f2937":can?"#fbbf24":"#374151"),textAlign:"left",width:"100%",transition:"all 0.2s",color:"white"}}>
                  <div style={{fontSize:"32px",flexShrink:0}}>{u.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"700",fontSize:"13px",color:maxed?"#374151":"white"}}>{u.name} {maxed ? "MAX" : "Lv." + lvl + "/" + u.maxLevel}</div>
                    <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>{u.desc}</div>
                    <div style={{fontSize:"12px",color:maxed?"#374151":can?"#fbbf24":"#4b5563",fontWeight:"700",marginTop:"3px"}}>{maxed ? "Sudah maksimal" : formatRp(cost)}</div>
                  </div>
                  {!maxed && <div style={{width:"32px",height:"32px",borderRadius:"50%",background:can?"#fbbf24":"#1f2937",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>{can ? "+" : "🔒"}</div>}
                </button>
              );
            })}
          </div>
        )}

        {tab === "lb" && (
          <div>
            <div style={{textAlign:"center",marginBottom:"16px"}}>
              <div style={{fontSize:"28px"}}>🏆</div>
              <div style={{fontWeight:"900",fontSize:"17px"}}>Koruptor Terkaya Indonesia</div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)"}}>Realtime — update tiap 15 detik</div>
            </div>
            {leaderboard.length === 0 ? (
              <div style={{textAlign:"center",padding:"40px",color:"rgba(255,255,255,0.2)"}}>
                <div style={{fontSize:"48px"}}>📡</div>
                <div>Menunggu data dari Supabase...</div>
              </div>
            ) : (
              <>
                {(() => {
                  const byProv = {};
                  leaderboard.forEach(p => {
                    if (!byProv[p.province]) byProv[p.province] = { total:0, count:0 };
                    byProv[p.province].total += Number(p.total_korupsi);
                    byProv[p.province].count++;
                  });
                  const sorted = Object.entries(byProv).sort((a,b) => b[1].total - a[1].total).slice(0, 5);
                  return (
                    <div style={{marginBottom:"16px"}}>
                      <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Top Provinsi</div>
                      {sorted.map(([prov, d], i) => (
                        <div key={prov} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",marginBottom:"6px"}}>
                          <span style={{fontSize:"16px"}}>{["🥇","🥈","🥉","4","5"][i]}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:"12px",fontWeight:"700"}}>{prov}</div>
                            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>{d.count} koruptor</div>
                          </div>
                          <div style={{fontSize:"12px",fontWeight:"800",color:"#fbbf24"}}>{formatRp(d.total)}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Top Individu</div>
                {leaderboard.map((p, i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"11px",borderRadius:"12px",background:i===0?"rgba(251,191,36,0.1)":i===1?"rgba(156,163,175,0.07)":i===2?"rgba(180,83,9,0.07)":"rgba(255,255,255,0.03)",border:"1px solid "+(i===0?"rgba(251,191,36,0.25)":"rgba(255,255,255,0.04)"),marginBottom:"7px"}}>
                    <div style={{fontSize:"22px",width:"28px",textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"#"+(i+1)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:"700",fontSize:"13px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>📍 {p.province}{p.prestige_count > 0 ? " — Prestige x" + p.prestige_count : ""}</div>
                    </div>
                    <div style={{color:"#fbbf24",fontWeight:"900",fontSize:"13px",flexShrink:0}}>{formatRp(Number(p.total_korupsi))}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "donasi" && (
          <div>
            <div style={{textAlign:"center",marginBottom:"16px"}}>
              <div style={{fontSize:"28px"}}>💎</div>
              <div style={{fontWeight:"900",fontSize:"17px"}}>Dukung Developer</div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)"}}>100% dana didonasikan ke panti asuhan</div>
            </div>
            <a href={SAWERIA_URL} target="_blank" rel="noreferrer" style={{display:"block",textAlign:"center",padding:"18px",borderRadius:"16px",background:"linear-gradient(135deg,#f59e0b,#ef4444)",color:"white",fontWeight:"900",fontSize:"17px",textDecoration:"none",marginBottom:"20px",boxShadow:"0 8px 30px rgba(245,158,11,0.35)"}}>
              DONASI VIA SAWERIA
            </a>
            <div style={{fontWeight:"700",marginBottom:"10px",fontSize:"13px"}}>Top Donatur</div>
            {donations.length === 0 ? (
              <div style={{textAlign:"center",padding:"30px",color:"rgba(255,255,255,0.2)"}}>
                <div style={{fontSize:"48px"}}>💸</div>
                <div>Belum ada donatur</div>
                <div style={{fontSize:"12px",marginTop:"4px"}}>Jadilah yang pertama!</div>
              </div>
            ) : (
              donations.map((d, i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"11px",borderRadius:"12px",background:i===0?"rgba(251,191,36,0.1)":"rgba(255,255,255,0.03)",border:"1px solid "+(i===0?"rgba(251,191,36,0.25)":"rgba(255,255,255,0.04)"),marginBottom:"7px"}}>
                  <div style={{fontSize:"20px"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"#"+(i+1)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:"700",fontSize:"13px"}}>{d.name}</div>
                    {d.message && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{d.message}"</div>}
                  </div>
                  <div style={{color:"#fbbf24",fontWeight:"900",fontSize:"13px",flexShrink:0}}>{formatRp(Number(d.amount))}</div>
                </div>
              ))
            )}
            <div style={{marginTop:"16px",padding:"12px",borderRadius:"12px",background:"rgba(255,255,255,0.03)",fontSize:"10px",color:"rgba(255,255,255,0.2)",textAlign:"center",lineHeight:"1.7"}}>
              Koruptor Inc. adalah game satir. Korupsi nyata merugikan rakyat dan negara Indonesia.
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{position:"fixed",bottom:"16px",left:"50%",transform:"translateX(-50%)",background:"rgba(15,12,40,0.95)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:"14px",padding:"12px 20px",color:"white",fontWeight:"700",fontSize:"13px",boxShadow:"0 8px 40px rgba(0,0,0,0.6)",zIndex:999,backdropFilter:"blur(12px)",maxWidth:"88vw",textAlign:"center",animation:"slideIn 0.3s"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
