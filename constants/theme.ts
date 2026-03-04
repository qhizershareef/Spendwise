import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'SpaceMono',
};

const customColors = {
  // Brand colors
  brand: {
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    secondary: '#00CEC9',
    secondaryLight: '#81ECEC',
    accent: '#FD79A8',
    accentLight: '#FDCB6E',
  },
  // Semantic colors
  semantic: {
    income: '#00B894',
    expense: '#E17055',
    warning: '#FDCB6E',
    info: '#74B9FF',
  },
  // Category colors
  category: {
    food: '#E17055',
    transport: '#74B9FF',
    housing: '#A29BFE',
    shopping: '#FD79A8',
    health: '#00B894',
    entertainment: '#FDCB6E',
    education: '#6C5CE7',
    bills: '#00CEC9',
    gifts: '#E84393',
    business: '#636E72',
    others: '#B2BEC3',
  },
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: customColors.brand.primary,
    primaryContainer: '#EDE9FE',
    secondary: customColors.brand.secondary,
    secondaryContainer: '#DEFAF9',
    tertiary: customColors.brand.accent,
    tertiaryContainer: '#FDE8F0',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F3F5',
    error: '#E17055',
    errorContainer: '#FDECEA',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#3B1F8E',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#004D4A',
    onBackground: '#1A1A2E',
    onSurface: '#1A1A2E',
    onSurfaceVariant: '#636E72',
    outline: '#DFE6E9',
    outlineVariant: '#B2BEC3',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F8F9FA',
      level3: '#F1F3F5',
      level4: '#E9ECEF',
      level5: '#DEE2E6',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: customColors.brand.primaryLight,
    primaryContainer: '#2D1F6B',
    secondary: customColors.brand.secondaryLight,
    secondaryContainer: '#004D4A',
    tertiary: customColors.brand.accentLight,
    tertiaryContainer: '#5C1A36',
    background: '#0F0F1A',
    surface: '#1A1A2E',
    surfaceVariant: '#252540',
    error: '#E17055',
    errorContainer: '#5C2316',
    onPrimary: '#1A1A2E',
    onPrimaryContainer: '#EDE9FE',
    onSecondary: '#1A1A2E',
    onSecondaryContainer: '#DEFAF9',
    onBackground: '#F8F9FA',
    onSurface: '#F8F9FA',
    onSurfaceVariant: '#B2BEC3',
    outline: '#3D3D5C',
    outlineVariant: '#636E72',
    elevation: {
      level0: 'transparent',
      level1: '#1A1A2E',
      level2: '#252540',
      level3: '#2D2D4A',
      level4: '#353555',
      level5: '#3D3D5C',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export { customColors };
