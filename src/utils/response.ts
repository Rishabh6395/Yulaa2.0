/** Standard success response */
export function ok(data: object, status = 200) {
  return Response.json(data, { status });
}

/** Standard error response */
export function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export const Res = { ok, err };
