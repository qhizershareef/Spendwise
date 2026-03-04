import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { useTransactionStore } from '@/stores/transactionStore';
import { formatCurrency, getMonthName, getCurrentMonthKey } from '@/utils/formatters';
import { getCategoryById } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SavingsDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { currentMonth } = useTransactionStore();

    const monthKey = getCurrentMonthKey();
    const monthName = getMonthName(monthKey);
    const totalExpense = currentMonth?.metadata.totalExpense ?? 0;
    const totalIncome = currentMonth?.metadata.totalIncome ?? 0;
    const netSavings = Math.max(0, totalIncome - totalExpense);
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const transactions = currentMonth?.transactions || [];
    const expenses = transactions.filter((t) => t.type === 'debit');
    const dayOfMonth = new Date().getDate();

    // Income vs Expense bar data
    const comparisonData = useMemo(() => [
        {
            value: totalIncome,
            label: 'Income',
            frontColor: customColors.semantic.income,
            topLabelComponent: () => (
                <Text style={{ fontSize: 10, color: customColors.semantic.income, fontWeight: '700', marginBottom: 2 }}>
                    {formatCurrency(totalIncome)}
                </Text>
            ),
        },
        {
            value: totalExpense,
            label: 'Expense',
            frontColor: customColors.semantic.expense,
            topLabelComponent: () => (
                <Text style={{ fontSize: 10, color: customColors.semantic.expense, fontWeight: '700', marginBottom: 2 }}>
                    {formatCurrency(totalExpense)}
                </Text>
            ),
        },
        {
            value: netSavings,
            label: 'Saved',
            frontColor: customColors.brand.primary,
            topLabelComponent: () => (
                <Text style={{ fontSize: 10, color: customColors.brand.primary, fontWeight: '700', marginBottom: 2 }}>
                    {formatCurrency(netSavings)}
                </Text>
            ),
        },
    ], [totalIncome, totalExpense, netSavings]);

    // Daily cumulative spending + income trend
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const dailySpendingTrend = useMemo(() => {
        const dailySpend: number[] = new Array(dayOfMonth).fill(0);
        const dailyInc: number[] = new Array(dayOfMonth).fill(0);

        transactions.forEach((t) => {
            const day = new Date(t.datetime).getDate() - 1;
            if (day >= 0 && day < dayOfMonth) {
                if (t.type === 'debit') dailySpend[day] += t.amount;
                else dailyInc[day] += t.amount;
            }
        });

        // Cumulative
        let cumSpend = 0;
        let cumInc = 0;
        return dailySpend.map((spend, idx) => {
            cumSpend += spend;
            cumInc += dailyInc[idx];
            return {
                value: Math.max(0, cumInc - cumSpend),
                label: (idx + 1) % 5 === 0 || idx === 0 ? `${idx + 1}` : '',
                frontColor: (cumInc - cumSpend) >= 0 ? customColors.semantic.income + 'AA' : customColors.semantic.expense + 'AA',
            };
        });
    }, [transactions, dayOfMonth]);

    // Category-wise spending for savings potential
    const categorySpending = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach((t) => {
            map[t.category] = (map[t.category] || 0) + t.amount;
        });

        return Object.entries(map)
            .sort(([, a], [, b]) => b - a)
            .map(([catId, amount]) => {
                const cat = getCategoryById(catId);
                return {
                    catId,
                    amount,
                    color: cat?.color || '#B2BEC3',
                    label: cat?.label || catId,
                    icon: cat?.icon || 'dots-horizontal-circle',
                    percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
                };
            });
    }, [expenses, totalExpense]);

    // Pie chart data for expense distribution
    const pieData = categorySpending.map((c) => ({
        value: c.amount,
        color: c.color,
        text: c.label,
    }));

    // Savings gauge
    const gaugeColor = savingsRate >= 30
        ? customColors.semantic.income
        : savingsRate >= 15
            ? customColors.semantic.warning
            : customColors.semantic.expense;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton icon="arrow-left" size={24} onPress={() => router.back()} iconColor={theme.colors.onBackground} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                        Savings Analysis
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{monthName}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Savings Rate Gauge Card */}
                <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
                    <Surface style={[styles.gaugeCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.gaugeCircle, { borderColor: gaugeColor + '30' }]}>
                                <View style={[styles.gaugeInner, { borderColor: gaugeColor, borderLeftColor: 'transparent', transform: [{ rotate: `${Math.min(savingsRate * 3.6, 360)}deg` }] }]} />
                                <View style={styles.gaugeCenter}>
                                    <Text variant="headlineMedium" style={{ fontWeight: '800', color: gaugeColor }}>
                                        {savingsRate.toFixed(0)}%
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>saved</Text>
                                </View>
                            </View>
                            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, marginTop: 12 }}>
                                {formatCurrency(netSavings)}
                            </Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                Net savings this month
                            </Text>
                            <Text variant="labelSmall" style={{ color: gaugeColor, fontWeight: '600', marginTop: 4 }}>
                                {savingsRate >= 30 ? '🎉 Great savings rate!' : savingsRate >= 15 ? '👍 On track' : '⚠️ Try to save more'}
                            </Text>
                        </View>
                    </Surface>
                </View>

                {/* Summary Row */}
                <View style={styles.summaryRow}>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.semantic.income + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="arrow-down-circle" size={22} color={customColors.semantic.income} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Income</Text>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: customColors.semantic.income }}>
                            {formatCurrency(totalIncome)}
                        </Text>
                    </Surface>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.semantic.expense + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="arrow-up-circle" size={22} color={customColors.semantic.expense} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Expense</Text>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: customColors.semantic.expense }}>
                            {formatCurrency(totalExpense)}
                        </Text>
                    </Surface>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.brand.primary + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="piggy-bank" size={22} color={customColors.brand.primary} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Saved</Text>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: customColors.brand.primary }}>
                            {formatCurrency(netSavings)}
                        </Text>
                    </Surface>
                </View>

                {/* Income vs Expense vs Savings Bar */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Income vs Expense vs Savings
                    </Text>
                    <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <View style={{ alignItems: 'center', paddingTop: 8 }}>
                            <BarChart
                                data={comparisonData}
                                barWidth={60}
                                spacing={30}
                                roundedTop
                                roundedBottom
                                noOfSections={4}
                                yAxisThickness={0}
                                xAxisThickness={1}
                                xAxisColor={theme.colors.outline}
                                yAxisTextStyle={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}
                                xAxisLabelTextStyle={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontWeight: '600' }}
                                width={SCREEN_WIDTH - 100}
                                height={180}
                                isAnimated
                                animationDuration={600}
                            />
                        </View>
                    </Surface>
                </View>

                {/* Cumulative Savings Trend */}
                {dailySpendingTrend.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Cumulative Savings Trend
                        </Text>
                        <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={{ paddingTop: 8 }}>
                                <BarChart
                                    data={dailySpendingTrend}
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
                                    height={140}
                                    isAnimated
                                    animationDuration={600}
                                />
                            </View>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                                Running balance (income − expenses) by day
                            </Text>
                        </Surface>
                    </View>
                )}

                {/* Where Your Money Goes */}
                {pieData.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Where Your Money Goes
                        </Text>
                        <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <PieChart
                                    data={pieData}
                                    donut
                                    radius={70}
                                    innerRadius={45}
                                    innerCircleColor={theme.colors.surface}
                                    centerLabelComponent={() => (
                                        <View style={{ alignItems: 'center' }}>
                                            <MaterialCommunityIcons name="cash-minus" size={20} color={customColors.semantic.expense} />
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}>
                                                {formatCurrency(totalExpense)}
                                            </Text>
                                        </View>
                                    )}
                                    isAnimated
                                />
                                <View style={{ flex: 1, marginLeft: spacing.md }}>
                                    {categorySpending.slice(0, 5).map((item) => (
                                        <View key={item.catId} style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                                                {item.label}
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

                {/* Savings Tips */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Savings Tips
                    </Text>
                    <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                        {categorySpending.slice(0, 3).map((cat) => (
                            <Surface key={cat.catId} style={[styles.tipCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                                <View style={[styles.tipIcon, { backgroundColor: cat.color + '20' }]}>
                                    <MaterialCommunityIcons name={cat.icon as any} size={20} color={cat.color} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                                        {cat.label}
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                        You've spent {formatCurrency(cat.amount)} ({cat.percentage.toFixed(0)}% of total).
                                        {cat.percentage > 30
                                            ? ' Consider cutting back to boost savings.'
                                            : ' This looks reasonable.'}
                                    </Text>
                                </View>
                            </Surface>
                        ))}

                        {totalIncome === 0 && (
                            <Surface style={[styles.tipCard, { backgroundColor: customColors.semantic.warning + '15' }]} elevation={0}>
                                <MaterialCommunityIcons name="alert" size={24} color={customColors.semantic.warning} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                                        No income recorded
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                        Add income transactions to track your actual savings rate.
                                    </Text>
                                </View>
                            </Surface>
                        )}
                    </View>
                </View>
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
    gaugeCard: {
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
    },
    gaugeCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 10,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    gaugeInner: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 10,
    },
    gaugeCenter: {
        alignItems: 'center',
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
    chartCard: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
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
    tipCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    tipIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
