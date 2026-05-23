import { philosophyLine } from '@/content/landing-extras';

// Closing thought from the "Shape of the relationship" memo (May
// 2026). Sits between FounderNote (cream) and VisitGallery
// (cream-deep) as a quiet pause - paper white, italic, centred,
// no eyebrow, no attribution. The line carries itself.
export function PhilosophyLine() {
  return (
    <section className="bg-paper py-[clamp(3rem,8vw,6rem)]">
      <div className="max-w-[720px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] text-center">
        <blockquote className="font-head italic text-moss font-normal leading-[1.45] tracking-[-0.005em] text-[clamp(1.25rem,2.4vw,1.625rem)] space-y-3">
          {philosophyLine.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </blockquote>
      </div>
    </section>
  );
}
