import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { useTransactionStore } from '@/stores/transactionStore';
import { formatCurrency } from '@/utils/formatters';
import { getCategoryById } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeeklyDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { currentMonth } = useTransactionStore();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekTransactions = useMemo(() => {
        return (currentMonth?.transactions || [])
            .filter((t) => {
                const d = new Date(t.datetime);
                return d >= weekStart && d <= weekEnd;
            })
            .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
    }, [currentMonth, weekStart.getTime()]);

    const weekExpenses = weekTransactions.filter((t) => t.type === 'debit');
    const weekIncome = weekTransactions.filter((t) => t.type === 'credit');
    const totalExpense = weekExpenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = weekIncome.reduce((s, t) => s + t.amount, 0);

    // Daily bar chart data
    const dailyData = useMemo(() => {
        const days: number[] = new Array(7).fill(0);
        weekExpenses.forEach((t) => {
            const dayIdx = new Date(t.datetime).getDay();
            days[dayIdx] += t.amount;
        });

        const todayIdx = now.getDay();
        const maxVal = Math.max(...days);

        return days.map((amount, idx) => ({
            value: amount,
            label: DAY_NAMES[idx],
            frontColor: idx === todayIdx
                ? customColors.brand.primary
                : amount === maxVal && amount > 0
                    ? customColors.semantic.expense
                    : customColors.brand.primaryLight,
            topLabelComponent: amount > 0 ? () => (
                <Text style={{ fontSize: 9, color: theme.colors.onSurfaceVariant, marginBottom: 2, textAlign: 'center' }}>
                    {formatCurrency(amount).replace('₹', '')}
                </Text>
            ) : undefined,
        }));
    }, [weekExpenses, theme]);

    // Category breakdown
    const categoryData = useMemo(() => {
        const map: Record<string, number> = {};
        weekExpenses.forEach((t) => {
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
    }, [weekExpenses, totalExpense]);

    // Busiest day
    const dailyTotals = new Array(7).fill(0);
    weekExpenses.forEach((t) => {
        dailyTotals[new Date(t.datetime).getDay()] += t.amount;
    });
    const busiestDayIdx = dailyTotals.indexOf(Math.max(...dailyTotals));
    const dailyAvg = totalExpense / 7;

    const weekRangeStr = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton icon="arrow-left" size={24} onPress={() => router.back()} iconColor={theme.colors.onBackground} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                        This Week
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{weekRangeStr}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.semantic.expense + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="arrow-up-circle" size={22} color={customColors.semantic.expense} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Spent</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.semantic.expense }}>
                            {formatCurrency(totalExpense)}
                        </Text>
                    </Surface>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.semantic.income + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="arrow-down-circle" size={22} color={customColors.semantic.income} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Earned</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.semantic.income }}>
                            {formatCurrency(totalIncome)}
                        </Text>
                    </Surface>
                    <Surface style={[styles.summaryCard, { backgroundColor: customColors.brand.primary + '15' }]} elevation={0}>
                        <MaterialCommunityIcons name="calculator" size={22} color={customColors.brand.primary} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Daily Avg</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.brand.primary }}>
                            {formatCurrency(dailyAvg)}
                        </Text>
                    </Surface>
                </View>

                {/* Daily Bar Chart */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Daily Spending
                    </Text>
                    <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        {weekExpenses.length > 0 ? (
                            <View style={{ alignItems: 'center', paddingTop: 8 }}>
                                <BarChart
                                    data={dailyData}
                                    barWidth={32}
                                    spacing={16}
                                    roundedTop
                                    roundedBottom
                                    noOfSections={4}
                                    yAxisThickness={0}
                                    xAxisThickness={1}
                                    xAxisColor={theme.colors.outline}
                                    yAxisTextStyle={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}
                                    xAxisLabelTextStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant, fontWeight: '600' }}
                                    width={SCREEN_WIDTH - 100}
                                    height={180}
                                    isAnimated
                                    animationDuration={600}
                                />
                            </View>
                        ) : (
                            <View style={styles.emptyChart}>
                                <MaterialCommunityIcons name="chart-bar" size={48} color={theme.colors.onSurfaceVariant} />
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                                    No expenses recorded this week
                                </Text>
                            </View>
                        )}
                    </Surface>
                </View>

                {/* Quick Stats */}
                {weekExpenses.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Quick Stats
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                                <MaterialCommunityIcons name="fire" size={24} color={customColors.semantic.expense} />
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Busiest Day</Text>
                                <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                    {DAY_NAMES[busiestDayIdx]}
                                </Text>
                                <Text variant="labelSmall" style={{ color: customColors.semantic.expense }}>
                                    {formatCurrency(dailyTotals[busiestDayIdx])}
                                </Text>
                            </Surface>
                            <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                                <MaterialCommunityIcons name="receipt" size={24} color={customColors.brand.primary} />
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Transactions</Text>
                                <Text variant="bodyMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                    {weekExpenses.length}
                                </Text>
                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    expenses
                                </Text>
                            </Surface>
                        </View>
                    </View>
                )}

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
                                    radius={70}
                                    innerRadius={45}
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
                                    {categoryData.slice(0, 5).map((item) => (
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

                {/* Category Progress Bars */}
                {categoryData.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Spending Distribution
                        </Text>
                        <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            {categoryData.map((item) => {
                                const cat = getCategoryById(item.catId);
                                return (
                                    <View key={item.catId} style={{ marginBottom: 12 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons
                                                    name={(cat?.icon || 'dots-horizontal-circle') as any}
                                                    size={16}
                                                    color={item.color}
                                                />
                                                <Text variant="labelSmall" style={{ marginLeft: 6, color: theme.colors.onSurface, fontWeight: '600' }}>
                                                    {item.text}
                                                </Text>
                                            </View>
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                {formatCurrency(item.value)}
                                            </Text>
                                        </View>
                                        <View style={styles.barBg}>
                                            <View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </Surface>
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
    statCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
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
});
