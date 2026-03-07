import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, IconButton, Divider, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { usePreferencesStore } from '@/stores/preferencesStore';
import { spacing, borderRadius, customColors } from '@/constants/theme';
import type { Category } from '@/types';
import { DEFAULT_CATEGORIES } from '@/constants/categories';

const AVAILABLE_ICONS = [
    'food', 'train', 'home', 'shopping', 'medical-bag', 'movie', 'school',
    'receipt', 'gift', 'briefcase', 'cash', 'account-cash', 'chart-line', 'piggy-bank',
    'gamepad-variant', 'dog', 'airplane', 'car', 'bike', 'coffee', 'glass-wine',
    'tshirt-crew', 'book', 'monitor', 'flower', 'dumbbell', 'beach', 'music', 'palette'
];

const AVAILABLE_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
    '#F1C40F', '#E74C3C', '#1ABC9C', '#34495E', '#7F8C8D',
    '#FF9FF3', '#FECA57', '#FF6B6B', '#48DBFB', '#1DD1A1'
];

export default function CategoriesManageScreen() {
    const theme = useTheme();
    const router = useRouter();
    const {
        preferences,
        addCustomCategory,
        removeCustomCategory,
        toggleDisableCategory,
        getVisibleCategories
    } = usePreferencesStore();

    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [isAdding, setIsAdding] = useState(false);

    // New category state
    const [newLabel, setNewLabel] = useState('');
    const [newIcon, setNewIcon] = useState(AVAILABLE_ICONS[0]);
    const [newColor, setNewColor] = useState(AVAILABLE_COLORS[0]);

    const visibleCategories = getVisibleCategories(activeTab);
    const disabledIds = preferences.disabledCategories || [];
    const allCustoms = preferences.customCategories || [];

    // Combine defaults and customs for the active tab (including disabled ones)
    const allTabDefaults = DEFAULT_CATEGORIES.filter(c => activeTab === 'expense' ? !c.isIncome : c.isIncome);
    const allTabCustoms = allCustoms.filter(c => activeTab === 'expense' ? !c.isIncome : c.isIncome);
    const allTabCategories = [...allTabDefaults, ...allTabCustoms];

    const handleSaveNew = () => {
        if (!newLabel.trim()) return;
        addCustomCategory({
            id: newLabel.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            label: newLabel.trim(),
            icon: newIcon,
            color: newColor,
            isCustom: true,
            isIncome: activeTab === 'income',
            subcategories: []
        });
        setNewLabel('');
        setIsAdding(false);
    };

    const renderCategory = ({ item }: { item: Category }) => {
        const isDisabled = disabledIds.includes(item.id);

        return (
            <Surface style={[styles.categoryRow, { backgroundColor: theme.colors.surface }]} elevation={0}>
                <View style={[styles.catIconCircle, { backgroundColor: (item.color || theme.colors.primary) + '20', opacity: isDisabled ? 0.5 : 1 }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color || theme.colors.primary} />
                </View>
                <Text
                    variant="bodyLarge"
                    style={{ flex: 1, marginLeft: 16, fontWeight: '600', color: theme.colors.onSurface, opacity: isDisabled ? 0.5 : 1 }}
                >
                    {item.label}
                    {item.isCustom && <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}> (Custom)</Text>}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Button
                        mode="text"
                        onPress={() => toggleDisableCategory(item.id)}
                        textColor={isDisabled ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        compact
                    >
                        {isDisabled ? 'Enable' : 'Disable'}
                    </Button>

                    {item.isCustom && (
                        <IconButton
                            icon="delete-outline"
                            iconColor={theme.colors.error}
                            size={20}
                            onPress={() => removeCustomCategory(item.id)}
                            style={{ margin: 0 }}
                        />
                    )}
                </View>
            </Surface>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="close" size={24} onPress={() => router.back()} style={{ marginLeft: -8 }} />
                <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.onBackground }}>
                    Manage Categories
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as any)}
                    buttons={[
                        { value: 'expense', label: 'Expenses' },
                        { value: 'income', label: 'Income' },
                    ]}
                    style={{ borderRadius: borderRadius.md }}
                />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <FlatList
                    data={allTabCategories}
                    keyExtractor={item => item.id}
                    renderItem={renderCategory}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <Divider style={{ opacity: 0.5 }} />}
                />

                {/* Add New Section (Bottom) */}
                <Surface style={[styles.addSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={4}>
                    {!isAdding ? (
                        <Button
                            mode="contained-tonal"
                            icon="plus"
                            onPress={() => setIsAdding(true)}
                            style={{ borderRadius: borderRadius.full }}
                        >
                            Add Custom Category
                        </Button>
                    ) : (
                        <View style={{ gap: spacing.md }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>New Category</Text>
                                <IconButton icon="close" size={20} onPress={() => setIsAdding(false)} style={{ margin: 0 }} />
                            </View>

                            <TextInput
                                label="Category Name"
                                value={newLabel}
                                onChangeText={setNewLabel}
                                mode="outlined"
                                dense
                            />

                            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>Icon</Text>
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={AVAILABLE_ICONS}
                                keyExtractor={i => i}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => setNewIcon(item)}
                                        style={[
                                            styles.pickerItem,
                                            newIcon === item && { backgroundColor: theme.colors.primaryContainer }
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={item as any}
                                            size={24}
                                            color={newIcon === item ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                        />
                                    </Pressable>
                                )}
                            />

                            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>Color</Text>
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={AVAILABLE_COLORS}
                                keyExtractor={i => i}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => setNewColor(item)}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: item },
                                            newColor === item && { borderWidth: 3, borderColor: theme.colors.onBackground }
                                        ]}
                                    />
                                )}
                            />

                            <Button
                                mode="contained"
                                onPress={handleSaveNew}
                                disabled={!newLabel.trim()}
                                style={{ borderRadius: borderRadius.full, marginTop: spacing.sm }}
                            >
                                Save Category
                            </Button>
                        </View>
                    )}
                </Surface>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 20,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    catIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addSection: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    pickerItem: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    colorCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: spacing.sm,
    }
});
