import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { EVENT, TONE, fmtDate } from '../constants';
import { Data, mail, noteSummary } from '../export';
import { fmtDuration } from '../media';
import { useStore } from '../store';
import { C, F, ls } from '../theme';
import type { Attachment } from '../types';
import { AnimalIcon, Badge, Button, Card, Icon, T } from '../ui';
import { Nav, TaskCard, standLine } from './common';

function VoiceTile({ a, label }: { a: Attachment; label: string }) {
  const player = useAudioPlayer(a.uri);
  const st = useAudioPlayerStatus(player);
  useEffect(() => {
    if (st.didJustFinish) { player.pause(); player.seekTo(0); }
  }, [st.didJustFinish]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => (st.playing ? player.pause() : player.play());
  const total = st.duration || a.durationSec || 0;
  return (
    <Pressable onPress={toggle} style={{ flex: 1, aspectRatio: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 }}>
      <Icon name={st.playing ? 'pause' : 'play'} color={C.green} size={26} />
      <Text style={{ fontFamily: F.d400, fontSize: 11, textTransform: 'uppercase', letterSpacing: ls(0.06, 11), color: C.white }}>{label}</Text>
      <Text style={{ fontFamily: F.b400, fontSize: 11, color: C.green200 }}>
        {st.playing || st.currentTime > 0 ? fmtDuration(st.currentTime) + ' / ' : ''}{fmtDuration(total)}
      </Text>
    </Pressable>
  );
}

export default function Detail({ id, nav, backLabel, onClose, onEdit }: {
  id: string; nav: Nav; backLabel: string; onClose: () => void; onEdit: () => void;
}) {
  const store = useStore();
  const { L, notes, tasks, attachments, settings, toggleTask, removeNote } = store;
  const fade = useRef(new Animated.Value(0)).current;
  const [viewer, setViewer] = useState<string | null>(null);
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start(); }, [fade]);

  const n = notes.find(x => x.id === id);
  if (!n) return null;
  const ts = tasks.filter(t => t.noteId === n.id);
  const atts = attachments.filter(a => a.noteId === n.id);
  const media = [...atts.filter(a => a.type === 'card'), ...atts.filter(a => a.type === 'page'), ...atts.filter(a => a.type === 'photo'), ...atts.filter(a => a.type === 'voice')];

  const emailSummary = async () => {
    const data: Data = { ...store };
    await mail(L, `${EVENT.name} — ${n.company}`, noteSummary(data, n, L), atts.map(a => a.uri));
    nav.toast(L.sentTitle, L.sentBody);
  };

  const confirmDelete = () => Alert.alert(L.deleteQ, L.deleteBody, [
    { text: L.no, style: 'cancel' },
    { text: L.yes, style: 'destructive', onPress: async () => { await removeNote(n.id); onClose(); nav.toast(L.noteDeleted, n.company); } },
  ]);

  const row = (label: string, value: React.ReactNode, last = false) => (
    <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.grey, alignItems: 'center' }}>
      <Text style={{ width: 110, fontFamily: F.b400, fontSize: 14, color: C.navy500 }}>{label}</Text>
      <View style={{ flex: 1 }}>{value}</View>
    </View>
  );

  return (
    <Animated.View style={{ flex: 1, opacity: fade }}>
      <View style={{ backgroundColor: C.navy, paddingTop: nav.topInset + 10, paddingHorizontal: 20, paddingBottom: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={onClose} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, marginLeft: -4 }}>
            <Icon name="chevron" size={20} color={C.green} />
            <Text style={{ fontFamily: F.b400, fontSize: 15, color: C.green }}>{backLabel}</Text>
          </Pressable>
          <Pressable onPress={onEdit} hitSlop={8} style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: F.d400, fontSize: 14, textTransform: 'uppercase', letterSpacing: ls(0.04, 14), color: C.green }}>{L.edit}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontFamily: F.d700, fontSize: 24, lineHeight: 28, textTransform: 'uppercase', color: C.white }}>{n.company}</Text>
            <Text style={{ fontFamily: F.b400, fontSize: 14, color: C.green200 }}>{n.country || EVENT.name} · {standLine(n, L)}</Text>
          </View>
          <Badge tone={TONE[n.priority]}>{L.pri[n.priority]}</Badge>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 20 }}>
        <Card>
          {row(L.contact, <Text style={{ fontFamily: F.b600, fontSize: 14, color: C.navy }}>{n.contact} <Text style={{ fontFamily: F.b400, color: C.navy500 }}>· {n.role || '—'}</Text></Text>)}
          {row(L.group, n.groups.length ? (
            <View style={{ gap: 6 }}>
              {n.groups.map(g => (
                <View key={g} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AnimalIcon group={g} w={30} h={20} />
                  <Text style={{ flex: 1, fontFamily: F.b600, fontSize: 14, color: C.navy }}>
                    {g === 'other' && n.otherGroup ? L.groups.other + ': ' + n.otherGroup : L.groups[g]}
                  </Text>
                </View>
              ))}
            </View>
          ) : <Text style={{ fontFamily: F.b400, fontSize: 14, color: C.navy500 }}>—</Text>)}
          {row(L.loggedAt, <Text style={{ fontFamily: F.b400, fontSize: 14, color: C.navy }}>{fmtDate(EVENT.dates[n.day], L)} {n.time} {L.by} {n.createdBy}</Text>, true)}
        </Card>

        {settings.showPrices && n.price ? (
          <View style={{ backgroundColor: C.green50, paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
            <Text style={{ fontFamily: F.d400, fontSize: 12, letterSpacing: ls(0.08, 12), textTransform: 'uppercase', color: C.accent }}>{L.price}</Text>
            <Text style={{ fontFamily: F.b400, fontSize: 15, lineHeight: 22, color: C.navy }}>{n.price}</Text>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={T.section}>{L.note}</Text>
          <Text selectable style={{ fontFamily: F.b400, fontSize: 16, lineHeight: 26, color: C.navy }}>{n.text || L.noText}</Text>
        </View>

        {media.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {media.map(a => (
              <View key={a.id} style={{ width: '31.5%' }}>
                {a.type === 'voice' ? <VoiceTile a={a} label={L.voiceMemo} /> : (
                  <Pressable onPress={() => setViewer(a.uri)} style={{ aspectRatio: 1, backgroundColor: C.grey }}>
                    <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%' }} />
                    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2,45,78,.7)', paddingVertical: 3, paddingHorizontal: 6 }}>
                      <Text numberOfLines={1} style={{ fontFamily: F.d400, fontSize: 10, textTransform: 'uppercase', letterSpacing: ls(0.06, 10), color: C.white }}>
                        {a.type === 'card' ? L.businessCard : a.type === 'page' ? L.handwritten : L.photoL}
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Text style={T.section}>{L.follow}</Text>
          {ts.map(t => <TaskCard key={t.id} t={t} L={L} small onToggle={() => toggleTask(t.id)} />)}
          {ts.length === 0 ? <Text style={[T.muted, { fontSize: 14 }]}>{L.noVisitTasks}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onPress={emailSummary}>{L.emailSummary}</Button>
          <Button variant="outline" size="sm" onPress={onClose}>{L.close}</Button>
        </View>
        <Pressable onPress={confirmDelete} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.b400, fontSize: 14, color: C.error }}>{L.delete}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable onPress={() => setViewer(null)} style={{ flex: 1, backgroundColor: 'rgba(2,45,78,.95)', justifyContent: 'center' }}>
          {viewer ? <Image source={{ uri: viewer }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
          <View style={{ position: 'absolute', top: nav.topInset + 12, right: 20 }}><Icon name="x" color={C.white} size={28} /></View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}
