
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const token = 'wCaKuxjF_SNCUHCXhONPZU6E1iwIO1Qa'
    const handle = 'aaaa'

    console.log(`Checking document with token: ${token}`)

    const shareLink = await prisma.documentShareLink.findUnique({
        where: { token },
        include: { document: true }
    })

    if (!shareLink) {
        console.log('Share link not found!')
        return
    }

    const doc = shareLink.document
    console.log(`Found document: [${doc.title}] (ID: ${doc.id})`)
    console.log(`  Status: ${doc.status}`)
    console.log(`  Visibility: ${doc.visibility}`)
    console.log(`  DeletedAt: ${doc.deletedAt}`)
    console.log(`  ShareLink Access Type: ${shareLink.accessType}`)

    console.log('--- Checking Blog Owner ---')
    const blogOwner = await prisma.workspaceMembership.findUnique({
        where: { blogHandle: handle }
    })

    if (!blogOwner) {
        console.log(`Blog handle ${handle} not found`)
        return
    }

    console.log(`Blog Owner ID: ${blogOwner.id}`)
    console.log(`Document Owner ID: ${doc.ownerMembershipId}`)
    console.log(`Workspace ID Match?: ${blogOwner.workspaceId === doc.workspaceId}`)
    console.log(`Owner ID Match?: ${blogOwner.id === doc.ownerMembershipId}`)

}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
