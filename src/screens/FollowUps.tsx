import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useStore } from '../store';
import { C, F, ls } from '../theme';
import { T } from '../ui';
import { Empty, Nav, TaskCard } from './common';

export default function FollowUps({ nav }: { nav: Nav }) {
  const { L, tasks, notes, toggleTask } = useStore();
  const [view, setView] = useState<'open' | 'done'>('open');
  const open = tasks.filter(t => !t.done);
  const shown = [...tasks.filter(t => (view === 'open' ? !t.done : t.done))].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const seg = (id: 'open' | 'done', label: string) => (
    <Pressable onPress={() => setView(id)} style={{ flex: 1, padding: 10, alignItems: 'center', backgroundColor: view === id ? C.green : 'transparent' }}>
      <Text style={{ fontFamily: F.d400, fontSize: 14, textTransform: 'uppercase', letterSpacing: ls(0.04, 14), color: C.white }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: C.navy, paddingTop: nav.topInset + 14, paddingHorizontal: 20, paddingBottom: 16, gap: 14 }}>
        <Text style={T.h1}>{L.follow}</Text>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.navy500 }}>
          {seg('open', L.open + ' · ' + open.length)}
          {seg('done', L.done + ' · ' + (tasks.length - open.length))}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 10 }}>
        {shown.map(t => {
          const n = notes.find(x => x.id === t.noteId);
          return (
            <TaskCard key={t.id} t={t} L={L} company={n?.company ?? ''} onToggle={() => toggleTask(t.id)}
              onOpen={n ? () => nav.openNote(n.id) : undefined} />
          );
        })}
        {shown.length === 0 ? <Empty>{L.nothing}</Empty> : null}
      </ScrollView>
    </View>
  );
}
