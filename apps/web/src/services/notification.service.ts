/**
 * Notification service — stub for future push/in-app notifications.
 */

export type NotificationChannel = 'push' | 'in_app' | 'sms';

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[NotificationService] (dev — not sent)', payload.title, '->', payload.userId);
    return;
  }
  // TODO: integrate push/SMS provider (Firebase FCM, Twilio, etc.)
}

export async function notifyAttendanceMarked(userId: string, status: string, date: string) {
  await sendNotification({
    userId,
    title: 'Attendance Update',
    body:  `Your child was marked ${status} on ${date}.`,
    channels: ['push', 'in_app'],
  });
}

export async function notifyFeeReminder(userId: string, amount: number, dueDate: string) {
  await sendNotification({
    userId,
    title: 'Fee Reminder',
    body:  `₹${amount} is due by ${dueDate}. Please pay to avoid late fees.`,
    channels: ['push', 'in_app'],
  });
}
