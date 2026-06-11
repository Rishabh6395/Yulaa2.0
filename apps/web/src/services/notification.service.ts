/**
 * Notification service — persists in-app notifications to DB.
 * Push/SMS channels (Firebase FCM, Twilio) can be wired in sendExternal().
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

async function persistInApp(payload: NotificationPayload): Promise<void> {
  try {
    await prisma.inAppNotification.create({
      data: {
        userId: payload.userId,
        title:  payload.title,
        body:   payload.body,
        data:   payload.data ? JSON.parse(JSON.stringify(payload.data)) : undefined,
      },
    });
  } catch (err) {
    // Never throw — notification failures must not break the caller
    console.error('[NotificationService] failed to persist in-app notification', err);
  }
}

async function sendExternal(_payload: NotificationPayload): Promise<void> {
  // TODO: integrate push/SMS provider (Firebase FCM, Twilio, etc.)
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[NotificationService] (dev)', payload.title, '->', payload.userId);
  }

  const channels = payload.channels ?? ['in_app'];

  const tasks: Promise<void>[] = [];
  if (channels.includes('in_app')) tasks.push(persistInApp(payload));
  if (channels.includes('push') || channels.includes('sms')) tasks.push(sendExternal(payload));

  await Promise.allSettled(tasks);
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
  if (students.length === 0) return;

  const platformLabel = platform === 'meet' ? 'Google Meet'
    : platform === 'zoom' ? 'Zoom'
    : platform === 'teams' ? 'Microsoft Teams'
    : platform;

  const dateStr = scheduledAt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  // Load all parent links in one query to avoid N+1
  const allParentLinks = await prisma.parentStudent.findMany({
    where:  { studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true, parent: { select: { userId: true } } },
  });
  const parentsByStudent = new Map<string, string[]>();
  for (const link of allParentLinks) {
    const ids = parentsByStudent.get(link.studentId) ?? [];
    ids.push(link.parent.userId);
    parentsByStudent.set(link.studentId, ids);
  }

  const promises: Promise<void>[] = [];
  for (const student of students) {
    if (!student.userId) continue;
    promises.push(sendNotification({
      userId:   student.userId,
      title:    `Online Class Scheduled — ${subject}`,
      body:     `Your ${subject} class is scheduled on ${dateStr} via ${platformLabel}.`,
      channels: ['push', 'in_app'],
      data:     { classId, platform },
    }));
    for (const parentUserId of parentsByStudent.get(student.id) ?? []) {
      promises.push(sendNotification({
        userId:   parentUserId,
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
  if (students.length === 0) return;

  const platformLabel = platform === 'meet' ? 'Google Meet'
    : platform === 'zoom' ? 'Zoom'
    : platform === 'teams' ? 'Microsoft Teams'
    : platform;

  // Load all parent links in one query to avoid N+1
  const allParentLinks = await prisma.parentStudent.findMany({
    where:  { studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true, parent: { select: { userId: true } } },
  });
  const parentsByStudent = new Map<string, string[]>();
  for (const link of allParentLinks) {
    const ids = parentsByStudent.get(link.studentId) ?? [];
    ids.push(link.parent.userId);
    parentsByStudent.set(link.studentId, ids);
  }

  const promises: Promise<void>[] = [];
  for (const student of students) {
    if (!student.userId) continue;
    promises.push(sendNotification({
      userId:   student.userId,
      title:    `Live Now — ${subject}`,
      body:     `Your ${subject} class is live on ${platformLabel}. Join now!`,
      channels: ['push', 'in_app'],
      data:     { classId, meetingLink, platform },
    }));
    for (const parentUserId of parentsByStudent.get(student.id) ?? []) {
      promises.push(sendNotification({
        userId:   parentUserId,
        title:    `Live Now — ${subject}`,
        body:     `${student.firstName}'s ${subject} class is live on ${platformLabel}.`,
        channels: ['push', 'in_app'],
        data:     { classId, meetingLink, platform },
      }));
    }
  }
  await Promise.allSettled(promises);
}
