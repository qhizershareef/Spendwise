import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, Button, useTheme, Surface, TextInput, Chip, Snackbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';

import { parseUPIQR, openPaymentApp, type UPIData } from '@/services/payments';
import { useTransactionStore } from '@/stores/transactionStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { formatCurrency } from '@/utils/formatters';
import { getCategoryById, getExpenseCategories, PAYMENT_APPS } from '@/constants/categories';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { CategoryId, PaymentApp } from '@/types';

export default function ScannerScreen() {
    const theme = useTheme();
    const router = useRouter();
    const addTransaction = useTransactionStore((s) => s.addTransaction);
    const { preferences } = usePreferencesStore();

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [upiData, setUpiData] = useState<UPIData | null>(null);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<CategoryId>('others');
    const [selectedApp, setSelectedApp] = useState<PaymentApp>(preferences.defaultPaymentApp);
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMsg, setSnackMsg] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    const expenseCategories = getExpenseCategories();

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;

        const parsed = parseUPIQR(data);
        if (parsed && parsed.pa) {
            setScanned(true);
            setUpiData(parsed as any);
            if (parsed.am) setAmount(parsed.am);
        } else {
            setSnackMsg('Not a valid UPI QR code');
            setSnackVisible(true);
        }
    };

    const handlePay = async () => {
        if (!upiData?.pa || !amount) {
            setSnackMsg('Please enter an amount');
            setSnackVisible(true);
            return;
        }

        setIsPaying(true);

        // Get the preferred app for this category
        const appForCategory = preferences.categoryPaymentApps[category] || selectedApp;

        const success = await openPaymentApp(
            upiData.pa,
            amount,
            upiData.pn,
            `SpendWise: ${getCategoryById(category)?.label || category}`,
            appForCategory
        );

        if (success) {
            // Auto-log the transaction
            await addTransaction({
                amount: parseFloat(amount),
                type: 'debit',
                category,
                payee: upiData.pn || upiData.pa,
                payeeUPI: upiData.pa,
                method: 'upi',
                paymentApp: appForCategory,
                note: `QR payment to ${upiData.pn || upiData.pa}`,
                datetime: new Date().toISOString(),
                source: 'qr_scan',
            });
            setSnackMsg('Transaction logged ✓');
            setSnackVisible(true);
            setTimeout(() => router.back(), 1500);
        } else {
            setSnackMsg('Could not open payment app');
            setSnackVisible(true);
        }

        setIsPaying(false);
    };

    const handleLogWithoutPay = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setSnackMsg('Please enter a valid amount');
            setSnackVisible(true);
            return;
        }

        await addTransaction({
            amount: parseFloat(amount),
            type: 'debit',
            category,
            payee: upiData?.pn || upiData?.pa || 'QR Payment',
            payeeUPI: upiData?.pa,
            method: 'upi',
            paymentApp: selectedApp,
            note: `QR scan - manual log`,
            datetime: new Date().toISOString(),
            source: 'qr_scan',
        });

        setSnackMsg('Transaction saved ✓');
        setSnackVisible(true);
        setTimeout(() => router.back(), 1000);
    };

    // Permission not granted
    if (!permission) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.center}>
                    <Text variant="bodyLarge">Requesting camera permission...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleMedium" style={{ fontWeight: '700' }}>Scan QR</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.center}>
                    <MaterialCommunityIcons name="camera-off" size={64} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
                        Camera permission is needed to scan QR codes
                    </Text>
                    <Button mode="contained" onPress={requestPermission} style={{ marginTop: 24 }}>
                        Grant Permission
                    </Button>
                </View>
            </SafeAreaView>
        );
    }

    // QR scanned — show payment confirmation
    if (scanned && upiData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onBackground }}>
                        Payment
                    </Text>
                    <IconButton icon="qrcode-scan" onPress={() => { setScanned(false); setUpiData(null); }} />
                </View>

                <View style={styles.paymentContent}>
                    {/* Payee Info */}
                    <Surface style={[styles.payeeCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <View style={[styles.payeeIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                            <MaterialCommunityIcons name="store" size={28} color={theme.colors.primary} />
                        </View>
                        <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, marginTop: 12 }}>
                            {upiData.pn || 'Merchant'}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {upiData.pa}
                        </Text>
                    </Surface>

                    {/* Amount */}
                    <Surface style={[styles.amountBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant }}>₹</Text>
                        <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0"
                            keyboardType="decimal-pad"
                            style={[styles.amountInput, { color: theme.colors.onSurface }]}
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                        />
                    </Surface>

                    {/* Category */}
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground, marginTop: spacing.md }}>
                        Category
                    </Text>
                    <View style={styles.categoryRow}>
                        {expenseCategories.slice(0, 8).map((cat) => {
                            const isSelected = category === cat.id;
                            return (
                                <Chip
                                    key={cat.id}
                                    selected={isSelected}
                                    onPress={() => {
                                        setCategory(cat.id as CategoryId);
                                        // Auto-select preferred app for this category
                                        const appForCat = preferences.categoryPaymentApps[cat.id as CategoryId];
                                        if (appForCat) setSelectedApp(appForCat);
                                    }}
                                    mode={isSelected ? 'flat' : 'outlined'}
                                    compact
                                    icon={cat.icon}
                                    style={{ backgroundColor: isSelected ? cat.color + '20' : undefined, marginBottom: 4 }}
                                >
                                    {cat.label}
                                </Chip>
                            );
                        })}
                    </View>

                    {/* Payment App */}
                    <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onBackground, marginTop: spacing.md }}>
                        Pay with
                    </Text>
                    <View style={styles.appRow}>
                        {PAYMENT_APPS.map((app) => {
                            const isSelected = selectedApp === app.id;
                            return (
                                <Chip
                                    key={app.id}
                                    selected={isSelected}
                                    onPress={() => setSelectedApp(app.id as PaymentApp)}
                                    mode={isSelected ? 'flat' : 'outlined'}
                                    icon={app.icon}
                                    style={{ backgroundColor: isSelected ? app.color + '20' : undefined }}
                                >
                                    {app.label}
                                </Chip>
                            );
                        })}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <Button
                            mode="contained"
                            onPress={handlePay}
                            loading={isPaying}
                            disabled={isPaying || !amount}
                            icon="send"
                            contentStyle={{ paddingVertical: 6 }}
                            labelStyle={{ fontWeight: '700', fontSize: 16 }}
                            style={{ flex: 1, borderRadius: borderRadius.lg, marginRight: 8 }}
                        >
                            Pay {amount ? formatCurrency(parseFloat(amount)) : ''}
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={handleLogWithoutPay}
                            icon="content-save"
                            contentStyle={{ paddingVertical: 6 }}
                            style={{ borderRadius: borderRadius.lg }}
                        >
                            Log Only
                        </Button>
                    </View>
                </View>

                <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2000}>
                    {snackMsg}
                </Snackbar>
            </SafeAreaView>
        );
    }

    // Camera scanning view
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor="#FFF" onPress={() => router.back()} />
                <Text variant="titleMedium" style={{ fontWeight: '700', color: '#FFF' }}>
                    Scan UPI QR Code
                </Text>
                <View style={{ width: 48 }} />
            </View>

            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={handleBarCodeScanned}
                />
                {/* Overlay */}
                <View style={styles.overlay}>
                    <View style={styles.scanFrame}>
                        {/* Corner markers */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 24, textAlign: 'center' }}>
                        Point your camera at a UPI QR code
                    </Text>
                </View>
            </View>

            <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2000}>
                {snackMsg}
            </Snackbar>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.xs,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scanFrame: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#6C5CE7',
        borderWidth: 3,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    paymentContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    payeeCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        alignItems: 'center',
    },
    payeeIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    amountBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        marginTop: spacing.md,
    },
    amountInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: '800',
        backgroundColor: 'transparent',
        marginLeft: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    appRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        marginTop: spacing.xl,
        paddingBottom: spacing.lg,
    },
});
