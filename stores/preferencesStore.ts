import { create } from 'zustand';
import type { UserPreferences, PaymentMethod, PaymentApp, CategoryId, Category } from '@/types';
import * as storage from '@/services/storage';
import { DEFAULT_CATEGORIES } from '@/constants/categories';

const defaultPreferences: UserPreferences = {
    currency: 'INR',
    currencySymbol: '₹',
    theme: 'system',
    firstDayOfWeek: 1,
    defaultPaymentMethod: 'upi',
    defaultPaymentApp: 'gpay',
    categoryPaymentApps: {},
    smsAutoDetect: false,
    notificationsEnabled: true,
    captureLocation: false,
    autoSync: false,
    biometricLock: false,
    onboardingCompleted: false,
    customCategories: [],
    hiddenCategories: [],
    disabledCategories: [],
    aiProvider: 'gemini',
    geminiApiKey: '',
    chatgptApiKey: '',
    categoryOrder: DEFAULT_CATEGORIES.map((c) => c.id) as CategoryId[],
};

interface PreferencesState {
    preferences: UserPreferences;
    isLoaded: boolean;

    loadPreferences: () => Promise<void>;
    updatePreference: <K extends keyof UserPreferences>(
        key: K,
        value: UserPreferences[K]
    ) => Promise<void>;
    setCategoryPaymentApp: (category: CategoryId, app: PaymentApp) => Promise<void>;
    addCustomCategory: (category: Category) => Promise<void>;
    removeCustomCategory: (id: string) => Promise<void>;
    toggleCategory: (id: string) => Promise<void>;
    toggleDisableCategory: (id: string) => Promise<void>;
    completeOnboarding: () => Promise<void>;
    getAllCategories: () => Category[];
    getVisibleCategories: (type?: 'expense' | 'income') => Category[];
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
    preferences: defaultPreferences,
    isLoaded: false,

    loadPreferences: async () => {
        try {
            const saved = await storage.loadPreferences();
            if (saved) {
                set({
                    preferences: { ...defaultPreferences, ...saved },
                    isLoaded: true,
                });
            } else {
                // First launch — save defaults
                await storage.savePreferences(defaultPreferences);
                set({ isLoaded: true });
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
            set({ isLoaded: true });
        }
    },

    updatePreference: async (key, value) => {
        const prefs = { ...get().preferences, [key]: value };
        set({ preferences: prefs });
        await storage.savePreferences(prefs);
    },

    setCategoryPaymentApp: async (category, app) => {
        const prefs = {
            ...get().preferences,
            categoryPaymentApps: {
                ...get().preferences.categoryPaymentApps,
                [category]: app,
            },
        };
        set({ preferences: prefs });
        await storage.savePreferences(prefs);
    },

    addCustomCategory: async (category) => {
        const prefs = {
            ...get().preferences,
            customCategories: [...get().preferences.customCategories, category],
        };
        set({ preferences: prefs });
        await storage.savePreferences(prefs);
    },

    removeCustomCategory: async (id) => {
        const prefs = {
            ...get().preferences,
            customCategories: get().preferences.customCategories.filter((c) => c.id !== id),
        };
        set({ preferences: prefs });
        await storage.savePreferences(prefs);
    },

    completeOnboarding: async () => {
        const prefs = { ...get().preferences, onboardingCompleted: true };
        set({ preferences: prefs });
        await storage.savePreferences(prefs);
    },

    getAllCategories: () => {
        const { preferences } = get();
        return [...DEFAULT_CATEGORIES, ...preferences.customCategories];
    },

    toggleCategory: async (id: string) => {
        const hidden = get().preferences.hiddenCategories;
        const newHidden = hidden.includes(id)
            ? hidden.filter((h) => h !== id)
            : [...hidden, id];
        const prefs = { ...get().preferences, hiddenCategories: newHidden };
        set({ preferences: prefs });
        await storage.savePreferences(prefs);
    },

    toggleDisableCategory: async (id: string) => {
        const disabled = get().preferences.disabledCategories;
        const newDisabled = disabled.includes(id)
            ? disabled.filter((d) => d !== id)
            : [...disabled, id];
        const prefs = { ...get().preferences, disabledCategories: newDisabled };
        set({ preferences: prefs });
        await storage.savePreferences(prefs);
    },

    getVisibleCategories: (type) => {
        const { preferences } = get();
        const all = [...DEFAULT_CATEGORIES, ...preferences.customCategories];
        const visible = all.filter((c) => !preferences.hiddenCategories.includes(c.id) && !preferences.disabledCategories.includes(c.id));
        if (type === 'expense') return visible.filter((c) => !c.isIncome);
        if (type === 'income') return visible.filter((c) => c.isIncome);
        return visible;
    },
}));
