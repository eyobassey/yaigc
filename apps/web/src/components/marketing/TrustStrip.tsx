import { trustStrip } from '@/content/landing-extras';

export function TrustStrip() {
  return (
    <section className="bg-cream-deep py-7 border-y border-moss/[0.06]">
      <div className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-stone">
        {trustStrip.map((item) => (
          <div key={item} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full bg-moss/60"
            />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
