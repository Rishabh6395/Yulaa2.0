import { randomBytes } from 'crypto';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function assertSuperAdmin(user: Awaited<ReturnType<typeof getUserFromRequest>>) {
  if (!user) throw new UnauthorizedError();
  const primary = (user.roles as any[]).find((r) => r.is_primary) ?? user.roles[0];
  if (primary.role_code !== 'super_admin') throw new ForbiddenError();
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? '').replace(/^"|"$/g, ''); });
    return obj;
  });
}

/**
 * POST /api/super-admin/vendors/bulk
 * Body: multipart/form-data with a `file` field (CSV)
 *
 * CSV columns (header row required):
 *   first_name, last_name, email, phone, company_name, category,
 *   gst_no, address, description, is_external, area_scope,
 *   allowed_school_ids (pipe-separated IDs, e.g. id1|id2),
 *   contract_start, contract_end
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new AppError('Please upload a CSV file. No file was received.');
    if (file.size > 5 * 1024 * 1024) throw new AppError('File too large. Maximum allowed size is 5 MB.');

    const text = await file.text();
    const records = parseCSV(text);
    if (records.length === 0)
      throw new AppError('The uploaded CSV file is empty or has no data rows. Please check the file and try again.');
    if (records.length > 1000) throw new AppError('CSV exceeds maximum of 1,000 rows per upload. Split the file and upload in batches.');

    const vendorRole = await prisma.role.findUnique({ where: { code: 'vendor' } });
    if (!vendorRole)
      throw new AppError('Vendor role is not configured in the system. Please contact Yulaa support.');

    let created = 0, linked = 0, skipped = 0, failed = 0;
    const results: { row: number; email: string; status: string; error?: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const row = i + 2;
      const email = r.email?.toLowerCase().trim();

      try {
        if (!r.first_name) throw new Error('first_name is required');
        if (!r.last_name)  throw new Error('last_name is required');
        if (!email)        throw new Error('email is required');
        if (!r.company_name) throw new Error('company_name is required');

        let existingUser = await prisma.user.findUnique({ where: { email } });
        let vendorProfile = existingUser
          ? await prisma.vendor.findUnique({ where: { userId: existingUser.id } })
          : null;

        const isNewUser = !existingUser;
        if (isNewUser) {
          const hash = await bcrypt.hash(randomBytes(12).toString('hex'), 12);
          existingUser = await prisma.user.create({
            data: {
              email,
              passwordHash: hash,
              firstName: r.first_name.trim(),
              lastName: r.last_name.trim(),
              phone: r.phone || null,
              userRoles: { create: { roleId: vendorRole.id, isPrimary: true } },
            },
          });
        }

        const schoolIds = r.allowed_school_ids
          ? r.allowed_school_ids.split('|').map(s => s.trim()).filter(Boolean)
          : [];

        if (!vendorProfile) {
          await prisma.vendor.create({
            data: {
              userId:           existingUser!.id,
              companyName:      r.company_name.trim(),
              gstNo:            r.gst_no || null,
              address:          r.address || null,
              description:      r.description || null,
              category:         r.category || null,
              isExternal:       r.is_external === 'true',
              areaScope:        r.area_scope || 'school',
              allowedSchoolIds: schoolIds,
              contractStart:    r.contract_start ? new Date(r.contract_start) : new Date(),
              contractEnd:      r.contract_end ? new Date(r.contract_end) : null,
            },
          });
          if (isNewUser) created++; else linked++;
        } else {
          const merged = Array.from(new Set([...vendorProfile.allowedSchoolIds, ...schoolIds]));
          await prisma.vendor.update({
            where: { id: vendorProfile.id },
            data: {
              allowedSchoolIds: merged,
              ...(r.contract_end && { contractEnd: new Date(r.contract_end) }),
            },
          });
          linked++;
          if (!isNewUser) skipped++;
        }

        results.push({ row, email, status: 'success' });
      } catch (e: any) {
        failed++;
        results.push({ row, email: r.email || `row ${row}`, status: 'failed', error: e.message });
      }
    }

    return Response.json({ total: records.length, created, linked, skipped, failed, results });
  } catch (err) { return handleError(err); }
}
