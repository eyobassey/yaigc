import { faqTeaser } from '@/content/landing-extras';

export function FAQ() {
  return (
    <section id="faq" className="bg-cream-deep py-[clamp(4rem,10vw,8rem)]">
      <div className="max-w-[880px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="max-w-[720px] mb-[clamp(3rem,6vw,5rem)]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            {faqTeaser.eyebrow}
          </span>
          <h2 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] tracking-[-0.02em]">
            The questions
            <br />
            <em className="italic text-terracotta">that come up most.</em>
          </h2>
        </div>

        <div className="max-w-[760px] mt-12">
          {faqTeaser.items.map((item, index) => (
            <details
              key={item.question}
              className={`group border-t border-moss/15 py-7 ${
                index === faqTeaser.items.length - 1 ? 'border-b' : ''
              }`}
            >
              <summary className="list-none cursor-pointer flex justify-between items-center gap-6 font-head font-medium text-moss text-[clamp(1.125rem,2vw,1.375rem)] leading-[1.3] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-moss text-xl group-open:rotate-45 transition-transform duration-300"
                >
                  +
                </span>
              </summary>
              <div className="mt-4 text-charcoal leading-[1.65] max-w-[60ch]">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
