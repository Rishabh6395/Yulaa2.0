import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_SIZE) return Response.json({ error: 'File too large (max 10 MB)' }, { status: 400 });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext    = (file.name.split('.').pop() ?? 'bin').toLowerCase();
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'mp4', 'mov', 'zip'];
    if (!ALLOWED_EXTENSIONS.includes(ext)) return Response.json({ error: 'File type not allowed' }, { status: 400 });
    const safe   = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    try {
      // Try filesystem storage (works in local dev and traditional VPS deployments)
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      const dir = join(process.cwd(), 'public', 'uploads', 'queries');
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, safe), buffer);
      return Response.json({ name: file.name, size: file.size, type: file.type, url: `/uploads/queries/${safe}` });
    } catch {
      return Response.json(
        { error: 'File storage is not available in this environment. Configure cloud storage to enable uploads.' },
        { status: 503 }
      );
    }
  } catch (err) { return handleError(err); }
}
