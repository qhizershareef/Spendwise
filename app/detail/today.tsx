import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { useTransactionStore } from '@/stores/transactionStore';
import { formatCurrency, formatTime } from '@/utils/formatters';
import { getCategoryById } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { Transaction } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TodayDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { currentMonth } = useTransactionStore();

    const today = new Date();
    const todayStr = today.toDateString();

    const todayTransactions = useMemo(() => {
        return (currentMonth?.transactions || [])
            .filter((t) => new Date(t.datetime).toDateString() === todayStr)
            .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
    }, [currentMonth, todayStr]);

    const todayExpenses = todayTransactions.filter((t) => t.type === 'debit');
    const todayIncome = todayTransactions.filter((t) => t.type === 'credit');
    const totalExpense = todayExpenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = todayIncome.reduce((s, t) => s + t.amount, 0);

    // Hourly bar chart data
    const hourlyData = useMemo(() => {
        const hours: number[] = new Array(24).fill(0);
        todayExpenses.forEach((t) => {
            const hour = new Date(t.datetime).getHours();
            hours[hour] += t.amount;
        });

        return hours.map((amount, idx) => ({
            value: amount,
            label: idx % 3 === 0 ? `${idx}h` : '',
            frontColor: amount > 0 ? customColors.brand.primary : customColors.brand.primary + '30',
            topLabelComponent: amount > 0 ? () => (
                <Text style={{ fontSize: 8, color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
                    {formatCurrency(amount).replace('₹', '')}
                </Text>
            ) : undefined,
        }));
    }, [todayExpenses, theme]);

    // Category pie chart data
    const categoryData = useMemo(() => {
        const map: Record<string, number> = {};
        todayExpenses.forEach((t) => {
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
                    focused: false,
                };
            });
    }, [todayExpenses]);

    const maxExpense = todayExpenses.length > 0
        ? todayExpenses.reduce((max, t) => t.amount > max.amount ? t : max, todayExpenses[0])
        : null;

    const dateFormatted = today.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton icon="arrow-left" size={24} onPress={() => router.back()} iconColor={theme.colors.onBackground} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                        Today's Spending
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{dateFormatted}</Text>
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
                        <MaterialCommunityIcons name="counter" size={22} color={customColors.brand.primary} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>Txns</Text>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.brand.primary }}>
                            {todayTransactions.length}
                        </Text>
                    </Surface>
                </View>

                {/* Hourly Bar Chart */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Hourly Spending
                    </Text>
                    <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        {todayExpenses.length > 0 ? (
                            <View style={{ paddingTop: 8 }}>
                                <BarChart
                                    data={hourlyData}
                                    barWidth={8}
                                    spacing={4}
                                    roundedTop
                                    roundedBottom
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
                                />
                            </View>
                        ) : (
                            <View style={styles.emptyChart}>
                                <MaterialCommunityIcons name="chart-bar" size={48} color={theme.colors.onSurfaceVariant} />
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                                    No expenses recorded today
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
                                        <View key={item.text} style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
                                                {item.text}
                                            </Text>
                                            <Text variant="labelSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                                {formatCurrency(item.value)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </Surface>
                    </View>
                )}

                {/* Highest Expense */}
                {maxExpense && (
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                            Highest Expense
                        </Text>
                        <Surface style={[styles.highlightCard, { backgroundColor: customColors.semantic.expense + '12' }]} elevation={0}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.catIcon, { backgroundColor: getCategoryById(maxExpense.category)?.color || '#B2BEC3' }]}>
                                    <MaterialCommunityIcons
                                        name={(getCategoryById(maxExpense.category)?.icon || 'dots-horizontal-circle') as any}
                                        size={20}
                                        color="#FFF"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                                        {maxExpense.payee || getCategoryById(maxExpense.category)?.label || 'Transaction'}
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {formatTime(maxExpense.datetime)} · {getCategoryById(maxExpense.category)?.label}
                                    </Text>
                                </View>
                                <Text variant="titleMedium" style={{ fontWeight: '700', color: customColors.semantic.expense }}>
                                    {formatCurrency(maxExpense.amount)}
                                </Text>
                            </View>
                        </Surface>
                    </View>
                )}

                {/* Transaction List */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        All Transactions ({todayTransactions.length})
                    </Text>
                    {todayTransactions.length === 0 ? (
                        <Surface style={[styles.emptyState, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                            <MaterialCommunityIcons name="receipt" size={48} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                                No transactions yet today
                            </Text>
                        </Surface>
                    ) : (
                        <View style={{ gap: 4, marginTop: spacing.sm }}>
                            {todayTransactions.map((t) => {
                                const cat = getCategoryById(t.category);
                                const isExpense = t.type === 'debit';
                                return (
                                    <Pressable key={t.id} onPress={() => router.push(`/transaction/${t.id}` as any)}>
                                        <Surface style={[styles.txnItem, { backgroundColor: theme.colors.surface }]} elevation={0}>
                                            <View style={[styles.catIcon, { backgroundColor: cat?.color || '#B2BEC3' }]}>
                                                <MaterialCommunityIcons
                                                    name={(cat?.icon || 'dots-horizontal-circle') as any}
                                                    size={18}
                                                    color="#FFF"
                                                />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                                                    {t.payee || cat?.label || 'Transaction'}
                                                </Text>
                                                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                    {formatTime(t.datetime)} · {cat?.label}
                                                </Text>
                                            </View>
                                            <Text
                                                variant="bodyMedium"
                                                style={{
                                                    fontWeight: '700',
                                                    color: isExpense ? customColors.semantic.expense : customColors.semantic.income,
                                                }}
                                            >
                                                {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                                            </Text>
                                        </Surface>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
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
    highlightCard: {
        marginTop: spacing.sm,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    catIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txnItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },
    emptyState: {
        marginTop: spacing.md,
        padding: spacing.xl,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
});
