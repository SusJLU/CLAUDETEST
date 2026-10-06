(() => {
'use strict';
const $ = id => document.getElementById(id);
const H = {'Content-Type': 'application/json', 'X-LCRM': '1'};
let role = null;
const say = (el, msg) => { el.textContent = msg || ''; el.classList.toggle('hidden', !msg); };
const net = m => m === 'Failed to fetch' ? 'Geen verbinding met de server.' : m;
const go = () => { location.href = role === 'beheerder' ? '/admin' : '/app'; };
async function post(url, data) {
  const r = await fetch(url, {method: 'POST', headers: H, body: JSON.stringify(data)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Er ging iets mis');
  return j;
}
function toChange(askOld) {
  $('f').classList.add('hidden'); $('c').classList.remove('hidden');
  $('opw').classList.toggle('hidden', !askOld); $('op').required = askOld;
  (askOld ? $('op') : $('np')).focus();
}
$('f').addEventListener('submit', async e => {
  e.preventDefault(); $('b').disabled = true; say($('e'));
  try {
    const j = await post('/api/login', {username: $('u').value.trim(), password: $('p').value});
    role = j.role;
    if (j.must_change) { $('op').value = $('p').value; toChange(false); } else go();
  } catch (x) { say($('e'), net(x.message)); } finally { $('b').disabled = false; $('p').value = $('c').classList.contains('hidden') ? '' : $('p').value; }
});
$('c').addEventListener('submit', async e => {
  e.preventDefault(); say($('ce'));
  if ($('np').value !== $('np2').value) return say($('ce'), 'De nieuwe wachtwoorden zijn niet gelijk.');
  $('cb').disabled = true;
  try { await post('/api/password', {old: $('op').value, new: $('np').value}); $('op').value = ''; go(); }
  catch (x) { say($('ce'), net(x.message)); } finally { $('cb').disabled = false; }
});
if (new URLSearchParams(location.search).has('change')) {
  fetch('/api/me').then(r => r.ok ? r.json() : Promise.reject()).then(j => { role = j.user.role; toChange(true); }).catch(() => {});
}
})();
