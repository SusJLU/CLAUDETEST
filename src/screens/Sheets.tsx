import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { OWNERS, normTime, uid } from '../constants';
import { useStore } from '../store';
import { C, F, ls } from '../theme';
import type { Meeting } from '../types';
import { Button, Flag, Input } from '../ui';
import { DayPicker } from './common';

function Sheet({ title, onClose, children, bottomInset }: { title: string; onClose: () => void; children: React.ReactNode; bottomInset: number }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,45,78,.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: C.white, borderTopWidth: 4, borderTopColor: C.green, maxHeight: '90%' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 20 + bottomInset, gap: 16 }}>
            <Text style={{ fontFamily: F.d700, fontSize: 22, textTransform: 'uppercase', color: C.navy }}>{title}</Text>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MeetingSheet({ meeting, day, bottomInset, onClose, toast }: {
  meeting: Meeting | null; day: number; bottomInset: number; onClose: () => void; toast: (t: string, b: string) => void;
}) {
  const { L, saveMeeting, removeMeeting } = useStore();
  const [d, setD] = useState(meeting?.day ?? day);
  const [time, setTime] = useState(meeting?.time ?? '');
  const [company, setCompany] = useState(meeting?.company ?? '');
  const [stand, setStand] = useState(meeting?.stand ?? '');
  const [contact, setContact] = useState(meeting?.contact ?? '');
  const [err, setErr] = useState<{ time?: string; company?: string }>({});

  const save = async () => {
    const t = normTime(time);
    const e = { time: t ? undefined : L.timeErr, company: company.trim() ? undefined : L.companyErr };
    setErr(e);
    if (e.time || e.company) return;
    await saveMeeting({
      id: meeting?.id ?? uid(), day: d, time: t!, company: company.trim(), stand: stand.trim(), contact: contact.trim(),
      noteId: meeting?.noteId ?? null, createdAt: meeting?.createdAt ?? new Date().toISOString(),
    });
    toast(L.meetingSaved, company.trim());
    onClose();
  };

  const del = () => Alert.alert(L.deleteMeetingQ, meeting!.company, [
    { text: L.no, style: 'cancel' },
    { text: L.yes, style: 'destructive', onPress: async () => { await removeMeeting(meeting!.id); toast(L.meetingDeleted, meeting!.company); onClose(); } },
  ]);

  return (
    <Sheet title={meeting ? L.editMeeting : L.newMeeting} onClose={onClose} bottomInset={bottomInset}>
      <View style={{ backgroundColor: C.navy, padding: 10 }}>
        <DayPicker day={d} setDay={setD} L={L} compact />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Input style={{ width: 110 }} label={L.time} required value={time} onChangeText={setTime} placeholder={L.timePh}
          keyboardType="numbers-and-punctuation" error={err.time} maxLength={5} />
        <Input style={{ flex: 1 }} label={L.company} required value={company} onChangeText={setCompany} error={err.company}
          placeholder={L.companyPh} autoCapitalize="words" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Input style={{ flex: 1 }} label={L.stand} value={stand} onChangeText={setStand} placeholder="e.g. 6 F 045" autoCapitalize="characters" />
        <Input style={{ flex: 1 }} label={L.contact} value={contact} onChangeText={setContact} placeholder={L.name} autoCapitalize="words" />
      </View>
      <Button full onPress={save}>{L.save}</Button>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onPress={onClose} style={{ padding: 6 }}><Text style={{ fontFamily: F.b400, fontSize: 15, color: C.navy500 }}>{L.cancel}</Text></Pressable>
        {meeting ? <Pressable onPress={del} style={{ padding: 6 }}><Text style={{ fontFamily: F.b400, fontSize: 15, color: C.error }}>{L.deleteMeeting}</Text></Pressable> : null}
      </View>
    </Sheet>
  );
}

export function SettingsSheet({ bottomInset, onClose }: { bottomInset: number; onClose: () => void }) {
  const { L, settings, setSettings } = useStore();
  const label = { fontFamily: F.d500, fontSize: 15, color: C.navy };
  return (
    <Sheet title={L.settings} onClose={onClose} bottomInset={bottomInset}>
      <View style={{ gap: 8 }}>
        <Text style={label}>{L.language}</Text>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.grey400 }}>
          {(['nl', 'en'] as const).map(id => (
            <Pressable key={id} onPress={() => setSettings({ lang: id })} style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, backgroundColor: settings.lang === id ? C.navy : C.white }}>
              <Flag id={id} />
              <Text style={{ fontFamily: F.d400, fontSize: 14, letterSpacing: ls(0.06, 14), color: settings.lang === id ? C.white : C.navy }}>{id === 'nl' ? 'NEDERLANDS' : 'ENGLISH'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={label}>{L.me}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {OWNERS.map(o => {
            const on = settings.me === o.id;
            return (
              <Pressable key={o.id} onPress={() => setSettings({ me: o.id })} style={{ borderWidth: 1, borderColor: on ? C.navy : C.grey400, backgroundColor: on ? C.navy : C.white, paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ fontFamily: F.b600, fontSize: 14, color: on ? C.white : C.navy }}>{o.id} · {o.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[label, { flex: 1 }]}>{L.showPrices}</Text>
        <Switch value={settings.showPrices} onValueChange={v => setSettings({ showPrices: v })}
          trackColor={{ true: C.green, false: C.grey400 }} thumbColor={C.white} />
      </View>
      <Text style={{ fontFamily: F.b400, fontSize: 12, color: C.navy300 }}>SIAL Notes v{Constants.expoConfig?.version ?? '1.0.0'} · Luiten Food</Text>
      <Button full variant="secondary" onPress={onClose}>{L.close}</Button>
    </Sheet>
  );
}
