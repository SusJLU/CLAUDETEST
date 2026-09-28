import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Oswald_300Light, Oswald_400Regular, Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { SourceSans3_400Regular, SourceSans3_600SemiBold, SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/store';
import { todayIndex } from './src/constants';
import { C, F, ls, shadowFab } from './src/theme';
import type { Meeting, TabId } from './src/types';
import { Icon, Toast } from './src/ui';
import type { Nav } from './src/screens/common';
import Today from './src/screens/Today';
import Notes from './src/screens/Notes';
import FollowUps from './src/screens/FollowUps';
import Summary from './src/screens/Summary';
import Detail from './src/screens/Detail';
import Capture, { CaptureInit } from './src/screens/Capture';
import { MeetingSheet, SettingsSheet } from './src/screens/Sheets';

SplashScreen.preventAutoHideAsync();

const TABS: { id: TabId; icon: 'calendar' | 'file' | 'check' | 'clipboard' }[] = [
  { id: 'today', icon: 'calendar' },
  { id: 'notes', icon: 'file' },
  { id: 'follow', icon: 'check' },
  { id: 'summary', icon: 'clipboard' },
];

function Shell() {
  const { ready, L } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>('today');
  const [day, setDay] = useState(todayIndex);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureInit | null>(null);
  const [meetingSheet, setMeetingSheet] = useState<{ meeting: Meeting | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string; key: number } | null>(null);

  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);

  const showToast = useCallback((title: string, body: string) => setToast({ title, body, key: Date.now() }), []);

  // Android back: close the top-most layer first, then fall back to the Today tab.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (capture) return false; // Capture handles its own back press (cleans up unsaved media)
      if (detailId) { setDetailId(null); return true; }
      if (tab !== 'today') { setTab('today'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [capture, detailId, tab]);

  if (!ready) return null;

  const tabBarH = 62 + insets.bottom;
  const nav: Nav = {
    day, setDay,
    openNote: id => setDetailId(id),
    openCapture: (prefill, meetingId) => setCapture({ editId: null, meetingId: meetingId ?? null, prefill }),
    openMeeting: m => setMeetingSheet({ meeting: m }),
    openSettings: () => setSettingsOpen(true),
    goTab: t => { setTab(t); setDetailId(null); },
    toast: showToast,
    topInset: insets.top,
  };
  const showFab = !capture && !detailId && (tab === 'today' || tab === 'notes');

  return (
    <View style={{ flex: 1, backgroundColor: C.grey100 }}>
      <StatusBar style="light" />
      {detailId ? (
        <Detail key={detailId} id={detailId} nav={nav} backLabel={L.tabs[TABS.findIndex(t => t.id === tab)]}
          onClose={() => setDetailId(null)} onEdit={() => setCapture({ editId: detailId, meetingId: null })} />
      ) : tab === 'today' ? <Today nav={nav} />
        : tab === 'notes' ? <Notes nav={nav} />
        : tab === 'follow' ? <FollowUps nav={nav} />
        : <Summary nav={nav} />}

      {!capture ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tabBarH, paddingBottom: insets.bottom, backgroundColor: C.navy, flexDirection: 'row', zIndex: 3 }}>
          {TABS.map((t, i) => {
            const on = !detailId && tab === t.id;
            const color = on ? C.green : C.navy300;
            return (
              <Pressable key={t.id} onPress={() => { setTab(t.id); setDetailId(null); }}
                style={{ flex: 1, borderTopWidth: 3, borderTopColor: on ? C.green : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Icon name={t.icon} color={color} />
                <Text style={{ fontFamily: F.d400, fontSize: 11, textTransform: 'uppercase', letterSpacing: ls(0.08, 11), color }}>{L.tabs[i]}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {showFab ? (
        <Pressable accessibilityLabel={L.newNote} onPress={() => nav.openCapture()}
          style={({ pressed }) => [{ position: 'absolute', right: 20, bottom: tabBarH + 16, width: 60, height: 60, backgroundColor: pressed ? C.accent : C.green, alignItems: 'center', justifyContent: 'center', zIndex: 4 }, shadowFab]}>
          <Icon name="plus" color={C.white} size={28} strokeWidth={2.5} />
        </Pressable>
      ) : null}

      {capture ? (
        <Capture init={capture} day={day} topInset={insets.top} bottomInset={insets.bottom}
          onClose={() => setCapture(null)}
          onSaved={(id, isEdit) => {
            setCapture(null);
            if (isEdit) setDetailId(id);
            else { setDetailId(null); setTab('notes'); }
            showToast(L.noteSaved, L.savedBody);
          }} />
      ) : null}

      {meetingSheet ? <MeetingSheet meeting={meetingSheet.meeting} day={day} bottomInset={insets.bottom} onClose={() => setMeetingSheet(null)} toast={showToast} /> : null}
      {settingsOpen ? <SettingsSheet bottomInset={insets.bottom} onClose={() => setSettingsOpen(false)} /> : null}

      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: tabBarH + 16, zIndex: 6 }}>
          <Toast key={toast.key} title={toast.title} body={toast.body} onHide={() => setToast(null)} />
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Oswald_300Light, Oswald_400Regular, Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold,
    SourceSans3_400Regular, SourceSans3_600SemiBold, SourceSans3_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
