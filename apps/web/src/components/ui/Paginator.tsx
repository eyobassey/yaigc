import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationView } from '@/lib/pagination';

// Server-rendered pagination control. Re-uses the rest of the URL's
// query string so filters carry across page hops. Hides itself when
// there's only one page; shows just the total count instead. Built
// against the shared PaginationView so every list page has the same
// shape.

interface Props {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  view: PaginationView;
  pageParam?: string;
  label?: string; // singular noun for total count, e.g. "match"
  labelPlural?: string; // override when label + 's' would be wrong (e.g. "family" -> "families")
  className?: string;
}

export function Paginator({
  basePath,
  searchParams,
  view,
  pageParam = 'page',
  label = 'item',
  labelPlural,
  className,
}: Props) {
  const plural = labelPlural ?? `${label}s`;
  function urlFor(page: number): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === pageParam) continue;
      if (Array.isArray(v)) {
        for (const x of v) q.append(k, x);
      } else if (v !== undefined && v !== '') {
        q.set(k, v);
      }
    }
    if (page > 1) q.set(pageParam, String(page));
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const wrap = `mt-4 flex items-center justify-between gap-2 flex-wrap ${className ?? ''}`;

  if (view.total === 0) return null;

  if (view.totalPages <= 1) {
    return (
      <p className={`text-stone text-[0.8125rem] mt-3 ${className ?? ''}`}>
        {view.total} {view.total === 1 ? label : plural}
      </p>
    );
  }

  const from = (view.page - 1) * view.pageSize + 1;
  const to = Math.min(view.page * view.pageSize, view.total);

  return (
    <nav className={wrap} aria-label="Pagination">
      <p className="text-stone text-[0.8125rem]">
        {from}-{to} of {view.total} {view.total === 1 ? label : plural}
      </p>
      <div className="flex items-center gap-1">
        {view.hasPrev ? (
          <Link
            href={urlFor(view.page - 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-moss/15 text-moss text-[0.8125rem] hover:bg-moss/5 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            Prev
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-moss/10 text-stone/40 text-[0.8125rem] cursor-not-allowed">
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            Prev
          </span>
        )}
        <span className="text-charcoal text-[0.8125rem] px-2 whitespace-nowrap">
          Page {view.page} of {view.totalPages}
        </span>
        {view.hasNext ? (
          <Link
            href={urlFor(view.page + 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-moss/15 text-moss text-[0.8125rem] hover:bg-moss/5 transition-colors"
            aria-label="Next page"
          >
            Next
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-moss/10 text-stone/40 text-[0.8125rem] cursor-not-allowed">
            Next
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
