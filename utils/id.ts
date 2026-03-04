/**
 * Generate a unique ID without requiring crypto.getRandomValues()
 * Compatible with all React Native JS engines
 */
export function generateId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    const randomPart2 = Math.random().toString(36).substring(2, 6);
    return `${timestamp}-${randomPart}-${randomPart2}`;
}
