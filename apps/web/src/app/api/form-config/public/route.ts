import { prisma } from '@/lib/prisma';
import { handleError } from '@/utils/errors';

/**
 * GET /api/form-config/public?schoolId=xxx&formId=admission
 * Public (no auth) — returns the 'applicant' role config for a school+form.
 * Used by the /apply public admission page.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const formId   = searchParams.get('formId') ?? 'admission';
    if (!schoolId) return Response.json({ fieldRules: null });

    const row = await prisma.formConfig.findUnique({
      where: { schoolId_formId_role: { schoolId, formId, role: 'applicant' } },
    });
    return Response.json({ fieldRules: row ? (row.fieldRules as Record<string, string>) : null });
  } catch (err) { return handleError(err); }
}
