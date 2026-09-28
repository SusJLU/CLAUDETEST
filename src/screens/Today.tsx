import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { EVENT, fmtDate } from '../constants';
import { useStore } from '../store';
import { C, F, ls } from '../theme';
import { Badge, Card, Flag, GreenRule, SyncStatus, T } from '../ui';
import { DayPicker, Empty, Nav, NoteRow, StatRow } from './common';

export default function Today({ nav }: { nav: Nav }) {
  const { L, notes, tasks, meetings, settings, setSettings } = useStore();
  const { day } = nav;
  const dayNotes = notes.filter(n => n.day === day);
  const dayMeetings = meetings.filter(m => m.day === day);
  const noteIds = new Set(notes.map(n => n.id));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: C.navy, paddingTop: nav.topInset + 14, paddingHorizontal: 20, gap: 16 }}>
        <Image source={require('../../assets/img/logo-wide.png')} accessibilityLabel="Luiten Food × Thomas Foods International"
          style={{ width: '100%', height: undefined, aspectRatio: 1240 / 130 }} resizeMode="contain" />
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: F.d400, fontSize: 12, letterSpacing: ls(0.12, 12), textTransform: 'uppercase', color: C.green }}>
              SIAL Paris · {EVENT.venue}
            </Text>
            <SyncStatus label={L.local} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Text style={[T.h1, { flexShrink: 1 }]}>{L.day} {day + 1} · {fmtDate(EVENT.dates[day], L)}</Text>
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.navy700 }}>
              {(['nl', 'en'] as const).map(id => (
                <Pressable key={id} onPress={() => setSettings({ lang: id })} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8,
                  backgroundColor: settings.lang === id ? C.green : 'transparent',
                }}>
                  <Flag id={id} />
                  <Text style={{ fontFamily: F.d400, fontSize: 12, letterSpacing: ls(0.06, 12), color: C.white }}>{id.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <GreenRule />
        </View>
        <View style={{ paddingBottom: 16 }}>
          <DayPicker day={day} setDay={nav.setDay} L={L} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 24 }}>
        <StatRow items={[
          { value: dayNotes.length, label: L.notesToday },
          { value: dayNotes.filter(n => n.priority === 'hot').length, label: L.hotLeads, hot: true },
          { value: tasks.filter(t => !t.done).length, label: L.openFollow },
        ]} />

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={T.section}>{L.planned}</Text>
            <Pressable onPress={() => nav.openMeeting(null)} hitSlop={8}><Text style={T.link}>{L.addMeeting}</Text></Pressable>
          </View>
          {dayMeetings.length === 0 ? <Empty center={false}>{L.noMeetings}</Empty> : null}
          {dayMeetings.map(m => {
            const nid = m.noteId && noteIds.has(m.noteId) ? m.noteId : null;
            return (
              <Pressable key={m.id} delayLongPress={400} onLongPress={() => nav.openMeeting(m)}
                onPress={() => (nid ? nav.openNote(nid) : nav.openCapture({ company: m.company, stand: m.stand, contact: m.contact }, m.id))}>
                <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
                  <Text style={{ width: 52, fontFamily: F.d500, fontSize: 17, color: C.navy }}>{m.time}</Text>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text numberOfLines={1} style={T.companyRow}>{m.company}</Text>
                    <Text numberOfLines={1} style={T.muted}>
                      {[m.stand ? L.hall + ' ' + m.stand.split(' ')[0] + ' · ' + m.stand : null, m.contact || null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {nid ? <Badge tone="tint">{L.logged}</Badge> : (
                    <Text style={{ fontFamily: F.d400, fontSize: 13, textTransform: 'uppercase', letterSpacing: ls(0.04, 13), color: C.accent }}>{L.logNote}</Text>
                  )}
                </Card>
              </Pressable>
            );
          })}
          {dayMeetings.length > 0 ? <Text style={[T.muted, { fontSize: 12 }]}>{L.meetingHint}</Text> : null}
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={T.section}>{L.recent}</Text>
            <Pressable onPress={() => nav.goTab('notes')} hitSlop={8}><Text style={T.link}>{L.allNotes}</Text></Pressable>
          </View>
          {dayNotes.length === 0 ? <Empty center={false}>{L.noDayNotes}</Empty> : null}
          {dayNotes.slice(0, 3).map(n => <NoteRow key={n.id} n={n} L={L} onPress={() => nav.openNote(n.id)} />)}
        </View>
      </ScrollView>
    </View>
  );
}
