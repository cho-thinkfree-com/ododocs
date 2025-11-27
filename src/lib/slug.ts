// Frontend slugify utility for generating URL-friendly slugs from document titles
export function slugify(value: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/--+/g, '-')

    return slug || 'untitled'
}
