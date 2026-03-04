/**
 * SMS Parser Service
 * Parses incoming SMS messages to extract transaction information.
 * Android-only feature.
 */
import { Platform } from 'react-native';
import type { Transaction, PaymentMethod, CategoryId } from '@/types';

export interface ParsedSMS {
    amount: number;
    type: 'debit' | 'credit';
    payee?: string;
    method: PaymentMethod;
    balance?: number;
    accountLastDigits?: string;
    referenceId?: string;
    rawBody: string;
}

// Common bank SMS patterns
const DEBIT_PATTERNS = [
    // "Rs.500.00 debited from A/c XX1234"
    /(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is |was )?(?:debited|deducted|withdrawn|spent|paid|transferred)/i,
    // "A/c XX1234 debited by Rs.500.00"
    /(?:debited|deducted|withdrawn)\s*(?:by |of |for )?\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
    // "Sent Rs.500 to merchant"
    /(?:sent|paid|transferred)\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
    // "Transaction of Rs.500 on card"
    /(?:txn|transaction|purchase)\s*(?:of |for |:)?\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
];

const CREDIT_PATTERNS = [
    // "Rs.5000 credited to A/c XX1234"
    /(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is |was )?(?:credited|deposited|received|refunded)/i,
    // "A/c XX1234 credited with Rs.5000"
    /(?:credited|deposited|received|refunded)\s*(?:with |by |of )?\s*(?:rs\.?|inr\.?|₹)\s*([\d,]+\.?\d*)/i,
];

const BALANCE_PATTERN = /(?:bal(?:ance)?|avl\.?\s*bal)[\s:]*(?:rs\.?|inr\.?|₹)?\s*([\d,]+\.?\d*)/i;

const ACCOUNT_PATTERN = /(?:a\/c|acct?|account|card)\s*(?:no\.?\s*)?(?:ending\s*(?:in\s*)?|xx|x+|\*+)?\s*(\d{4})/i;

const UPI_PAYEE_PATTERN = /(?:to|from|at)\s+([A-Za-z0-9._-]+@[a-z]+)/i;
const MERCHANT_PATTERN = /(?:to|from|at|paid to|received from)\s+([A-Za-z\s]+?)(?:\s+(?:on|ref|via|using|through|UPI|NEFT|IMPS)|\.|,|$)/i;

const REFERENCE_PATTERN = /(?:ref(?:erence)?\.?\s*(?:no\.?\s*)?|txn\s*(?:id|no\.?\s*)?|UPI\s*ref)\s*[:.]?\s*(\w+)/i;

/**
 * Parse an SMS body to extract transaction data
 */
export function parseSMS(body: string): ParsedSMS | null {
    if (Platform.OS !== 'android') return null;

    const text = body.trim();

    // Try debit patterns first
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
    // Try UPI payee first
    const upiMatch = text.match(UPI_PAYEE_PATTERN);
    if (upiMatch) return upiMatch[1];

    // Try merchant name
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
    return 'upi'; // default for Indian banks
}

/**
 * Auto-categorize based on payee name (basic heuristic)
 */
export function autoCategorizeSMS(payee?: string): CategoryId {
    if (!payee) return 'others';
    const lower = payee.toLowerCase();

    // Food
    if (/swiggy|zomato|dominos|pizza|mcd|restaurant|cafe|food|kitchen|biryani|burger/i.test(lower)) return 'food';
    // Transport
    if (/uber|ola|rapido|metro|railway|irctc|petrol|fuel|bp|hp|iocl|parking/i.test(lower)) return 'transport';
    // Shopping
    if (/amazon|flipkart|myntra|ajio|meesho|nykaa|shop|store|mart|market/i.test(lower)) return 'shopping';
    // Bills
    if (/airtel|jio|vodafone|vi|bsnl|electricity|water|gas|broadband|dth|recharge/i.test(lower)) return 'bills';
    // Entertainment
    if (/netflix|prime|disney|hotstar|spotify|youtube|music|movie|pvr|inox|bookmyshow/i.test(lower)) return 'entertainment';
    // Health
    if (/hospital|clinic|pharmacy|medic|apollo|1mg|practo|gym|fitness/i.test(lower)) return 'health';
    // Education
    if (/university|college|school|course|udemy|coursera|book/i.test(lower)) return 'education';
    // Housing
    if (/rent|landlord|maintenance|society|electricity|gas/i.test(lower)) return 'housing';

    return 'others';
}

/**
 * Check if SMS is a promotional/OTP message (should be ignored)
 */
export function isTransactionalSMS(body: string): boolean {
    const lower = body.toLowerCase();
    // Filter out OTPs, promotions, etc.
    if (/otp|one.?time|verification|verify|password|code/i.test(lower)) return false;
    if (/offer|discount|cashback|coupon|win|congratulations|lucky/i.test(lower)) return false;
    if (lower.length < 30) return false;

    // Must mention a financial amount
    return /(?:rs\.?|inr\.?|₹)\s*[\d,]+/i.test(lower);
}
