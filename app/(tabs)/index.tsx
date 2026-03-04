import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Card, useTheme, Surface, IconButton, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, FadeIn, ZoomIn } from 'react-native-reanimated';

import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { formatCurrency, formatRelativeDate, getMonthName, getCurrentMonthKey } from '@/utils/formatters';
import { getCategoryById } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { Transaction } from '@/types';

function SpendingCard({ title, amount, icon, color, subtitle, onPress }: {
  title: string;
  amount: number;
  icon: string;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} android_ripple={{ color: color + '20' }}>
      <Surface style={[styles.spendingCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={[styles.spendingIconWrap, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icon as any} size={22} color={color} />
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          {title}
        </Text>
        <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, marginTop: 2 }}>
          {formatCurrency(amount)}
        </Text>
        {subtitle && (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
        {onPress && (
          <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.onSurfaceVariant} style={{ marginTop: 4 }} />
        )}
      </Surface>
    </Pressable>
  );
}

function TransactionItem({ transaction, onPress }: { transaction: Transaction; onPress: () => void }) {
  const theme = useTheme();
  const category = getCategoryById(transaction.category);
  const isExpense = transaction.type === 'debit';

  return (
    <Pressable onPress={onPress}>
      <Surface
        style={[styles.transactionItem, { backgroundColor: theme.colors.surface }]}
        elevation={0}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.categoryDot, { backgroundColor: category?.color || '#B2BEC3' }]}>
            <MaterialCommunityIcons
              name={(category?.icon || 'dots-horizontal-circle') as any}
              size={20}
              color="#FFF"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
              {transaction.payee || category?.label || 'Transaction'}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {category?.label} · {formatRelativeDate(transaction.datetime)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              variant="bodyMedium"
              style={{
                fontWeight: '700',
                color: isExpense ? customColors.semantic.expense : customColors.semantic.income,
              }}
            >
              {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={theme.colors.onSurfaceVariant} style={{ marginTop: 2 }} />
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { currentMonth, isLoading, loadMonth, getTodayTotal, getWeekTotal } = useTransactionStore();
  const { budgets } = useBudgetStore();
  const { preferences } = usePreferencesStore();

  const monthKey = getCurrentMonthKey();
  const monthName = getMonthName(monthKey);
  const totalExpense = currentMonth?.metadata.totalExpense ?? 0;
  const totalIncome = currentMonth?.metadata.totalIncome ?? 0;
  const todayTotal = getTodayTotal();
  const weekTotal = getWeekTotal();
  const dayOfMonth = new Date().getDate();

  const recentTransactions = (currentMonth?.transactions || [])
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
    .slice(0, 5);

  const onRefresh = useCallback(async () => {
    await loadMonth(monthKey);
  }, [monthKey]);

  // Get top categories by spending
  const categorySpending: Record<string, number> = {};
  (currentMonth?.transactions || [])
    .filter((t) => t.type === 'debit')
    .forEach((t) => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

  const topCategories = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
              SpendWise
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {monthName}
            </Text>
          </View>
          <IconButton
            icon="bell-outline"
            size={24}
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => { }}
          />
        </View>

        {/* Balance Overview Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Pressable onPress={() => router.push('/detail/monthly' as any)}>
            <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]} mode="contained">
              <Card.Content style={styles.balanceContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="labelMedium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Monthly Spending
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
                </View>
                <Text variant="headlineLarge" style={{ fontWeight: '800', color: '#FFF', marginTop: 4 }}>
                  {formatCurrency(totalExpense)}
                </Text>
                <View style={styles.balanceRow}>
                  <View style={styles.balanceItem}>
                    <MaterialCommunityIcons name="arrow-down-circle" size={16} color="#81ECEC" />
                    <Text variant="labelSmall" style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>
                      Income
                    </Text>
                    <Text variant="bodySmall" style={{ fontWeight: '700', color: '#FFF', marginLeft: 4 }}>
                      {formatCurrency(totalIncome)}
                    </Text>
                  </View>
                  <View style={styles.balanceItem}>
                    <MaterialCommunityIcons name="arrow-up-circle" size={16} color="#FD79A8" />
                    <Text variant="labelSmall" style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>
                      Expense
                    </Text>
                    <Text variant="bodySmall" style={{ fontWeight: '700', color: '#FFF', marginLeft: 4 }}>
                      {formatCurrency(totalExpense)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        </Animated.View>

        {/* Spending Summary */}
        <Animated.View entering={FadeInUp.duration(500).delay(250)} style={styles.spendingRow}>
          <SpendingCard
            title="Today"
            amount={todayTotal}
            icon="calendar-today"
            color={customColors.semantic.expense}
            onPress={() => router.push('/detail/today' as any)}
          />
          <SpendingCard
            title="This Week"
            amount={weekTotal}
            icon="calendar-week"
            color={customColors.brand.primary}
            onPress={() => router.push('/detail/weekly' as any)}
          />
          <SpendingCard
            title="Savings"
            amount={Math.max(0, totalIncome - totalExpense)}
            icon="piggy-bank"
            color={customColors.semantic.income}
            onPress={() => router.push('/detail/savings' as any)}
          />
        </Animated.View>

        {/* AI Quick Tip */}
        <View style={styles.section}>
          <Pressable onPress={() => router.push('/(tabs)/insights' as any)}>
            <Surface style={[styles.aiTipCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.onPrimaryContainer }}>
                  {totalExpense > 0 && todayTotal > (totalExpense / Math.max(dayOfMonth, 1))
                    ? `Today's spending is above your daily average of ${formatCurrency(totalExpense / Math.max(dayOfMonth, 1))}`
                    : totalExpense > 0
                      ? `You're within your daily average — keep it up!`
                      : `Start tracking expenses for AI-powered insights`}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7, marginTop: 2 }}>
                  Tap for detailed insights →
                </Text>
              </View>
            </Surface>
          </Pressable>
        </View>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
              Top Spending
            </Text>
            <View style={styles.categoryRow}>
              {topCategories.map(([catId, amount]) => {
                const cat = getCategoryById(catId);
                const budget = budgets.find((b) => b.category === catId);
                const pct = budget ? Math.min(100, (amount / budget.amount) * 100) : 0;
                return (
                  <Surface key={catId} style={[styles.categoryCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <View style={[styles.categoryIconSmall, { backgroundColor: (cat?.color || '#B2BEC3') + '20' }]}>
                      <MaterialCommunityIcons
                        name={(cat?.icon || 'dots-horizontal-circle') as any}
                        size={18}
                        color={cat?.color || '#B2BEC3'}
                      />
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }} numberOfLines={1}>
                      {cat?.label || catId}
                    </Text>
                    <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                      {formatCurrency(amount)}
                    </Text>
                    {budget && (
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: pct > 90 ? customColors.semantic.expense : cat?.color,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </Surface>
                );
              })}
            </View>
          </View>
        )}

        {/* Budget Progress */}
        {budgets.filter(b => b.isActive).length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
              Budget Progress
            </Text>
            {budgets.filter(b => b.isActive).map((b) => {
              const cat = getCategoryById(b.category);
              const spent = (currentMonth?.transactions || [])
                .filter(t => t.type === 'debit' && t.category === b.category)
                .reduce((s, t) => s + t.amount, 0);
              const pct = Math.min(100, (spent / b.amount) * 100);
              const isOver = spent > b.amount;
              return (
                <Surface key={b.id} style={[styles.budgetRow, { backgroundColor: theme.colors.surface }]} elevation={1}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name={(cat?.icon || 'dots-horizontal-circle') as any} size={18} color={cat?.color} />
                      <Text variant="bodySmall" style={{ fontWeight: '600', marginLeft: 8, color: theme.colors.onSurface }}>
                        {cat?.label}
                      </Text>
                    </View>
                    <Text variant="labelSmall" style={{ color: isOver ? customColors.semantic.expense : theme.colors.onSurfaceVariant }}>
                      {formatCurrency(spent)} / {formatCurrency(b.amount)}
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { marginTop: 6, height: 6 }]}>
                    <View style={[styles.progressFill, { width: `${pct}%`, height: 6, backgroundColor: isOver ? customColors.semantic.expense : cat?.color }]} />
                  </View>
                </Surface>
              );
            })}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
              Recent Transactions
            </Text>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.primary, fontWeight: '600' }}
              onPress={() => router.push('/(tabs)/transactions')}
            >
              See All
            </Text>
          </View>

          {recentTransactions.length === 0 ? (
            <Surface style={[styles.emptyState, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <MaterialCommunityIcons name="receipt" size={48} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                No transactions yet
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Tap the + button to add your first expense
              </Text>
            </Surface>
          ) : (
            <View style={{ marginTop: 8 }}>
              {recentTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  onPress={() => router.push(`/transaction/${transaction.id}` as any)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating QR Scan Button */}
      <Animated.View entering={ZoomIn.duration(400).delay(500)} style={styles.fab}>
        <Pressable
          onPress={() => router.push('/scanner' as any)}
          style={({ pressed }) => [
            styles.fabInner,
            { backgroundColor: customColors.brand.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={26} color="#FFF" />
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  balanceContent: { padding: spacing.lg },
  balanceRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  balanceItem: { flexDirection: 'row', alignItems: 'center' },
  spendingRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  spendingCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  spendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  categoryIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  transactionItem: {
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
  },
  categoryDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    marginTop: spacing.md,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  budgetRow: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  aiTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
