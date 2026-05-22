'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  editCompanionByOperator,
  type EditCompanionState,
} from '@/lib/companion';
import { DAYS, PERIODS } from '@/lib/availability';

const initial: EditCompanionState = { ok: false };

const BOROUGHS = [
  { value: 'south_manchester', label: 'South Manchester' },
  { value: 'trafford', label: 'Trafford' },
  { value: 'stockport', label: 'Stockport' },
  { value: 'salford', label: 'Salford' },
];

const ENGAGEMENT_TYPES = [
  { value: 'worker', label: 'Worker' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'employed', label: 'Employed' },
];

const STATUSES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
];

interface InitialValues {
  firstName: string;
  lastName: string;
  borough: string;
  engagementType: string;
  status: string;
  hourlyRate: string;
  maxConcurrentMatches: number;
  bio: string;
  interests: string;
  availability: Record<string, unknown> | null;
}

interface Props {
  companionId: string;
  applicationId: string;
  initial: InitialValues;
  currentPhotoSrc: string | null;
}

export function EditCompanionForm({
  companionId,
  applicationId,
  initial: init,
  currentPhotoSrc,
}: Props) {
  const [state, action] = useFormState(editCompanionByOperator, initial);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPreviewError(null);
    const file = e.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      setPreviewError('Use a JPEG or PNG image.');
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPreviewError(
        `Photo too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`,
      );
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const displayedPhoto = previewUrl ?? currentPhotoSrc;
  const photoError = previewError ?? state.errors?.photo;

  // Sticky form values: prefer server-returned values when validation
  // failed (so the user keeps their typed input), otherwise initial.
  const v = (k: keyof InitialValues): string => {
    const fromState = state.values?.[k as string];
    if (fromState !== undefined) return fromState;
    const i = init[k];
    return typeof i === 'string' ? i : i == null ? '' : String(i);
  };

  const caveats =
    typeof init.availability?.caveats === 'string'
      ? init.availability.caveats
      : '';

  return (
    <form
      action={action}
      noValidate
      encType="multipart/form-data"
      className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.5rem,3vw,2.25rem)] flex flex-col gap-7"
    >
      <input type="hidden" name="companionId" value={companionId} />

      {state.errors?._form ? (
        <p className="text-terracotta text-sm">{state.errors._form}</p>
      ) : null}

      <Section title="Operator-managed">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="firstName"
            label="First name"
            required
            defaultValue={v('firstName')}
            error={state.errors?.firstName}
          />
          <Field
            name="lastName"
            label="Last name"
            required
            defaultValue={v('lastName')}
            error={state.errors?.lastName}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            name="borough"
            label="Borough"
            defaultValue={v('borough')}
            options={BOROUGHS}
            error={state.errors?.borough}
          />
          <Select
            name="status"
            label="Status"
            defaultValue={v('status')}
            options={STATUSES}
            error={state.errors?.status}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Select
            name="engagementType"
            label="Engagement"
            defaultValue={v('engagementType')}
            options={ENGAGEMENT_TYPES}
            error={state.errors?.engagementType}
          />
          <Field
            name="hourlyRate"
            label="Hourly rate (£)"
            type="number"
            step="0.01"
            required
            defaultValue={v('hourlyRate')}
            error={state.errors?.hourlyRate}
          />
          <Field
            name="maxConcurrentMatches"
            label="Max concurrent matches"
            type="number"
            step="1"
            required
            defaultValue={v('maxConcurrentMatches')}
            error={state.errors?.maxConcurrentMatches}
          />
        </div>
      </Section>

      <Section title="Photo">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex-shrink-0 relative">
            {displayedPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayedPhoto}
                alt={previewUrl ? 'New photo preview' : 'Current profile photo'}
                width="96"
                height="96"
                className={`w-[96px] h-[96px] rounded-full object-cover border ${
                  previewUrl ? 'border-moss ring-2 ring-moss/20' : 'border-moss/15'
                }`}
              />
            ) : (
              <div className="w-[96px] h-[96px] rounded-full bg-moss/10 flex items-center justify-center">
                <Heart size={28} strokeWidth={1.5} className="text-moss/40" aria-hidden="true" />
              </div>
            )}
            {previewUrl ? (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center font-body text-[0.6rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-moss text-paper whitespace-nowrap">
                Preview
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-w-[220px]">
            <label
              htmlFor="photo"
              className="block text-charcoal text-[0.9375rem] mb-2"
            >
              {currentPhotoSrc ? 'Replace photo' : 'Upload a photo'}{' '}
              <span className="text-stone text-[0.8125rem]">(optional)</span>
            </label>
            <input
              id="photo"
              ref={fileInputRef}
              name="photo"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handlePhotoChange}
              className="block w-full text-charcoal text-[0.875rem] file:mr-3 file:px-3 file:py-2 file:rounded file:border-0 file:bg-moss file:text-paper file:cursor-pointer hover:file:bg-moss-deep"
            />
            {photoError ? (
              <p className="text-terracotta text-[0.8125rem] mt-1">
                {photoError}
              </p>
            ) : (
              <p className="text-stone text-[0.8125rem] mt-1">
                JPEG or PNG, up to 5MB.
              </p>
            )}
            {previewUrl ? (
              <p className="text-stone text-[0.8125rem] mt-2">
                <button
                  type="button"
                  onClick={clearPreview}
                  className="text-moss underline hover:text-moss-deep"
                >
                  Keep the current photo instead
                </button>
                .
              </p>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Profile">
        <TextArea
          name="bio"
          label="Bio"
          rows={6}
          defaultValue={v('bio')}
          error={state.errors?.bio}
          hint="What families read when we propose this companion."
        />
        <TextArea
          name="interests"
          label="Interests"
          rows={4}
          defaultValue={v('interests')}
          error={state.errors?.interests}
        />
      </Section>

      <Section title="Availability">
        {state.errors?.availability ? (
          <p className="text-terracotta text-[0.8125rem]">
            {state.errors.availability}
          </p>
        ) : null}
        <AvailabilityGrid slots={init.availability} />
        <TextArea
          name="availabilityCaveats"
          label="Caveats (optional)"
          rows={2}
          defaultValue={caveats}
          hint="Bank holidays, school terms, anything that the grid alone can't capture."
        />
      </Section>

      <div className="flex items-center gap-3 flex-wrap">
        <SubmitButton />
        <a
          href={`/ops/companions/${applicationId}`}
          className="text-stone hover:text-moss text-[0.875rem]"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center font-body text-[0.9375rem] text-paper bg-moss hover:bg-moss-deep disabled:opacity-60 disabled:cursor-not-allowed rounded-full px-6 py-2.5 transition-colors"
    >
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  defaultValue,
  error,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  step?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-charcoal text-[0.9375rem]">
        {label}
        {required ? ' *' : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
      />
      {error ? <p className="text-terracotta text-[0.8125rem]">{error}</p> : null}
    </div>
  );
}

function Select({
  name,
  label,
  defaultValue,
  options,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-charcoal text-[0.9375rem]">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-terracotta text-[0.8125rem]">{error}</p> : null}
    </div>
  );
}

function TextArea({
  name,
  label,
  rows = 4,
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  rows?: number;
  defaultValue?: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-charcoal text-[0.9375rem]">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal leading-[1.55] focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
      />
      {error ? (
        <p className="text-terracotta text-[0.8125rem]">{error}</p>
      ) : hint ? (
        <p className="text-stone text-[0.8125rem]">{hint}</p>
      ) : null}
    </div>
  );
}

function AvailabilityGrid({
  slots,
}: {
  slots: Record<string, unknown> | null;
}) {
  function isChecked(dayKey: string, periodKey: string): boolean {
    if (!slots) return false;
    const v = slots[dayKey];
    return Array.isArray(v) && v.includes(periodKey);
  }
  return (
    <div className="bg-cream rounded-lg border border-moss/15 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[max-content_repeat(3,1fr)] gap-x-3 px-4 py-3 border-b border-moss/10 bg-cream-deep">
        <span aria-hidden="true" />
        {PERIODS.map((p) => (
          <div key={p.key} className="text-charcoal">
            <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
              {p.label}
            </div>
            <div className="text-stone text-[0.75rem]">{p.range}</div>
          </div>
        ))}
      </div>
      <ul className="divide-y divide-moss/10">
        {DAYS.map((d) => (
          <li
            key={d.key}
            className="grid grid-cols-3 sm:grid-cols-[max-content_repeat(3,1fr)] gap-x-3 gap-y-2 px-4 py-3"
          >
            <div className="col-span-3 sm:col-span-1 font-head text-moss text-[0.9375rem] font-medium">
              {d.label}
            </div>
            {PERIODS.map((p) => {
              const id = `slot-${d.key}-${p.key}`;
              return (
                <label
                  key={p.key}
                  htmlFor={id}
                  className="flex items-center gap-2 cursor-pointer text-charcoal text-[0.875rem]"
                >
                  <input
                    id={id}
                    type="checkbox"
                    name={`slot_${d.key}_${p.key}`}
                    defaultChecked={isChecked(d.key, p.key)}
                    className="w-4 h-4 rounded border-moss/30 text-moss focus:ring-moss/30 flex-shrink-0"
                  />
                  <span className="sm:hidden">{p.label}</span>
                  <span className="hidden sm:inline sr-only">
                    {d.label} {p.label}
                  </span>
                </label>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
