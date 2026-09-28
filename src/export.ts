import { Alert, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import { zipSync, strToU8 } from 'fflate';
import Constants from 'expo-constants';
import { EVENT, OWNERS, fmtDate } from './constants';
import type { L } from './i18n';
import type { Attachment, Meeting, Note, Settings, Task } from './types';

export interface Data {
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
  attachments: Attachment[];
  settings: Settings;
}

const ownerName = (id: string) => OWNERS.find(o => o.id === id)?.name ?? id;
const extOf = (uri: string) => (uri.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'bin').toLowerCase();
const mediaPath = (a: Attachment) => `media/${a.noteId}/${a.type}-${a.id}.${extOf(a.uri)}`;
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');

// ---------- CSV ----------

// Semicolon + BOM so Dutch Excel opens it in columns; any CSV parser reads it too.
const SEP = ';';
const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[;"\n\r,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = (rows: unknown[][]) => '﻿' + rows.map(r => r.map(cell).join(SEP)).join('\r\n') + '\r\n';

export function notesCsv(d: Data, notes: Note[]) {
  const head = ['note_id', 'date', 'time', 'company', 'country', 'hall', 'stand', 'contact', 'role', 'product_group',
    'priority', 'created_by', 'note', 'price_volume', 'follow_ups', 'photos', 'business_card', 'voice_memo', 'meeting_id'];
  const rows = notes.map(n => {
    const ts = d.tasks.filter(t => t.noteId === n.id);
    const as = d.attachments.filter(a => a.noteId === n.id);
    return [n.id, EVENT.dates[n.day], n.time, n.company, n.country, n.hall, n.stand, n.contact, n.role, n.group,
      n.priority, n.createdBy, n.text, n.price,
      ts.map(t => `${t.done ? '[x]' : '[ ]'} ${t.text} (${t.owner}, ${t.dueDate})`).join(' | '),
      as.filter(a => a.type === 'photo').length, as.some(a => a.type === 'card') ? 'yes' : 'no',
      as.some(a => a.type === 'voice') ? 'yes' : 'no', n.meetingId ?? ''];
  });
  return csv([head, ...rows]);
}

export function tasksCsv(d: Data, tasks: Task[]) {
  const head = ['task_id', 'note_id', 'company', 'task', 'owner', 'owner_name', 'due_date', 'done'];
  return csv([head, ...tasks.map(t => {
    const n = d.notes.find(x => x.id === t.noteId);
    return [t.id, t.noteId, n?.company ?? '', t.text, t.owner, ownerName(t.owner), t.dueDate, t.done ? 'yes' : 'no'];
  })]);
}

export function meetingsCsv(meetings: Meeting[]) {
  const head = ['meeting_id', 'date', 'time', 'company', 'stand', 'contact', 'note_id'];
  return csv([head, ...meetings.map(m => [m.id, EVENT.dates[m.day], m.time, m.company, m.stand, m.contact, m.noteId ?? ''])]);
}

/** One row per supplier contact — the shape most CRMs import as leads/accounts. */
export function crmCsv(d: Data, notes: Note[]) {
  const head = ['company', 'country', 'contact_name', 'contact_role', 'source', 'visit_date', 'stand', 'product_group',
    'lead_rating', 'notes', 'price_volume', 'open_follow_ups', 'account_owner'];
  return csv([head, ...notes.map(n => [n.company, n.country, n.contact, n.role, EVENT.name, EVENT.dates[n.day], n.stand,
    n.group, n.priority, n.text, n.price,
    d.tasks.filter(t => t.noteId === n.id && !t.done).map(t => `${t.text} (${t.owner}, ${t.dueDate})`).join(' | '),
    n.createdBy])]);
}

// ---------- Text summaries ----------

export function noteSummary(d: Data, n: Note, L: L) {
  const ts = d.tasks.filter(t => t.noteId === n.id);
  const lines = [
    `${n.company.toUpperCase()}`,
    `${n.country ? n.country + ' · ' : ''}${L.hall} ${n.hall} · ${n.stand}`,
    `${L.contact}: ${n.contact}${n.role ? ' (' + n.role + ')' : ''}`,
    `${L.group}: ${L.groups[n.group]} · ${L.priority}: ${L.pri[n.priority]}`,
    `${L.loggedAt}: ${fmtDate(EVENT.dates[n.day], L)} ${n.time} ${L.by} ${n.createdBy}`,
  ];
  if (n.price) lines.push(`${L.price}: ${n.price}`);
  lines.push('', n.text || L.noText);
  if (ts.length) {
    lines.push('', L.follow.toUpperCase() + ':');
    ts.forEach(t => lines.push(`${t.done ? '[x]' : '[ ]'} ${t.text} — ${t.owner}, ${L.due} ${fmtDate(t.dueDate, L)}`));
  }
  return lines.join('\n');
}

export function daySummary(d: Data, day: number, L: L) {
  const notes = d.notes.filter(n => n.day === day).sort((a, b) => a.time.localeCompare(b.time));
  const head = `${EVENT.name} — ${L.day} ${day + 1} · ${fmtDate(EVENT.dates[day], L)}\n` +
    `${L.visits}: ${notes.length} · ${L.hotLeads}: ${notes.filter(n => n.priority === 'hot').length}\n`;
  return head + '\n' + notes.map(n => noteSummary(d, n, L)).join('\n\n———\n\n');
}

// ---------- Full export (for later processing, e.g. by Claude) ----------

export function buildJson(d: Data, withMediaPaths: boolean) {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return {
    schema: 'luitenfood.sial-notes.export',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: d.settings.me,
    app: { name: 'SIAL Notes', version, platform: Platform.OS },
    event: { name: EVENT.name, venue: EVENT.venue, days: EVENT.dates.map((date, index) => ({ index, date })) },
    description:
      'Exhibition visit notes logged by the Luiten Food team at SIAL Paris 2026. ' +
      'notes[] are supplier stand visits (with their follow-up tasks and attachments embedded); ' +
      'meetings[] are planned appointments (noteId links to the note logged for it). ' +
      'priority: hot|warm|cold. group: beef|lamb|poultry|game|pork|duck. day is an index into event.days. ' +
      'Times are local (Europe/Paris). Attachment "file" paths are relative to the ZIP root when media is included.',
    team: OWNERS,
    counts: {
      notes: d.notes.length,
      tasks: d.tasks.length,
      openTasks: d.tasks.filter(t => !t.done).length,
      meetings: d.meetings.length,
      attachments: d.attachments.length,
    },
    notes: [...d.notes]
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
      .map(n => ({
        ...n,
        date: EVENT.dates[n.day],
        tasks: d.tasks.filter(t => t.noteId === n.id).map(({ noteId, ...t }) => ({ ...t, ownerName: ownerName(t.owner) })),
        attachments: d.attachments
          .filter(a => a.noteId === n.id)
          .map(a => ({ id: a.id, type: a.type, durationSec: a.durationSec, createdAt: a.createdAt, file: withMediaPaths ? mediaPath(a) : null })),
      })),
    meetings: d.meetings.map(m => ({ ...m, date: EVENT.dates[m.day] })),
  };
}

const README = `SIAL Notes — full export
========================
data.json      Everything in one structured file (schema "luitenfood.sial-notes.export", v1). Start here.
notes.csv      One row per stand visit.
tasks.csv      One row per follow-up.
meetings.csv   One row per planned meeting.
media/         Photos, business cards (jpg) and voice memos (m4a), per note id.
CSV files use ";" as separator and UTF-8 with BOM.
`;

export async function buildZip(d: Data) {
  const files: Record<string, Uint8Array> = {
    'data.json': strToU8(JSON.stringify(buildJson(d, true), null, 2)),
    'notes.csv': strToU8(notesCsv(d, d.notes)),
    'tasks.csv': strToU8(tasksCsv(d, d.tasks)),
    'meetings.csv': strToU8(meetingsCsv(d.meetings)),
    'README.txt': strToU8(README),
  };
  for (const a of d.attachments) {
    const f = new File(a.uri);
    if (f.exists) files[mediaPath(a)] = await f.bytes();
  }
  // Media is already compressed; level 0 keeps this fast on a phone.
  return zipSync(files, { level: 0 });
}

export const exportName = (ext: string) => `sial-2026-export-${stamp()}.${ext}`;

// ---------- Delivery ----------

export function writeTemp(name: string, content: string | Uint8Array) {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(content);
  return f;
}

async function saveToFolder(name: string, content: string | Uint8Array, mime: string) {
  const dir = await Directory.pickDirectoryAsync();
  const f = dir.createFile(name, mime);
  f.write(content);
}

/** Ask whether to save the file to a folder (Android picker) or share it. Resolves true when done. */
export function deliverFile(L: L, name: string, content: string | Uint8Array, mime: string): Promise<boolean> {
  return new Promise(resolve => {
    const share = async () => {
      try {
        const f = writeTemp(name, content);
        await Sharing.shareAsync(f.uri, { mimeType: mime, dialogTitle: name });
        resolve(true);
      } catch (e) {
        Alert.alert(L.errTitle, String(e));
        resolve(false);
      }
    };
    const folder = async () => {
      try {
        await saveToFolder(name, content, mime);
        resolve(true);
      } catch (e) {
        // Picker cancelled or not supported: fall back to sharing.
        if (String(e).toLowerCase().includes('cancel')) resolve(false);
        else share();
      }
    };
    Alert.alert(L.saveWhere, name, [
      { text: L.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: L.share, onPress: share },
      { text: L.saveFolder, onPress: folder },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Open the mail composer; if no mail app is available, share the first attachment instead. */
export async function mail(L: L, subject: string, body: string, attachments: string[]) {
  if (await MailComposer.isAvailableAsync()) {
    await MailComposer.composeAsync({ subject, body, attachments });
    return true;
  }
  Alert.alert(L.noMail);
  if (attachments[0]) await Sharing.shareAsync(attachments[0]);
  return false;
}
