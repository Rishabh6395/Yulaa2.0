export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(searchParams: URLSearchParams, defaultLimit = 20): PaginationParams {
  const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit))));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationParams,
) {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
