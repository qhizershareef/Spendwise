import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { formatCurrency, getMonthName, getCurrentMonthKey } from '@/utils/formatters';
import { getCategoryById } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MonthlyDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { currentMonth } = useTransactionStore();
    const { budgets } = useBudgetStore();

    const monthKey = getCurrentMonthKey();
    const monthName = getMonthName(monthKey);
    const totalExpense = currentMonth?.metadata.totalExpense ?? 0;
    const totalIncome = currentMonth?.metadata.totalIncome ?? 0;
    const transactions = currentMonth?.transactions || [];
    const expenses = transactions.filter((t) => t.type === 'debit');
    const dayOfMonth = new Date().getDate();
    const dailyAvg = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;

    // Days in current month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Daily bar chart data
    const dailyData = useMemo(() => {
        const days: number[] = new Array(daysInMonth).fill(0);
        expenses.forEach((t) => {
            const day = new Date(t.datetime).getDate() - 1;
            if (day >= 0 && day < daysInMonth) days[day] += t.amount;
        });

        return days.map((amount, idx) => ({
            value: amount,
            label: (idx + 1) % 5 === 0 || idx === 0 ? `${idx + 1}` : '',
            frontColor: idx + 1 === dayOfMonth
                ? customColors.brand.primary
                : amount > dailyAvg && amount > 0
                    ? customColors.semantic.expense + 'CC'
                    : customColors.brand.primaryLight + 'AA',
        }));
    }, [expenses, daysInMonth, dayOfMonth, dailyAvg]);

    // Category pie chart data
    const categoryData = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach((t) => {
            map[t.category] = (map[t.category] || 0) + t.amount;
        });

        return Object.entries(map)
            .sort(([, a], [, b]) => b - a)
            .map(([catId, amount]) => {
                const cat = getCategoryById(catId);
                return {
                    value: amount,
                    color: cat?.color || '#B2BEC3',
                    text: cat?.label || catId,
                    catId,
                    percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
                };
            });
    }, [expenses, totalExpense]);

    // Top 5 transactions
    const topTransactions = [...expenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    // Budget progress
    const budgetProgress = budgets
        .filter((b) => b.isActive)
        .map((b) => {
            const spent = expenses
                .filter((t) => t.category === b.category)
                .reduce((s, t) => s + t.amount, 0);
            const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
            return { ...b, spent, percentage: pct, isOver: spent > b.amount };
        });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton icon="arrow-left" size={24} onPress={() => router.back()} iconColor={theme.colors.onBackground} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                        Monthly Overview
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{monthName}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Income vs Expense */}
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
                </View>

                {/* Daily Avg + Net summary row */}
                <View style={[styles.summaryRow, { marginTop: spacing.sm }]}>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.brand.primary + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="calculator" size={22} color={customColors.brand.primary} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Daily Avg</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.brand.primary }}>
                            {formatCurrency(dailyAvg)}
                        </Text>
                    </Surface>
                    <Surface style={[styles.summaryCard, { backgroundColor: (totalIncome >= totalExpense ? customColors.semantic.income : customColors.semantic.expense) + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="scale-balance" size={22} color={totalIncome >= totalExpense ? customColors.semantic.income : customColors.semantic.expense} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Net</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: totalIncome >= totalExpense ? customColors.semantic.income : customColors.semantic.expense }}>
                            {totalIncome >= totalExpense ? '+' : '-'}{formatCurrency(Math.abs(totalIncome - totalExpense))}
                        </Text>
                    </Surface>
                </View>

                {/* Daily Spending Chart */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Daily Spending
                    </Text>
                    <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        {expenses.length > 0 ? (
                            <View style={{ paddingTop: 8 }}>
                                <BarChart
                                    data={dailyData}
                                    barWidth={6}
                                    spacing={3}
                                    roundedTop
                                    noOfSections={4}
                                    yAxisThickness={0}
                                    xAxisThickness={1}
                                    xAxisColor={theme.colors.outline}
                                    yAxisTextStyle={{ fontSize: 9, color: theme.colors.onSurfaceVariant }}
                                    xAxisLabelTextStyle={{ fontSize: 9, color: theme.colors.onSurfaceVariant }}
                                    width={SCREEN_WIDTH - 100}
                                    height={160}
                                    isAnimated
                                    animationDuration={600}
                                    showReferenceLine1
                                    referenceLine1Position={dailyAvg}
                                    referenceLine1Config={{
                                        color: customColors.semantic.warning,
                                        dashWidth: 4,
                                        dashGap: 3,
                                        thickness: 1.5,
                                    }}
                                />
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, justifyContent: 'center' }}>
                                    <View style={{ width: 16, height: 2, backgroundColor: customColors.semantic.warning, marginRight: 6 }} />
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        Daily average: {formatCurrency(dailyAvg)}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyChart}>
                                <MaterialCommunityIcons name="chart-bar" size={48} color={theme.colors.onSurfaceVariant} />
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                                    No expenses recorded this month
                                </Text>
                            </View>
                        )}
                    </Surface>
                </View>

                {/* Category Breakdown */}
                {categoryData.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Category Breakdown
                        </Text>
                        <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <PieChart
                                    data={categoryData}
                                    donut
                                    radius={75}
                                    innerRadius={48}
                                    innerCircleColor={theme.colors.surface}
                                    centerLabelComponent={() => (
                                        <View style={{ alignItems: 'center' }}>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Total</Text>
                                            <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                                {formatCurrency(totalExpense)}
                                            </Text>
                                        </View>
                                    )}
                                    isAnimated
                                />
                                <View style={{ flex: 1, marginLeft: spacing.md }}>
                                    {categoryData.slice(0, 6).map((item) => (
                                        <View key={item.catId} style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                                                {item.text}
                                            </Text>
                                            <Text variant="labelSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                                {item.percentage.toFixed(0)}%
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
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
                                                size={18}
                                                color={cat?.color}
                                            />
                                            <Text variant="bodySmall" style={{ fontWeight: '600', marginLeft: 8, color: theme.colors.onSurface }}>
                                                {cat?.label}
                                            </Text>
                                        </View>
                                        <Text
                                            variant="labelSmall"
                                            style={{ color: bp.isOver ? customColors.semantic.expense : theme.colors.onSurfaceVariant }}
                                        >
                                            {formatCurrency(bp.spent)} / {formatCurrency(bp.amount)}
                                        </Text>
                                    </View>
                                    <View style={[styles.barBg, { marginTop: 6, height: 6 }]}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {
                                                    width: `${bp.percentage}%`,
                                                    height: 6,
                                                    backgroundColor: bp.isOver ? customColors.semantic.expense : cat?.color,
                                                },
                                            ]}
                                        />
                                    </View>
                                </Surface>
                            );
                        })}
                    </View>
                )}

                {/* Top Transactions */}
                {topTransactions.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Top 5 Expenses
                        </Text>
                        <View style={{ gap: 4, marginTop: spacing.sm }}>
                            {topTransactions.map((t, idx) => {
                                const cat = getCategoryById(t.category);
                                return (
                                    <Pressable key={t.id} onPress={() => router.push(`/transaction/${t.id}` as any)}>
                                        <Surface style={[styles.txnItem, { backgroundColor: theme.colors.surface }]} elevation={0}>
                                            <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? customColors.semantic.expense : theme.colors.surfaceVariant }]}>
                                                <Text variant="labelSmall" style={{ fontWeight: '800', color: idx === 0 ? '#FFF' : theme.colors.onSurfaceVariant }}>
                                                    #{idx + 1}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                                                    {t.payee || cat?.label || 'Transaction'}
                                                </Text>
                                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                    {cat?.label} · {new Date(t.datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </Text>
                                            </View>
                                            <Text variant="bodyMedium" style={{ fontWeight: '700', color: customColors.semantic.expense }}>
                                                {formatCurrency(t.amount)}
                                            </Text>
                                        </Surface>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: spacing.lg,
        paddingTop: spacing.xs,
    },
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.sm,
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
    chartCard: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    emptyChart: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    barBg: {
        width: '100%',
        height: 6,
        backgroundColor: '#E9ECEF',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: 6,
        borderRadius: 3,
    },
    budgetCard: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    txnItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
