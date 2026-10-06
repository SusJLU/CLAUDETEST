/* Luiten CRM – beheerdersdashboard */
(() => {
'use strict';
const ST = window.STATIC || '/static/';
const root = document.getElementById('root');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const MON = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'], WD = ['zo','ma','di','wo','do','vr','za'];
const fmtD = s => { if (!s) return ''; const d = new Date(s.slice(0, 10) + 'T12:00:00'); return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtTs = s => s ? fmtD(s) + ' ' + s.slice(11, 16) : '—';
const eur = v => v >= 1e6 ? '€ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' mln' : v >= 1000 ? '€ ' + Math.round(v / 1000) + 'k' : '€ ' + (v || 0);
const H = {'X-LCRM': '1'}, J = {...H, 'Content-Type': 'application/json'};
const genPw = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; return [...crypto.getRandomValues(new Uint8Array(12))].map(x => c[x % c.length]).join('').replace(/(.{4})(?=.)/g, '$1-'); };
const GROUPS = {beef:'Rund',lamb:'Lam',poultry:'Gevogelte',game:'Wild',pork:'Ibérico / varken',duck:'Eend & gans',other:'Overig'};
const ICON = {beef:'rund',lamb:'lam',poultry:'kip',game:'hert',pork:'varken',duck:'eend',other:'rund'};
const STAGES = {lev:[['lead','Lead'],['specs','Monsters & specs'],['prijs','Prijsonderhandeling'],['proef','Proeforder'],['vast','Vaste leverancier']],
  klant:[['lead','Lead'],['offerte','Offerte'],['onderh','Onderhandeling'],['won','Gewonnen'],['lost','Verloren']]};
const CLOSED = ['vast','won','lost'];
const COLS = ['#CCE5A8','#98CD50','#3EA448','#335773','#022D4E'];
const PRI = {hot:'Hot lead',warm:'Warm',cold:'Koud'};
const ROLE = {beheerder:'Beheerder',inkoop:'Inkoop',verkoop:'Verkoop'};
const stageLabel = r => ((STAGES[r.type] || []).find(s => s[0] === r.stage) || ['', r.stage])[1];
const NAV = [['dash','Dashboard'],['notes','Notities'],['rel','Relaties'],['pipe','Pijplijn'],['task','Acties'],['users','Gebruikers'],['export','Export & beurs']];

const S = {me: null, users: [], allUsers: [], settings: {}, lan: '', data: {notes: [], tasks: [], meetings: [], relations: []},
  screen: localStorage.getItem('lcrm-admin-screen') || 'dash', q: '', type: 'all', owner: 'all', noteUser: 'all', noteDay: 'all', pipe: 'lev',
  tf: 'open', towner: 'all', drawer: null, drag: null, toast: null, newPw: ''};
const U = id => S.allUsers.find(u => u.id === id) || S.users.find(u => u.id === id) || {name: '—', initials: '?'};
const rel = id => S.data.relations.find(r => r.id === id);
let tt;
function toast(title, body, bad) { clearTimeout(tt); S.toast = {title, body, bad}; render(); tt = setTimeout(() => { S.toast = null; render(); }, 3500); }
async function api(url, method = 'GET', body) {
  const r = await fetch(url, {method, headers: body ? J : H, body: body ? JSON.stringify(body) : undefined});
  if (r.status === 401) { location.href = '/login'; throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Fout ' + r.status);
  return j;
}
async function load() {
  try {
    const [me, data, users] = await Promise.all([api('/api/me'), api('/api/data'), api('/api/admin/users')]);
    if (me.user.must_change) { location.href = '/login?change=1'; return; }
    if (me.user.role !== 'beheerder') { location.href = '/app'; return; }
    S.me = me.user; S.users = me.users; S.settings = me.settings; S.lan = me.url; S.data = data; S.allUsers = users;
  } catch (e) { if (e.message !== 'auth') toast('Kon gegevens niet laden', e.message, true); }
  render();
}
const run = async (fn, okTitle, okBody) => { try { await fn(); if (okTitle) toast(okTitle, okBody || ''); await load(); } catch (e) { toast('Niet gelukt', e.message, true); } };

/* ---------- views ---------- */
const avatar = (id, s = 26) => `<span class="av" style="width:${s}px;height:${s}px;border-radius:${s / 2}px;background:#022D4E">${esc(U(id).initials)}</span>`;
const typeBadge = t => `<span class="badge b-${t === 'klant' ? 'klant' : 'lev'}">${t === 'klant' ? 'Klant' : 'Leverancier'}</span>`;
const late = t => !t.done && t.due && t.due < today();
function vDash() {
  const R = S.data.relations, active = R.filter(r => !CLOSED.includes(r.stage)), open = S.data.tasks.filter(t => !t.done), lateN = open.filter(late).length;
  const kpi = (l, v, sub, c = '#022D4E') => `<div class="sq kpi"><small>${l}</small><b style="color:${c}">${v}</b><span class="faint" style="font-size:13px">${sub}</span></div>`;
  const funnel = t => { const rs = R.filter(r => r.type === t), max = Math.max(1, ...STAGES[t].map(([k]) => rs.filter(r => r.stage === k).length));
    return `<div class="sq panel"><div class="row-between"><h2>${t === 'lev' ? 'Inkoop · leveranciers' : 'Verkoop · klanten'}</h2><span class="faint" style="font-size:13px">${rs.length} relaties</span></div>
    ${STAGES[t].map(([k, l], i) => { const c = rs.filter(r => r.stage === k); return `<div class="bar" data-a="topipe" data-id="${t}"><span>${l}</span><div><i style="width:${c.length / max * 100}%;background:${COLS[i]}"></i></div><b>${c.length} · ${eur(c.reduce((a, r) => a + r.value, 0))}</b></div>`; }).join('')}</div>`; };
  const team = S.allUsers.filter(u => u.role !== 'beheerder' && u.active).map(u => ({u, rel: R.filter(r => r.owner_id === u.id).length, notes: S.data.notes.filter(n => n.user_id === u.id).length,
    open: open.filter(t => t.owner_id === u.id).length, late: open.filter(t => t.owner_id === u.id && late(t)).length})).sort((a, b) => b.notes - a.notes);
  return `<div class="kpis">${kpi('Actieve deals', active.length, R.length + ' relaties totaal')}${kpi('Inkoop in pijplijn', eur(active.filter(r => r.type === 'lev').reduce((a, r) => a + r.value, 0)), 'verwachte waarde per jaar')}
  ${kpi('Verkoop in pijplijn', eur(active.filter(r => r.type === 'klant').reduce((a, r) => a + r.value, 0)), 'verwachte waarde per jaar', '#3EA448')}${kpi('Open acties', open.length, lateN + ' te laat', lateN ? '#C0392B' : '#022D4E')}</div>
  <div class="grid2">${funnel('lev')}${funnel('klant')}</div>
  <div class="grid2">
  <div class="sq"><div class="panel" style="padding-bottom:4px"><h2>Team</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Medewerker</th><th class="r">Notities</th><th class="r">Relaties</th><th class="r">Open acties</th></tr></thead><tbody>
  ${team.map(x => `<tr><td><span style="display:flex;align-items:center;gap:10px">${avatar(x.u.id)}${esc(x.u.name)} <span class="faint">· ${ROLE[x.u.role]}</span></span></td><td class="r">${x.notes}</td><td class="r">${x.rel}</td><td class="r" style="font-weight:600;color:${x.late ? '#C0392B' : 'inherit'}">${x.open}</td></tr>`).join('') || '<tr><td colspan="4" class="faint">Nog geen medewerkers. Maak ze aan bij Gebruikers.</td></tr>'}
  </tbody></table></div></div>
  <div class="sq"><div class="panel" style="padding-bottom:4px"><h2>Laatste notities</h2></div>
  ${S.data.notes.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 8).map(n => `<div class="line click" data-a="rel" data-id="${n.relation_id}" style="padding:12px 20px">${avatar(n.user_id)}<div class="grow"><b>${esc(n.company)}</b><span class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(n.text || '—')}</span></div><span class="faint" style="font-size:12px;white-space:nowrap">${esc(fmtD(n.date))} ${esc(n.time)}</span></div>`).join('') || '<div class="line faint" style="padding:12px 20px">Nog geen notities.</div>'}
  </div></div>`;
}
function vNotes() {
  const q = S.q.trim().toLowerCase(), dates = [...new Set(S.data.notes.map(n => n.date))].sort().reverse();
  const list = S.data.notes.filter(n => (S.noteUser === 'all' || n.user_id === +S.noteUser) && (S.noteDay === 'all' || n.date === S.noteDay) &&
    (!q || [n.company, n.contact, n.text, n.country, n.stand, n.contact_email].join(' ').toLowerCase().includes(q)));
  return `<div class="toolbar"><div class="a-search">${'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#668196" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'}<input id="q" value="${esc(S.q)}" placeholder="Zoek bedrijf, contact, tekst"></div>
  <select class="sel" id="noteUser"><option value="all">Alle medewerkers</option>${S.allUsers.map(u => `<option value="${u.id}" ${String(u.id) === String(S.noteUser) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
  <select class="sel" id="noteDay"><option value="all">Alle dagen</option>${dates.map(d => `<option value="${d}" ${d === S.noteDay ? 'selected' : ''}>${fmtD(d)}</option>`).join('')}</select>
  <span class="faint" style="margin-left:auto;font-size:13px">${list.length} notities</span></div>
  <div class="sq tbl-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Bedrijf</th><th>Medewerker</th><th>Prioriteit</th><th>Notitie</th><th class="r">Bijlagen</th></tr></thead><tbody>
  ${list.map(n => `<tr class="click" data-a="rel" data-id="${n.relation_id}"><td style="white-space:nowrap">${esc(fmtD(n.date))} ${esc(n.time)}</td><td><b>${esc(n.company)}</b><div class="faint" style="font-size:12px">${esc([n.country, n.hall && 'Hal ' + n.hall, n.stand].filter(Boolean).join(' · '))}</div></td>
  <td><span style="display:flex;align-items:center;gap:8px">${avatar(n.user_id, 24)}${esc(U(n.user_id).name)}</span></td><td><span class="pill p-${esc(n.priority)}">${esc(PRI[n.priority] || n.priority)}</span></td><td><div class="clamp">${esc(n.text)}</div></td><td class="r">${n.attachments.length || ''}</td></tr>`).join('') || '<tr><td colspan="6" class="faint" style="text-align:center;padding:28px">Geen notities gevonden.</td></tr>'}
  </tbody></table></div>`;
}
function vRel() {
  const q = S.q.trim().toLowerCase();
  const list = S.data.relations.filter(r => (S.type === 'all' || r.type === S.type) && (S.owner === 'all' || r.owner_id === +S.owner) && (!q || [r.name, r.country, r.csb].join(' ').toLowerCase().includes(q)));
  return `<div class="toolbar"><div class="a-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#668196" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" value="${esc(S.q)}" placeholder="Zoek bedrijf, land, CSB-nr."></div>
  <div class="pills">${[['all','Alle'],['lev','Leveranciers'],['klant','Klanten']].map(([k, l]) => `<button class="${S.type === k ? 'on' : ''}" data-a="type" data-id="${k}">${l}</button>`).join('')}</div>
  <select class="sel" id="owner"><option value="all">Alle eigenaren</option>${S.allUsers.map(u => `<option value="${u.id}" ${String(u.id) === String(S.owner) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
  <span class="faint" style="margin-left:auto;font-size:13px">${list.length} relaties</span></div>
  <div class="sq tbl-wrap"><table class="tbl"><thead><tr><th>Bedrijf</th><th>Type</th><th>Land</th><th>Fase</th><th>Eigenaar</th><th class="r">Waarde/jaar</th><th>CSB-nr.</th><th class="r">Notities</th></tr></thead><tbody>
  ${list.map(r => `<tr class="click" data-a="rel" data-id="${r.id}"><td><b>${esc(r.name)}</b>${r.last_note ? `<div class="faint" style="font-size:12px">laatst ${esc(fmtD(r.last_note))}</div>` : ''}</td><td>${typeBadge(r.type)}</td><td>${esc(r.country)}</td><td>${esc(stageLabel(r))}</td>
  <td><span style="display:flex;align-items:center;gap:8px">${avatar(r.owner_id, 24)}${esc(U(r.owner_id).name.split(' ')[0])}</span></td><td class="r">${r.value ? eur(r.value) : '—'}</td><td style="font-family:var(--disp);color:${r.csb ? 'inherit' : '#99ABB9'}">${esc(r.csb || 'nog niet')}</td><td class="r">${r.note_count}</td></tr>`).join('') || '<tr><td colspan="8" class="faint" style="text-align:center;padding:28px">Geen relaties gevonden.</td></tr>'}
  </tbody></table></div>`;
}
function vPipe() {
  const rs = S.data.relations.filter(r => r.type === S.pipe);
  return `<div class="toolbar"><div class="pills">${[['lev','Inkoop'],['klant','Verkoop']].map(([k, l]) => `<button class="${S.pipe === k ? 'on' : ''}" data-a="pipe" data-id="${k}">${l}</button>`).join('')}</div>
  <span class="faint" style="font-size:14px">${rs.length} relaties · ${eur(rs.filter(r => r.stage !== 'lost').reduce((a, r) => a + r.value, 0))} verwachte waarde</span><span class="faint" style="margin-left:auto;font-size:13px">Sleep een kaart naar een andere fase</span></div>
  <div class="kan">${STAGES[S.pipe].map(([k, l], i) => { const c = rs.filter(r => r.stage === k);
    return `<div class="col" data-col="${k}"><div class="col-h" style="border-color:${COLS[i]}"><div><span>${l}</span><span style="color:#668196">${c.length}</span></div><span class="faint" style="font-size:12px">${eur(c.reduce((a, r) => a + r.value, 0))}</span></div>
    ${c.map(r => `<div class="kc" draggable="true" data-drag="${r.id}" data-a="rel" data-id="${r.id}"><div class="row-between" style="align-items:flex-start"><b style="font-size:14px;line-height:1.3">${esc(r.name)}</b>${avatar(r.owner_id, 24)}</div><span class="faint" style="font-size:12px">${esc(r.country || '')}</span><span style="font-family:var(--disp);font-size:15px">${r.value ? eur(r.value) : '—'}</span></div>`).join('')}</div>`; }).join('')}</div>`;
}
function vTask() {
  const base = S.data.tasks.filter(t => S.towner === 'all' || t.owner_id === +S.towner);
  const list = base.filter(t => S.tf === 'open' ? !t.done : S.tf === 'late' ? late(t) : S.tf === 'done' ? t.done : true).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  return `<div class="toolbar"><div class="pills">${[['open','Open'],['late','Te laat · ' + base.filter(late).length],['done','Klaar'],['all','Alle']].map(([k, l]) => `<button class="${S.tf === k ? 'on' : ''}" data-a="tf" data-id="${k}">${l}</button>`).join('')}</div>
  <select class="sel" id="towner"><option value="all">Alle medewerkers</option>${S.allUsers.map(u => `<option value="${u.id}" ${String(u.id) === String(S.towner) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
  <div class="sq tbl-wrap"><table class="tbl"><thead><tr><th style="width:40px"></th><th>Actie</th><th>Relatie</th><th>Eigenaar</th><th>Deadline</th><th></th></tr></thead><tbody>
  ${list.map(t => `<tr><td><input type="checkbox" class="cb" data-task="${esc(t.id)}" ${t.done ? 'checked' : ''}></td><td style="font-weight:600;${t.done ? 'text-decoration:line-through;color:#99ABB9' : ''}">${esc(t.text)}</td>
  <td>${t.relation_id ? `<a href="#" data-a="rel" data-id="${t.relation_id}" style="color:#3EA448">${esc(t.company || '')}</a>` : ''}</td><td><span style="display:flex;align-items:center;gap:8px">${avatar(t.owner_id, 24)}${esc(U(t.owner_id).name)}</span></td>
  <td style="white-space:nowrap;${late(t) ? 'color:#C0392B;font-weight:600' : ''}">${t.due ? esc(fmtD(t.due)) + (late(t) ? ' · te laat' : '') : '—'}</td><td class="r"><button class="abtn small" data-a="deltask" data-id="${esc(t.id)}">Verwijder</button></td></tr>`).join('') || '<tr><td colspan="6" class="faint" style="text-align:center;padding:28px">Geen acties in deze lijst.</td></tr>'}
  </tbody></table></div>`;
}
function vUsers() {
  const rnd = S.newPw || (S.newPw = genPw());
  return `<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr))">
  <div class="sq tbl-wrap"><table class="tbl"><thead><tr><th>Gebruiker</th><th>Rol</th><th>Status</th><th>Laatst actief</th><th></th></tr></thead><tbody>
  ${S.allUsers.map(u => `<tr><td><span style="display:flex;align-items:center;gap:10px">${avatar(u.id, 32)}<span><b>${esc(u.name)}</b><div class="faint" style="font-size:12px">${esc(u.username)}</div></span></span></td>
  <td><select class="sel" data-role="${u.id}" style="min-width:130px" ${u.id === S.me.id ? 'disabled' : ''}>${Object.entries(ROLE).map(([k, l]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
  <td>${u.active ? '<span class="badge b-klant">Actief</span>' : '<span class="badge b-off">Uit</span>'}</td><td class="faint" style="white-space:nowrap">${esc(fmtTs(u.last_seen))}</td>
  <td class="r" style="white-space:nowrap">${u.id === S.me.id ? '<span class="faint" style="font-size:12px">eigen account: via tandwiel in de app</span>' : `<button class="abtn small" data-a="pwreset" data-id="${u.id}">Wachtwoord</button> `}${u.id === S.me.id ? '' : `<button class="abtn small" data-a="toggleuser" data-id="${u.id}">${u.active ? 'Uitschakelen' : 'Activeren'}</button>`}</td></tr>`).join('')}
  </tbody></table></div>
  <div style="display:flex;flex-direction:column;gap:16px">
  <div class="sq panel"><h2>Nieuwe gebruiker</h2><div class="form">
  <label class="fld wide"><span>Naam</span><input class="inp" id="nu-name" placeholder="bijv. Sander Verbeek"></label>
  <label class="fld"><span>Gebruikersnaam</span><input class="inp" id="nu-username" placeholder="bijv. sander" autocapitalize="none"></label>
  <label class="fld"><span>Rol</span><select class="inp" id="nu-role"><option value="inkoop">Inkoop</option><option value="verkoop">Verkoop</option><option value="beheerder">Beheerder</option></select></label>
  <label class="fld wide"><span>Startwachtwoord</span><input class="inp" id="nu-pw" value="${esc(rnd)}"></label>
  </div><button class="abtn primary" data-a="createuser" style="align-self:flex-start">Gebruiker aanmaken</button>
  <span class="faint" style="font-size:13px">Geef de gebruikersnaam en het startwachtwoord persoonlijk door. Bij de eerste keer inloggen kiest de collega zelf een nieuw wachtwoord.</span></div>
  <div class="navy-box"><h2>Rechten per rol</h2>
  <div><b style="color:#98CD50;font-family:var(--disp);text-transform:uppercase">Beheerder</b><p>Ziet alle notities, relaties, acties en afspraken. Beheert gebruikers, wijst relaties toe, exporteert alles.</p></div>
  <div><b style="color:#98CD50;font-family:var(--disp);text-transform:uppercase">Inkoop / Verkoop</b><p>Ziet alleen eigen notities, afspraken, eigen relaties en acties die aan hem of haar zijn toegewezen. Exporteert alleen eigen data.</p></div></div>
  </div></div>`;
}
function vExport() {
  const s = S.settings, b = (href, l, p) => `<a class="abtn${p ? ' primary' : ''}" href="${href}" download>${l}</a>`;
  return `<div class="grid2">
  <div class="sq panel"><h2>Exporteren</h2><p class="faint" style="margin:0;line-height:1.5">Alle gegevens van het hele team. Excel bevat de tabbladen Notities, Acties, Relaties en Afspraken. De ZIP heeft een map per relatie met visitekaartjes, foto’s, gescande notities en notities.txt, plus overzicht.xlsx met per bestand de relatie en contactpersoon.</p>
  <div class="pills" style="gap:10px">${b('/api/export/xlsx', 'Excel (alles)', true)}${b('/api/export/zip', 'ZIP met foto’s')}${b('/api/export/json', 'JSON')}</div>
  <div class="pills" style="gap:10px">${b('/api/export/csv?what=notes', 'CSV notities')}${b('/api/export/csv?what=tasks', 'CSV acties')}${b('/api/export/csv?what=relations', 'CSV relaties')}${b('/api/export/csv?what=meetings', 'CSV afspraken')}</div></div>
  <div class="sq panel"><h2>Beurs</h2><div class="form">
  <label class="fld wide"><span>Naam</span><input class="inp" id="ev-name" value="${esc(s.event_name)}"></label>
  <label class="fld wide"><span>Locatie</span><input class="inp" id="ev-place" value="${esc(s.event_place)}"></label>
  <label class="fld"><span>Eerste dag</span><input class="inp" type="date" id="ev-start" value="${esc(s.event_start)}"></label>
  <label class="fld"><span>Aantal dagen</span><input class="inp" type="number" min="1" max="14" id="ev-days" value="${esc(s.event_days)}"></label>
  </div><button class="abtn primary" data-a="savesettings" style="align-self:flex-start">Opslaan</button>
  <span class="faint" style="font-size:13px">De dagknoppen in de app volgen deze datums. Vandaag wordt altijd extra getoond als het geen beursdag is.</span></div>
  <div class="navy-box"><h2>Telefoons verbinden</h2><p>Open op de telefoon dit adres in Safari of Chrome:</p><b style="font-family:var(--disp);font-size:22px;color:#98CD50;word-break:break-all">${esc(S.lan)}/app</b>
  <p>Kies daarna Delen → Zet op beginscherm (iPhone) of ⋮ → Toevoegen aan startscherm (Android).</p></div>
  <div class="navy-box"><h2>Back-up</h2><p>Alle gegevens staan in de map <b>data</b> naast app.py. Dubbelklik <b>backup.bat</b> aan het eind van elke beursdag, of kopieer de map naar een USB-stick.</p></div>
  </div>`;
}
function vDrawer() {
  if (!S.drawer) return '';
  const isNew = S.drawer === 'new', r = isNew ? {name: '', type: 'lev', country: '', stage: 'lead', owner_id: S.me.id, value: 0, csb: ''} : rel(S.drawer);
  if (!r) return '';
  const notes = isNew ? [] : S.data.notes.filter(n => n.relation_id === r.id), tasks = isNew ? [] : S.data.tasks.filter(t => t.relation_id === r.id);
  const userOpts = S.allUsers.filter(u => u.active).map(u => `<option value="${u.id}" ${u.id === r.owner_id ? 'selected' : ''}>${esc(u.name)}</option>`).join('');
  return `<div class="drawer-bg" data-a="close"></div><aside class="drawer"><div class="dr-head"><div class="row-between" style="align-items:center">${isNew ? '<span class="a-eyebrow">Nieuwe relatie</span>' : typeBadge(r.type)}<button class="x" data-a="close" aria-label="Sluiten">×</button></div>
  <h2>${esc(r.name || 'Nieuwe relatie')}</h2>${isNew ? '' : `<span style="font-size:14px;color:#CCE5A8">${notes.length} notities · aangemaakt ${esc(fmtD(r.created_at))}</span>`}</div>
  <div class="dr-body">
  <div class="sq panel"><div class="form">
  <label class="fld wide"><span>Naam</span><input class="inp" id="r-name" value="${esc(r.name)}"></label>
  <label class="fld"><span>Type</span><select class="inp" id="r-type"><option value="lev" ${r.type === 'lev' ? 'selected' : ''}>Leverancier</option><option value="klant" ${r.type === 'klant' ? 'selected' : ''}>Klant</option></select></label>
  <label class="fld"><span>Land</span><input class="inp" id="r-country" value="${esc(r.country)}"></label>
  ${isNew ? '' : `<label class="fld"><span>Fase</span><select class="inp" id="r-stage">${STAGES[r.type].map(([k, l]) => `<option value="${k}" ${r.stage === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`}
  <label class="fld"><span>Eigenaar</span><select class="inp" id="r-owner">${userOpts}</select></label>
  <label class="fld"><span>Verwachte waarde (€/jaar)</span><input class="inp" type="number" min="0" step="1000" id="r-value" value="${esc(r.value)}"></label>
  <label class="fld"><span>CSB-nummer</span><input class="inp" id="r-csb" value="${esc(r.csb)}" placeholder="nog niet in CSB"></label>
  </div><button class="abtn primary" data-a="${isNew ? 'createrel' : 'saverel'}" style="align-self:flex-start">${isNew ? 'Relatie aanmaken' : 'Opslaan'}</button></div>
  ${isNew ? '' : `
  <div style="display:flex;flex-direction:column;gap:10px"><h2 style="font-size:16px">Notities</h2>
  ${notes.map(n => `<div class="sq" style="padding:14px 16px;display:flex;flex-direction:column;gap:8px"><div class="row-between" style="font-size:12px;color:#668196"><span>${esc(U(n.user_id).name)} · ${esc(fmtD(n.date))} ${esc(n.time)}${n.hall || n.stand ? ' · Hal ' + esc(n.hall) + ' ' + esc(n.stand) : ''}</span><span class="pill p-${esc(n.priority)}">${esc(PRI[n.priority] || '')}</span></div>
  ${n.contact ? `<span style="font-size:13px"><b>${esc(n.contact)}</b>${n.contact_role ? ' · ' + esc(n.contact_role) : ''}${n.contact_email ? ' · <a href="mailto:' + esc(n.contact_email) + '">' + esc(n.contact_email) + '</a>' : ''}${n.contact_phone ? ' · ' + esc(n.contact_phone) : ''}</span>` : ''}
  <span style="font-size:14px;line-height:1.55;white-space:pre-wrap">${esc(n.text || '—')}</span>
  ${n.price ? `<span style="font-size:13px;background:#F1F8E7;padding:6px 8px">${esc(n.price)}</span>` : ''}
  <span class="faint" style="font-size:12px">${esc(n.groups.map(g => GROUPS[g] || g).join(', '))}</span>
  ${n.attachments.length ? `<div class="a-thumbs">${n.attachments.map(a => `<a href="${esc(a.url)}" target="_blank" rel="noopener" title="${a.kind === 'card' ? 'Visitekaartje' : a.kind === 'scan' ? 'Gescande notitie' : 'Foto'}"><img src="${esc(a.url)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}
  <button class="abtn small" data-a="delnote" data-id="${esc(n.id)}" style="align-self:flex-start">Notitie verwijderen</button></div>`).join('') || '<span class="faint">Geen notities.</span>'}</div>
  <div style="display:flex;flex-direction:column;gap:10px"><h2 style="font-size:16px">Acties</h2>
  ${tasks.map(t => `<div class="sq" style="padding:12px 16px;display:flex;gap:10px;align-items:center"><input type="checkbox" class="cb" style="margin:0" data-task="${esc(t.id)}" ${t.done ? 'checked' : ''}><span class="grow"><b style="${t.done ? 'text-decoration:line-through;color:#99ABB9' : ''}">${esc(t.text)}</b><span class="faint" style="font-size:12px;${late(t) ? 'color:#C0392B' : ''}">${t.due ? 'Deadline ' + esc(fmtD(t.due)) : 'Geen deadline'}</span></span>${avatar(t.owner_id)}</div>`).join('') || '<span class="faint">Geen acties.</span>'}
  <div class="sq panel" style="padding:14px"><div class="form"><label class="fld wide"><span>Nieuwe actie</span><input class="inp" id="t-text" placeholder="bijv. Offerte sturen"></label>
  <label class="fld"><span>Eigenaar</span><select class="inp" id="t-owner">${userOpts}</select></label><label class="fld"><span>Deadline</span><input class="inp" type="date" id="t-due"></label></div>
  <button class="abtn small" data-a="addtask" style="align-self:flex-start">Actie toevoegen</button></div></div>
  <div class="sq panel" style="padding:14px"><h2 style="font-size:15px">Dubbele relatie samenvoegen</h2><span class="faint" style="font-size:13px">Verplaatst alle notities en acties van deze relatie naar de gekozen relatie en verwijdert deze.</span>
  <div class="toolbar"><select class="sel" id="merge-into" style="flex:1"><option value="">Kies relatie…</option>${S.data.relations.filter(x => x.id !== r.id).map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select><button class="abtn small" data-a="merge">Samenvoegen</button></div></div>`}
  </div></aside>`;
}
function render() {
  if (!S.me) return;
  const ae = document.activeElement, fid = ae && ae.id, sel = fid && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  const drs = document.querySelector('.dr-body')?.scrollTop || 0;
  const open = S.data.tasks.filter(late).length;
  const titles = {dash: ['Dashboard', 'Overzicht van het hele team'], notes: ['Notities', 'Alles wat het team heeft vastgelegd'], rel: ['Relaties', 'Leveranciers en klanten'],
    pipe: ['Pijplijn', 'Inkoop en verkoop per fase'], task: ['Acties', 'Alle acties van het team'], users: ['Gebruikers & rechten', S.allUsers.length + ' gebruikers'], export: ['Export & beurs', S.settings.event_name || '']};
  const [title, sub] = titles[S.screen] || titles.dash;
  const view = {dash: vDash, notes: vNotes, rel: vRel, pipe: vPipe, task: vTask, users: vUsers, export: vExport}[S.screen] || vDash;
  root.innerHTML = `<div class="a"><aside class="a-side"><div style="display:flex;flex-direction:column;gap:12px;padding:0 8px"><img src="${ST}img/logo-wide.png" alt="Luiten Food × Thomas Foods International"><span class="a-eyebrow">Relatiebeheer</span></div>
  <nav class="a-nav">${NAV.map(([k, l]) => `<button class="${S.screen === k ? 'on' : ''}" data-a="nav" data-id="${k}">${l}${k === 'task' && open ? `<span class="cnt">${open}</span>` : ''}</button>`).join('')}</nav>
  <div class="a-foot"><span>${esc(S.me.name)} · beheerder</span><span style="word-break:break-all">Telefoons: <b style="color:#fff">${esc(S.lan)}/app</b></span><a href="/app" style="color:#98CD50">Mobiele app openen →</a><button data-a="logout">Uitloggen</button></div></aside>
  <main class="a-main"><header class="a-head"><div><span class="faint">${esc(sub)}</span><h1>${esc(title)}</h1><div class="rule"></div></div>
  <div class="pills">${S.screen === 'rel' || S.screen === 'pipe' ? '<button class="abtn primary" data-a="newrel">Nieuwe relatie</button>' : ''}${S.screen === 'rel' ? '<a class="abtn" href="/api/export/csv?what=relations" download>CSV</a>' : ''}<button class="abtn" data-a="refresh">Vernieuwen</button></div></header>
  ${view()}</main></div>${vDrawer()}
  ${S.toast ? `<div class="a-toast${S.toast.bad ? ' bad' : ''}"><b>${esc(S.toast.title)}</b>${S.toast.body ? `<span>${esc(S.toast.body)}</span>` : ''}</div>` : ''}`;
  const d = document.querySelector('.dr-body'); if (d) d.scrollTop = drs;
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(...sel); } catch (e) {} } }
}
const val = id => (document.getElementById(id) || {}).value;

/* ---------- events ---------- */
root.addEventListener('input', e => { if (e.target.id === 'q') { S.q = e.target.value; render(); } });
root.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'owner') { S.owner = t.value; render(); }
  if (t.id === 'towner') { S.towner = t.value; render(); }
  if (t.id === 'noteUser') { S.noteUser = t.value; render(); }
  if (t.id === 'noteDay') { S.noteDay = t.value; render(); }
  if (t.id === 'r-type') { const st = document.getElementById('r-stage'); if (st) st.innerHTML = STAGES[t.value].map(([k, l]) => `<option value="${k}">${l}</option>`).join(''); }
  if (t.dataset.task) run(() => api('/api/tasks/' + t.dataset.task, 'PATCH', {done: t.checked}));
  if (t.dataset.role) run(() => api('/api/admin/users/' + t.dataset.role, 'PATCH', {role: t.value}), 'Rol gewijzigd');
});
root.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a, id = el.dataset.id;
  if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
  switch (a) {
    case 'nav': S.screen = id; S.q = ''; localStorage.setItem('lcrm-admin-screen', id); window.scrollTo(0, 0); break;
    case 'refresh': return load();
    case 'logout': try { await fetch('/api/logout', {method: 'POST', headers: H}); } catch (x) {} location.href = '/login'; return;
    case 'rel': S.drawer = +id; break;
    case 'newrel': S.drawer = 'new'; break;
    case 'close': S.drawer = null; break;
    case 'topipe': S.screen = 'pipe'; S.pipe = id; break;
    case 'type': S.type = id; break;
    case 'pipe': S.pipe = id; break;
    case 'tf': S.tf = id; break;
    case 'saverel': return run(() => api('/api/relations/' + S.drawer, 'PATCH', {name: val('r-name'), type: val('r-type'), country: val('r-country'), stage: val('r-stage'), owner_id: +val('r-owner'), value: val('r-value'), csb: val('r-csb')}), 'Relatie opgeslagen');
    case 'createrel': return run(async () => { const j = await api('/api/relations', 'POST', {name: val('r-name'), type: val('r-type'), country: val('r-country'), owner_id: +val('r-owner'), value: val('r-value'), csb: val('r-csb')}); S.drawer = j.id; }, 'Relatie aangemaakt');
    case 'addtask': { const text = val('t-text'); if (!text || !text.trim()) return toast('Vul een actie in', '', true);
      const tid = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return run(() => api('/api/tasks', 'POST', {id: tid, text, owner_id: +val('t-owner'), due: val('t-due') || '', relation_id: S.drawer}), 'Actie toegevoegd'); }
    case 'deltask': if (!confirm('Deze actie verwijderen?')) return; return run(() => api('/api/tasks/' + id, 'DELETE'), 'Actie verwijderd');
    case 'delnote': if (!confirm('Deze notitie en de foto’s definitief verwijderen?')) return; return run(() => api('/api/notes/' + id, 'DELETE'), 'Notitie verwijderd');
    case 'merge': { const into = val('merge-into'); if (!into) return toast('Kies een relatie', '', true);
      if (!confirm('Samenvoegen? Dit kan niet ongedaan worden.')) return; const from = S.drawer;
      return run(async () => { await api(`/api/relations/${from}/merge`, 'POST', {into: +into}); S.drawer = +into; }, 'Samengevoegd'); }
    case 'createuser': { const body = {name: val('nu-name'), username: val('nu-username'), role: val('nu-role'), password: val('nu-pw')};
      return run(async () => { await api('/api/admin/users', 'POST', body); S.newPw = ''; }, 'Gebruiker aangemaakt', `${body.username} · wachtwoord ${body.password}`); }
    case 'pwreset': { const pw = prompt('Nieuw wachtwoord voor ' + U(+id).name + ' (minstens 10 tekens):'); if (!pw) return;
      return run(() => api('/api/admin/users/' + id, 'PATCH', {password: pw}), 'Wachtwoord gewijzigd', 'Geef het persoonlijk door. De collega kiest daarna zelf een nieuw wachtwoord.'); }
    case 'toggleuser': { const u = U(+id); return run(() => api('/api/admin/users/' + id, 'PATCH', {active: !u.active}), u.active ? 'Gebruiker uitgeschakeld' : 'Gebruiker geactiveerd'); }
    case 'savesettings': return run(() => api('/api/admin/settings', 'POST', {event_name: val('ev-name'), event_place: val('ev-place'), event_start: val('ev-start'), event_days: val('ev-days')}), 'Beurs opgeslagen');
    default: return;
  }
  render();
});
root.addEventListener('dragstart', e => { const c = e.target.closest('[data-drag]'); if (!c) return; S.drag = +c.dataset.drag; c.classList.add('drag'); try { e.dataTransfer.setData('text/plain', c.dataset.drag); } catch (x) {} e.dataTransfer.effectAllowed = 'move'; });
root.addEventListener('dragend', e => { const c = e.target.closest('[data-drag]'); if (c) c.classList.remove('drag'); document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over')); });
root.addEventListener('dragover', e => { const col = e.target.closest('[data-col]'); if (!col || S.drag == null) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
root.addEventListener('drop', e => { const col = e.target.closest('[data-col]'); if (!col || S.drag == null) return; e.preventDefault();
  const r = rel(S.drag), stage = col.dataset.col; S.drag = null;
  if (r && r.stage !== stage) { r.stage = stage; render(); run(() => api('/api/relations/' + r.id, 'PATCH', {stage}), 'Fase gewijzigd', r.name + ' → ' + stageLabel(r)); } else render(); });

load();
setInterval(() => { const ae = document.activeElement; if (!S.drawer && !(ae && /INPUT|SELECT|TEXTAREA/.test(ae.tagName))) load(); }, 30000);
})();
