// Luiten Food huisstijl tokens (see docs/DESIGN_HANDOFF.md).
export const C = {
  navy: '#022D4E',
  navy700: '#335773',
  navy500: '#668196',
  navy300: '#99ABB9',
  green: '#98CD50',
  accent: '#3EA448',
  green200: '#CCE5A8',
  green100: '#E3F1CF',
  green50: '#F1F8E7',
  grey: '#E1E4E5',
  grey400: '#C5CCCD',
  grey100: '#F4F5F6',
  white: '#FFFFFF',
  error: '#C0392B',
};

// Android ignores fontWeight for custom fonts, so each weight is its own family.
export const F = {
  d300: 'Oswald_300Light',
  d400: 'Oswald_400Regular',
  d500: 'Oswald_500Medium',
  d600: 'Oswald_600SemiBold',
  d700: 'Oswald_700Bold',
  b400: 'SourceSans3_400Regular',
  b600: 'SourceSans3_600SemiBold',
  b700: 'SourceSans3_700Bold',
};

export const shadowCard = {
  shadowColor: C.navy,
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export const shadowFab = {
  shadowColor: C.navy,
  shadowOpacity: 0.25,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

// Letter-spacing in the design is given in em; RN wants points.
export const ls = (em: number, size: number) => em * size;
