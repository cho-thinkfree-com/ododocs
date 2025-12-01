import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('=== Fixing ShareLinkAccessType enum ===\n')

    // Step 1: Add 'link' to enum
    console.log('Step 1: Adding "link" to enum...')
    try {
        await prisma.$executeRaw`ALTER TYPE "ShareLinkAccessType" ADD VALUE IF NOT EXISTS 'link'`
        console.log('✓ Added "link" to enum')
    } catch (e: any) {
        console.log('Note:', e.message)
    }

    // Step 2: Update data
    console.log('\nStep 2: Updating data from link_only to link...')
    const updated = await prisma.$executeRaw`
        UPDATE share_links 
        SET access_type = 'link' 
        WHERE access_type = 'link_only'
    `
    console.log(`✓ Updated ${updated} rows`)

    // Step 3: Recreate enum without link_only
    console.log('\nStep 3: Recreating enum without link_only...')
    await prisma.$executeRaw`
        BEGIN;
        CREATE TYPE "ShareLinkAccessType_new" AS ENUM ('private', 'link', 'public');
        ALTER TABLE share_links ALTER COLUMN access_type DROP DEFAULT;
        ALTER TABLE share_links ALTER COLUMN access_type TYPE "ShareLinkAccessType_new" 
            USING (access_type::text::"ShareLinkAccessType_new");
        ALTER TYPE "ShareLinkAccessType" RENAME TO "ShareLinkAccessType_old";
        ALTER TYPE "ShareLinkAccessType_new" RENAME TO "ShareLinkAccessType";
        DROP TYPE "ShareLinkAccessType_old";
        ALTER TABLE share_links ALTER COLUMN access_type SET DEFAULT 'link';
        COMMIT;
    `
    console.log('✓ Enum recreated')

    // Verify
    console.log('\n=== Verification ===')
    const enumValues = await prisma.$queryRaw`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ShareLinkAccessType')
        ORDER BY enumsortorder
    `
    console.log('Final enum values:', enumValues)

    const counts = await prisma.$queryRaw`
        SELECT access_type, COUNT(*) as count 
        FROM share_links 
        GROUP BY access_type
    `
    console.log('Data distribution:', counts)

    console.log('\n✅ Migration complete!')
}

main()
    .catch(e => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
