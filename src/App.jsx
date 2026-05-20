import { useState, useEffect, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from "recharts";
import { login, fetchPacientes, fetchAllVisitas, getNextId, insertPaciente, updatePaciente, deletePaciente as dbDeletePat, insertVisita } from "./supabase.js";

// ─── Helpers ───
const calcIMC=(peso,talla)=>{const p=parseFloat(peso),t=parseFloat(talla);if(!p||!t)return null;return(p*0.453592/(t*t)).toFixed(1);};
const imcCat=(imc)=>{const v=parseFloat(imc);if(!v)return{label:"—",color:"#94a3b8"};if(v<18.5)return{label:"Bajo peso",color:"#3b82f6"};if(v<25)return{label:"Normal",color:"#16a34a"};if(v<30)return{label:"Sobrepeso",color:"#d97706"};return{label:"Obesidad",color:"#dc2626"};};
const bpCat=(s,d)=>{const sv=parseInt(s),dv=parseInt(d);if(!sv)return{l:"—",c:"#94a3b8"};if(sv>=140||dv>=90)return{l:"Alta",c:"#dc2626"};if(sv>=130||dv>=85)return{l:"Elevada",c:"#d97706"};return{l:"Normal",c:"#16a34a"};};
const glucCat=(g,t)=>{const v=parseInt(g);if(!v)return{l:"—",c:"#94a3b8"};if(t==="en ayunas"){if(v>126)return{l:"Alta",c:"#dc2626"};if(v>100)return{l:"Elevada",c:"#d97706"};return{l:"Normal",c:"#16a34a"};}if(v>200)return{l:"Alta",c:"#dc2626"};if(v>140)return{l:"Elevada",c:"#d97706"};return{l:"Normal",c:"#16a34a"};};
const parseFecha=(f)=>{if(!f)return null;const p=f.split("/");if(p.length!==3)return null;return new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));};
const daysBetween=(d1,d2)=>Math.floor((d2-d1)/(1000*60*60*24));
const todayStr=()=>{const d=new Date();return`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;};
const futureStr=(months)=>{const d=new Date();d.setMonth(d.getMonth()+months);return`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;};

// ─── Styles ───
const C={pri:"#1a3a5c",priL:"#2a5a8c",acc:"#0ea5e9",grn:"#16a34a",red:"#dc2626",amb:"#d97706",purp:"#7c3aed",bg:"#f0f2f5",card:"#fff",bor:"#e2e8f0",txt:"#1e293b",txt2:"#64748b"};
const sLbl={display:"block",fontSize:11,fontWeight:600,color:C.txt2,marginBottom:3,textTransform:"uppercase",letterSpacing:.4};
const sInp={width:"100%",padding:"7px 10px",border:`1px solid ${C.bor}`,borderRadius:6,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"};
const sRow={display:"flex",gap:10,flexWrap:"wrap",marginBottom:8};
const sBtnP={padding:"9px 20px",background:C.pri,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"};
const sBtnS={padding:"9px 20px",background:"#f1f5f9",color:"#334155",border:`1px solid ${C.bor}`,borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"};
const sBtnSm={background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"3px 5px"};

// ─── Small Components ───
const Field=({label,value,onChange,type,opts,w,rows})=>(
  <div style={{flex:w||"1 1 180px",minWidth:120}}>
    <label style={sLbl}>{label}</label>
    {opts?<select style={sInp} value={value||""} onChange={e=>onChange(e.target.value)}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
    :rows?<textarea style={{...sInp,height:rows*22,resize:"vertical"}} value={value||""} onChange={e=>onChange(e.target.value)}/>
    :<input style={sInp} type={type||"text"} value={value||""} onChange={e=>onChange(e.target.value)}/>}
  </div>
);
const Badge=({ok,text})=><span style={{display:"inline-block",padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:600,background:ok?"#dcfce7":"#fee2e2",color:ok?C.grn:C.red}}>{text}</span>;
const Stat=({label,value,color,icon})=><div style={{flex:"1 1 130px",background:C.card,borderRadius:10,padding:"14px 18px",boxShadow:"0 1px 3px rgba(0,0,0,.06)",borderLeft:`4px solid ${color}`}}><div style={{fontSize:10,color:C.txt2,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{icon} {label}</div><div style={{fontSize:26,fontWeight:700,color}}>{value}</div></div>;
const SH=({children})=><div style={{fontWeight:700,fontSize:12,color:C.pri,borderBottom:`2px solid ${C.bor}`,padding:"8px 0 4px",margin:"14px 0 8px",textTransform:"uppercase",letterSpacing:.8}}>{children}</div>;

function Header({user,onLogout,onNav,nav}){
  return <div className="no-print" style={{background:`linear-gradient(135deg,${C.pri},${C.priL})`,color:"#fff",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
    <div><div style={{fontSize:17,fontWeight:700}}>🩺 Sistema Médico — IL Group</div><div style={{fontSize:11,opacity:.7}}>FR-SIG-RH-039 · Transportes de Fruta S.A.</div></div>
    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
      {["dashboard","pacientes"].map(n=><button key={n} onClick={()=>onNav(n)} style={{background:nav===n?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:6,padding:"5px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:nav===n?700:400,textTransform:"capitalize"}}>{n==="dashboard"?"📊 Dashboard":"👥 Pacientes"}</button>)}
      <span style={{fontSize:12,marginLeft:8}}>👤 {user}</span>
      <button onClick={onLogout} style={{background:"rgba(255,255,255,.12)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Salir</button>
    </div>
  </div>;
}

function MiniChart({data,dataKey,color,label,unit}){
  if(!data||data.length<2)return<div style={{color:C.txt2,fontSize:12,padding:16,textAlign:"center"}}>Se necesitan 2+ visitas para gráfica</div>;
  return<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:600,color:C.txt2,marginBottom:4}}>{label}</div>
    <ResponsiveContainer width="100%" height={120}><LineChart data={data}><XAxis dataKey="fecha" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} width={40}/><Tooltip formatter={v=>`${v} ${unit||""}`}/><Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer>
  </div>;
}

// ─── Print Format FR-SIG-RH-039 ───
function PrintDoc({p,v}){
  const imc=calcIMC(v.peso,p.talla);const ic=imcCat(imc);const fp=(v.fecha||"").split("/");
  const bc={border:"1px solid #333",padding:"4px 6px",verticalAlign:"middle"};
  const ml={...bc,fontWeight:"bold",background:"#f0f0f0",width:110,fontSize:10};
  const mv={...bc,fontSize:11};
  return<div style={{fontFamily:"Arial,sans-serif",fontSize:11,color:"#000",maxWidth:720,margin:"0 auto 20px",pageBreakAfter:"always"}}>
    <div style={{float:"right",fontFamily:"monospace",fontSize:9,background:"#eee",padding:"2px 6px",border:"1px solid #ccc"}}>N° {p.id}</div>
    <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
      <tr><td rowSpan={3} style={{...bc,width:90,textAlign:"center"}}>🏢</td><td rowSpan={2} style={{...bc,textAlign:"center",fontSize:10}}>Sistema Integrado de Gestión en Calidad,<br/>Control y Seguridad de la cadena de suministros</td><td style={{...bc,width:65,fontSize:9,textAlign:"center"}}>Código</td><td style={{...bc,width:90,fontSize:9,textAlign:"center"}}><strong>FR-SIG-RH-039</strong></td></tr>
      <tr><td style={{...bc,fontSize:9,textAlign:"center"}}>Versión</td><td style={{...bc,fontSize:9,textAlign:"center"}}>01</td></tr>
      <tr><td style={{...bc,textAlign:"center",fontWeight:"bold",fontSize:11}}>PRUEBA MÉDICA / EXAMEN FÍSICO</td><td style={{...bc,fontSize:9,textAlign:"center"}}>Páginas</td><td style={{...bc,fontSize:9,textAlign:"center"}}>1 de 2</td></tr>
    </tbody></table>
    <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
      <tr><td style={ml}>Fecha:</td><td style={mv} colSpan={2}>{fp.join("/")}</td><td style={ml}>Edad</td><td style={mv}>{p.edad}</td></tr>
      <tr><td style={ml}>Nombre:</td><td style={mv} colSpan={2}>{p.nombre}</td><td style={ml}>Sexo</td><td style={mv}>{p.sexo==="M"?"Masculino":"Femenino"}</td></tr>
      <tr><td style={ml}>Puesto:</td><td style={mv} colSpan={2}>{p.puesto}</td><td style={ml}>Residencia</td><td style={mv}>{p.residencia}</td></tr>
      <tr><td style={ml}>Teléfono:</td><td style={mv} colSpan={2}>{p.telefono}</td><td style={ml}>Tipo Sangre</td><td style={mv}>{p.tipo_sangre}</td></tr>
      <tr><td colSpan={5} style={{...bc,background:C.pri,color:"#fff",fontWeight:"bold",textAlign:"center",padding:5}}>EXAMEN FÍSICO</td></tr>
      <tr><td style={ml}>Peso</td><td style={mv}>{v.peso} lb</td><td style={{...bc,width:60}}></td><td style={ml}>Talla</td><td style={mv}>{p.talla} m</td></tr>
      <tr><td style={ml}>IMC</td><td style={mv}><strong>{imc}</strong> ({ic.label})</td><td></td><td style={ml}>FR</td><td style={mv}>{v.fr}</td></tr>
      <tr><td style={ml}>P/A</td><td style={mv}>{v.presion_s}/{v.presion_d}</td><td></td><td style={ml}>Temperatura</td><td style={mv}>{v.temp} °C</td></tr>
      <tr><td style={ml}>Pulso</td><td style={mv}>{v.pulso}</td><td></td><td style={ml}>Oxígeno</td><td style={mv}>{v.oxigeno}%</td></tr>
      <tr><td style={ml}>Garganta</td><td style={mv} colSpan={2}>{v.garganta}</td><td style={ml}>Ritmo</td><td style={mv}>{v.ritmo}</td></tr>
      <tr><td style={ml}>Visión</td><td style={mv} colSpan={4}>{v.vision}</td></tr>
      <tr><td style={ml}>Auditiva</td><td style={mv} colSpan={4}>{v.auditiva}</td></tr>
      <tr><td style={ml}>Glucosa</td><td style={mv} colSpan={4}>{v.glucosa} {v.glucosa_tipo}</td></tr>
      <tr><td style={ml}>Pulmones</td><td style={mv} colSpan={4}>{v.pulmones}</td></tr>
      <tr><td style={ml}>Abdomen</td><td style={mv} colSpan={4}>{v.abdomen}</td></tr>
      <tr><td style={ml}>Extremidades</td><td style={mv} colSpan={4}>{v.extremidades}</td></tr>
      <tr><td style={ml}>Vértigo</td><td style={mv} colSpan={4}>{v.vertigo}</td></tr>
      <tr><td style={ml}>Convulsiones</td><td style={mv} colSpan={4}>{v.convulsiones}</td></tr>
      <tr><td colSpan={5} style={{...bc,background:C.pri,color:"#fff",fontWeight:"bold",textAlign:"center",padding:5}}>DATOS DEL PACIENTE</td></tr>
      <tr><td style={ml}>Alergias</td><td style={mv} colSpan={4}>{p.alergias||"Ninguna"}</td></tr>
      <tr><td style={ml}>Condiciones</td><td style={mv} colSpan={4}>{p.condiciones_cronicas||"Ninguna"}</td></tr>
      <tr><td style={ml}>Info General</td><td style={mv} colSpan={4}>{v.info_general}</td></tr>
      <tr><td style={ml}>Diagnóstico</td><td style={mv} colSpan={4}>{v.fuma==="Sí"?"SI fuma":"No fuma"} — Drogas: {v.drogas}{p.condiciones_cronicas?` — ${p.condiciones_cronicas}`:""}</td></tr>
      <tr><td style={ml}>Recomendaciones</td><td style={mv} colSpan={4}>{v.recomendaciones}</td></tr>
      <tr><td style={ml}>Observaciones</td><td style={mv} colSpan={4}>{v.observaciones}</td></tr>
      <tr><td style={ml}>Aptitud</td><td style={mv} colSpan={4}><strong>{p.aptitud}</strong> — Vence: {p.aptitud_vence||"—"}</td></tr>
    </tbody></table>
    <div style={{textAlign:"center",margin:"20px 0 8px"}}><div style={{borderTop:"1px solid #000",width:200,margin:"0 auto",paddingTop:4}}></div><div style={{fontWeight:"bold"}}>{v.responsable}</div><div style={{fontSize:9,color:"#555"}}>Responsable de Evaluación Médica</div></div>
    <div style={{textAlign:"right",fontSize:8,color:"#999",marginTop:3}}>Ingresado por: {v.ingresado_por} | COVID: {v.covid_pts} pts</div>
  </div>;
}

// ─── MAIN APP ───
export default function App(){
  const[auth,setAuth]=useState(false);
  const[user,setUser]=useState("");
  const[pts,setPts]=useState([]); // patients with visitas embedded
  const[nav,setNav]=useState("dashboard");
  const[selId,setSelId]=useState(null);
  const[form,setForm]=useState(null);
  const[search,setSearch]=useState("");
  const[printData,setPrintData]=useState(null);
  const[loginU,setLoginU]=useState("");
  const[loginP,setLoginP]=useState("");
  const[loginErr,setLoginErr]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);

  // ─ Load data from Supabase ─
  const loadData=useCallback(async()=>{
    setLoading(true);
    try{
      const[pacs,viss]=await Promise.all([fetchPacientes(),fetchAllVisitas()]);
      const merged=pacs.map(p=>({...p,visitas:viss.filter(v=>v.paciente_id===p.id)}));
      setPts(merged);
    }catch(e){console.error("Error cargando datos:",e);}
    setLoading(false);
  },[]);

  useEffect(()=>{if(auth)loadData();},[auth,loadData]);

  const doLogin=async()=>{
    const u=await login(loginU,loginP);
    if(u){setUser(u.nombre);setAuth(true);setLoginErr("");}
    else setLoginErr("Credenciales incorrectas");
  };

  const lastVisit=(p)=>p.visitas&&p.visitas.length?p.visitas[p.visitas.length-1]:null;
  const selPat=useMemo(()=>pts.find(p=>p.id===selId),[pts,selId]);

  // ─ Save new patient ─
  const savePat=async(data)=>{
    setSaving(true);
    try{
      if(form==="editPat"){
        await updatePaciente(selId,data);
      }else{
        const seq=await getNextId("paciente_seq");
        const nid=`PM-${new Date().getFullYear()}-${String(seq).padStart(4,"0")}`;
        await insertPaciente({...data,id:nid,ingresado_por:user});
      }
      await loadData();
      setForm(null);
    }catch(e){console.error(e);alert("Error al guardar");}
    setSaving(false);
  };

  // ─ Save new visit ─
  const saveVisit=async(vdata)=>{
    setSaving(true);
    try{
      const seq=await getNextId("visita_seq");
      const nvid=`V${String(seq).padStart(4,"0")}`;
      await insertVisita({...vdata,vid:nvid,paciente_id:selId,ingresado_por:user});
      await loadData();
      setForm(null);
    }catch(e){console.error(e);alert("Error al guardar visita");}
    setSaving(false);
  };

  const handleDelete=async(id)=>{
    if(!confirm("¿Eliminar este paciente y todo su historial?"))return;
    await dbDeletePat(id);
    if(selId===id)setSelId(null);
    await loadData();
  };

  // ─ Stats ─
  const stats=useMemo(()=>{
    const t=pts.length;if(!t)return{};
    const m=pts.filter(p=>p.sexo==="M").length;
    const ages=pts.map(p=>parseInt(p.edad)||0).filter(Boolean);
    const avgAge=ages.length?Math.round(ages.reduce((a,b)=>a+b,0)/ages.length):0;
    const smokers=pts.filter(p=>{const lv=lastVisit(p);return lv?.fuma==="Sí";}).length;
    const hipert=pts.filter(p=>(p.condiciones_cronicas||"").toLowerCase().includes("hiperten")).length;
    const diab=pts.filter(p=>(p.condiciones_cronicas||"").toLowerCase().includes("diab")).length;
    const aptos=pts.filter(p=>p.aptitud==="Apto").length;
    const today=new Date();
    const overdue=pts.filter(p=>{const lv=lastVisit(p);if(!lv)return true;const d=parseFecha(lv.fecha);if(!d)return true;const hasCond=!!(p.condiciones_cronicas&&p.condiciones_cronicas.trim());return daysBetween(d,today)>(hasCond?60:90);});
    const expApt=pts.filter(p=>{const d=parseFecha(p.aptitud_vence);return d&&d<today;});
    const soonApt=pts.filter(p=>{const d=parseFecha(p.aptitud_vence);return d&&d>=today&&daysBetween(today,d)<=30;});
    const obese=pts.filter(p=>{const lv=lastVisit(p);if(!lv)return false;const i=calcIMC(lv.peso,p.talla);return parseFloat(i)>=30;}).length;
    return{t,m,f:t-m,avgAge,smokers,hipert,diab,aptos,noApto:t-aptos,overdue,expApt,soonApt,obese};
  },[pts]);

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    return pts.filter(p=>!q||p.nombre.toLowerCase().includes(q)||p.id.toLowerCase().includes(q)||(p.telefono||"").includes(q)||(p.condiciones_cronicas||"").toLowerCase().includes(q));
  },[pts,search]);

  // ═══ LOGIN ═══
  if(!auth)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${C.pri},${C.priL})`}}>
      <div style={{background:"#fff",borderRadius:16,padding:36,width:360,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:36,marginBottom:6}}>🩺</div><h1 style={{fontSize:19,color:C.pri,margin:0}}>Sistema Médico</h1><p style={{color:C.txt2,fontSize:12,margin:"4px 0 0"}}>IL Group — Control de Salud Ocupacional</p></div>
        {loginErr&&<div style={{background:"#fee2e2",color:C.red,padding:"6px 10px",borderRadius:8,fontSize:12,marginBottom:10}}>{loginErr}</div>}
        <div style={{marginBottom:12}}><label style={sLbl}>Usuario</label><input style={sInp} value={loginU} onChange={e=>setLoginU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/></div>
        <div style={{marginBottom:18}}><label style={sLbl}>Contraseña</label><input style={sInp} type="password" value={loginP} onChange={e=>setLoginP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/></div>
        <button onClick={doLogin} style={{...sBtnP,width:"100%",padding:11,fontSize:14}}>Ingresar</button>
      </div>
    </div>
  );

  if(loading)return<div style={{padding:40,textAlign:"center",fontSize:16}}>⏳ Cargando datos de Supabase...</div>;

  // ═══ PRINT ═══
  if(printData){
    return<div style={{fontFamily:"Arial,sans-serif"}}>
      <div className="no-print" style={{position:"fixed",top:0,left:0,right:0,background:C.pri,padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:999}}>
        <span style={{color:"#fff",fontSize:13}}>Vista de impresión</span>
        <div style={{display:"flex",gap:8}}><button onClick={()=>window.print()} style={{...sBtnP,background:C.acc}}>🖨️ Imprimir</button><button onClick={()=>setPrintData(null)} style={sBtnS}>← Volver</button></div>
      </div>
      <div style={{paddingTop:50}}><PrintDoc p={printData.p} v={printData.v}/></div>
    </div>;
  }

  // ═══ PATIENT DETAIL ═══
  if(selId&&selPat){
    const p=selPat;const lv=lastVisit(p);
    const imc=lv?calcIMC(lv.peso,p.talla):null;const ic=imcCat(imc);
    const bp=lv?bpCat(lv.presion_s,lv.presion_d):{l:"—",c:"#94a3b8"};
    const gc=lv?glucCat(lv.glucosa,lv.glucosa_tipo):{l:"—",c:"#94a3b8"};
    const chartData=(p.visitas||[]).map(v=>({fecha:v.fecha,peso:parseFloat(v.peso)||0,pas:parseInt(v.presion_s)||0,pad:parseInt(v.presion_d)||0,glucosa:parseInt(v.glucosa)||0,imc:parseFloat(calcIMC(v.peso,p.talla))||0}));
    const aptDate=parseFecha(p.aptitud_vence);const daysLeft=aptDate?daysBetween(new Date(),aptDate):null;

    // Visit Form
    if(form==="newVisit"){
      return<VisitForm p={p} user={user} nav={nav} saving={saving} onSave={saveVisit} onCancel={()=>setForm(null)} onLogout={()=>setAuth(false)} onNav={setNav}/>;
    }
    // Edit Patient Form
    if(form==="editPat"){
      return<PatientForm p={p} user={user} nav={nav} saving={saving} onSave={savePat} onCancel={()=>setForm(null)} onLogout={()=>setAuth(false)} onNav={setNav} isEdit/>;
    }

    return<div style={{background:C.bg,minHeight:"100vh"}}><Header user={user} onLogout={()=>setAuth(false)} onNav={setNav} nav={nav}/>
      <div style={{maxWidth:920,margin:"0 auto",padding:16}}>
        <button onClick={()=>{setSelId(null);setNav("pacientes");}} style={{...sBtnS,marginBottom:12}}>← Lista de Pacientes</button>
        {/* Summary */}
        <div style={{background:C.card,borderRadius:12,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,.06)",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:10,color:C.txt2,fontFamily:"monospace"}}>{p.id}</div>
              <h2 style={{margin:"2px 0 4px",fontSize:20,color:C.pri}}>{p.nombre}</h2>
              <div style={{fontSize:13,color:C.txt2}}>{p.puesto} · {p.sexo==="M"?"Masculino":"Femenino"} · {p.edad} años</div>
              <div style={{fontSize:12,color:C.txt2,marginTop:2}}>📞 {p.telefono} · 📍 {p.residencia}</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{padding:"4px 12px",borderRadius:16,fontSize:12,fontWeight:600,background:p.aptitud==="Apto"?"#dcfce7":p.aptitud==="No Apto"?"#fee2e2":"#fef3c7",color:p.aptitud==="Apto"?C.grn:p.aptitud==="No Apto"?C.red:C.amb}}>{p.aptitud}</span>
              {daysLeft!==null&&<span style={{padding:"4px 12px",borderRadius:16,fontSize:12,fontWeight:600,background:daysLeft<0?"#fee2e2":daysLeft<30?"#fef3c7":"#f0f9ff",color:daysLeft<0?C.red:daysLeft<30?C.amb:C.acc}}>{daysLeft<0?`Vencido ${-daysLeft}d`:`Vence ${daysLeft}d`}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
            <button onClick={()=>setForm("editPat")} style={sBtnS}>✏️ Editar Ficha</button>
            <button onClick={()=>setForm("newVisit")} style={sBtnP}>+ Nueva Visita</button>
            {lv&&<button onClick={()=>setPrintData({p,v:lv})} style={sBtnS}>🖨️ Imprimir Última</button>}
          </div>
        </div>
        {/* Ficha */}
        {(p.alergias||p.medicamentos||p.condiciones_cronicas)&&<div style={{background:C.card,borderRadius:12,padding:16,marginBottom:16,boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
          <SH>📋 Ficha Médica</SH>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13}}>
            <div><strong style={{color:C.txt2}}>Alergias:</strong> {p.alergias||"Ninguna"}</div>
            <div><strong style={{color:C.txt2}}>Medicamentos:</strong> {p.medicamentos||"Ninguno"}</div>
            <div><strong style={{color:C.txt2}}>Cirugías:</strong> {p.cirugias||"Ninguna"}</div>
            <div><strong style={{color:C.txt2}}>Condiciones:</strong> <span style={{color:p.condiciones_cronicas?C.red:C.grn,fontWeight:600}}>{p.condiciones_cronicas||"Ninguna"}</span></div>
          </div>
        </div>}
        {/* Semáforo */}
        {lv&&<div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          {[{lbl:"P/A",val:`${lv.presion_s}/${lv.presion_d}`,sub:bp.l,col:bp.c},{lbl:"Glucosa",val:lv.glucosa,sub:gc.l,col:gc.c},{lbl:"IMC",val:imc||"—",sub:ic.label,col:ic.color},{lbl:"Drogas",val:lv.drogas==="Negativo"?"✓":"✗",sub:lv.drogas,col:lv.drogas==="Negativo"?C.grn:C.red},{lbl:"Fuma",val:lv.fuma==="No"?"🚭":"🚬",sub:lv.fuma,col:lv.fuma==="No"?C.grn:C.amb}].map(x=><div key={x.lbl} style={{flex:"1 1 100px",background:C.card,borderRadius:10,padding:14,textAlign:"center",borderBottom:`4px solid ${x.col}`}}><div style={{fontSize:10,color:C.txt2}}>{x.lbl}</div><div style={{fontSize:22,fontWeight:700,color:x.col}}>{x.val}</div><div style={{fontSize:11,fontWeight:600,color:x.col}}>{x.sub}</div></div>)}
        </div>}
        {/* Charts */}
        <div style={{background:C.card,borderRadius:12,padding:16,marginBottom:16}}><SH>📈 Tendencias</SH>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MiniChart data={chartData} dataKey="peso" color={C.acc} label="Peso (lb)" unit="lb"/>
            <MiniChart data={chartData} dataKey="imc" color={C.purp} label="IMC"/>
            <MiniChart data={chartData} dataKey="pas" color={C.red} label="Presión Sistólica" unit="mmHg"/>
            <MiniChart data={chartData} dataKey="glucosa" color={C.amb} label="Glucosa" unit="mg/dL"/>
          </div>
        </div>
        {/* Visits Table */}
        <div style={{background:C.card,borderRadius:12,padding:16}}><SH>🗓️ Visitas ({(p.visitas||[]).length})</SH>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc",borderBottom:`2px solid ${C.bor}`}}>
              {["Fecha","Peso","IMC","P/A","Glucosa","Drogas","Fuma","Responsable",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:600,color:C.txt2,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>{(p.visitas||[]).slice().reverse().map(v=>{
              const vi=calcIMC(v.peso,p.talla);const vic=imcCat(vi);const vbp=bpCat(v.presion_s,v.presion_d);const vgc=glucCat(v.glucosa,v.glucosa_tipo);
              return<tr key={v.vid} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"8px 10px",fontWeight:600}}>{v.fecha}</td><td style={{padding:"8px 10px"}}>{v.peso} lb</td>
                <td style={{padding:"8px 10px"}}><span style={{color:vic.color,fontWeight:600}}>{vi}</span></td>
                <td style={{padding:"8px 10px"}}><span style={{color:vbp.c,fontWeight:600}}>{v.presion_s}/{v.presion_d}</span></td>
                <td style={{padding:"8px 10px"}}><span style={{color:vgc.c,fontWeight:600}}>{v.glucosa}</span></td>
                <td style={{padding:"8px 10px"}}><Badge ok={v.drogas==="Negativo"} text={v.drogas}/></td>
                <td style={{padding:"8px 10px"}}>{v.fuma==="Sí"?"🚬":"🚭"}</td>
                <td style={{padding:"8px 10px",color:C.txt2}}>{v.responsable}</td>
                <td style={{padding:"8px 10px"}}><button onClick={()=>setPrintData({p,v})} style={sBtnSm}>🖨️</button></td>
              </tr>;})}
              {(!p.visitas||!p.visitas.length)&&<tr><td colSpan={9} style={{padding:24,textAlign:"center",color:C.txt2}}>Sin visitas</td></tr>}
            </tbody></table></div>
        </div>
      </div>
    </div>;
  }

  // ═══ NEW PATIENT ═══
  if(form==="newPat"){
    return<PatientForm user={user} nav={nav} saving={saving} onSave={savePat} onCancel={()=>setForm(null)} onLogout={()=>setAuth(false)} onNav={setNav}/>;
  }

  // ═══ DASHBOARD ═══
  if(nav==="dashboard"){
    const pieG=[{name:"Hombres",value:stats.m||0,color:C.acc},{name:"Mujeres",value:stats.f||0,color:"#ec4899"}];
    const barH=[{name:"Fumadores",v:stats.smokers||0,c:C.amb},{name:"Hipertensos",v:stats.hipert||0,c:C.red},{name:"Diabéticos",v:stats.diab||0,c:C.purp},{name:"Obesidad",v:stats.obese||0,c:"#f97316"}];
    return<div style={{background:C.bg,minHeight:"100vh"}}><Header user={user} onLogout={()=>setAuth(false)} onNav={setNav} nav={nav}/>
      <div style={{maxWidth:1100,margin:"0 auto",padding:16}}>
        <h2 style={{fontSize:18,color:C.pri,margin:"0 0 14px"}}>📊 Dashboard de Salud Ocupacional</h2>
        <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <Stat label="Total" value={stats.t||0} color={C.pri} icon="👥"/><Stat label="Edad Prom." value={`${stats.avgAge||0}`} color={C.acc} icon="📅"/>
          <Stat label="Aptos" value={stats.aptos||0} color={C.grn} icon="✅"/><Stat label="No Aptos" value={stats.noApto||0} color={C.red} icon="⚠️"/>
          <Stat label="Fumadores" value={stats.smokers||0} color={C.amb} icon="🚬"/><Stat label="Hipertensos" value={stats.hipert||0} color={C.red} icon="🫀"/>
          <Stat label="Diabéticos" value={stats.diab||0} color={C.purp} icon="🩸"/><Stat label="Obesidad" value={stats.obese||0} color="#f97316" icon="⚖️"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div style={{background:C.card,borderRadius:12,padding:16}}><div style={{fontSize:13,fontWeight:700,color:C.pri,marginBottom:8}}>Distribución por Sexo</div>
            <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={pieG} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value})=>`${name}: ${value}`}>{pieG.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Legend/></PieChart></ResponsiveContainer></div>
          <div style={{background:C.card,borderRadius:12,padding:16}}><div style={{fontSize:13,fontWeight:700,color:C.pri,marginBottom:8}}>Condiciones de Salud</div>
            <ResponsiveContainer width="100%" height={180}><BarChart data={barH}><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} allowDecimals={false}/><Tooltip/><Bar dataKey="v" name="Pacientes">{barH.map((e,i)=><Cell key={i} fill={e.c}/>)}</Bar></BarChart></ResponsiveContainer></div>
        </div>
        {/* Alerts */}
        {((stats.overdue||[]).length>0||(stats.expApt||[]).length>0)&&<div style={{background:C.card,borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:10}}>🚨 Alertas</div>
          {(stats.expApt||[]).map(p=><AlertRow key={p.id} p={p} type="exp" onClick={()=>{setSelId(p.id);setNav("pacientes");}}/>)}
          {(stats.soonApt||[]).map(p=><AlertRow key={p.id} p={p} type="soon" onClick={()=>{setSelId(p.id);setNav("pacientes");}}/>)}
          {(stats.overdue||[]).map(p=><AlertRow key={p.id} p={p} type="overdue" onClick={()=>{setSelId(p.id);setNav("pacientes");}}/>)}
        </div>}
      </div>
    </div>;
  }

  // ═══ PATIENT LIST ═══
  return<div style={{background:C.bg,minHeight:"100vh"}}><Header user={user} onLogout={()=>setAuth(false)} onNav={setNav} nav={nav}/>
    <div style={{maxWidth:1100,margin:"0 auto",padding:16}}>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...sInp,flex:"1 1 250px",maxWidth:400}} placeholder="Buscar nombre, ID, teléfono, condición..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <button onClick={()=>setForm("newPat")} style={sBtnP}>+ Nuevo Paciente</button>
        <div style={{fontSize:12,color:C.txt2,marginLeft:"auto"}}>{filtered.length} de {pts.length}</div>
      </div>
      <div style={{background:C.card,borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.06)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#f8fafc",borderBottom:`2px solid ${C.bor}`}}>
            {["ID","Nombre","Sexo","Edad","Última Visita","IMC","P/A","Drogas","Aptitud","Condiciones",""].map(h=><th key={h} style={{padding:"9px 10px",textAlign:"left",fontWeight:600,color:C.txt2,fontSize:10,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.length===0&&<tr><td colSpan={11} style={{padding:32,textAlign:"center",color:C.txt2}}>Sin resultados</td></tr>}
            {filtered.map(p=>{
              const lv=lastVisit(p);const imc=lv?calcIMC(lv.peso,p.talla):null;const ic=imcCat(imc);const bp=lv?bpCat(lv.presion_s,lv.presion_d):{l:"—",c:"#94a3b8"};
              const lvDate=lv?parseFecha(lv.fecha):null;const hasCond=!!(p.condiciones_cronicas&&p.condiciones_cronicas.trim());
              const overdue=lvDate&&daysBetween(lvDate,new Date())>(hasCond?60:90);
              return<tr key={p.id} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer"}} onClick={()=>{setSelId(p.id);setNav("pacientes");}}>
                <td style={{padding:"9px 10px"}}><span style={{fontFamily:"monospace",fontSize:11,background:"#f1f5f9",padding:"2px 5px",borderRadius:4}}>{p.id}</span></td>
                <td style={{padding:"9px 10px",fontWeight:600}}>{p.nombre}</td>
                <td style={{padding:"9px 10px"}}>{p.sexo}</td>
                <td style={{padding:"9px 10px"}}>{p.edad}</td>
                <td style={{padding:"9px 10px"}}>{lv?<span style={{color:overdue?C.red:C.txt}}>{lv.fecha}{overdue?" ⚠️":""}</span>:<span style={{color:C.red}}>—</span>}</td>
                <td style={{padding:"9px 10px"}}>{imc?<span style={{color:ic.color,fontWeight:600}}>{imc}</span>:"—"}</td>
                <td style={{padding:"9px 10px"}}>{lv?<span style={{color:bp.c,fontWeight:600}}>{lv.presion_s}/{lv.presion_d}</span>:"—"}</td>
                <td style={{padding:"9px 10px"}}>{lv?<Badge ok={lv.drogas==="Negativo"} text={lv.drogas}/>:"—"}</td>
                <td style={{padding:"9px 10px"}}><span style={{fontSize:11,fontWeight:600,color:p.aptitud==="Apto"?C.grn:p.aptitud==="No Apto"?C.red:C.amb}}>{p.aptitud}</span></td>
                <td style={{padding:"9px 10px",fontSize:11,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:hasCond?C.red:C.txt2}}>{p.condiciones_cronicas||"—"}</td>
                <td style={{padding:"9px 10px"}} onClick={e=>e.stopPropagation()}><button onClick={()=>handleDelete(p.id)} style={sBtnSm}>🗑️</button></td>
              </tr>;})}
          </tbody></table></div>
      </div>
    </div>
  </div>;
}

// ─── Alert Row ───
function AlertRow({p,type,onClick}){
  const bg=type==="exp"?"#fee2e2":type==="soon"?"#fef3c7":"#fff7ed";
  const icon=type==="exp"?"❌":type==="soon"?"⚠️":"🔔";
  const msg=type==="exp"?`Aptitud VENCIDA (${p.aptitud_vence})`:type==="soon"?`Aptitud vence pronto (${p.aptitud_vence})`:`Sin visita reciente${p.condiciones_cronicas?` — ${p.condiciones_cronicas}`:""}`;
  return<div style={{padding:"8px 12px",background:bg,borderRadius:8,marginBottom:6,fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span>{icon} <strong>{p.nombre}</strong> — {msg}</span>
    <button onClick={onClick} style={{...sBtnSm,fontSize:12,color:C.acc}}>Ver →</button>
  </div>;
}

// ─── Patient Form ───
function PatientForm({p,user,nav,saving,onSave,onCancel,onLogout,onNav,isEdit}){
  const[f,setF]=useState(isEdit?{nombre:p.nombre,sexo:p.sexo,edad:p.edad,residencia:p.residencia,telefono:p.telefono,puesto:p.puesto,talla:p.talla,tipo_sangre:p.tipo_sangre,alergias:p.alergias||"",medicamentos:p.medicamentos||"",cirugias:p.cirugias||"",condiciones_cronicas:p.condiciones_cronicas||"",aptitud:p.aptitud,aptitud_vence:p.aptitud_vence}
    :{nombre:"",sexo:"M",edad:"",residencia:"",telefono:"",puesto:"Piloto Profesional",talla:"",tipo_sangre:"No refiere",alergias:"",medicamentos:"",cirugias:"",condiciones_cronicas:"",aptitud:"Apto",aptitud_vence:futureStr(6)});
  const u=(k,v)=>setF(pr=>({...pr,[k]:v}));
  return<div><Header user={user} onLogout={onLogout} onNav={onNav} nav={nav}/>
    <div style={{maxWidth:860,margin:"0 auto",padding:16}}>
      <button onClick={onCancel} style={{...sBtnS,marginBottom:12}}>← Volver</button>
      <div style={{background:"#fff",borderRadius:12,padding:20}}>
        <h3 style={{margin:"0 0 16px",color:C.pri}}>{isEdit?"Editar Ficha":"Nuevo Paciente"}</h3>
        <SH>Datos Personales</SH>
        <div style={sRow}><Field label="Nombre" value={f.nombre} onChange={v=>u("nombre",v)} w="1 1 280px"/><Field label="Sexo" value={f.sexo} onChange={v=>u("sexo",v)} opts={["M","F"]}/><Field label="Edad" value={f.edad} onChange={v=>u("edad",v)} type="number"/><Field label="Puesto" value={f.puesto} onChange={v=>u("puesto",v)}/></div>
        <div style={sRow}><Field label="Teléfono" value={f.telefono} onChange={v=>u("telefono",v)}/><Field label="Residencia" value={f.residencia} onChange={v=>u("residencia",v)} w="1 1 280px"/><Field label="Talla (m)" value={f.talla} onChange={v=>u("talla",v)}/><Field label="Tipo Sangre" value={f.tipo_sangre} onChange={v=>u("tipo_sangre",v)} opts={["No refiere","A+","A-","B+","B-","AB+","AB-","O+","O-"]}/></div>
        <SH>Historial Médico</SH>
        <div style={sRow}><Field label="Alergias" value={f.alergias} onChange={v=>u("alergias",v)} w="1 1 100%" rows={2}/></div>
        <div style={sRow}><Field label="Medicamentos" value={f.medicamentos} onChange={v=>u("medicamentos",v)} w="1 1 48%"/><Field label="Cirugías" value={f.cirugias} onChange={v=>u("cirugias",v)} w="1 1 48%"/></div>
        <div style={sRow}><Field label="Condiciones Crónicas" value={f.condiciones_cronicas} onChange={v=>u("condiciones_cronicas",v)} w="1 1 100%"/></div>
        <SH>Aptitud</SH>
        <div style={sRow}><Field label="Estado" value={f.aptitud} onChange={v=>u("aptitud",v)} opts={["Apto","No Apto","Condicionado"]}/><Field label="Vencimiento (DD/MM/AAAA)" value={f.aptitud_vence} onChange={v=>u("aptitud_vence",v)}/></div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}><button onClick={onCancel} style={sBtnS}>Cancelar</button><button onClick={()=>onSave(f)} disabled={saving} style={{...sBtnP,opacity:saving?.5:1}}>{saving?"Guardando...":isEdit?"Guardar":"Registrar"}</button></div>
      </div>
    </div>
  </div>;
}

// ─── Visit Form ───
function VisitForm({p,user,nav,saving,onSave,onCancel,onLogout,onNav}){
  const[f,setF]=useState({fecha:todayStr(),peso:"",presion_s:"",presion_d:"",fr:"20",pulso:"",temp:"36.5",oxigeno:"",ritmo:"",glucosa:"",glucosa_tipo:"postprandial",garganta:"Saludable",vision:"Saludable",auditiva:"Saludable",pulmones:"Normal",abdomen:"Flexible",extremidades:"Simétricas",vertigo:"Saludable",convulsiones:"Saludable",fuma:"No",drogas:"Negativo",info_general:"",recomendaciones:"Uso de EPP.",observaciones:"",covid_pts:"0",responsable:user});
  const u=(k,v)=>setF(pr=>({...pr,[k]:v}));
  return<div><Header user={user} onLogout={onLogout} onNav={onNav} nav={nav}/>
    <div style={{maxWidth:860,margin:"0 auto",padding:16}}>
      <button onClick={onCancel} style={{...sBtnS,marginBottom:12}}>← Volver a {p.nombre}</button>
      <div style={{background:"#fff",borderRadius:12,padding:20}}>
        <h3 style={{margin:"0 0 16px",color:C.pri}}>Nueva Visita — {p.nombre} ({p.id})</h3>
        <SH>Signos Vitales</SH>
        <div style={sRow}><Field label="Fecha" value={f.fecha} onChange={v=>u("fecha",v)}/><Field label="Peso (lb)" value={f.peso} onChange={v=>u("peso",v)} type="number"/><Field label="P/A Sist." value={f.presion_s} onChange={v=>u("presion_s",v)} type="number"/><Field label="P/A Diast." value={f.presion_d} onChange={v=>u("presion_d",v)} type="number"/></div>
        <div style={sRow}><Field label="Pulso" value={f.pulso} onChange={v=>u("pulso",v)} type="number"/><Field label="FR" value={f.fr} onChange={v=>u("fr",v)}/><Field label="Temp °C" value={f.temp} onChange={v=>u("temp",v)}/><Field label="O₂ %" value={f.oxigeno} onChange={v=>u("oxigeno",v)} type="number"/><Field label="Ritmo" value={f.ritmo} onChange={v=>u("ritmo",v)}/></div>
        <SH>Examen Clínico</SH>
        <div style={sRow}><Field label="Garganta" value={f.garganta} onChange={v=>u("garganta",v)} opts={["Saludable","Anormal","Inflamada"]}/><Field label="Visión" value={f.vision} onChange={v=>u("vision",v)} opts={["Saludable","Deficiente","Usa lentes"]}/><Field label="Auditiva" value={f.auditiva} onChange={v=>u("auditiva",v)} opts={["Saludable","Deficiente"]}/></div>
        <div style={sRow}><Field label="Glucosa" value={f.glucosa} onChange={v=>u("glucosa",v)} type="number"/><Field label="Tipo" value={f.glucosa_tipo} onChange={v=>u("glucosa_tipo",v)} opts={["postprandial","en ayunas"]}/><Field label="Pulmones" value={f.pulmones} onChange={v=>u("pulmones",v)}/></div>
        <div style={sRow}><Field label="Abdomen" value={f.abdomen} onChange={v=>u("abdomen",v)} opts={["Flexible","Distendido","Dolor"]}/><Field label="Extremidades" value={f.extremidades} onChange={v=>u("extremidades",v)} opts={["Simétricas","Asimétricas","Edema"]}/><Field label="Vértigo" value={f.vertigo} onChange={v=>u("vertigo",v)} opts={["Saludable","Presenta vértigo"]}/><Field label="Convulsiones" value={f.convulsiones} onChange={v=>u("convulsiones",v)} opts={["Saludable","Antecedentes"]}/></div>
        <SH>Diagnóstico</SH>
        <div style={sRow}><Field label="Fuma" value={f.fuma} onChange={v=>u("fuma",v)} opts={["No","Sí"]}/><Field label="Prueba Drogas" value={f.drogas} onChange={v=>u("drogas",v)} opts={["Negativo","Positivo"]}/><Field label="COVID pts" value={f.covid_pts} onChange={v=>u("covid_pts",v)} type="number"/><Field label="Responsable" value={f.responsable} onChange={v=>u("responsable",v)}/></div>
        <div style={sRow}><Field label="Info General" value={f.info_general} onChange={v=>u("info_general",v)} w="1 1 100%" rows={2}/></div>
        <div style={sRow}><Field label="Recomendaciones" value={f.recomendaciones} onChange={v=>u("recomendaciones",v)} w="1 1 48%" rows={2}/><Field label="Observaciones" value={f.observaciones} onChange={v=>u("observaciones",v)} w="1 1 48%" rows={2}/></div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}><button onClick={onCancel} style={sBtnS}>Cancelar</button><button onClick={()=>onSave(f)} disabled={saving} style={{...sBtnP,opacity:saving?.5:1}}>{saving?"Guardando...":"Guardar Visita"}</button></div>
      </div>
    </div>
  </div>;
}
