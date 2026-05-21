-- Migration: expand UserRole enum from 4 legacy values
-- (USER / COMPANION / OPERATOR / ADMIN) to the 8 SDD §12.9.1 values
-- (family_payer / family_viewer / companion / operator_coordinator /
--  operator_safeguarding / operator_finance / operator_admin /
--  operator_read_only).
--
-- Postgres enums cannot have values dropped in-place, so we
-- swap the type: create new, cast column via CASE, drop old, rename.

-- 1. Build the new enum type alongside the old one.
CREATE TYPE "UserRole_new" AS ENUM (
  'family_payer',
  'family_viewer',
  'companion',
  'operator_coordinator',
  'operator_safeguarding',
  'operator_finance',
  'operator_admin',
  'operator_read_only'
);

-- 2. Drop the default so the column type can be altered.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- 3. Migrate the column to the new type, mapping legacy values per SDD intent:
--    USER      → family_payer         (the default sign-up role)
--    COMPANION → companion            (1:1)
--    OPERATOR  → operator_coordinator (the default operator sub-role)
--    ADMIN     → operator_admin       (1:1 in intent)
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'USER'      THEN 'family_payer'::"UserRole_new"
      WHEN 'COMPANION' THEN 'companion'::"UserRole_new"
      WHEN 'OPERATOR'  THEN 'operator_coordinator'::"UserRole_new"
      WHEN 'ADMIN'     THEN 'operator_admin'::"UserRole_new"
    END
  );

-- 4. Retire the old type and adopt the new one under the original name.
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- 5. Restore default (now uses the new enum). Drop the User.role index
--    since enum identity changed; recreate it.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'family_payer';
