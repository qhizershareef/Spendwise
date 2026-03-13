import { documentDirectory, getInfoAsync, makeDirectoryAsync, readAsStringAsync, writeAsStringAsync, readDirectoryAsync } from 'expo-file-system/legacy';
import type { Transaction, MonthlyData, UserPreferences, Budget, SavingsGoal } from '@/types';

const DATA_DIR = `${documentDirectory}scansense360-data/`;

async function ensureDataDirAsync(): Promise<void> {
    const info = await getInfoAsync(DATA_DIR);
    if (!info.exists) {
        await makeDirectoryAsync(DATA_DIR, { intermediates: true });
    }
}

function getMonthKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function getMonthFile(monthKey: string): string {
    return `${DATA_DIR}${monthKey}.json`;
}

// ─── Monthly Transaction Data ────────────────────────────────

export async function loadMonthlyData(monthKey: string): Promise<MonthlyData> {
    await ensureDataDirAsync();
    const file = getMonthFile(monthKey);
    const info = await getInfoAsync(file);
    if (!info.exists) {
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
    const raw = await readAsStringAsync(file);
    return JSON.parse(raw) as MonthlyData;
}

export async function saveMonthlyData(data: MonthlyData): Promise<void> {
    await ensureDataDirAsync();
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

    await writeAsStringAsync(file, JSON.stringify(data, null, 2));
}

export async function addTransaction(transaction: Transaction): Promise<void> {
    const monthKey = getMonthKey(new Date(transaction.datetime));
    const data = await loadMonthlyData(monthKey);
    data.transactions.push(transaction);
    await saveMonthlyData(data);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
    const monthKey = getMonthKey(new Date(transaction.datetime));
    const data = await loadMonthlyData(monthKey);
    const idx = data.transactions.findIndex((t) => t.id === transaction.id);
    if (idx !== -1) {
        data.transactions[idx] = transaction;
        await saveMonthlyData(data);
    }
}

export async function deleteTransaction(id: string, datetime: string): Promise<void> {
    const monthKey = getMonthKey(new Date(datetime));
    const data = await loadMonthlyData(monthKey);
    data.transactions = data.transactions.filter((t) => t.id !== id);
    await saveMonthlyData(data);
}

export async function batchAddTransactions(transactions: Transaction[]): Promise<void> {
    await ensureDataDirAsync();
    const byMonth: Record<string, Transaction[]> = {};
    for (const t of transactions) {
        const mk = getMonthKey(new Date(t.datetime));
        if (!byMonth[mk]) byMonth[mk] = [];
        byMonth[mk].push(t);
    }

    for (const [mk, txs] of Object.entries(byMonth)) {
        const data = await loadMonthlyData(mk);
        data.transactions.push(...txs);

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

        const file = getMonthFile(data.month);
        await writeAsStringAsync(file, JSON.stringify(data, null, 2));
    }
}

// ─── Preferences ─────────────────────────────────────────────

function getPrefsFile(): string {
    return `${DATA_DIR}preferences.json`;
}

export async function loadPreferences(): Promise<UserPreferences | null> {
    await ensureDataDirAsync();
    const file = getPrefsFile();
    const info = await getInfoAsync(file);
    if (!info.exists) return null;
    const raw = await readAsStringAsync(file);
    return JSON.parse(raw) as UserPreferences;
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
    await ensureDataDirAsync();
    const file = getPrefsFile();
    await writeAsStringAsync(file, JSON.stringify(prefs, null, 2));
}

// ─── Budgets ─────────────────────────────────────────────────

function getBudgetsFile(): string {
    return `${DATA_DIR}budgets.json`;
}

export async function loadBudgets(): Promise<Budget[]> {
    await ensureDataDirAsync();
    const file = getBudgetsFile();
    const info = await getInfoAsync(file);
    if (!info.exists) return [];
    const raw = await readAsStringAsync(file);
    return JSON.parse(raw) as Budget[];
}

export async function saveBudgets(budgets: Budget[]): Promise<void> {
    await ensureDataDirAsync();
    const file = getBudgetsFile();
    await writeAsStringAsync(file, JSON.stringify(budgets, null, 2));
}

// ─── Goals ───────────────────────────────────────────────────

function getGoalsFile(): string {
    return `${DATA_DIR}goals.json`;
}

export async function loadGoals(): Promise<SavingsGoal[]> {
    await ensureDataDirAsync();
    const file = getGoalsFile();
    const info = await getInfoAsync(file);
    if (!info.exists) return [];
    const raw = await readAsStringAsync(file);
    return JSON.parse(raw) as SavingsGoal[];
}

export async function saveGoals(goals: SavingsGoal[]): Promise<void> {
    await ensureDataDirAsync();
    const file = getGoalsFile();
    await writeAsStringAsync(file, JSON.stringify(goals, null, 2));
}

// ─── List all monthly data files ─────────────────────────────

export async function listAvailableMonths(): Promise<string[]> {
    await ensureDataDirAsync();
    const info = await getInfoAsync(DATA_DIR);
    if (!info.exists) return [];
    const items = await readDirectoryAsync(DATA_DIR);
    return items
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
    const monthKeys = await listAvailableMonths();
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
    await ensureDataDirAsync();

    if (data.months) {
        for (const month of data.months) {
            await saveMonthlyData(month);
        }
    }
    if (data.preferences) {
        await savePreferences(data.preferences);
    }
    if (data.budgets) {
        await saveBudgets(data.budgets);
    }
    if (data.goals) {
        await saveGoals(data.goals);
    }
}

export { DATA_DIR, getMonthKey, ensureDataDirAsync as ensureDataDir };
