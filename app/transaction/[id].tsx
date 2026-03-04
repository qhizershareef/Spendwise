import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable, Modal, FlatList } from 'react-native';
import {
    Text,
    useTheme,
    Surface,
    IconButton,
    Button,
    TextInput,
    Chip,
    Snackbar,
    SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTransactionStore } from '@/stores/transactionStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { formatCurrency, formatDateTime, formatDate } from '@/utils/formatters';
import { getCategoryById, PAYMENT_METHODS, PAYMENT_APPS } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { Transaction, CategoryId, PaymentMethod, PaymentApp, TransactionType } from '@/types';

export default function TransactionDetailScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { currentMonth, updateTransaction, deleteTransaction } = useTransactionStore();
    const { getVisibleCategories } = usePreferencesStore();

    const [isEditing, setIsEditing] = useState(false);
    const [catPickerOpen, setCatPickerOpen] = useState(false);
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMsg, setSnackMsg] = useState('');

    // Find the transaction
    const transaction = currentMonth?.transactions.find((t) => t.id === id);

    // Edit state — mirrors all editable fields
    const [editAmount, setEditAmount] = useState('');
    const [editType, setEditType] = useState<TransactionType>('debit');
    const [editCategory, setEditCategory] = useState<CategoryId>('others');
    const [editPayee, setEditPayee] = useState('');
    const [editNote, setEditNote] = useState('');
    const [editMethod, setEditMethod] = useState<PaymentMethod>('upi');
    const [editPaymentApp, setEditPaymentApp] = useState<PaymentApp>('gpay');

    useEffect(() => {
        if (transaction) {
            setEditAmount(String(transaction.amount));
            setEditType(transaction.type);
            setEditCategory(transaction.category);
            setEditPayee(transaction.payee || '');
            setEditNote(transaction.note || '');
            setEditMethod(transaction.method);
            setEditPaymentApp(transaction.paymentApp || 'gpay');
        }
    }, [transaction]);

    if (!transaction) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>Transaction</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={64} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                        Transaction not found
                    </Text>
                    <Button mode="text" onPress={() => router.back()} style={{ marginTop: 16 }}>Go Back</Button>
                </View>
            </SafeAreaView>
        );
    }

    const category = getCategoryById(transaction.category);
    const isExpense = transaction.type === 'debit';
    const paymentMethod = PAYMENT_METHODS.find((m) => m.id === transaction.method);
    const paymentApp = PAYMENT_APPS.find((a) => a.id === transaction.paymentApp);
    const editCategories = getVisibleCategories(editType === 'debit' ? 'expense' : 'income');

    const handleSave = async () => {
        const amount = parseFloat(editAmount);
        if (!amount || amount <= 0) {
            setSnackMsg('Please enter a valid amount');
            setSnackVisible(true);
            return;
        }

        await updateTransaction({
            ...transaction,
            amount,
            type: editType,
            category: editCategory,
            payee: editPayee || undefined,
            note: editNote || undefined,
            method: editMethod,
            paymentApp: editMethod === 'upi' ? editPaymentApp : undefined,
        });
        setIsEditing(false);
        setSnackMsg('Transaction updated ✓');
        setSnackVisible(true);
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Transaction',
            `Delete this ${formatCurrency(transaction.amount)} ${isExpense ? 'expense' : 'income'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteTransaction(transaction.id, transaction.datetime);
                        router.back();
                    },
                },
            ]
        );
    };

    const startEditing = () => {
        // Reset edit state to current transaction values
        setEditAmount(String(transaction.amount));
        setEditType(transaction.type);
        setEditCategory(transaction.category);
        setEditPayee(transaction.payee || '');
        setEditNote(transaction.note || '');
        setEditMethod(transaction.method);
        setEditPaymentApp(transaction.paymentApp || 'gpay');
        setIsEditing(true);
    };

    // ─── EDIT MODE ────────────────────────────────────────
    if (isEditing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="close" onPress={() => setIsEditing(false)} />
                    <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Edit Transaction
                    </Text>
                    <IconButton icon="check" iconColor={theme.colors.primary} onPress={handleSave} />
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    {/* Type Toggle */}
                    <View style={styles.section}>
                        <SegmentedButtons
                            value={editType}
                            onValueChange={(val) => {
                                setEditType(val as TransactionType);
                                setEditCategory('others');
                            }}
                            buttons={[
                                { value: 'debit', label: 'Expense', icon: 'arrow-up-circle' },
                                { value: 'credit', label: 'Income', icon: 'arrow-down-circle' },
                            ]}
                        />
                    </View>

                    {/* Amount */}
                    <View style={styles.section}>
                        <Surface style={[styles.amountBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant }}>₹</Text>
                            <TextInput
                                value={editAmount}
                                onChangeText={setEditAmount}
                                keyboardType="decimal-pad"
                                style={styles.amountInput}
                                underlineColor="transparent"
                                activeUnderlineColor="transparent"
                            />
                        </Surface>
                    </View>

                    {/* Category */}
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground, marginBottom: 8 }}>
                            Category
                        </Text>
                        <Pressable
                            onPress={() => setCatPickerOpen(true)}
                            style={[styles.dropdownButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
                        >
                            {editCategory ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View style={[styles.catIconCircle, { backgroundColor: (getCategoryById(editCategory)?.color || '#999') + '20' }]}>
                                        <MaterialCommunityIcons
                                            name={(getCategoryById(editCategory)?.icon || 'tag') as any}
                                            size={20}
                                            color={getCategoryById(editCategory)?.color || '#999'}
                                        />
                                    </View>
                                    <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface, marginLeft: 10 }}>
                                        {getCategoryById(editCategory)?.label || editCategory}
                                    </Text>
                                </View>
                            ) : (
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Select category</Text>
                            )}
                            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
                        </Pressable>
                    </View>

                    {/* Payee */}
                    <View style={styles.section}>
                        <TextInput
                            label="Payee / Merchant"
                            value={editPayee}
                            onChangeText={setEditPayee}
                            mode="outlined"
                            left={<TextInput.Icon icon="store" />}
                            style={{ backgroundColor: theme.colors.surface }}
                            outlineStyle={{ borderRadius: borderRadius.md }}
                        />
                    </View>

                    {/* Payment Method */}
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground, marginBottom: 8 }}>
                            Payment Method
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                {PAYMENT_METHODS.map((pm) => (
                                    <Chip
                                        key={pm.id}
                                        selected={editMethod === pm.id}
                                        onPress={() => setEditMethod(pm.id as PaymentMethod)}
                                        icon={pm.icon}
                                        mode={editMethod === pm.id ? 'flat' : 'outlined'}
                                        style={{ backgroundColor: editMethod === pm.id ? theme.colors.primaryContainer : undefined }}
                                    >
                                        {pm.label}
                                    </Chip>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Payment App */}
                    {editMethod === 'upi' && (
                        <View style={styles.section}>
                            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground, marginBottom: 8 }}>
                                Payment App
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    {PAYMENT_APPS.map((app) => (
                                        <Chip
                                            key={app.id}
                                            selected={editPaymentApp === app.id}
                                            onPress={() => setEditPaymentApp(app.id as PaymentApp)}
                                            icon={app.icon}
                                            mode={editPaymentApp === app.id ? 'flat' : 'outlined'}
                                            style={{ backgroundColor: editPaymentApp === app.id ? app.color + '20' : undefined }}
                                        >
                                            {app.label}
                                        </Chip>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {/* Note */}
                    <View style={styles.section}>
                        <TextInput
                            label="Note"
                            value={editNote}
                            onChangeText={setEditNote}
                            mode="outlined"
                            left={<TextInput.Icon icon="note-text" />}
                            multiline
                            style={{ backgroundColor: theme.colors.surface }}
                            outlineStyle={{ borderRadius: borderRadius.md }}
                        />
                    </View>
                </ScrollView>

                {/* Category Picker Modal */}
                <Modal visible={catPickerOpen} transparent animationType="slide" onRequestClose={() => setCatPickerOpen(false)}>
                    <Pressable style={styles.modalOverlay} onPress={() => setCatPickerOpen(false)}>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                            <View style={[styles.modalHandle, { backgroundColor: theme.colors.outlineVariant }]} />
                            <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 12, color: theme.colors.onSurface }}>Select Category</Text>
                            <FlatList
                                data={editCategories}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => {
                                            setEditCategory(item.id as CategoryId);
                                            setCatPickerOpen(false);
                                        }}
                                        style={[styles.modalItem, { backgroundColor: editCategory === item.id ? item.color + '15' : 'transparent' }]}
                                    >
                                        <View style={[styles.catIconCircle, { backgroundColor: item.color + '20' }]}>
                                            <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                                        </View>
                                        <Text variant="bodyMedium" style={{ marginLeft: 12, fontWeight: editCategory === item.id ? '700' : '500', color: theme.colors.onSurface }}>
                                            {item.label}
                                        </Text>
                                        {editCategory === item.id && (
                                            <MaterialCommunityIcons name="check" size={20} color={item.color} style={{ marginLeft: 'auto' }} />
                                        )}
                                    </Pressable>
                                )}
                            />
                        </View>
                    </Pressable>
                </Modal>

                <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2000}>
                    {snackMsg}
                </Snackbar>
            </SafeAreaView>
        );
    }

    // ─── VIEW MODE ────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Details
                    </Text>
                    <IconButton icon="pencil" onPress={startEditing} />
                </View>

                {/* Amount Hero */}
                <Surface style={[styles.amountCard, { backgroundColor: isExpense ? customColors.semantic.expense : customColors.semantic.income }]} elevation={2}>
                    <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <MaterialCommunityIcons
                            name={(category?.icon || 'dots-horizontal-circle') as any}
                            size={32}
                            color="#FFF"
                        />
                    </View>
                    <Text variant="labelLarge" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 12 }}>
                        {isExpense ? 'Expense' : 'Income'} · {category?.label}
                    </Text>
                    <Text variant="headlineLarge" style={{ fontWeight: '800', color: '#FFF', marginTop: 4 }}>
                        {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                        {formatDateTime(transaction.datetime)}
                    </Text>
                </Surface>

                {/* Detail Rows */}
                <View style={styles.detailsSection}>
                    <Surface style={[styles.detailCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Row icon="tag" label="Category" value={category?.label || transaction.category} valueColor={category?.color} theme={theme} />
                        <Row icon="store" label="Payee" value={transaction.payee || 'Not specified'} theme={theme} />
                        <Row icon={paymentMethod?.icon || 'credit-card'} label="Method" value={paymentMethod?.label || transaction.method} theme={theme} />
                        {transaction.paymentApp && (
                            <Row icon={paymentApp?.icon || 'apps'} label="App" value={paymentApp?.label || transaction.paymentApp} theme={theme} />
                        )}
                        <Row
                            icon={transaction.source === 'manual' ? 'pencil' : transaction.source === 'sms' ? 'message-text' : 'qrcode-scan'}
                            label="Source"
                            value={transaction.source === 'manual' ? 'Manual Entry' : transaction.source === 'sms' ? 'SMS Auto-detect' : 'QR Scan'}
                            theme={theme}
                        />
                    </Surface>

                    {/* Note */}
                    {transaction.note && (
                        <Surface style={[styles.detailCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <Row icon="note-text" label="Note" value={transaction.note} theme={theme} />
                        </Surface>
                    )}

                    {/* Tags */}
                    {transaction.tags && transaction.tags.length > 0 && (
                        <Surface style={[styles.detailCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <View style={styles.tagHeader}>
                                <MaterialCommunityIcons name="tag-multiple" size={18} color={theme.colors.onSurfaceVariant} />
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>Tags</Text>
                            </View>
                            <View style={styles.chipRow}>
                                {transaction.tags.map((tag) => (
                                    <Chip key={tag} compact style={{ marginRight: 6, marginTop: 6 }}>{tag}</Chip>
                                ))}
                            </View>
                        </Surface>
                    )}

                    {/* Location */}
                    {transaction.location && (
                        <Surface style={[styles.detailCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <Row
                                icon="map-marker"
                                label="Location"
                                value={transaction.location.name || `${transaction.location.lat.toFixed(4)}, ${transaction.location.lng.toFixed(4)}`}
                                theme={theme}
                            />
                        </Surface>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Button
                            mode="contained"
                            onPress={startEditing}
                            icon="pencil"
                            style={{ flex: 1, marginRight: 8, borderRadius: borderRadius.lg }}
                            contentStyle={{ paddingVertical: 4 }}
                        >
                            Edit
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={handleDelete}
                            icon="delete"
                            textColor={theme.colors.error}
                            style={{ flex: 1, borderRadius: borderRadius.lg, borderColor: theme.colors.error }}
                            contentStyle={{ paddingVertical: 4 }}
                        >
                            Delete
                        </Button>
                    </View>
                </View>
            </ScrollView>

            <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2000}>
                {snackMsg}
            </Snackbar>
        </SafeAreaView>
    );
}

function Row({ icon, label, value, valueColor, theme }: {
    icon: string; label: string; value: string; valueColor?: string; theme: any;
}) {
    return (
        <View style={styles.detailRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <MaterialCommunityIcons name={icon as any} size={18} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 10 }}>{label}</Text>
            </View>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: valueColor || theme.colors.onSurface, maxWidth: '60%', textAlign: 'right' }}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
    },
    amountCard: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.sm,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
    },
    heroBadge: {
        width: 64, height: 64, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    detailsSection: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
        paddingBottom: 40,
    },
    detailCard: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    tagHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    actions: {
        flexDirection: 'row',
        marginTop: spacing.sm,
    },
    emptyState: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
    },
    // Edit mode styles
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    amountBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
    },
    amountInput: {
        flex: 1, fontSize: 36, fontWeight: '800',
        backgroundColor: 'transparent', marginLeft: 8,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryChip: {
        width: '22%',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    catIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.lg,
        maxHeight: '50%',
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: borderRadius.md,
        marginBottom: 4,
    },
});
