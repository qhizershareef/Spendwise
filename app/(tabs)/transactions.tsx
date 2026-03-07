import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, Pressable, Animated, Modal } from 'react-native';
import { Text, Searchbar, useTheme, Surface, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Calendar } from 'react-native-calendars';

import { useTransactionStore } from '@/stores/transactionStore';
import { formatCurrency, formatDate, getMonthName, getCurrentMonthKey, getPreviousMonthKey } from '@/utils/formatters';
import { getCategoryById, DEFAULT_CATEGORIES } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { Transaction, CategoryId } from '@/types';

type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'alpha-asc' | 'alpha-desc';

function SwipeableTransactionRow({ item, onPress, onDelete }: {
    item: Transaction;
    onPress: () => void;
    onDelete: () => void;
}) {
    const theme = useTheme();
    const category = getCategoryById(item.category);
    const isExpense = item.type === 'debit';

    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0.5],
            extrapolate: 'clamp',
        });

        return (
            <Pressable onPress={onDelete} style={styles.deleteAction}>
                <Animated.View style={[styles.deleteContent, { transform: [{ scale }] }]}>
                    <MaterialCommunityIcons name="delete" size={22} color="#FFF" />
                    <Text variant="labelSmall" style={{ color: '#FFF', marginTop: 2 }}>Delete</Text>
                </Animated.View>
            </Pressable>
        );
    };

    return (
        <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
            <Pressable onPress={onPress}>
                <Surface style={[styles.row, { backgroundColor: theme.colors.surface }]} elevation={0}>
                    <View style={[styles.rowIcon, { backgroundColor: (category?.color || '#B2BEC3') + '15' }]}>
                        <MaterialCommunityIcons
                            name={(category?.icon || 'dots-horizontal-circle') as any}
                            size={22}
                            color={category?.color || '#B2BEC3'}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                            {item.payee || category?.label || 'Transaction'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {category?.label}
                            </Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}> · </Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {formatDate(item.datetime)}
                            </Text>
                            {item.method && (
                                <>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}> · </Text>
                                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                                        {item.method}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text
                            variant="bodyMedium"
                            style={{
                                fontWeight: '700',
                                color: isExpense ? customColors.semantic.expense : customColors.semantic.income,
                            }}
                        >
                            {isExpense ? '-' : '+'}{formatCurrency(item.amount)}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={{ marginTop: 2 }} />
                    </View>
                </Surface>
            </Pressable>
        </Swipeable>
    );
}

export default function TransactionsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { currentMonth, currentMonthKey, loadMonth, deleteTransaction } = useTransactionStore();
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<CategoryId | ''>('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc');
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Month navigation
    const handlePrevMonth = useCallback(() => {
        const prev = getPreviousMonthKey(currentMonthKey);
        loadMonth(prev);
        setSelectedDate(null);
    }, [currentMonthKey]);

    const handleNextMonth = useCallback(() => {
        const [year, month] = currentMonthKey.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const next = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        const currentKey = getCurrentMonthKey();
        // Don't go past current month
        if (next <= currentKey) {
            loadMonth(next);
            setSelectedDate(null);
        }
    }, [currentMonthKey]);

    const isCurrentMonth = currentMonthKey === getCurrentMonthKey();

    const transactions = useMemo(() => {
        let items = currentMonth?.transactions || [];

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            items = items.filter(
                (t) =>
                    (t.payee?.toLowerCase().includes(q)) ||
                    (t.note?.toLowerCase().includes(q)) ||
                    (t.method?.toLowerCase().includes(q)) ||
                    (getCategoryById(t.category)?.label.toLowerCase().includes(q)) ||
                    (t.amount.toString().includes(q))
            );
        }

        if (filterCategory) {
            items = items.filter((t) => t.category === filterCategory);
        }

        if (selectedDate) {
            items = items.filter((t) => {
                const tDate = new Date(t.datetime);
                const localDateStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}-${String(tDate.getDate()).padStart(2, '0')}`;
                return localDateStr === selectedDate || t.datetime.startsWith(selectedDate);
            });
        }

        // Apply Sorting
        return [...items].sort((a, b) => {
            switch (sortOrder) {
                case 'date-asc':
                    return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
                case 'amount-desc':
                    return b.amount - a.amount;
                case 'amount-asc':
                    return a.amount - b.amount;
                case 'alpha-asc': {
                    const nameA = (a.payee || getCategoryById(a.category)?.label || '').toLowerCase();
                    const nameB = (b.payee || getCategoryById(b.category)?.label || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                }
                case 'alpha-desc': {
                    const nameA = (a.payee || getCategoryById(a.category)?.label || '').toLowerCase();
                    const nameB = (b.payee || getCategoryById(b.category)?.label || '').toLowerCase();
                    return nameB.localeCompare(nameA);
                }
                case 'date-desc':
                default:
                    return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
            }
        });
    }, [currentMonth, search, filterCategory, sortOrder]);

    // Group transactions by date
    const groupedTransactions = useMemo(() => {
        const groups: { date: string; items: Transaction[]; total: number }[] = [];
        const dateMap = new Map<string, Transaction[]>();

        for (const t of transactions) {
            const dateKey = formatDate(t.datetime);
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, []);
            }
            dateMap.get(dateKey)!.push(t);
        }

        for (const [date, items] of dateMap) {
            const total = items.reduce((sum, t) => sum + (t.type === 'debit' ? -t.amount : t.amount), 0);
            groups.push({ date, items, total });
        }
        return groups;
    }, [transactions]);

    // Summary stats
    const totalExpense = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);

    const handleDelete = useCallback((item: Transaction) => {
        deleteTransaction(item.id, item.datetime);
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                    Transactions
                </Text>
            </View>

            {/* Month Navigator */}
            <View style={styles.monthNav}>
                <IconButton icon="chevron-left" size={20} onPress={handlePrevMonth} />
                <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => setCalendarVisible(true)}
                >
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        {getMonthName(currentMonthKey)}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onBackground} />
                </Pressable>
                <IconButton
                    icon="chevron-right"
                    size={20}
                    onPress={handleNextMonth}
                    disabled={isCurrentMonth}
                />
            </View>

            {/* Monthly Summary */}
            <View style={styles.summaryRow}>
                <Surface style={[styles.summaryChip, { backgroundColor: customColors.semantic.income + '15' }]} elevation={0}>
                    <MaterialCommunityIcons name="arrow-down" size={14} color={customColors.semantic.income} />
                    <Text variant="labelSmall" style={{ fontWeight: '700', color: customColors.semantic.income, marginLeft: 4 }}>
                        {formatCurrency(totalIncome)}
                    </Text>
                </Surface>
                <Surface style={[styles.summaryChip, { backgroundColor: customColors.semantic.expense + '15' }]} elevation={0}>
                    <MaterialCommunityIcons name="arrow-up" size={14} color={customColors.semantic.expense} />
                    <Text variant="labelSmall" style={{ fontWeight: '700', color: customColors.semantic.expense, marginLeft: 4 }}>
                        {formatCurrency(totalExpense)}
                    </Text>
                </Surface>
                <Surface style={[styles.summaryChip, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
                    <Text variant="labelSmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
                        {transactions.length} items
                    </Text>
                </Surface>
            </View>

            {/* Search and Sort */}
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Searchbar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search payee, note, amount..."
                    style={{ flex: 1, backgroundColor: theme.colors.surfaceVariant, borderRadius: borderRadius.lg, elevation: 0 }}
                    inputStyle={{ fontSize: 14 }}
                />

                <IconButton
                    icon="sort-variant"
                    mode="contained-tonal"
                    size={24}
                    onPress={() => setSortMenuVisible(true)}
                    containerColor={theme.colors.surfaceVariant}
                />
            </View>

            {/* Active Date Filter */}
            {selectedDate && (
                <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm, flexDirection: 'row' }}>
                    <Chip
                        icon="calendar-remove"
                        onClose={() => setSelectedDate(null)}
                        onPress={() => setSelectedDate(null)}
                        style={{ backgroundColor: theme.colors.primaryContainer }}
                    >
                        {new Date(selectedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Chip>
                </View>
            )}

            {/* Category Filter Chips */}
            <View style={{ marginTop: spacing.sm }}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{ id: '', label: 'All', icon: 'filter-variant', color: theme.colors.primary } as any, ...DEFAULT_CATEGORIES.filter(c => !c.isIncome)]}
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Chip
                            selected={filterCategory === item.id}
                            onPress={() => setFilterCategory(item.id as CategoryId | '')}
                            mode={filterCategory === item.id ? 'flat' : 'outlined'}
                            compact
                            style={{
                                backgroundColor:
                                    filterCategory === item.id
                                        ? (item.color || theme.colors.primary) + '20'
                                        : undefined,
                            }}
                        >
                            {item.label}
                        </Chip>
                    )}
                />
            </View>

            {/* Transaction List */}
            <FlatList
                data={groupedTransactions}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                keyExtractor={(item) => item.date}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="receipt" size={64} color={theme.colors.onSurfaceVariant} />
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                            No transactions found
                        </Text>
                        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {search || filterCategory ? 'Try adjusting your filters' : 'Add your first transaction'}
                        </Text>
                    </View>
                }
                renderItem={({ item: group }) => (
                    <View style={{ marginBottom: spacing.md }}>
                        <View style={styles.dateHeader}>
                            <Text variant="labelMedium" style={{ fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
                                {group.date}
                            </Text>
                            <Text
                                variant="labelMedium"
                                style={{
                                    fontWeight: '600',
                                    color: group.total < 0 ? customColors.semantic.expense : customColors.semantic.income,
                                }}
                            >
                                {group.total < 0 ? '-' : '+'}{formatCurrency(Math.abs(group.total))}
                            </Text>
                        </View>
                        {group.items.map((t) => (
                            <SwipeableTransactionRow
                                key={t.id}
                                item={t}
                                onPress={() => router.push(`/transaction/${t.id}` as any)}
                                onDelete={() => handleDelete(t)}
                            />
                        ))}
                    </View>
                )}
            />

            {/* Sort Menu Modal */}
            <Modal visible={sortMenuVisible} transparent animationType="fade" onRequestClose={() => setSortMenuVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setSortMenuVisible(false)}>
                    <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: spacing.md }}>
                            Sort Transactions By
                        </Text>
                        {[
                            { value: 'date-desc', label: 'Date (Newest First)', icon: 'calendar-arrow-down' },
                            { value: 'date-asc', label: 'Date (Oldest First)', icon: 'calendar-arrow-up' },
                            { value: 'amount-desc', label: 'Amount (High to Low)', icon: 'sort-numeric-descending' },
                            { value: 'amount-asc', label: 'Amount (Low to High)', icon: 'sort-numeric-ascending' },
                            { value: 'alpha-asc', label: 'Alphabetical (A-Z)', icon: 'sort-alphabetical-ascending' },
                            { value: 'alpha-desc', label: 'Alphabetical (Z-A)', icon: 'sort-alphabetical-descending' },
                        ].map((option) => (
                            <Pressable
                                key={option.value}
                                onPress={() => {
                                    setSortOrder(option.value as SortOrder);
                                    setSortMenuVisible(false);
                                }}
                                style={[
                                    styles.sortOption,
                                    sortOrder === option.value && { backgroundColor: theme.colors.primaryContainer }
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={option.icon as any}
                                    size={20}
                                    color={sortOrder === option.value ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                />
                                <Text
                                    variant="bodyMedium"
                                    style={{
                                        marginLeft: 12,
                                        color: sortOrder === option.value ? theme.colors.primary : theme.colors.onSurface,
                                        fontWeight: sortOrder === option.value ? '700' : '500'
                                    }}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Calendar Modal */}
            <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setCalendarVisible(false)}>
                    <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                                Select Date
                            </Text>
                            <IconButton icon="close" size={20} onPress={() => setCalendarVisible(false)} style={{ margin: 0 }} />
                        </View>

                        <Calendar
                            current={selectedDate || `${currentMonthKey}-01`}
                            onDayPress={(day: any) => {
                                const newMonthKey = day.dateString.substring(0, 7);
                                if (newMonthKey !== currentMonthKey) {
                                    if (newMonthKey <= getCurrentMonthKey()) {
                                        loadMonth(newMonthKey);
                                    } else {
                                        return;
                                    }
                                }
                                setSelectedDate(day.dateString);
                                setCalendarVisible(false);
                            }}
                            markedDates={{
                                ...(selectedDate ? { [selectedDate]: { selected: true, selectedColor: theme.colors.primary } } : {})
                            }}
                            theme={{
                                backgroundColor: theme.colors.surface,
                                calendarBackground: theme.colors.surface,
                                textSectionTitleColor: theme.colors.onSurfaceVariant,
                                selectedDayBackgroundColor: theme.colors.primary,
                                selectedDayTextColor: '#ffffff',
                                todayTextColor: theme.colors.primary,
                                dayTextColor: theme.colors.onSurface,
                                textDisabledColor: theme.colors.onSurfaceDisabled,
                                monthTextColor: theme.colors.onSurface,
                                arrowColor: theme.colors.primary,
                            }}
                        />

                        <View style={{ marginTop: spacing.lg }}>
                            <Pressable
                                onPress={() => { setSelectedDate(null); setCalendarVisible(false); loadMonth(getCurrentMonthKey()); }}
                                style={{ padding: 14, alignItems: 'center', backgroundColor: theme.colors.secondaryContainer, borderRadius: borderRadius.md }}
                            >
                                <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}>Jump to Current Month</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xs,
    },
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xs,
        gap: spacing.sm,
    },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: 100,
    },
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.xs,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    rowIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteAction: {
        backgroundColor: '#E17055',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    deleteContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        marginBottom: 4,
    },
});
