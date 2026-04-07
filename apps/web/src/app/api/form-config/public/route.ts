import { prisma } from '@/lib/prisma';
import { handleError } from '@/utils/errors';

/**
 * GET /api/form-config/public?schoolId=xxx&formId=admission_form
 * Public (no auth) — returns the 'applicant' role config for a school+form.
 * Used by the /apply public admission page.
 * Normalises new object format → legacy string format for backward compatibility.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const formId   = searchParams.get('formId') ?? 'admission_form';
    if (!schoolId) return Response.json({ fieldRules: null });

    const row = await prisma.formConfig.findUnique({
      where: { schoolId_formId_role: { schoolId, formId, role: 'applicant' } },
    });
    if (!row) return Response.json({ fieldRules: null });

    // Normalise: new object format → legacy string format consumed by /apply page
    const raw = row.fieldRules as Record<string, any>;
    const normalised: Record<string, 'required' | 'optional' | 'hidden'> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === 'string') {
        normalised[key] = val as any;
      } else if (val && typeof val === 'object') {
        if (!val.visible)  normalised[key] = 'hidden';
        else if (val.required) normalised[key] = 'required';
        else               normalised[key] = 'optional';
      }
    }
    return Response.json({ fieldRules: normalised });
  } catch (err) { return handleError(err); }
}
