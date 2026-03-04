/**
 * UPI Payment Deep Link Service
 * Handles UPI QR code parsing and payment app redirection
 */
import { Linking, Platform } from 'react-native';
import type { PaymentApp } from '@/types';

export interface UPIData {
    pa?: string;   // payee address (VPA)
    pn?: string;   // payee name
    am?: string;   // amount
    cu?: string;   // currency
    tn?: string;   // transaction note
    mc?: string;   // merchant code
    tr?: string;   // transaction reference
    url?: string;  // merchant URL
    mode?: string; // mode
}

/**
 * Parse a UPI QR code string into structured data
 * Format: upi://pay?pa=xxx&pn=xxx&am=xxx&cu=INR&tn=xxx
 */
export function parseUPIQR(data: string): UPIData | null {
    try {
        // Normalize the URL
        let url = data.trim();
        if (!url.toLowerCase().startsWith('upi://')) {
            return null;
        }

        // Parse query parameters
        const queryString = url.split('?')[1];
        if (!queryString) return null;

        const params: UPIData = {};
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
                const decodedKey = decodeURIComponent(key).toLowerCase() as keyof UPIData;
                const decodedValue = decodeURIComponent(value);
                (params as any)[decodedKey] = decodedValue;
            }
        }

        return params;
    } catch (error) {
        console.error('Failed to parse UPI QR:', error);
        return null;
    }
}

/**
 * Build a UPI intent URL for a specific payment app
 */
export function buildUPIIntent(
    payeeVPA: string,
    amount: string,
    payeeName?: string,
    note?: string,
    app?: PaymentApp
): string {
    const params = new URLSearchParams();
    params.set('pa', payeeVPA);
    if (amount) params.set('am', amount);
    if (payeeName) params.set('pn', payeeName);
    params.set('cu', 'INR');
    if (note) params.set('tn', note);

    return `upi://pay?${params.toString()}`;
}

/**
 * Get the deep link scheme for a specific payment app
 */
function getAppScheme(app: PaymentApp): string {
    switch (app) {
        case 'gpay':
            return 'tez://upi/pay';
        case 'phonepe':
            return 'phonepe://pay';
        case 'paytm':
            return 'paytmmp://pay';
        case 'cred':
            return 'cred://upi/pay';
        case 'bhim':
            return 'upi://pay';
        default:
            return 'upi://pay';
    }
}

/**
 * Open the UPI payment intent in the selected payment app
 */
export async function openPaymentApp(
    payeeVPA: string,
    amount: string,
    payeeName?: string,
    note?: string,
    preferredApp?: PaymentApp
): Promise<boolean> {
    try {
        const params = new URLSearchParams();
        params.set('pa', payeeVPA);
        if (amount) params.set('am', amount);
        if (payeeName) params.set('pn', payeeName);
        params.set('cu', 'INR');
        if (note) params.set('tn', note);

        let url: string;

        if (preferredApp && preferredApp !== 'other') {
            // Try specific app first
            const appScheme = getAppScheme(preferredApp);
            url = `${appScheme}?${params.toString()}`;
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                return true;
            }
        }

        // Fallback to generic UPI intent (Android will show app chooser)
        url = `upi://pay?${params.toString()}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Failed to open payment app:', error);
        return false;
    }
}

/**
 * Check if a payment app is installed
 */
export async function isPaymentAppInstalled(app: PaymentApp): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
        const scheme = getAppScheme(app);
        return await Linking.canOpenURL(scheme);
    } catch {
        return false;
    }
}
