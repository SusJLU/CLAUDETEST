import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { EVENT, TONE, dayNum, fmtDate, weekday } from '../constants';
import type { L } from '../i18n';
import { C, F, ls } from '../theme';
import type { Attachment, Meeting, Note, Task } from '../types';
import { AnimalIcon, Avatar, Badge, Card, Checkbox, T } from '../ui';

/** Everything a tab screen needs from the shell. */
export interface Nav {
  day: number;
  setDay: (d: number) => void;
  openNote: (id: string) => void;
  openCapture: (prefill?: { company: string; stand: string; contact: string }, meetingId?: string) => void;
  openMeeting: (m: Meeting | null) => void;
  openSettings: () => void;
  goTab: (t: 'today' | 'notes' | 'follow' | 'summary') => void;
  toast: (title: string, body: string) => void;
  topInset: number;
}

export const standLine = (n: Pick<Note, 'hall' | 'stand'>, L: L) => L.hall + ' ' + n.hall + ' · ' + n.stand;
export const noteTime = (n: Note, L: L) => weekday(EVENT.dates[n.day], L) + ' ' + n.time;

export function mediaMeta(atts: Attachment[], L: L) {
  const photos = atts.filter(a => a.type === 'photo').length;
  const pages = atts.filter(a => a.type === 'page').length;
  return [
    photos ? photos + ' ' + (photos > 1 ? L.photos : L.photo) : null,
    pages ? pages + ' ' + (pages > 1 ? L.pages : L.page) : null,
    atts.some(a => a.type === 'card') ? L.card : null,
    atts.some(a => a.type === 'voice') ? L.voice : null,
  ].filter(Boolean).join(' · ');
}

export function DayPicker({ day, setDay, L, compact }: { day: number; setDay: (d: number) => void; L: L; compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {EVENT.dates.map((iso, i) => {
        const on = i === day;
        return (
          <Pressable key={iso} onPress={() => setDay(i)} style={{
            flex: 1, borderWidth: 1, borderColor: on ? C.green : C.navy700, backgroundColor: on ? C.green : 'transparent',
            paddingVertical: compact ? 6 : 8, alignItems: 'center', gap: 2,
          }}>
            <Text style={{ fontFamily: F.b400, fontSize: 11, textTransform: 'uppercase', letterSpacing: ls(0.06, 11), color: C.white }}>{weekday(iso, L)}</Text>
            <Text style={{ fontFamily: F.d500, fontSize: compact ? 18 : 20, lineHeight: compact ? 22 : 24, color: C.white }}>{dayNum(iso)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatRow({ items }: { items: { value: number; label: string; hot?: boolean }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map(it => (
        <Card key={it.label} style={{ flex: 1, padding: 12, gap: 2 }}>
          <Text style={{ fontFamily: F.d600, fontSize: 26, lineHeight: 30, color: it.hot ? C.accent : C.navy }}>{it.value}</Text>
          <Text style={{ fontFamily: F.b400, fontSize: 12, color: C.navy500 }}>{it.label}</Text>
        </Card>
      ))}
    </View>
  );
}

export function NoteRow({ n, L, onPress }: { n: Note; L: L; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
        <AnimalIcon group={n.groups[0]} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={T.companyRow}>{n.company}</Text>
          <Text style={T.muted}>{noteTime(n, L)} · {standLine(n, L)}</Text>
        </View>
        <Badge tone={TONE[n.priority]}>{L.pri[n.priority]}</Badge>
      </Card>
    </Pressable>
  );
}

export function TaskCard({ t, company, L, onToggle, onOpen, small }: {
  t: Task; company?: string; L: L; onToggle: () => void; onOpen?: () => void; small?: boolean;
}) {
  return (
    <Card style={{ flexDirection: 'row', gap: small ? 10 : 12, alignItems: small ? 'center' : 'flex-start', padding: small ? undefined : 14, paddingVertical: small ? 12 : 14, paddingHorizontal: 14 }}>
      <View style={{ width: 24, paddingTop: small ? 0 : 2 }}><Checkbox checked={t.done} onChange={onToggle} /></View>
      <Pressable onPress={onOpen} disabled={!onOpen} style={{ flex: 1, gap: small ? 2 : 4 }}>
        <Text style={{ fontFamily: F.b600, fontSize: small ? 14 : 15, lineHeight: small ? 20 : 21, color: t.done ? C.navy300 : C.navy, textDecorationLine: t.done ? 'line-through' : 'none' }}>{t.text}</Text>
        <Text style={{ fontFamily: F.b400, fontSize: small ? 12 : 13, color: C.navy500 }}>
          {company ? company + ' · ' + L.due : L.dueCap} {fmtDate(t.dueDate, L)}
        </Text>
      </Pressable>
      <Avatar id={t.owner} size={small ? 28 : 32} />
    </Card>
  );
}

export const Empty = ({ children, center = true }: { children: React.ReactNode; center?: boolean }) => (
  <View style={{ backgroundColor: C.white, padding: center ? 24 : 18 }}>
    <Text style={{ fontFamily: F.b400, fontSize: 14, color: C.navy500, textAlign: center ? 'center' : 'left' }}>{children}</Text>
  </View>
);
