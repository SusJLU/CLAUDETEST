import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GROUPS, TONE } from '../constants';
import { useStore } from '../store';
import { C, F } from '../theme';
import type { Group } from '../types';
import { AnimalIcon, Badge, Card, Icon, SyncStatus, T, Tag } from '../ui';
import { Empty, Nav, mediaMeta, noteTime, standLine } from './common';

export default function Notes({ nav }: { nav: Nav }) {
  const { L, notes, attachments } = useStore();
  const [filter, setFilter] = useState<Group | 'all'>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const list = notes.filter(n => (filter === 'all' || n.groups.includes(filter)) &&
    (!q || [n.company, n.contact, n.stand, n.text, n.country, n.otherGroup].join(' ').toLowerCase().includes(q)));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: C.navy, paddingTop: nav.topInset + 14, paddingHorizontal: 20, paddingBottom: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={T.h1}>{L.notes}</Text>
          <SyncStatus label={L.local} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, paddingHorizontal: 12, height: 44 }}>
          <Icon name="search" size={18} color={C.navy500} />
          <TextInput value={query} onChangeText={setQuery} placeholder={L.search} placeholderTextColor={C.navy300}
            style={{ flex: 1, fontFamily: F.b400, fontSize: 16, color: C.navy, paddingVertical: 0 }} returnKeyType="search" />
          {query ? <Pressable onPress={() => setQuery('')} hitSlop={10}><Icon name="x" size={16} color={C.navy500} /></Pressable> : null}
        </View>
      </View>

      <View style={{ height: 58, flexGrow: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 }}>
          {[{ id: 'all' as const }, ...GROUPS].map(g => (
            <Tag key={g.id} selected={filter === g.id} onPress={() => setFilter(g.id)}>{g.id === 'all' ? L.all : L.groups[g.id]}</Tag>
          ))}
        </ScrollView>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120, gap: 10 }}>
        <Text style={T.muted}>{list.length} {list.length === 1 ? L.n1 : L.nN}</Text>
        {list.map(n => {
          const meta = mediaMeta(attachments.filter(a => a.noteId === n.id), L);
          return (
            <Pressable key={n.id} onPress={() => nav.openNote(n.id)}>
              <Card style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <AnimalIcon group={n.groups[0]} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text numberOfLines={1} style={[T.companyRow, { fontSize: 16 }]}>{n.company}</Text>
                    <Text style={T.muted}>{standLine(n, L)} · {noteTime(n, L)}</Text>
                  </View>
                  <Badge tone={TONE[n.priority]}>{L.pri[n.priority]}</Badge>
                </View>
                <Text numberOfLines={2} style={T.body}>{n.text || L.noText}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.grey, paddingTop: 8, gap: 8 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.b400, fontSize: 12, color: C.navy500, flexShrink: 1 }}>{n.contact}</Text>
                  <Text style={{ fontFamily: F.b400, fontSize: 12, color: C.navy500 }}>{meta}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
        {list.length === 0 ? <Empty>{L.noMatch}</Empty> : null}
      </ScrollView>
    </View>
  );
}
