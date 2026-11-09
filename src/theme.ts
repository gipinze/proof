export const colors = {
  bg: '#0A0A0C',
  surface: '#15151A',
  surfaceAlt: '#1D1D24',
  surfaceHi: '#26262F',
  border: '#2A2A33',
  text: '#F6F6F8',
  muted: '#8C8C99',
  faint: '#5C5C68',
  accent: '#FF5A1F',
  accentDim: '#3A1A0C',
  accentText: '#FF8A54',
  good: '#3DD68C',
  cardBg: '#101014',

  // muscle heat ramp, cold -> hot
  heat: ['#2A2B33', '#43200F', '#7E340D', '#C64E0C', '#FF7A24'],
  body: '#22232A',
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };

export const space = (n: number) => n * 4;

export const type = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
  section: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.6 },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  tiny: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.8 },
};

/** Monospaced-ish digits so numbers don't jump while they tick. */
export const tabular = { fontVariant: ['tabular-nums' as const] };
