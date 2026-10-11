import { useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';

// Tokens from docs/ARCHITECTURE.md ("Look and feel"): moving-blanket blue and packing-tape kraft.
const light = {
  bg: '#eef1f4',
  surface: '#ffffff',
  sunk: '#f6f8fa',
  ink: '#14202e',
  muted: '#5a6878',
  line: '#d5dce4',
  blanket: '#23488f',
  blanketSoft: '#e3eaf7',
  onBlanket: '#ffffff',
  kraft: '#9a6b2c',
  kraftTape: '#d8b47e',
  kraftSoft: '#f5ead8',
  ok: '#1f7a4d',
  okSoft: '#e1f2e9',
  warn: '#9a5800',
  warnSoft: '#fbeedb',
  bad: '#b3261e',
  badSoft: '#fbe4e2',
  backdrop: 'rgba(10,16,24,0.5)',
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#0f151d',
  surface: '#18212c',
  sunk: '#131b24',
  ink: '#e6ebf1',
  muted: '#93a1b0',
  line: '#2a3644',
  blanket: '#86a8ec',
  blanketSoft: '#1f2c45',
  onBlanket: '#0f151d',
  kraft: '#dcb57c',
  kraftTape: '#8a6a3c',
  kraftSoft: '#2e261b',
  ok: '#66c896',
  okSoft: '#173326',
  warn: '#e8a64f',
  warnSoft: '#352612',
  bad: '#f2908a',
  badSoft: '#3a1c1a',
  backdrop: 'rgba(0,0,0,0.6)',
};

// System fonts only. Condensed faces stand in for Barlow Condensed on headings.
export const fonts = {
  display: Platform.select({ ios: 'AvenirNextCondensed-Bold', android: 'sans-serif-condensed', default: undefined }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
};

export const radius = 8;

export interface Theme {
  dark: boolean;
  c: Colors;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return useMemo(() => ({ dark: isDark, c: isDark ? dark : light }), [isDark]);
}

/** Build a StyleSheet from the current theme, memoized per color scheme. */
export function useStyles<T>(factory: (t: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
