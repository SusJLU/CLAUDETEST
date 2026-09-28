import * as SQLite from 'expo-sqlite';
import type { Attachment, Group, ExportLog, Meeting, Note, Settings, Task } from './types';

// Local SQLite store. Every write goes here first; `syncedAt` is kept on notes
// so a server sync queue can be added later without a migration.
const db = SQLite.openDatabaseSync('sial-notes.db');

export async function initDb() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL, company TEXT NOT NULL, country TEXT, hall TEXT, stand TEXT,
      contact TEXT, role TEXT, grp TEXT NOT NULL, priority TEXT NOT NULL, day INTEGER NOT NULL,
      time TEXT, created_by TEXT, text TEXT, price TEXT, meeting_id TEXT,
      created_at TEXT, updated_at TEXT, synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL, note_id TEXT NOT NULL, text TEXT NOT NULL, owner TEXT,
      due_date TEXT, done INTEGER NOT NULL DEFAULT 0, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY NOT NULL, day INTEGER NOT NULL, time TEXT, company TEXT NOT NULL,
      stand TEXT, contact TEXT, note_id TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL, note_id TEXT NOT NULL, type TEXT NOT NULL, uri TEXT NOT NULL,
      duration_sec REAL, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);
  `);
  // v1.1: multiple product groups + "other". Older rows only have `grp`.
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(notes)');
  if (!cols.some(c => c.name === 'groups')) {
    await db.execAsync(`
      ALTER TABLE notes ADD COLUMN groups TEXT;
      ALTER TABLE notes ADD COLUMN other_group TEXT;
      UPDATE notes SET groups = json_array(grp) WHERE groups IS NULL;
    `);
  }
}

const parseGroups = (r: Row): Group[] => {
  try {
    const g = JSON.parse(r.groups ?? 'null');
    if (Array.isArray(g)) return g;
  } catch {
    // fall through to the legacy single group
  }
  return r.grp ? [r.grp] : [];
};

type Row = Record<string, any>;

const toNote = (r: Row): Note => ({
  id: r.id, company: r.company, country: r.country ?? '', hall: r.hall ?? '', stand: r.stand ?? '',
  contact: r.contact ?? '', role: r.role ?? '', groups: parseGroups(r), otherGroup: r.other_group ?? '', priority: r.priority, day: r.day,
  time: r.time ?? '', createdBy: r.created_by ?? '', text: r.text ?? '', price: r.price ?? '',
  meetingId: r.meeting_id ?? null, createdAt: r.created_at, updatedAt: r.updated_at, syncedAt: r.synced_at ?? null,
});
const toTask = (r: Row): Task => ({
  id: r.id, noteId: r.note_id, text: r.text, owner: r.owner, dueDate: r.due_date, done: !!r.done, createdAt: r.created_at,
});
const toMeeting = (r: Row): Meeting => ({
  id: r.id, day: r.day, time: r.time ?? '', company: r.company, stand: r.stand ?? '', contact: r.contact ?? '',
  noteId: r.note_id ?? null, createdAt: r.created_at,
});
const toAtt = (r: Row): Attachment => ({
  id: r.id, noteId: r.note_id, type: r.type, uri: r.uri, durationSec: r.duration_sec ?? null, createdAt: r.created_at,
});

export async function loadAll() {
  const [notes, tasks, meetings, atts, kv] = await Promise.all([
    db.getAllAsync<Row>('SELECT * FROM notes ORDER BY created_at DESC'),
    db.getAllAsync<Row>('SELECT * FROM tasks ORDER BY created_at DESC'),
    db.getAllAsync<Row>('SELECT * FROM meetings ORDER BY day, time'),
    db.getAllAsync<Row>('SELECT * FROM attachments ORDER BY created_at'),
    db.getAllAsync<Row>('SELECT * FROM kv'),
  ]);
  const map = Object.fromEntries(kv.map(r => [r.key, r.value]));
  return {
    notes: notes.map(toNote),
    tasks: tasks.map(toTask),
    meetings: meetings.map(toMeeting),
    attachments: atts.map(toAtt),
    settings: map.settings ? (JSON.parse(map.settings) as Partial<Settings>) : {},
    exported: map.exported ? (JSON.parse(map.exported) as ExportLog) : {},
  };
}

export async function putKv(key: string, value: unknown) {
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

export async function upsertNote(n: Note) {
  await db.runAsync(
    `INSERT OR REPLACE INTO notes (id, company, country, hall, stand, contact, role, grp, priority, day, time,
      created_by, text, price, meeting_id, created_at, updated_at, synced_at, groups, other_group)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    // `grp` keeps the first group so the column stays NOT NULL and readable by older tooling.
    n.id, n.company, n.country, n.hall, n.stand, n.contact, n.role, n.groups[0] ?? 'other', n.priority, n.day, n.time,
    n.createdBy, n.text, n.price, n.meetingId, n.createdAt, n.updatedAt, n.syncedAt, JSON.stringify(n.groups), n.otherGroup,
  );
}

export async function deleteNote(id: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM notes WHERE id = ?', id);
    await db.runAsync('DELETE FROM tasks WHERE note_id = ?', id);
    await db.runAsync('DELETE FROM attachments WHERE note_id = ?', id);
    await db.runAsync('UPDATE meetings SET note_id = NULL WHERE note_id = ?', id);
  });
}

export async function upsertTask(t: Task) {
  await db.runAsync(
    'INSERT OR REPLACE INTO tasks (id, note_id, text, owner, due_date, done, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    t.id, t.noteId, t.text, t.owner, t.dueDate, t.done ? 1 : 0, t.createdAt,
  );
}

export async function upsertMeeting(m: Meeting) {
  await db.runAsync(
    'INSERT OR REPLACE INTO meetings (id, day, time, company, stand, contact, note_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    m.id, m.day, m.time, m.company, m.stand, m.contact, m.noteId, m.createdAt,
  );
}

export async function deleteMeeting(id: string) {
  await db.runAsync('DELETE FROM meetings WHERE id = ?', id);
}

export async function insertAttachment(a: Attachment) {
  await db.runAsync(
    'INSERT OR REPLACE INTO attachments (id, note_id, type, uri, duration_sec, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    a.id, a.noteId, a.type, a.uri, a.durationSec, a.createdAt,
  );
}

export async function deleteAttachment(id: string) {
  await db.runAsync('DELETE FROM attachments WHERE id = ?', id);
}
