/**
 * SMS Auto-Detect Service
 * Listens for incoming bank SMS and auto-creates transactions.
 * Android-only feature using @maniac-tech/react-native-expo-read-sms.
 */
import { Platform, Alert } from 'react-native';
import {
    checkIfHasSMSPermission,
    requestReadSMSPermission,
    startReadSMS,
} from '@maniac-tech/react-native-expo-read-sms';
import type { PaymentMethod, CategoryId, Category } from '@/types';

export interface ParsedSMS {
    amount: number;
    type: 'debit' | 'credit';
    payee?: string;
    method: PaymentMethod;
    balance?: number;
    accountLastDigits?: string;
    referenceId?: string;
    rawBody: string;
    sender: string;
}

// ─── Patterns ────────────────────────────────────────────

const DEBIT_PATTERNS = [
    /(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is |was )?(?:debited|deducted|withdrawn|spent|paid|transferred)/i,
    /(?:debited|deducted|withdrawn)\s*(?:by |of |for )?\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
    /(?:sent|paid|transferred)\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
    /(?:txn|transaction|purchase)\s*(?:of |for |:)?\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
];

const CREDIT_PATTERNS = [
    /(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is |was )?(?:credited|deposited|received|refunded)/i,
    /(?:credited|deposited|received|refunded)\s*(?:with |by |of )?\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
];

const BALANCE_PATTERN = /(?:bal(?:ance)?|avl\.?\s*bal)[\s:]*(?:rs\.?|inr\.?|₹)?\s*([\d,]+\.?\d*)/i;
const ACCOUNT_PATTERN = /(?:a\/c|acct?|account|card)\s*(?:no\.?\s*)?(?:ending\s*(?:in\s*)?|xx|x+|\*+)?\s*(\d{4})/i;
const UPI_PAYEE_PATTERN = /(?:to|from|at)\s+([A-Za-z0-9._-]+@[a-z]+)/i;
const MERCHANT_PATTERN = /(?:to|from|at|paid to|received from)\s+([A-Za-z\s]+?)(?:\s+(?:on|ref|via|using|through|UPI|NEFT|IMPS)|\.|\,|$)/i;
const REFERENCE_PATTERN = /(?:ref(?:erence)?\.?\s*(?:no\.?\s*)?|txn\s*(?:id|no\.?\s*)?|UPI\s*ref)\s*[:.]?\s*(\w+)/i;

// ─── Category Keyword Map ────────────────────────────────
// Maps keywords in payee/SMS body to category IDs
// This is the master map — only categories that exist in user's preferences will be matched

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    food: ['swiggy', 'zomato', 'dominos', 'pizza', 'mcd', 'restaurant', 'cafe', 'food', 'kitchen', 'biryani', 'burger', 'kfc', 'subway', 'starbucks', 'dunkin'],
    transport: ['uber', 'ola', 'rapido', 'metro', 'railway', 'irctc', 'petrol', 'fuel', 'bp', 'hp', 'iocl', 'parking', 'toll', 'cab', 'auto'],
    shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'shop', 'store', 'mart', 'market', 'mall'],
    bills: ['airtel', 'jio', 'vodafone', 'vi', 'bsnl', 'electricity', 'water', 'gas', 'broadband', 'dth', 'recharge', 'bill'],
    entertainment: ['netflix', 'prime', 'disney', 'hotstar', 'spotify', 'youtube', 'music', 'movie', 'pvr', 'inox', 'bookmyshow'],
    health: ['hospital', 'clinic', 'pharmacy', 'medic', 'apollo', '1mg', 'practo', 'gym', 'fitness', 'doctor'],
    education: ['university', 'college', 'school', 'course', 'udemy', 'coursera', 'book', 'tuition'],
    housing: ['rent', 'landlord', 'maintenance', 'society', 'furniture', 'ikea', 'pepperfry'],
    others: [],
    salary: ['salary', 'employer', 'payroll', 'stipend'],
    freelance: ['freelance', 'consulting', 'project', 'client', 'fiverr', 'upwork'],
    investment: ['dividend', 'interest', 'mutual fund', 'stock', 'zerodha', 'groww', 'kuvera', 'fd', 'returns'],
    gift: ['gift', 'cashback', 'reward', 'bonus', 'prize'],
};

// ─── Parser ──────────────────────────────────────────────

export function parseSMS(body: string, sender: string = ''): ParsedSMS | null {
    if (Platform.OS !== 'android') return null;

    const text = body.trim();

    // Try debit patterns
    for (const pattern of DEBIT_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const amount = parseAmount(match[1]);
            if (amount > 0) {
                return {
                    amount,
                    type: 'debit',
                    payee: extractPayee(text),
                    method: detectPaymentMethod(text),
                    balance: extractBalance(text),
                    accountLastDigits: extractAccount(text),
                    referenceId: extractReference(text),
                    rawBody: text,
                    sender,
                };
            }
        }
    }

    // Try credit patterns
    for (const pattern of CREDIT_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            const amount = parseAmount(match[1]);
            if (amount > 0) {
                return {
                    amount,
                    type: 'credit',
                    payee: extractPayee(text),
                    method: detectPaymentMethod(text),
                    balance: extractBalance(text),
                    accountLastDigits: extractAccount(text),
                    referenceId: extractReference(text),
                    rawBody: text,
                    sender,
                };
            }
        }
    }

    return null;
}

function parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/,/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
}

function extractPayee(text: string): string | undefined {
    const upiMatch = text.match(UPI_PAYEE_PATTERN);
    if (upiMatch) return upiMatch[1];

    const merchantMatch = text.match(MERCHANT_PATTERN);
    if (merchantMatch) {
        const name = merchantMatch[1].trim();
        if (name.length > 2 && name.length < 50) return name;
    }
    return undefined;
}

function extractBalance(text: string): number | undefined {
    const match = text.match(BALANCE_PATTERN);
    if (match) {
        const amount = parseAmount(match[1]);
        return amount > 0 ? amount : undefined;
    }
    return undefined;
}

function extractAccount(text: string): string | undefined {
    const match = text.match(ACCOUNT_PATTERN);
    return match ? match[1] : undefined;
}

function extractReference(text: string): string | undefined {
    const match = text.match(REFERENCE_PATTERN);
    return match ? match[1] : undefined;
}

function detectPaymentMethod(text: string): PaymentMethod {
    const lower = text.toLowerCase();
    if (lower.includes('upi') || lower.includes('@')) return 'upi';
    if (lower.includes('card') || lower.includes('pos')) return 'credit';
    if (lower.includes('neft') || lower.includes('imps') || lower.includes('rtgs')) return 'netbanking';
    if (lower.includes('wallet') || lower.includes('paytm')) return 'wallet';
    if (lower.includes('atm') || lower.includes('cash')) return 'cash';
    return 'upi';
}

// ─── Category Matching (preference-aware) ────────────────

/**
 * Auto-categorize a parsed SMS using ONLY categories from user's preferences.
 * If no match is found, falls back to 'others'.
 */
export function autoCategorizeSMS(
    payee: string | undefined,
    body: string,
    enabledCategories: Category[]
): CategoryId {
    if (!payee && !body) return 'others';

    const searchText = `${payee || ''} ${body}`.toLowerCase();
    const enabledIds = new Set(enabledCategories.map((c) => c.id));

    // Search through keyword map, only matching enabled categories
    for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (!enabledIds.has(categoryId)) continue;
        for (const keyword of keywords) {
            if (searchText.includes(keyword)) {
                return categoryId as CategoryId;
            }
        }
    }

    return 'others';
}

// ─── SMS Filter ──────────────────────────────────────────

export function isTransactionalSMS(body: string): boolean {
    const lower = body.toLowerCase();
    if (/otp|one.?time|verification|verify|password|code/i.test(lower)) return false;
    if (/offer|discount|cashback|coupon|win|congratulations|lucky/i.test(lower)) return false;
    if (lower.length < 30) return false;
    return /(?:rs\.?|inr\.?|₹)\s*[\d,]+/i.test(lower);
}

// ─── SMS Listener ────────────────────────────────────────

let isListening = false;

/**
 * Check if SMS permissions are granted
 */
export async function hasSMSPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
        const result = await checkIfHasSMSPermission();
        return result?.hasReceiveSmsPermission && result?.hasReadSmsPermission;
    } catch {
        return false;
    }
}

/**
 * Request SMS permissions
 */
export async function requestSMSPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
        return await requestReadSMSPermission();
    } catch {
        return false;
    }
}

/**
 * Start listening for incoming SMS messages.
 * Calls onTransaction for each detected bank transaction.
 */
export function startSMSListener(
    enabledCategories: Category[],
    onTransaction: (parsed: ParsedSMS, category: CategoryId) => void,
    onError?: (error: string) => void
): void {
    if (Platform.OS !== 'android' || isListening) return;

    isListening = true;

    startReadSMS(
        (status: string, smsData: string, error: any) => {
            if (error) {
                onError?.(String(error));
                return;
            }

            if (!smsData) return;

            // smsData format: "[sender, body]" or just the body
            let sender = '';
            let body = smsData;

            // Try to extract sender and body from format: [sender, body]
            const bracketMatch = smsData.match(/^\[(.+?),\s*(.+)\]$/s);
            if (bracketMatch) {
                sender = bracketMatch[1].trim();
                body = bracketMatch[2].trim();
            }

            // Filter non-transactional SMS
            if (!isTransactionalSMS(body)) return;

            // Parse the SMS
            const parsed = parseSMS(body, sender);
            if (!parsed) return;

            // Auto-categorize using enabled categories only
            const category = autoCategorizeSMS(parsed.payee, parsed.rawBody, enabledCategories);

            // Callback
            onTransaction(parsed, category);
        },
        (error: any) => {
            console.error('SMS listener error:', error);
            isListening = false;
            onError?.(String(error));
        }
    );
}

export function isListenerActive(): boolean {
    return isListening;
}
