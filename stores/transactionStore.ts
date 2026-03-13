import { create } from 'zustand';
import type { Transaction, MonthlyData, CategoryId } from '@/types';
import * as storage from '@/services/storage';
import { getCurrentMonthKey } from '@/utils/formatters';
import { generateId } from '@/utils/id';

interface TransactionState {
    // Current month data
    currentMonth: MonthlyData | null;
    currentMonthKey: string;
    isLoading: boolean;

    // Actions
    loadMonth: (monthKey?: string) => Promise<void>;
    addTransaction: (data: Omit<Transaction, 'id'>) => Promise<Transaction>;
    batchAddTransactions: (dataList: Omit<Transaction, 'id'>[]) => Promise<Transaction[]>;
    updateTransaction: (transaction: Transaction) => Promise<void>;
    deleteTransaction: (id: string, datetime: string) => Promise<void>;
    getTransactionsByCategory: (category: CategoryId) => Transaction[];
    getTodayTotal: () => number;
    getWeekTotal: () => number;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
    currentMonth: null,
    currentMonthKey: getCurrentMonthKey(),
    isLoading: false,

    loadMonth: async (monthKey?: string) => {
        const key = monthKey || getCurrentMonthKey();
        set({ isLoading: true, currentMonthKey: key });
        try {
            const data = await storage.loadMonthlyData(key);
            set({ currentMonth: data, isLoading: false });
        } catch (error) {
            console.error('Failed to load month:', error);
            set({ isLoading: false });
        }
    },

    addTransaction: async (data) => {
        const transaction: Transaction = {
            ...data,
            id: generateId(),
        };
        await storage.addTransaction(transaction);
        // Reload current month data
        const state = get();
        const txMonthKey = storage.getMonthKey(new Date(transaction.datetime));
        if (txMonthKey === state.currentMonthKey) {
            await state.loadMonth(state.currentMonthKey);
        }
        return transaction;
    },

    batchAddTransactions: async (dataList) => {
        const transactions: Transaction[] = dataList.map((data) => ({
            ...data,
            id: generateId(),
        }));
        await storage.batchAddTransactions(transactions);

        const state = get();
        const currentKey = state.currentMonthKey;
        if (transactions.some(tx => storage.getMonthKey(new Date(tx.datetime)) === currentKey)) {
            await state.loadMonth(currentKey);
        }
        return transactions;
    },

    updateTransaction: async (transaction) => {
        await storage.updateTransaction(transaction);
        const state = get();
        await state.loadMonth(state.currentMonthKey);
    },

    deleteTransaction: async (id, datetime) => {
        await storage.deleteTransaction(id, datetime);
        const state = get();
        await state.loadMonth(state.currentMonthKey);
    },

    getTransactionsByCategory: (category) => {
        const { currentMonth } = get();
        if (!currentMonth) return [];
        return currentMonth.transactions.filter((t) => t.category === category);
    },

    getTodayTotal: () => {
        const { currentMonth } = get();
        if (!currentMonth) return 0;
        const today = new Date().toDateString();
        return currentMonth.transactions
            .filter((t) => t.type === 'debit' && new Date(t.datetime).toDateString() === today)
            .reduce((sum, t) => sum + t.amount, 0);
    },

    getWeekTotal: () => {
        const { currentMonth } = get();
        if (!currentMonth) return 0;
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return currentMonth.transactions
            .filter((t) => t.type === 'debit' && new Date(t.datetime) >= weekStart)
            .reduce((sum, t) => sum + t.amount, 0);
    },
}));
