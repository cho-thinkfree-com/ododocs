import { PrismaClient } from '@prisma/client'
import { DocumentRepository } from '../modules/documents/documentRepository.js'

const prisma = new PrismaClient()
const documentRepository = new DocumentRepository(prisma)

async function cleanupOldTrash() {
    console.log('[Trash Cleanup] Starting cleanup of items older than 7 days...')

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    try {
        const deleted = await documentRepository.deleteOldTrashed(sevenDaysAgo)
        console.log(`[Trash Cleanup] Successfully deleted ${deleted} old items`)
    } catch (error) {
        console.error('[Trash Cleanup] Error during cleanup:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

cleanupOldTrash()
