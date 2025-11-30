export function slugify(value: string): string {
    const slug = value
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with dashes

    return encodeURIComponent(slug) || 'untitled'
}
