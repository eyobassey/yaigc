'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { requireCompanion } from '@/lib/auth-helpers';
import {
  parseAvailabilityFormData,
  hasAnyAvailability,
} from '@/lib/availability';
import {
  saveProfilePhoto,
  deleteProfilePhoto,
  ProfilePhotoValidationError,
} from '@/lib/companion-photo-storage';

const EditSchema = z.object({
  bio: z.string().trim().max(4000).optional(),
  interests: z.string().trim().max(2000).optional(),
});

export type EditProfileState = {
  ok: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string | undefined>;
};

export async function editCompanionProfile(
  _prev: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const { user, companion } = await requireCompanion('/companion/profile');

  const raw = {
    bio: String(formData.get('bio') ?? '').trim() || undefined,
    interests: String(formData.get('interests') ?? '').trim() || undefined,
  };
  const parsed = EditSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(
        parsed.error.issues.flatMap((i) => {
          const k = i.path[0];
          return typeof k === 'string' ? [[k, i.message]] : [];
        }),
      ),
      values: raw,
    };
  }
  const d = parsed.data;

  const slots = parseAvailabilityFormData(formData);
  if (!hasAnyAvailability(slots)) {
    return {
      ok: false,
      errors: { availability: 'Pick at least one time slot.' },
      values: raw,
    };
  }

  // Photo upload is optional; only replace when a non-empty file is
  // provided. We persist the new photo first, then update the row, then
  // delete the previous file - same-position-fault-tolerance pattern as
  // visit photos.
  const photoFile = formData.get('photo');
  const hasNewPhoto = photoFile instanceof File && photoFile.size > 0;

  // Look up the existing record to grab the previous filename (for
  // cleanup) and to keep current data if a field is left blank.
  const before = await prisma.companion.findUnique({
    where: { id: companion.id },
    select: { photoFilename: true, bio: true, interests: true, availability: true },
  });

  let newFilename: string | null = null;
  if (hasNewPhoto) {
    try {
      const saved = await saveProfilePhoto(companion.id, photoFile as File);
      newFilename = saved.filename;
    } catch (err) {
      if (err instanceof ProfilePhotoValidationError) {
        return { ok: false, errors: { photo: err.message }, values: raw };
      }
      console.error('[companion-profile] photo save failed', {
        companionId: companion.id,
        err,
      });
      return {
        ok: false,
        errors: { photo: 'Could not save the photo. Try again.' },
        values: raw,
      };
    }
  }

  await prisma.companion.update({
    where: { id: companion.id },
    data: {
      bio: d.bio ?? null,
      interests: d.interests ?? null,
      availability: slots as object,
      ...(newFilename ? { photoFilename: newFilename } : {}),
    },
  });

  // Cleanup the previous file once the new row is persisted.
  if (newFilename && before?.photoFilename) {
    await deleteProfilePhoto(companion.id, before.photoFilename);
  }

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'update',
    targetType: 'Companion',
    targetId: companion.id,
    metadata: {
      event: 'companion_profile_updated',
      via: 'companion_portal',
      photoReplaced: Boolean(newFilename),
    },
  });

  revalidatePath('/companion');
  revalidatePath('/companion/profile');
  revalidatePath(`/ops/companions/${companion.applicationId}`);
  redirect('/companion/profile');
  return { ok: true };
}
