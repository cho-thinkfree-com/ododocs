
import { BlogRepository, type BlogProfile, type BlogDocument } from './blogRepository.js';
import { StorageService } from '../storage/storageService.js';

export class BlogService {
    constructor(
        private blogRepository: BlogRepository,
        private storageService: StorageService
    ) { }

    async getProfileByHandle(handle: string): Promise<BlogProfile | null> {
        return this.blogRepository.findProfileByHandle(handle);
    }

    async getPublicDocuments(
        handle: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ documents: BlogDocument[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
        const profile = await this.blogRepository.findProfileByHandle(handle);

        if (!profile) {
            return {
                documents: [],
                pagination: { total: 0, page, limit, totalPages: 0 }
            };
        }

        const result = await this.blogRepository.findPublicDocuments(
            profile.membershipId,
            page,
            limit
        );

        return {
            documents: result.documents,
            pagination: {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
            },
        };
    }

    async getDocumentByHandleAndIndex(handle: string, documentNumber: number) {
        const profile = await this.blogRepository.findProfileByHandle(handle);
        if (!profile) return null;

        const result = await this.blogRepository.findDocumentByIndex(profile.membershipId, documentNumber);
        if (!result || !result.revision) return result;

        // Fetch content from storage
        if (result.revision.storageKey) {
            try {
                const buffer = await this.storageService.getObject(result.revision.storageKey);
                const contentJson = buffer.toString('utf-8');
                const content = JSON.parse(contentJson);

                return {
                    ...result,
                    revision: {
                        ...result.revision,
                        content
                    }
                };
            } catch (err) {
                console.error('Failed to load blog document content:', err);
                // Return result without content if fetch fails
                return result;
            }
        }

        return result;
    }

    async getProfileByMembershipId(membershipId: string): Promise<BlogProfile | null> {
        return this.blogRepository.findProfileByMembershipId(membershipId);
    }

    async getPublicDocumentsByMembershipId(
        membershipId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ documents: BlogDocument[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
        const result = await this.blogRepository.findPublicDocuments(
            membershipId,
            page,
            limit
        );

        return {
            documents: result.documents,
            pagination: {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
            },
        };
    }

    async checkHandleAvailability(handle: string): Promise<boolean> {
        // Validate handle format
        if (!/^[a-z0-9-_]+$/.test(handle)) {
            return false;
        }

        if (handle.length < 3 || handle.length > 50) {
            return false;
        }

        return this.blogRepository.checkHandleAvailability(handle);
    }
}
