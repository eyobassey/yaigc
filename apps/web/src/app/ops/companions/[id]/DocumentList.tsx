'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { FileText, Trash2 } from 'lucide-react';
import {
  uploadCompanionDocument,
  archiveCompanionDocument,
  type UploadDocumentState,
} from '@/lib/companion';

const KIND_LABEL: Record<string, string> = {
  passport: 'Passport',
  brp: 'BRP',
  share_code_pdf: 'Share code PDF',
  visa_letter: 'Visa letter',
  ilr_document: 'ILR document',
  dbs_certificate: 'DBS certificate',
  other: 'Other',
};

const KIND_OPTIONS = Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }));

const initial: UploadDocumentState = { ok: false };

interface Doc {
  id: string;
  kind: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  description: string | null;
  uploadedAt: string;
}

export function DocumentList({
  applicationId,
  documents,
}: {
  applicationId: string;
  documents: Doc[];
}) {
  const [state, action] = useFormState(uploadCompanionDocument, initial);

  return (
    <div className="flex flex-col gap-4">
      {documents.length === 0 ? (
        <p className="text-stone text-[0.875rem]">No documents uploaded yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 p-3 rounded-md border border-moss/10 bg-cream"
            >
              <FileText
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className="text-moss flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-moss bg-moss/10 rounded px-1.5 py-0.5">
                    {KIND_LABEL[d.kind] ?? d.kind}
                  </span>
                  <time className="text-stone text-[0.75rem] font-mono">
                    {d.uploadedAt.slice(0, 10)}
                  </time>
                  <span className="text-stone text-[0.75rem]">
                    {formatSize(d.sizeBytes)}
                  </span>
                </div>
                {d.description ? (
                  <p className="text-charcoal text-[0.8125rem] mt-1 break-words">
                    {d.description}
                  </p>
                ) : null}
              </div>
              <a
                href={`/api/companion-documents/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link text-[0.8125rem] flex-shrink-0"
              >
                Open
              </a>
              <form action={archiveCompanionDocument}>
                <input type="hidden" name="documentId" value={d.id} />
                <button
                  type="submit"
                  aria-label="Archive document"
                  className="text-stone hover:text-terracotta transition-colors flex-shrink-0"
                  title="Archive (soft delete)"
                >
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="border-t border-moss/10 pt-3 flex flex-col gap-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
          Upload a document
        </p>
        <div className="grid sm:grid-cols-[1fr_max-content] gap-2">
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,application/pdf"
            required
            className="text-charcoal text-[0.875rem] file:mr-3 file:rounded-md file:border file:border-moss/20 file:bg-cream file:px-3 file:py-1.5 file:text-[0.8125rem] file:text-moss hover:file:bg-moss hover:file:text-cream file:transition-colors file:cursor-pointer"
          />
          <select
            name="kind"
            required
            className="bg-cream border border-moss/15 rounded-md px-3 py-1.5 text-charcoal text-[0.875rem] focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          name="description"
          maxLength={500}
          placeholder="Description (optional)"
          className="bg-cream border border-moss/15 rounded-md px-3 py-1.5 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
        />
        {state.errors?.file ? (
          <p className="text-terracotta text-[0.8125rem]">{state.errors.file}</p>
        ) : null}
        {state.errors?._form ? (
          <p className="text-terracotta text-[0.8125rem]">{state.errors._form}</p>
        ) : null}
        <UploadButton />
      </form>
    </div>
  );
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start inline-flex items-center justify-center px-4 py-2 rounded-md border border-moss/30 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Uploading…' : 'Upload'}
    </button>
  );
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
