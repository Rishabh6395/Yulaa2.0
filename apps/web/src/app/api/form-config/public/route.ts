import { prisma } from '@/lib/prisma';
import { handleError } from '@/utils/errors';

/**
 * GET /api/form-config/public?schoolId=xxx&formId=admission_form
 * Public (no auth) — returns the 'applicant' role config for a school+form
 * plus custom fields defined via ContentTypeMaster.
 * Used by the /apply public admission page.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const formId   = searchParams.get('formId') ?? 'admission_form';
    if (!schoolId) return Response.json({ fieldRules: null, customFields: [] });

    const [row, customFieldRows] = await Promise.all([
      prisma.formConfig.findUnique({
        where: { schoolId_formId_role: { schoolId, formId, role: 'applicant' } },
      }),
      prisma.contentTypeMaster.findMany({
        where:   { schoolId, formName: formId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select:  { fieldSlot: true, fieldType: true, label: true, options: true, sortOrder: true },
      }),
    ]);

    let fieldRules: Record<string, 'required' | 'optional' | 'hidden'> | null = null;
    if (row) {
      const raw = row.fieldRules as Record<string, any>;
      const normalised: Record<string, 'required' | 'optional' | 'hidden'> = {};
      for (const [key, val] of Object.entries(raw)) {
        if (typeof val === 'string') {
          normalised[key] = val as any;
        } else if (val && typeof val === 'object') {
          if (!val.visible)      normalised[key] = 'hidden';
          else if (val.required) normalised[key] = 'required';
          else                   normalised[key] = 'optional';
        }
      }
      fieldRules = normalised;
    }

    return Response.json({ fieldRules, customFields: customFieldRows });
  } catch (err) { return handleError(err); }
}
