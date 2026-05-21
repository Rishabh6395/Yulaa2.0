import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT current_user, current_database()`;
    return Response.json({ ok: true, row: result[0] });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message });
  }
}
