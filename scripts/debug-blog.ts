
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const handle = 'aaaa'
    console.log(`Looking for blog handle: ${handle}`)

    const membership = await prisma.workspaceMembership.findUnique({
        where: { blogHandle: handle },
    })

    if (!membership) {
        console.log('Membership not found!')
        return
    }

    console.log(`Found membership: ${membership.id} (Account: ${membership.accountId})`)

    const documents = await prisma.document.findMany({
        where: {
            workspaceId: membership.workspaceId,
            ownerMembershipId: membership.id,
            OR: [
                { visibility: 'public' },
                { shareLinks: { some: { isPublic: true } } }
            ],
            deletedAt: null,
        },
        include: {
            shareLinks: true,
        },
    })

    console.log(`Found ${documents.length} documents for this member:`)
    documents.forEach(doc => {
        console.log(`- [${doc.title}] (ID: ${doc.id})`)
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
