import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, Pressable, PermissionsAndroid } from 'react-native';
import {
    Text,
    List,
    Switch,
    useTheme,
    Surface,
    Divider,
    Button,
    Dialog,
    Portal,
    RadioButton,
    TextInput,
    Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { usePreferencesStore } from '@/stores/preferencesStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { testConnection } from '@/services/ai';
import { exportAsCSV, exportAsJSON } from '@/services/export';
import { configureGoogleSignIn } from '@/services/googleDrive';
import { useSyncStore } from '@/stores/syncStore';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import { DEFAULT_CATEGORIES, getExpenseCategories } from '@/constants/categories';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import type { CategoryId, Category } from '@/types';

export default function SettingsScreen() {
    const theme = useTheme();
    const { preferences, updatePreference, addCustomCategory, removeCustomCategory, toggleCategory, toggleDisableCategory, getAllCategories } = usePreferencesStore();
    const { budgets, addBudget, deleteBudget } = useBudgetStore();
    const { isSignedIn, userEmail, isSyncing, lastSyncTime, lastError, checkSignInStatus, signIn, signOut, syncNow, restoreFromDrive } = useSyncStore();

    // Configure Google Sign-In and check status on mount
    useEffect(() => {
        configureGoogleSignIn('555178069411-gs2c83fgsu3d1s4cnehe5u6983deeffr.apps.googleusercontent.com');
        checkSignInStatus();
    }, []);

    // Budget dialog
    const [budgetDialog, setBudgetDialog] = useState(false);
    const [budgetCategory, setBudgetCategory] = useState<CategoryId>('food');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMsg, setSnackMsg] = useState('');

    // Category dialog
    const [categoryDialog, setCategoryDialog] = useState(false);
    const [catLabel, setCatLabel] = useState('');
    const [catIcon, setCatIcon] = useState('tag');
    const [catIsIncome, setCatIsIncome] = useState(false);

    const ICON_OPTIONS = ['tag', 'cart', 'gift', 'heart', 'star', 'flash', 'leaf', 'paw', 'music', 'palette', 'dumbbell', 'airplane', 'baby-carriage', 'bank', 'cellphone'];

    // AI state
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTestingAI, setIsTestingAI] = useState(false);

    // Export state
    const [exportDialog, setExportDialog] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleAddCategory = async () => {
        if (!catLabel.trim()) return;
        const id = catLabel.toLowerCase().replace(/\s+/g, '_');
        const newCat: Category = {
            id,
            label: catLabel.trim(),
            icon: catIcon,
            color: customColors.category[Object.keys(customColors.category)[Math.floor(Math.random() * Object.keys(customColors.category).length)] as keyof typeof customColors.category],
            subcategories: [],
            isCustom: true,
            isIncome: catIsIncome,
        };
        await addCustomCategory(newCat);
        setCategoryDialog(false);
        setCatLabel('');
        setCatIcon('tag');
        setCatIsIncome(false);
        setSnackMsg('Category added ✓');
        setSnackVisible(true);
    };

    const handleAddBudget = async () => {
        const amount = parseFloat(budgetAmount);
        if (!amount || amount <= 0) return;
        await addBudget(budgetCategory, amount);
        setBudgetDialog(false);
        setBudgetAmount('');
        setSnackMsg('Budget added ✓');
        setSnackVisible(true);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                        Settings
                    </Text>
                </View>

                {/* Appearance */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Appearance
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <List.Item
                            title="Theme"
                            description={preferences.theme === 'system' ? 'System Default' : preferences.theme === 'dark' ? 'Dark' : 'Light'}
                            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
                            onPress={() => {
                                const next = preferences.theme === 'system' ? 'light' : preferences.theme === 'light' ? 'dark' : 'system';
                                updatePreference('theme', next);
                            }}
                        />
                    </Surface>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Preferences
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <List.Item
                            title="Currency"
                            description={`${preferences.currencySymbol} ${preferences.currency}`}
                            left={(props) => <List.Icon {...props} icon="currency-inr" />}
                        />
                        <Divider />
                        <List.Item
                            title="First Day of Week"
                            description={preferences.firstDayOfWeek === 0 ? 'Sunday' : 'Monday'}
                            left={(props) => <List.Icon {...props} icon="calendar" />}
                            onPress={() => updatePreference('firstDayOfWeek', preferences.firstDayOfWeek === 0 ? 1 : 0)}
                        />
                    </Surface>
                </View>

                {/* Smart Features */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Smart Features
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <List.Item
                            title="SMS Auto-Detect"
                            description="Automatically detect transactions from SMS"
                            left={(props) => <List.Icon {...props} icon="message-text" />}
                            right={() => (
                                <Switch
                                    value={preferences.smsAutoDetect}
                                    onValueChange={async (val) => {
                                        if (val && Platform.OS === 'android') {
                                            try {
                                                const granted = await PermissionsAndroid.requestMultiple([
                                                    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                                                    PermissionsAndroid.PERMISSIONS.READ_SMS,
                                                ]);
                                                const allGranted =
                                                    granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
                                                    granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED;
                                                if (!allGranted) {
                                                    setSnackMsg('SMS permission required for auto-detect');
                                                    setSnackVisible(true);
                                                    return;
                                                }
                                            } catch (err) {
                                                setSnackMsg('Permission request failed');
                                                setSnackVisible(true);
                                                return;
                                            }
                                        }
                                        updatePreference('smsAutoDetect', val);
                                    }}
                                    color={theme.colors.primary}
                                />
                            )}
                        />
                        <Divider />
                        <List.Item
                            title="Notifications"
                            description="Get spending alerts and reminders"
                            left={(props) => <List.Icon {...props} icon="bell" />}
                            right={() => (
                                <Switch
                                    value={preferences.notificationsEnabled}
                                    onValueChange={async (val) => {
                                        if (val) {
                                            const { status } = await Notifications.requestPermissionsAsync();
                                            if (status !== 'granted') {
                                                setSnackMsg('Notification permission denied');
                                                setSnackVisible(true);
                                                return;
                                            }
                                        }
                                        updatePreference('notificationsEnabled', val);
                                    }}
                                    color={theme.colors.primary}
                                />
                            )}
                        />
                        <Divider />
                        <List.Item
                            title="Capture Location"
                            description="Record GPS location on every transaction"
                            left={(props) => <List.Icon {...props} icon="map-marker" />}
                            right={() => (
                                <Switch
                                    value={preferences.captureLocation}
                                    onValueChange={(val) => updatePreference('captureLocation', val)}
                                    color={theme.colors.primary}
                                />
                            )}
                        />
                    </Surface>
                </View>

                {/* Security */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Security
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <List.Item
                            title="Biometric Lock"
                            description="Use fingerprint or face to unlock app"
                            left={(props) => <List.Icon {...props} icon="fingerprint" />}
                            right={() => (
                                <Switch
                                    value={preferences.biometricLock}
                                    onValueChange={async (val) => {
                                        if (val) {
                                            const compatible = await LocalAuthentication.hasHardwareAsync();
                                            if (!compatible) {
                                                setSnackMsg('Biometric hardware not available on this device');
                                                setSnackVisible(true);
                                                return;
                                            }
                                            const enrolled = await LocalAuthentication.isEnrolledAsync();
                                            if (!enrolled) {
                                                setSnackMsg('No biometrics enrolled — set up fingerprint/face in system settings');
                                                setSnackVisible(true);
                                                return;
                                            }
                                            const result = await LocalAuthentication.authenticateAsync({
                                                promptMessage: 'Authenticate to enable biometric lock',
                                                fallbackLabel: 'Use passcode',
                                            });
                                            if (!result.success) {
                                                setSnackMsg('Authentication failed');
                                                setSnackVisible(true);
                                                return;
                                            }
                                        }
                                        updatePreference('biometricLock', val);
                                        setSnackMsg(val ? 'Biometric lock enabled ✓' : 'Biometric lock disabled');
                                        setSnackVisible(true);
                                    }}
                                    color={theme.colors.primary}
                                />
                            )}
                        />
                    </Surface>
                </View>

                {/* Budgets */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                            Budgets
                        </Text>
                        <Button
                            mode="text"
                            onPress={() => setBudgetDialog(true)}
                            icon="plus"
                            compact
                        >
                            Add
                        </Button>
                    </View>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        {budgets.length === 0 ? (
                            <List.Item
                                title="No budgets set"
                                description="Tap Add to set a monthly budget for a category"
                                left={(props) => <List.Icon {...props} icon="target" />}
                            />
                        ) : (
                            budgets.map((b) => {
                                const cat = DEFAULT_CATEGORIES.find((c) => c.id === b.category);
                                return (
                                    <List.Item
                                        key={b.id}
                                        title={cat?.label || b.category}
                                        description={`₹${b.amount.toLocaleString()} / ${b.period}`}
                                        left={(props) => (
                                            <List.Icon
                                                {...props}
                                                icon={cat?.icon || 'dots-horizontal-circle'}
                                                color={cat?.color}
                                            />
                                        )}
                                        right={(props) => (
                                            <MaterialCommunityIcons
                                                name="delete-outline"
                                                size={20}
                                                color={theme.colors.error}
                                                onPress={() => deleteBudget(b.id)}
                                            />
                                        )}
                                    />
                                );
                            })
                        )}
                    </Surface>
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                            Categories
                        </Text>
                        <Button mode="text" onPress={() => setCategoryDialog(true)} icon="plus" compact>
                            Add Custom
                        </Button>
                    </View>

                    {/* Expense Categories */}
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, fontWeight: '600' }}>
                        Expense
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface, marginBottom: spacing.md }]} elevation={1}>
                        {getAllCategories().filter(c => !c.isIncome && !preferences.hiddenCategories.includes(c.id)).length === 0 ? (
                            <List.Item title="No expense categories" description="Add custom categories or restore defaults" left={(props) => <List.Icon {...props} icon="shape-plus" />} />
                        ) : (
                            getAllCategories().filter(c => !c.isIncome && !preferences.hiddenCategories.includes(c.id)).map((cat) => {
                                const isDisabled = preferences.disabledCategories.includes(cat.id);
                                return (
                                    <Pressable
                                        key={cat.id}
                                        onLongPress={() => {
                                            Alert.alert(
                                                isDisabled ? 'Enable Category' : 'Disable Category',
                                                isDisabled ? `Enable "${cat.label}"? It will appear in the transaction form.` : `Disable "${cat.label}"? It won't appear when adding transactions.`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: isDisabled ? 'Enable' : 'Disable', onPress: () => toggleDisableCategory(cat.id) },
                                                ]
                                            );
                                        }}
                                        delayLongPress={400}
                                    >
                                        <List.Item
                                            title={cat.label}
                                            description={isDisabled ? 'Disabled · Hold to enable' : (cat.isCustom ? 'Custom' : 'Default')}
                                            left={(props) => <List.Icon {...props} icon={cat.icon} color={isDisabled ? theme.colors.onSurfaceDisabled : cat.color} />}
                                            right={() => (
                                                <MaterialCommunityIcons
                                                    name="close-circle"
                                                    size={20}
                                                    color={theme.colors.error}
                                                    onPress={() => {
                                                        Alert.alert('Remove Category', `Remove "${cat.label}"? You can restore it later.`, [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            { text: 'Remove', style: 'destructive', onPress: () => cat.isCustom ? removeCustomCategory(cat.id) : toggleCategory(cat.id) },
                                                        ]);
                                                    }}
                                                />
                                            )}
                                            style={{ opacity: isDisabled ? 0.45 : 1 }}
                                        />
                                    </Pressable>
                                );
                            })
                        )}
                    </Surface>

                    {/* Income Categories */}
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4, fontWeight: '600' }}>
                        Income
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        {getAllCategories().filter(c => c.isIncome && !preferences.hiddenCategories.includes(c.id)).length === 0 ? (
                            <List.Item title="No income categories" description="Add custom categories or restore defaults" left={(props) => <List.Icon {...props} icon="shape-plus" />} />
                        ) : (
                            getAllCategories().filter(c => c.isIncome && !preferences.hiddenCategories.includes(c.id)).map((cat) => {
                                const isDisabled = preferences.disabledCategories.includes(cat.id);
                                return (
                                    <Pressable
                                        key={cat.id}
                                        onLongPress={() => {
                                            Alert.alert(
                                                isDisabled ? 'Enable Category' : 'Disable Category',
                                                isDisabled ? `Enable "${cat.label}"? It will appear in the transaction form.` : `Disable "${cat.label}"? It won't appear when adding transactions.`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: isDisabled ? 'Enable' : 'Disable', onPress: () => toggleDisableCategory(cat.id) },
                                                ]
                                            );
                                        }}
                                        delayLongPress={400}
                                    >
                                        <List.Item
                                            title={cat.label}
                                            description={isDisabled ? 'Disabled · Hold to enable' : (cat.isCustom ? 'Custom' : 'Default')}
                                            left={(props) => <List.Icon {...props} icon={cat.icon} color={isDisabled ? theme.colors.onSurfaceDisabled : cat.color} />}
                                            right={() => (
                                                <MaterialCommunityIcons
                                                    name="close-circle"
                                                    size={20}
                                                    color={theme.colors.error}
                                                    onPress={() => {
                                                        Alert.alert('Remove Category', `Remove "${cat.label}"? You can restore it later.`, [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            { text: 'Remove', style: 'destructive', onPress: () => cat.isCustom ? removeCustomCategory(cat.id) : toggleCategory(cat.id) },
                                                        ]);
                                                    }}
                                                />
                                            )}
                                            style={{ opacity: isDisabled ? 0.45 : 1 }}
                                        />
                                    </Pressable>
                                );
                            })
                        )}
                    </Surface>

                    {/* Restore Defaults */}
                    {preferences.hiddenCategories.length > 0 && (
                        <Button
                            mode="text"
                            icon="restore"
                            compact
                            onPress={() => {
                                Alert.alert('Restore Categories', `Restore ${preferences.hiddenCategories.length} removed default ${preferences.hiddenCategories.length === 1 ? 'category' : 'categories'}?`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Restore All', onPress: () => updatePreference('hiddenCategories', []) },
                                ]);
                            }}
                            style={{ alignSelf: 'center', marginTop: 8 }}
                        >
                            Restore {preferences.hiddenCategories.length} removed {preferences.hiddenCategories.length === 1 ? 'category' : 'categories'}
                        </Button>
                    )}
                </View>

                {/* AI Configuration */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        AI Configuration
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <List.Item
                            title="AI Provider"
                            description={preferences.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI ChatGPT'}
                            left={(props) => <List.Icon {...props} icon={preferences.aiProvider === 'gemini' ? 'google' : 'robot'} />}
                            onPress={() => {
                                const next = preferences.aiProvider === 'gemini' ? 'chatgpt' : 'gemini';
                                updatePreference('aiProvider', next);
                            }}
                        />
                        <Divider />
                        <View style={{ padding: spacing.md }}>
                            <TextInput
                                label={preferences.aiProvider === 'gemini' ? 'Gemini API Key' : 'ChatGPT API Key'}
                                value={preferences.aiProvider === 'gemini' ? preferences.geminiApiKey : preferences.chatgptApiKey}
                                onChangeText={(val) => updatePreference(preferences.aiProvider === 'gemini' ? 'geminiApiKey' : 'chatgptApiKey', val)}
                                secureTextEntry={!showApiKey}
                                right={
                                    <TextInput.Icon
                                        icon={showApiKey ? 'eye-off' : 'eye'}
                                        onPress={() => setShowApiKey(!showApiKey)}
                                    />
                                }
                                mode="outlined"
                                placeholder={preferences.aiProvider === 'gemini' ? 'Enter Gemini API key' : 'Enter OpenAI API key'}
                                style={{ fontSize: 14 }}
                            />
                        </View>
                        <Divider />
                        <List.Item
                            title="Test Connection"
                            description={isTestingAI ? 'Testing...' : 'Verify your API key works'}
                            left={(props) => <List.Icon {...props} icon="connection" />}
                            onPress={async () => {
                                const currentKey = preferences.aiProvider === 'gemini' ? preferences.geminiApiKey : preferences.chatgptApiKey;
                                if (!currentKey) {
                                    Alert.alert('Missing API Key', 'Please enter an API key first.');
                                    return;
                                }
                                setIsTestingAI(true);
                                const result = await testConnection(preferences.aiProvider, currentKey);
                                setIsTestingAI(false);
                                if (result.success) {
                                    Alert.alert('✓ Connected', `Successfully connected to ${preferences.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI ChatGPT'}.`);
                                } else {
                                    Alert.alert('✗ Connection Failed', result.error || 'Unknown error occurred.');
                                }
                            }}
                        />
                    </Surface>
                </View>

                {/* Data & Sync */}
                <View style={styles.section}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Data & Sync
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        {isSignedIn ? (
                            <>
                                <List.Item
                                    title="Google Drive Connected"
                                    description={userEmail || 'Signed in'}
                                    left={(props) => <List.Icon {...props} icon="google-drive" color={customColors.semantic.income} />}
                                    right={() => (
                                        <Button mode="text" compact onPress={signOut} textColor={theme.colors.error}>
                                            Sign Out
                                        </Button>
                                    )}
                                />
                                <Divider />
                                <List.Item
                                    title="Sync Now"
                                    description={
                                        isSyncing
                                            ? 'Syncing...'
                                            : lastSyncTime
                                                ? `Last synced: ${new Date(lastSyncTime).toLocaleString('en-IN')}`
                                                : 'Upload your data to Google Drive'
                                    }
                                    left={(props) => <List.Icon {...props} icon="cloud-upload" />}
                                    onPress={async () => {
                                        const ok = await syncNow();
                                        setSnackMsg(ok ? 'Synced to Drive ✓' : lastError || 'Sync failed');
                                        setSnackVisible(true);
                                    }}
                                    disabled={isSyncing}
                                />
                                <Divider />
                                <List.Item
                                    title="Restore from Backup"
                                    description="Download and restore from Google Drive"
                                    left={(props) => <List.Icon {...props} icon="cloud-download" />}
                                    onPress={() => {
                                        Alert.alert(
                                            'Restore Backup',
                                            'This will replace all local data with the backup from Google Drive. Are you sure?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Restore',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        const ok = await restoreFromDrive();
                                                        setSnackMsg(ok ? 'Data restored ✓ Restart app to see changes' : lastError || 'Restore failed');
                                                        setSnackVisible(true);
                                                    },
                                                },
                                            ]
                                        );
                                    }}
                                    disabled={isSyncing}
                                />
                            </>
                        ) : (
                            <List.Item
                                title="Sign in with Google"
                                description="Sync your data to Google Drive"
                                left={(props) => <List.Icon {...props} icon="google" />}
                                onPress={async () => {
                                    const ok = await signIn();
                                    if (ok) {
                                        setSnackMsg('Signed in ✓');
                                    } else {
                                        setSnackMsg(lastError || 'Sign-in failed');
                                    }
                                    setSnackVisible(true);
                                }}
                            />
                        )}
                        <Divider />
                        <List.Item
                            title="Export Data"
                            description={isExporting ? 'Exporting...' : 'Export as CSV or JSON'}
                            left={(props) => <List.Icon {...props} icon="export" />}
                            onPress={() => setExportDialog(true)}
                            disabled={isExporting}
                        />
                    </Surface>
                </View>

                {/* App Info */}
                <View style={[styles.section, { marginBottom: spacing.xxl }]}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        About
                    </Text>
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <List.Item
                            title="SpendWise"
                            description="Version 1.0.0"
                            left={(props) => <List.Icon {...props} icon="information" />}
                        />
                    </Surface>
                </View>
            </ScrollView>

            {/* Budget Dialog */}
            <Portal>
                <Dialog visible={budgetDialog} onDismiss={() => setBudgetDialog(false)}>
                    <Dialog.Title>Set Budget</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {getExpenseCategories().map((cat) => (
                                    <Button
                                        key={cat.id}
                                        mode={budgetCategory === cat.id ? 'contained' : 'outlined'}
                                        onPress={() => setBudgetCategory(cat.id as CategoryId)}
                                        compact
                                        buttonColor={budgetCategory === cat.id ? cat.color : undefined}
                                        textColor={budgetCategory === cat.id ? '#FFF' : undefined}
                                    >
                                        {cat.label}
                                    </Button>
                                ))}
                            </View>
                        </ScrollView>
                        <TextInput
                            label="Monthly Budget (₹)"
                            value={budgetAmount}
                            onChangeText={setBudgetAmount}
                            keyboardType="decimal-pad"
                            mode="outlined"
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setBudgetDialog(false)}>Cancel</Button>
                        <Button onPress={handleAddBudget}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Category Dialog */}
            <Portal>
                <Dialog visible={categoryDialog} onDismiss={() => setCategoryDialog(false)}>
                    <Dialog.Title>Add Category</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Category Name"
                            value={catLabel}
                            onChangeText={setCatLabel}
                            mode="outlined"
                            style={{ marginBottom: 16 }}
                        />
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Type</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <Button
                                mode={!catIsIncome ? 'contained' : 'outlined'}
                                onPress={() => setCatIsIncome(false)}
                                compact
                            >
                                Expense
                            </Button>
                            <Button
                                mode={catIsIncome ? 'contained' : 'outlined'}
                                onPress={() => setCatIsIncome(true)}
                                compact
                            >
                                Income
                            </Button>
                        </View>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Icon</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {ICON_OPTIONS.map((icon) => (
                                    <Button
                                        key={icon}
                                        mode={catIcon === icon ? 'contained' : 'outlined'}
                                        onPress={() => setCatIcon(icon)}
                                        compact
                                    >
                                        <MaterialCommunityIcons name={icon as any} size={18} />
                                    </Button>
                                ))}
                            </View>
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setCategoryDialog(false)}>Cancel</Button>
                        <Button onPress={handleAddCategory} disabled={!catLabel.trim()}>Add</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Export Format Dialog */}
            <Portal>
                <Dialog visible={exportDialog} onDismiss={() => setExportDialog(false)}>
                    <Dialog.Title>Export Data</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                            Choose export format:
                        </Text>
                        <View style={{ gap: 8 }}>
                            <Button
                                mode="outlined"
                                icon="file-delimited"
                                onPress={async () => {
                                    setExportDialog(false);
                                    setIsExporting(true);
                                    try {
                                        await exportAsCSV();
                                        setSnackMsg('CSV exported ✓');
                                    } catch (e) {
                                        setSnackMsg('Export failed');
                                    } finally {
                                        setIsExporting(false);
                                        setSnackVisible(true);
                                    }
                                }}
                                contentStyle={{ justifyContent: 'flex-start', paddingVertical: 4 }}
                                style={{ borderRadius: borderRadius.md }}
                            >
                                CSV — Spreadsheet-friendly
                            </Button>
                            <Button
                                mode="outlined"
                                icon="code-json"
                                onPress={async () => {
                                    setExportDialog(false);
                                    setIsExporting(true);
                                    try {
                                        await exportAsJSON();
                                        setSnackMsg('JSON exported ✓');
                                    } catch (e) {
                                        setSnackMsg('Export failed');
                                    } finally {
                                        setIsExporting(false);
                                        setSnackVisible(true);
                                    }
                                }}
                                contentStyle={{ justifyContent: 'flex-start', paddingVertical: 4 }}
                                style={{ borderRadius: borderRadius.md }}
                            >
                                JSON — Full backup
                            </Button>
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setExportDialog(false)}>Cancel</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Snackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                duration={2000}
                style={{ marginBottom: 80 }}
            >
                {snackMsg}
            </Snackbar>
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
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontWeight: '700',
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontSize: 12,
    },
    card: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
});
