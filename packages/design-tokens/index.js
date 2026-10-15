/**
 * DOCUMIND-AI Shared Design Tokens
 * Common color palette, typography scale, spacing, radii, and semantic tokens
 * for both Web (Tailwind/CSS) and Mobile (React Native / StyleSheet)
 */

export const colors = {
  // Brand Primary (Scientific Indigo)
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // Slate Neutral Canvas & Typography
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#172033',
    900: '#0f172a',
    950: '#090d16',
  },

  // Semantic Status Colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    900: '#064e3b',
    950: '#022c22',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    600: '#0284c7',
    900: '#0c4a6e',
  },

  // Light Theme Contextual Tokens
  light: {
    canvas: '#f8fafc',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    accent: '#4f46e5',
    accentSubtle: '#eef2ff',
    tabBarBg: '#ffffff',
    tabBarBorder: '#e2e8f0',
  },

  // Dark Theme Contextual Tokens (Deep Obsidian Matrix)
  dark: {
    canvas: '#090d16',
    surface: '#0f172a',
    surfaceElevated: '#162036',
    border: '#1e293b',
    borderSubtle: '#141d2e',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    accent: '#818cf8',
    accentSubtle: '#1e1b4b',
    tabBarBg: '#0f172a',
    tabBarBorder: '#1e293b',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
};

export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
};

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, Menlo, monospace',
    serif: 'Merriweather, Georgia, serif',
  },
  sizes: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};

export const researchSteps = [
  { step: 1, name: 'Add Papers', shortName: 'Papers' },
  { step: 2, name: 'Research Goal', shortName: 'Goal' },
  { step: 3, name: 'Related Work', shortName: 'Related' },
  { step: 4, name: 'Comparison Matrix', shortName: 'Matrix' },
  { step: 5, name: 'Research Gaps', shortName: 'Gaps' },
  { step: 6, name: 'Questions & Hypotheses', shortName: 'RQs' },
  { step: 7, name: 'Methodology', shortName: 'Method' },
  { step: 8, name: 'Benchmarks & Baselines', shortName: 'Baselines' },
  { step: 9, name: 'Results & Gains', shortName: 'Results' },
  { step: 10, name: 'Discussion & Analysis', shortName: 'Analysis' },
  { step: 11, name: 'Paper Draft', shortName: 'Draft' },
];

export default {
  colors,
  spacing,
  radii,
  typography,
  researchSteps,
};
