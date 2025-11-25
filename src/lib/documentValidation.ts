import { Editor } from '@tiptap/core';
import { createBaseExtensions } from '../editor/extensions';
import type { AppStrings } from './i18n';

export const validateDocumentContent = (content: any, strings: AppStrings): boolean => {
    if (typeof content !== 'object' || content === null) return false;
    // Basic Tiptap document structure check
    if (content.type !== 'doc') return false;
    if (!Array.isArray(content.content)) return false;

    // Strict Schema Validation
    try {
        const extensions = createBaseExtensions(strings);
        // Create a headless editor to generate the schema
        const editor = new Editor({
            extensions,
            content: { type: 'doc', content: [] },
        });

        // Validate by trying to create a node from JSON
        // This will throw if the content doesn't match the schema
        editor.schema.nodeFromJSON(content);

        editor.destroy();
        return true;
    } catch (e) {
        console.warn('Schema validation failed:', e);
        return false;
    }
};
