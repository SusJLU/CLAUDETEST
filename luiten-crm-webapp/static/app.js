/* Luiten CRM – mobiele app. Offline: wijzigingen gaan eerst in een wachtrij (IndexedDB) en worden verstuurd zodra de laptop bereikbaar is. */
(() => {
'use strict';
const ST = window.STATIC || '/static/';
const root = document.getElementById('root');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rid = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; };
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const hhmm = () => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const H = {'X-LCRM': '1'}, J = {...H, 'Content-Type': 'application/json'};

const TX = {
nl: {tabs:['Vandaag','Notities','Acties','Overzicht'], wd:['zo','ma','di','wo','do','vr','za'], mon:['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'],
 synced:'Gesynchroniseerd', offline:'Offline', waiting:n=>n+' wachtend', notesDay:'Notities vandaag', hotLeads:'Hot leads', openTasks:'Open acties',
 planned:'Geplande afspraken', addMeeting:'+ Afspraak', logged:'Vastgelegd', logNote:'Notitie →', noMeetings:'Geen afspraken op deze dag.',
 recent:'Recente notities', allNotes:'Alle notities →', noNotes:'Nog geen notities op deze dag.', search:'Zoek bedrijf, contact, stand', all:'Alle', hot:'Hot',
 allDays:'alle dagen', n1:'notitie', nN:'notities', noMatch:'Geen notities gevonden.', open:'Open', done:'Klaar', everyone:'Iedereen', due:'Deadline', late:'te laat',
 nothing:'Niets in deze lijst.', summary:'Dagoverzicht', visits:'Bezoeken', newTasks:'Nieuwe acties', byGroup:'Per productgroep', noHot:'Geen hot leads op deze dag.',
 perPerson:'Open acties per persoon', export:'Exporteren', exportDesc:'Download de gegevens die je mag zien. Werkt alleen als de laptop bereikbaar is.',
 csvDay:'CSV · notities van deze dag', xlsx:'Excel · alles', json:'JSON · alles', zip:'ZIP · alles + foto’s', edit:'Wijzig', note:'Notitie', attachments:'Bijlagen',
 tasks:'Acties', noVisitTasks:'Geen acties voor dit bezoek.', newNote:'Nieuwe notitie', editNote:'Wijzig notitie', company:'Bedrijf', companyPh:'Leverancier of klant',
 companyErr:'Vul een bedrijfsnaam in', country:'Land', countryPh:'bijv. Argentinië', hall:'Hal', stand:'Stand', stage:'Fase in pijplijn', contact:'Contactpersoon',
 name:'Naam', role:'Functie', rolePh:'bijv. Export manager', card:'Visitekaartje', photo:'Foto', library:'Uit fotorol', group:'Productgroep', groupHint:'Kies er één of meer',
 priority:'Prioriteit', notePh:'Producten, specs, volumes, keurmerken…', price:'Prijs & volume', pricePh:'bijv. € 9,40/kg CIF, 1 container/maand',
 taskLabel:'Actie (optioneel)', taskPh:'bijv. Prijslijst opvragen', assign:'Toewijzen aan', cancel:'Annuleer', saveNote:'Notitie opslaan', delNote:'Notitie verwijderen',
 delConfirm:'Deze notitie en de foto’s verwijderen?', supplier:'Leverancier', customer:'Klant', relation:'Relatie', loggedAt:'Vastgelegd', by:'door', pending:'Nog niet verstuurd',
 settings:'Instellingen', language:'Taal', loggedIn:'Ingelogd als', logout:'Uitloggen', logoutPending:'Er staan nog wijzigingen in de wachtrij. Toch uitloggen? Ze gaan dan verloren.',
 syncNow:'Nu synchroniseren', admin:'Beheer openen →', pw:'Wachtwoord wijzigen', pwOld:'Huidig wachtwoord', pwNew:'Nieuw wachtwoord', pwSave:'Wachtwoord opslaan', pwOk:'Wachtwoord gewijzigd',
 meeting:'Afspraak', newMeeting:'Nieuwe afspraak', date:'Datum', time:'Tijd', save:'Opslaan', delete:'Verwijderen',
 tSaved:'Notitie opgeslagen', tSavedOn:'Verstuurd naar de laptop.', tSavedOff:'Opgeslagen op deze telefoon. Wordt verstuurd zodra de laptop bereikbaar is.',
 tMeet:'Afspraak opgeslagen', tDel:'Verwijderd', syncErr:'Niet opgeslagen op de laptop', offlineExport:'Geen verbinding met de laptop', tomorrow:'Morgen', in3:'Over 3 dagen', week:'Over 1 week', weeks2:'Over 2 weken', noDue:'Geen',
 roles:{beheerder:'Beheerder', inkoop:'Inkoop', verkoop:'Verkoop'},
 groups:{beef:'Rund',lamb:'Lam',poultry:'Gevogelte',game:'Wild',pork:'Ibérico / varken',duck:'Eend & gans',other:'Overig'}, pri:{hot:'Hot lead',warm:'Warm',cold:'Koud'},
 stages:{lev:{lead:'Lead',specs:'Monsters & specs',prijs:'Prijsonderhandeling',proef:'Proeforder',vast:'Vaste leverancier'},klant:{lead:'Lead',offerte:'Offerte',onderh:'Onderhandeling',won:'Gewonnen',lost:'Verloren'}},
 photos:n=>n+(n===1?' foto':' foto’s'), cardS:'kaartje', scanS:n=>n+(n===1?' scan':' scans'),
 scanTitle:'Notities scannen', scanDesc:'Maak een foto van handgeschreven aantekeningen. De foto wordt bij deze notitie en relatie bewaard.',
 scanCam:'Scan met camera', scan:'Scan', email:'E-mail', phone:'Telefoon'},
en: {tabs:['Today','Notes','Follow-ups','Summary'], wd:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], mon:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
 synced:'Synced', offline:'Offline', waiting:n=>n+' waiting', notesDay:'Notes today', hotLeads:'Hot leads', openTasks:'Open follow-ups',
 planned:'Planned meetings', addMeeting:'+ Meeting', logged:'Logged', logNote:'Note →', noMeetings:'No meetings this day.',
 recent:'Recent notes', allNotes:'All notes →', noNotes:'No notes for this day yet.', search:'Search company, contact, stand', all:'All', hot:'Hot',
 allDays:'all days', n1:'note', nN:'notes', noMatch:'No notes found.', open:'Open', done:'Done', everyone:'Everyone', due:'Due', late:'overdue',
 nothing:'Nothing in this list.', summary:'Day summary', visits:'Visits', newTasks:'New follow-ups', byGroup:'By product group', noHot:'No hot leads this day.',
 perPerson:'Open follow-ups per person', export:'Export', exportDesc:'Download the data you are allowed to see. Only works when the laptop can be reached.',
 csvDay:'CSV · notes of this day', xlsx:'Excel · everything', json:'JSON · everything', zip:'ZIP · everything + photos', edit:'Edit', note:'Note', attachments:'Attachments',
 tasks:'Follow-ups', noVisitTasks:'No follow-ups for this visit.', newNote:'New note', editNote:'Edit note', company:'Company', companyPh:'Supplier or customer',
 companyErr:'Enter a company name', country:'Country', countryPh:'e.g. Argentina', hall:'Hall', stand:'Stand', stage:'Pipeline stage', contact:'Contact person',
 name:'Name', role:'Job title', rolePh:'e.g. Export manager', card:'Business card', photo:'Photo', library:'From library', group:'Product group', groupHint:'Pick one or more',
 priority:'Priority', notePh:'Products, specs, volumes, certifications…', price:'Price & volume', pricePh:'e.g. €9.40/kg CIF, 1 container/month',
 taskLabel:'Follow-up (optional)', taskPh:'e.g. Request price list', assign:'Assign to', cancel:'Cancel', saveNote:'Save note', delNote:'Delete note',
 delConfirm:'Delete this note and its photos?', supplier:'Supplier', customer:'Customer', relation:'Relation', loggedAt:'Logged', by:'by', pending:'Not sent yet',
 settings:'Settings', language:'Language', loggedIn:'Logged in as', logout:'Log out', logoutPending:'There are unsent changes. Log out anyway? They will be lost.',
 syncNow:'Sync now', admin:'Open admin →', pw:'Change password', pwOld:'Current password', pwNew:'New password', pwSave:'Save password', pwOk:'Password changed',
 meeting:'Meeting', newMeeting:'New meeting', date:'Date', time:'Time', save:'Save', delete:'Delete',
 tSaved:'Note saved', tSavedOn:'Sent to the laptop.', tSavedOff:'Stored on this phone. Will be sent when the laptop can be reached.',
 tMeet:'Meeting saved', tDel:'Deleted', syncErr:'Not saved on the laptop', offlineExport:'No connection to the laptop', tomorrow:'Tomorrow', in3:'In 3 days', week:'In 1 week', weeks2:'In 2 weeks', noDue:'None',
 roles:{beheerder:'Admin', inkoop:'Purchasing', verkoop:'Sales'},
 groups:{beef:'Beef',lamb:'Lamb',poultry:'Poultry',game:'Game',pork:'Ibérico / pork',duck:'Duck & goose',other:'Other'}, pri:{hot:'Hot lead',warm:'Warm',cold:'Cold'},
 stages:{lev:{lead:'Lead',specs:'Samples & specs',prijs:'Price negotiation',proef:'Trial order',vast:'Regular supplier'},klant:{lead:'Lead',offerte:'Quote',onderh:'Negotiation',won:'Won',lost:'Lost'}},
 photos:n=>n+(n===1?' photo':' photos'), cardS:'card', scanS:n=>n+(n===1?' scan':' scans'),
 scanTitle:'Scan notes', scanDesc:'Take a photo of handwritten notes. The photo is saved with this note and relation.',
 scanCam:'Scan with camera', scan:'Scan', email:'Email', phone:'Phone'}};
const GROUPS = ['beef','lamb','poultry','game','pork','duck','other'];
const ICON = {beef:'rund',lamb:'lam',poultry:'kip',game:'hert',pork:'varken',duck:'eend',other:'rund'};
const STAGES = {lev:['lead','specs','prijs','proef','vast'], klant:['lead','offerte','onderh','won','lost']};
const I = {
 gear:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
 search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#668196" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 check:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3EA448" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
 back:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
 plus:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 clock:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 cam:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>',
 card:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h3"/></svg>',
 img:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
 pen:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
 dl:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
 ok:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#98CD50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M5 12l5 5 9-10"/></svg>',
 warn:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F2A39A" stroke-width="2.5" stroke-linecap="round" style="flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>',
 t0:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 t1:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/></svg>',
 t2:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/></svg>',
 scan:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 9h10M7 13h10M7 17h6"/></svg>',
 t3:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'};

/* ---------- outbox (IndexedDB, met geheugen als noodoplossing) ---------- */
const outbox = (() => {
  let mem = null, dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    try { const r = indexedDB.open('luiten-crm', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('outbox', {keyPath: 'k', autoIncrement: true});
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); } }));
  const tx = async (mode, fn) => {
    if (mem) return fn(null);
    let db; try { db = await open(); } catch (e) { mem = []; return fn(null); }
    return new Promise((res, rej) => { const t = db.transaction('outbox', mode); const req = fn(t.objectStore('outbox'));
      t.oncomplete = () => res(req && 'result' in req ? req.result : undefined); t.onerror = () => rej(t.error); });
  };
  let seq = 1;
  return {
    add: v => tx('readwrite', s => s ? s.add(v) : (mem.push({...v, k: seq++}), null)),
    all: () => tx('readonly', s => s ? s.getAll() : mem.slice()),
    del: k => tx('readwrite', s => s ? s.delete(k) : (mem = mem.filter(x => x.k !== k), null)),
    clear: () => tx('readwrite', s => s ? s.clear() : (mem = [], null)),
  };
})();

/* ---------- state ---------- */
const S = {me: null, users: [], settings: {}, data: {notes: [], tasks: [], meetings: [], relations: []}, pending: 0, online: true, lastSync: '',
  tab: 'today', day: today(), detail: null, form: null, meet: null, sheet: false, pwOpen: false, filter: 'all', query: '', taskView: 'open', person: 'all',
  lang: localStorage.getItem('lcrm-lang') || 'nl', toast: null, flushing: false};
const T = () => TX[S.lang];
const isAdmin = () => S.me && S.me.role === 'beheerder';
const cacheKey = () => 'lcrm-cache-' + (S.me ? S.me.id : 'x');
const saveCache = () => { try { localStorage.setItem(cacheKey(), JSON.stringify({data: S.data, users: S.users, settings: S.settings, me: S.me})); localStorage.setItem('lcrm-last-me', JSON.stringify(S.me)); } catch (e) {} };
const fmtD = (s, wd = true) => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return (wd ? T().wd[d.getDay()] + ' ' : '') + d.getDate() + ' ' + T().mon[d.getMonth()]; };
const user = id => S.users.find(u => u.id === id) || {name: '?', initials: '?'};
const days = () => { const st = S.settings.event_start || today(), n = +S.settings.event_days || 5; const a = [...Array(n)].map((_, i) => addDays(st, i)); if (!a.includes(today())) a.unshift(today()); return a; };
let toastTimer;
function toast(title, body, bad) { clearTimeout(toastTimer); S.toast = {title, body, bad}; render(); toastTimer = setTimeout(() => { S.toast = null; render(); }, 3200); }

/* ---------- sync ---------- */
async function queue(item) { await outbox.add({...item, uid: S.me.id}); S.pending++; S.etag = null; }
async function send(it) {
  let r;
  const j = (url, method, body) => fetch(url, {method, headers: J, body: body ? JSON.stringify(body) : undefined});
  if (it.type === 'note') r = await j('/api/notes', 'POST', it.body);
  else if (it.type === 'delnote') r = await j('/api/notes/' + it.id, 'DELETE');
  else if (it.type === 'att') { const fd = new FormData(); fd.append('id', it.id); fd.append('kind', it.kind); fd.append('file', it.blob, it.id + '.jpg'); r = await fetch(`/api/notes/${it.note}/attachments`, {method: 'POST', headers: H, body: fd}); }
  else if (it.type === 'delatt') r = await j('/api/attachments/' + it.id, 'DELETE');
  else if (it.type === 'task') r = await j('/api/tasks/' + it.id, 'PATCH', {done: it.done});
  else if (it.type === 'meeting') r = await j('/api/meetings', 'POST', it.body);
  else if (it.type === 'delmeeting') r = await j('/api/meetings/' + it.id, 'DELETE');
  else return;
  if (r.status === 401) throw Object.assign(new Error('auth'), {auth: true});
  if (r.status >= 500 || r.status === 0) throw new Error('server');
  if (!r.ok) { const e = await r.json().catch(() => ({})); toast(T().syncErr, e.error || ('HTTP ' + r.status), true); }
}
async function flush() {
  if (S.flushing) return; S.flushing = true;
  try {
    const items = await outbox.all();
    for (const it of items) { if (it.uid == null || it.uid === S.me.id) await send(it); await outbox.del(it.k); }
    S.online = true;
  } catch (e) {
    if (e.auth) { location.href = '/login'; return; }
    S.online = false;
  } finally { S.flushing = false; }
  S.pending = (await outbox.all()).length;
  if (!S.pending && S.online) await load(); else render();
}
async function load() {
  try {
    const r = await fetch('/api/data', {cache: 'no-store', headers: S.etag ? {'If-None-Match': S.etag} : {}});
    if (r.status === 401 || r.status === 403) { location.href = r.status === 401 ? '/login' : '/login?change=1'; return; }
    if (r.status !== 304) { if (!r.ok) throw new Error(); S.data = await r.json(); S.etag = r.headers.get('ETag'); saveCache(); }
    S.online = true; S.lastSync = hhmm();
  } catch (e) { S.online = false; }
  render();
}

/* ---------- foto's ---------- */
function compress(file, max = 1600, q = .78) {
  return new Promise(res => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); c.toBlob(b => res(b || file), 'image/jpeg', q); };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}
const KIND = {'in-photo': 'photo', 'in-lib': 'photo', 'in-card': 'card', 'in-scan': 'scan', 'in-scanlib': 'scan'};
Object.entries(KIND).forEach(([id, kind]) => { const el = document.getElementById(id); if (!el) return;
  el.addEventListener('change', async () => {
    const files = [...el.files]; el.value = ''; if (!S.form) return;
    for (const f of files) { const blob = await compress(f, kind === 'photo' ? 1600 : 2200, kind === 'photo' ? .78 : .85); S.form.photos.push({id: rid(), kind, blob, url: URL.createObjectURL(blob)}); }
    render();
  }); });

/* ---------- form ---------- */
function newForm(pre = {}) {
  const t = isAdmin() ? 'lev' : (S.me.role === 'verkoop' ? 'klant' : 'lev');
  return {id: rid(), edit: false, company: '', type: t, country: '', hall: '', stand: '', stage: 'lead', contact: '', contact_role: '', groups: [], priority: 'warm',
    text: '', contact_email: '', contact_phone: '', price: '', photos: [], existing: [], removed: [], task: '', owner: S.me.id, due: addDays(today(), 3), date: S.day, time: hhmm(), meeting_id: null, err: false, ...pre};
}
const FIELDS = {contact_email: 'f-email', contact_phone: 'f-phone', company: 'f-company', country: 'f-country', hall: 'f-hall', stand: 'f-stand', stage: 'f-stage', contact: 'f-contact', contact_role: 'f-role', text: 'f-text', price: 'f-price', task: 'f-task', due: 'f-due'};
function readForm() { if (!S.form) return; for (const [k, id] of Object.entries(FIELDS)) { const el = document.getElementById(id); if (el) S.form[k] = el.value; } }
function readMeet() { if (!S.meet) return; for (const k of ['company', 'date', 'time', 'hall', 'stand', 'country']) { const el = document.getElementById('m-' + k); if (el) S.meet[k] = el.value; } }

async function saveNote() {
  readForm(); const f = S.form, L = T();
  if (!f.company.trim()) { f.err = true; render(); document.getElementById('f-company')?.focus(); return; }
  const body = {id: f.id, company: f.company.trim(), type: f.type, country: f.country.trim(), stage: f.stage, hall: f.hall.trim(), stand: f.stand.trim(),
    contact: f.contact.trim(), contact_role: f.contact_role.trim(), contact_email: f.contact_email.trim(), contact_phone: f.contact_phone.trim(), groups: f.groups.length ? f.groups : ['other'], priority: f.priority, text: f.text.trim(),
    price: f.price.trim(), date: f.date, time: f.time, meeting_id: f.meeting_id};
  let task = null;
  if (f.task.trim()) { task = {id: rid(), text: f.task.trim(), owner_id: +f.owner, due: f.due || ''}; body.task = task; }
  await queue({type: 'note', body});
  for (const p of f.photos) await queue({type: 'att', note: f.id, id: p.id, kind: p.kind, blob: p.blob});
  for (const id of f.removed) await queue({type: 'delatt', id});
  // direct lokaal tonen
  const prev = S.data.notes.find(n => n.id === f.id);
  const atts = (prev ? prev.attachments.filter(a => !f.removed.includes(a.id)) : []).concat(f.photos.map(p => ({id: p.id, kind: p.kind, url: p.url})));
  const local = {...(prev || {user_id: S.me.id, created_at: new Date().toISOString()}), ...body, groups: body.groups, attachments: atts, pending: true};
  delete local.task; delete local.meeting_id;
  S.data.notes = prev ? S.data.notes.map(n => n.id === f.id ? local : n) : [local, ...S.data.notes];
  if (task) S.data.tasks.unshift({...task, note_id: f.id, company: body.company, done: false, created_by: S.me.id, pending: true});
  if (f.meeting_id) S.data.meetings = S.data.meetings.map(m => m.id === f.meeting_id ? {...m, note_id: f.id} : m);
  const wasEdit = f.edit; S.form = null;
  if (wasEdit) S.detail = f.id; else { S.tab = 'notes'; S.detail = null; S.filter = 'all'; S.query = ''; }
  saveCache(); window.scrollTo(0, 0);
  await flush();
  toast(L.tSaved, S.online && !S.pending ? L.tSavedOn : L.tSavedOff);
}
async function deleteNote() {
  const f = S.form; if (!f || !confirm(T().delConfirm)) return;
  await queue({type: 'delnote', id: f.id});
  S.data.notes = S.data.notes.filter(n => n.id !== f.id); S.form = null; S.detail = null; saveCache(); render(); flush(); toast(T().tDel, '');
}
async function toggleTask(id, done) {
  const t = S.data.tasks.find(x => x.id === id); if (!t) return; t.done = done; render();
  await queue({type: 'task', id, done}); saveCache(); flush();
}
async function saveMeeting() {
  readMeet(); const m = S.meet;
  if (!m.company.trim()) { m.err = true; render(); return; }
  const body = {id: m.id, date: m.date, time: m.time, company: m.company.trim(), country: m.country.trim(), hall: m.hall.trim(), stand: m.stand.trim()};
  await queue({type: 'meeting', body});
  const ex = S.data.meetings.find(x => x.id === m.id);
  S.data.meetings = ex ? S.data.meetings.map(x => x.id === m.id ? {...x, ...body} : x) : [...S.data.meetings, {...body, user_id: S.me.id, note_id: null}];
  S.meet = null; saveCache(); render(); flush(); toast(T().tMeet, '');
}
async function deleteMeeting() {
  const id = S.meet.id; await queue({type: 'delmeeting', id});
  S.data.meetings = S.data.meetings.filter(x => x.id !== id); S.meet = null; saveCache(); render(); flush();
}

/* ---------- views ---------- */
const prioPill = p => `<span class="pill p-${esc(p)}">${esc(T().pri[p] || p)}</span>`;
const where = n => [n.country, n.hall && (T().hall + ' ' + n.hall), n.stand && (T().stand + ' ' + n.stand)].filter(Boolean).map(esc).join(' · ');
const noteMeta = n => { const ph = n.attachments.filter(a => a.kind === 'photo').length, cd = n.attachments.some(a => a.kind === 'card'), sc = n.attachments.filter(a => a.kind === 'scan').length;
  return [ph ? T().photos(ph) : '', sc ? T().scanS(sc) : '', cd ? T().cardS : ''].filter(Boolean).join(' · '); };
function noteCard(n, withText) {
  const u = user(n.user_id);
  return `<div class="card note" data-a="open" data-id="${esc(n.id)}">
  <div class="note-top"><div class="grow"><div class="note-title">${esc(n.company)}</div><div class="muted">${where(n)}</div></div>${n.pending ? `<span class="pill p-pend">${esc(T().pending)}</span>` : prioPill(n.priority)}</div>
  ${withText && n.text ? `<div class="note-text">${esc(n.text)}</div>` : ''}
  <div class="note-meta"><span class="tagg">${esc(n.groups.map(g => T().groups[g] || g).join(', '))}</span><span>${esc(noteMeta(n))}</span>
  <span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">${esc(withText ? fmtD(n.date, false) + ' · ' : '')}${esc(n.time)} <span class="av s">${esc(u.initials)}</span></span></div></div>`;
}
function statusLine() {
  const L = T();
  if (!S.online) return `<span class="dot off"></span>${L.offline}${S.pending ? ' · ' + L.waiting(S.pending) : ''}`;
  if (S.pending) return `<span class="dot wait"></span>${L.waiting(S.pending)}`;
  return `<span class="dot"></span>${L.synced}${S.lastSync ? ' ' + S.lastSync : ''}`;
}
function header() {
  const L = T(), st = S.settings;
  const sub = {today: `${esc(st.event_name || '')} · ${esc(st.event_place || '')}`, notes: `${L.tabs[1]} · ${L.allDays}`, follow: `${L.tabs[2]} · ${L.allDays}`, summary: `${L.summary} · ${esc(fmtD(S.day))}`}[S.tab];
  const showDays = S.tab === 'today' || S.tab === 'summary';
  return `<header class="m-head">
  <div class="m-head-row"><div style="display:flex;flex-direction:column;gap:6px"><img class="m-logo" src="${ST}img/logo-stacked-white.png" alt="Luiten Food · Thomas Foods"><div class="m-sub">${sub}</div><div class="m-sub">${statusLine()}</div></div>
  <button class="round" data-a="settings" aria-label="${esc(L.settings)}">${I.gear}</button></div>
  ${showDays ? `<div class="days">${days().map(d => { const dd = new Date(d + 'T12:00:00'); return `<button class="day${d === S.day ? ' on' : ''}" data-a="day" data-id="${d}"><b>${esc(L.wd[dd.getDay()])}</b><span>${dd.getDate()}</span></button>`; }).join('')}</div>` : ''}
  ${S.tab === 'notes' ? `<div class="search">${I.search}<input id="q" value="${esc(S.query)}" placeholder="${esc(L.search)}" autocomplete="off"></div>` : ''}
  </header>`;
}
function viewToday() {
  const L = T(), dn = S.data.notes.filter(n => n.date === S.day), open = S.data.tasks.filter(t => !t.done && t.owner_id === S.me.id);
  const ms = S.data.meetings.filter(m => m.date === S.day && (m.user_id === S.me.id || !isAdmin())).sort((a, b) => a.time.localeCompare(b.time));
  return `<main class="main">
  <div class="stats"><div class="stat"><b>${dn.length}</b><span>${L.notesDay}</span></div><div class="stat g"><b>${dn.filter(n => n.priority === 'hot').length}</b><span>${L.hotLeads}</span></div><div class="stat"><b>${open.length}</b><span>${L.openTasks}</span></div></div>
  <div class="card" style="gap:2px"><div class="row-between"><h2>${L.planned}</h2><button class="linkbtn" data-a="addmeet">${L.addMeeting}</button></div>
  ${ms.map(m => { const logged = m.note_id && S.data.notes.some(n => n.id === m.note_id);
    return `<div class="line"><div class="time">${esc(m.time)}</div><div class="grow click" data-a="meeting" data-id="${esc(m.id)}" style="cursor:pointer"><b>${esc(m.company)}</b><span class="muted">${esc([m.hall && L.hall + ' ' + m.hall, m.stand].filter(Boolean).join(' · '))}</span></div>
    ${logged ? `<span class="ok" data-a="meeting" data-id="${esc(m.id)}">${I.check}${L.logged}</span>` : `<button class="linkbtn" data-a="meeting" data-id="${esc(m.id)}">${L.logNote}</button>`}
    <button class="linkbtn" data-a="editmeet" data-id="${esc(m.id)}" aria-label="${esc(L.edit)}" style="color:#668196;padding:0 2px">${I.pen}</button></div>`; }).join('') || `<div class="line faint">${L.noMeetings}</div>`}
  </div>
  <div class="row-between"><h2 style="font-size:17px">${L.recent}</h2><a href="#" data-a="tab" data-id="notes">${L.allNotes}</a></div>
  ${dn.slice(0, 3).map(n => noteCard(n, false)).join('') || `<div class="empty">${L.noNotes}</div>`}
  </main>`;
}
function viewNotes() {
  const L = T(), q = S.query.trim().toLowerCase();
  const list = S.data.notes.filter(n => (S.filter === 'all' || (S.filter === 'hot' ? n.priority === 'hot' : n.groups.includes(S.filter))) &&
    (!q || [n.company, n.contact, n.stand, n.text, n.country].join(' ').toLowerCase().includes(q)));
  const chips = [['all', L.all], ['hot', L.hot], ...GROUPS.map(g => [g, L.groups[g]])];
  return `<main class="main" style="gap:12px">
  <div class="chips scroll">${chips.map(([id, l]) => `<button class="chip${S.filter === id ? ' on' : ''}" data-a="filter" data-id="${id}">${esc(l)}</button>`).join('')}</div>
  <div class="muted">${list.length} ${list.length === 1 ? L.n1 : L.nN}</div>
  ${list.map(n => noteCard(n, true)).join('') || `<div class="empty">${L.noMatch}</div>`}
  </main>`;
}
function taskRow(t, compact) {
  const L = T(), late = !t.done && t.due && t.due < today(), u = user(t.owner_id);
  return `<div class="${compact ? 'line' : 'card'} task${t.done ? ' done' : ''}" style="${compact ? '' : 'flex-direction:row;padding:14px 16px'}">
  <input type="checkbox" class="cb" data-task="${esc(t.id)}" ${t.done ? 'checked' : ''} aria-label="${esc(t.text)}">
  <div class="grow" style="gap:2px"><span class="t">${esc(t.text)}</span>${!compact && t.company ? `<a href="#" data-a="taskrel" data-id="${esc(t.id)}" class="muted" style="font-weight:400">${esc(t.company)} →</a>` : ''}
  ${t.due ? `<span class="due${late ? ' late' : ''}">${I.clock}${L.due} ${esc(fmtD(t.due, false))}${late ? ' · ' + L.late : ''}</span>` : ''}</div>
  <span class="av">${esc(u.initials)}</span></div>`;
}
function viewFollow() {
  const L = T();
  const base = S.data.tasks.filter(t => S.person === 'all' || t.owner_id === +S.person);
  const shown = base.filter(t => S.taskView === 'open' ? !t.done : t.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const owners = [...new Set(S.data.tasks.map(t => t.owner_id))];
  return `<main class="main" style="gap:12px">
  <div class="seg"><button class="${S.taskView === 'open' ? 'on' : ''}" data-a="tv" data-id="open">${L.open} · ${base.filter(t => !t.done).length}</button><button class="${S.taskView === 'done' ? 'on' : ''}" data-a="tv" data-id="done">${L.done} · ${base.filter(t => t.done).length}</button></div>
  ${owners.length > 1 ? `<div class="chips scroll">${[['all', L.everyone], ...owners.map(id => [String(id), user(id).name])].map(([id, l]) => `<button class="chip${String(S.person) === id ? ' on' : ''}" data-a="person" data-id="${esc(id)}">${esc(l)}</button>`).join('')}</div>` : ''}
  ${shown.map(t => taskRow(t)).join('') || `<div class="empty">${L.nothing}</div>`}
  </main>`;
}
function viewSummary() {
  const L = T(), dn = S.data.notes.filter(n => n.date === S.day), ids = new Set(dn.map(n => n.id));
  const hot = dn.filter(n => n.priority === 'hot');
  const groups = GROUPS.map(g => ({g, c: dn.filter(n => n.groups.includes(g)).length})).filter(x => x.c).sort((a, b) => b.c - a.c);
  const open = S.data.tasks.filter(t => !t.done), owners = [...new Set(open.map(t => t.owner_id))];
  const exp = (k, label, extra = '') => `<button class="btn left${k === 'xlsx' ? ' primary' : ''}" data-a="export" data-id="${k}" ${extra}>${I.dl}${esc(label)}</button>`;
  return `<main class="main">
  <div class="stats"><div class="stat"><b>${dn.length}</b><span>${L.visits}</span></div><div class="stat"><b>${S.data.tasks.filter(t => ids.has(t.note_id)).length}</b><span>${L.newTasks}</span></div><div class="stat g"><b>${hot.length}</b><span>${L.hotLeads}</span></div></div>
  <div class="card" style="gap:2px"><h2 style="margin-bottom:6px">${L.byGroup}</h2>${groups.map(x => `<div class="grp"><img src="${ST}img/animals/${ICON[x.g]}.svg" alt=""><span class="grow" style="font-weight:600">${esc(L.groups[x.g])}</span><span class="num">${x.c}</span></div>`).join('') || `<span class="faint">${L.noNotes}</span>`}</div>
  <div class="card" style="gap:2px"><h2 style="margin-bottom:6px">${L.hotLeads}</h2>${hot.map(n => `<div class="grp" data-a="open" data-id="${esc(n.id)}" style="cursor:pointer"><span class="grow"><b>${esc(n.company)}</b><span class="muted">${where(n)}</span></span><b>→</b></div>`).join('') || `<span class="faint">${L.noHot}</span>`}</div>
  ${owners.length ? `<div class="card" style="gap:2px"><h2 style="margin-bottom:6px">${L.perPerson}</h2>${owners.map(id => `<div class="grp"><span class="av">${esc(user(id).initials)}</span><span class="grow" style="font-weight:600">${esc(user(id).name)}</span><span class="num">${open.filter(t => t.owner_id === id).length}</span></div>`).join('')}</div>` : ''}
  <div class="card" style="gap:10px"><h2>${L.export}</h2><p class="muted" style="margin:0">${L.exportDesc}</p>
  ${exp('csv', L.csvDay)}${exp('xlsx', L.xlsx)}<div class="two">${exp('json', 'JSON')}${exp('zip', 'ZIP + media')}</div></div>
  </main>`;
}
function viewDetail(n) {
  const L = T(), u = user(n.user_id), canEdit = isAdmin() || n.user_id === S.me.id;
  const rows = [[L.relation, (n.type === 'klant' ? L.customer : L.supplier) + ' · ' + ((L.stages[n.type] || {})[n.stage] || n.stage)], n.contact && [L.contact, n.contact],
    n.contact_role && [L.role, n.contact_role], n.contact_email && [L.email, n.contact_email], n.contact_phone && [L.phone, n.contact_phone], [L.group, n.groups.map(g => L.groups[g] || g).join(', ')], n.price && [L.price, n.price],
    [L.loggedAt, `${fmtD(n.date)}, ${n.time} ${L.by} ${u.name}`]].filter(Boolean);
  const tasks = S.data.tasks.filter(t => t.note_id === n.id);
  return `<header class="d-head"><div class="row-between" style="align-items:center"><button class="back" data-a="back" aria-label="Terug">${I.back}</button>${canEdit ? `<button class="ghost" data-a="edit">${L.edit}</button>` : ''}</div>
  <div style="padding-left:4px;display:flex;flex-direction:column;gap:6px"><div class="chips" style="gap:6px">${n.pending ? `<span class="pill p-pend">${L.pending}</span>` : ''}${prioPill(n.priority)}<span class="pill p-dark">${esc(n.type === 'klant' ? L.customer : L.supplier)}</span></div>
  <h1>${esc(n.company)}</h1><div class="m-sub">${where(n)}</div></div></header>
  <main class="main">
  <div class="card" style="gap:0;padding:6px 16px">${rows.map(r => `<div class="kv"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>
  ${n.text ? `<div class="card"><h2>${L.note}</h2><p style="margin:0;font-size:15px;line-height:1.55;white-space:pre-wrap">${esc(n.text)}</p></div>` : ''}
  ${n.attachments.length ? `<div class="card"><h2>${L.attachments}</h2><div class="thumbs">${n.attachments.map(a => `<a class="thumb" href="${esc(a.url)}" target="_blank" rel="noopener"><img src="${esc(a.url)}" alt="" loading="lazy">${a.kind !== 'photo' ? `<em>${a.kind === 'card' ? L.card : L.scan}</em>` : ''}</a>`).join('')}</div></div>` : ''}
  <div class="card" style="gap:0"><h2 style="margin-bottom:6px">${L.tasks}</h2>${tasks.map(t => taskRow(t, true)).join('') || `<span class="faint">${L.noVisitTasks}</span>`}</div>
  </main>`;
}
function viewForm() {
  const L = T(), f = S.form, st = STAGES[f.type];
  const inp = (id, key, label, ph = '', extra = '') => `<label class="fld"><span>${esc(label)}</span><input class="inp${key === 'company' && f.err ? ' err' : ''}" id="${id}" value="${esc(f[key])}" placeholder="${esc(ph)}" ${extra}></label>`;
  const dues = [[addDays(today(), 1), L.tomorrow], [addDays(today(), 3), L.in3], [addDays(today(), 7), L.week], [addDays(today(), 14), L.weeks2]];
  const thumbs = [...f.existing.filter(a => !f.removed.includes(a.id)).map(a => ({...a, old: true})), ...f.photos];
  const th = list => list.length ? `<div class="thumbs">${list.map(p => `<div class="thumb"><img src="${esc(p.url)}" alt="">${p.kind !== 'photo' ? `<em>${p.kind === 'card' ? L.card : L.scan}</em>` : ''}<button class="x" data-a="frm" data-id="${esc(p.id)}" aria-label="${esc(L.delete)}">×</button></div>`).join('')}</div>` : '';
  return `<div class="full"><div class="full-in">
  <div class="full-head"><button class="back" data-a="cancel" aria-label="${esc(L.cancel)}">${I.back}</button><h1>${f.edit ? L.editNote : L.newNote}</h1><span class="m-sub" style="padding-right:8px">${esc(fmtD(f.date))} · ${esc(f.time)}</span></div>
  <div class="full-body" id="fb">
  <div class="card" style="gap:12px"><span class="sec">${L.company}</span>
   <div class="seg">${['lev', 'klant'].map(t => `<button class="${f.type === t ? 'on' : ''}" data-a="ftype" data-id="${t}">${t === 'lev' ? L.supplier : L.customer}</button>`).join('')}</div>
   ${inp('f-company', 'company', L.company + ' *', L.companyPh, 'list="rels" autocomplete="off"')}${f.err ? `<div class="err-txt">${L.companyErr}</div>` : ''}
   <datalist id="rels">${S.data.relations.map(r => `<option value="${esc(r.name)}"></option>`).join('')}</datalist>
   ${inp('f-country', 'country', L.country, L.countryPh)}
   <div class="two">${inp('f-hall', 'hall', L.hall, '5A')}${inp('f-stand', 'stand', L.stand, 'B112')}</div>
   <label class="fld"><span>${L.stage}</span><select class="inp" id="f-stage">${st.map(s => `<option value="${s}" ${f.stage === s ? 'selected' : ''}>${esc(L.stages[f.type][s])}</option>`).join('')}</select></label>
  </div>
  <div class="card" style="gap:12px"><span class="sec">${L.contact}</span>${inp('f-contact', 'contact', L.name, L.name)}${inp('f-role', 'contact_role', L.role, L.rolePh)}
   <div class="two">${inp('f-email', 'contact_email', L.email, 'naam@bedrijf.com', 'type="email" inputmode="email" autocapitalize="none" autocorrect="off"')}${inp('f-phone', 'contact_phone', L.phone, '+31 …', 'type="tel"')}</div>
   <button class="add" data-a="pick" data-id="card">${I.card}${L.card}</button>
   ${th(thumbs.filter(p => p.kind === 'card'))}</div>
  <div class="card" style="gap:12px"><div style="display:flex;align-items:baseline;gap:8px"><span class="sec">${L.group}</span><span class="muted" style="font-size:12px">${L.groupHint}</span></div>
   <div class="chips">${GROUPS.map(g => `<button class="chip${f.groups.includes(g) ? ' on' : ''}" data-a="fgroup" data-id="${g}">${esc(L.groups[g])}</button>`).join('')}</div>
   <span class="sec" style="padding-top:4px">${L.priority}</span>
   <div class="two" style="gap:8px">${['hot', 'warm', 'cold'].map(p => `<button class="prio ${p}${f.priority === p ? ' on' : ''}" data-a="fprio" data-id="${p}">${esc(L.pri[p])}</button>`).join('')}</div></div>
  <div class="card" style="gap:12px"><label class="fld"><span class="sec">${L.note}</span><textarea class="inp" id="f-text" rows="5" placeholder="${esc(L.notePh)}">${esc(f.text)}</textarea></label>
   ${inp('f-price', 'price', L.price, L.pricePh)}
   <div class="two" style="gap:8px"><button class="add" data-a="pick" data-id="photo">${I.cam}${L.photo}</button><button class="add" data-a="pick" data-id="lib">${I.img}${L.library}</button></div>
   ${th(thumbs.filter(p => p.kind === 'photo'))}</div>
  <div class="card" style="gap:12px"><span class="sec">${L.scanTitle}</span><span class="muted">${L.scanDesc}</span>
   <div class="two" style="gap:8px"><button class="add" data-a="pick" data-id="scan">${I.scan}${L.scanCam}</button><button class="add" data-a="pick" data-id="scanlib">${I.img}${L.library}</button></div>
   ${th(thumbs.filter(p => p.kind === 'scan'))}</div>
  <div class="card" style="gap:12px"><label class="fld"><span class="sec">${L.taskLabel}</span><input class="inp" id="f-task" value="${esc(f.task)}" placeholder="${esc(L.taskPh)}"></label>
   <span style="font-size:13px;font-weight:700">${L.assign}</span>
   <div class="chips">${S.users.map(u => `<button class="chip${+f.owner === u.id ? ' on' : ''}" data-a="fowner" data-id="${u.id}" style="padding-left:4px"><span class="av">${esc(u.initials)}</span>${esc(u.name)}</button>`).join('')}</div>
   <span style="font-size:13px;font-weight:700">${L.due}</span>
   <div class="chips">${dues.map(([d, l]) => `<button class="chip${f.due === d ? ' on' : ''}" data-a="fdue" data-id="${d}">${esc(l)}</button>`).join('')}</div>
   <input class="inp" type="date" id="f-due" value="${esc(f.due)}"></div>
  ${f.edit ? `<button class="btn danger" data-a="delnote">${L.delNote}</button>` : ''}
  </div>
  <div class="full-foot"><button class="btn" data-a="cancel">${L.cancel}</button><button class="btn primary" data-a="save">${L.saveNote}</button></div>
  </div></div>`;
}
function viewSheet() {
  const L = T();
  if (S.meet) { const m = S.meet;
    const f = (k, label, type = 'text', extra = '') => `<label class="fld"><span>${esc(label)}</span><input class="inp${k === 'company' && m.err ? ' err' : ''}" id="m-${k}" type="${type}" value="${esc(m[k])}" ${extra}></label>`;
    return `<div class="sheet-bg" data-a="closesheet"></div><div class="sheet"><div class="grab"></div><h2 style="font-size:20px">${m.isNew ? L.newMeeting : L.meeting}</h2>
    ${f('company', L.company + ' *', 'text', 'list="rels2" autocomplete="off"')}<datalist id="rels2">${S.data.relations.map(r => `<option value="${esc(r.name)}"></option>`).join('')}</datalist>
    <div class="two">${f('date', L.date, 'date')}${f('time', L.time, 'time')}</div><div class="two">${f('hall', L.hall)}${f('stand', L.stand)}</div>${f('country', L.country)}
    <div class="two"><button class="btn" data-a="closesheet">${L.cancel}</button><button class="btn primary" data-a="savemeet">${L.save}</button></div>
    ${m.isNew ? '' : `<button class="btn danger" data-a="delmeet">${L.delete}</button>`}</div>`; }
  if (!S.sheet) return '';
  return `<div class="sheet-bg" data-a="closesheet"></div><div class="sheet"><div class="grab"></div><h2 style="font-size:20px">${L.settings}</h2>
  <div class="fld"><span>${L.language}</span><div class="seg">${[['nl', 'Nederlands'], ['en', 'English']].map(([id, l]) => `<button class="${S.lang === id ? 'on' : ''}" data-a="lang" data-id="${id}"><img src="${ST}img/flags/${id}.svg" alt="" style="width:18px;height:18px;border-radius:50%">${l}</button>`).join('')}</div></div>
  <div class="fld"><span>${L.loggedIn}</span><div class="card" style="flex-direction:row;align-items:center;gap:12px;box-shadow:none;border:1px solid #E1E4E5;padding:12px 14px"><span class="av" style="width:34px;height:34px;border-radius:17px">${esc(S.me.initials)}</span><span class="grow"><b>${esc(S.me.name)}</b><span class="muted">${esc(L.roles[S.me.role])} · ${esc(S.me.username)}</span></span></div></div>
  <div class="m-sub" style="color:#335773">${statusLine()}</div>
  <button class="btn" data-a="syncnow">${L.syncNow}</button>
  ${isAdmin() ? `<a class="btn" href="/admin">${L.admin}</a>` : ''}
  ${S.pwOpen ? `<div class="card" style="box-shadow:none;border:1px solid #E1E4E5;gap:10px"><label class="fld"><span>${L.pwOld}</span><input class="inp" type="password" id="pw-old" autocomplete="current-password"></label><label class="fld"><span>${L.pwNew}</span><input class="inp" type="password" id="pw-new" autocomplete="new-password"></label><button class="btn primary" data-a="pwsave">${L.pwSave}</button></div>` : `<button class="btn" data-a="pw">${L.pw}</button>`}
  <button class="btn danger" data-a="logout">${L.logout}</button></div>`;
}
function render() {
  if (!S.me) return;
  const L = T(), ae = document.activeElement, focusId = ae && ae.id, sel = focusId && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  const fbScroll = document.getElementById('fb')?.scrollTop || 0, y = window.scrollY;
  const detail = S.detail && S.data.notes.find(n => n.id === S.detail);
  let html = '';
  if (detail) html += viewDetail(detail);
  else { html += header(); html += ({today: viewToday, notes: viewNotes, follow: viewFollow, summary: viewSummary}[S.tab])(); }
  if (!detail && (S.tab === 'today' || S.tab === 'notes')) html += `<button class="fab" data-a="new">${I.plus}${L.newNote}</button>`;
  html += `<nav class="tabs"><div class="tabs-in">${['today', 'notes', 'follow', 'summary'].map((t, i) => `<button class="tab${!detail && S.tab === t ? ' on' : ''}" data-a="tab" data-id="${t}"><i>${I['t' + i]}</i>${L.tabs[i]}</button>`).join('')}</div></nav>`;
  if (S.form) html += viewForm();
  html += viewSheet();
  if (S.toast) html += `<div class="toast${S.toast.bad ? ' bad' : ''}">${S.toast.bad ? I.warn : I.ok}<div><b>${esc(S.toast.title)}</b>${S.toast.body ? `<span>${esc(S.toast.body)}</span>` : ''}</div></div>`;
  root.innerHTML = `<div class="m">${html}</div>`;
  document.documentElement.lang = S.lang;
  const fb = document.getElementById('fb'); if (fb) fb.scrollTop = fbScroll;
  window.scrollTo(0, y);
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus({preventScroll: true}); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
}

/* ---------- events ---------- */
const FKEY = Object.fromEntries(Object.entries(FIELDS).map(([k, v]) => [v, k]));
function track(e) {
  const t = e.target;
  if (t.id === 'q') { S.query = t.value; render(); return; }
  if (S.form && FKEY[t.id]) S.form[FKEY[t.id]] = t.value;
  if (S.meet && t.id && t.id.startsWith('m-')) S.meet[t.id.slice(2)] = t.value;
}
root.addEventListener('input', track);
root.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.task) toggleTask(t.dataset.task, t.checked);
  track(e);
  if (t.id === 'f-due' && S.form) render();
});
root.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, id = el.dataset.id, L = T();
  if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
  if (S.form) readForm();
  switch (a) {
    case 'tab': S.tab = id; S.detail = null; window.scrollTo(0, 0); break;
    case 'day': S.day = id; break;
    case 'open': S.detail = id; window.scrollTo(0, 0); break;
    case 'back': S.detail = null; break;
    case 'new': S.form = newForm(); break;
    case 'meeting': { const m = S.data.meetings.find(x => x.id === id); if (!m) break;
      if (m.note_id && S.data.notes.some(n => n.id === m.note_id)) { S.detail = m.note_id; window.scrollTo(0, 0); }
      else S.form = newForm({company: m.company, country: m.country, hall: m.hall, stand: m.stand, meeting_id: m.id, date: m.date}); break; }
    case 'addmeet': S.meet = {id: rid(), isNew: true, company: '', date: S.day, time: '10:00', hall: '', stand: '', country: ''}; break;
    case 'editmeet': { const m = S.data.meetings.find(x => x.id === id); if (m) S.meet = {...m, isNew: false}; break; }
    case 'savemeet': return saveMeeting();
    case 'delmeet': return deleteMeeting();
    case 'closesheet': S.sheet = false; S.meet = null; S.pwOpen = false; break;
    case 'settings': S.sheet = true; break;
    case 'lang': S.lang = id; localStorage.setItem('lcrm-lang', id); break;
    case 'syncnow': await flush(); return;
    case 'pw': S.pwOpen = true; break;
    case 'pwsave': { const o = document.getElementById('pw-old').value, n = document.getElementById('pw-new').value;
      try { const r = await fetch('/api/password', {method: 'POST', headers: J, body: JSON.stringify({old: o, new: n})}); const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Fout'); S.pwOpen = false; toast(L.pwOk, ''); } catch (x) { toast(L.syncErr, x.message === 'Failed to fetch' ? L.offlineExport : x.message, true); } return; }
    case 'logout': if (S.pending && !confirm(L.logoutPending)) return;
      try { await fetch('/api/logout', {method: 'POST', headers: H}); } catch (x) {} await outbox.clear();
      localStorage.removeItem(cacheKey()); localStorage.removeItem('lcrm-last-me'); location.href = '/login'; return;
    case 'filter': S.filter = id; break;
    case 'tv': S.taskView = id; break;
    case 'person': S.person = id; break;
    case 'taskrel': { const t = S.data.tasks.find(x => x.id === id); if (!t) break;
      const n = (t.note_id && S.data.notes.find(x => x.id === t.note_id)) || S.data.notes.find(x => x.company === t.company);
      if (n) { S.detail = n.id; window.scrollTo(0, 0); } break; }
    case 'edit': { const n = S.data.notes.find(x => x.id === S.detail); if (!n) break;
      S.form = newForm({...n, id: n.id, edit: true, groups: [...n.groups], existing: n.attachments, photos: [], removed: [], task: '', meeting_id: null}); break; }
    case 'cancel': S.form = null; break;
    case 'save': return saveNote();
    case 'delnote': return deleteNote();
    case 'ftype': S.form.type = id; if (!STAGES[id].includes(S.form.stage)) S.form.stage = 'lead'; break;
    case 'fgroup': S.form.groups = S.form.groups.includes(id) ? S.form.groups.filter(g => g !== id) : [...S.form.groups, id]; break;
    case 'fprio': S.form.priority = id; break;
    case 'fowner': S.form.owner = +id; break;
    case 'fdue': S.form.due = id; break;
    case 'pick': document.getElementById('in-' + id).click(); return;
    case 'frm': { const p = S.form.photos.find(x => x.id === id); if (p) { URL.revokeObjectURL(p.url); S.form.photos = S.form.photos.filter(x => x.id !== id); } else S.form.removed.push(id); break; }
    case 'export': {
      if (!S.online) { toast(L.offlineExport, '', true); return; }
      const url = {csv: '/api/export/csv?what=notes&date=' + S.day, xlsx: '/api/export/xlsx', json: '/api/export/json', zip: '/api/export/zip'}[id];
      const link = document.createElement('a'); link.href = url; link.download = ''; document.body.appendChild(link); link.click(); link.remove(); return; }
    default: return;
  }
  render();
});
window.addEventListener('online', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); });

/* ---------- start ---------- */
(async function boot() {
  try {
    const r = await fetch('/api/me');
    if (r.status === 401) { location.href = '/login'; return; }
    if (!r.ok) throw new Error();
    const j = await r.json(); S.me = j.user; S.users = j.users; S.settings = j.settings; S.online = true; if (j.user.must_change) { location.href = '/login?change=1'; return; }
    try { const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); if (c) S.data = c.data; } catch (e) {}
  } catch (e) {
    S.online = false;
    try { const me = JSON.parse(localStorage.getItem('lcrm-last-me') || 'null'); if (me) { S.me = me; const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); if (c) { S.data = c.data; S.users = c.users; S.settings = c.settings; } } } catch (x) {}
    if (!S.me) { root.innerHTML = '<div class="loading">Geen verbinding met de laptop. Controleer of je op hetzelfde wifi-netwerk zit en probeer opnieuw.</div>'; setTimeout(boot, 5000); return; }
  }
  const ds = days(); S.day = ds.includes(today()) ? today() : ds[0];
  S.pending = (await outbox.all()).length;
  render();
  await flush();
  setInterval(flush, 20000);
})();
})();
