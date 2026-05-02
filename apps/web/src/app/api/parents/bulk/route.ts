import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import { parseCSV } from '@/services/upload.service';
import prisma from '@/lib/prisma';

function assertAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (!['super_admin', 'school_admin'].includes(primary.role_code)) throw new ForbiddenError();
  return primary;
}

// GET: download CSV template
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    assertAdmin(user!);

    const csv = [
      'first_name,last_name,phone,email,child_admission_no',
      'Rajesh,Kumar,9876543210,rajesh@email.com,ADM-2024-001',
      'Priya,Sharma,9876543211,priya@email.com,ADM-2024-002',
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="parents-template.csv"',
      },
    });
  } catch (err) { return handleError(err); }
}

// POST: bulk upload parents from CSV/XLSX
export async function POST(request: Request) {
  try {
    const user    = await getUserFromRequest(request);
    const primary = assertAdmin(user!);

    const formData = await request.formData();
    const file     = formData.get('file') as File | null;
    if (!file) throw new AppError('No file provided', 400);

    // school_admin: use role's school_id; super_admin: must pass school_id in formData
    const schoolId: string = primary.school_id ?? (formData.get('school_id') as string | null) ?? '';
    if (!schoolId) throw new AppError('school_id required', 400);

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) throw new AppError('File is empty or has no data rows', 400);

    const parentRole = await prisma.role.findUnique({ where: { code: 'parent' } });

    let created = 0;
    let linked  = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2;

      const firstName = row['first_name']?.trim();
      const phone     = row['phone']?.trim();

      if (!firstName || !phone) {
        errors.push(`Row ${rowNum}: first_name and phone are required`);
        continue;
      }

      const lastName = row['last_name']?.trim() || '-';
      const rawEmail = row['email']?.trim();
      const email    = rawEmail || `${phone.replace(/\s+/g, '')}.${schoolId.slice(0, 6)}@noemail.local`;

      try {
        // find-or-create user
        let userRec = await prisma.user.findUnique({ where: { email } });
        let isNew   = false;
        if (!userRec) {
          const hash = await bcrypt.hash(phone, 12);
          userRec = await prisma.user.create({
            data: {
              firstName, lastName, email, phone,
              passwordHash: hash, mustResetPassword: true, status: 'active',
            },
          });
          isNew = true;
        }

        // find-or-create parent
        let parent = await prisma.parent.findUnique({ where: { userId: userRec.id } });
        if (!parent) {
          parent = await prisma.parent.create({ data: { userId: userRec.id } });
        }

        // assign role
        if (parentRole) {
          const exists = await prisma.userRole.findFirst({ where: { userId: userRec.id, roleId: parentRole.id, schoolId } });
          if (!exists) {
            await prisma.userRole.create({ data: { userId: userRec.id, roleId: parentRole.id, schoolId, isPrimary: true } });
          }
        }

        if (isNew) created++;

        // link child by admission_no
        const admissionNo = row['child_admission_no']?.trim();
        if (admissionNo) {
          const student = await prisma.student.findFirst({ where: { admissionNo, schoolId } });
          if (student) {
            const alreadyLinked = await prisma.parentStudent.findFirst({ where: { parentId: parent.id, studentId: student.id } });
            if (!alreadyLinked) {
              await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: student.id } });
              linked++;
            }
          } else {
            errors.push(`Row ${rowNum}: student with admission_no "${admissionNo}" not found`);
          }
        }
      } catch (e: any) {
        errors.push(`Row ${rowNum} (${phone}): ${e.message ?? 'insert failed'}`);
      }
    }

    return Response.json({ created, linked, errors, total: rows.length });
  } catch (err) { return handleError(err); }
}
