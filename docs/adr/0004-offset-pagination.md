# ADR 0004: Offset pagination over cursor pagination

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-05-22 |
| **Deciders** | Engineering (lead) |
| **Supersedes** | The cursor-forward-only audit log paginator (replaced in Stage O.9) |
| **Affected SDD sections** | n/a (engineering pattern) |

## Context

By Stage O.9, the operator console had ten list pages, four portal
list pages, and six detail-page "history" feeds. Most were silently
capped at `take: 100`. The audit log was the one exception: it used
cursor pagination by `id DESC` with a "fetch N+1" trick, forward-only.

The pattern needed to become consistent platform-wide. Two choices:

- **A. Cursor pagination** (`WHERE id < cursor ORDER BY id DESC`),
  bookmarkable, scales to very large tables, but per-page bespoke.
- **B. Offset pagination** (`?page=N`, server runs `SKIP + LIMIT`),
  uniform across differently-sorted lists, COUNT(*) once per page.

## Decision

**Offset pagination**, with a single shared helper (`lib/pagination.ts`)
and a single shared component (`components/ui/Paginator.tsx`).
Applied to every list page and every detail-page history feed.

The audit log's prior cursor scheme was retired and replaced with the
offset paginator.

## Trade-off

Cursor pagination is more efficient for very large tables, especially
where the cursor column is indexed (which `id` always is). The audit
log will be the platform's biggest table, and even there we're at low
thousands of rows. `COUNT(*)` on Postgres against tables of that size
runs in single-digit milliseconds.

Offset's real cost is **deep-page latency**: at page 1000 of 100k rows
the database walks ~25,000 skipped rows even though it returns 25. We
do not expect anyone to paginate that deep manually; if it becomes a
hot path (operator running compliance reports at scale, say), the
paginator's `pageSize` is a single configuration point to bump.

## Why offset was the right call here

- **Uniformity beats cleverness.** Different list pages sort by
  `createdAt DESC`, `scheduledStartAt ASC`, `severity DESC` then
  `openedAt DESC`, etc. A cursor pagination per ordering requires
  tuple-cursor logic; offset just works.
- **Filter preservation is free.** The `Paginator` reads
  `searchParams` and re-emits everything except the page param. No
  per-page cursor encoding.
- **Two concurrent histories on a detail page coexist.** The audit
  history feed uses `?hp=N`; a future "messages" feed could use `?mp=N`.
  Cursor pagination would have needed two separate cursor params and
  per-feed encoding.

## Consequences

### Code shape

```ts
// In a server component:
const state = parsePagination(searchParams, { pageSize: 25 });
const [total, rows] = await Promise.all([
  prisma.x.count({ where }),
  prisma.x.findMany({ where, orderBy: { ... }, skip: state.skip, take: state.pageSize }),
]);
const view = buildView(state, total);

// In JSX:
<Paginator basePath="/ops/x" searchParams={searchParams} view={view} label="x" />
```

For history feeds on detail pages, pass `pageParam: 'hp'` so the
history paginator coexists with anything else on the same URL.

### Page sizes used today

| Surface | Page size | Rationale |
|---|---|---|
| `/ops/audit` | 50 | High-velocity scrolling expected |
| Other `/ops/*` lists | 25 | Roughly one screen on a laptop |
| `/family/*` + `/companion/*` lists | 20 | Less dense visual style |
| Detail-page history feeds | 20 | Sits alongside other sections; doesn't dominate |

### Triggers to revisit

- Any individual list page is observed to render slower than 200ms at
  the median due to the `COUNT(*)`. Switch that one page (or that one
  table) to a cursor scheme; keep the shared `Paginator` for visual
  consistency by hand-rolling the view.
- A specific list (e.g. audit log) crosses ~1M rows. At that point the
  audit log alone moves to cursor by `id`, with the rest of the
  platform staying on offset.
