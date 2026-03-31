export const COLORS = {
  brand:     '#1A8CA5',
  brandDark: '#157084',
  brandLight:'#2ba6c0',
  gold:      '#c9a566',
  bg:        '#060d1f',
  card:      '#0d1a30',
  cardBorder:'#1a2d48',
  surface:   '#132038',
  text:      '#e8f4f7',
  textMuted: '#7a9bb5',
  red:       '#ef4444',
  green:     '#22c55e',
  amber:     '#f59e0b',
  white:     '#ffffff',
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium:  { fontFamily: 'System', fontWeight: '600' as const },
  bold:    { fontFamily: 'System', fontWeight: '700' as const },
  xbold:   { fontFamily: 'System', fontWeight: '800' as const },
};

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
export const SHADOW = {
  sm: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  md: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, elevation: 6 },
  lg: { shadowColor: '#1A8CA5', shadowOpacity: 0.25, shadowRadius: 24, elevation: 10 },
};
