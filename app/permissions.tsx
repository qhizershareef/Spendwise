import React, { useState } from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { Text, Button, useTheme, Surface, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

import { scheduleDailyReminder } from '@/services/notifications';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';

export default function PermissionsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { preferences, updatePreference } = usePreferencesStore();

    const [locationEnabled, setLocationEnabled] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleContinue = async () => {
        setIsLoading(true);

        // Process active toggles
        if (locationEnabled) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                await updatePreference('captureLocation', true);
            }
        }

        if (notificationsEnabled) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                await updatePreference('notificationsEnabled', true);
                await scheduleDailyReminder(20, 0); // Default to 8 PM
            }
        }

        setIsLoading(false);
        router.replace('/(tabs)' as any);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(600).delay(100)} style={{ alignItems: 'center', marginTop: 40 }}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                        <MaterialCommunityIcons name="shield-check" size={64} color={theme.colors.primary} />
                    </View>
                    <Text variant="headlineSmall" style={{ fontWeight: '800', color: theme.colors.onBackground, marginTop: 24, textAlign: 'center' }}>
                        Supercharge Your Experience
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 22 }}>
                        Enable these permissions to get the most out of ScanSense360. You can change these anytime in Settings.
                    </Text>
                </Animated.View>

                <View style={styles.list}>
                    {/* Location Permission */}
                    <Animated.View entering={SlideInRight.duration(500).delay(300)}>
                        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.cardIcon, { backgroundColor: customColors.semantic.expense + '15' }]}>
                                    <MaterialCommunityIcons name="map-marker" size={24} color={customColors.semantic.expense} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 16 }}>
                                    <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                        Location Tagging
                                    </Text>
                                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                        Automatically tag where you spend money for better location-based insights.
                                    </Text>
                                </View>
                                <Switch
                                    value={locationEnabled}
                                    onValueChange={setLocationEnabled}
                                    color={theme.colors.primary}
                                />
                            </View>
                        </Surface>
                    </Animated.View>

                    {/* Notifications Permission */}
                    <Animated.View entering={SlideInRight.duration(500).delay(450)}>
                        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.cardIcon, { backgroundColor: customColors.brand.primary + '15' }]}>
                                    <MaterialCommunityIcons name="bell-ring" size={24} color={customColors.brand.primary} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 16 }}>
                                    <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                        Smart Alerts
                                    </Text>
                                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                        Get notified when you exceed a budget or receive AI-powered spending tips.
                                    </Text>
                                </View>
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={setNotificationsEnabled}
                                    color={theme.colors.primary}
                                />
                            </View>
                        </Surface>
                    </Animated.View>
                </View>
            </ScrollView>

            <Animated.View entering={FadeIn.delay(800)} style={styles.bottomSection}>
                <Button
                    mode="contained"
                    onPress={handleContinue}
                    loading={isLoading}
                    disabled={isLoading}
                    contentStyle={{ paddingVertical: 8 }}
                    labelStyle={{ fontWeight: '700', fontSize: 16 }}
                    style={{ borderRadius: borderRadius.full }}
                >
                    Continue
                </Button>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingHorizontal: spacing.lg,
        marginTop: 40,
        gap: spacing.md,
    },
    card: {
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomSection: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 24,
        left: spacing.lg,
        right: spacing.lg,
    },
});
