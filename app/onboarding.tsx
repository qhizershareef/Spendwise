import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Dimensions,
    Pressable,
    Platform,
} from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    ZoomIn,
    SlideInRight,
} from 'react-native-reanimated';

import { usePreferencesStore } from '@/stores/preferencesStore';
import { spacing, borderRadius, customColors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
    id: string;
    icon: string;
    iconColor: string;
    iconBg: string;
    title: string;
    subtitle: string;
    features: { icon: string; text: string }[];
}

const SLIDES: Slide[] = [
    {
        id: 'welcome',
        icon: 'wallet-outline',
        iconColor: customColors.brand.primary,
        iconBg: customColors.brand.primary + '18',
        title: 'Welcome to ScanSense360',
        subtitle: 'Your smart personal finance companion. Track, analyze, and optimize your spending effortlessly.',
        features: [
            { icon: 'check-circle', text: 'Track every rupee' },
            { icon: 'check-circle', text: 'AI-powered insights' },
            { icon: 'check-circle', text: 'Beautiful visualizations' },
        ],
    },
    {
        id: 'track',
        icon: 'plus-circle-outline',
        iconColor: customColors.semantic.expense,
        iconBg: customColors.semantic.expense + '18',
        title: 'Track Every Transaction',
        subtitle: 'Add expenses and income manually, scan QR codes, or let SMS auto-detection do the work.',
        features: [
            { icon: 'gesture-tap', text: 'Quick manual entry with categories' },
            { icon: 'qrcode-scan', text: 'QR code scanner for instant logging' },
            { icon: 'message-text', text: 'SMS auto-detect (Android)' },
        ],
    },
    {
        id: 'insights',
        icon: 'chart-arc',
        iconColor: '#3498DB',
        iconBg: '#3498DB18',
        title: 'Smart AI Insights',
        subtitle: 'Get personalized spending analysis powered by Google Gemini or ChatGPT.',
        features: [
            { icon: 'lightbulb-on', text: 'Actionable savings tips' },
            { icon: 'alert-circle', text: 'Overspending alerts' },
            { icon: 'chart-line', text: 'Spending pattern analysis' },
        ],
    },
    {
        id: 'visualize',
        icon: 'chart-bar',
        iconColor: customColors.semantic.income,
        iconBg: customColors.semantic.income + '18',
        title: 'Beautiful Charts & Details',
        subtitle: 'Tap any card on the dashboard for in-depth visual breakdowns of your finances.',
        features: [
            { icon: 'calendar-today', text: 'Daily, weekly, monthly views' },
            { icon: 'chart-pie', text: 'Category breakdowns' },
            { icon: 'piggy-bank', text: 'Savings rate tracking' },
        ],
    },
    {
        id: 'ready',
        icon: 'rocket-launch',
        iconColor: customColors.brand.primary,
        iconBg: customColors.brand.primary + '18',
        title: "You're All Set!",
        subtitle: 'Start tracking your finances today. Your data stays on your device and can be synced to Google Drive.',
        features: [
            { icon: 'shield-check', text: 'Private & secure' },
            { icon: 'google-drive', text: 'Google Drive backup' },
            { icon: 'export', text: 'Export as CSV or JSON' },
        ],
    },
];

function SlideItem({ slide, isActive }: { slide: Slide; isActive: boolean }) {
    const theme = useTheme();

    if (!isActive) {
        return <View style={{ width: SCREEN_WIDTH }} />;
    }

    return (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Icon */}
            <Animated.View
                entering={ZoomIn.duration(500).delay(100)}
                style={[styles.iconCircle, { backgroundColor: slide.iconBg }]}
            >
                <MaterialCommunityIcons name={slide.icon as any} size={64} color={slide.iconColor} />
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                <Text variant="headlineSmall" style={{ fontWeight: '800', color: theme.colors.onBackground, textAlign: 'center', marginTop: 28 }}>
                    {slide.title}
                </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View entering={FadeInDown.duration(500).delay(350)}>
                <Text
                    variant="bodyLarge"
                    style={{
                        color: theme.colors.onSurfaceVariant,
                        textAlign: 'center',
                        marginTop: 12,
                        paddingHorizontal: spacing.lg,
                        lineHeight: 24,
                    }}
                >
                    {slide.subtitle}
                </Text>
            </Animated.View>

            {/* Features */}
            <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.featureList}>
                {slide.features.map((f, idx) => (
                    <Animated.View
                        key={idx}
                        entering={SlideInRight.duration(400).delay(600 + idx * 100)}
                        style={styles.featureRow}
                    >
                        <View style={[styles.featureIcon, { backgroundColor: slide.iconBg }]}>
                            <MaterialCommunityIcons name={f.icon as any} size={18} color={slide.iconColor} />
                        </View>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1, marginLeft: 12, fontWeight: '500' }}>
                            {f.text}
                        </Text>
                    </Animated.View>
                ))}
            </Animated.View>
        </View>
    );
}

export default function OnboardingScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { updatePreference } = usePreferencesStore();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const isLastSlide = activeIndex === SLIDES.length - 1;

    const handleNext = useCallback(() => {
        if (isLastSlide) {
            handleComplete();
        } else {
            const nextIndex = activeIndex + 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setActiveIndex(nextIndex);
        }
    }, [activeIndex, isLastSlide]);

    const handleSkip = useCallback(() => {
        handleComplete();
    }, []);

    const handleComplete = useCallback(() => {
        updatePreference('onboardingCompleted', true);
        router.replace('/permissions' as any);
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems?.[0]) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Skip button */}
            {!isLastSlide && (
                <Animated.View entering={FadeIn.delay(800)} style={styles.skipButton}>
                    <Button mode="text" onPress={handleSkip} labelStyle={{ fontSize: 14, fontWeight: '600' }}>
                        Skip
                    </Button>
                </Animated.View>
            )}

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                renderItem={({ item, index }) => (
                    <SlideItem slide={item} isActive={index === activeIndex} />
                )}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
            />

            {/* Bottom section: dots + button */}
            <Animated.View entering={FadeInUp.delay(600)} style={styles.bottomSection}>
                {/* Dot indicators */}
                <View style={styles.dotsContainer}>
                    {SLIDES.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: idx === activeIndex
                                        ? customColors.brand.primary
                                        : theme.colors.outlineVariant,
                                    width: idx === activeIndex ? 24 : 8,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Action button */}
                <Button
                    mode="contained"
                    onPress={handleNext}
                    icon={isLastSlide ? 'check' : 'arrow-right'}
                    contentStyle={{ paddingVertical: 6, paddingHorizontal: 16, flexDirection: 'row-reverse' }}
                    labelStyle={{ fontWeight: '700', fontSize: 16 }}
                    style={{ borderRadius: borderRadius.full, minWidth: 180 }}
                >
                    {isLastSlide ? 'Get Started' : 'Next'}
                </Button>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 16,
        right: 16,
        zIndex: 10,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureList: {
        marginTop: 32,
        width: '100%',
        gap: 14,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomSection: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 50 : 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 24,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
});
