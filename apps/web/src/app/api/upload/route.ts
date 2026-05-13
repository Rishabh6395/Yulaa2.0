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
      // Fallback: inline base64 data URL (serverless-safe, no external storage needed)
      const url = `data:${file.type};base64,${buffer.toString('base64')}`;
      return Response.json({ name: file.name, size: file.size, type: file.type, url });
    }
  } catch (err) { return handleError(err); }
}
