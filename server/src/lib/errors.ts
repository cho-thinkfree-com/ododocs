// Custom error classes for better error handling

export class NotFoundError extends Error {
    statusCode = 404

    constructor(resource: string = 'Resource') {
        super(`${resource} not found`)
        this.name = 'NotFoundError'
    }
}

export class UnauthorizedError extends Error {
    statusCode = 401

    constructor(message: string = 'Unauthorized') {
        super(message)
        this.name = 'UnauthorizedError'
    }
}

export class ForbiddenError extends Error {
    statusCode = 403

    constructor(message: string = 'Access denied') {
        super(message)
        this.name = 'ForbiddenError'
    }
}

export class BadRequestError extends Error {
    statusCode = 400

    constructor(message: string = 'Bad request') {
        super(message)
        this.name = 'BadRequestError'
    }
}

export class ConflictError extends Error {
    statusCode = 409

    constructor(message: string = 'Conflict') {
        super(message)
        this.name = 'ConflictError'
    }
}

export class ValidationError extends Error {
    statusCode = 422

    constructor(message: string = 'Validation failed') {
        super(message)
        this.name = 'ValidationError'
    }
}
