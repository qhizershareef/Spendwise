import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button, PaperProvider, Text } from 'react-native-paper';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { darkTheme, lightTheme } from '@/constants/theme';
import type { ParsedSMS } from '@/services/sms';
import { isListenerActive, startSMSListener } from '@/services/sms';
import { useBudgetStore } from '@/stores/budgetStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useTransactionStore } from '@/stores/transactionStore';
import type { CategoryId } from '@/types';

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
  const addTransaction = useTransactionStore((s) => s.addTransaction);

  // Start unlocked — the effect below will lock it if biometricLock is enabled.
  // This prevents a blank screen when biometricLock is false, since the effect
  // runs asynchronously after the first render.
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Load all data on app startup
useEffect(() => {
    const initializeData = async () => {
      try {
        await loadPreferences();
        await loadMonth();
        await loadBudgets();
        await loadGoals();
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };
    
    initializeData();
  }, []);

  // Start SMS listener when enabled
  useEffect(() => {
    if (!isLoaded || !preferences.smsAutoDetect || isListenerActive()) return;
    if (Platform.OS !== 'android') return;

    const enabledCategories = preferences.customCategories
      ? [...(require('@/constants/categories').DEFAULT_CATEGORIES), ...preferences.customCategories]
      : require('@/constants/categories').DEFAULT_CATEGORIES;

    startSMSListener(
      enabledCategories,
      async (parsed: ParsedSMS, category: CategoryId) => {
        await addTransaction({
          amount: parsed.amount,
          type: parsed.type === 'debit' ? 'debit' : 'credit',
          category,
          payee: parsed.payee || parsed.sender || 'SMS Transaction',
          method: parsed.method,
          note: `Auto-detected from SMS${parsed.accountLastDigits ? ` (A/c ${parsed.accountLastDigits})` : ''}`,
          datetime: new Date().toISOString(),
          source: 'sms' as any,
        });
        console.log(`[SMS] Auto-logged ${parsed.type}: ₹${parsed.amount} → ${category}`);
      },
      (err) => console.warn('[SMS] Listener error:', err)
    );
  }, [isLoaded, preferences.smsAutoDetect]);

  useEffect(() => {
    if (fontsLoaded && isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoaded]);

  // Biometric lock check — only runs once after preferences are loaded.
  // We do NOT include preferences.biometricLock in deps to avoid re-locking
  // the app mid-session when the user toggles the setting.
  useEffect(() => {
    if (!isLoaded) return;

    if (preferences.biometricLock) {
      // Lock the app and prompt for auth
      setIsUnlocked(false);
      authenticate();
    } else {
      setIsUnlocked(true);
      setAuthChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock ScanSense360',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });
      setIsUnlocked(result.success);
      setAuthChecked(true);
    } catch {
      setAuthChecked(true);
    }
  };

  // Redirect to onboarding if not completed
  const router = useRouter();
  useEffect(() => {
    if (fontsLoaded && isLoaded && isUnlocked && !preferences.onboardingCompleted) {
      router.replace('/onboarding' as any);
    }
  }, [fontsLoaded, isLoaded, isUnlocked, preferences.onboardingCompleted]);

  if (!fontsLoaded || !isLoaded) {
    return null;
  }

  // Determine active theme
  const themePreference = preferences.theme;
  const isDark =
    themePreference === 'dark' ||
    (themePreference === 'system' && systemScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;

  // Biometric lock screen — show immediately to hide content behind auth dialog
  if (preferences.biometricLock && !isUnlocked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <View style={[lockStyles.container, { backgroundColor: theme.colors.background }]}>
              <MaterialCommunityIcons name="lock" size={64} color={theme.colors.primary} />
              <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginTop: 24, fontWeight: '700' }}>
                ScanSense360 is Locked
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                Authenticate to access your finances
              </Text>
              <Button
                mode="contained"
                icon="fingerprint"
                onPress={authenticate}
                style={{ marginTop: 32, borderRadius: 24 }}
                contentStyle={{ paddingVertical: 6 }}
                labelStyle={{ fontWeight: '700' }}
              >
                Unlock ScanSense360
              </Button>
            </View>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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

const lockStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
