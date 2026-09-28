import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from './db';
import { TX } from './i18n';
import { removeFile } from './media';
import { hallOf, nowTime, uid } from './constants';
import type { Attachment, AttachmentType, ExportLog, Group, Meeting, Note, Priority, Settings, Task } from './types';

export interface DraftAttachment {
  id: string;
  type: AttachmentType;
  uri: string;
  durationSec: number | null;
  isNew: boolean; // captured in this form session (delete the file on cancel)
}

export interface Draft {
  company: string;
  stand: string;
  contact: string;
  country: string;
  role: string;
  group: Group;
  priority: Priority;
  text: string;
  price: string;
  task: string;
  owner: string;
  due: string;
  attachments: DraftAttachment[];
}

const DEFAULT_SETTINGS: Settings = { lang: 'nl', showPrices: true, me: 'SV' };

function useStoreValue() {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [exported, setExported] = useState<ExportLog>({});

  useEffect(() => {
    (async () => {
      await db.initDb();
      const all = await db.loadAll();
      setNotes(all.notes);
      setTasks(all.tasks);
      setMeetings(all.meetings);
      setAttachments(all.attachments);
      setSettingsState({ ...DEFAULT_SETTINGS, ...all.settings });
      setExported(all.exported);
      setReady(true);
    })();
  }, []);

  const L = TX[settings.lang];

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState(s => {
      const next = { ...s, ...patch };
      db.putKv('settings', next);
      return next;
    });
  }, []);

  const markExported = useCallback((day: number) => {
    setExported(e => {
      const next = { ...e, [day]: nowTime() };
      db.putKv('exported', next);
      return next;
    });
  }, []);

  /** Create or update a note from the capture form. Returns the note id. */
  const saveNote = useCallback(
    async (d: Draft, opts: { editId: string | null; meetingId: string | null; day: number; removed: DraftAttachment[] }) => {
      const now = new Date().toISOString();
      const prev = opts.editId ? notes.find(n => n.id === opts.editId) : undefined;
      const stand = d.stand.trim();
      const note: Note = {
        id: prev?.id ?? uid(),
        company: d.company.trim(),
        country: d.country.trim(),
        hall: stand ? hallOf(stand) : '–',
        stand: stand || '–',
        contact: d.contact.trim() || L.unknown,
        role: d.role.trim(),
        group: d.group,
        priority: d.priority,
        day: prev?.day ?? opts.day,
        time: prev?.time ?? nowTime(),
        createdBy: prev?.createdBy ?? settings.me,
        text: d.text.trim(),
        price: d.price.trim(),
        meetingId: prev?.meetingId ?? opts.meetingId,
        createdAt: prev?.createdAt ?? now,
        updatedAt: now,
        syncedAt: null,
      };
      await db.upsertNote(note);

      let newTask: Task | null = null;
      if (d.task.trim()) {
        newTask = { id: uid(), noteId: note.id, text: d.task.trim(), owner: d.owner, dueDate: d.due, done: false, createdAt: now };
        await db.upsertTask(newTask);
      }

      const added: Attachment[] = d.attachments
        .filter(a => a.isNew)
        .map(a => ({ id: a.id, noteId: note.id, type: a.type, uri: a.uri, durationSec: a.durationSec, createdAt: now }));
      for (const a of added) await db.insertAttachment(a);
      for (const r of opts.removed) {
        if (!r.isNew) await db.deleteAttachment(r.id);
        removeFile(r.uri);
      }

      let linked: Meeting | null = null;
      if (!prev && opts.meetingId) {
        const m = meetings.find(x => x.id === opts.meetingId);
        if (m) {
          linked = { ...m, noteId: note.id };
          await db.upsertMeeting(linked);
        }
      }

      const removedIds = new Set(opts.removed.map(r => r.id));
      setNotes(ns => (prev ? ns.map(n => (n.id === note.id ? note : n)) : [note, ...ns]));
      if (newTask) setTasks(ts => [newTask!, ...ts]);
      setAttachments(as => [...as.filter(a => !removedIds.has(a.id)), ...added]);
      if (linked) setMeetings(ms => ms.map(m => (m.id === linked!.id ? linked! : m)));
      return note.id;
    },
    [notes, meetings, settings.me, L],
  );

  const removeNote = useCallback(
    async (id: string) => {
      await db.deleteNote(id);
      attachments.filter(a => a.noteId === id).forEach(a => removeFile(a.uri));
      setNotes(ns => ns.filter(n => n.id !== id));
      setTasks(ts => ts.filter(t => t.noteId !== id));
      setAttachments(as => as.filter(a => a.noteId !== id));
      setMeetings(ms => ms.map(m => (m.noteId === id ? { ...m, noteId: null } : m)));
    },
    [attachments],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      const next = { ...t, done: !t.done };
      setTasks(ts => ts.map(x => (x.id === id ? next : x)));
      await db.upsertTask(next);
    },
    [tasks],
  );

  const saveMeeting = useCallback(async (m: Meeting) => {
    await db.upsertMeeting(m);
    setMeetings(ms => {
      const rest = ms.filter(x => x.id !== m.id);
      return [...rest, m].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    });
  }, []);

  const removeMeeting = useCallback(async (id: string) => {
    await db.deleteMeeting(id);
    setMeetings(ms => ms.filter(m => m.id !== id));
  }, []);

  return {
    ready, L, notes, tasks, meetings, attachments, settings, exported,
    setSettings, markExported, saveNote, removeNote, toggleTask, saveMeeting, removeMeeting,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  const memo = useMemo(() => value, Object.values(value)); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={memo}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
