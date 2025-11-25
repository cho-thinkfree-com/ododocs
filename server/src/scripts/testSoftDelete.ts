import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find a document in a folder
    const doc = await prisma.document.findFirst({
        where: {
            folderId: { not: null },
            deletedAt: null
        },
        select: {
            id: true,
            title: true,
            folderId: true,
            workspaceId: true
        }
    })

    if (!doc) {
        console.log('❌ No documents in folders found to test')
        return
    }

    console.log(`📄 Found document: "${doc.title}"`)
    console.log(`   ID: ${doc.id}`)
    console.log(`   Current folderId: ${doc.folderId}`)

    // Find a membership for this workspace
    const membership = await prisma.workspaceMembership.findFirst({
        where: {
            workspaceId: doc.workspaceId,
            status: 'active'
        }
    })

    if (!membership) {
        console.log('❌ No active membership found')
        return
    }

    console.log(`\n📝 Testing softDelete with:`)
    console.log(`   membershipId: ${membership.id}`)
    console.log(`   folderId to save: ${doc.folderId}`)

    // Perform soft delete
    await prisma.document.update({
        where: { id: doc.id },
        data: {
            deletedAt: new Date(),
            deletedBy: membership.id,
            originalFolderId: doc.folderId
        }
    })

    console.log(`\n✅ Soft delete executed`)

    // Verify the result
    const updated = await prisma.document.findUnique({
        where: { id: doc.id },
        select: {
            id: true,
            title: true,
            folderId: true,
            deletedAt: true,
            deletedBy: true,
            originalFolderId: true
        }
    })

    console.log(`\n📊 Result:`)
    console.log(`   deletedAt: ${updated?.deletedAt}`)
    console.log(`   deletedBy: ${updated?.deletedBy}`)
    console.log(`   originalFolderId: ${updated?.originalFolderId}`)

    if (updated?.deletedBy && updated?.originalFolderId) {
        console.log(`\n✅ SUCCESS: Both deletedBy and originalFolderId are saved!`)
    } else {
        console.log(`\n❌ FAILED: Fields are still null`)
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e)
        prisma.$disconnect()
    })
