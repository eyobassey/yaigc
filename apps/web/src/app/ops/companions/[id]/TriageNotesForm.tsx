import { updateApplicationNotes } from '@/lib/companion';

export function TriageNotesForm({
  applicationId,
  initialValue,
}: {
  applicationId: string;
  initialValue: string;
}) {
  return (
    <form action={updateApplicationNotes} className="flex flex-col gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <textarea
        name="triageNotes"
        rows={4}
        defaultValue={initialValue}
        placeholder="Operator-only notes. Audit-logged on save."
        className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.9375rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y leading-[1.55]"
      />
      <button
        type="submit"
        className="self-start inline-flex items-center px-4 py-1.5 rounded-full bg-moss text-cream text-[0.8125rem] font-medium hover:bg-moss-dark transition-colors"
      >
        Save notes
      </button>
    </form>
  );
}
