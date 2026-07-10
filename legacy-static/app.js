
const state = {
  data: [],
  view: 'today',
  tripMode: 'timeline',
  search: '',
  editing: null
};

const app = document.getElementById('app');
const fmtDate = d => new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(new Date(d+'T12:00:00'));
const shortDate = d => new Intl.DateTimeFormat('nl-NL',{day:'2-digit',month:'2-digit'}).format(new Date(d+'T12:00:00'));

async function load(){
  const saved = localStorage.getItem('filipijnen-v2');
  state.data = saved ? JSON.parse(saved) : await fetch('data.json').then(r=>r.json());
  route();
}

function save(){
  localStorage.setItem('filipijnen-v2', JSON.stringify(state.data));
}

function hero(){
  return `<header class="hero">
    <small>Gezinsreis</small>
    <h1>Filipijnen 2026 🇵🇭</h1>
    <p>23 juli – 13 augustus · 22 dagen</p>
    <div class="top-actions">
      <button class="secondary" onclick="location.hash='#/search'">🔎 Zoeken</button>
      <button class="secondary" onclick="location.hash='#/practical'">☰ Praktisch</button>
    </div>
  </header>`;
}

function countdown(){
  const start = new Date('2026-07-23T20:25:00');
  const diff = start - new Date();
  const text = diff > 0 ? `${Math.ceil(diff/86400000)} dagen` : 'Reis gestart';
  return `<div class="panel countdown"><div><div class="kicker">Tot vertrek</div><strong>${text}</strong></div><div style="text-align:right"><div class="kicker">Eerste vlucht</div><b>WY172 · 20:25</b></div></div>`;
}

function fieldRow(icon,label,value,i,key){
  return `<div class="row"><div>${icon}</div><div><div class="kicker">${label}</div><div class="value">${value || '-'}</div></div><button class="edit" onclick="editField(${i},'${key}','${label}')">Bewerk</button></div>`;
}

function part(label,key,value,i){
  const displayed = !value || value==='-' || value==='Vrij' ? 'Nog in te vullen' : value;
  return `<div class="part"><div class="kicker">${label}</div><b>${displayed}</b><button class="edit" onclick="editField(${i},'${key}','${label}')">Bewerk</button></div>`;
}

function dayCard(x,i,collapsed=false){
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.location+' Philippines')}`;
  return `<article class="day-card ${collapsed?'collapsed':''}">
    <div class="day-head" onclick="this.parentElement.classList.toggle('collapsed')">
      <div><div class="day-title">${x.location}</div><div class="day-date">${fmtDate(x.date)}</div></div>
      <span class="badge ${x.status}">${x.status}</span>
    </div>
    <div class="day-body">
      ${fieldRow('🏨','Hotel',x.hotel,i,'hotel')}
      ${fieldRow('🚐','Vervoer',[x.transport,x.carrier,x.booking].filter(Boolean).join(' · '),i,'transport')}
      <div class="parts">
        ${part('Ochtend','morning',x.morning,i)}
        ${part('Middag','afternoon',x.afternoon,i)}
        ${part('Avond','evening',x.evening,i)}
      </div>
      ${fieldRow('📝','Notitie',x.notes || 'Geen notitie',i,'notes')}
      <a class="map-link" href="${maps}" target="_blank"><span>📍 Open locatie in Google Maps</span><span>›</span></a>
    </div>
  </article>`;
}

function todayIndex(){
  const today = new Date().toISOString().slice(0,10);
  const i = state.data.findIndex(x=>x.date===today);
  return i >= 0 ? i : 0;
}

function renderToday(){
  const i = todayIndex();
  return `${countdown()}<div class="notice">Tijdens de reis opent de app automatisch op vandaag en morgen.</div>${state.data.slice(i,i+2).map((x,j)=>dayCard(x,i+j,false)).join('')}`;
}

function tripToolbar(){
  return `<div class="toolbar">
    ${['timeline','destinations','calendar'].map(v=>`<button class="chip ${state.tripMode===v?'active':''}" onclick="setTripMode('${v}')">${v==='timeline'?'Tijdlijn':v==='destinations'?'Bestemmingen':'Kalender'}</button>`).join('')}
  </div>`;
}

function renderTimeline(){
  const i = todayIndex();
  return `<input class="search" placeholder="Zoek in alle reisgegevens…" value="${state.search}" oninput="setSearch(this.value)">
    ${state.data.map((x,idx)=>({x,idx})).filter(o=>JSON.stringify(o.x).toLowerCase().includes(state.search.toLowerCase())).map(o=>dayCard(o.x,o.idx,!(o.idx===i||o.idx===i+1))).join('')}`;
}

function renderDestinations(){
  const groups = {};
  state.data.forEach((x,i)=>{ (groups[x.island] ??= []).push({...x,_i:i}); });
  return `<div class="grid">${Object.entries(groups).map(([name,items])=>`
    <div class="list-card">
      <h3>${name}</h3>
      <div class="muted">${shortDate(items[0].date)} – ${shortDate(items.at(-1).date)}</div>
      <p><b>Hotels:</b> ${[...new Set(items.map(x=>x.hotel).filter(x=>x && x!=='-'))].join(', ') || '-'}</p>
      <p><b>Activiteiten:</b> ${items.flatMap(x=>[x.morning,x.afternoon,x.evening]).filter(x=>x && x!=='Vrij' && x!=='Nog in te vullen').slice(0,6).join(', ')}</p>
    </div>`).join('')}</div>`;
}

function renderCalendar(){
  return `<div class="calendar-grid">${state.data.map(x=>`<div><b>${shortDate(x.date)}</b>${x.location.split('→')[0]}</div>`).join('')}</div>`;
}

function renderTrip(){
  const body = state.tripMode==='timeline' ? renderTimeline() : state.tripMode==='destinations' ? renderDestinations() : renderCalendar();
  return `${tripToolbar()}${body}`;
}

function renderHotels(){
  const names = [...new Set(state.data.map(x=>x.hotel).filter(x=>x && x!=='-'))];
  return `<h2 class="section-title">Overnachtingen</h2><div class="grid cols">${names.map(name=>{
    const rows = state.data.filter(x=>x.hotel===name);
    return `<div class="list-card"><h3>${name}</h3><div class="muted">${rows[0].location}</div><p>Verblijf: ${shortDate(rows[0].date)} t/m ${shortDate(rows.at(-1).date)}</p><a target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' Philippines')}">Open in Google Maps</a></div>`;
  }).join('')}</div>`;
}

function renderTransport(){
  const rows = state.data.filter(x=>x.transport && x.transport!=='-');
  return `<h2 class="section-title">Vervoer</h2><div class="grid">${rows.map(x=>`
    <div class="list-card">
      <h3>${fmtDate(x.date)}</h3>
      <div>${x.location}</div>
      <p><b>${x.transport}</b>${x.carrier?' · '+x.carrier:''}${x.booking?' · '+x.booking:''}</p>
      <div class="muted">${[x.morning,x.afternoon,x.evening].filter(Boolean).join(' · ')}</div>
    </div>`).join('')}</div>`;
}

function renderSearch(){
  const q = state.search.toLowerCase();
  const rows = state.data.map((x,i)=>({x,i})).filter(o=>JSON.stringify(o.x).toLowerCase().includes(q));
  return `<h2 class="section-title">Zoeken</h2><input autofocus class="search" placeholder="Zoek hotel, vlucht, activiteit…" value="${state.search}" oninput="setSearch(this.value);route(false)">
    <div class="grid" style="margin-top:12px">${rows.map(o=>`<div class="list-card"><h3>${fmtDate(o.x.date)}</h3><div>${o.x.location}</div><div class="muted">${o.x.hotel} · ${o.x.transport}</div></div>`).join('')}</div>`;
}

function renderPractical(){
  return `<h2 class="section-title">Praktische informatie</h2>
  <div class="grid">
    <div class="list-card"><h3>Nood</h3><p>Algemeen alarmnummer Filipijnen: 911</p><p>Bewaar hier verzekerings- en polisgegevens.</p></div>
    <div class="list-card"><h3>Geld</h3><p>Valuta: Filipijnse peso (PHP). Neem voor kleinere plaatsen voldoende contant geld mee.</p></div>
    <div class="list-card"><h3>Vervoer</h3><p>Gebruik Google Maps en waar beschikbaar Grab. Controleer transfers een dag vooraf.</p></div>
    <div class="list-card"><h3>Bereikbaarheid</h3><p>Internet kan per eiland wisselen. Bewaar belangrijke boekingsnummers ook als screenshot.</p></div>
  </div>`;
}

function render(){
  const routeName = state.view;
  let body = routeName==='today' ? renderToday()
    : routeName==='trip' ? renderTrip()
    : routeName==='hotels' ? renderHotels()
    : routeName==='transport' ? renderTransport()
    : routeName==='search' ? renderSearch()
    : renderPractical();

  app.innerHTML = hero()+`<main>${body}</main>`+modalHtml();
  document.querySelectorAll('.bottom-nav a').forEach(a=>a.classList.toggle('active',a.dataset.route===routeName));
}

function modalHtml(){
  if(!state.editing) return '';
  const {i,key,label} = state.editing;
  const value = state.data[i][key] || '';
  return `<div class="overlay"><div class="sheet">
    <h2>${label} bewerken</h2>
    <textarea id="editValue" rows="4">${value}</textarea>
    <div class="notice">Na opslaan vervangt dit de huidige informatie.</div>
    <div class="actions"><button onclick="closeEdit()">Annuleren</button><button class="primary" onclick="saveEdit()">Opslaan</button></div>
  </div></div>`;
}

window.editField = (i,key,label)=>{state.editing={i,key,label};render();}
window.closeEdit = ()=>{state.editing=null;render();}
window.saveEdit = ()=>{
  const value = document.getElementById('editValue').value.trim();
  if(confirm('Deze wijziging opslaan?')){
    state.data[state.editing.i][state.editing.key]=value;
    save(); state.editing=null; render();
  }
}
window.setTripMode = mode=>{state.tripMode=mode;render();}
window.setSearch = value=>{state.search=value;}

function route(doRender=true){
  const hash=(location.hash||'#/today').replace('#/','');
  state.view=['today','trip','hotels','transport','search','practical'].includes(hash)?hash:'today';
  if(doRender) render();
}
window.addEventListener('hashchange',()=>route());
load();

if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
