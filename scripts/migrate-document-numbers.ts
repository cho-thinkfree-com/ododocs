import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateDocumentNumbers() {
    console.log('Starting document number migration...')

    // Get all workspaces
    const workspaces = await prisma.workspace.findMany({
        select: { id: true, name: true }
    })

    for (const workspace of workspaces) {
        console.log(`\nProcessing workspace: ${workspace.name} (${workspace.id})`)

        // Get all documents in this workspace ordered by creation date
        const documents = await prisma.document.findMany({
            where: {
                workspaceId: workspace.id,
                documentNumber: null // Only update documents without numbers
            },
            orderBy: {
                createdAt: 'asc'
            },
            select: {
                id: true,
                title: true
            }
        })

        console.log(`  Found ${documents.length} documents to migrate`)

        // Assign sequential numbers
        for (let i = 0; i < documents.length; i++) {
            const documentNumber = i + 1
            await prisma.document.update({
                where: { id: documents[i].id },
                data: { documentNumber }
            })
            console.log(`  ✓ Assigned #${documentNumber} to "${documents[i].title}"`)
        }
    }

    console.log('\n✅ Migration completed successfully!')
}

migrateDocumentNumbers()
    .catch((error) => {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
