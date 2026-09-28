import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, BackHandler, Dimensions, Image, KeyboardAvoidingView, Pressable, ScrollView, Text, View,
} from 'react-native';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import { DEFAULT_DUE, DUE_OPTIONS, GROUPS, OWNERS, fmtDate, uid } from '../constants';
import { recognize, ocrSupported } from '../../modules/sial-ocr/src';
import { fmtDuration, persist, removeFile, takePhoto } from '../media';
import { Draft, DraftAttachment, useStore } from '../store';
import { C, F, ls } from '../theme';
import type { AttachmentType, Note } from '../types';
import { AnimalIcon, Button, Icon, Input } from '../ui';

export interface CaptureInit {
  editId: string | null;
  meetingId: string | null;
  prefill?: { company: string; stand: string; contact: string };
}

const emptyDraft = (me: string): Draft => ({
  company: '', stand: '', contact: '', country: '', role: '', groups: [], otherGroup: '', priority: 'warm', text: '', price: '',
  task: '', owner: me, due: DEFAULT_DUE, attachments: [],
});

export default function Capture({ init, day, topInset, bottomInset, onClose, onSaved }: {
  init: CaptureInit; day: number; topInset: number; bottomInset: number;
  onClose: () => void; onSaved: (noteId: string, isEdit: boolean) => void;
}) {
  const { L, notes, attachments, settings, saveNote } = useStore();
  const [f, setF] = useState<Draft>(() => {
    const base = emptyDraft(settings.me);
    const n: Note | undefined = init.editId ? notes.find(x => x.id === init.editId) : undefined;
    if (n) {
      return {
        ...base, company: n.company, stand: n.stand === '–' ? '' : n.stand, contact: n.contact === L.unknown ? '' : n.contact,
        country: n.country, role: n.role, groups: n.groups, otherGroup: n.otherGroup, priority: n.priority, text: n.text, price: n.price,
        attachments: attachments.filter(a => a.noteId === n.id).map(a => ({ id: a.id, type: a.type, uri: a.uri, durationSec: a.durationSec, isNew: false })),
      };
    }
    return { ...base, ...(init.prefill ?? {}) };
  });
  const [removed, setRemoved] = useState<DraftAttachment[]>([]);
  const [companyError, setCompanyError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ocr, setOcr] = useState<'idle' | 'reading' | 'added' | 'none' | 'fail'>('idle');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 250);

  const slide = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  useEffect(() => { Animated.timing(slide, { toValue: 0, duration: 300, useNativeDriver: true }).start(); }, [slide]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { cancel(); return true; });
    return () => sub.remove();
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setF(s => ({ ...s, [k]: v }));
    if (k === 'company') setCompanyError('');
  };

  const addAtt = (type: AttachmentType, tempUri: string, durationSec: number | null, ext: string) => {
    const id = uid();
    const uri = persist(tempUri, id, ext);
    setF(s => ({
      ...s,
      attachments: [...(type === 'card' || type === 'voice' ? s.attachments.filter(a => a.type !== type) : s.attachments), { id, type, uri, durationSec, isNew: true }],
    }));
    // A replaced card / voice memo counts as removed.
    if (type === 'card' || type === 'voice') {
      const old = f.attachments.filter(a => a.type === type);
      if (old.length) setRemoved(r => [...r, ...old]);
    }
    return uri;
  };

  const toggleGroup = (g: Draft['groups'][number]) =>
    setF(s => ({ ...s, groups: s.groups.includes(g) ? s.groups.filter(x => x !== g) : [...s.groups, g] }));

  /** Photograph a handwritten page, keep it as attachment and append its OCR text to the note. */
  const scanPage = async (gallery: boolean) => {
    const r = await takePhoto(gallery);
    if (r === 'denied') { Alert.alert(L.permCam); return; }
    if (!r) return;
    const uri = addAtt('page', r, null, 'jpg');
    setOcr('reading');
    try {
      const blocks = await recognize(uri);
      const text = blocks.map(lines => lines.join('\n')).join('\n\n').trim();
      if (!text) { setOcr('none'); return; }
      setF(s => ({ ...s, text: s.text.trim() ? s.text.trimEnd() + '\n\n' + text : text }));
      setOcr('added');
    } catch {
      setOcr('fail');
    }
  };
  const pickPage = () => Alert.alert(L.scanNotes, undefined, [
    { text: L.cancel, style: 'cancel' },
    { text: L.gallery, onPress: () => scanPage(true) },
    { text: L.camera, onPress: () => scanPage(false) },
  ]);

  const removeAtt = (a: DraftAttachment) => Alert.alert(L.removeQ, undefined, [
    { text: L.no, style: 'cancel' },
    { text: L.remove, style: 'destructive', onPress: () => { setF(s => ({ ...s, attachments: s.attachments.filter(x => x.id !== a.id) })); setRemoved(r => [...r, a]); } },
  ]);

  const shoot = async (type: 'card' | 'photo', gallery: boolean) => {
    const r = await takePhoto(gallery);
    if (r === 'denied') Alert.alert(L.permCam);
    else if (r) addAtt(type, r, null, 'jpg');
  };
  const pickImage = (type: 'card' | 'photo') => Alert.alert(type === 'card' ? L.businessCard : L.photoL, undefined, [
    { text: L.cancel, style: 'cancel' },
    { text: L.gallery, onPress: () => shoot(type, true) },
    { text: L.camera, onPress: () => shoot(type, false) },
  ]);

  const toggleRecord = async () => {
    if (rec.isRecording) {
      const secs = rec.durationMillis / 1000;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (recorder.uri) addAtt('voice', recorder.uri, secs, 'm4a');
      return;
    }
    const p = await requestRecordingPermissionsAsync();
    if (!p.granted) { Alert.alert(L.permMic); return; }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const cancel = async () => {
    if (rec.isRecording) await recorder.stop();
    // Files captured in this session were never saved to a note.
    [...f.attachments, ...removed].filter(a => a.isNew).forEach(a => removeFile(a.uri));
    Animated.timing(slide, { toValue: Dimensions.get('window').height, duration: 250, useNativeDriver: true }).start(onClose);
  };

  const save = async () => {
    if (saving) return;
    if (!f.company.trim()) { setCompanyError(L.companyErr); return; }
    if (rec.isRecording) await recorder.stop();
    setSaving(true);
    try {
      const id = await saveNote(f, { editId: init.editId, meetingId: init.meetingId, day, removed });
      onSaved(id, !!init.editId);
    } catch (e) {
      Alert.alert(L.errTitle, String(e));
      setSaving(false);
    }
  };

  const has = (t: AttachmentType) => f.attachments.filter(a => a.type === t);
  const tiles: { k: AttachmentType; label: string; icon: 'card' | 'camera' | 'mic'; onPress: () => void }[] = [
    { k: 'card', label: L.businessCard, icon: 'card', onPress: () => pickImage('card') },
    { k: 'photo', label: L.photoL, icon: 'camera', onPress: () => pickImage('photo') },
    { k: 'voice', label: rec.isRecording ? L.stop + ' · ' + fmtDuration(rec.durationMillis / 1000) : L.voiceMemo, icon: 'mic', onPress: toggleRecord },
  ];
  const label = (t: typeof tiles[number]) => {
    if (t.k === 'voice' && rec.isRecording) return t.label;
    const n = has(t.k).length;
    if (!n) return t.label;
    return t.k === 'photo' ? `${t.label} · ${n}` : `${t.label} ${L.added}`;
  };
  const sectionLabel = { fontFamily: F.d500, fontSize: 15, color: C.navy };

  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.white, zIndex: 5, transform: [{ translateY: slide }] }}>
      <View style={{ backgroundColor: C.navy, paddingTop: topInset + 12, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={cancel} hitSlop={8} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: F.b400, fontSize: 15, color: C.white }}>{L.cancel}</Text>
        </Pressable>
        <Text style={{ fontFamily: F.d600, fontSize: 18, textTransform: 'uppercase', letterSpacing: ls(0.04, 18), color: C.white }}>
          {init.editId ? L.editNote : L.newNote}
        </Text>
        <Pressable onPress={save} hitSlop={8} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: F.d400, fontSize: 16, textTransform: 'uppercase', letterSpacing: ls(0.04, 16), color: C.green }}>{L.save}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 + bottomInset, gap: 18 }}>
          <Input label={L.company} required value={f.company} onChangeText={v => set('company', v)} error={companyError || undefined}
            placeholder={L.companyPh} autoCapitalize="words" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Input style={{ flex: 1 }} label={L.stand} value={f.stand} onChangeText={v => set('stand', v)} placeholder="e.g. 5A 112" autoCapitalize="characters" />
            <Input style={{ flex: 1 }} label={L.contact} value={f.contact} onChangeText={v => set('contact', v)} placeholder={L.name} autoCapitalize="words" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Input style={{ flex: 1 }} label={L.country} value={f.country} onChangeText={v => set('country', v)} placeholder={L.countryPh} autoCapitalize="words" />
            <Input style={{ flex: 1 }} label={L.role} value={f.role} onChangeText={v => set('role', v)} placeholder={L.rolePh} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={sectionLabel}>{L.group} <Text style={{ fontFamily: F.b400, fontSize: 13, color: C.navy500 }}>· {L.groupHint}</Text></Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GROUPS.map(g => {
                const on = f.groups.includes(g.id);
                return (
                  <Pressable key={g.id} onPress={() => toggleGroup(g.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{
                    width: '31.8%', borderWidth: on ? 2 : 1, borderColor: on ? C.navy : C.grey400, backgroundColor: on ? C.green100 : C.white,
                    paddingTop: on ? 9 : 10, paddingBottom: on ? 7 : 8, paddingHorizontal: 4, alignItems: 'center', gap: 6,
                  }}>
                    <AnimalIcon group={g.id} w={44} h={28} />
                    <Text numberOfLines={1} style={{ fontFamily: F.b600, fontSize: 13, color: C.navy }}>{L.groups[g.id]}</Text>
                  </Pressable>
                );
              })}
            </View>
            {f.groups.includes('other') ? (
              <Input value={f.otherGroup} onChangeText={v => set('otherGroup', v)} placeholder={L.otherPh} autoFocus={!f.otherGroup} />
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={sectionLabel}>{L.priority}</Text>
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.grey400 }}>
              {(['hot', 'warm', 'cold'] as const).map(p => (
                <Pressable key={p} onPress={() => set('priority', p)} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: f.priority === p ? C.navy : C.white }}>
                  <Text style={{ fontFamily: F.d400, fontSize: 14, textTransform: 'uppercase', letterSpacing: ls(0.04, 14), color: f.priority === p ? C.white : C.navy }}>
                    {p === 'hot' ? L.hotShort : L.pri[p]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Input label={L.note} multiline rows={4} value={f.text} onChangeText={v => set('text', v)} placeholder={L.notePh} />
            {ocrSupported ? (
              <Pressable onPress={pickPage} disabled={ocr === 'reading'} style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10,
                borderWidth: 2, borderColor: C.navy, backgroundColor: pressed ? C.navy : C.white, opacity: ocr === 'reading' ? 0.6 : 1,
              })}>
                {({ pressed }) => (
                  <>
                    {ocr === 'reading' ? <ActivityIndicator color={pressed ? C.white : C.navy} /> : <Icon name="scan" color={pressed ? C.white : C.navy} size={20} />}
                    <Text style={{ fontFamily: F.d500, fontSize: 15, textTransform: 'uppercase', letterSpacing: ls(0.04, 15), color: pressed ? C.white : C.navy }}>
                      {ocr === 'reading' ? L.reading : L.scanNotes}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
            {ocr === 'added' || ocr === 'none' || ocr === 'fail' ? (
              <Text style={{ fontFamily: F.b400, fontSize: 13, color: ocr === 'added' ? C.accent : C.error }}>
                {ocr === 'added' ? L.ocrAdded : ocr === 'none' ? L.ocrNone : L.ocrFail}
              </Text>
            ) : null}
          </View>
          {settings.showPrices ? <Input label={L.price} value={f.price} onChangeText={v => set('price', v)} placeholder={L.pricePh} /> : null}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tiles.map(t => {
              const on = has(t.k).length > 0 || (t.k === 'voice' && rec.isRecording);
              const live = t.k === 'voice' && rec.isRecording;
              return (
                <Pressable key={t.k} onPress={t.onPress} style={{
                  flex: 1, borderWidth: on ? 2 : 1, borderColor: live ? C.error : on ? C.accent : C.grey400, backgroundColor: on ? C.green50 : C.white,
                  paddingVertical: on ? 11 : 12, paddingHorizontal: 4, alignItems: 'center', gap: 6,
                }}>
                  <Icon name={live ? 'stop' : t.icon} color={live ? C.error : C.navy} />
                  <Text numberOfLines={1} style={{ fontFamily: F.b600, fontSize: 12, color: C.navy }}>{label(t)}</Text>
                </Pressable>
              );
            })}
          </View>
          {f.attachments.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -8 }}>
              {f.attachments.map(a => (
                <Pressable key={a.id} onPress={() => removeAtt(a)} style={{ width: 64, height: 64, backgroundColor: a.type === 'voice' ? C.navy : C.grey }}>
                  {a.type === 'voice' ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <Icon name="mic" color={C.green} size={18} />
                      <Text style={{ fontFamily: F.b400, fontSize: 11, color: C.white }}>{fmtDuration(a.durationSec)}</Text>
                    </View>
                  ) : <Image source={{ uri: a.uri }} style={{ width: 64, height: 64 }} />}
                  <View style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(2,45,78,.8)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" color={C.white} size={12} strokeWidth={3} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={{ backgroundColor: C.grey100, padding: 14, gap: 10 }}>
            <Input label={L.taskLabel} value={f.task} onChangeText={v => set('task', v)} placeholder={L.taskPh} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: F.b400, fontSize: 13, color: C.navy500 }}>{L.assign}</Text>
              {OWNERS.map(o => {
                const on = f.owner === o.id;
                return (
                  <Pressable key={o.id} onPress={() => set('owner', o.id)} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: on ? C.navy : C.grey400, backgroundColor: on ? C.navy : C.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: F.d400, fontSize: 12, color: on ? C.white : C.navy }}>{o.id}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: F.b400, fontSize: 13, color: C.navy500, marginRight: 2 }}>{L.dueDate}</Text>
              {DUE_OPTIONS.map(d => {
                const on = f.due === d;
                return (
                  <Pressable key={d} onPress={() => set('due', d)} style={{ borderWidth: 1, borderColor: on ? C.navy : C.grey400, backgroundColor: on ? C.navy : C.white, paddingVertical: 5, paddingHorizontal: 8 }}>
                    <Text style={{ fontFamily: F.b600, fontSize: 12, color: on ? C.white : C.navy }}>{fmtDate(d, L)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button full onPress={save} disabled={saving}>{L.saveNote}</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
