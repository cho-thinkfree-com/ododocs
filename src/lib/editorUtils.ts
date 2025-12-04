import { resolveAssetUrls } from './api'

// Helper to traverse Tiptap JSON
export const traverseNodes = (node: any, callback: (node: any) => void) => {
    callback(node)
    if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child: any) => traverseNodes(child, callback))
    }
}

export const processContentForSave = (content: any): any => {
    const cloned = JSON.parse(JSON.stringify(content))
    traverseNodes(cloned, (node) => {
        if (node.type === 'image' || node.type === 'resizableImage') { // Check for both standard and resizable image types
            if (node.attrs && node.attrs['data-odocs-url']) {
                node.attrs.src = node.attrs['data-odocs-url']
                // We can keep data-odocs-url or remove it. Keeping it is fine.
            }
        }
    })
    return cloned
}

export const processContentForLoad = async (
    content: any,
    workspaceId: string,
    documentId: string,
    shareToken?: string
): Promise<any> => {
    const cloned = JSON.parse(JSON.stringify(content))
    const urlsToResolve: string[] = []

    // 1. Collect URLs
    traverseNodes(cloned, (node) => {
        if (node.type === 'image' || node.type === 'resizableImage') {
            if (node.attrs && node.attrs.src) {
                // Remote assets: Need API resolution to presigned URLs
                if (node.attrs.src.startsWith('odocsassets://remote/')) {
                    urlsToResolve.push(node.attrs.src)
                }
                // TODO: Future support for embedded assets
                // Embedded assets: Already have data in base64 format
                // else if (node.attrs.src.startsWith('odocsassets://embedded/')) {
                //   // Look up embedded asset data in document metadata
                //   // Replace with data:image/...;base64,... URL
                //   // No API call needed
                // }
            }
        }
    })

    if (urlsToResolve.length === 0) return cloned

    // 2. Resolve URLs
    try {
        const resolvedMap = await resolveAssetUrls(workspaceId, documentId, urlsToResolve, shareToken)

        // 3. Replace URLs
        traverseNodes(cloned, (node) => {
            if (node.type === 'image' || node.type === 'resizableImage') {
                if (node.attrs && node.attrs.src && resolvedMap[node.attrs.src]) {
                    node.attrs['data-odocs-url'] = node.attrs.src // Store original
                    node.attrs.src = resolvedMap[node.attrs.src] // Replace with presigned
                }
            }
        })
    } catch (err) {
        console.error('Failed to resolve asset URLs', err)
        // If resolution fails, we return the content as is (images will be broken but content preserved)
    }

    return cloned
}
