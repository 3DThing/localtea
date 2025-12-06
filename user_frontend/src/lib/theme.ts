'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';

// Dark fantasy colors inspired by games like WoW, Genshin, Witcher
const mystic: MantineColorsTuple = [
  '#f3edff',
  '#e2d7fa',
  '#c3abf0',
  '#a27de7',
  '#8655df',
  '#753dda',
  '#6c30d8',
  '#5b23c0',
  '#501eac',
  '#431697'
];

const ember: MantineColorsTuple = [
  '#fff4e6',
  '#ffe8cc',
  '#ffd8a8',
  '#ffc078',
  '#ffa94d',
  '#ff922b',
  '#fd7e14',
  '#e8590c',
  '#d9480f',
  '#bf4000'
];

const shadow: MantineColorsTuple = [
  '#f5f5f5',
  '#e7e7e7',
  '#cdcdcd',
  '#b2b2b2',
  '#9a9a9a',
  '#8b8b8b',
  '#848484',
  '#717171',
  '#656565',
  '#575757'
];

export const theme = createTheme({
  primaryColor: 'mystic',
  colors: {
    mystic,
    ember,
    shadow,
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  headings: {
    fontFamily: 'Georgia, serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  other: {
    cardGlow: '0 0 30px rgba(117, 61, 218, 0.3)',
    heroGradient: 'linear-gradient(135deg, rgba(26, 27, 30, 0.95) 0%, rgba(67, 22, 151, 0.3) 100%)',
  },
});
