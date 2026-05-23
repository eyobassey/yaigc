/**
 * scripts/lint-content.ts
 *
 * Brand voice guard. Runs in CI on every PR. Fails the build if any
 * customer-facing string contains a forbidden word or character.
 *
 * Scope of files scanned:
 *   - packages/content/src/.../*.ts
 *   - apps/web/src/content/.../*.{ts,tsx,mdx,md}
 *   - apps/web/src/app/(marketing)/...page.{tsx,mdx}
 *
 * Scope WITHIN a file:
 *   - String literals only (single, double, backtick-quoted).
 *   - Comments are NOT scanned (so the rules-of-the-road comment at the
 *     top of en-GB.ts is allowed to mention forbidden words to explain them).
 *
 * Run locally: pnpm tsx scripts/lint-content.ts
 */

import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';

interface Rule {
  name: string;
  pattern: RegExp;
  reason: string;
  /**
   * If present, occurrences that match this allow-list pattern are
   * considered acceptable. This is the nuance that lets us name what we are
   * not ("not a care agency") and refer to regulated partner services
   * ("home-care agency") without banning the underlying word entirely.
   */
  allowList?: RegExp[];
}

const RULES: Rule[] = [
  {
    name: 'care',
    pattern: /\bcare\b/i,
    reason: 'We deliver companionship, not care. Use only when naming what we are not, or referring to a regulated partner agency.',
    allowList: [
      /\bnot a care agency\b/i,
      /\bnot a regulated care\b/i,
      /\bnot a care provider\b/i,
      /\bpersonal care\b/i,
      /\bhome-care\b/i,
      /\bhome care\b/i,
      /\bclinical care\b/i,
      /\bcare role\b/i,
      /\bcare quality commission\b/i,
      /\bcqc\b/i,
      /\bcare act\b/i, // statute name (Care Act 2014)
      /\badult social care\b/i, // statutory term used in /about and /privacy
    ],
  },
  {
    name: 'elderly',
    pattern: /\belderly\b/i,
    reason: 'Use "older", "your mum", "your dad", "your gran", "your grandad", or name the person.',
  },
  {
    name: 'lonely / loneliness',
    pattern: /\blonel(y|iness)\b/i,
    reason: 'Name the solution, not the diagnosis. We talk about "good company", not "loneliness".',
  },
  {
    name: 'vulnerable',
    pattern: /\bvulnerable\b/i,
    reason: 'Operator-internal term only. Never customer-facing.',
    allowList: [
      // The operator console may need this term in internal labels. If/when
      // those appear, add a narrow allow-list pattern. Until then, fully blocked.
    ],
  },
  {
    name: 'befriender / befriending',
    pattern: /\bbefriend(er|ing)\b/i,
    reason: 'We have companions, not befrienders.',
  },
  {
    name: 'client',
    pattern: /\bclient\b/i,
    reason: 'We have families, recipients, and companions.',
    allowList: [
      /@prisma\/client/i, // npm package; not customer-facing
      /Client Component/i, // React/Next.js technical term in comments
      /\bclient-side\b/i, // technical term, never customer-facing
    ],
  },
  {
    name: 'service user',
    pattern: /\bservice user\b/i,
    reason: 'We have families, recipients, and companions.',
  },
  {
    name: 'em dash',
    pattern: /—/,
    reason: 'Em dash is forbidden. Use commas, semicolons, colons, parentheses, or hyphens.',
  },
  // -------------------------------------------------------------------------
  // R.6 / Design memo s6.2 - "Shape of the relationship", May 2026.
  //
  // These words are not banned because they are bad words. They are banned
  // because they belong to a different category of service (regulated
  // social-care / clinical-care), one we have been deliberate about not
  // being. Service drift is the most common reason an unregulated provider
  // gets a CQC letter. The lint is the gate.
  // -------------------------------------------------------------------------
  {
    name: 'goals',
    pattern: /\bgoals?\b/i,
    reason: 'Goals language is the language of regulated care. We help families breathe, not set objectives.',
  },
  {
    name: 'objectives',
    pattern: /\bobjectives?\b/i,
    reason: 'Same trap as "goals". The relationship is not a contract against measurable objectives.',
  },
  {
    name: 'outcomes',
    pattern: /\boutcomes?\b/i,
    reason: 'Outcomes is the language of the Adult Social Care Outcomes Framework. We are not commissioned against outcomes.',
  },
  {
    name: 'progress',
    pattern: /\bprogress\b/i,
    reason: 'We do not measure progress against an objective. Post-visit reports are observation, not performance.',
  },
  {
    name: 'milestones',
    pattern: /\bmilestones?\b/i,
    reason: 'Milestones belong to a planned intervention. The relationship is not on a roadmap.',
  },
  {
    name: 'kpis / metrics',
    pattern: /\b(kpis?|metrics?)\b/i,
    reason: 'No quantitative measurement of the recipient or the relationship. Operator analytics belongs in /ops/analytics, not user-facing copy.',
  },
  {
    name: 'wellbeing score',
    pattern: /\bwellbeing score\b/i,
    reason: 'No scoring of how the recipient is doing. The post-visit report is prose, not a number.',
  },
  {
    name: 'intervention',
    pattern: /\bintervention\b/i,
    reason: 'Intervention is a regulated-care term. We deliver a bit of company, not a planned intervention.',
  },
  {
    name: 'treatment',
    pattern: /\btreatment\b/i,
    reason: 'Treatment is clinical-care language. We do not treat anyone.',
    allowList: [
      // /privacy: GDPR-style enumeration of what we explicitly do not
      // collect. Same "name what we are not" pattern as the care rule.
      /\bmedical diagnoses or treatment\b/i,
    ],
  },
  {
    name: 'therapy',
    pattern: /\btherapy\b/i,
    reason: 'Therapy is clinical-care language. We are not therapists.',
    allowList: [
      // /terms section 3 "What we do not do" - listing regulated services
      // outside our scope. Naming what we are not is allowed everywhere.
      /\bnursing or therapy\b/i,
    ],
  },
  {
    name: 'programme',
    pattern: /\bprogramme\b/i,
    reason: 'Programme (UK) signals a planned intervention with milestones and outcomes. We do not run a programme.',
  },
];

const SCOPED_PATHS = [
  'packages/content/src/**/*.{ts,tsx}',
  'apps/web/src/content/**/*.{ts,tsx,mdx,md}',
  'apps/web/src/app/**/page.{tsx,mdx}',
];

interface Violation {
  file: string;
  line: number;
  excerpt: string;
  rule: string;
  reason: string;
}

/**
 * Extract every string literal from a TypeScript or JavaScript file, along
 * with its line number. Handles single, double, and template-string quotes.
 * Strips out comments before scanning.
 */
function extractStringLiterals(source: string): Array<{ line: number; content: string }> {
  // Strip /* ... */ block comments
  const noBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    // Preserve newlines so line numbers stay correct
    match.replace(/[^\n]/g, ' ')
  );
  // Strip // line comments
  const noComments = noBlockComments.replace(/\/\/[^\n]*/g, (match) =>
    match.replace(/./g, ' ')
  );

  const literals: Array<{ line: number; content: string }> = [];
  const lines = noComments.split('\n');
  const literalRe = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

  lines.forEach((line, idx) => {
    let m: RegExpExecArray | null;
    while ((m = literalRe.exec(line)) !== null) {
      literals.push({ line: idx + 1, content: m[2] });
    }
  });

  return literals;
}

function checkLiteral(
  file: string,
  line: number,
  content: string
): Violation[] {
  const violations: Violation[] = [];
  for (const rule of RULES) {
    if (!rule.pattern.test(content)) continue;
    const allowed = rule.allowList?.some((allow) => allow.test(content)) ?? false;
    if (allowed) continue;
    violations.push({
      file,
      line,
      excerpt: content.length > 100 ? content.slice(0, 100) + '...' : content,
      rule: rule.name,
      reason: rule.reason,
    });
  }
  return violations;
}

async function main(): Promise<void> {
  const files = await fg(SCOPED_PATHS, {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    dot: false,
  });
  if (files.length === 0) {
    console.log('No files in scope. Nothing to check.');
    return;
  }

  const allViolations: Violation[] = [];
  let totalLiterals = 0;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const literals = extractStringLiterals(source);
    totalLiterals += literals.length;
    for (const { line, content } of literals) {
      allViolations.push(...checkLiteral(file, line, content));
    }
  }

  if (allViolations.length === 0) {
    console.log(`Brand voice check PASSED.`);
    console.log(`Scanned ${totalLiterals} string literals across ${files.length} files.`);
    return;
  }

  console.error(`Brand voice check FAILED. Found ${allViolations.length} violation(s):\n`);
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Rule:    ${v.rule}`);
    console.error(`    Reason:  ${v.reason}`);
    console.error(`    Excerpt: ${v.excerpt}\n`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('Brand voice guard failed to run:', err);
  process.exit(2);
});
