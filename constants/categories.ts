import type { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
    // Expense categories
    {
        id: 'food',
        label: 'Food & Dining',
        icon: 'food',
        color: '#E17055',
        subcategories: ['Groceries', 'Restaurant', 'Delivery', 'Snacks', 'Coffee'],
        isCustom: false,
    },
    {
        id: 'transport',
        label: 'Transport',
        icon: 'car',
        color: '#74B9FF',
        subcategories: ['Fuel', 'Public Transit', 'Cab', 'Parking', 'Toll'],
        isCustom: false,
    },
    {
        id: 'housing',
        label: 'Housing',
        icon: 'home',
        color: '#A29BFE',
        subcategories: ['Rent', 'Utilities', 'Maintenance', 'Internet', 'Furniture'],
        isCustom: false,
    },
    {
        id: 'shopping',
        label: 'Shopping',
        icon: 'shopping',
        color: '#FD79A8',
        subcategories: ['Clothing', 'Electronics', 'Home Goods', 'Accessories'],
        isCustom: false,
    },
    {
        id: 'health',
        label: 'Health',
        icon: 'heart-pulse',
        color: '#00B894',
        subcategories: ['Medicine', 'Doctor', 'Gym', 'Insurance', 'Wellness'],
        isCustom: false,
    },
    {
        id: 'entertainment',
        label: 'Entertainment',
        icon: 'gamepad-variant',
        color: '#FDCB6E',
        subcategories: ['Movies', 'Subscriptions', 'Games', 'Events', 'Hobbies'],
        isCustom: false,
    }, 
    {
        id: 'bills',
        label: 'Bills & Recharges',
        icon: 'file-document',
        color: '#00CEC9',
        subcategories: ['Phone', 'DTH', 'Electricity', 'Water', 'Gas'],
        isCustom: false,
    },
    // {
    //     id: 'gifts',
    //     label: 'Gifts & Donations',
    //     icon: 'gift',
    //     color: '#E84393',
    //     subcategories: ['Gifts', 'Charity', 'Tips'],
    //     isCustom: false,
    // },
    // {
    //     id: 'business',
    //     label: 'Business',
    //     icon: 'briefcase',
    //     color: '#636E72',
    //     subcategories: ['Office', 'Travel', 'Supplies', 'Services'],
    //     isCustom: false,
    // },
    {
        id: 'others',
        label: 'Others',
        icon: 'dots-horizontal-circle',
        color: '#B2BEC3',
        subcategories: ['Miscellaneous'],
        isCustom: false,
    },
    // Income categories
    {
        id: 'salary',
        label: 'Salary',
        icon: 'cash',
        color: '#00B894',
        subcategories: ['Monthly', 'Bonus', 'Overtime'],
        isCustom: false,
        isIncome: true,
    },
    {
        id: 'freelance',
        label: 'Freelance',
        icon: 'laptop',
        color: '#6C5CE7',
        subcategories: ['Project', 'Consulting', 'Commission'],
        isCustom: false,
        isIncome: true,
    },
    {
        id: 'investment',
        label: 'Investment',
        icon: 'trending-up',
        color: '#FDCB6E',
        subcategories: ['Dividends', 'Returns', 'Interest'],
        isCustom: false,
        isIncome: true,
    },
    {
        id: 'refund',
        label: 'Refund',
        icon: 'cash-refund',
        color: '#74B9FF',
        subcategories: ['Product Return', 'Cashback', 'Other'],
        isCustom: false,
        isIncome: true,
    },
];

export const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', icon: 'cellphone' },
    { id: 'cash', label: 'Cash', icon: 'cash' },
    { id: 'debit', label: 'Debit Card', icon: 'credit-card-outline' },
    { id: 'credit', label: 'Credit Card', icon: 'credit-card' },
    { id: 'netbanking', label: 'Net Banking', icon: 'bank' },
    { id: 'wallet', label: 'Wallet', icon: 'wallet' },
] as const;

export const PAYMENT_APPS = [
    { id: 'gpay', label: 'Google Pay', icon: 'google', color: '#4285F4' },
    { id: 'phonepe', label: 'PhonePe', icon: 'phone', color: '#5F259F' },
    { id: 'paytm', label: 'Paytm', icon: 'wallet', color: '#00B9F5' },
    { id: 'cred', label: 'CRED', icon: 'star-four-points', color: '#1A1A2E' },
    { id: 'bhim', label: 'BHIM', icon: 'bank', color: '#00796B' },
    { id: 'other', label: 'Other', icon: 'apps', color: '#636E72' },
] as const;

export function getCategoryById(id: string): Category | undefined {
    return DEFAULT_CATEGORIES.find((c) => c.id === id);
}

export function getExpenseCategories(): Category[] {
    return DEFAULT_CATEGORIES.filter((c) => !c.isIncome);
}

export function getIncomeCategories(): Category[] {
    return DEFAULT_CATEGORIES.filter((c) => c.isIncome);
}
