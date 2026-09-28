import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import Svg, { Circle, Path, Rect, SvgXml } from 'react-native-svg';
import { C, F, ls, shadowCard } from './theme';
import { ANIMAL_SVG, FLAG_SVG } from './svgAssets';
import { GROUP_ICON } from './constants';
import type { Group } from './types';

// ---------- Text helpers ----------

export const T = StyleSheet.create({
  section: { fontFamily: F.d600, fontSize: 16, textTransform: 'uppercase', letterSpacing: ls(0.04, 16), color: C.navy },
  h1: { fontFamily: F.d700, fontSize: 28, lineHeight: 31, textTransform: 'uppercase', color: C.white },
  muted: { fontFamily: F.b400, fontSize: 13, color: C.navy500 },
  body: { fontFamily: F.b400, fontSize: 14, lineHeight: 21, color: C.navy },
  companyRow: { fontFamily: F.d600, fontSize: 15, textTransform: 'uppercase', color: C.navy },
  link: { fontFamily: F.b400, fontSize: 14, color: C.accent },
});

export const Card = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={[{ backgroundColor: C.white }, shadowCard, style]}>{children}</View>
);

export const GreenRule = ({ width = 36 }: { width?: number }) => (
  <View style={{ width, height: 3, backgroundColor: C.green }} />
);

// ---------- DS components ----------

const BADGE: Record<string, [string, string]> = {
  green: [C.green, C.white], accent: [C.accent, C.white], navy: [C.navy, C.white], grey: [C.grey, C.navy], tint: [C.green100, C.navy],
};
export const Badge = ({ tone = 'green', children }: { tone?: string; children: React.ReactNode }) => {
  const [bg, fg] = BADGE[tone] ?? BADGE.green;
  return (
    <View style={{ backgroundColor: bg, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'center' }}>
      <Text style={{ fontFamily: F.d500, fontSize: 12, lineHeight: 14.4, letterSpacing: ls(0.08, 12), textTransform: 'uppercase', color: fg }}>
        {children}
      </Text>
    </View>
  );
};

type Variant = 'primary' | 'secondary' | 'outline' | 'inverse';
const BTN: Record<Variant, { bg: string; fg: string; bd: string; pbg: string; pfg: string }> = {
  primary: { bg: C.green, fg: C.white, bd: C.green, pbg: C.accent, pfg: C.white },
  secondary: { bg: C.navy, fg: C.white, bd: C.navy, pbg: C.navy700, pfg: C.white },
  outline: { bg: 'transparent', fg: C.navy, bd: C.navy, pbg: C.navy, pfg: C.white },
  inverse: { bg: 'transparent', fg: C.white, bd: C.white, pbg: C.white, pfg: C.navy },
};
export function Button({ variant = 'primary', size = 'md', full, onPress, children, disabled, style }: {
  variant?: Variant; size?: 'sm' | 'md'; full?: boolean; onPress?: () => void; children: React.ReactNode; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const v = BTN[variant];
  const sm = size === 'sm';
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [{
      borderWidth: 2, borderColor: pressed ? v.pbg : v.bd,
      backgroundColor: pressed ? v.pbg : v.bg,
      paddingVertical: sm ? 8 : 12, paddingHorizontal: sm ? 18 : 28,
      alignItems: 'center', justifyContent: 'center', alignSelf: full ? 'stretch' : 'flex-start', opacity: disabled ? 0.45 : 1,
    }, style]}>
      {({ pressed }) => (
        <Text style={{ fontFamily: F.d500, fontSize: sm ? 14 : 16, letterSpacing: ls(0.04, sm ? 14 : 16), textTransform: 'uppercase', color: pressed ? v.pfg : v.fg }}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export const Tag = ({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) => (
  <Pressable onPress={onPress} style={({ pressed }) => ({
    borderRadius: 999, borderWidth: 1, borderColor: selected ? C.navy : C.grey400,
    backgroundColor: selected ? C.navy : pressed ? C.grey100 : C.white, paddingVertical: 7, paddingHorizontal: 16,
  })}>
    <Text style={{ fontFamily: F.b600, fontSize: 15, color: selected ? C.white : C.navy }}>{children}</Text>
  </Pressable>
);

export function Input({ label, required, error, multiline, rows = 4, style, ...rest }: TextInputProps & {
  label?: string; required?: boolean; error?: string; rows?: number; style?: StyleProp<ViewStyle>;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={style}>
      {label ? (
        <Text style={{ fontFamily: F.d500, fontSize: 15, color: C.navy, marginBottom: 6 }}>
          {label}{required ? <Text style={{ color: C.accent }}> *</Text> : null}
        </Text>
      ) : null}
      <View style={{ borderWidth: focus ? 3 : 0, borderColor: C.green100, margin: focus ? -3 : 0 }}>
        <TextInput
          {...rest}
          multiline={multiline}
          numberOfLines={multiline ? rows : 1}
          onFocus={e => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={e => { setFocus(false); rest.onBlur?.(e); }}
          placeholderTextColor={C.navy300}
          style={{
            fontFamily: F.b400, fontSize: 16, color: C.navy, backgroundColor: C.white,
            borderWidth: 1, borderColor: error ? C.error : focus ? C.green : C.grey400,
            paddingVertical: 12, paddingHorizontal: 14, minHeight: multiline ? rows * 24 + 24 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
      </View>
      {error ? <Text style={{ fontFamily: F.b400, fontSize: 13, color: C.error, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

export const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <Pressable onPress={onChange} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked }}
    style={{ width: 20, height: 20, borderWidth: 2, borderColor: checked ? C.green : C.grey400, backgroundColor: checked ? C.green : C.white, alignItems: 'center', justifyContent: 'center' }}>
    {checked ? (
      <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M20 6 9 17l-5-5" stroke={C.white} strokeWidth={3.5} fill="none" strokeLinecap="square" /></Svg>
    ) : null}
  </Pressable>
);

export function Toast({ title, body, onHide }: { title: string; body: string; onHide: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const t = setTimeout(onHide, 2800);
    return () => clearTimeout(t);
  }, [title, body]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      backgroundColor: C.navy, paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 4, borderBottomColor: C.accent,
      shadowColor: C.navy, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
      <Text style={{ fontFamily: F.d400, fontSize: 17, textTransform: 'uppercase', letterSpacing: ls(0.03, 17), color: C.white }}>{title}</Text>
      <Text style={{ fontFamily: F.b400, fontSize: 15, lineHeight: 22, color: C.white, opacity: 0.9 }}>{body}</Text>
    </Animated.View>
  );
}

// ---------- Brand bits ----------

export const Avatar = ({ id, size = 32, style }: { id: string; size?: number; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Text style={{ fontFamily: F.d400, fontSize: size > 30 ? 12 : 11, color: C.white }}>{id}</Text>
  </View>
);

export const AnimalIcon = ({ group, w = 40, h = 28 }: { group: Group; w?: number; h?: number }) => (
  <SvgXml xml={ANIMAL_SVG[GROUP_ICON[group]]} width={w} height={h} />
);

export const Flag = ({ id, size = 16 }: { id: 'nl' | 'en'; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
    <SvgXml xml={FLAG_SVG[id]} width={size} height={size} />
  </View>
);

export const SyncStatus = ({ label }: { label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }} />
    <Text style={{ fontFamily: F.b400, fontSize: 12, color: C.green200 }}>{label}</Text>
  </View>
);

// ---------- Lucide icons (2px stroke) ----------

type IconName = 'calendar' | 'file' | 'check' | 'clipboard' | 'search' | 'chevron' | 'plus' | 'card' | 'camera' | 'mic' | 'play' | 'pause' | 'settings' | 'x' | 'stop';
export function Icon({ name, size = 22, color = C.navy, strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'calendar' && <><Rect x={3} y={4} width={18} height={18} rx={2} {...p} /><Path d="M16 2v4M8 2v4M3 10h18" {...p} /></>}
      {name === 'file' && <><Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" {...p} /><Path d="M14 2v5h5M16 13H8M16 17H8M10 9H8" {...p} /></>}
      {name === 'check' && <><Path d="m9 11 3 3L22 4" {...p} /><Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" {...p} /></>}
      {name === 'clipboard' && <><Rect x={8} y={2} width={8} height={4} rx={1} {...p} /><Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01" {...p} /></>}
      {name === 'search' && <><Circle cx={11} cy={11} r={8} {...p} /><Path d="m21 21-4.3-4.3" {...p} /></>}
      {name === 'chevron' && <Path d="m15 18-6-6 6-6" {...p} />}
      {name === 'plus' && <Path d="M5 12h14M12 5v14" {...p} />}
      {name === 'x' && <Path d="M18 6 6 18M6 6l12 12" {...p} />}
      {name === 'card' && <><Rect x={2} y={5} width={20} height={14} rx={2} {...p} /><Circle cx={8} cy={12} r={2} {...p} /><Path d="M13 10h5M13 14h3" {...p} /></>}
      {name === 'camera' && <><Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" {...p} /><Circle cx={12} cy={13} r={3} {...p} /></>}
      {name === 'mic' && <><Rect x={9} y={2} width={6} height={12} rx={3} {...p} /><Path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" {...p} /></>}
      {name === 'play' && <Path d="M6 3l14 9-14 9V3z" {...p} fill={color} />}
      {name === 'pause' && <Path d="M6 4h4v16H6zM14 4h4v16h-4z" {...p} fill={color} />}
      {name === 'stop' && <Rect x={5} y={5} width={14} height={14} {...p} fill={color} />}
      {name === 'settings' && <><Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" {...p} /><Circle cx={12} cy={12} r={3} {...p} /></>}
    </Svg>
  );
}
