import type { Transaction, Budget, AIInsight } from '@/types';
import { getCategoryById } from '@/constants/categories';

/**
 * AI Service — supports Gemini and ChatGPT APIs
 */

// ─── Prompt Builder ──────────────────────────────────────

function buildSpendingContext(transactions: Transaction[], budgets: Budget[]): string {
    const expenses = transactions.filter((t) => t.type === 'debit');
    const income = transactions.filter((t) => t.type === 'credit');

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);

    // Category totals
    const catMap: Record<string, { amount: number; count: number }> = {};
    expenses.forEach((t) => {
        if (!catMap[t.category]) catMap[t.category] = { amount: 0, count: 0 };
        catMap[t.category].amount += t.amount;
        catMap[t.category].count++;
    });

    const categoryLines = Object.entries(catMap)
        .sort(([, a], [, b]) => b.amount - a.amount)
        .map(([catId, data]) => {
            const cat = getCategoryById(catId);
            return `- ${cat?.label || catId}: ₹${data.amount.toFixed(0)} (${data.count} transactions)`;
        })
        .join('\n');

    // Budget status
    const budgetLines = budgets
        .filter((b) => b.isActive)
        .map((b) => {
            const spent = expenses.filter((t) => t.category === b.category).reduce((s, t) => s + t.amount, 0);
            const pct = b.amount > 0 ? ((spent / b.amount) * 100).toFixed(0) : '0';
            const cat = getCategoryById(b.category);
            return `- ${cat?.label || b.category}: ₹${spent.toFixed(0)} / ₹${b.amount.toFixed(0)} (${pct}%)`;
        })
        .join('\n');

    // Daily pattern
    const dayMap: Record<string, number> = {};
    expenses.forEach((t) => {
        const day = new Date(t.datetime).toLocaleDateString('en-US', { weekday: 'long' });
        dayMap[day] = (dayMap[day] || 0) + t.amount;
    });
    const dayLines = Object.entries(dayMap)
        .sort(([, a], [, b]) => b - a)
        .map(([day, amt]) => `- ${day}: ₹${amt.toFixed(0)}`)
        .join('\n');

    const daysInMonth = new Date().getDate();
    const dailyAvg = daysInMonth > 0 ? totalExpense / daysInMonth : 0;

    return `
SPENDING DATA FOR THIS MONTH:

Total Income: ₹${totalIncome.toFixed(0)}
Total Expenses: ₹${totalExpense.toFixed(0)}
Net Savings: ₹${(totalIncome - totalExpense).toFixed(0)}
Daily Average Spending: ₹${dailyAvg.toFixed(0)}
Total Transactions: ${transactions.length}

SPENDING BY CATEGORY:
${categoryLines || 'No expense data yet'}

BUDGET STATUS:
${budgetLines || 'No budgets set'}

SPENDING BY DAY OF WEEK:
${dayLines || 'No data'}
`.trim();
}

// ─── Gemini API ─────────────────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    // Gemini 2.5 Flash is a thinking model — parts[0] may be the reasoning,
    // the actual response is the last part that isn't a "thought"
    const parts = data.candidates?.[0]?.content?.parts || [];
    const responsePart = parts.filter((p: any) => !p.thought).pop();
    return responsePart?.text || parts[parts.length - 1]?.text || '';
}

// ─── ChatGPT API ────────────────────────────────────────

async function callChatGPT(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a concise personal finance assistant for an Indian expense tracker app called SpendWise. All amounts are in INR (₹). Give short, actionable insights. Use emoji sparingly.',
                },
                { role: 'user', content: prompt },
            ],
            max_tokens: 2048,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`ChatGPT API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// ─── Unified caller ─────────────────────────────────────

async function callAI(prompt: string, provider: 'gemini' | 'chatgpt', apiKey: string): Promise<string> {
    if (provider === 'gemini') {
        return callGemini(prompt, apiKey);
    }
    return callChatGPT(prompt, apiKey);
}

// ─── Public API ─────────────────────────────────────────

export async function generateInsights(
    transactions: Transaction[],
    budgets: Budget[],
    provider: 'gemini' | 'chatgpt',
    apiKey: string
): Promise<AIInsight[]> {
    if (!apiKey) {
        return [
            {
                id: 'no-key',
                type: 'tip',
                title: 'Set up AI',
                message: 'Add your API key in Settings → AI Configuration to get personalized spending insights.',
                datetime: new Date().toISOString(),
                isRead: false,
            },
        ];
    }

    if (transactions.length < 3) {
        return [
            {
                id: 'low-data',
                type: 'tip',
                title: 'Keep tracking!',
                message: 'Add more transactions to get AI-powered insights about your spending patterns.',
                datetime: new Date().toISOString(),
                isRead: false,
            },
        ];
    }

    const context = buildSpendingContext(transactions, budgets);

    const prompt = `${context}

Based on this spending data, generate exactly 4 brief financial insights as numbered lines. Each line: tag, title, pipe, then a concise 1-2 sentence insight.

Tags: [ALERT] for warnings/overspending, [TIP] for savings advice, [SUMMARY] for patterns.
Format: number. [TAG] Short Title | Brief insight with key numbers.

Rules:
- Keep each insight to 1-2 short sentences — be punchy, not verbose
- Always include specific ₹ amounts and percentages from the data
- Make tips actionable with a clear suggestion
- No filler words, get straight to the point

Example:
1. [ALERT] Food Over Budget | Food spending hit ₹4,200 (35% of total), ₹1,200 over your ₹3,000 budget. Cut 2 restaurant visits to save ~₹800.
2. [TIP] Weekend Spike | Weekends average ₹650/day vs ₹320 on weekdays. Set a ₹500 weekend cap to save ₹600/month.
3. [SUMMARY] Month So Far | ₹12,400 spent across 45 transactions. Daily avg ₹620, saving 31% of income.
4. [TIP] Transport Savings | ₹2,100 on 12 trips. A monthly pass (₹1,200) could cut this by 40%.`;

    try {
        const raw = await callAI(prompt, provider, apiKey);

        // Join continuation lines back to their numbered parent
        // AI may wrap long insights across multiple lines
        const rawLines = raw.split('\n');
        const mergedLines: string[] = [];
        for (const line of rawLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.match(/^\d+\./)) {
                // New numbered insight
                mergedLines.push(trimmed);
            } else if (mergedLines.length > 0) {
                // Continuation of previous insight — append
                mergedLines[mergedLines.length - 1] += ' ' + trimmed;
            }
        }
        const lines = mergedLines.filter((l) => l.match(/^\d+\./));

        if (lines.length === 0) {
            // Fallback: treat entire response as a single summary insight
            return [{
                id: `ai-${Date.now()}-0`,
                type: 'summary' as const,
                title: 'Spending Analysis',
                message: raw.trim(),
                datetime: new Date().toISOString(),
                isRead: false,
            }];
        }

        return lines.map((line, idx) => {
            const tagMatch = line.match(/\[(ALERT|TIP|SUMMARY)\]/i);
            const type = tagMatch ? tagMatch[1].toLowerCase() as 'alert' | 'tip' | 'summary' : 'tip';

            // Remove the number prefix and tag
            let content = line.replace(/^\d+\.\s*/, '').replace(/\[(ALERT|TIP|SUMMARY)\]\s*/i, '');

            // Split by pipe for title | message
            const pipeIdx = content.indexOf('|');
            let title = 'Insight';
            let message = content.trim();
            if (pipeIdx > 0) {
                title = content.substring(0, pipeIdx).trim();
                message = content.substring(pipeIdx + 1).trim();
            }

            return {
                id: `ai-${Date.now()}-${idx}`,
                type,
                title,
                message,
                datetime: new Date().toISOString(),
                isRead: false,
            };
        });
    } catch (error) {
        console.error('AI insights error:', error);
        return getFallbackInsights();
    }
}

export async function generateSummary(
    transactions: Transaction[],
    budgets: Budget[],
    provider: 'gemini' | 'chatgpt',
    apiKey: string
): Promise<string> {
    if (!apiKey || transactions.length < 3) {
        return '';
    }

    const context = buildSpendingContext(transactions, budgets);

    const prompt = `${context}

Write a brief 3-4 sentence monthly spending summary for the user. Mention their top spending category, how they're doing vs their budget, and one suggestion. Be conversational and friendly, in second person. Use ₹ for amounts.`;

    try {
        return await callAI(prompt, provider, apiKey);
    } catch (error) {
        console.error('AI summary error:', error);
        return '';
    }
}

export async function testConnection(provider: 'gemini' | 'chatgpt', apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await callAI('Reply with only the word: ok', provider, apiKey);
        if (result && typeof result === 'string' && result.length > 0) {
            return { success: true };
        }
        return { success: false, error: 'Empty response from AI' };
    } catch (error: any) {
        const msg = typeof error === 'string'
            ? error
            : error?.message || JSON.stringify(error) || 'Unknown error';
        // Extract just the useful part of API errors
        if (msg.includes('401') || msg.includes('Unauthorized')) {
            return { success: false, error: 'Invalid API key' };
        }
        if (msg.includes('403') || msg.includes('Forbidden')) {
            return { success: false, error: 'API key does not have access' };
        }
        if (msg.includes('429')) {
            return { success: false, error: 'Rate limit exceeded, try again later' };
        }
        if (msg.includes('Network') || msg.includes('fetch')) {
            return { success: false, error: 'Network error — check your connection' };
        }
        return { success: false, error: msg.length > 120 ? msg.substring(0, 120) + '...' : msg };
    }
}

// ─── Fallback insights (no API / error) ─────────────────

function getFallbackInsights(): AIInsight[] {
    return [
        {
            id: 'fallback-1',
            type: 'tip',
            title: 'Unable to generate insights',
            message: 'Check your API key in Settings or try again later.',
            datetime: new Date().toISOString(),
            isRead: false,
        },
    ];
}
