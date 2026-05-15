/**
 * Notification service — stub for future push/in-app notifications.
 */
import prisma from '@/lib/prisma';

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

/**
 * Notify all students in a class and their parents that an online class has been scheduled.
 */
export async function notifyOnlineClassScheduled(
  classId: string,
  subject: string,
  scheduledAt: Date,
  platform: string,
) {
  const students = await prisma.student.findMany({
    where:   { classId },
    select:  { userId: true, id: true, firstName: true },
  });

  const platformLabel = platform === 'meet' ? 'Google Meet'
    : platform === 'zoom' ? 'Zoom'
    : platform === 'teams' ? 'Microsoft Teams'
    : platform;

  const dateStr = scheduledAt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const promises: Promise<void>[] = [];

  for (const student of students) {
    promises.push(sendNotification({
      userId:   student.userId,
      title:    `Online Class Scheduled — ${subject}`,
      body:     `Your ${subject} class is scheduled on ${dateStr} via ${platformLabel}.`,
      channels: ['push', 'in_app'],
      data:     { classId, platform },
    }));

    // Notify parents
    const parentLinks = await prisma.parentStudent.findMany({
      where:  { studentId: student.id },
      select: { parent: { select: { userId: true } } },
    });
    for (const link of parentLinks) {
      promises.push(sendNotification({
        userId:   link.parent.userId,
        title:    `Online Class Scheduled — ${subject}`,
        body:     `${student.firstName}'s ${subject} class is scheduled on ${dateStr} via ${platformLabel}.`,
        channels: ['push', 'in_app'],
        data:     { classId, platform },
      }));
    }
  }

  await Promise.allSettled(promises);
}

/**
 * Notify all students in a class and their parents that an online class is now live.
 */
export async function notifyOnlineClassLive(
  classId: string,
  subject: string,
  meetingLink: string | null,
  platform: string,
) {
  const students = await prisma.student.findMany({
    where:   { classId },
    select:  { userId: true, id: true, firstName: true },
  });

  const platformLabel = platform === 'meet' ? 'Google Meet'
    : platform === 'zoom' ? 'Zoom'
    : platform === 'teams' ? 'Microsoft Teams'
    : platform;

  const promises: Promise<void>[] = [];

  for (const student of students) {
    promises.push(sendNotification({
      userId:   student.userId,
      title:    `🔴 Live Now — ${subject}`,
      body:     `Your ${subject} class is live on ${platformLabel}. Join now!`,
      channels: ['push', 'in_app'],
      data:     { classId, meetingLink, platform },
    }));

    const parentLinks = await prisma.parentStudent.findMany({
      where:  { studentId: student.id },
      select: { parent: { select: { userId: true } } },
    });
    for (const link of parentLinks) {
      promises.push(sendNotification({
        userId:   link.parent.userId,
        title:    `🔴 Live Now — ${subject}`,
        body:     `${student.firstName}'s ${subject} class is live on ${platformLabel}.`,
        channels: ['push', 'in_app'],
        data:     { classId, meetingLink, platform },
      }));
    }
  }

  await Promise.allSettled(promises);
}
