import { visitGallery } from '@/content/landing-extras';

export function VisitGallery() {
  return (
    <section className="bg-cream-deep py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[720px] mb-[clamp(3rem,6vw,5rem)]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {visitGallery.eyebrow}
          </span>
          <h2 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]">
            Not a clipboard.
            <br />
            Not a uniform. <em className="italic text-terracotta">Just company.</em>
          </h2>
        </div>

        <div className="grid gap-[clamp(1.5rem,3vw,2.5rem)] min-[700px]:grid-cols-2 min-[1000px]:grid-cols-4 mt-16">
          {visitGallery.cards.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="bg-paper p-8 rounded-[24px] border border-moss/[0.06] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(60,90,58,0.08)]"
            >
              <div className="w-11 h-11 rounded-full bg-cream-deep flex items-center justify-center mb-6 text-terracotta">
                <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <h3 className="font-head text-moss text-lg font-medium mb-2.5">{title}</h3>
              <p className="text-charcoal text-[0.95rem] leading-[1.55]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
