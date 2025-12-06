import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface BlockLimitOptions {
    maxBlocks: number
    onLimitReached?: () => void
}

export const BlockLimit = Extension.create<BlockLimitOptions>({
    name: 'blockLimit',

    addOptions() {
        return {
            maxBlocks: 1000,
            onLimitReached: undefined,
        }
    },

    addProseMirrorPlugins() {
        const { maxBlocks, onLimitReached } = this.options

        return [
            new Plugin({
                key: new PluginKey('blockLimit'),
                filterTransaction: (transaction, state) => {
                    // Only check when the document changes
                    if (!transaction.docChanged) {
                        return true
                    }

                    // Count current top-level block nodes
                    let currentBlockCount = 0
                    state.doc.forEach((node) => {
                        if (node.isBlock) {
                            currentBlockCount++
                        }
                    })

                    // Allow initial content load (when doc is empty/default with 1 or fewer blocks)
                    if (currentBlockCount <= 1) {
                        return true
                    }

                    // Count new top-level block nodes
                    const newDoc = transaction.doc
                    let newBlockCount = 0
                    newDoc.forEach((node) => {
                        if (node.isBlock) {
                            newBlockCount++
                        }
                    })

                    // Allow if not adding blocks (editing existing or deleting)
                    if (newBlockCount <= currentBlockCount) {
                        return true
                    }

                    // Block only if adding new blocks AND exceeding limit
                    if (newBlockCount > maxBlocks) {
                        if (onLimitReached) {
                            onLimitReached()
                        }
                        return false
                    }

                    return true
                },
            }),
        ]
    },
})


