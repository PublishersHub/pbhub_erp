# Multi-Org Account Refactor — Design Spec

- **Date:** 2026-05-01
- **Branch:** `refactor/multi-org-identity`
- **Status:** Approved (pending user review of this document)

## Summary

The current auth model treats every `(organization, email)` pair as a separate `User` row with its own password hash. A real human who belongs to two organizations would need two distinct logins. Login itself requires the user to know the organization slug up front.

This refactor introduces a global `Account` (one row per human) and demotes `User` to a per-org *membership*. Login becomes `(email, password)` only, and the user picks the active organization after authenticating. Mid-session org switching is a single API call that re-issues the access token.

## Goals

- One human, one credential. Same email + password works regardless of how many orgs they belong to.
- After a successful login, the user picks the org they want to operate in.
- Mid-session org switching without re-logging-in.
- Permission and authorization changes stay minimal — the existing per-org `User` is still what owns the role assignments and audit trail within an organization.
- Migration is safe to run on the dev database (no real production data to preserve).

## Non-goals

- Self-service organization creation (no "platform admin" concept added).
- Inviting an existing email into another org (no invitation flow built — admins still create users via existing endpoints, updated to find-or-create `Account`).
- Per-org display name overrides on `Account`.
- "Remember last-used org" persistence (acceptable as a localStorage follow-up; not part of this refactor).
- Adding a test framework. The project has no existing tests; manual verification covers this work.

## Design decisions

| # | Decision | Choice |
|---|---|---|
| Q1 | Org switching | Switch any time without relogin. Single-org JWT, with `POST /auth/switch-organization/:orgId` re-issuing the access token. |
| Q2 | Schema shape | Add `Account`, keep `User` as the per-org membership. All existing FKs to `users.id` remain unchanged. |
| Q3 | Migration | Wipe and re-seed (single destructive migration). Pre-prod DB; no data worth preserving. |
| Q4 | Field placement | Hybrid: `Account` holds `email`, `passwordHash`, `firstName`, `lastName`, `isActive` (global), `lastLoginAt`. `User` adds `isActive` (per-org disable). |
| Q5 | Token model | Refresh token = account-scoped (no org claim). Access token = org-scoped. Switch-org re-issues access only; refresh persists across switches. |
| Q6 | Single-membership login | Auto-route to dashboard when the account has exactly one active membership. Show the picker only when there are 2+. |
| Q7 | Org picker UX | Dedicated `/select-organization` page on first login, plus a persistent dropdown in the top nav for mid-session switching. |

## Data model

Three changes to `apps/api/prisma/schema.prisma`. Every other model is untouched.

### `Account` (new)

```prisma
model Account {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  firstName    String    @map("first_name")
  lastName     String    @map("last_name")
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  users         User[]
  refreshTokens RefreshToken[]

  @@map("accounts")
}
```

Email is **globally unique**. `isActive=false` blocks login regardless of memberships.

### `User` (modified — now a membership row)

```prisma
model User {
  id             String   @id @default(uuid())
  accountId      String   @map("account_id")
  organizationId String   @map("organization_id")
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  account      Account      @relation(fields: [accountId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id])

  // ALL existing relations preserved verbatim
  userRoles               UserRole[]
  employee                Employee?
  uploadedDocuments       EmployeeDocument[]
  notificationPreferences NotificationPreference[]
  notifications           Notification[]

  @@unique([accountId, organizationId])
  @@index([organizationId])
  @@map("users")
}
```

Removed columns: `email`, `password_hash`, `first_name`, `last_name`, `last_login_at`. Removed unique: `(organization_id, email)`. New unique: `(account_id, organization_id)` — one membership per account-per-org.

`User.isActive` is per-org disable, independent of `Account.isActive`. To deactivate someone in only one tenant, HR sets `User.isActive=false`. To globally ban, set `Account.isActive=false`.

### `RefreshToken` (modified — `userId` → `accountId`)

```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  accountId String    @map("account_id")
  tokenHash String    @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId])
  @@map("refresh_tokens")
}
```

A refresh token represents "this human is logged in," not "this human is logged in to this org."

### Tables left untouched

`employees.user_id`, `notifications.recipient_user_id`, `employee_documents.uploaded_by_user_id`, `onboarding_instances.created_by_user_id`, `onboarding_tasks.completed_by_user_id`, `notification_preferences.user_id`, `user_roles.user_id` — all keep pointing at `users.id`. Their meaning shifts subtly: "this person *within this organization* did X," which is the right semantics for an HR system.

## Authentication flow

### Endpoints

#### `POST /auth/login`

**Request:** `{ email: string, password: string }` — no `organizationSlug`.

**Resolution:**

1. Look up `Account` by email. If missing, inactive, or password mismatch → `401 Invalid email or password` (uniform error to avoid email enumeration).
2. Update `Account.lastLoginAt = now()`.
3. Issue an account-scoped refresh token (one row in `refresh_tokens`).
4. Find active memberships:
   ```sql
   SELECT u.*, o.id, o.name, o.slug
   FROM users u
   JOIN organizations o ON o.id = u.organization_id
   WHERE u.account_id = $1
     AND u.is_active = true
     AND o.is_active = true
   ```
5. Branch on count:
   - **0:** `403 Account has no active organization access`. Refresh token is **not** issued in this branch.
   - **1:** Mint an access token for that org. Return `{ accessToken, refreshToken, account, user, memberships, activeOrganizationId }`. Frontend goes straight to `/dashboard`.
   - **2+:** Return `{ refreshToken, account, memberships }` — **no access token yet**. Frontend redirects to `/select-organization`.

#### `POST /auth/select-organization`

**Auth:** the just-issued account-scoped refresh token (passed in body).

**Request:** `{ organizationId: string }`.

**Resolution:**

1. Verify refresh token (signature, not revoked, not expired). Resolve `accountId`.
2. Verify the account has an active membership in that org.
3. Mint a new access token. Return `{ accessToken, user, activeOrganizationId, memberships }`. Refresh token unchanged.

#### `POST /auth/switch-organization/:orgId`

**Auth:** existing access token (Authorization header). No body required.

The endpoint differs from `select-organization` only in the caller's auth state: `select-organization` is the post-login transition (caller has a refresh token, no access token), `switch-organization` is mid-session (caller has both, but only the access token matters for proving identity). Both reuse the same internal `issueAccessTokenForOrg(accountId, orgId)` helper. Refresh token is not touched.

#### `POST /auth/refresh`

**Request:** `{ refreshToken: string, organizationId?: string }`.

**Resolution:**

1. Validate refresh token, resolve account.
2. Pick target org: explicit `organizationId` if passed, else `organizationId` from the previous access token's claim if the client sent it.
3. Verify membership still exists and active in that org. If not, return `401` so the frontend can route the user back to `/select-organization`.
4. Rotate the refresh token (revoke old, mint new — preserves the existing rotation policy).
5. Mint new access token.

#### `GET /auth/me`

Returns:
```json
{
  "account": { "id", "email", "firstName", "lastName" },
  "activeOrganization": { "id", "name", "slug" },
  "user": { "id" },               // membership id within active org
  "roles": ["..."],
  "permissions": ["..."],
  "memberships": [{ "userId", "organizationId", "organizationName", "organizationSlug", "roles": ["..."] }]
}
```

`memberships` powers the nav dropdown without an extra round-trip.

#### `POST /auth/logout`

Unchanged conceptually. Body: `{ refreshToken }`. Server revokes the refresh token row. The access token expires on its own.

### JWT shape

**Access token** claims:
```
{
  sub: <accountId>,
  userId: <userId>,            // membership id (per-org user row) — used by RBAC and audit
  organizationId: <orgId>,
  iat, exp
}
```

**Refresh token** claims:
```
{
  sub: <accountId>,
  tokenId: <refresh_tokens.id>,
  iat, exp
}
```

The refresh token has no `organizationId` — that's the whole point.

### `AuthenticatedUser` type

```ts
export interface AuthenticatedUser {
  accountId: string;        // NEW
  userId: string;           // unchanged — still the per-org user row id
  email: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}
```

`JwtAccessStrategy.validate` is updated to load by `accountId` + `userId`, return both, and continue to fetch active permissions on every request (preserves the existing live-permission semantics — revoking a role takes effect on the next request).

## Frontend changes

### `/login` page (`apps/web/src/app/login/page.tsx`)

- Remove the org slug input.
- On submit, two outcomes:
  - **1 membership:** persist access + refresh tokens to localStorage, persist `activeOrganizationId`, route to `/dashboard`.
  - **2+ memberships:** persist refresh token + memberships to localStorage (no access token yet), route to `/select-organization`.

### `/select-organization` (new — `apps/web/src/app/select-organization/page.tsx`)

- Public route (not under the `(protected)` layout).
- Reads memberships from localStorage. If empty (deep-linked, no login state) → redirect to `/login`.
- Renders one card per membership: org name, the user's role chips for that org, and a "Continue" button.
- On click, calls `POST /auth/select-organization`, persists access token and `activeOrganizationId`, routes to `/dashboard`.

### Nav org switcher (`apps/web/src/components/layout/app-shell.tsx`)

- New dropdown beside the user-name block in the header. Renders the active org name + chevron.
- Open: shows all memberships with the active one highlighted.
- Click a different org: calls `POST /auth/switch-organization/:orgId`, swaps the access token in localStorage, calls `router.refresh()` to re-fetch the page with the new org context.
- Hidden when there's only one membership (no point).

### API client (`apps/web/src/lib/api.ts`)

- Refresh path: `tryRefreshToken` now also reads `getActiveOrgId()` from `lib/auth.ts` and passes it as `organizationId` in the refresh body.
- A new `getActiveOrgId() / setActiveOrgId(id)` pair in `lib/auth.ts` (localStorage-backed, separate from the access token).

### Auth context (`apps/web/src/context/auth-context.tsx`)

- `AuthUser` gains `accountId` and `memberships` and `activeOrganizationId`.
- `login()` becomes a thin wrapper that returns `{ status: 'authenticated' | 'needs_org_selection', ... }` so the page knows where to route.
- New helper `selectOrganization(orgId)` and `switchOrganization(orgId)` exposed on the context.

## Migration & seed

### Single migration

`apps/api/prisma/migrations/20260501XXXXXX_multi_org_identity/migration.sql`:

1. `CREATE TABLE accounts` (matches the Prisma model above).
2. `CREATE INDEX accounts_email_unique` (covered by the `@unique` directive).
3. `ALTER TABLE users DROP CONSTRAINT users_organization_id_email_key`.
4. `ALTER TABLE users DROP COLUMN email, DROP COLUMN password_hash, DROP COLUMN first_name, DROP COLUMN last_name, DROP COLUMN last_login_at`.
5. `ALTER TABLE users ADD COLUMN account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE`.
6. `ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE` *(if not already present — it is in the current schema, so this is a no-op)*.
7. `CREATE UNIQUE INDEX users_account_organization_unique ON users(account_id, organization_id)`.
8. `ALTER TABLE refresh_tokens RENAME COLUMN user_id TO account_id`.
9. `ALTER TABLE refresh_tokens DROP CONSTRAINT refresh_tokens_user_id_fkey`.
10. `ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE`.

The migration is **destructive on `users` data** because dropping `password_hash` cannot be reversed without source. That is acceptable per Q3.

### Seed (`apps/api/prisma/seed.ts`)

Updated sequence:

1. Upsert organization `pbhub` (unchanged).
2. Upsert permissions (unchanged).
3. Upsert system roles (unchanged).
4. Role-permission assignments (unchanged).
5. **New:** upsert `Account` for `admin@pbhub.com` (with `passwordHash`, `firstName`, `lastName`).
6. **Changed:** upsert `User` (membership) keyed by `(accountId, organizationId)`.
7. UserRole assignment (unchanged).
8. Notification templates (unchanged).

### Dev workflow

```bash
# After pulling this branch, on a fresh stack:
pnpm --filter api exec prisma migrate reset --force
# This drops the dev DB, reapplies all migrations including the new one, then runs the seed.
```

The seed admin login becomes:
- **Email:** `admin@pbhub.com`
- **Password:** `admin123`
- *(no org slug)*

## Service-layer changes

| File | Change |
|---|---|
| `apps/api/src/modules/auth/services/auth.service.ts` | Replace org-slug login with account-email login. Add `selectOrganization()` and `switchOrganization()` methods that share an internal `issueAccessTokenForOrg(accountId, orgId)` helper. |
| `apps/api/src/modules/auth/services/token.service.ts` | `generateAccessToken(accountId, userId, organizationId)` (was `(userId, organizationId)`). `generateRefreshToken(accountId)` (was `(userId)`). |
| `apps/api/src/modules/auth/strategies/jwt-access.strategy.ts` | Validate by `accountId + userId + organizationId`. Load the membership row, the account row, and active permissions. Reject if either side is inactive. |
| `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts` | Validate by `accountId`. |
| `apps/api/src/modules/auth/controllers/auth.controller.ts` | New routes: `POST /auth/select-organization`, `POST /auth/switch-organization/:orgId`. Updated `POST /auth/login` and `POST /auth/refresh`. |
| `apps/api/src/modules/auth/dto/login.dto.ts` | Drop `organizationSlug`. |
| `apps/api/src/modules/users/services/users.service.ts` | `findByOrgAndEmail(orgId, email)` → `findActiveMembership(accountId, orgId)`. `findByIdWithPermissions(userId)` stays — it still operates on the per-org user row. New: `findAccountByEmail(email)`, `findActiveMembershipsForAccount(accountId)`. |
| `apps/api/src/common/types/index.ts` | `AuthenticatedUser.accountId` added. |

Endpoints / services that reference user creation (e.g. anywhere HR creates a user inside an org) are updated to: find-or-create `Account` by email → create `User` (membership) for the target org. Out of scope to enumerate every HR-side user-create call site here; the spec for those changes lives with the implementation plan.

## Edge cases

- **Membership revoked mid-session.** The next request hits `JwtAccessStrategy.validate`, which reloads the user row. With `User.isActive=false` (or the row missing for that org), it throws `401`. The frontend's silent-refresh handler tries `/auth/refresh` with the current `organizationId`; the server denies. Frontend forces logout to `/login`.
- **Org deactivated mid-session.** Same path — the `validate` step joins `organizations.is_active=true`. `401` → re-login.
- **Account globally deactivated.** Refresh fails (`Account.isActive=false`). Existing access tokens still work until they expire (≤15 min). Acceptable for the dev stage; tighten later via an account-version claim if needed.
- **Account with 0 active memberships.** Login returns `403`. The frontend shows a clear error; user contacts admin.
- **Two browser tabs in two orgs.** Not a supported state. The single-tab access token is the source of truth. Switching in one tab will cause the other tab's next request to operate against the new org (since the token was swapped in localStorage).
- **Unique conflicts on seed.** The seed uses `upsert` with deterministic identifiers, so re-running is safe.
- **Migration replay (`prisma migrate reset`).** All artifacts on the way out are owned by Prisma migrations; `reset` is the supported entry point.

## Manual verification checklist

After implementation, verify in the local stack:

- [ ] Login with `admin@pbhub.com` / `admin123` (no org slug) succeeds and lands on `/dashboard`.
- [ ] Old login form (with org slug) is gone.
- [ ] Add a second org via Prisma Studio or seed, add a `User` membership for the admin in that org → login now lands on `/select-organization`. Picker shows both. Clicking either lands on `/dashboard` with that org's data.
- [ ] Nav dropdown lists both orgs with the active one highlighted; switching changes visible dashboard data.
- [ ] Logout returns to `/login`.
- [ ] Set `User.isActive=false` for the admin's `pbhub` membership while logged in there → next API call returns 401, frontend forces logout.
- [ ] Set `Account.isActive=false` → next refresh fails, frontend forces logout.
- [ ] Refresh-token rotation still works on access-token expiry (wait 15 min or shorten `JWT_ACCESS_EXPIRES_IN` to 30s during the test).

## Out of scope (deferred)

- Self-service organization creation. New orgs continue to be created via seed/SQL until a platform admin is added.
- Invitation flow (email an existing or new email into an org).
- Per-org display name / per-org profile picture overrides.
- "Remember last-used org" client-side persistence.
- Adding a Jest test harness for the auth service (sensible follow-up).
- An `account_version` claim for instant global account revocation.

## Risks

- **All dev sessions are wiped** by the migration (refresh tokens are intact but pointing at a renamed column; the migration drops/renames atomically so live sessions just fail and log the user back in once). Trivial in dev; not a real risk pre-prod.
- **Find-or-create-account on user creation** is a small semantic shift: HR creating a user with email `foo@bar.com` now reuses an existing `Account` if one exists. Spelling matters — case, trim, normalization. The plan should pick a normalization rule (lowercase + trim) and apply it on both sides (login and account-creation).
- **Refresh tokens issued in the 2+ memberships login branch**: if the user closes the tab before picking an org via `/auth/select-organization`, the refresh token row exists but no access token was minted. Harmless — the refresh expires per its TTL. If the user logs in again, a new refresh token is issued and the orphan one is left to expire on its own.
