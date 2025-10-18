
/* ===== Storage (IndexedDB + fallback) ===== */
const DB_NAME = 'pmm_db_v3';
const STORE_NAME = 'pmm_store';
const IDB_KEY = 'data';
const LS_KEY = 'pmm_data_v13';

const $ = (sel)=>document.querySelector(sel);
const $$ = (sel)=>Array.from(document.querySelectorAll(sel));

function updateStorageBanner(text, ok=true){
  const el = document.getElementById('storageState');
  if(!el) return;
  el.textContent = text;
  el.style.color = ok ? 'var(--muted)' : 'var(--danger)';
}
function idbOpen(){
  return new Promise((resolve)=>{
    if(!('indexedDB' in window)){ resolve(null); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_NAME)){
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> resolve(null);
  });
}
async function idbSet(key, value){
  const db = await idbOpen();
  if(!db) throw new Error('no-indexeddb');
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = ()=> resolve();
    tx.onerror = ()=> reject(tx.error);
    tx.objectStore(STORE_NAME).put(value, key);
  });
}
async function idbGet(key){
  const db = await idbOpen();
  if(!db) return null;
  return new Promise((resolve)=>{
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = ()=> resolve(req.result ?? null);
    req.onerror = ()=> resolve(null);
  });
}

async function saveLocal(){
  const payload = JSON.stringify({rows, columns, hiddenCols:[...hiddenCols]});
  try{
    await idbSet(IDB_KEY, payload);
    updateStorageBanner('gespeichert (IndexedDB)');
  }catch(e){
    try{
      localStorage.setItem(LS_KEY, payload);
      updateStorageBanner('gespeichert (localStorage)');
    }catch(err){
      updateStorageBanner('zu groß – bitte als Excel exportieren', false);
    }
  }
}
async function loadLocal(){
  const raw = await idbGet(IDB_KEY) || localStorage.getItem(LS_KEY);
  if(!raw) return false;
  try{
    const data = JSON.parse(raw);
    if(Array.isArray(data.rows) && Array.isArray(data.columns)){
      rows = data.rows; columns = data.columns; hiddenCols = new Set(data.hiddenCols||[]);
      ensureLoanColumns(); ensureCalibColumns(); ensureStatusColumn(); placeLoanNextToStatus(); ensureInstrumentNoColumn();
      rebuildFiltered(); renderAll();
      return true;
    }
  }catch(e){}
  return false;
}

/* ===== State ===== */
let rows = [];

// ---- Cloud (Firebase Realtime Database) ----
let cloudEnabled = false;
let fbApp = null;
let fbDB = null;
let fbConfig = null;
let fbPath = "/pmm/data";

function loadCloudPrefs(){
  try{
    const raw = localStorage.getItem("pmm_firebase_config");
    if(raw){ fbConfig = JSON.parse(raw); }
    const p = localStorage.getItem("pmm_firebase_path");
    if(p) fbPath = p;
    const on = localStorage.getItem("pmm_cloud_enabled");
    cloudEnabled = on === "1";
  }catch(e){}
}
function saveCloudPrefs(){
  try{
    if(fbConfig) localStorage.setItem("pmm_firebase_config", JSON.stringify(fbConfig));
    if(fbPath) localStorage.setItem("pmm_firebase_path", fbPath);
    localStorage.setItem("pmm_cloud_enabled", cloudEnabled ? "1":"0");
  }catch(e){}
}
async function ensureFirebase(){
  if(!fbConfig) throw new Error("Keine Firebase‑Konfiguration.");
  if(!fbApp){
    fbApp = firebase.initializeApp(fbConfig);
    fbDB = firebase.database();
  }
  return {app:fbApp, db:fbDB};
}
async function cloudTestConnection(){
  const {db} = await ensureFirebase();
  const key = fbPath.replace(/\/+$/,'') + "/__ping__";
  const now = Date.now();
  await db.ref(key).set({ts:now});
  const snap = await db.ref(key).get();
  return snap.exists() && snap.val() && snap.val().ts===now;
}
async function cloudSave(payload){
  const {db} = await ensureFirebase();
  const key = fbPath.replace(/\/+$/,'') + "/dataset";
  await db.ref(key).set(payload);
}
async function cloudLoad(){
  const {db} = await ensureFirebase();
  const key = fbPath.replace(/\/+$/,'') + "/dataset";
  const snap = await db.ref(key).get();
  return snap.exists() ? snap.val() : null;
}

async function saveData(){
  const payload = JSON.stringify({rows, columns, hiddenCols:[...hiddenCols]});
  if(cloudEnabled){
    try{
      await cloudSave(payload);
      updateStorageBanner('gespeichert (Cloud)');
      return;
    }catch(e){
      console.warn('Cloud speichern fehlgeschlagen, fallback lokal', e);
    }
  }
  try{ await saveData(); }catch(e){ try{ saveData(); }catch(err){} }
}
        // array of row objects
let columns = [];     // column names (order)
let hiddenCols = new Set();
let filtered = [];
let selected = new Set();
let page = 1;
let pageSize = 50;
let fitMode = true;
let sortState = {col:null, dir:1};
let hideEmpty = true;
let colFilters = {};
let debounceTimer = null;
const todayISO = ()=> new Date().toISOString().slice(0,10);
function debounce(fn, wait=300){ return (...args)=>{ clearTimeout(debounceTimer); debounceTimer = setTimeout(()=>fn(...args), wait); }; }
function compareSmart(a,b){
  const na = /^-?\d+(\.\d+)?$/.test(String(a??'').trim()) ? Number(a) : null;
  const nb = /^-?\d+(\.\d+)?$/.test(String(b??'').trim()) ? Number(b) : null;
  if(na!==null && nb!==null) return na-nb;
  const da = Date.parse(a); const db = Date.parse(b);
  if(!isNaN(da) && !isNaN(db)) return da-db;
  return String(a??'').localeCompare(String(b??''),'de',{numeric:true,sensitivity:'base'});
}
function ensureStatusColumn(){
  const hasFreigabe = columns.some(c => ['freigabe','freigabe_status','freigabestatus'].includes(c.toLowerCase()));
  const hasStatus = columns.some(c => c.toLowerCase()==='status');
  if(!hasFreigabe && !hasStatus){
    columns.push('status');
    rows.forEach(r=>{ if(r['status']===undefined) r['status']=''; });
  }
}
function ensureInstrumentNoColumn(){
  if(!columns.includes('instrument_no')){
    columns.unshift('instrument_no');
  }
}

function mainStatusKey(){
  let k = columns.find(c => ['freigabe','freigabe_status','freigabestatus'].includes(c.toLowerCase()));
  if(!k) k = columns.find(c => c.toLowerCase()==='status');
  if(!k){ columns.push('status'); k='status'; }
  return k;
}
function setMainStatus(row, value){ row[mainStatusKey()] = value; }
function placeLoanNextToStatus(){
  ensureLoanColumns();
  const s = mainStatusKey();
  const si = columns.indexOf(s);
  const li = columns.indexOf('loan_status');
  if(li>-1 && si>-1 && li!==si+1){
    columns.splice(li,1); columns.splice(si+1,0,'loan_status');
  }
}
function ensureLoanColumns(){
  const need = ["loan_status","loaned_to","loan_date","return_date"];
  let changed=false;
  need.forEach(n=>{ if(!columns.includes(n)){ columns.push(n); changed=true; } });
  rows.forEach(r=>{
    if(r["loan_status"]===undefined) r["loan_status"]="verfügbar";
    if(r["loaned_to"]===undefined) r["loaned_to"]="";
    if(r["loan_date"]===undefined) r["loan_date"]="";
    if(r["return_date"]===undefined) r["return_date"]="";
  });
  if(changed) saveData();
}
function ensureCalibColumns(){
  const need = ["cal_status","calib_provider","calib_sent_date","calib_return_date"];
  let changed=false;
  need.forEach(n=>{ if(!columns.includes(n)){ columns.push(n); changed=true; } });
  rows.forEach(r=>{
    if(r["cal_status"]===undefined) r["cal_status"]="";
    if(r["calib_provider"]===undefined) r["calib_provider"]="";
    if(r["calib_sent_date"]===undefined) r["calib_sent_date"]="";
    if(r["calib_return_date"]===undefined) r["calib_return_date"]="";
  });
  if(changed) saveData();
}
function isRowEmpty(r){
  return columns.filter(c=>!hiddenCols.has(c)).every(c=>{
    const v = r[c]; return v===undefined || v===null || String(v).trim()==='';
  });
}
function parseQuery(q){
  const original = String(q);
  const onlySpaces = original.length>0 && /^\s+$/.test(original);
  q = String(q).trim(); if(!q && !onlySpaces) return {neg:false, op:"none", value:""};
  if(onlySpaces){
    const neg = /^\s*!\s*$/.test(original) || /^\s*not\s*$/i.test(original);
    return {neg, op:"isEmpty", value:""};
  }
  let neg=false;
  if(q.startsWith("!")){neg=true; q=q.slice(1).trim();}
  else if(/^not\s+/i.test(q)){neg=true; q=q.replace(/^not\s+/i,'').trim();}
  const ops=["!=",">=","<=","=",">","<"];
  for(const op of ops){
    if(q.startsWith(op)) return {neg,op,value:q.slice(op.length).trim()};
  }
  return {neg,op:"contains",value:q};
}
function equalsSmart(a,b){
  const na = /^-?\d+(\.\d+)?$/.test(String(a??'')) ? Number(a) : null;
  const nb = /^-?\d+(\.\d+)?$/.test(String(b??'')) ? Number(b) : null;
  if(na!==null && nb!==null) return na===nb;
  const da = Date.parse(a); const db = Date.parse(b);
  if(!isNaN(da) && !isNaN(db)) return da===db;
  return String(a??'').toLowerCase()===String(b??'').toLowerCase();
}
function matchesFilter(value, query){
  const {neg,op,value:rhs} = parseQuery(query); let res=true;
  if(op==="none") res=true;
  else if(op==="isEmpty") res=String(value??"").trim()==="";
  else if(op==="contains") res=String(value??"").toLowerCase().includes(rhs.toLowerCase());
  else if(op==="=") res=equalsSmart(value,rhs);
  else if(op==="!=") res=!equalsSmart(value,rhs);
  else { const cmp=compareSmart(value,rhs); if(op===">") res=cmp>0; if(op===">=") res=cmp>=0; if(op==="<") res=cmp<0; if(op==="<=") res=cmp<=0; }
  return neg? !res : res;
}
function rebuildFiltered(){
  const q = $("#searchInput").value.trim().toLowerCase();
  filtered = [];
  for(let i=0;i<rows.length;i++){
    const r = rows[i];
    if(hideEmpty && isRowEmpty(r)) continue;
    if(q){
      const hit = columns.some(c => hiddenCols.has(c)?false:String(r[c]??"").toLowerCase().includes(q));
      if(!hit) continue;
    }
    let pass=true;
    for(const col of Object.keys(colFilters)){
      if(hiddenCols.has(col)) continue;
      const qv = colFilters[col];
      if(qv && !matchesFilter(r[col], qv)){ pass=false; break; }
    }
    if(!pass) continue;
    filtered.push(i);
  }
  if(sortState.col){
    const col = sortState.col; const dir=sortState.dir;
    filtered.sort((i,j)=> dir*compareSmart(rows[i][col], rows[j][col]));
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if(page>totalPages) page = totalPages;
}
function statusBadge(val){
  if(!val) return "";
  const v = String(val).toLowerCase();
  let cls="info";
  if(["freigegeben","aktiv","ok","approved","released","verfügbar"].includes(v)) cls="ok";
  else if(["in prüfung","in prüfung/kalibrierung","wartung","pending","in kalibrierung"].includes(v)) cls="warn";
  else if(["gesperrt","nicht freigegeben","sperre","locked","gestrichen"].includes(v)) cls="danger";
  return `<span class="badge ${cls}">${val}</span>`;
}
function renderCell(col,val){
  const lc = col.toLowerCase();
  if(["freigabe","status","freigabe_status","approval","freigabestatus","loan_status","cal_status"].includes(lc)){
    return statusBadge(val);
  }
  return val??"";
}
function renderAll(){
  $("#fitToggle").checked=fitMode; $("#hideEmptyToggle").checked=hideEmpty;
  const ps=$("#pageSize"); const v=(pageSize>=1e8)?"Alle":String(pageSize); if(ps.value!==v) ps.value=v;
  rebuildFiltered(); renderTable(); updateSelectionCount();
// Update filter input classes
$$("#tableContainer input.colFilter").forEach(inp=>{
  try{
    const pq = parseQuery(inp.value);
    inp.classList.toggle("negated", !!pq.neg);
    inp.classList.toggle("empty-filter", pq.op==="isEmpty");
  }catch(e){}
});
}
function renderTable(){
  let focusData=null; const active=document.activeElement;
  if(active?.classList?.contains("colFilter")){focusData={col:active.getAttribute("data-col"),start:active.selectionStart,end:active.selectionEnd};}
  const cont=$("#tableContainer"); const start=(page-1)*pageSize;
  const visibleCols=columns.filter(c=>!hiddenCols.has(c));
  const slice = filtered.slice(start, start+pageSize);
  let html = `<table${fitMode?"":' style="table-layout:auto"'}><thead>`;
  html += `<tr><th><input type="checkbox" id="thSelectAll"></th>`;
  visibleCols.forEach(c=>{ const isS=sortState.col===c; const dir=sortState.dir===1?"▲":"▼"; html+=`<th class="sortable" data-col="${c}">${c}${isS?`<span class="sort">${dir}</span>`:""}</th>`; });
  html += `</tr>`;
  html += `<tr class="filters"><th></th>`;
  visibleCols.forEach(c=>{ const q=colFilters[c]||""; html+=`<th><input class="colFilter" data-col="${c}" value="${q}" placeholder="Filter…"></th>`; });
  html += `</tr></thead><tbody>`;
  slice.forEach(idx=>{
    const r = rows[idx];
    html += `<tr><td><input type="checkbox" class="rowChk" data-idx="${idx}" ${selected.has(idx)?"checked":""}></td>`;
    visibleCols.forEach(c=>{ const v=r[c]; html+=`<td title="${(v??'')}">${renderCell(c,v)}</td>`; });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  cont.innerHTML = html;
  if(focusData?.col){
    const el = cont.querySelector(`.colFilter[data-col="${focusData.col}"]`);
    if(el){ el.focus(); try{ el.setSelectionRange(focusData.start??el.value.length, focusData.end??el.value.length); }catch(e){} }
  }
  $$(".colFilter").forEach(inp=>{
    inp.addEventListener("input", debounce(e=>{
      const col=e.target.getAttribute("data-col"); const val=e.target.value;
      if(val) colFilters[col]=val; else delete colFilters[col];
      try{const pq=parseQuery(e.target.value); e.target.classList.toggle("negated",!!pq.neg); e.target.classList.toggle("empty-filter", pq.op==="isEmpty");}catch(e){}; page=1; rebuildFiltered(); renderTable();
    },300));
  });
  $$("#tableContainer th.sortable").forEach(th=>{
    th.addEventListener("click", ()=>{
      const col=th.getAttribute("data-col");
      if(sortState.col===col) sortState.dir*=-1; else { sortState.col=col; sortState.dir=1; }
      rebuildFiltered(); renderTable();
    });
  });
  $("#thSelectAll")?.addEventListener("change", e=>{
    const on=e.target.checked; slice.forEach(idx=> on?selected.add(idx):selected.delete(idx)); renderTable(); updateSelectionCount();
// Update filter input classes
$$("#tableContainer input.colFilter").forEach(inp=>{
  try{
    const pq = parseQuery(inp.value);
    inp.classList.toggle("negated", !!pq.neg);
    inp.classList.toggle("empty-filter", pq.op==="isEmpty");
  }catch(e){}
});
  });
  $$(".rowChk").forEach(el=> el.addEventListener("change", e=>{
    const idx=Number(e.target.getAttribute("data-idx"));
    if(e.target.checked) selected.add(idx); else selected.delete(idx);
    updateSelectionCount();
// Update filter input classes
$$("#tableContainer input.colFilter").forEach(inp=>{
  try{
    const pq = parseQuery(inp.value);
    inp.classList.toggle("negated", !!pq.neg);
    inp.classList.toggle("empty-filter", pq.op==="isEmpty");
  }catch(e){}
});
  }));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  $("#pageInfo").textContent = `Seite ${page} / ${totalPages} • ${filtered.length} Zeilen`;
}
function updateSelectionCount(){
  $("#selectionCount").textContent = `${selected.size} ausgewählt`;
  const start=(page-1)*pageSize; const slice=filtered.slice(start,start+pageSize);
  const currAll = slice.length>0 && slice.every(idx=>selected.has(idx));
  const th=$("#thSelectAll"); if(th) th.checked = currAll;
}

/* ===== Import Assistant ===== */
let _importWB=null;
function normalizeHeaderCell(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
function detectHeaderRow(matrix){
  for(let i=0;i<matrix.length;i++){
    const row = matrix[i].map(normalizeHeaderCell);
    const nonEmpty = row.filter(Boolean).length;
    if(nonEmpty>=2){
      const allNum = row.every(x=>/^-?\d+([.,]\d+)?$/.test(x));
      if(!allNum) return i;
    }
  }
  return 0;
}
function matrixToObjects(matrix, headerRowIdx){
  const headers = matrix[headerRowIdx].map(h=>normalizeHeaderCell(h) || 'Spalte');
  const objs=[];
  for(let r=headerRowIdx+1;r<matrix.length;r++){
    const row = matrix[r]; const obj={}; let empty=true;
    for(let c=0;c<headers.length;c++){
      const key=headers[c]||('Spalte_'+(c+1)); const val=row[c];
      if(val!==undefined && val!==null && String(val).trim()!=='') empty=false;
      obj[key]=val ?? '';
    }
    if(!empty) objs.push(obj);
  }
  return {headers, objs};
}
function showImportModal(wb){
  _importWB = wb;
  document.body.classList.add('is-modal-open');
  $("#importModal").hidden=false; $("#modalBackdrop").hidden=false;
  const sel=$("#sheetSelect"); sel.innerHTML = wb.SheetNames.map(n=>`<option>${n}</option>`).join(''); sel.value=wb.SheetNames[0];
  renderImportPreview();
}
function closeImportModal(){ document.body.classList.remove('is-modal-open'); $("#importModal").hidden=true; $("#modalBackdrop").hidden=true; }
function renderImportPreview(){
  const sheet=$("#sheetSelect").value; const ws=_importWB.Sheets[sheet];
  const matrix = XLSX.utils.sheet_to_json(ws, {header:1, blankrows:false, defval:""});
  const guess = detectHeaderRow(matrix);
  if(!$("#headerRow").value) $("#headerRow").value = String(guess+1);
  const hdr = Math.max(0, Number($("#headerRow").value||1)-1);
  const {headers, objs} = matrixToObjects(matrix, hdr);
  $("#impPreview").textContent = `Erkannte Spalten (${headers.length}):\n- `+headers.join("\n- ")+`\n\nErste 5 Zeilen:\n`+JSON.stringify(objs.slice(0,5), null, 2);
}
function applyImport(){
  const sheet=$("#sheetSelect").value; const ws=_importWB.Sheets[sheet];
  const matrix = XLSX.utils.sheet_to_json(ws, {header:1, blankrows:false, defval:""});
  const hdr = Math.max(0, Number($("#headerRow").value||1)-1);
  const {headers, objs} = matrixToObjects(matrix, hdr);
  if(objs.length===0){ alert("Keine Datenzeilen gefunden."); return; }
  rows = objs.map(o=>({...o})); columns = headers.slice();
  ensureLoanColumns(); ensureCalibColumns(); ensureStatusColumn(); placeLoanNextToStatus(); ensureInstrumentNoColumn();
  selected.clear(); page=1; sortState={col:null,dir:1}; colFilters={};
  saveData(); renderAll(); closeImportModal();
}
function handleFile(file){
  const reader=new FileReader();
  reader.onload = (e)=>{
    try{
      let wb;
      if(file.name.toLowerCase().endsWith(".csv")){
        const text=e.target.result; wb=XLSX.read(text,{type:"string"});
      }else{
        const data=new Uint8Array(e.target.result); wb=XLSX.read(data,{type:"array"});
      }
      showImportModal(wb);
    }catch(err){
      alert("Import fehlgeschlagen: "+err.message);
      console.error(err);
    }
  };
  if(file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

/* ===== Add Single (modal) ===== */
function openAddModal(){
  buildAddForm(); document.body.classList.add('is-modal-open');
  $("#modalBackdrop").hidden=false; $("#addModal").hidden=false;
  const first=$("#addForm input"); if(first) first.focus();
}
function closeAddModal(){ document.body.classList.remove('is-modal-open'); $("#modalBackdrop").hidden=true; $("#addModal").hidden=true; }
function buildAddForm(){
  ensureLoanColumns(); ensureCalibColumns(); ensureStatusColumn(); placeLoanNextToStatus(); ensureInstrumentNoColumn();
  const form=$("#addForm"); form.innerHTML="";
  columns.forEach(col=>{
    const id="fld_"+col.replace(/\W+/g,'_');
    const wrap=document.createElement("div");
    wrap.innerHTML = `<label for="${id}">${col}</label><input id="${id}" data-col="${col}" type="text" placeholder="${col}">`;
    form.appendChild(wrap);
  });
  const statusKey = mainStatusKey();
  const def = {[statusKey]:"","loan_status":"verfügbar","loaned_to":"","loan_date":"","return_date":"","cal_status":"","calib_provider":"","calib_sent_date":"","calib_return_date":""};
  Object.keys(def).forEach(k=>{
    if(columns.includes(k)){
      const inp=form.querySelector(`[data-col="${CSS.escape(k)}"]`);
      if(inp) inp.value = def[k];
    }
  });
}
function getFormValues(){ const inputs=$$("#addForm input[data-col]"); const obj={}; inputs.forEach(i=>obj[i.getAttribute("data-col")]=i.value); return obj; }
function validateNewRow(obj){
  const hasInst = "instrument_no" in obj && String(obj["instrument_no"]).trim()!=="";
  const hasDes  = "designation" in obj && String(obj["designation"]).trim()!=="";
  if(!hasInst && !hasDes){ alert("Pflicht: Bitte mindestens 'instrument_no' oder 'designation' ausfüllen."); return false; }
  if(hasInst){
    const key=String(obj["instrument_no"]).trim().toLowerCase();
    const dup=rows.some(r=>String(r["instrument_no"]??"").trim().toLowerCase()===key);
    if(dup){ alert("instrument_no muss eindeutig sein – dieser Wert existiert bereits."); return false; }
  }
  return true;
}
function saveAddModal(){
  const obj=getFormValues(); if(!validateNewRow(obj)) return;
  columns.forEach(c=>{ if(!(c in obj)) obj[c]=""; });
  rows.push(obj);
  const idx=rows.length-1; selected.clear(); selected.add(idx);
  const total=rows.length; const perPage=pageSize>=1e8?total:pageSize; page=Math.max(1, Math.ceil(total/perPage));
  saveData(); renderAll(); closeAddModal();
}

/* ===== Workflows ===== */
function loanSelected(){
  if(selected.size===0){ alert("Bitte Zeilen markieren."); return; }
  const who=$("#loanWho").value.trim(); if(!who){ alert("Bitte Entleiher eintragen."); return; }
  const d=todayISO();
  [...selected].forEach(i=>{
    rows[i]["loan_status"]="ausgeliehen"; rows[i]["loaned_to"]=who; rows[i]["loan_date"]=d; rows[i]["return_date"]="";
  });
  saveData(); renderTable();
}
function returnSelected(){
  if(selected.size===0){ alert("Bitte Zeilen markieren."); return; }
  const d=todayISO();
  [...selected].forEach(i=>{ rows[i]["loan_status"]="verfügbar"; rows[i]["return_date"]=d; });
  saveData(); renderTable();
}
function monthsAdd(iso,months){ const dt=new Date(iso); dt.setMonth(dt.getMonth()+months); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;}
function detectIntervalMonths(row){
  const cands=["Intervall (Monate)","intervall (monate)","interval_months","cycle_months","zyklus (monate)","zyklus_monate"];
  for(const c of cands){ const k=columns.find(x=>x.toLowerCase()===c.toLowerCase()); if(k){ const v=parseInt(row[k],10); if(!isNaN(v)&&v>0) return v; } }
  return null;
}
function setGermanDatesOnReturn(row, months){
  let lk=columns.find(c=>c.toLowerCase()==="letzte durchführung")||columns.find(c=>c.toLowerCase()==="last_execution");
  let nk=columns.find(c=>c.toLowerCase()==="nächster termin (primär)")||columns.find(c=>c.toLowerCase()==="next_due_primary");
  const today=todayISO();
  if(!lk){ lk="Letzte Durchführung"; if(!columns.includes(lk)) columns.push(lk); }
  if(!nk){ nk="Nächster Termin (Primär)"; if(!columns.includes(nk)) columns.push(nk); }
  row[lk]=today; row[nk]=monthsAdd(today, months??12);
}
function calSendSelected(){
  if(selected.size===0){ alert("Bitte Zeilen markieren."); return; }
  const prov=$("#calProv").value.trim(); const d=todayISO();
  [...selected].forEach(i=>{
    rows[i]["cal_status"]="in Kalibrierung"; rows[i]["calib_provider"]=prov; rows[i]["calib_sent_date"]=d; rows[i]["calib_return_date"]="";
    setMainStatus(rows[i],"in Kalibrierung");
  });
  saveData(); renderTable();
}
function calBackSelected(){
  if(selected.size===0){ alert("Bitte Zeilen markieren."); return; }
  const d=todayISO(); const ui=parseInt($("#calInterval").value,10);
  [...selected].forEach(i=>{
    const r=rows[i]; r["cal_status"]="freigegeben"; r["calib_return_date"]=d; setMainStatus(r,"freigegeben");
    const m = (!isNaN(ui)&&ui>0)?ui:(detectIntervalMonths(r)??12);
    setGermanDatesOnReturn(r,m);
  });
  saveData(); renderTable();
}

/* ===== Export ===== */
function exportExcel(){
  if(columns.length===0){ alert("Keine Daten zum Export."); return; }
  const ws = XLSX.utils.json_to_sheet(rows, {header: columns});
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pruefmittel");
  XLSX.writeFile(wb, "PMM_Export.xlsx");
}

/* ===== Events ===== */
window.addEventListener("DOMContentLoaded", async ()=>{
  if(!(await loadLocal())) updateStorageBanner('keine lokalen Daten');
  $("#fileInput").addEventListener("change", (e)=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; });
  $("#exportBtn").addEventListener("click", exportExcel);
  $("#clearBtn").addEventListener("click", async ()=>{
    if(confirm("Alle lokalen Daten löschen?")){
      try{ await idbSet(IDB_KEY, null); }catch(e){}
      localStorage.removeItem(LS_KEY);
      rows=[]; columns=[]; filtered=[]; selected.clear(); page=1; hiddenCols.clear(); sortState={col:null,dir:1}; colFilters={};
      renderAll(); updateStorageBanner('geleert');
    }
  });
  $("#demoBtn").addEventListener("click", (e)=>{ e.preventDefault();
    const demo=[
      {"instrument_no":"PM-1001","designation":"Messschieber 150mm","type":"Lehre","manufacturer":"Mitutoyo","serial_no":"A12345","status":"freigegeben","loan_status":"verfügbar","site":"Werk 1","next_due":"2026-05-20","Intervall (Monate)":12},
      {"instrument_no":"PM-1002","designation":"Mikrometer 0-25mm","type":"Messmittel","manufacturer":"Mahr","serial_no":"B98765","status":"gesperrt","loan_status":"verfügbar","site":"Werk 2","next_due":"2025-11-10","Intervall (Monate)":6},
      {"instrument_no":"PM-1003","designation":"Waage 2kg","type":"Messmittel","manufacturer":"Sartorius","serial_no":"C55555","status":"in Prüfung","loan_status":"ausgeliehen","site":"Werk 1","next_due":"2026-02-01","Intervall (Monate)":12}
    ];
    rows=demo.map(o=>({...o})); columns=Object.keys(demo[0]);
    ensureLoanColumns(); ensureCalibColumns(); ensureStatusColumn(); placeLoanNextToStatus(); ensureInstrumentNoColumn();
    selected.clear(); page=1; sortState={col:null,dir:1}; colFilters={}; saveData(); renderAll();
  });
  $("#searchInput").addEventListener("input", debounce(()=>{ rebuildFiltered(); page=1; renderTable(); },300));
  $("#pageSize").addEventListener("change", e=>{ const v=e.target.value; pageSize=(v==="Alle")?1e9:Number(v)||50; page=1; renderTable(); });
  $("#prevPage").addEventListener("click", ()=>{ if(page>1){ page--; renderTable(); } });
  $("#nextPage").addEventListener("click", ()=>{ const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize)); if(page<totalPages){ page++; renderTable(); } });
  $("#selectAll").addEventListener("change", e=>{
    const on=e.target.checked; const start=(page-1)*pageSize; const slice=filtered.slice(start,start+pageSize);
    slice.forEach(idx=> on?selected.add(idx):selected.delete(idx)); renderTable(); updateSelectionCount();
// Update filter input classes
$$("#tableContainer input.colFilter").forEach(inp=>{
  try{
    const pq = parseQuery(inp.value);
    inp.classList.toggle("negated", !!pq.neg);
    inp.classList.toggle("empty-filter", pq.op==="isEmpty");
  }catch(e){}
});
  });
  $("#clearFiltersBtn").addEventListener("click", ()=>{ colFilters={}; renderTable(); });
  $("#fitToggle").addEventListener("change", e=>{ fitMode=e.target.checked; renderTable(); });
  $("#hideEmptyToggle").addEventListener("change", e=>{ hideEmpty=e.target.checked; renderAll(); });

  // Add modal
  $("#addRowBtn").addEventListener("click", openAddModal);
  $("#modalClose").addEventListener("click", closeAddModal);
  $("#modalCancel").addEventListener("click", (e)=>{ e.preventDefault(); closeAddModal(); });
  $("#modalSave").addEventListener("click", (e)=>{ e.preventDefault(); saveAddModal(); });

  // Import assistant
  $("#impClose").addEventListener("click", closeImportModal);
  $("#sheetSelect").addEventListener("change", renderImportPreview);
  $("#headerRow").addEventListener("input", renderImportPreview);
  $("#impApply").addEventListener("click", (e)=>{ e.preventDefault(); applyImport(); });

  // Workflows
  $("#loanBtn").addEventListener("click", loanSelected);
  $("#returnBtn").addEventListener("click", returnSelected);
  $("#calSendBtn").addEventListener("click", calSendSelected);
  $("#calBackBtn").addEventListener("click", calBackSelected);
});

// ---- Cloud UI wiring ----
document.addEventListener('DOMContentLoaded', ()=>{
  loadCloudPrefs();
  const cloudBtn = document.getElementById("cloudBtn");
  const cloudBackdrop = document.getElementById("cloudBackdrop");
  const cloudModal = document.getElementById("cloudModal");
  const cloudClose = document.getElementById("cloudClose");
  const fbConfigJson = document.getElementById("fbConfigJson");
  const fbPathInput = document.getElementById("fbPath");
  const cloudStatus = document.getElementById("cloudStatus");
  const cloudTest = document.getElementById("cloudTest");
  const cloudUse = document.getElementById("cloudUse");
  const cloudDisable = document.getElementById("cloudDisable");

  function openCloud(){
    cloudBackdrop.hidden=false; cloudModal.hidden=false; document.body.classList.add('is-modal-open');
    fbConfigJson.value = fbConfig ? JSON.stringify(fbConfig, null, 2) : "";
    fbPathInput.value = fbPath || "/pmm/data";
    cloudStatus.className='muted small'; cloudStatus.textContent='Status: —';
  }
  function closeCloud(){
    cloudBackdrop.hidden=true; cloudModal.hidden=true; document.body.classList.remove('is-modal-open');
  }
  cloudBtn?.addEventListener("click", openCloud);
  cloudClose?.addEventListener("click", closeCloud);
  cloudBackdrop?.addEventListener("click", closeCloud);

  cloudDisable?.addEventListener("click", ()=>{
    cloudEnabled=false; saveCloudPrefs();
    cloudStatus.className='small'; cloudStatus.textContent='Cloud deaktiviert – lokaler Speicher aktiv.';
  });

  cloudTest?.addEventListener("click", async ()=>{
    try{
      const raw = fbConfigJson.value.trim();
      fbConfig = raw ? JSON.parse(raw) : null;
      fbPath = fbPathInput.value || "/pmm/data";
      saveCloudPrefs();
      const ok = await cloudTestConnection();
      if(!ok) throw new Error('Test fehlgeschlagen');
      cloudStatus.className='small ok'; cloudStatus.textContent='Verbindung OK – Realtime Database erreichbar.';
    }catch(e){
      cloudStatus.className='small err'; cloudStatus.textContent='Fehler: ' + (e?.message || e);
    }
  });

  cloudUse?.addEventListener("click", async ()=>{
    try{
      const raw = fbConfigJson.value.trim();
      fbConfig = raw ? JSON.parse(raw) : null;
      fbPath = fbPathInput.value || "/pmm/data";
      saveCloudPrefs();
      const ok = await cloudTestConnection();
      if(!ok) throw new Error('Test fehlgeschlagen');
      cloudEnabled = true; saveCloudPrefs();
      cloudStatus.className='small ok'; cloudStatus.textContent='Cloud aktiviert – lädt/speichert online.';
      await saveData();
    }catch(e){
      cloudStatus.className='small err'; cloudStatus.textContent='Fehler: ' + (e?.message || e);
    }
  });

  (async ()=>{
    try{
      if(cloudEnabled){
        const payload = await cloudLoad();
        if(payload){
          const obj = JSON.parse(payload);
          rows = obj.rows||[]; columns = obj.columns||[]; hiddenCols = new Set(obj.hiddenCols||[]);
          ensureLoanColumns?.(); ensureCalibColumns?.(); ensureStatusColumn?.(); placeLoanNextToStatus?.(); ensureInstrumentNoColumn?.();
          rebuildFiltered?.(); renderAll?.();
          updateStorageBanner?.('geladen (Cloud)');
        }
      }
    }catch(e){ console.warn('Cloud-Laden fehlgeschlagen', e); }
  })();
});
