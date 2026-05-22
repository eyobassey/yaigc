// Offset-based pagination shared across list pages and detail-page
// history feeds. Cursor pagination would be more efficient for
// unbounded lists, but our largest table is the audit log and even
// that is at low thousands of rows; offset queries are fine. The
// trade-off lets a single Paginator render against any orderBy
// shape without juggling tuple cursors.

export interface PaginationState {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginationView {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface ParseOptions {
  pageSize?: number;
  pageParam?: string;
  maxPage?: number;
}

export function parsePagination(
  searchParams: Record<string, string | string[] | undefined>,
  options: ParseOptions = {},
): PaginationState {
  const pageParam = options.pageParam ?? 'page';
  const pageSize = options.pageSize ?? 25;
  const raw = searchParams[pageParam];
  const v = Array.isArray(raw) ? raw[0] : raw;
  let page = Math.trunc(Number(v));
  if (!Number.isFinite(page) || page < 1) page = 1;
  const max = options.maxPage ?? 10_000;
  if (page > max) page = max;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function buildView(state: PaginationState, total: number): PaginationView {
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  const page = Math.min(state.page, totalPages);
  return {
    page,
    pageSize: state.pageSize,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
