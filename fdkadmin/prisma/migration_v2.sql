-- FDK Rejestr v2 Migration
-- Run this BEFORE prisma db push to preserve data
-- Or use as custom migration step

-- 1. Add new enum values to Department
ALTER TYPE "Department" ADD VALUE IF NOT EXISTS 'KSIEGOWOSC';
ALTER TYPE "Department" ADD VALUE IF NOT EXISTS 'B2B';
ALTER TYPE "Department" ADD VALUE IF NOT EXISTS 'OPLATY';

-- 2. Create new enums
DO $$ BEGIN
  CREATE TYPE "Salutation" AS ENUM ('PAN', 'PANI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Language" AS ENUM ('PL', 'EN', 'RU');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('K', 'M');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add OCZEKUJE_NA_DEADLINE to CaseStatus
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'OCZEKUJE_NA_DEADLINE';

-- 4. Migrate HR_ENG cases to HR
UPDATE "Case" SET dept = 'HR' WHERE dept = 'HR_ENG';

-- 5. Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "login" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "dept" "Department",
  "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
  "gender" "Gender" NOT NULL DEFAULT 'K',
  "position" TEXT,
  "signatureBlock" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_login_key" ON "User"("login");
CREATE INDEX IF NOT EXISTS "User_login_idx" ON "User"("login");

-- 6. Create CaseHistory table
CREATE TABLE IF NOT EXISTS "CaseHistory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "caseId" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "field" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  CONSTRAINT "CaseHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CaseHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CaseHistory_caseId_idx" ON "CaseHistory"("caseId");

-- 7. Add new columns to Case
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "salutation" "Salutation" NOT NULL DEFAULT 'PAN';
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "language" "Language" NOT NULL DEFAULT 'PL';
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "takerId" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "deadlineSetAt" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "deadlineSetBy" TEXT;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "firstContactSentAt" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "extensionSentAt" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "alertNoDeadlineSent" BOOLEAN NOT NULL DEFAULT false;

-- 8. Make deadline nullable for new flow (existing cases keep their deadlines)
ALTER TABLE "Case" ALTER COLUMN "deadline" DROP NOT NULL;

-- 9. Add FK constraints
ALTER TABLE "Case" ADD CONSTRAINT "Case_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Case" ADD CONSTRAINT "Case_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 10. Add dept index on Case
CREATE INDEX IF NOT EXISTS "Case_dept_idx" ON "Case"("dept");

-- 11. Existing cases with deadline keep their status as-is (they already have deadlines)
-- New cases will use OCZEKUJE_NA_DEADLINE status

-- NOTE: After running this migration, run the seed script to:
-- - Create User records from Worker records
-- - Set up admin accounts
-- - Link existing cases to users where possible
