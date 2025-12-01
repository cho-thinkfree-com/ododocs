import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking enum values in database...')

    // Check current enum values
    const enumValues = await prisma.$queryRaw`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ShareLinkAccessType')
        ORDER BY enumsortorder
    `

    console.log('Current ShareLinkAccessType enum values:', enumValues)

    // Check if 'link' exists
    const hasLink = await prisma.$queryRaw`
        SELECT EXISTS(
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'link' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ShareLinkAccessType')
        ) as exists
    `

    console.log('Has "link" value:', hasLink)
}

main()
    .catch(e => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
