import { founderNote } from '@/content/landing-extras';

export function FounderNote() {
  return (
    <section className="bg-cream py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
        <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-terracotta mb-6 inline-block">
          {founderNote.eyebrow}
        </span>
        <div className="font-head text-moss font-normal leading-[1.4] tracking-[-0.01em] text-[clamp(1.5rem,3vw,2.125rem)] space-y-6">
          {founderNote.body.map((paragraph, i) => (
            <p key={i}>{i === founderNote.body.length - 1 ? <em className="italic text-terracotta">{paragraph}</em> : paragraph}</p>
          ))}
        </div>
        <p className="mt-8 text-sm text-stone tracking-wider uppercase">
          {founderNote.attribution}
        </p>
      </div>
    </section>
  );
}
