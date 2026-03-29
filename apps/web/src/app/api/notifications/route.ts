import { getUserFromRequest } from '@/lib/auth';
import { withCache, CacheTTL } from '@/services/cache.service';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

interface NotifItem {
  id:    string;
  type:  'announcement' | 'leave' | 'fee' | 'homework' | 'query';
  title: string;
  sub:   string;
  href:  string;
  time:  string;
}

// ── Role-specific data fetchers ──────────────────────────────────────────────

async function getAdminNotifications(schoolId: string): Promise<NotifItem[]> {
  const cutoff = new Date(Date.now() - 14 * 86400_000); // 14 days ago
  const today  = new Date(); today.setHours(0, 0, 0, 0);

  const [announcements, pendingLeaves, overdueFeesCount, openQueries] = await Promise.all([
    prisma.announcement.findMany({
      where:   { schoolId, status: 'active', createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, priority: true, createdAt: true },
    }),
    prisma.leaveRequest.findMany({
      where:   { schoolId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, leaveType: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.feeInvoice.count({ where: { schoolId, status: 'overdue' } }),
    prisma.studentQuery.count({ where: { schoolId, status: 'open' } }),
  ]);

  const items: NotifItem[] = [];

  announcements.forEach((a) => items.push({
    id:    `ann-${a.id}`,
    type:  'announcement',
    title: a.title,
    sub:   (a.priority ?? 'normal'),
    href:  '/dashboard/announcements',
    time:  a.createdAt.toISOString(),
  }));

  pendingLeaves.forEach((l) => items.push({
    id:    `leave-${l.id}`,
    type:  'leave',
    title: `${l.leaveType} Leave — pending`,
    sub:   `${l.user.firstName} ${l.user.lastName}`,
    href:  '/dashboard/leave',
    time:  l.createdAt.toISOString(),
  }));

  if (overdueFeesCount > 0) items.push({
    id:    'fees-overdue',
    type:  'fee',
    title: `${overdueFeesCount} overdue fee invoice${overdueFeesCount > 1 ? 's' : ''}`,
    sub:   'Requires attention',
    href:  '/dashboard/fees',
    time:  today.toISOString(),
  });

  if (openQueries > 0) items.push({
    id:    'queries-open',
    type:  'query',
    title: `${openQueries} open quer${openQueries > 1 ? 'ies' : 'y'}`,
    sub:   'Awaiting response',
    href:  '/dashboard/queries',
    time:  today.toISOString(),
  });

  return items;
}

async function getTeacherNotifications(userId: string, schoolId: string): Promise<NotifItem[]> {
  const cutoff = new Date(Date.now() - 14 * 86400_000);

  const [announcements, myLeaves] = await Promise.all([
    prisma.announcement.findMany({
      where:   { schoolId, status: 'active', createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, priority: true, createdAt: true },
    }),
    prisma.leaveRequest.findMany({
      where:   { schoolId, userId, status: { in: ['pending', 'approved', 'rejected'] } },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { id: true, leaveType: true, status: true, createdAt: true },
    }),
  ]);

  const items: NotifItem[] = [];

  announcements.forEach((a) => items.push({
    id:    `ann-${a.id}`,
    type:  'announcement',
    title: a.title,
    sub:   (a.priority ?? 'normal'),
    href:  '/dashboard/announcements',
    time:  a.createdAt.toISOString(),
  }));

  myLeaves.forEach((l) => items.push({
    id:    `leave-${l.id}`,
    type:  'leave',
    title: `Your ${l.leaveType} leave — ${l.status}`,
    sub:   '',
    href:  '/dashboard/leave',
    time:  l.createdAt.toISOString(),
  }));

  return items;
}

async function getParentNotifications(userId: string, schoolId: string): Promise<NotifItem[]> {
  const cutoff = new Date(Date.now() - 14 * 86400_000);

  // Find parent record to get student IDs
  const parent = await prisma.parent.findUnique({
    where:   { userId },
    include: { parentStudents: { select: { studentId: true } } },
  });
  const studentIds = parent?.parentStudents.map((s) => s.studentId) ?? [];

  const [announcements, overdueInvoices, pendingLeave] = await Promise.all([
    prisma.announcement.findMany({
      where:   { schoolId, status: 'active', createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, priority: true, createdAt: true },
    }),
    studentIds.length > 0
      ? prisma.feeInvoice.findMany({
          where:   { studentId: { in: studentIds }, status: { in: ['overdue', 'unpaid'] } },
          orderBy: { dueDate: 'asc' },
          take: 3,
          select: { id: true, amount: true, status: true, dueDate: true, invoiceNo: true },
        })
      : [],
    prisma.leaveRequest.findMany({
      where:   { schoolId, userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { id: true, leaveType: true, status: true, createdAt: true },
    }),
  ]);

  const items: NotifItem[] = [];

  announcements.forEach((a) => items.push({
    id:    `ann-${a.id}`,
    type:  'announcement',
    title: a.title,
    sub:   (a.priority ?? 'normal'),
    href:  '/dashboard/announcements',
    time:  a.createdAt.toISOString(),
  }));

  (overdueInvoices as any[]).forEach((f) => items.push({
    id:    `fee-${f.id}`,
    type:  'fee',
    title: `Fee ${f.status} — ₹${parseFloat(f.amount).toLocaleString('en-IN')}`,
    sub:   f.invoiceNo ?? '',
    href:  '/dashboard/fees',
    time:  f.dueDate.toISOString(),
  }));

  pendingLeave.forEach((l) => items.push({
    id:    `leave-${l.id}`,
    type:  'leave',
    title: `Your ${l.leaveType} leave — pending`,
    sub:   '',
    href:  '/dashboard/leave',
    time:  l.createdAt.toISOString(),
  }));

  return items;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const roleCode    = primaryRole.role_code;
    const schoolId    = primaryRole.school_id ?? '';

    const cacheKey = `notifications:${user.id}`;

    const items = await withCache<NotifItem[]>(cacheKey, CacheTTL.notifications, async () => {
      let result: NotifItem[] = [];

      if (['school_admin', 'principal', 'hod', 'super_admin'].includes(roleCode)) {
        result = await getAdminNotifications(schoolId);
      } else if (roleCode === 'teacher') {
        result = await getTeacherNotifications(user.id, schoolId);
      } else if (roleCode === 'parent') {
        result = await getParentNotifications(user.id, schoolId);
      }

      // Sort by time desc, cap at 8
      return result
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 8);
    });

    return Response.json({ notifications: items, count: items.length });
  } catch (err) {
    return handleError(err);
  }
}
