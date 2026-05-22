'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  editCompanionProfile,
  type EditProfileState,
} from '@/lib/companion-profile';
import { DAYS, PERIODS } from '@/lib/availability';

const initial: EditProfileState = { ok: false };

interface Props {
  initialBio: string;
  initialInterests: string;
  initialAvailability: Record<string, unknown> | null;
  initialDriverLicenceNumber: string;
  initialDriverLicenceExpiresAt: string;
  initialAddress: { line1: string; line2: string; city: string; postcode: string };
  initialMaxTravelMiles: string;
  currentPhotoSrc: string | null;
}

export function ProfileEditForm({
  initialBio,
  initialInterests,
  initialAvailability,
  initialDriverLicenceNumber,
  initialDriverLicenceExpiresAt,
  initialAddress,
  initialMaxTravelMiles,
  currentPhotoSrc,
}: Props) {
  const [state, action] = useFormState(editCompanionProfile, initial);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the blob URL whenever it changes or the form unmounts.
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

  const bio = state.values?.bio ?? initialBio;
  const interests = state.values?.interests ?? initialInterests;
  const caveats =
    typeof initialAvailability?.caveats === 'string'
      ? initialAvailability.caveats
      : '';

  return (
    <form
      action={action}
      noValidate
      encType="multipart/form-data"
      className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.5rem,3vw,2.25rem)] flex flex-col gap-7"
    >
      <Section title="Your photo">
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
                JPEG or PNG, up to 5MB. A friendly, well-lit head-and-shoulders
                photo works best.
              </p>
            )}
            {previewUrl ? (
              <p className="text-stone text-[0.8125rem] mt-2">
                This is how your new photo will appear.{' '}
                <button
                  type="button"
                  onClick={clearPreview}
                  className="text-moss underline hover:text-moss-deep"
                >
                  Keep the current one instead
                </button>
                .
              </p>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Your story">
        <TextArea
          name="bio"
          label="A few lines about you"
          rows={6}
          defaultValue={bio}
          error={state.errors?.bio}
          hint="What you do or have done, the kind of person you are, what families enjoy about you. The first thing a family reads about you."
        />
      </Section>

      <Section title="What you enjoy">
        <TextArea
          name="interests"
          label="Interests"
          rows={4}
          defaultValue={interests}
          error={state.errors?.interests}
          hint="Gardening, crosswords, music, a long chat over tea - whatever you bring to a visit."
        />
      </Section>

      <Section title="Your home address">
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-1">
          We keep this private. We use it to work out travel time when we
          propose visits, and it sits on file with the office.
        </p>
        <PlainField
          name="addressLine1"
          label="Address line 1"
          defaultValue={initialAddress.line1}
        />
        <PlainField
          name="addressLine2"
          label="Address line 2 (optional)"
          defaultValue={initialAddress.line2}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <PlainField
            name="addressCity"
            label="Town / city"
            defaultValue={initialAddress.city}
          />
          <PlainField
            name="addressPostcode"
            label="Postcode"
            defaultValue={initialAddress.postcode}
          />
        </div>
        <PlainField
          name="maxTravelMiles"
          label="How far you are happy to travel (miles, optional)"
          type="number"
          defaultValue={initialMaxTravelMiles}
        />
      </Section>

      <Section title="Driver's licence (optional)">
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-1">
          If you drive, tell us your licence number and when it expires.
          Upload a picture of the licence on the{' '}
          <a href="/companion/documents" className="link">
            Documents
          </a>{' '}
          page (pick "Driver's licence" as the type).
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <PlainField
            name="driverLicenceNumber"
            label="Licence number"
            defaultValue={initialDriverLicenceNumber}
          />
          <PlainField
            name="driverLicenceExpiresAt"
            type="date"
            label="Expiry date"
            defaultValue={initialDriverLicenceExpiresAt}
          />
        </div>
      </Section>

      <Section title="When you can visit">
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-1">
          Update every slot that usually works for you. Most companions tick
          two or three.
        </p>
        {state.errors?.availability ? (
          <p className="text-terracotta text-[0.8125rem]">
            {state.errors.availability}
          </p>
        ) : null}
        <AvailabilityGrid slots={initialAvailability} />
        <TextArea
          name="availabilityCaveats"
          label="Anything else (optional)"
          rows={2}
          defaultValue={caveats}
          hint='Caveats, exceptions, school holidays. "Not bank holidays" or "Wednesday evenings only every other week" is fine.'
        />
      </Section>

      <div className="flex items-center gap-3 flex-wrap">
        <SubmitButton />
        <a
          href="/companion/profile"
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
      {pending ? 'Saving…' : 'Save profile'}
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

function AvailabilityGrid({
  slots,
}: {
  slots: Record<string, unknown> | null;
}) {
  function isChecked(dayKey: string, periodKey: string): boolean {
    if (!slots) return false;
    const dayValue = slots[dayKey];
    if (!Array.isArray(dayValue)) return false;
    return dayValue.includes(periodKey);
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

function PlainField({
  name,
  label,
  type = 'text',
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-charcoal text-[0.9375rem]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
      />
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
  required,
}: {
  name: string;
  label: string;
  rows?: number;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-charcoal text-[0.9375rem]">
        {label}
        {required ? ' *' : null}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        required={required}
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
