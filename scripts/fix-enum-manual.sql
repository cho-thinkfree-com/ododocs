-- Manual migration to fix enum type
-- This updates the enum type and data in the correct order

-- Step 1: Check current enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ShareLinkAccessType');

-- Step 2: Add 'link' to the enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'link' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ShareLinkAccessType')) THEN
        ALTER TYPE "ShareLinkAccessType" ADD VALUE 'link';
    END IF;
END $$;

-- Step 3: Update all 'link_only' values to 'link'
UPDATE share_links SET access_type = 'link' WHERE access_type = 'link_only';

-- Step 4: Remove 'link_only' from enum (requires recreating the type)
BEGIN;
CREATE TYPE "ShareLinkAccessType_new" AS ENUM ('private', 'link', 'public');
ALTER TABLE share_links ALTER COLUMN access_type TYPE "ShareLinkAccessType_new" USING (access_type::text::"ShareLinkAccessType_new");
DROP TYPE "ShareLinkAccessType";
ALTER TYPE "ShareLinkAccessType_new" RENAME TO "ShareLinkAccessType";
COMMIT;

-- Step 5: Verify
SELECT access_type, COUNT(*) FROM share_links GROUP BY access_type;
