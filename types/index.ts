export type PaymentMethod = 'upi' | 'cash' | 'credit' | 'debit' | 'netbanking' | 'wallet';

export type TransactionType = 'debit' | 'credit';

export type TransactionSource = 'manual' | 'sms' | 'qr_scan';

export type PaymentApp = 'gpay' | 'phonepe' | 'paytm' | 'cred' | 'bhim' | 'other';

export type CategoryId =
    | 'food'
    | 'transport'
    | 'housing'
    | 'shopping'
    | 'health'
    | 'entertainment'
    | 'education'
    | 'bills'
    | 'gifts'
    | 'business'
    | 'salary'
    | 'freelance'
    | 'investment'
    | 'refund'
    | 'others';

export interface Location {
    lat: number;
    lng: number;
    name?: string;
}

export interface Transaction {
    id: string;
    amount: number;
    type: TransactionType;
    category: CategoryId;
    subcategory?: string;
    payee?: string;
    payeeUPI?: string;
    method: PaymentMethod;
    paymentApp?: PaymentApp;
    note?: string;
    location?: Location;
    datetime: string; // ISO 8601
    source: TransactionSource;
    smsBody?: string;
    tags?: string[];
    attachmentUri?: string;
    isRecurring?: boolean;
    recurringId?: string;
}

export interface MonthlyData {
    month: string; // YYYY-MM
    transactions: Transaction[];
    metadata: {
        totalIncome: number;
        totalExpense: number;
        transactionCount: number;
        lastUpdated: string;
    };
}

export interface Budget {
    id: string;
    category: CategoryId;
    amount: number;
    period: 'monthly' | 'weekly';
    isActive: boolean;
}

export interface SavingsGoal {
    id: string;
    title: string;
    targetAmount: number;
    savedAmount: number;
    deadline?: string;
    isActive: boolean;
    createdAt: string;
}

export interface UserPreferences {
    currency: string;
    currencySymbol: string;
    theme: 'light' | 'dark' | 'system';
    firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
    defaultPaymentMethod: PaymentMethod;
    defaultPaymentApp: PaymentApp;
    categoryPaymentApps: Partial<Record<CategoryId, PaymentApp>>;
    smsAutoDetect: boolean;
    notificationsEnabled: boolean;
    captureLocation: boolean;
    dailySyncTime?: string; // HH:mm
    autoSync: boolean;
    biometricLock: boolean;
    onboardingCompleted: boolean;
    customCategories: Category[];
    hiddenCategories: string[];
    disabledCategories: string[];
    aiProvider: 'gemini' | 'chatgpt';
    geminiApiKey: string;
    chatgptApiKey: string;
    categoryOrder: CategoryId[];
}

export interface Category {
    id: CategoryId | string;
    label: string;
    icon: string;
    color: string;
    subcategories: string[];
    isCustom: boolean;
    isIncome?: boolean;
}

export interface AIInsight {
    id: string;
    type: 'tip' | 'alert' | 'summary' | 'goal_update';
    title: string;
    message: string;
    datetime: string;
    isRead: boolean;
    category?: CategoryId;
    actionLabel?: string;
    actionRoute?: string;
}

export interface SyncStatus {
    lastSyncTime?: string;
    isSyncing: boolean;
    lastError?: string;
    syncedMonths: string[];
}
