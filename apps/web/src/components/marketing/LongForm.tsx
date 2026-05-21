import type { ReactNode } from 'react';
import { brand } from '@igc/content';

export function LongFormHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <section className="bg-cream pt-[clamp(3rem,8vw,6rem)] pb-[clamp(2rem,5vw,4rem)]">
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
          {eyebrow}
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] tracking-[-0.025em]">
          {title}
        </h1>
        {lead ? (
          <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.45] mt-6 max-w-[48ch]">
            {lead}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function DraftBanner({ children }: { children: ReactNode }) {
  return (
    <div className="bg-terracotta/10 border-l-4 border-terracotta px-6 py-5 my-8 rounded-r">
      <p className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.12em] text-terracotta mb-2">
        Draft for review
      </p>
      <p className="text-charcoal leading-[1.6] text-[0.9375rem]">{children}</p>
    </div>
  );
}

export function LongFormBody({ children }: { children: ReactNode }) {
  return (
    <section className="bg-cream pb-[clamp(4rem,8vw,6rem)]">
      <div className="max-w-[760px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        {children}
        <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.4] mt-16 text-center">
          {brand.closingLine}
        </p>
      </div>
    </section>
  );
}

export function Sec({
  n,
  id,
  heading,
  children,
}: {
  n: string;
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14 scroll-mt-24" id={id}>
      <h2 className="font-head font-normal text-moss text-[clamp(1.5rem,3vw,2rem)] leading-[1.2] mb-6">
        <span className="text-terracotta font-head italic mr-3">{n}.</span>
        {heading}
      </h2>
      <div className="flex flex-col gap-4 text-charcoal text-[1.0625rem] leading-[1.7]">
        {children}
      </div>
    </section>
  );
}

export function Sub({
  n,
  heading,
  children,
}: {
  n: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-8">
      <h3 className="font-head text-moss text-[1.25rem] font-medium leading-[1.3] mb-4">
        <span className="text-stone font-body not-italic mr-2 text-[0.95rem]">{n}</span>
        {heading}
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2.5 my-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 leading-[1.6]">
          <span aria-hidden="true" className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-moss/60 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function KV({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="my-4 grid grid-cols-1 min-[600px]:grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-[1rem]">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="font-medium text-stone">{k}</dt>
          <dd className="text-charcoal">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-[0.9375rem]">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="text-left font-body font-medium text-stone uppercase tracking-[0.08em] text-[0.75rem] py-3 px-3 border-b border-moss/20 align-top"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-3 px-3 border-b border-moss/10 text-charcoal leading-[1.55]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <em className="not-italic bg-terracotta/10 text-charcoal px-2 py-0.5 rounded text-[0.95em]">
      {children}
    </em>
  );
}
