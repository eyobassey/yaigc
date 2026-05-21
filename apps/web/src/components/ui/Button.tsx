import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Shared button primitive for marketing pages. Operator console keeps
// its own EditField primitives because the visual language is denser
// and the variants do not overlap meaningfully.
//
// Polymorphic:
//   <Button>...</Button>                  — <button type="button">
//   <Button type="submit">...</Button>    — form submit
//   <Button href="/foo">...</Button>      — Next.js <Link>
//   <Button href="https://...">           — <a> (external; new tab opt-in)
//   <Button href="mailto:" / "tel:">      — <a>
//
// Variants:
//   primary (default)  — filled moss button. The headline CTA.
//   outline            — moss border + text, subtle hover. Secondary.
//
// Sizes:
//   cta (default)      — px-9 py-[1.125rem] text-base. The hero-CTA size.
//   small              — px-6 py-3 text-[0.9375rem]. For inline / form actions.

type Variant = 'primary' | 'outline';
type Size = 'cta' | 'small';

const BASE =
  'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200';

const SIZE: Record<Size, string> = {
  cta: 'px-9 py-[1.125rem] text-base',
  small: 'px-6 py-3 text-[0.9375rem]',
};

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-moss text-cream hover:bg-moss-dark hover:shadow-lg hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0',
  // Marketing-style outline: filled invert on hover. (Operator console
  // uses a subtler hover:bg-moss/5; those buttons keep their inline
  // classes since this primitive does not migrate the ops console.)
  outline:
    'border border-moss text-moss hover:bg-moss hover:text-cream',
};

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

type ButtonElProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | 'href'> & {
    href?: undefined;
  };

type AnchorProps = CommonProps & {
  href: string;
  /** Open in a new tab. Adds rel=noopener noreferrer. */
  newTab?: boolean;
  /** Forward additional attributes (form actions, name/value, etc. don't apply here). */
  ariaLabel?: string;
};

export type ButtonProps = ButtonElProps | AnchorProps;

function classes(variant: Variant, size: Size, extra?: string): string {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]}${extra ? ` ${extra}` : ''}`;
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'cta', className, children } = props;
  const cls = classes(variant, size, className);

  // Anchor / Link branch.
  if ('href' in props && props.href !== undefined) {
    const href = props.href;
    const isInternal = href.startsWith('/') || href.startsWith('#');
    if (isInternal && !props.newTab) {
      return (
        <Link href={href} className={cls} aria-label={props.ariaLabel}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className={cls}
        target={props.newTab ? '_blank' : undefined}
        rel={props.newTab ? 'noopener noreferrer' : undefined}
        aria-label={props.ariaLabel}
      >
        {children}
      </a>
    );
  }

  // Button element branch. Strip our own custom props before spreading.
  const {
    variant: _v,
    size: _s,
    className: _c,
    children: _ch,
    ...rest
  } = props;
  return (
    <button type="button" {...rest} className={cls}>
      {children}
    </button>
  );
}
