import { home } from '@igc/content';

export function Pillars() {
  return (
    <section className="bg-cream py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[720px] mb-[clamp(3rem,6vw,5rem)]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {home.trust.title}
          </span>
          <h2 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]">
            The visits feel different,
            <br />
            because they <em className="italic text-terracotta">are</em>.
          </h2>
        </div>

        <div className="grid gap-[clamp(2rem,4vw,3.5rem)] min-[760px]:grid-cols-3">
          {home.trust.points.map((point, index) => (
            <article key={point.title} className="relative pt-8 border-t border-moss">
              <div className="font-head text-sm tracking-wider text-terracotta mb-5">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="font-head text-charcoal text-[clamp(1.4rem,3vw,1.85rem)] font-medium leading-[1.2] mb-4 max-w-[18ch]">
                {point.title}
              </h3>
              <p className="text-charcoal leading-[1.6]">{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
