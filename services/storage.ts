import type { Transaction, MonthlyData, UserPreferences, Budget, SavingsGoal } from '@/types';
import { File, Directory, Paths } from 'expo-file-system';

const DATA_DIR = new Directory(Paths.document, 'spendwise-data');

function ensureDataDir(): void {
    if (!DATA_DIR.exists) {
        DATA_DIR.create({ intermediates: true });
    }
}

function getMonthKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function getMonthFile(monthKey: string): File {
    return new File(DATA_DIR, `${monthKey}.json`);
}

// ─── Monthly Transaction Data ────────────────────────────────

export async function loadMonthlyData(monthKey: string): Promise<MonthlyData> {
    ensureDataDir();
    const file = getMonthFile(monthKey);
    if (!file.exists) {
        return {
            month: monthKey,
            transactions: [],
            metadata: {
                totalIncome: 0,
                totalExpense: 0,
                transactionCount: 0,
                lastUpdated: new Date().toISOString(),
            },
        };
    }
    const raw = await file.text();
    return JSON.parse(raw) as MonthlyData;
}

export function saveMonthlyData(data: MonthlyData): void {
    ensureDataDir();
    const file = getMonthFile(data.month);

    // Recalculate metadata
    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of data.transactions) {
        if (t.type === 'credit') totalIncome += t.amount;
        else totalExpense += t.amount;
    }
    data.metadata = {
        totalIncome,
        totalExpense,
        transactionCount: data.transactions.length,
        lastUpdated: new Date().toISOString(),
    };

    if (!file.exists) {
        file.create({ intermediates: true });
    }
    file.write(JSON.stringify(data, null, 2));
}

export async function addTransaction(transaction: Transaction): Promise<void> {
    const monthKey = getMonthKey(new Date(transaction.datetime));
    const data = await loadMonthlyData(monthKey);
    data.transactions.push(transaction);
    saveMonthlyData(data);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
    const monthKey = getMonthKey(new Date(transaction.datetime));
    const data = await loadMonthlyData(monthKey);
    const idx = data.transactions.findIndex((t) => t.id === transaction.id);
    if (idx !== -1) {
        data.transactions[idx] = transaction;
        saveMonthlyData(data);
    }
}

export async function deleteTransaction(id: string, datetime: string): Promise<void> {
    const monthKey = getMonthKey(new Date(datetime));
    const data = await loadMonthlyData(monthKey);
    data.transactions = data.transactions.filter((t) => t.id !== id);
    saveMonthlyData(data);
}

// ─── Preferences ─────────────────────────────────────────────

function getPrefsFile(): File {
    return new File(DATA_DIR, 'preferences.json');
}

export async function loadPreferences(): Promise<UserPreferences | null> {
    ensureDataDir();
    const file = getPrefsFile();
    if (!file.exists) return null;
    const raw = await file.text();
    return JSON.parse(raw) as UserPreferences;
}

export function savePreferences(prefs: UserPreferences): void {
    ensureDataDir();
    const file = getPrefsFile();
    if (!file.exists) {
        file.create({ intermediates: true });
    }
    file.write(JSON.stringify(prefs, null, 2));
}

// ─── Budgets ─────────────────────────────────────────────────

function getBudgetsFile(): File {
    return new File(DATA_DIR, 'budgets.json');
}

export async function loadBudgets(): Promise<Budget[]> {
    ensureDataDir();
    const file = getBudgetsFile();
    if (!file.exists) return [];
    const raw = await file.text();
    return JSON.parse(raw) as Budget[];
}

export function saveBudgets(budgets: Budget[]): void {
    ensureDataDir();
    const file = getBudgetsFile();
    if (!file.exists) {
        file.create({ intermediates: true });
    }
    file.write(JSON.stringify(budgets, null, 2));
}

// ─── Goals ───────────────────────────────────────────────────

function getGoalsFile(): File {
    return new File(DATA_DIR, 'goals.json');
}

export async function loadGoals(): Promise<SavingsGoal[]> {
    ensureDataDir();
    const file = getGoalsFile();
    if (!file.exists) return [];
    const raw = await file.text();
    return JSON.parse(raw) as SavingsGoal[];
}

export function saveGoals(goals: SavingsGoal[]): void {
    ensureDataDir();
    const file = getGoalsFile();
    if (!file.exists) {
        file.create({ intermediates: true });
    }
    file.write(JSON.stringify(goals, null, 2));
}

// ─── List all monthly data files ─────────────────────────────

export function listAvailableMonths(): string[] {
    ensureDataDir();
    const items = DATA_DIR.list();
    return items
        .filter((item): item is File => item instanceof File)
        .map((f) => {
            // Extract name from uri
            const parts = f.uri.split('/');
            return parts[parts.length - 1];
        })
        .filter((name) => /^\d{4}-\d{2}\.json$/.test(name))
        .map((name) => name.replace('.json', ''))
        .sort()
        .reverse();
}

// ─── Export all data (for sync) ──────────────────────────────

export async function exportAllData(): Promise<{
    months: MonthlyData[];
    preferences: UserPreferences | null;
    budgets: Budget[];
    goals: SavingsGoal[];
}> {
    const monthKeys = listAvailableMonths();
    const months = await Promise.all(monthKeys.map(loadMonthlyData));
    const preferences = await loadPreferences();
    const budgets = await loadBudgets();
    const goals = await loadGoals();
    return { months, preferences, budgets, goals };
}

// ─── Import all data (from sync / restore) ───────────────

export async function importAllData(data: {
    months?: MonthlyData[];
    preferences?: UserPreferences | null;
    budgets?: Budget[];
    goals?: SavingsGoal[];
}): Promise<void> {
    ensureDataDir();

    if (data.months) {
        for (const month of data.months) {
            saveMonthlyData(month);
        }
    }
    if (data.preferences) {
        savePreferences(data.preferences);
    }
    if (data.budgets) {
        saveBudgets(data.budgets);
    }
    if (data.goals) {
        saveGoals(data.goals);
    }
}

export { DATA_DIR, getMonthKey, ensureDataDir };
