import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme, Surface, Button, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { generateInsights, generateSummary } from '@/services/ai';
import { formatCurrency, getMonthName, getCurrentMonthKey } from '@/utils/formatters';
import { getCategoryById } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { AIInsight } from '@/types';

const INSIGHT_META: Record<string, { icon: string; color: string; bgTint: string; label: string }> = {
    alert: { icon: 'alert-circle', color: '#E74C3C', bgTint: '#E74C3C12', label: 'ALERT' },
    tip: { icon: 'lightbulb-on', color: '#F39C12', bgTint: '#F39C1212', label: 'TIP' },
    summary: { icon: 'chart-line', color: '#3498DB', bgTint: '#3498DB12', label: 'SUMMARY' },
    goal_update: { icon: 'target', color: '#2ECC71', bgTint: '#2ECC7112', label: 'GOAL' },
};

export default function InsightsScreen() {
    const theme = useTheme();
    const { currentMonth } = useTransactionStore();
    const { budgets } = useBudgetStore();
    const { preferences } = usePreferencesStore();
    const monthKey = getCurrentMonthKey();

    const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
    const [aiSummary, setAiSummary] = useState('');
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    const transactions = currentMonth?.transactions || [];
    const expenses = transactions.filter((t) => t.type === 'debit');

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach((t) => {
            map[t.category] = (map[t.category] || 0) + t.amount;
        });

        const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

        return Object.entries(map)
            .map(([catId, amount]) => ({
                category: getCategoryById(catId),
                catId,
                amount,
                percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [expenses]);

    // Daily average
    const totalExpense = currentMonth?.metadata.totalExpense ?? 0;
    const totalIncome = currentMonth?.metadata.totalIncome ?? 0;
    const today = new Date();
    const dayOfMonth = today.getDate();
    const dailyAvg = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;

    // Budget progress
    const budgetProgress = budgets
        .filter((b) => b.isActive)
        .map((b) => {
            const spent = expenses
                .filter((t) => t.category === b.category)
                .reduce((s, t) => s + t.amount, 0);
            const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
            return {
                ...b,
                spent,
                percentage: Math.min(pct, 100),
                remaining: Math.max(0, b.amount - spent),
                isOverBudget: pct > 100,
            };
        });

    // Payment method breakdown
    const methodBreakdown = useMemo(() => {
        const map: Record<string, { count: number; total: number }> = {};
        expenses.forEach((t) => {
            if (!map[t.method]) map[t.method] = { count: 0, total: 0 };
            map[t.method].count++;
            map[t.method].total += t.amount;
        });
        return Object.entries(map).sort(([, a], [, b]) => b.total - a.total);
    }, [expenses]);

    // AI handlers
    const currentApiKey = preferences.aiProvider === 'gemini' ? preferences.geminiApiKey : preferences.chatgptApiKey;

    const handleGenerateInsights = useCallback(async () => {
        setIsLoadingInsights(true);
        try {
            const insights = await generateInsights(
                transactions,
                budgets,
                preferences.aiProvider,
                currentApiKey
            );
            setAiInsights(insights);
        } catch (error) {
            console.error('Failed to generate insights:', error);
        } finally {
            setIsLoadingInsights(false);
        }
    }, [transactions, budgets, preferences.aiProvider, currentApiKey]);

    const handleGenerateSummary = useCallback(async () => {
        setIsLoadingSummary(true);
        try {
            const summary = await generateSummary(
                transactions,
                budgets,
                preferences.aiProvider,
                currentApiKey
            );
            setAiSummary(summary);
        } catch (error) {
            console.error('Failed to generate summary:', error);
        } finally {
            setIsLoadingSummary(false);
        }
    }, [transactions, budgets, preferences.aiProvider, currentApiKey]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                        Insights
                    </Text>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        {getMonthName(monthKey)}
                    </Text>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.semantic.income + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="arrow-down-circle" size={24} color={customColors.semantic.income} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Income</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.semantic.income }}>
                            {formatCurrency(totalIncome)}
                        </Text>
                    </Surface>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.semantic.expense + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="arrow-up-circle" size={24} color={customColors.semantic.expense} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Expense</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.semantic.expense }}>
                            {formatCurrency(totalExpense)}
                        </Text>
                    </Surface>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.brand.primary + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="calculator" size={24} color={customColors.brand.primary} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Daily Avg</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.brand.primary }}>
                            {formatCurrency(dailyAvg)}
                        </Text>
                    </Surface>
                </View>

                {/* AI Insights */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialCommunityIcons name="auto-fix" size={20} color={theme.colors.primary} />
                            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                                AI Insights
                            </Text>
                        </View>
                        <Button
                            mode="contained-tonal"
                            onPress={handleGenerateInsights}
                            loading={isLoadingInsights}
                            disabled={isLoadingInsights}
                            icon={aiInsights.length > 0 ? 'refresh' : 'sparkles'}
                            compact
                            labelStyle={{ fontSize: 12, fontWeight: '700' }}
                            style={{ borderRadius: 20 }}
                        >
                            {aiInsights.length > 0 ? 'Refresh' : 'Generate'}
                        </Button>
                    </View>

                    {isLoadingInsights ? (
                        <Surface style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={styles.loadingPulse}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            </View>
                            <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginTop: 16 }}>
                                Analyzing your spending patterns...
                            </Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                This may take a few seconds
                            </Text>
                        </Surface>
                    ) : aiInsights.length > 0 ? (
                        <View style={{ gap: spacing.sm + 4, marginTop: spacing.sm }}>
                            {aiInsights.map((insight) => {
                                const meta = INSIGHT_META[insight.type] || INSIGHT_META.tip;
                                return (
                                    <Surface
                                        key={insight.id}
                                        style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}
                                        elevation={2}
                                    >
                                        {/* Accent top strip */}
                                        <View style={[styles.insightAccent, { backgroundColor: meta.color }]} />

                                        <View style={styles.insightContent}>
                                            {/* Header row */}
                                            <View style={styles.insightHeader}>
                                                <View style={[styles.insightIconWrap, { backgroundColor: meta.bgTint }]}>
                                                    <MaterialCommunityIcons name={meta.icon as any} size={24} color={meta.color} />
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <View style={[styles.insightBadge, { backgroundColor: meta.color + '20' }]}>
                                                            <Text style={{ fontSize: 9, fontWeight: '800', color: meta.color, letterSpacing: 0.5 }}>
                                                                {meta.label}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface, marginTop: 4 }}>
                                                        {insight.title}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Message body */}
                                            <View style={[styles.insightBody, { backgroundColor: meta.bgTint }]}>
                                                <Text
                                                    variant="bodyMedium"
                                                    style={{
                                                        color: theme.colors.onSurface,
                                                        lineHeight: 22,
                                                        letterSpacing: 0.1,
                                                    }}
                                                >
                                                    {insight.message}
                                                </Text>
                                            </View>
                                        </View>
                                    </Surface>
                                );
                            })}
                        </View>
                    ) : (
                        <Surface style={[styles.placeholderCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
                            <View style={styles.placeholderIconWrap}>
                                <MaterialCommunityIcons name="robot-happy-outline" size={40} color={theme.colors.primary} />
                            </View>
                            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onPrimaryContainer, marginTop: 12 }}>
                                Get AI-Powered Insights
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: 4, textAlign: 'center', opacity: 0.8, lineHeight: 18 }}>
                                {currentApiKey
                                    ? `Tap Generate to analyze your spending with ${preferences.aiProvider === 'gemini' ? 'Google Gemini' : 'ChatGPT'}`
                                    : 'Set up your API key in Settings → AI Configuration to get started'}
                            </Text>
                        </Surface>
                    )}
                </View>

                {/* AI Monthly Summary */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Monthly Summary
                        </Text>
                        <Button
                            mode="text"
                            onPress={handleGenerateSummary}
                            loading={isLoadingSummary}
                            disabled={isLoadingSummary || !currentApiKey}
                            icon="text-box-outline"
                            compact
                            labelStyle={{ fontSize: 12 }}
                        >
                            Generate
                        </Button>
                    </View>
                    {aiSummary ? (
                        <Surface style={[styles.summaryTextCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name="text-box-check" size={18} color={theme.colors.primary} />
                                </View>
                                <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.primary, marginLeft: 8 }}>
                                    AI Summary
                                </Text>
                            </View>
                            <Text
                                variant="bodyMedium"
                                style={{ color: theme.colors.onSurface, lineHeight: 24, letterSpacing: 0.15 }}
                                selectable
                            >
                                {aiSummary}
                            </Text>
                        </Surface>
                    ) : (
                        <Surface style={[styles.summaryTextCard, { backgroundColor: theme.colors.surfaceVariant, opacity: 0.6 }]} elevation={0}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                                Generate an AI-written summary of your monthly spending
                            </Text>
                        </Surface>
                    )}
                </View>

                {/* Category Breakdown */}
                {categoryBreakdown.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Spending by Category
                        </Text>
                        <Surface style={[styles.breakdownCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            {categoryBreakdown.map((item, idx) => (
                                <View key={item.catId}>
                                    <View style={styles.breakdownRow}>
                                        <View style={[styles.catDot, { backgroundColor: item.category?.color || '#B2BEC3' }]}>
                                            <MaterialCommunityIcons
                                                name={(item.category?.icon || 'dots-horizontal-circle') as any}
                                                size={16}
                                                color="#FFF"
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                                                    {item.category?.label || item.catId}
                                                </Text>
                                                <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                                    {formatCurrency(item.amount)}
                                                </Text>
                                            </View>
                                            <View style={styles.barContainer}>
                                                <View
                                                    style={[
                                                        styles.barFill,
                                                        {
                                                            width: `${item.percentage}%`,
                                                            backgroundColor: item.category?.color || '#B2BEC3',
                                                        },
                                                    ]}
                                                />
                                            </View>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                {item.percentage.toFixed(1)}%
                                            </Text>
                                        </View>
                                    </View>
                                    {idx < categoryBreakdown.length - 1 && <Divider style={{ marginVertical: 8 }} />}
                                </View>
                            ))}
                        </Surface>
                    </View>
                )}

                {/* Budget Progress */}
                {budgetProgress.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Budget Progress
                        </Text>
                        {budgetProgress.map((bp) => {
                            const cat = getCategoryById(bp.category);
                            return (
                                <Surface key={bp.id} style={[styles.budgetCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <MaterialCommunityIcons
                                                name={(cat?.icon || 'dots-horizontal-circle') as any}
                                                size={20}
                                                color={cat?.color}
                                            />
                                            <Text variant="bodyMedium" style={{ fontWeight: '600', marginLeft: 8, color: theme.colors.onSurface }}>
                                                {cat?.label}
                                            </Text>
                                        </View>
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                            {formatCurrency(bp.spent)} / {formatCurrency(bp.amount)}
                                        </Text>
                                    </View>
                                    <View style={[styles.barContainer, { marginTop: 8, height: 8 }]}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {
                                                    width: `${bp.percentage}%`,
                                                    backgroundColor: bp.isOverBudget ? customColors.semantic.expense : cat?.color,
                                                    height: 8,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text
                                        variant="labelSmall"
                                        style={{
                                            marginTop: 4,
                                            color: bp.isOverBudget ? customColors.semantic.expense : theme.colors.onSurfaceVariant,
                                            fontWeight: bp.isOverBudget ? '700' : '400',
                                        }}
                                    >
                                        {bp.isOverBudget
                                            ? `Over budget by ${formatCurrency(bp.spent - bp.amount)}`
                                            : `${formatCurrency(bp.remaining)} remaining`}
                                    </Text>
                                </Surface>
                            );
                        })}
                    </View>
                )}

                {/* Payment Methods */}
                {methodBreakdown.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Payment Methods
                        </Text>
                        <Surface style={[styles.breakdownCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            {methodBreakdown.map(([method, data]) => (
                                <View key={method} style={styles.methodRow}>
                                    <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.onSurface, textTransform: 'uppercase' }}>
                                        {method}
                                    </Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                            {formatCurrency(data.total)}
                                        </Text>
                                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                            {data.count} transactions
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </Surface>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 100 },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    loadingCard: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
    },
    loadingPulse: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(108, 92, 231, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderCard: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    placeholderIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(108, 92, 231, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightCard: {
        borderRadius: borderRadius.lg,
    },
    insightAccent: {
        height: 4,
        width: '100%',
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
    },
    insightContent: {
        padding: spacing.md,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    insightIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    insightBody: {
        marginTop: 12,
        padding: 12,
        borderRadius: borderRadius.md,
    },
    summaryTextCard: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    breakdownCard: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    catDot: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    barContainer: {
        width: '100%',
        height: 6,
        backgroundColor: '#E9ECEF',
        borderRadius: 3,
        marginTop: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: 6,
        borderRadius: 3,
    },
    budgetCard: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    methodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
});
