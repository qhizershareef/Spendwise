import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PaperProvider, Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
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

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

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

  // Biometric lock check on app launch
  useEffect(() => {
    if (!isLoaded) return;

    if (preferences.biometricLock) {
      authenticate();
    } else {
      setIsUnlocked(true);
      setAuthChecked(true);
    }
  }, [isLoaded, preferences.biometricLock]);

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SpendWise',
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

  // Biometric lock screen
  if (preferences.biometricLock && !isUnlocked && authChecked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <View style={[lockStyles.container, { backgroundColor: theme.colors.background }]}>
              <MaterialCommunityIcons name="lock" size={64} color={theme.colors.primary} />
              <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, marginTop: 24, fontWeight: '700' }}>
                SpendWise is Locked
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
                Unlock SpendWise
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
