import { brand } from '@igc/content';
import tokens from '@igc/design-tokens';

/**
 * Living styleguide. Renders every design token visibly so design QA can
 * spot-check the brand system on local + staging without opening Figma.
 *
 * Reachable at /styleguide on every environment. Not linked from the public
 * navigation; it is a tool surface, not a customer surface.
 */

export const metadata = {
  title: 'Styleguide  ·  You Are In Good Company',
  description: 'Living styleguide rendering the brand design tokens.',
  robots: { index: false, follow: false },
};

export default function StyleguidePage() {
  return (
    <main className="max-w-[1240px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)] py-16">
      <header className="mb-16">
        <p className="font-body text-xs uppercase tracking-[0.18em] text-stone mb-4">
          Living styleguide
        </p>
        <h1 className="font-head text-moss text-5xl md:text-6xl leading-tight">
          {brand.fullName}
        </h1>
        <p className="font-head italic text-terracotta text-2xl mt-4">{brand.tagline}</p>
        <p className="mt-8 text-charcoal max-w-prose">
          Every design token in {' '}
          <code className="font-mono text-sm bg-cream-deep px-1.5 py-0.5 rounded">
            @igc/design-tokens
          </code>
          {' '} rendered for visual QA. If something here looks wrong, the bug is in the tokens
          package; fix it there, never inline a hex code in a component.
        </p>
      </header>

      <Section title="Colours">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {Object.entries(tokens.colors).map(([name, value]) => (
            <Swatch key={name} name={name} value={value} />
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-8">
          <Type label="font-head 6xl">
            <h1 className="font-head text-6xl text-moss">You can&apos;t always be there.</h1>
          </Type>
          <Type label="font-head 5xl">
            <h1 className="font-head text-5xl text-moss">Companionship visits</h1>
          </Type>
          <Type label="font-head italic terracotta">
            <p className="font-head italic text-terracotta text-3xl">in good company.</p>
          </Type>
          <Type label="font-body 18px">
            <p className="font-body text-lg text-charcoal max-w-prose">
              A real visit from a real person, every week. Vetted, trained, insured.
              The same companion every time.
            </p>
          </Type>
          <Type label="font-body sm tracking-[0.18em] uppercase stone (eyebrow)">
            <p className="font-body text-sm uppercase tracking-[0.18em] text-stone">
              For families with a parent who lives alone
            </p>
          </Type>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-4 items-center">
          <button className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full bg-moss text-cream text-base font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px">
            Primary
          </button>
          <button className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full border border-moss text-moss text-base font-medium hover:bg-moss hover:text-cream transition-colors">
            Secondary
          </button>
          <button className="inline-flex items-center justify-center px-4 py-[1.125rem] text-moss text-base font-medium hover:text-terracotta transition-colors">
            Ghost
          </button>
        </div>
      </Section>

      <Section title="Border radii">
        <div className="flex flex-wrap gap-6 items-end">
          {Object.entries(tokens.radii).map(([name, value]) => (
            <div key={name} className="text-center">
              <div
                className="w-20 h-20 bg-sage/40 border border-moss/20"
                style={{ borderRadius: value }}
              />
              <p className="mt-2 text-xs text-stone">
                <strong className="text-charcoal">{name}</strong>
                <br />
                {value}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing tokens">
        <ul className="space-y-2 text-charcoal font-mono text-sm">
          {Object.entries(tokens.spacing).map(([name, value]) => (
            <li key={name}>
              <span className="text-stone">{name}:</span> {value}
            </li>
          ))}
        </ul>
      </Section>

      <footer className="mt-24 pt-12 border-t border-moss/15 text-center">
        <p className="font-head italic text-terracotta text-xl">{brand.closingLine}</p>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-20">
      <h2 className="font-head text-moss text-3xl mb-8 pb-2 border-b border-moss/20">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div>
      <div
        className="aspect-square rounded-lg border border-moss/10 shadow-sm"
        style={{ backgroundColor: value }}
        aria-hidden="true"
      />
      <p className="mt-2 text-sm">
        <strong className="text-charcoal">{name}</strong>
      </p>
      <p className="font-mono text-xs text-stone uppercase">{value}</p>
    </div>
  );
}

function Type({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-baseline pb-4 border-b border-moss/10">
      <p className="font-mono text-xs text-stone uppercase">{label}</p>
      <div>{children}</div>
    </div>
  );
}
