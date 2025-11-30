import { BlogRepository, type BlogProfile, type BlogDocument } from './blogRepository.js';

export class BlogService {
    constructor(private blogRepository: BlogRepository) { }

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
