import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { lightTheme, darkTheme } from '@/constants/theme';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore } from '@/stores/budgetStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const { preferences, isLoaded, loadPreferences } = usePreferencesStore();
  const loadMonth = useTransactionStore((s) => s.loadMonth);
  const loadBudgets = useBudgetStore((s) => s.loadBudgets);
  const loadGoals = useBudgetStore((s) => s.loadGoals);

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Load all data on app startup
  useEffect(() => {
    loadPreferences();
    loadMonth();
    loadBudgets();
    loadGoals();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoaded]);

  // Redirect to onboarding if not completed
  const router = useRouter();
  useEffect(() => {
    if (fontsLoaded && isLoaded && !preferences.onboardingCompleted) {
      router.replace('/onboarding' as any);
    }
  }, [fontsLoaded, isLoaded, preferences.onboardingCompleted]);

  if (!fontsLoaded || !isLoaded) {
    return null;
  }

  // Determine active theme
  const themePreference = preferences.theme;
  const isDark =
    themePreference === 'dark' ||
    (themePreference === 'system' && systemScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="transaction/[id]"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="add-transaction"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="scanner"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="detail/today"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="detail/weekly"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="detail/monthly"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="detail/savings"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="onboarding"
              options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false, headerShown: false }}
            />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
