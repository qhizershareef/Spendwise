import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const scheduleBudgetAlert = async (categoryName: string, budgetAmount: number, spentAmount: number) => {
    const percentage = (spentAmount / budgetAmount) * 100;

    let title = '';
    let body = '';

    if (percentage >= 100) {
        title = `Budget Exceeded: ${categoryName}`;
        body = `You've spent ₹${spentAmount.toLocaleString()} of your ₹${budgetAmount.toLocaleString()} budget.`;
    } else if (percentage >= 80) {
        title = `Approaching Budget: ${categoryName}`;
        body = `You've spent ${Math.round(percentage)}% (₹${spentAmount.toLocaleString()}) of your budget.`;
    } else {
        return; // No notification needed
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: { type: 'budget_alert', category: categoryName },
        },
        trigger: null, // Send immediately
    });
};

export const scheduleDailyReminder = async (hours: number, minutes: number) => {
    // Cancel existing daily reminders first
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
        if (notif.content.data?.type === 'daily_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Don't forget to log your expenses! 📝",
            body: "Take a moment to record any transactions from today.",
            data: { type: 'daily_reminder' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
        },
    });
};

export const cancelAllReminders = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
        if (notif.content.data?.type === 'daily_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
    }
};
