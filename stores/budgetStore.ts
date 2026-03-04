import { create } from 'zustand';
import type { Budget, SavingsGoal, CategoryId } from '@/types';
import * as storage from '@/services/storage';
import { generateId } from '@/utils/id';

interface BudgetState {
    budgets: Budget[];
    goals: SavingsGoal[];
    isLoading: boolean;

    loadBudgets: () => Promise<void>;
    loadGoals: () => Promise<void>;
    addBudget: (category: CategoryId, amount: number, period?: 'monthly' | 'weekly') => Promise<void>;
    updateBudget: (id: string, amount: number) => Promise<void>;
    deleteBudget: (id: string) => Promise<void>;
    addGoal: (title: string, targetAmount: number, deadline?: string) => Promise<void>;
    updateGoalSaved: (id: string, savedAmount: number) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    getBudgetForCategory: (category: CategoryId) => Budget | undefined;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
    budgets: [],
    goals: [],
    isLoading: false,

    loadBudgets: async () => {
        set({ isLoading: true });
        try {
            const budgets = await storage.loadBudgets();
            set({ budgets, isLoading: false });
        } catch (error) {
            console.error('Failed to load budgets:', error);
            set({ isLoading: false });
        }
    },

    loadGoals: async () => {
        try {
            const goals = await storage.loadGoals();
            set({ goals });
        } catch (error) {
            console.error('Failed to load goals:', error);
        }
    },

    addBudget: async (category, amount, period = 'monthly') => {
        const budget: Budget = {
            id: generateId(),
            category,
            amount,
            period,
            isActive: true,
        };
        const budgets = [...get().budgets, budget];
        set({ budgets });
        await storage.saveBudgets(budgets);
    },

    updateBudget: async (id, amount) => {
        const budgets = get().budgets.map((b) =>
            b.id === id ? { ...b, amount } : b
        );
        set({ budgets });
        await storage.saveBudgets(budgets);
    },

    deleteBudget: async (id) => {
        const budgets = get().budgets.filter((b) => b.id !== id);
        set({ budgets });
        await storage.saveBudgets(budgets);
    },

    addGoal: async (title, targetAmount, deadline) => {
        const goal: SavingsGoal = {
            id: generateId(),
            title,
            targetAmount,
            savedAmount: 0,
            deadline,
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        const goals = [...get().goals, goal];
        set({ goals });
        await storage.saveGoals(goals);
    },

    updateGoalSaved: async (id, savedAmount) => {
        const goals = get().goals.map((g) =>
            g.id === id ? { ...g, savedAmount } : g
        );
        set({ goals });
        await storage.saveGoals(goals);
    },

    deleteGoal: async (id) => {
        const goals = get().goals.filter((g) => g.id !== id);
        set({ goals });
        await storage.saveGoals(goals);
    },

    getBudgetForCategory: (category) => {
        return get().budgets.find((b) => b.category === category && b.isActive);
    },
}));
