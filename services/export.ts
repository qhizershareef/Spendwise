import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportAllData } from './storage';
import { getCategoryById } from '@/constants/categories';

/**
 * Export service — CSV and JSON data export with share sheet
 */

// ─── CSV Export ──────────────────────────────────────────

function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export async function exportAsCSV(): Promise<void> {
    const data = await exportAllData();
    const allTransactions = data.months.flatMap((m) => m.transactions);

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    const headers = ['Date', 'Time', 'Type', 'Amount', 'Category', 'Payee', 'Payment Method', 'Payment App', 'Note'];
    const rows = allTransactions.map((t) => {
        const dt = new Date(t.datetime);
        const cat = getCategoryById(t.category);
        return [
            dt.toLocaleDateString('en-IN'),
            dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            t.type === 'credit' ? 'Income' : 'Expense',
            t.amount.toFixed(2),
            cat?.label || t.category,
            t.payee || '',
            t.method || '',
            t.paymentApp || '',
            t.note || '',
        ].map(escapeCSV).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    const fileName = `SpendWise_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    const file = new File(Paths.cache, fileName);
    if (file.exists) {
        file.delete();
    }
    file.create();
    file.write(csv);

    await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export SpendWise Data',
        UTI: 'public.comma-separated-values-text',
    });
}

// ─── JSON Export ─────────────────────────────────────────

export async function exportAsJSON(): Promise<void> {
    const data = await exportAllData();

    const json = JSON.stringify({
        appName: 'SpendWise',
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        ...data,
    }, null, 2);

    const fileName = `SpendWise_Export_${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File(Paths.cache, fileName);
    if (file.exists) {
        file.delete();
    }
    file.create();
    file.write(json);

    await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export SpendWise Data',
        UTI: 'public.json',
    });
}
