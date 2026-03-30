import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { DEFAULT_FEE_INVOICE_TEMPLATE } from '@/services/default-templates';
import { validateTemplate } from '@/services/template.service';
import { z } from 'zod';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

const CreateSchema = z.object({
  name:         z.string().min(1).max(200),
  templateType: z.string().default('fee_invoice'),
  htmlContent:  z.string().min(50),
});

async function getSchoolId(user: any): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.school_id) return primary.school_id;
  const def = await prisma.school.findFirst({ where: { isDefault: true }, select: { id: true } });
  if (def) return def.id;
  throw new AppError('No school found');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const schoolId = await getSchoolId(user);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'fee_invoice';

    // Return school-specific templates + system defaults (schoolId = null)
    const templates = await prisma.letterTemplate.findMany({
      where: {
        templateType: type,
        isActive: true,
        OR: [{ schoolId }, { schoolId: null }],
      },
      orderBy: [{ schoolId: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, templateType: true, isDefault: true, schoolId: true, createdAt: true, updatedAt: true },
    });

    // If no school templates exist, include the built-in default in the list
    const hasSchoolTemplate = templates.some(t => t.schoolId === schoolId);
    return Response.json({
      templates,
      builtInDefault: !hasSchoolTemplate ? { id: '__default__', name: 'System Default (Fee Invoice)', templateType: type } : null,
    });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;
    const schoolId = await getSchoolId(user);

    // Get full template HTML (for editing)
    if (action === 'get_html') {
      const { id } = body;
      if (id === '__default__') return Response.json({ htmlContent: DEFAULT_FEE_INVOICE_TEMPLATE });
      const t = await prisma.letterTemplate.findFirst({ where: { id, OR: [{ schoolId }, { schoolId: null }] } });
      if (!t) throw new AppError('Template not found');
      return Response.json({ htmlContent: t.htmlContent });
    }

    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues.map(i => i.message).join('; '));
    const { name, templateType, htmlContent } = parsed.data;

    const validation = validateTemplate(htmlContent);
    // Allow saving even with unknown keys — just warn
    const warnings = validation.unknownKeys.length > 0
      ? [`Unknown placeholders: ${validation.unknownKeys.join(', ')}`]
      : [];

    // Update existing or create new
    if (body.id && body.id !== '__default__') {
      const existing = await prisma.letterTemplate.findFirst({ where: { id: body.id, schoolId } });
      if (!existing) throw new AppError('Template not found');
      const updated = await prisma.letterTemplate.update({ where: { id: body.id }, data: { name, templateType, htmlContent } });
      return Response.json({ template: updated, warnings });
    }

    const template = await prisma.letterTemplate.create({
      data: { schoolId, name, templateType, htmlContent, isDefault: false },
    });
    return Response.json({ template, warnings }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const { id } = await request.json();
    if (!id || id === '__default__') throw new AppError('Cannot delete system default');
    const schoolId = await getSchoolId(user);
    await prisma.letterTemplate.deleteMany({ where: { id, schoolId } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
