import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { EVENT, GROUPS, OWNERS, fmtDate } from '../constants';
import {
  Data, buildJson, buildZip, crmCsv, daySummary, deliverFile, exportName, mail, notesCsv, writeTemp,
} from '../export';
import { useStore } from '../store';
import { C, F, ls } from '../theme';
import { AnimalIcon, Avatar, Button, Card, GreenRule, Icon, T } from '../ui';
import { DayPicker, Empty, Nav, StatRow, standLine } from './common';

export default function Summary({ nav }: { nav: Nav }) {
  const store = useStore();
  const { L, notes, tasks, meetings, attachments, settings, exported, markExported } = store;
  const { day } = nav;
  const [busy, setBusy] = useState<string | null>(null);

  const dayNotes = notes.filter(n => n.day === day);
  const dayIds = new Set(dayNotes.map(n => n.id));
  const dayTasks = tasks.filter(t => dayIds.has(t.noteId));
  const hot = dayNotes.filter(n => n.priority === 'hot');
  const byGroup = GROUPS.map(g => ({ ...g, count: dayNotes.filter(n => n.groups.includes(g.id)).length })).filter(g => g.count > 0);
  const open = tasks.filter(t => !t.done);
  const data: Data = { notes, tasks, meetings, attachments, settings };
  const dayLabel = `${L.day} ${day + 1} · ${fmtDate(EVENT.dates[day], L)}`;

  const run = (key: string, fn: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert(L.errTitle, String(e));
    } finally {
      setBusy(null);
    }
  };

  const emailTeam = run('mail', async () => {
    const csvFile = writeTemp(`sial-2026-${L.day.toLowerCase()}-${day + 1}.csv`, notesCsv(data, dayNotes));
    const media = attachments.filter(a => dayIds.has(a.noteId)).map(a => a.uri);
    await mail(L, `${EVENT.name} — ${dayLabel}`, daySummary(data, day, L), [csvFile.uri, ...media]);
    markExported(day);
    nav.toast(L.teamTitle, L.teamBody);
  });

  const exportCrm = run('crm', async () => {
    const name = `sial-2026-crm-${L.day.toLowerCase()}-${day + 1}.csv`;
    if (await deliverFile(L, name, crmCsv(data, dayNotes), 'text/csv')) {
      markExported(day);
      nav.toast(L.crmTitle, L.crmBody(dayNotes.length, dayTasks.length));
    }
  });

  const exportCsv = run('csv', async () => {
    const name = `sial-2026-${L.day.toLowerCase()}-${day + 1}.csv`;
    if (await deliverFile(L, name, notesCsv(data, dayNotes), 'text/csv')) nav.toast(L.csvTitle, L.savedTo(name));
  });

  const exportJson = run('json', async () => {
    const name = exportName('json');
    if (await deliverFile(L, name, JSON.stringify(buildJson(data, false), null, 2), 'application/json')) nav.toast(L.exportReady, L.savedTo(name));
  });

  const exportZip = run('zip', async () => {
    const name = exportName('zip');
    const bytes = await buildZip(data);
    if (await deliverFile(L, name, bytes, 'application/zip')) nav.toast(L.exportReady, L.savedTo(name));
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: C.navy, paddingTop: nav.topInset + 14, paddingHorizontal: 20, paddingBottom: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 8 }}>
            <Text style={T.h1}>{L.summary}</Text>
            <GreenRule />
          </View>
          <Pressable onPress={nav.openSettings} hitSlop={12} accessibilityLabel={L.settings}>
            <Icon name="settings" color={C.navy300} />
          </Pressable>
        </View>
        <DayPicker day={day} setDay={nav.setDay} L={L} compact />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 22 }}>
        <StatRow items={[
          { value: dayNotes.length, label: L.visits },
          { value: hot.length, label: L.hotLeads, hot: true },
          { value: dayTasks.length, label: L.newTasks },
        ]} />

        {dayNotes.length === 0 ? <Empty center={false}>{L.noDayNotes}</Empty> : (
          <>
            <View style={{ gap: 10 }}>
              <Text style={T.section}>{L.byGroup}</Text>
              <Card>
                {byGroup.map(g => (
                  <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.grey }}>
                    <View style={{ width: 40 }}><AnimalIcon group={g.id} w={36} h={24} /></View>
                    <Text style={{ flex: 1, fontFamily: F.b600, fontSize: 15, color: C.navy }}>{L.groups[g.id]}</Text>
                    <Text style={{ fontFamily: F.d400, fontSize: 18, color: C.navy }}>{g.count}</Text>
                  </View>
                ))}
              </Card>
            </View>
            <View style={{ gap: 10 }}>
              <Text style={T.section}>{L.hotList}</Text>
              {hot.length === 0 ? <Text style={[T.muted, { fontSize: 14 }]}>{L.noHot}</Text> : null}
              {hot.map(n => (
                <Pressable key={n.id} onPress={() => nav.openNote(n.id)}>
                  <Card style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
                    <Text style={T.companyRow}>{n.company}</Text>
                    <Text style={T.muted}>{n.contact} · {standLine(n, L)}</Text>
                    {settings.showPrices && n.price ? (
                      <Text style={{ fontFamily: F.b400, fontSize: 13, color: C.navy, backgroundColor: C.green50, paddingVertical: 6, paddingHorizontal: 8, marginTop: 4 }}>{n.price}</Text>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={{ gap: 10 }}>
          <Text style={T.section}>{L.perOwner}</Text>
          <Card>
            {OWNERS.map(o => {
              const ts = open.filter(t => t.owner === o.id);
              return (
                <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.grey }}>
                  <Avatar id={o.id} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ fontFamily: F.b600, fontSize: 15, color: C.navy }}>{o.name}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.b400, fontSize: 12, color: C.navy500 }}>{ts.length ? ts[0].text : L.noOpen}</Text>
                  </View>
                  <Text style={{ fontFamily: F.d400, fontSize: 18, color: C.navy }}>{ts.length}</Text>
                </View>
              );
            })}
          </Card>
        </View>

        <View style={{ backgroundColor: C.navy, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontFamily: F.d600, fontSize: 18, textTransform: 'uppercase', letterSpacing: ls(0.04, 18), color: C.white }}>{L.export}</Text>
            <Text style={{ fontFamily: F.b400, fontSize: 12, color: C.green200 }}>{exported[day] ? L.exported + ' ' + exported[day] : L.notExported}</Text>
          </View>
          <Text style={{ fontFamily: F.b400, fontSize: 14, lineHeight: 21, color: C.grey }}>{L.exportTo}</Text>
          <Button full onPress={emailTeam} disabled={!!busy}>{L.emailTeam}</Button>
          <Button full variant="inverse" onPress={exportCrm} disabled={!!busy}>{L.exportCrm}</Button>
          <Pressable onPress={exportCsv} disabled={!!busy} style={{ alignSelf: 'center', padding: 6 }}>
            <Text style={{ fontFamily: F.b400, fontSize: 14, color: C.green }}>{L.csv} →</Text>
          </Pressable>
        </View>

        <Card style={{ padding: 18, gap: 12, borderTopWidth: 4, borderTopColor: C.green }}>
          <Text style={{ fontFamily: F.d600, fontSize: 18, textTransform: 'uppercase', letterSpacing: ls(0.04, 18), color: C.navy }}>{L.exportAll}</Text>
          <Text style={{ fontFamily: F.b400, fontSize: 14, lineHeight: 21, color: C.navy500 }}>{L.exportAllBody}</Text>
          <Text style={{ fontFamily: F.b400, fontSize: 13, color: C.navy500 }}>
            {notes.length} {notes.length === 1 ? L.n1 : L.nN} · {tasks.length} {L.follow.toLowerCase()} · {meetings.length} {L.planned.toLowerCase()}
          </Text>
          <Button full variant="secondary" onPress={exportJson} disabled={!!busy}>{L.exportJson}</Button>
          <Button full variant="outline" onPress={exportZip} disabled={!!busy}>{L.exportZip}</Button>
          {busy ? <ActivityIndicator color={C.accent} /> : null}
        </Card>
      </ScrollView>
    </View>
  );
}
