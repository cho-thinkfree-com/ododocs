import type { ImageNodeAttributes } from 'mui-tiptap'
import { getAssetUploadUrl, uploadAssetToS3 } from './api'

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })

export const filesToImageAttributes = async (
  files: File[],
  context?: { workspaceId: string; documentId: string }
): Promise<ImageNodeAttributes[]> => {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))

  if (!context) {
    // Fallback to Data URL if no context (e.g. not in a workspace document)
    const sources = await Promise.all(imageFiles.map((file) => readFileAsDataUrl(file)))
    return sources
      .map((src, index) => ({
        src,
        alt: imageFiles[index]?.name ?? 'Embedded image',
        title: imageFiles[index]?.name,
      }))
      .filter((image) => Boolean(image.src))
  }

  // Upload to S3
  return Promise.all(
    imageFiles.map(async (file) => {
      try {
        // 1. Get Presigned URL
        const { uploadUrl, odocsUrl } = await getAssetUploadUrl(context.workspaceId, context.documentId, file.type)

        // 2. Upload
        await uploadAssetToS3(uploadUrl, file)

        // 3. Use Blob URL for immediate display, but store odocsUrl for saving
        // Note: We could also use the S3 URL if we had a way to get it immediately, 
        // but for drafts, we might need a separate view URL. 
        // For now, let's use the blob URL for the session.
        const src = URL.createObjectURL(file)

        return {
          src,
          alt: file.name,
          title: file.name,
          'data-odocs-url': odocsUrl, // Custom attribute to store the permanent URL
        }
      } catch (error) {
        console.error(`Failed to upload image ${file.name}:`, error)
        return null
      }
    })
  ).then((results) => results.filter((result): result is ImageNodeAttributes => result !== null))
}

