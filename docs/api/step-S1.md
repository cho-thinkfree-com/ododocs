# Step S1 – Account Storage

Milestone A1 establishes the persistence layer that every authentication flow depends on. Accounts must keep normalized emails, hashed passwords, and optional metadata (legal name, recovery hints) while exposing find/create/update helpers that the Auth + Password Reset services can reuse.

## Prisma schema

```
model Account {
  id            String        @id @default(uuid())
  email         String        @unique
  passwordHash  String        @map("password_hash")
  status        AccountStatus @default(ACTIVE)
  legalName     String?       @map("legal_name")
  recoveryEmail String?       @map("recovery_email")
  recoveryPhone String?       @map("recovery_phone")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  sessions      Session[]
  passwordResetTokens PasswordResetToken[]
  memberships    WorkspaceMembership[]
  joinRequests   WorkspaceJoinRequest[]
}
```

Accounts are linked to `Session`, `PasswordResetToken`, workspace ownership, memberships, and join requests. Normalization rules (lower-casing + trimming) are applied before persistence.

## Repository surface

```
interface AccountRepository {
  create(data: CreateAccountInput): Promise<AccountEntity>
  findByEmail(email: string): Promise<AccountEntity | null>
  findById(id: string): Promise<AccountEntity | null>
  findAuthRecordByEmail(email: string): Promise<AccountWithPassword | null>
  findAuthRecordById(id: string): Promise<AccountWithPassword | null>
  updatePasswordHash(accountId: string, passwordHash: string): Promise<void>
  softDelete(accountId: string): Promise<void>
}
```

`CreateAccountInput` contains the normalized email, hashed password, optional `legalName`, recovery contact info, and status override. `PrismaAccountRepository` wraps Prisma to handle P2002 uniqueness errors by throwing `AccountAlreadyExistsError`.

## Account service

`AccountService` builds on the repository:

- `registerAccount` validates the payload, normalizes the email to lowercase, hashes the password via `Argon2PasswordHasher`, and delegates to `AccountRepository#create`.
- `findByEmail` routes normalized lookups to the repository.
- `updatePassword` hashes the new password before calling `updatePasswordHash`.

All public methods validate input via `zod` schemas so downstream callers (signup, password reset flows) receive sanitized data.

## Tests

`tests/backend/accounts/accountService.spec.ts` seeds an in-memory SQLite database using `createTestDatabase()`, then exercises:

- New account creation with normalized email, hashed password, and audit timings.
- Duplicate email rejection via `AccountAlreadyExistsError`.
- Case-insensitive `findByEmail` lookups that return stored metadata.

