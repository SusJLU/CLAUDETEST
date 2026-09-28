import type { L } from './i18n';
import type { Group, Priority, User } from './types';

export const EVENT = {
  name: 'SIAL Paris 2026',
  venue: 'Paris Nord Villepinte',
  // Day index 0–4 → these dates.
  dates: ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'],
};

export const GROUPS: { id: Group; icon: string }[] = [
  { id: 'beef', icon: 'rund' },
  { id: 'lamb', icon: 'lam' },
  { id: 'poultry', icon: 'kip' },
  { id: 'game', icon: 'hert' },
  { id: 'pork', icon: 'varken' },
  { id: 'duck', icon: 'eend' },
  { id: 'other', icon: '' },
];
export const GROUP_ICON = Object.fromEntries(GROUPS.map(g => [g.id, g.icon])) as Record<Group, string>;

/** "Rund, Lam, Overig: vis" */
export const groupLabel = (n: { groups: Group[]; otherGroup: string }, L: L) =>
  n.groups.length
    ? n.groups.map(g => (g === 'other' && n.otherGroup.trim() ? L.groups.other + ': ' + n.otherGroup.trim() : L.groups[g])).join(', ')
    : '—';

export const TONE: Record<Priority, 'green' | 'tint' | 'grey'> = { hot: 'green', warm: 'tint', cold: 'grey' };

export const OWNERS: User[] = [
  { id: 'SV', name: 'Sander V.' },
  { id: 'IB', name: 'Ingrid B.' },
  { id: 'MK', name: 'Mark K.' },
];

// Deadline choices offered for a new follow-up.
export const DUE_OPTIONS = ['2026-10-22', '2026-10-23', '2026-10-26', '2026-10-30', '2026-11-06'];
export const DEFAULT_DUE = '2026-10-23';

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** "za 17 okt" / "Sat 17 Oct" */
export const fmtDate = (iso: string, L: L) => {
  const dt = parse(iso);
  return L.wd[dt.getUTCDay()] + ' ' + dt.getUTCDate() + ' ' + L.mon[dt.getUTCMonth()];
};
export const weekday = (iso: string, L: L) => L.wd[parse(iso).getUTCDay()];
export const dayNum = (iso: string) => parse(iso).getUTCDate();

export const nowTime = () => {
  const n = new Date();
  return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
};

/** Fair day index for today's date, or 0 outside the fair. */
export const todayIndex = () => {
  const n = new Date();
  const iso = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  const i = EVENT.dates.indexOf(iso);
  return i < 0 ? 0 : i;
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Hall is the first token of the stand code: "6 F 045" → "6", "5A 112" → "5A". */
export const hallOf = (stand: string) => stand.trim().split(/\s+/)[0] || '–';

export const normTime = (t: string) => {
  const m = t.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
};
