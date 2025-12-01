import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking for link_only values in database...')

    // Use raw query to check current values
    const result = await prisma.$queryRaw`
        SELECT access_type, COUNT(*) as count 
        FROM share_links 
        GROUP BY access_type
    `

    console.log('Current access_type distribution:', result)

    // Update any remaining link_only to link
    console.log('\nUpdating link_only to link...')
    const updated = await prisma.$executeRaw`
        UPDATE share_links 
        SET access_type = 'link'::\"ShareLinkAccessType\"
        WHERE access_type::text = 'link_only'
    `

    console.log(`Updated ${updated} rows`)

    // Verify
    const afterResult = await prisma.$queryRaw`
        SELECT access_type, COUNT(*) as count 
        FROM share_links 
        GROUP BY access_type
    `

    console.log('\nAfter update:', afterResult)
}

main()
    .catch(e => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
