import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import {
    Text,
    TextInput,
    Button,
    useTheme,
    Surface,
    SegmentedButtons,
    Chip,
    Snackbar,
    IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { getCurrentLocation } from '@/services/location';

import { useTransactionStore } from '@/stores/transactionStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { DEFAULT_CATEGORIES, PAYMENT_METHODS, PAYMENT_APPS, getExpenseCategories, getIncomeCategories } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { PaymentMethod, CategoryId, TransactionType, PaymentApp } from '@/types';

export default function AddTransactionScreen() {
    const theme = useTheme();
    const router = useRouter();
    const addTransaction = useTransactionStore((s) => s.addTransaction);
    const { preferences, getVisibleCategories } = usePreferencesStore();

    const [type, setType] = useState<TransactionType>('debit');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<CategoryId | ''>('');
    const [payee, setPayee] = useState('');
    const [note, setNote] = useState('');
    const [method, setMethod] = useState<PaymentMethod>(preferences.defaultPaymentMethod);
    const [paymentApp, setPaymentApp] = useState<PaymentApp>(preferences.defaultPaymentApp);
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMsg, setSnackMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [catPickerOpen, setCatPickerOpen] = useState(false);

    const categories = getVisibleCategories(type === 'debit' ? 'expense' : 'income');
    const selectedCat = categories.find((c) => c.id === category);

    const handleSave = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setSnackMsg('Please enter a valid amount');
            setSnackVisible(true);
            return;
        }
        if (!category) {
            setSnackMsg('Please select a category');
            setSnackVisible(true);
            return;
        }

        setIsSaving(true);
        try {
            // Capture location if global setting is enabled
            let location;
            if (preferences.captureLocation) {
                location = await getCurrentLocation() || undefined;
            }

            await addTransaction({
                amount: parseFloat(amount),
                type,
                category: category as CategoryId,
                payee: payee || undefined,
                note: note || undefined,
                method,
                paymentApp: method === 'upi' ? paymentApp : undefined,
                datetime: new Date().toISOString(),
                source: 'manual',
                location: location || undefined,
            });
            // Reset form
            setAmount('');
            setCategory('');
            setPayee('');
            setNote('');
            setSnackMsg('Transaction saved! ✓');
            setSnackVisible(true);
        } catch (error) {
            setSnackMsg('Failed to save transaction');
            setSnackVisible(true);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                            Add Transaction
                        </Text>
                        <IconButton
                            icon="qrcode-scan"
                            mode="contained"
                            containerColor={theme.colors.primaryContainer}
                            iconColor={theme.colors.primary}
                            size={22}
                            onPress={() => router.push('/scanner' as any)}
                        />
                    </View>

                    {/* Type Toggle */}
                    <View style={styles.section}>
                        <SegmentedButtons
                            value={type}
                            onValueChange={(val) => {
                                setType(val as TransactionType);
                                setCategory('');
                            }}
                            buttons={[
                                {
                                    value: 'debit',
                                    label: 'Expense',
                                    icon: 'arrow-up-circle',
                                    style: type === 'debit' ? { backgroundColor: customColors.semantic.expense + '20' } : {},
                                },
                                {
                                    value: 'credit',
                                    label: 'Income',
                                    icon: 'arrow-down-circle',
                                    style: type === 'credit' ? { backgroundColor: customColors.semantic.income + '20' } : {},
                                },
                            ]}
                            style={{ borderRadius: borderRadius.lg }}
                        />
                    </View>

                    {/* Amount */}
                    <View style={styles.section}>
                        <Surface style={[styles.amountBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {preferences.currencySymbol}
                            </Text>
                            <TextInput
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0"
                                keyboardType="decimal-pad"
                                style={[styles.amountInput, { color: theme.colors.onSurface }]}
                                placeholderTextColor={theme.colors.onSurfaceVariant}
                                underlineColor="transparent"
                                activeUnderlineColor="transparent"
                            />
                        </Surface>
                    </View>

                    {/* Category Dropdown */}
                    <View style={styles.section}>
                        <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground, marginBottom: 8 }}>
                            Category
                        </Text>
                        <Pressable onPress={() => setCatPickerOpen(true)}>
                            <Surface style={[styles.dropdownButton, { backgroundColor: theme.colors.surface }]} elevation={1}>
                                {selectedCat ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={[styles.catIconCircle, { backgroundColor: selectedCat.color + '20' }]}>
                                            <MaterialCommunityIcons name={selectedCat.icon as any} size={20} color={selectedCat.color} />
                                        </View>
                                        <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface, marginLeft: 12 }}>
                                            {selectedCat.label}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                                        Select a category
                                    </Text>
                                )}
                                <MaterialCommunityIcons name="chevron-down" size={22} color={theme.colors.onSurfaceVariant} />
                            </Surface>
                        </Pressable>
                    </View>

                    {/* Payee */}
                    <View style={styles.section}>
                        <TextInput
                            label="Payee / Merchant"
                            value={payee}
                            onChangeText={setPayee}
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
                                {PAYMENT_METHODS.map((pm) => {
                                    const isSelected = method === pm.id;
                                    return (
                                        <Chip
                                            key={pm.id}
                                            selected={isSelected}
                                            onPress={() => setMethod(pm.id as PaymentMethod)}
                                            icon={pm.icon}
                                            mode={isSelected ? 'flat' : 'outlined'}
                                            style={{
                                                backgroundColor: isSelected ? theme.colors.primaryContainer : undefined,
                                            }}
                                        >
                                            {pm.label}
                                        </Chip>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Payment App (for UPI) */}
                    {method === 'upi' && (
                        <View style={styles.section}>
                            <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground, marginBottom: 8 }}>
                                Payment App
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    {PAYMENT_APPS.map((app) => {
                                        const isSelected = paymentApp === app.id;
                                        return (
                                            <Chip
                                                key={app.id}
                                                selected={isSelected}
                                                onPress={() => setPaymentApp(app.id as PaymentApp)}
                                                icon={app.icon}
                                                mode={isSelected ? 'flat' : 'outlined'}
                                                style={{
                                                    backgroundColor: isSelected ? app.color + '20' : undefined,
                                                }}
                                            >
                                                {app.label}
                                            </Chip>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {/* Note */}
                    <View style={styles.section}>
                        <TextInput
                            label="Note (optional)"
                            value={note}
                            onChangeText={setNote}
                            mode="outlined"
                            left={<TextInput.Icon icon="note-text" />}
                            style={{ backgroundColor: theme.colors.surface }}
                            outlineStyle={{ borderRadius: borderRadius.md }}
                        />
                    </View>


                    {/* Save Button */}
                    <View style={[styles.section, { marginTop: spacing.lg, alignItems: 'center' }]}>
                        <Button
                            mode="contained"
                            onPress={handleSave}
                            loading={isSaving}
                            disabled={isSaving}
                            icon="check"
                            contentStyle={{ paddingVertical: 6, paddingHorizontal: 16 }}
                            labelStyle={{ fontWeight: '700', fontSize: 16 }}
                            style={{ borderRadius: borderRadius.full, minWidth: 200 }}
                        >
                            Save {type === 'debit' ? 'Expense' : 'Income'}
                        </Button>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Floating QR Scan Button */}
            <Pressable
                onPress={() => router.push('/scanner' as any)}
                style={({ pressed }) => [
                    styles.fab,
                    { backgroundColor: customColors.brand.primary, opacity: pressed ? 0.85 : 1 },
                ]}
            >
                <MaterialCommunityIcons name="qrcode-scan" size={26} color="#FFF" />
            </Pressable>

            <Snackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                duration={2000}
                style={{ marginBottom: 80 }}
            >
                {snackMsg}
            </Snackbar>

            {/* Category Picker Modal */}
            <Modal visible={catPickerOpen} transparent animationType="slide" onRequestClose={() => setCatPickerOpen(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setCatPickerOpen(false)}>
                    <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: 12 }}>
                            Select Category
                        </Text>
                        <FlatList
                            data={categories}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item: cat }) => {
                                const isSelected = category === cat.id;
                                return (
                                    <Pressable
                                        onPress={() => {
                                            setCategory(cat.id as CategoryId);
                                            setCatPickerOpen(false);
                                        }}
                                        style={[
                                            styles.modalItem,
                                            isSelected && { backgroundColor: cat.color + '15' },
                                        ]}
                                    >
                                        <View style={[styles.catIconCircle, { backgroundColor: cat.color + '20' }]}>
                                            <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.color} />
                                        </View>
                                        <Text variant="bodyLarge" style={{ flex: 1, marginLeft: 14, fontWeight: isSelected ? '700' : '500', color: theme.colors.onSurface }}>
                                            {cat.label}
                                        </Text>
                                        {isSelected && <MaterialCommunityIcons name="check-circle" size={22} color={cat.color} />}
                                    </Pressable>
                                );
                            }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
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
        flex: 1,
        fontSize: 36,
        fontWeight: '800',
        backgroundColor: 'transparent',
        marginLeft: 8,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    catIconCircle: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
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
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        maxHeight: '60%',
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
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
