const DB_NAME="MisPagosDB";
const DB_VERSION=3;

let db;
let currentDate=new Date();
currentDate.setDate(1);

let currentFilter="month";
let selectedHistoryMonth=null;
let historyStatusFilter="all";
let historyCategoryFilter="all";

const COP=new Intl.NumberFormat("es-CO",{
  style:"currency",
  currency:"COP",
  maximumFractionDigits:0
});

const MONTH_FORMAT=new Intl.DateTimeFormat("es-CO",{
  month:"long",
  year:"numeric"
});

const CATEGORY_STORAGE_KEY="misPagosCategories";

const DEFAULT_CATEGORIES=[
  "Servicios públicos",
  "Tarjetas",
  "Salud",
  "Seguros",
  "Impuestos",
  "Suscripciones",
  "Educación",
  "Vivienda",
  "Transporte",
  "Préstamos",
  "Administración",
  "Otros"
];

function normalizeCategoryKey(value){
  return String(value||"")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ");
}

function getStoredCategories(){
  try{
    const saved=JSON.parse(
      localStorage.getItem(CATEGORY_STORAGE_KEY)||"[]"
    );

    return Array.isArray(saved)
      ? saved
      : [];
  }catch{
    return [];
  }
}

function storeCategory(value){
  const clean=String(value||"")
    .trim()
    .replace(/\s+/g," ");

  if(!clean) return "";

  const stored=getStoredCategories();

  const exists=stored.some(
    category=>
      normalizeCategoryKey(category)
      === normalizeCategoryKey(clean)
  );

  if(!exists){
    stored.push(clean);

    localStorage.setItem(
      CATEGORY_STORAGE_KEY,
      JSON.stringify(stored)
    );
  }

  return clean;
}

async function getAvailableCategories(){
  const obligations=await getAll("obligations");

  const categories=[
    ...DEFAULT_CATEGORIES,
    ...getStoredCategories(),
    ...obligations
      .map(o=>o.category)
      .filter(Boolean)
  ];

  const unique=new Map();

  for(const category of categories){
    const clean=String(category).trim();

    if(!clean) continue;

    const key=normalizeCategoryKey(clean);

    if(!unique.has(key)){
      unique.set(key,clean);
    }
  }

  return [...unique.values()]
    .sort((a,b)=>
      a.localeCompare(
        b,
        "es",
        {sensitivity:"base"}
      )
    );
}

async function renderCategoryOptions(){
  const datalist=
    document.getElementById("categoryOptions");

  if(!datalist) return;

  const categories=
    await getAvailableCategories();

  datalist.innerHTML="";

  for(const category of categories){
    const option=document.createElement("option");

    option.value=category;

    datalist.appendChild(option);
  }
}

async function canonicalCategoryName(value){
  const clean=String(value||"")
    .trim()
    .replace(/\s+/g," ");

  if(!clean) return "";

  const categories=
    await getAvailableCategories();

  const key=
    normalizeCategoryKey(clean);

  const existing=
    categories.find(
      category=>
        normalizeCategoryKey(category)
        === key
    );

  const finalName=
    existing||clean;

  storeCategory(finalName);

  return finalName;
}


/* =========================
   CATEGORÍAS
========================= */

function normalizeCategoryKey(value){
  return String(value||"")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ");
}


async function getAvailableCategories(){
  const obligations=await getAll("obligations");

  const categories=[
    ...DEFAULT_CATEGORIES,
    ...obligations
      .map(o=>o.category)
      .filter(Boolean)
  ];

  const unique=new Map();

  for(const category of categories){
    const clean=String(category).trim();

    if(!clean) continue;

    const key=normalizeCategoryKey(clean);

    if(!unique.has(key)){
      unique.set(key,clean);
    }
  }

  return [...unique.values()]
    .sort((a,b)=>
      a.localeCompare(b,"es",{
        sensitivity:"base"
      })
    );
}


async function renderCategoryOptions(){
  const datalist=
    document.getElementById("categoryOptions");

  if(!datalist) return;

  const categories=
    await getAvailableCategories();

  datalist.innerHTML="";

  for(const category of categories){
    const option=
      document.createElement("option");

    option.value=category;

    datalist.appendChild(option);
  }
}


async function canonicalCategoryName(value){
  const clean=String(value||"")
    .trim()
    .replace(/\s+/g," ");

  if(!clean) return "";

  const categories=
    await getAvailableCategories();

  const key=
    normalizeCategoryKey(clean);

  const existing=
    categories.find(
      category=>
        normalizeCategoryKey(category)
        === key
    );

  return existing||clean;
}


/* =========================
   BASE DE DATOS
========================= */

function openDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);

    request.onupgradeneeded=e=>{
      const database=e.target.result;

      if(!database.objectStoreNames.contains("obligations")){
        database.createObjectStore("obligations",{keyPath:"id"});
      }

      if(!database.objectStoreNames.contains("payments")){
        database.createObjectStore("payments",{keyPath:"key"});
      }

      if(!database.objectStoreNames.contains("periodRecords")){
        database.createObjectStore("periodRecords",{keyPath:"key"});
      }
    };

    request.onsuccess=()=>{
      db=request.result;
      resolve();
    };

    request.onerror=()=>reject(request.error);
  });
}

function store(name,mode="readonly"){
  return db.transaction(name,mode).objectStore(name);
}

function getAll(name){
  return new Promise((resolve,reject)=>{
    const req=store(name).getAll();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

function getOne(name,key){
  return new Promise((resolve,reject)=>{
    const req=store(name).get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

function put(name,value){
  return new Promise((resolve,reject)=>{
    const req=store(name,"readwrite").put(value);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

function remove(name,key){
  return new Promise((resolve,reject)=>{
    const req=store(name,"readwrite").delete(key);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

function clearStore(name){
  return new Promise((resolve,reject)=>{
    const req=store(name,"readwrite").clear();
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}


/* =========================
   FECHAS
========================= */

function monthKey(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function dateFromMonthKey(ym){
  const [year,month]=ym.split("-").map(Number);
  return new Date(year,month-1,1);
}

function daysInMonth(date){
  return new Date(
    date.getFullYear(),
    date.getMonth()+1,
    0
  ).getDate();
}

function previousMonthKey(){
  const d=new Date();
  d.setDate(1);
  d.setMonth(d.getMonth()-1);
  return monthKey(d);
}

function monthsBetween(startYM,endYM){
  const start=dateFromMonthKey(startYM);
  const end=dateFromMonthKey(endYM);

  return (
    (end.getFullYear()-start.getFullYear())*12
    + (end.getMonth()-start.getMonth())
  );
}

function recurrenceIntervalMonths(obligation){
  switch(obligation.frequency){

    case "every2months":
      return 2;

    case "quarterly":
      return 3;

    case "semiannual":
      return 6;

    case "annual":
      return 12;

    case "custom":
      return Math.max(
        1,
        Number(obligation.intervalMonths)||1
      );

    default:
      return 1;
  }
}

function toLocalDateTimeValue(iso){
  const date=iso?new Date(iso):new Date();
  const pad=n=>String(n).padStart(2,"0");

  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}


/* =========================
   DATOS DE EJEMPLO
========================= */

async function seedExamples(){
  const current=await getAll("obligations");

  if(current.length) return;

  const startMonth=monthKey(new Date());

  const examples=[
    {
      name:"Energía",
      category:"Servicios públicos",
      amount:185000,
      dueDays:[8]
    },
    {
      name:"Acueducto",
      category:"Servicios públicos",
      amount:96000,
      dueDays:[12]
    },
    {
      name:"Tarjeta Visa",
      category:"Tarjetas",
      amount:450000,
      dueDays:[15]
    },
    {
      name:"Medicina prepagada",
      category:"Salud",
      amount:320000,
      dueDays:[25]
    },
    {
      name:"Internet",
      category:"Servicios públicos",
      amount:110000,
      dueDays:[28]
    }
  ];

  for(const e of examples){
    await put("obligations",{
      id:crypto.randomUUID(),
      name:e.name,
      category:e.category,
      amount:e.amount,
      frequency:"monthly",
      dueDays:e.dueDays,
      notes:"",
      startMonth,
      active:true,
      createdAt:new Date().toISOString()
    });
  }
}


/* =========================
   MIGRACIONES
========================= */

async function migrateLegacyData(){
  const obligations=await getAll("obligations");
  const legacyPayments=await getAll("payments");
  const periodRecords=await getAll("periodRecords");

  const existingKeys=new Set(
    periodRecords.map(r=>r.key)
  );

  const earliest=new Map();

  for(const p of legacyPayments){
    if(!p.month || !p.obligationId) continue;

    const current=earliest.get(p.obligationId);

    if(!current || p.month<current){
      earliest.set(p.obligationId,p.month);
    }
  }

  for(const o of obligations){
    let changed=false;

    if(!o.startMonth){
      o.startMonth=
        earliest.get(o.id)
        || monthKey(new Date());
      changed=true;
    }

    if(o.active===undefined){
      o.active=true;
      changed=true;
    }

    if(!o.createdAt){
      o.createdAt=new Date().toISOString();
      changed=true;
    }

    if(changed){
      await put("obligations",o);
    }
  }

  for(const p of legacyPayments){
    if(existingKeys.has(p.key)) continue;

    const o=obligations.find(
      x=>x.id===p.obligationId
    );

    let index=0;
    const parts=String(p.key).split("|");

    if(parts.length>=3){
      const parsed=Number(parts[2]);
      if(Number.isFinite(parsed)) index=parsed;
    }

    const dueDay=
      p.dueDay
      || o?.dueDays?.[index]
      || 1;

    await put("periodRecords",{
      key:p.key,
      month:p.month,
      obligationId:p.obligationId,
      occurrenceIndex:index,
      name:o?.name||"Obligación",
      category:o?.category||"Otros",
      amount:Number(
        p.amount
        ?? o?.amount
        ?? 0
      ),
      dueDay,
      originalDueDay:
        o?.dueDays?.[index]
        || dueDay,
      frequency:o?.frequency||"monthly",
      notes:o?.notes||"",
      paymentNote:"",
      paid:true,
      paidAt:p.paidAt||new Date().toISOString(),
      createdAt:new Date().toISOString()
    });
  }
}

async function migrateToV3(){
  const records=await getAll("periodRecords");

  for(const r of records){
    let changed=false;

    if(r.paymentNote===undefined){
      r.paymentNote="";
      changed=true;
    }

    if(r.notes===undefined){
      r.notes="";
      changed=true;
    }

    if(changed){
      await put("periodRecords",r);
    }
  }
}


/* =========================
   PERÍODOS
========================= */

function obligationAppliesToMonth(o,ym){

  if(
    o.startMonth
    && ym<o.startMonth
  ){
    return false;
  }

  if(
    o.endMonth
    && ym>o.endMonth
  ){
    return false;
  }

  if(
    o.active===false
    && !o.endMonth
  ){
    return false;
  }

  const start=
    o.startMonth||ym;

  const difference=
    monthsBetween(start,ym);

  if(difference<0){
    return false;
  }

  const interval=
    recurrenceIntervalMonths(o);

  return difference%interval===0;
}

function buildPeriodRecord(o,date,originalDay,index){
  const ym=monthKey(date);

  const dueDay=Math.min(
    Number(originalDay),
    daysInMonth(date)
  );

  return {
    key:`${ym}|${o.id}|${index}`,
    month:ym,
    obligationId:o.id,
    occurrenceIndex:index,
    name:o.name,
    category:o.category,
    amount:Number(o.amount||0),
    dueDay,
    originalDueDay:Number(originalDay),
    frequency:o.frequency,
    notes:o.notes||"",
    paymentNote:"",
    paid:false,
    paidAt:null,
    createdAt:new Date().toISOString()
  };
}

async function ensureMonthRecords(date){
  const ym=monthKey(date);

  const obligations=await getAll("obligations");
  const allRecords=await getAll("periodRecords");

  const monthRecords=allRecords.filter(
    r=>r.month===ym
  );

  const keys=new Set(
    monthRecords.map(r=>r.key)
  );

  for(const o of obligations){
    if(!obligationAppliesToMonth(o,ym)) continue;

    const days=Array.isArray(o.dueDays)
      ? o.dueDays
      : [];

    for(let index=0;index<days.length;index++){
      const record=buildPeriodRecord(
        o,
        date,
        days[index],
        index
      );

      if(!keys.has(record.key)){
        await put("periodRecords",record);
        monthRecords.push(record);
        keys.add(record.key);
      }
    }
  }

  return monthRecords.sort(
    (a,b)=>a.dueDay-b.dueDay
  );
}

async function materializeObligationUntil(o,endMonth){
  if(
    !o.startMonth
    || !endMonth
    || o.startMonth>endMonth
  ) return;

  let date=dateFromMonthKey(o.startMonth);
  const endDate=dateFromMonthKey(endMonth);

  const existing=await getAll("periodRecords");
  const keys=new Set(existing.map(r=>r.key));

  while(date<=endDate){
    const ym=monthKey(date);

    if(obligationAppliesToMonth(o,ym)){
      for(let i=0;i<o.dueDays.length;i++){
        const record=buildPeriodRecord(
          o,
          date,
          o.dueDays[i],
          i
        );

        if(!keys.has(record.key)){
          await put("periodRecords",record);
          keys.add(record.key);
        }
      }
    }

    date=new Date(
      date.getFullYear(),
      date.getMonth()+1,
      1
    );
  }
}

async function refreshUnpaidCurrentAndFuture(id){
  const currentYM=monthKey(new Date());
  const records=await getAll("periodRecords");

  for(const r of records){
    if(r.obligationId!==id) continue;
    if(r.month<currentYM) continue;
    if(r.paid) continue;

    await remove("periodRecords",r.key);
  }

  await ensureMonthRecords(new Date());
}


/* =========================
   PAGOS
========================= */

async function togglePayment(key){
  const record=await getOne("periodRecords",key);

  if(!record) return;

  record.paid=!record.paid;
  record.paidAt=
    record.paid
    ? new Date().toISOString()
    : null;

  await put("periodRecords",record);
  await renderAll();
}

async function editPeriodAmount(key){
  const record=await getOne("periodRecords",key);

  if(!record) return;

  const value=prompt(
    "Valor para este período:",
    String(record.amount||0)
  );

  if(value===null) return;

  const amount=Number(
    String(value).replace(/[^0-9]/g,"")
  );

  if(!Number.isFinite(amount)){
    alert("El valor ingresado no es válido.");
    return;
  }

  record.amount=amount;

  await put("periodRecords",record);
  await renderAll();
}


/* =========================
   INICIO
========================= */

async function renderHome(){
  document.getElementById("monthTitle").textContent=
    MONTH_FORMAT.format(currentDate);

  const records=
    await ensureMonthRecords(currentDate);

  let filtered=records;

  if(currentFilter==="q1"){
    filtered=records.filter(r=>r.dueDay<=15);
  }

  if(currentFilter==="q2"){
    filtered=records.filter(r=>r.dueDay>=16);
  }

  const paidCount=
    filtered.filter(r=>r.paid).length;

  const pendingMoney=
    filtered
      .filter(r=>!r.paid)
      .reduce(
        (sum,r)=>sum+Number(r.amount||0),
        0
      );

  document.getElementById("summaryCount").textContent=
    `${paidCount} de ${filtered.length}`;

  document.getElementById("summaryMoney").textContent=
    `${COP.format(pendingMoney)} pendientes`;

  const percentage=
    filtered.length
    ? paidCount/filtered.length*100
    : 0;

  document.getElementById("progressBar").style.width=
    `${percentage}%`;

  const container=
    document.getElementById("paymentsContainer");

  container.innerHTML="";

  if(!filtered.length){
    container.innerHTML=
      `<div class="empty">
        No hay pagos para este período.
      </div>`;
    return;
  }

  const categories=[
    ...new Set(
      filtered.map(r=>r.category)
    )
  ];

  for(const category of categories){
    const title=document.createElement("div");
    title.className="section-title";
    title.textContent=category;
    container.appendChild(title);

    filtered
      .filter(r=>r.category===category)
      .sort((a,b)=>a.dueDay-b.dueDay)
      .forEach(r=>{
        const div=document.createElement("div");

        div.className=
          `payment ${r.paid?"paid":""}`;

        const paidText=r.paidAt
          ? `<div class="paid-date">
               Pagado: ${
                 SHORT_DATE_FORMAT.format(
                   new Date(r.paidAt)
                 )
               }
             </div>`
          : "";

        const noteText=r.paymentNote
          ? `<div class="payment-note">
               ${escapeHTML(r.paymentNote)}
             </div>`
          : "";

        div.innerHTML=`
          <button
            class="check"
            onclick="togglePayment('${r.key}')"
          >
            ${r.paid?"✓":""}
          </button>

          <div class="payment-main">
            <div class="payment-name">
              ${escapeHTML(r.name)}
            </div>

            <div class="payment-meta">
              Vence día ${r.dueDay}
            </div>

            ${statusBadge(r)}
            ${paidText}
            ${noteText}
          </div>

          <button
            class="amount-btn"
            onclick="editPeriodAmount('${r.key}')"
          >
            ${COP.format(r.amount||0)}
          </button>
        `;

        container.appendChild(div);
      });
  }
}

function statusBadge(record){
  if(record.paid){
    return `<span class="badge green">Pagado</span>`;
  }

  const today=new Date();
  today.setHours(0,0,0,0);

  if(monthKey(today)!==record.month){
    return "";
  }

  const due=dateFromMonthKey(record.month);
  due.setDate(record.dueDay);
  due.setHours(0,0,0,0);

  const diff=Math.round(
    (due-today)/86400000
  );

  if(diff<0){
    return `<span class="badge red">Vencido</span>`;
  }

  if(diff===0){
    return `<span class="badge yellow">Vence hoy</span>`;
  }

  if(diff<=3){
    return `<span class="badge yellow">
      Vence en ${diff} días
    </span>`;
  }

  return "";
}

function changeMonth(delta){
  currentDate.setMonth(
    currentDate.getMonth()+delta
  );

  renderAll();
}


/* =========================
   HISTORIAL
========================= */

async function renderHistory(){
  const container=
    document.getElementById("historyContainer");

  container.innerHTML="";

  const allRecords=
    await getAll("periodRecords");

  for(let i=0;i<12;i++){
    const d=new Date();

    d.setDate(1);
    d.setMonth(d.getMonth()-i);

    const ym=monthKey(d);

    const records=
      allRecords.filter(r=>r.month===ym);

    const paid=
      records.filter(r=>r.paid);

    const paidValue=
      paid.reduce(
        (sum,r)=>sum+Number(r.amount||0),
        0
      );

    const card=
      document.createElement("div");

    card.className="card";
    card.onclick=()=>openHistoryMonth(ym);

    card.innerHTML=`
      <div class="history-month">

        <div>
          <strong style="text-transform:capitalize">
            ${MONTH_FORMAT.format(d)}
          </strong>

          <div class="small">
            ${
              records.length
              ? `${COP.format(paidValue)} pagados`
              : "Sin registros"
            }
          </div>
        </div>

        <div style="display:flex;align-items:center">
          <div class="history-score">
            ${
              records.length
              ? `${paid.length}/${records.length}`
              : "—"
            }
          </div>

          <div class="history-arrow">›</div>
        </div>

      </div>
    `;

    container.appendChild(card);
  }
}

async function openHistoryMonth(ym){
  selectedHistoryMonth=ym;
  historyStatusFilter="all";
  historyCategoryFilter="all";

  document
    .querySelectorAll(".history-filter-btn")
    .forEach(b=>b.classList.remove("active"));

  document
    .querySelector('[data-history-filter="all"]')
    ?.classList.add("active");

  showScreen("history-detail","history");

  await renderHistoryDetail();
}

function backToHistory(){
  selectedHistoryMonth=null;
  showScreen("history","history");
}

async function renderHistoryDetail(){
  if(!selectedHistoryMonth) return;

  const date=
    dateFromMonthKey(selectedHistoryMonth);

  document.getElementById("historyDetailTitle").textContent=
    MONTH_FORMAT.format(date);

  const allRecords=
    await getAll("periodRecords");

  const records=
    allRecords
      .filter(r=>r.month===selectedHistoryMonth)
      .sort((a,b)=>a.dueDay-b.dueDay);

  const paid=records.filter(r=>r.paid);
  const pending=records.filter(r=>!r.paid);

  const totalValue=
    records.reduce(
      (sum,r)=>sum+Number(r.amount||0),
      0
    );

  const paidValue=
    paid.reduce(
      (sum,r)=>sum+Number(r.amount||0),
      0
    );

  const pendingValue=
    pending.reduce(
      (sum,r)=>sum+Number(r.amount||0),
      0
    );

  const percentage=
    records.length
    ? Math.round(
        paid.length/records.length*100
      )
    : 0;

  document.getElementById("historyDetailCount").textContent=
    `${paid.length} de ${records.length} pagos`;

  document.getElementById("historyDetailPercent").textContent=
    `${percentage}%`;

  document.getElementById("historyDetailProgress").style.width=
    `${percentage}%`;

  document.getElementById("historyTotal").textContent=
    COP.format(totalValue);

  document.getElementById("historyPaid").textContent=
    COP.format(paidValue);

  document.getElementById("historyPending").textContent=
    COP.format(pendingValue);

  document.getElementById("historyObligations").textContent=
    records.length;


  const categories=[
    ...new Set(records.map(r=>r.category))
  ].sort();

  const select=
    document.getElementById("historyCategoryFilter");

  select.innerHTML=
    `<option value="all">
      Todas las categorías
    </option>`;

  for(const category of categories){
    const option=document.createElement("option");
    option.value=category;
    option.textContent=category;
    select.appendChild(option);
  }

  select.value=historyCategoryFilter;


  let filtered=records;

  if(historyStatusFilter==="paid"){
    filtered=filtered.filter(r=>r.paid);
  }

  if(historyStatusFilter==="pending"){
    filtered=filtered.filter(r=>!r.paid);
  }

  if(historyCategoryFilter!=="all"){
    filtered=filtered.filter(
      r=>r.category===historyCategoryFilter
    );
  }

  const container=
    document.getElementById("historyDetailContainer");

  container.innerHTML="";

  if(!filtered.length){
    container.innerHTML=
      `<div class="empty">
        No hay registros para este filtro.
      </div>`;
    return;
  }

  const visibleCategories=[
    ...new Set(filtered.map(r=>r.category))
  ];

  for(const category of visibleCategories){
    const title=document.createElement("div");

    title.className="section-title";
    title.textContent=category;
    container.appendChild(title);

    filtered
      .filter(r=>r.category===category)
      .forEach(r=>{
        const item=document.createElement("div");

        item.className=
          `history-payment ${r.paid?"paid":""}`;

        const paymentDate=
          r.paidAt
          ? SHORT_DATE_FORMAT.format(
              new Date(r.paidAt)
            )
          : null;

        const statusText=
          r.paid
          ? `Pagado ${paymentDate||""}`
          : "Pendiente";

        const noteText=
          r.paymentNote
          ? `<div class="payment-note">
               ${escapeHTML(r.paymentNote)}
             </div>`
          : "";

        item.innerHTML=`
          <button
            class="check"
            onclick="togglePayment('${r.key}')"
          >
            ${r.paid?"✓":""}
          </button>

          <div class="payment-main">
            <div class="payment-name">
              ${escapeHTML(r.name)}
            </div>

            <div class="payment-meta">
              Vencimiento: día ${r.dueDay}
            </div>

            <div class="${
              r.paid
              ? "paid-date"
              : "payment-meta"
            }">
              ${statusText}
            </div>

            ${noteText}
          </div>

          <div style="text-align:right">
            <strong>
              ${COP.format(r.amount||0)}
            </strong>

            <div style="margin-top:6px">
              <button
                class="edit-record-btn"
                onclick="openRecordEditor('${r.key}')"
              >
                Editar
              </button>
            </div>
          </div>
        `;

        container.appendChild(item);
      });
  }
}

function historyCategoryChanged(){
  historyCategoryFilter=
    document.getElementById(
      "historyCategoryFilter"
    ).value;

  renderHistoryDetail();
}


/* =========================
   EDITAR REGISTRO
========================= */

async function openRecordEditor(key){
  const record=
    await getOne("periodRecords",key);

  if(!record) return;

  document.getElementById("recordKey").value=
    record.key;

  document.getElementById("recordDialogName").textContent=
    `${record.name} · ${record.category}`;

  document.getElementById("recordAmount").value=
    record.amount||0;

  document.getElementById("recordStatus").value=
    record.paid
    ? "paid"
    : "pending";

  document.getElementById("recordPaidAt").value=
    record.paidAt
    ? toLocalDateTimeValue(record.paidAt)
    : toLocalDateTimeValue(new Date().toISOString());

  document.getElementById("recordPaymentNote").value=
    record.paymentNote||"";

  recordStatusChanged();

  document.getElementById("recordDialog").showModal();
}

function recordStatusChanged(){
  const paid=
    document.getElementById("recordStatus").value==="paid";

  document.getElementById("recordPaidAtContainer").style.display=
    paid
    ? "block"
    : "none";
}


/* =========================
   OBLIGACIONES
========================= */

async function renderObligations(){
  const obligations=
    await getAll("obligations");

  const active=
    obligations.filter(
      o=>o.active!==false
    );

  const container=
    document.getElementById("obligationsContainer");

  container.innerHTML="";

  if(!active.length){
    container.innerHTML=
      `<div class="empty">
        Todavía no hay obligaciones activas.
      </div>`;
    return;
  }

  const card=document.createElement("div");
  card.className="card";

  active
    .sort((a,b)=>a.name.localeCompare(b.name))
    .forEach(o=>{
      const div=document.createElement("div");
      div.className="obligation";

      div.innerHTML=`
        <div>
          <strong>
            ${escapeHTML(o.name)}
          </strong>

          <div class="small">
            ${escapeHTML(o.category)}
            · día ${o.dueDays.join(", ")}
            · ${COP.format(o.amount||0)}
          </div>
        </div>

        <div class="obligation-buttons">
          <button
            class="icon-btn"
            onclick="editObligation('${o.id}')"
          >
            Editar
          </button>

          <button
            class="icon-btn"
            onclick="archiveObligation('${o.id}')"
          >
            ⌫
          </button>
        </div>
      `;

      card.appendChild(div);
    });

  container.appendChild(card);
}

async function openNewObligation(){
  await renderCategoryOptions();
  
  document.getElementById("dialogTitle").textContent=
    "Nueva obligación";

  document.getElementById("obligationForm").reset();

  document.getElementById("obligationId").value="";
  document.getElementById("dueDays").value="15";

  document.getElementById("editInfo").classList.add("hidden");

  document.getElementById("startMonthInput").value=
  monthKey(new Date());

document.getElementById("intervalMonths").value=
  "2";

frequencyChanged();

  document.getElementById("obligationDialog").showModal();
}

async function editObligation(id){
  await renderCategoryOptions();
  const o=await getOne("obligations",id);

  if(!o) return;

  document.getElementById("dialogTitle").textContent=
    "Editar obligación";

  document.getElementById("obligationId").value=o.id;
  document.getElementById("name").value=o.name;
  document.getElementById("category").value=o.category;
  document.getElementById("amount").value=o.amount||"";
  document.getElementById("frequency").value=o.frequency;
  document.getElementById("dueDays").value=o.dueDays.join(",");
  document.getElementById("notes").value=o.notes||"";

  document.getElementById("startMonthInput").value=
  o.startMonth||monthKey(new Date());

document.getElementById("intervalMonths").value=
  o.intervalMonths||2;

frequencyChanged();

  document.getElementById("editInfo").classList.remove("hidden");

  document.getElementById("obligationDialog").showModal();
}

function frequencyChanged(){
  const frequency=
    document.getElementById("frequency").value;

  const intervalBox=
    document.getElementById(
      "customIntervalContainer"
    );

  if(frequency==="biweekly"){
    document.getElementById("dueDays").value=
      "15,30";
  }

  if(frequency==="custom"){
    intervalBox.classList.remove("hidden");
  }else{
    intervalBox.classList.add("hidden");
  }
}

async function archiveObligation(id){
  const o=await getOne("obligations",id);

  if(!o) return;

  const ok=confirm(
    "Esta obligación dejará de generarse en próximos meses. El historial anterior se conservará. ¿Continuar?"
  );

  if(!ok) return;

  const currentYM=monthKey(new Date());

  await materializeObligationUntil(
    o,
    currentYM
  );

  o.active=false;
  o.endMonth=currentYM;
  o.updatedAt=new Date().toISOString();

  await put("obligations",o);

  const records=
    await getAll("periodRecords");

  for(const r of records){
    if(r.obligationId!==id) continue;
    if(r.month<=currentYM) continue;
    if(r.paid) continue;

    await remove("periodRecords",r.key);
  }

  await renderAll();
}


/* =========================
   RESPALDO Y CSV
========================= */

async function exportBackup(){
  const data={
    version:3,
    exportedAt:new Date().toISOString(),
    obligations:await getAll("obligations"),
    periodRecords:await getAll("periodRecords")
  };

  downloadFile(
    `mis-pagos-respaldo-${monthKey(new Date())}.json`,
    JSON.stringify(data,null,2),
    "application/json"
  );
}

async function importBackup(event){
  const file=event.target.files[0];

  if(!file) return;

  try{
    const data=JSON.parse(await file.text());

    if(!Array.isArray(data.obligations)){
      throw new Error("Formato inválido");
    }

    if(!confirm(
      "Esto reemplazará los datos actuales. ¿Continuar?"
    )){
      event.target.value="";
      return;
    }

    await clearStore("obligations");
    await clearStore("payments");
    await clearStore("periodRecords");

    for(const o of data.obligations){
      await put("obligations",o);
    }

    if(Array.isArray(data.periodRecords)){
      for(const r of data.periodRecords){
        await put("periodRecords",r);
      }
    }

    if(Array.isArray(data.payments)){
      for(const p of data.payments){
        await put("payments",p);
      }

      await migrateLegacyData();
    }

    await migrateToV3();
    await ensureMonthRecords(new Date());

    alert("Respaldo restaurado correctamente.");

    await renderAll();

  }catch(error){
    console.error(error);
    alert("No fue posible importar el respaldo.");
  }

  event.target.value="";
}

async function exportCSV(){
  const records=await getAll("periodRecords");

  const rows=[[
    "Mes",
    "Obligación",
    "Categoría",
    "Valor",
    "Vencimiento",
    "Estado",
    "Fecha de pago",
    "Nota"
  ]];

  records
    .sort((a,b)=>{
      if(a.month!==b.month){
        return a.month.localeCompare(b.month);
      }

      return a.dueDay-b.dueDay;
    })
    .forEach(r=>{
      rows.push([
        r.month,
        r.name,
        r.category,
        r.amount||0,
        r.dueDay,
        r.paid?"Pagado":"Pendiente",
        r.paidAt
          ? new Date(r.paidAt).toLocaleString("es-CO")
          : "",
        r.paymentNote||""
      ]);
    });

  const csv=rows
    .map(row=>
      row.map(value=>
        `"${String(value).replaceAll('"','""')}"`
      ).join(",")
    )
    .join("\n");

  downloadFile(
    `historial-pagos-${monthKey(new Date())}.csv`,
    "\ufeff"+csv,
    "text/csv;charset=utf-8"
  );
}


/* =========================
   UTILIDADES
========================= */

function downloadFile(filename,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);

  const a=document.createElement("a");
  a.href=url;
  a.download=filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(
    ()=>URL.revokeObjectURL(url),
    1000
  );
}

function escapeHTML(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

async function resetApp(){
  if(!confirm(
    "Se eliminarán todas las obligaciones y todo el historial. ¿Continuar?"
  )) return;

  await clearStore("obligations");
  await clearStore("payments");
  await clearStore("periodRecords");

  await seedExamples();
  await ensureMonthRecords(new Date());
  await renderAll();
}


/* =========================
   NAVEGACIÓN
========================= */

function showScreen(screenName,navName=screenName){
  document
    .querySelectorAll(".screen")
    .forEach(
      screen=>screen.classList.remove("active")
    );

  document
    .getElementById(`screen-${screenName}`)
    .classList.add("active");

  document
    .querySelectorAll(".nav-btn")
    .forEach(
      button=>button.classList.remove("active")
    );

  document
    .querySelector(
      `.nav-btn[data-screen="${navName}"]`
    )
    ?.classList.add("active");
}

async function renderAll(){
  await renderHome();
  await renderHistory();
  await renderObligations();

  if(selectedHistoryMonth){
    await renderHistoryDetail();
  }
}


/* =========================
   EVENTOS
========================= */

document
  .getElementById("obligationForm")
  .addEventListener("submit",async event=>{
    event.preventDefault();

    const rawDays=
      document.getElementById("dueDays").value;

    const dueDays=[
      ...new Set(
        rawDays
          .split(",")
          .map(x=>Number(x.trim()))
          .filter(x=>x>=1 && x<=31)
      )
    ].sort((a,b)=>a-b);

    if(!dueDays.length){
      alert(
        "Debes indicar al menos un día válido entre 1 y 31."
      );
      return;
    }

    const existingId=
      document.getElementById("obligationId").value;

    let previous=null;

    if(existingId){
      previous=
        await getOne("obligations",existingId);

      if(previous){
        await materializeObligationUntil(
          previous,
          previousMonthKey()
        );
      }
    }

    const obligation={
      id:
        existingId
        || crypto.randomUUID(),

      name:
        document.getElementById("name").value.trim(),

      category:
  await canonicalCategoryName(
    document.getElementById("category").value
  ),
      amount:
        Number(
          document.getElementById("amount").value
          || 0
        ),

      frequency:
  document.getElementById("frequency").value,

intervalMonths:
  document.getElementById("frequency").value==="custom"
  ? Math.max(
      1,
      Number(
        document.getElementById("intervalMonths").value
        || 1
      )
    )
  : null,
      dueDays,

      notes:
        document.getElementById("notes").value.trim(),

      startMonth:
  document.getElementById("startMonthInput").value
  || previous?.startMonth
  || monthKey(new Date()),
  
      active:true,

      createdAt:
        previous?.createdAt
        || new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    await put("obligations",obligation);
    await renderCategoryOptions();

    if(existingId){
      await refreshUnpaidCurrentAndFuture(existingId);
    }else{
      await ensureMonthRecords(new Date());
    }

    document
      .getElementById("obligationDialog")
      .close();

    await renderAll();
  });


document
  .getElementById("recordForm")
  .addEventListener("submit",async event=>{
    event.preventDefault();

    const key=
      document.getElementById("recordKey").value;

    const record=
      await getOne("periodRecords",key);

    if(!record) return;

    record.amount=
      Number(
        document.getElementById("recordAmount").value
        || 0
      );

    record.paid=
      document.getElementById("recordStatus").value
      === "paid";

    if(record.paid){
      const value=
        document.getElementById("recordPaidAt").value;

      record.paidAt=
        value
        ? new Date(value).toISOString()
        : new Date().toISOString();
    }else{
      record.paidAt=null;
    }

    record.paymentNote=
      document
        .getElementById("recordPaymentNote")
        .value
        .trim();

    await put("periodRecords",record);

    document
      .getElementById("recordDialog")
      .close();

    await renderAll();
  });


document
  .querySelectorAll(".nav-btn")
  .forEach(button=>{
    button.addEventListener("click",async()=>{
      const screen=button.dataset.screen;

      if(screen!=="history"){
        selectedHistoryMonth=null;
      }

      showScreen(screen,screen);
      await renderAll();
    });
  });


document
  .querySelectorAll(".filter-btn")
  .forEach(button=>{
    button.addEventListener("click",()=>{
      document
        .querySelectorAll(".filter-btn")
        .forEach(
          item=>item.classList.remove("active")
        );

      button.classList.add("active");
      currentFilter=button.dataset.filter;

      renderHome();
    });
  });


document
  .querySelectorAll(".history-filter-btn")
  .forEach(button=>{
    button.addEventListener("click",()=>{
      document
        .querySelectorAll(".history-filter-btn")
        .forEach(
          item=>item.classList.remove("active")
        );

      button.classList.add("active");

      historyStatusFilter=
        button.dataset.historyFilter;

      renderHistoryDetail();
    });
  });


/* =========================
   INICIO DE LA APP
========================= */

async function init(){
  try{
    await openDB();
    await migrateLegacyData();
    await migrateToV3();
    await seedExamples();
    await ensureMonthRecords(new Date());
    await renderAll();

  }catch(error){
    console.error(error);

    alert(
      "No fue posible iniciar el almacenamiento local."
    );
  }
}

init();


/* =========================
   SERVICE WORKER
========================= */

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch(error=>
        console.error(
          "Error registrando Service Worker:",
          error
        )
      );
  });
}