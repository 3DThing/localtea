// LocalTea Unified Theme Constants
// Warm tea/forest aesthetic with cream and amber accents

import { createTheme, MantineColorsTuple } from '@mantine/core';

// Custom color palette for Mantine
const darkWood: MantineColorsTuple = [
  '#faf8f5',
  '#e8dcc8',
  '#d4c4a8',
  '#c4a574',
  '#b8945d',
  '#a87e45',
  '#8b5a2b',
  '#6b4423',
  '#4a2f1a',
  '#2a1f15',
];

const teaGold: MantineColorsTuple = [
  '#fff9e6',
  '#fff0cc',
  '#ffe099',
  '#ffd066',
  '#e9a562',
  '#d4894f',
  '#b8733d',
  '#8b5a2b',
  '#5e3a1a',
  '#3a2410',
];

// Mantine theme configuration
export const theme = createTheme({
  primaryColor: 'teaGold',
  colors: {
    darkWood,
    teaGold,
  },
  fontFamily: 'inherit',
  headings: {
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
      },
    },
  },
});

export const colors = {
  // Primary backgrounds
  bgDark: '#1a130d',
  bgCard: 'rgba(36,24,14,0.94)',
  bgCardHover: 'rgba(44,30,18,0.96)',
  bgInput: 'rgba(255,255,255,0.02)',
  bgOverlay: 'rgba(18,14,10,0.98)',
  
  // Gradients
  gradientCard: 'linear-gradient(180deg, rgba(36,24,14,0.94), rgba(18,14,10,0.98))',
  gradientCardLight: 'linear-gradient(180deg, rgba(36,24,14,0.8), rgba(22,16,12,0.95))',
  gradientHeader: 'linear-gradient(180deg, rgba(22,16,12,0.96), rgba(12,8,6,0.92))',
  gradientButton: { from: '#d4894f', to: '#8b5a2b' },
  gradientLogo: 'linear-gradient(135deg, #e3cb2a 0%, #5ba45b 40%, #b885ff 100%)',
  
  // Text colors
  textPrimary: '#fbf6ee',
  textSecondary: '#e8dcc8',
  textMuted: '#a89880',
  textAccent: '#d4894f',
  
  // Accent colors
  accent: '#d4894f',
  accentLight: '#e9a562',
  accentDark: '#8b5a2b',
  accentGold: '#d9a85b',
  
  // Status colors
  success: '#4ade80',
  successDark: '#22c55e',
  error: '#f87171',
  errorDark: '#ef4444',
  warning: '#fbbf24',
  info: '#60a5fa',
  
  // Border colors
  border: 'rgba(212,137,79,0.08)',
  borderLight: 'rgba(212,137,79,0.06)',
  borderHover: 'rgba(212,137,79,0.2)',
  borderAccent: 'rgba(212,137,79,0.3)',
  
  // Shadow colors
  shadowDark: 'rgba(8,6,4,0.6)',
  shadowLight: 'rgba(212,137,79,0.12)',
};

export const shadows = {
  card: `0 12px 36px ${colors.shadowDark}`,
  cardHover: `0 20px 48px ${colors.shadowDark}`,
  cardLarge: `0 20px 50px ${colors.shadowDark}`,
  button: `0 8px 24px ${colors.shadowLight}`,
  buttonHover: `0 12px 36px ${colors.shadowLight}`,
  header: `0 6px 24px ${colors.shadowDark}`,
  input: 'none',
};

export const borders = {
  card: `1px solid ${colors.border}`,
  cardHover: `1px solid ${colors.borderHover}`,
  input: `1px solid ${colors.border}`,
  inputFocus: `1px solid ${colors.borderAccent}`,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Common component styles
export const componentStyles = {
  card: {
    background: colors.gradientCard,
    border: borders.card,
    boxShadow: shadows.card,
    borderRadius: radii.lg,
  },
  
  cardLight: {
    background: colors.gradientCardLight,
    border: borders.card,
    boxShadow: shadows.card,
    borderRadius: radii.lg,
  },
  
  input: {
    background: colors.bgInput,
    border: borders.input,
    color: colors.textPrimary,
    borderRadius: radii.md,
  },
  
  button: {
    borderRadius: radii.md,
    boxShadow: shadows.button,
    transition: 'all 0.2s ease',
  },
  
  modal: {
    content: {
      background: colors.gradientCard,
      border: borders.card,
      borderRadius: radii.lg,
    },
    header: {
      background: 'transparent',
      color: colors.textPrimary,
    },
    title: {
      fontFamily: 'Georgia, serif',
      color: colors.textPrimary,
    },
  },
};

// Font settings
export const fonts = {
  heading: 'Georgia, "Times New Roman", serif',
  body: 'inherit',
};

// Input styles for Mantine components
export const inputStyles = {
  input: {
    background: colors.bgInput,
    border: borders.input,
    color: colors.textPrimary,
    '&:focus': {
      borderColor: colors.accent,
    },
  },
  label: {
    color: colors.textSecondary,
  },
};

// Tab styles
export const tabStyles = {
  tab: {
    color: colors.textSecondary,
    '&:hover': {
      backgroundColor: 'rgba(212,137,79,0.1)',
    },
    '&[data-active]': {
      color: colors.accent,
      borderColor: colors.accent,
    },
  },
};

export default {
  colors,
  shadows,
  borders,
  radii,
  fonts,
  componentStyles,
  inputStyles,
  tabStyles,
};
