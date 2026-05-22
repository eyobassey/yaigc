// Shared checkbox-grid component used by every form that lets the user
// pick tags from a canonical list + add anything else as free text.
// Underlying storage is a single text column joined with '; '; see
// src/lib/recipient-tags.ts for the parse + serialise helpers.
//
// Naming convention: each checkbox renders with input name
// `<fieldPrefix>_<tagKey>` where tagKey comes from tagToFormKey. The
// matching server action reads ticks for each tag in the canonical
// list and serialises with the leftover free-text content from a
// sibling textarea named `<fieldPrefix>Other`.

import { tagToFormKey, type TagList } from '@/lib/recipient-tags';

export function TagPicker({
  fieldPrefix,
  canonical,
  selected,
}: {
  fieldPrefix: string;
  canonical: TagList;
  selected: Set<string>;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Pick any that apply</legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {canonical.map((tag) => {
          const key = tagToFormKey(tag);
          return (
            <label
              key={tag}
              htmlFor={`${fieldPrefix}-${key}`}
              className="flex items-start gap-2 cursor-pointer text-charcoal text-[0.875rem] leading-[1.3] p-2.5 rounded-md border border-moss/10 hover:border-moss/30 hover:bg-cream-deep/40 transition-colors has-[:checked]:border-moss has-[:checked]:bg-moss/5"
            >
              <input
                id={`${fieldPrefix}-${key}`}
                type="checkbox"
                name={`${fieldPrefix}_${key}`}
                defaultChecked={selected.has(tag)}
                className="mt-0.5 w-4 h-4 rounded border-moss/30 text-moss focus:ring-moss/30 flex-shrink-0"
              />
              <span>{tag}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
