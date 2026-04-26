import { getUserFromRequest } from '@/lib/auth';
import { getWorkflow, saveWorkflow } from '@/modules/admission/admission.service';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';

function assertSuperAdmin(user: any) {
  if (!user) throw new UnauthorizedError();
  if (!user.roles.some((r: any) => r.role_code === 'super_admin')) throw new ForbiddenError();
}

/** GET /api/super-admin/schools/[id]/admission-workflow */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const workflow = await getWorkflow(params.id);
    return Response.json({ workflow });
  } catch (err) { return handleError(err); }
}

/** POST /api/super-admin/schools/[id]/admission-workflow — body: { name, steps } */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertSuperAdmin(user);
    const body     = await request.json();
    const workflow = await saveWorkflow({ ...body, schoolId: params.id });
    return Response.json({ workflow }, { status: 201 });
  } catch (err) { return handleError(err); }
}
