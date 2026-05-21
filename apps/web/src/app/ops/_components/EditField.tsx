// Shared form primitives for operator-side edit pages. Kept simple:
// labels with explicit asterisks for required, inline hints, terracotta
// error states. Server actions decide validation; this just renders.

export function Field({
  name,
  label,
  type = 'text',
  required,
  defaultValue,
  error,
  hint,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta">
            *
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        className={`bg-cream border rounded-lg px-3.5 py-2.5 text-charcoal text-[0.9375rem] placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors ${
          error ? 'border-terracotta' : 'border-moss/15 focus:border-moss'
        }`}
      />
      {error ? (
        <p className="text-terracotta text-[0.8125rem]">{error}</p>
      ) : hint ? (
        <p className="text-stone text-[0.8125rem]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  rows = 4,
  error,
  hint,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta">
            *
          </span>
        ) : null}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? 'true' : undefined}
        className={`bg-cream border rounded-lg px-3.5 py-2.5 text-charcoal text-[0.9375rem] placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors resize-y leading-[1.55] ${
          error ? 'border-terracotta' : 'border-moss/15 focus:border-moss'
        }`}
      />
      {error ? (
        <p className="text-terracotta text-[0.8125rem]">{error}</p>
      ) : hint ? (
        <p className="text-stone text-[0.8125rem]">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({
  name,
  label,
  options,
  required,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
  error?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta">
            *
          </span>
        ) : null}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? 'true' : undefined}
        className={`bg-cream border rounded-lg px-3.5 py-2.5 text-charcoal text-[0.9375rem] focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors ${
          error ? 'border-terracotta' : 'border-moss/15 focus:border-moss'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-terracotta text-[0.8125rem]">{error}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer text-charcoal text-[0.9375rem] leading-[1.5]"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 w-4 h-4 rounded border-moss/30 text-moss focus:ring-moss/30 flex-shrink-0"
      />
      <span className="flex flex-col gap-0.5">
        <span>{label}</span>
        {hint ? <span className="text-stone text-[0.8125rem]">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col gap-4">
      <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone px-2 -ml-2">
        {title}
      </legend>
      {description ? (
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-2">{description}</p>
      ) : null}
      {children}
    </fieldset>
  );
}
