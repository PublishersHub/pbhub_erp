# Multi-Org Identity Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global `Account` (one human → one credential) and demote `User` to a per-org membership. Login becomes `(email, password)` only; users with 2+ memberships pick an org after login; mid-session org switching is a single API call.

**Architecture:** Three Prisma model changes (new `Account`, modified `User`, modified `RefreshToken`); one destructive migration; auth module rewrites the login/refresh path and adds `select-organization` and `switch-organization` endpoints; frontend gains a `/select-organization` page and a persistent nav org switcher. All other tables that reference `users.id` are untouched — `User` keeps the same row id, just now means "membership."

**Tech Stack:** NestJS 10, Prisma 5 + PostgreSQL 16, Next.js 14 App Router, Tailwind, JWT (access + refresh), passport-jwt, class-validator.

**Spec:** `docs/superpowers/specs/2026-05-01-multi-org-account-design.md`.

**Branch:** `refactor/multi-org-identity`.

**Testing approach:** No tests (per spec: project has none, not adding a framework as part of this refactor). Each task ends with a manual verification step using `curl`, Prisma Studio, or the browser.

---

## Phase 1 — Schema, migration, seed

### Task 1: Update Prisma schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma:40-133`, `apps/api/prisma/schema.prisma:214-226`

- [ ] **Step 1: Add `Account` model and link from `Organization`'s relations to it**

In `apps/api/prisma/schema.prisma`, find the existing `Organization` model (line 40) and replace its `users User[]` relation declaration with the same — no change there. Then directly **after** the `Organization` model and **before** the `User` model, add this `Account` model:

```prisma
// ============================================
// Accounts — global identity (one human, one row).
// Memberships in organizations are represented by User rows.
// ============================================

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

- [ ] **Step 2: Replace the `User` model**

Replace the entire existing `User` model (lines 109-133) with:

```prisma
// ============================================
// User — membership of an account in an organization.
// Identity (email/password/name) lives on Account.
// All FKs in the rest of the schema that say userId still
// point here — they now mean "this person within this org".
// ============================================

model User {
  id             String   @id @default(uuid())
  accountId      String   @map("account_id")
  organizationId String   @map("organization_id")
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  account      Account      @relation(fields: [accountId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id])

  userRoles               UserRole[]
  employee                Employee?
  uploadedDocuments       EmployeeDocument[]
  notificationPreferences NotificationPreference[]
  notifications           Notification[]

  @@unique([accountId, organizationId])
  @@index([accountId])
  @@index([organizationId])
  @@map("users")
}
```

- [ ] **Step 3: Replace the `RefreshToken` model**

Replace the existing `RefreshToken` model (lines 214-226) with:

```prisma
// ============================================
// Refresh Tokens — account-scoped (no org claim).
// One refresh token represents "this human is logged in."
// ============================================

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

- [ ] **Step 4: Format the schema and verify it parses**

Run:
```bash
docker compose exec -T api pnpm --filter api exec prisma format
```

Expected: completes silently, exits 0. The schema file has been auto-formatted.

Run:
```bash
docker compose exec -T api pnpm --filter api exec prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid 🚀`.

---

### Task 2: Generate the migration and re-generate the Prisma client

**Files:**
- Create: `apps/api/prisma/migrations/<timestamp>_multi_org_identity/migration.sql` (Prisma generates this)

- [ ] **Step 1: Generate the migration without applying yet**

Run:
```bash
docker compose exec -T api pnpm --filter api exec prisma migrate dev --create-only --name multi_org_identity
```

Expected: a new directory `apps/api/prisma/migrations/<timestamp>_multi_org_identity/` containing `migration.sql`. The command **may** offer a destructive warning about losing data — accept it.

- [ ] **Step 2: Inspect the generated SQL and verify it matches the spec**

Read the generated file (path printed by step 1). It should contain (order may vary):
- `CREATE TABLE accounts ...` with the columns from the spec.
- `CREATE UNIQUE INDEX accounts_email_key ON accounts(email)`.
- `ALTER TABLE users DROP COLUMN email, DROP COLUMN password_hash, DROP COLUMN first_name, DROP COLUMN last_name, DROP COLUMN last_login_at` (or equivalent individual drops).
- `ALTER TABLE users DROP CONSTRAINT users_organization_id_email_key` (or the actual constraint name).
- `ALTER TABLE users ADD COLUMN account_id UUID NOT NULL` + foreign key.
- `CREATE UNIQUE INDEX users_account_id_organization_id_key ON users(account_id, organization_id)`.
- `ALTER TABLE refresh_tokens DROP CONSTRAINT refresh_tokens_user_id_fkey`.
- `ALTER TABLE refresh_tokens RENAME COLUMN user_id TO account_id` (or DROP/ADD if Prisma chooses that path).
- `ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE`.

If Prisma's plan is to DROP and re-create `refresh_tokens.user_id` (rather than RENAME) and that drops existing rows, that's fine — refresh tokens are throwaway in dev.

If `users.account_id` is added as `NOT NULL` without a DEFAULT and no UPDATE, the migration will fail to apply when run against a DB with existing user rows. We don't care because the next step uses `migrate reset` which re-creates everything.

- [ ] **Step 3: Reset the DB to apply the new migration cleanly**

Run:
```bash
docker compose exec -T api pnpm --filter api exec prisma migrate reset --force --skip-seed
```

Expected:
```
Database reset successful

The following migration(s) have been applied:
... (lists every migration including the new multi_org_identity one)
```

`--skip-seed` because the seed hasn't been updated yet — we'll re-run it after Task 3.

- [ ] **Step 4: Confirm the new tables/columns exist via psql**

Run:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c "\d accounts" -c "\d users" -c "\d refresh_tokens"
```

Expected: three tables described. Confirm:
- `accounts` has the columns from the spec.
- `users` has `account_id` (NOT NULL) and **does not** have `email`, `password_hash`, `first_name`, `last_name`, `last_login_at`.
- `users` has a unique index on `(account_id, organization_id)`.
- `refresh_tokens` has `account_id` (not `user_id`).

- [ ] **Step 5: Re-generate the Prisma client to pick up the new types**

This is automatic during `migrate dev` but is a no-op safety net:
```bash
docker compose exec -T api pnpm --filter api exec prisma generate
```

Expected: `✔ Generated Prisma Client (v5.22.0)`.

---

### Task 3: Update the seed script

**Files:**
- Modify: `apps/api/prisma/seed.ts:362-393`

- [ ] **Step 1: Replace the Super Admin user upsert with an account-then-user flow**

Open `apps/api/prisma/seed.ts`. Find the section `// 5. Super Admin user` (around line 360). Replace lines 361 through 393 (everything from `const passwordHash = ...` through the end of the `userRole.upsert` call) with this code:

```typescript
  // 5. Super Admin account + membership in the seed org
  const passwordHash = await bcrypt.hash('admin123', 12);

  const account = await prisma.account.upsert({
    where: { email: 'admin@pbhub.com' },
    update: {},
    create: {
      email: 'admin@pbhub.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });
  console.log(`Account: ${account.email} (${account.id})`);

  const superAdmin = await prisma.user.upsert({
    where: {
      accountId_organizationId: {
        accountId: account.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      accountId: account.id,
      organizationId: org.id,
      isActive: true,
    },
  });

  // Assign super_admin role
  const superAdminRoleId = roleMap.get('super_admin')!;
  await prisma.userRole.upsert({
    where: {
      userId_roleId_organizationId: {
        userId: superAdmin.id,
        roleId: superAdminRoleId,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRoleId,
      organizationId: org.id,
    },
  });
  console.log(`Super Admin: ${account.email} (password: admin123)`);
```

- [ ] **Step 2: Run the seed and verify it succeeds**

Run:
```bash
docker compose exec -T api pnpm --filter api exec prisma db seed
```

Expected output ends with:
```
Account: admin@pbhub.com (<uuid>)
Super Admin: admin@pbhub.com (password: admin123)
Notification templates: 35 system defaults seeded
Seed complete.
```

- [ ] **Step 3: Verify rows exist via psql**

Run:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c "SELECT id, email FROM accounts;" -c "SELECT id, account_id, organization_id, is_active FROM users;"
```

Expected: one row in `accounts` (admin@pbhub.com), one row in `users` linking that account to the seed org.

---

### Task 4: Commit Phase 1

- [ ] **Step 1: Stage and commit the schema, migration, and seed changes**

Run:
```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/prisma/seed.ts
git status
```

Expected: the new migration directory, the modified schema, and the modified seed are staged.

Run:
```bash
git commit -m "$(cat <<'EOF'
refactor(auth): split User into Account + per-org membership

Adds a global Account (email + passwordHash + name + global isActive)
and demotes User to a per-org membership keyed on (accountId, orgId).
RefreshToken is now account-scoped. Includes destructive migration
and updated seed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds, no pre-commit hook failures.

---

## Phase 2 — Backend auth module

### Task 5: Update `AuthenticatedUser` type

**Files:**
- Modify: `apps/api/src/common/types/index.ts`

- [ ] **Step 1: Add `accountId`**

Replace the entire contents of `apps/api/src/common/types/index.ts` with:

```typescript
export interface AuthenticatedUser {
  accountId: string;
  userId: string;
  email: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}
```

- [ ] **Step 2: Verify TypeScript still compiles (will reveal call-sites that need updating)**

Run:
```bash
docker compose logs --tail 50 api
```

Expected: TypeScript errors in services/strategies that produce or consume `AuthenticatedUser` — that's intentional; the next tasks fix them.

---

### Task 6: Update auth DTOs

**Files:**
- Modify: `apps/api/src/modules/auth/dto/login.dto.ts`
- Modify: `apps/api/src/modules/auth/dto/auth-response.dto.ts`
- Modify: `apps/api/src/modules/auth/dto/refresh-token.dto.ts`
- Create: `apps/api/src/modules/auth/dto/select-organization.dto.ts`

- [ ] **Step 1: Drop the org slug from `LoginDto`**

Replace `apps/api/src/modules/auth/dto/login.dto.ts` entirely with:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@pbhub.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
```

- [ ] **Step 2: Add an optional `organizationId` to `RefreshTokenDto`**

Replace `apps/api/src/modules/auth/dto/refresh-token.dto.ts` entirely with:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiPropertyOptional({ description: 'Org to mint the new access token for. Defaults to the prior token\'s org if omitted.' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
```

- [ ] **Step 3: Create `SelectOrganizationDto`**

Create `apps/api/src/modules/auth/dto/select-organization.dto.ts` with:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SelectOrganizationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty()
  @IsUUID()
  organizationId: string;
}
```

- [ ] **Step 4: Update `AuthResponseDto` to expose memberships and a possibly-null access token**

Replace `apps/api/src/modules/auth/dto/auth-response.dto.ts` entirely with:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MembershipDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  organizationSlug: string;

  @ApiProperty({ type: [String] })
  roles: string[];
}

class AccountProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

class ActiveUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ type: [String] })
  roles: string[];

  @ApiProperty({ type: [String] })
  permissions: string[];
}

export class AuthResponseDto {
  @ApiPropertyOptional({ description: 'Present when an org was selected (single membership or post-pick).' })
  accessToken?: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: AccountProfileDto })
  account: AccountProfileDto;

  @ApiPropertyOptional({ type: ActiveUserDto, description: 'Present when an org was selected.' })
  user?: ActiveUserDto;

  @ApiPropertyOptional({ description: 'Present when an org was selected.' })
  activeOrganizationId?: string;

  @ApiProperty({ type: [MembershipDto] })
  memberships: MembershipDto[];
}
```

---

### Task 7: Refactor `TokenService`

**Files:**
- Modify: `apps/api/src/modules/auth/services/token.service.ts`

- [ ] **Step 1: Replace the entire file**

Replace `apps/api/src/modules/auth/services/token.service.ts` contents with:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate a JWT access token (short-lived).
   * Claims: sub=accountId, userId=membership-row id, organizationId.
   */
  generateAccessToken(accountId: string, userId: string, organizationId: string): string {
    return this.jwtService.sign(
      { sub: accountId, userId, organizationId },
      {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
        expiresIn: this.configService.get<string>('app.jwt.accessExpiresIn'),
      },
    );
  }

  /**
   * Generate an account-scoped refresh token.
   */
  async generateRefreshToken(accountId: string): Promise<string> {
    const expiresIn = this.configService.get<string>('app.jwt.refreshExpiresIn', '7d');
    const expiresAt = this.calculateExpiry(expiresIn);

    const record = await this.prisma.refreshToken.create({
      data: {
        accountId,
        tokenHash: '',
        expiresAt,
      },
    });

    const token = this.jwtService.sign(
      { sub: accountId, tokenId: record.id },
      {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn,
      },
    );

    const tokenHash = this.hashToken(token);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { tokenHash },
    });

    return token;
  }

  verifyRefreshToken(rawToken: string): { accountId: string; tokenId: string } | null {
    try {
      const payload = this.jwtService.verify(rawToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
      });
      if (!payload.sub || !payload.tokenId) return null;
      return { accountId: payload.sub, tokenId: payload.tokenId };
    } catch {
      return null;
    }
  }

  async validateRefreshToken(tokenId: string, rawToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
    });

    if (!record || record.revokedAt) return null;
    if (record.expiresAt < new Date()) return null;

    const hash = this.hashToken(rawToken);
    if (hash !== record.tokenHash) return null;

    return record;
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Atomically revoke a refresh token only if it belongs to the given account
   * and has not already been revoked.
   */
  async revokeOwnedRefreshToken(tokenId: string, accountId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllAccountTokens(accountId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 86_400_000;

    return new Date(now.getTime() + value * ms);
  }
}
```

---

### Task 8: Refactor `JwtAccessStrategy`

**Files:**
- Modify: `apps/api/src/modules/auth/strategies/jwt-access.strategy.ts`

- [ ] **Step 1: Replace the file**

Replace `apps/api/src/modules/auth/strategies/jwt-access.strategy.ts` with:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/services/users.service';

interface JwtAccessPayload {
  sub: string;            // accountId
  userId: string;         // membership id
  organizationId: string;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('app.jwt.accessSecret'),
      ignoreExpiration: false,
    });
  }

  /**
   * Loads the account + the per-org membership + active permissions on every
   * request. Rejects if either the account or the membership is inactive,
   * or if the org doesn't match.
   */
  async validate(payload: JwtAccessPayload) {
    const profile = await this.usersService.findActiveAuthContext(
      payload.sub,
      payload.userId,
      payload.organizationId,
    );

    if (!profile) {
      throw new UnauthorizedException('Session no longer valid');
    }

    return profile;
  }
}
```

---

### Task 9: Refactor `JwtRefreshStrategy`

**Files:**
- Modify: `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts`

- [ ] **Step 1: Replace the file**

Replace `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts` with:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

interface JwtRefreshPayload {
  sub: string;       // accountId
  tokenId: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: configService.get<string>('app.jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const refreshToken = req.body.refreshToken;
    return {
      accountId: payload.sub,
      tokenId: payload.tokenId,
      refreshToken,
    };
  }
}
```

---

### Task 10: Refactor `UsersService`

**Files:**
- Modify: `apps/api/src/modules/users/services/users.service.ts`

- [ ] **Step 1: Replace the file**

Replace `apps/api/src/modules/users/services/users.service.ts` with:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find an account by email (case-insensitive). Returns null if missing
   * or inactive.
   */
  async findActiveAccountByEmail(email: string) {
    const account = await this.prisma.account.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!account || !account.isActive) return null;
    return account;
  }

  /**
   * List all active memberships for an account, restricted to active orgs.
   * Returns the data the frontend needs to render the picker.
   */
  async findActiveMembershipsForAccount(accountId: string) {
    const memberships = await this.prisma.user.findMany({
      where: {
        accountId,
        isActive: true,
        organization: { isActive: true },
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        userRoles: {
          include: { role: { select: { slug: true, isActive: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      userId: m.id,
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      roles: m.userRoles
        .filter((ur) => ur.role.isActive)
        .map((ur) => ur.role.slug),
    }));
  }

  /**
   * Verify (account, membership, org) is consistent and active, and return
   * the full AuthenticatedUser context. Called on every authenticated request.
   */
  async findActiveAuthContext(
    accountId: string,
    userId: string,
    organizationId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        accountId,
        organizationId,
        isActive: true,
        account: { isActive: true },
        organization: { isActive: true },
      },
      include: {
        account: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const activeUserRoles = user.userRoles.filter((ur) => ur.role.isActive);
    const roles = activeUserRoles.map((ur) => ur.role.slug);
    const permissions = [
      ...new Set(
        activeUserRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    return {
      accountId: user.account.id,
      userId: user.id,
      email: user.account.email,
      organizationId: user.organizationId,
      firstName: user.account.firstName,
      lastName: user.account.lastName,
      roles,
      permissions,
    };
  }

  /**
   * Confirm an account has an active membership in a specific org.
   * Returns the membership row id, or null.
   */
  async findActiveMembershipUserId(
    accountId: string,
    organizationId: string,
  ): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        accountId,
        organizationId,
        isActive: true,
        account: { isActive: true },
        organization: { isActive: true },
      },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async updateAccountLastLogin(accountId: string): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { lastLoginAt: new Date() },
    });
  }
}
```

- [ ] **Step 2: Confirm `UsersModule` exports `UsersService`**

Read `apps/api/src/modules/users/users.module.ts`. Verify it has `providers: [UsersService]` and `exports: [UsersService]`. If not, add `exports: [UsersService]`. (It already does — this is a sanity check.)

---

### Task 11: Refactor `AuthService`

**Files:**
- Modify: `apps/api/src/modules/auth/services/auth.service.ts`

- [ ] **Step 1: Replace the file**

Replace `apps/api/src/modules/auth/services/auth.service.ts` with:

```typescript
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../users/services/users.service';
import { TokenService } from './token.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Validate (email, password) against Account. Returns account + memberships
   * + tokens. If the account has exactly one active membership the response
   * also includes an org-scoped access token; otherwise the frontend must
   * call /auth/select-organization next.
   */
  async login(dto: LoginDto) {
    const account = await this.usersService.findActiveAccountByEmail(dto.email);
    if (!account) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, account.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const memberships = await this.usersService.findActiveMembershipsForAccount(
      account.id,
    );
    if (memberships.length === 0) {
      throw new ForbiddenException('Account has no active organization access');
    }

    await this.usersService.updateAccountLastLogin(account.id);

    const refreshToken = await this.tokenService.generateRefreshToken(account.id);

    const accountProfile = {
      id: account.id,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
    };

    if (memberships.length === 1) {
      const m = memberships[0];
      const issued = await this.issueAccessTokenForOrg(account.id, m.organizationId);
      return {
        refreshToken,
        account: accountProfile,
        ...issued,
      };
    }

    return {
      refreshToken,
      account: accountProfile,
      memberships,
    };
  }

  /**
   * Build the /auth/me payload from the already-resolved authenticated user
   * plus a fresh memberships list for the picker / nav switcher.
   */
  async me(authenticatedUser: {
    accountId: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    roles: string[];
    permissions: string[];
  }) {
    const memberships = await this.usersService.findActiveMembershipsForAccount(
      authenticatedUser.accountId,
    );
    return {
      account: {
        id: authenticatedUser.accountId,
        email: authenticatedUser.email,
        firstName: authenticatedUser.firstName,
        lastName: authenticatedUser.lastName,
      },
      activeOrganizationId: authenticatedUser.organizationId,
      user: {
        id: authenticatedUser.userId,
        organizationId: authenticatedUser.organizationId,
        roles: authenticatedUser.roles,
        permissions: authenticatedUser.permissions,
      },
      memberships,
    };
  }

  /**
   * Issue an access token for a chosen org using a valid refresh token.
   * Used right after login when the account has 2+ memberships.
   */
  async selectOrganization(
    accountId: string,
    tokenId: string,
    rawRefreshToken: string,
    organizationId: string,
  ) {
    const record = await this.tokenService.validateRefreshToken(
      tokenId,
      rawRefreshToken,
    );
    if (!record || record.accountId !== accountId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.issueAccessTokenForOrg(accountId, organizationId);
  }

  /**
   * Mid-session org switch — the caller is already authenticated via the
   * access token (the controller-level guard validates that). We just need
   * to confirm the membership and mint a new access token. Refresh token
   * is unchanged.
   */
  async switchOrganization(accountId: string, organizationId: string) {
    return this.issueAccessTokenForOrg(accountId, organizationId);
  }

  /**
   * Rotate refresh token + mint new access token. Optional `organizationId`
   * lets the client say which org the new access token should be scoped to;
   * defaults to whatever org is implied by the existing membership lookup.
   */
  async refresh(
    accountId: string,
    tokenId: string,
    rawRefreshToken: string,
    organizationId: string | undefined,
  ) {
    const record = await this.tokenService.validateRefreshToken(
      tokenId,
      rawRefreshToken,
    );
    if (!record || record.accountId !== accountId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!organizationId) {
      // No org hint — fall back to first active membership
      const memberships = await this.usersService.findActiveMembershipsForAccount(
        accountId,
      );
      if (memberships.length === 0) {
        throw new ForbiddenException('Account has no active organization access');
      }
      organizationId = memberships[0].organizationId;
    }

    // Rotate refresh
    await this.tokenService.revokeRefreshToken(tokenId);
    const newRefresh = await this.tokenService.generateRefreshToken(accountId);

    const issued = await this.issueAccessTokenForOrg(accountId, organizationId);
    return { ...issued, refreshToken: newRefresh };
  }

  async logout(refreshToken: string, accountId: string): Promise<void> {
    const decoded = this.tokenService.verifyRefreshToken(refreshToken);
    if (!decoded) return;
    if (decoded.accountId !== accountId) return;
    await this.tokenService.revokeOwnedRefreshToken(decoded.tokenId, accountId);
  }

  /**
   * Internal helper — confirms the membership is active in `organizationId`
   * and produces an access token plus the user-scoped fields the response
   * shape needs.
   */
  private async issueAccessTokenForOrg(accountId: string, organizationId: string) {
    const userId = await this.usersService.findActiveMembershipUserId(
      accountId,
      organizationId,
    );
    if (!userId) {
      throw new ForbiddenException(
        'You do not have an active membership in that organization',
      );
    }

    const profile = await this.usersService.findActiveAuthContext(
      accountId,
      userId,
      organizationId,
    );
    if (!profile) {
      throw new ForbiddenException('Membership is no longer active');
    }

    const accessToken = this.tokenService.generateAccessToken(
      accountId,
      userId,
      organizationId,
    );

    const memberships = await this.usersService.findActiveMembershipsForAccount(
      accountId,
    );

    return {
      accessToken,
      activeOrganizationId: organizationId,
      memberships,
      user: {
        id: profile.userId,
        organizationId: profile.organizationId,
        roles: profile.roles,
        permissions: profile.permissions,
      },
    };
  }
}
```

- [ ] **Step 2: Drop the now-unused `OrganizationsService` import in `auth.module.ts`**

Edit `apps/api/src/modules/auth/auth.module.ts`. Remove the line `import { OrganizationsModule } from '../organizations/organizations.module';` and remove `OrganizationsModule` from the `imports` array. The file becomes:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { AuthController } from './controllers/auth.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
```

---

### Task 12: Refactor `AuthController`

**Files:**
- Modify: `apps/api/src/modules/auth/controllers/auth.controller.ts`

- [ ] **Step 1: Replace the file**

Replace `apps/api/src/modules/auth/controllers/auth.controller.ts` with:

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { SelectOrganizationDto } from '../dto/select-organization.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { AuthenticatedUser } from '../../../common/types';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Log in with email + password. No organization required.' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('select-organization')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Pick an org after multi-org login. Returns an access token.' })
  @ApiBody({ type: SelectOrganizationDto })
  async selectOrganization(
    @CurrentUser() ctx: { accountId: string; tokenId: string; refreshToken: string },
    @Body() dto: SelectOrganizationDto,
  ) {
    return this.authService.selectOrganization(
      ctx.accountId,
      ctx.tokenId,
      ctx.refreshToken,
      dto.organizationId,
    );
  }

  @Post('switch-organization/:orgId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mid-session org switch. Reuses the existing refresh token.' })
  async switchOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', new ParseUUIDPipe()) orgId: string,
  ) {
    return this.authService.switchOrganization(user.accountId, orgId);
  }

  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Rotate refresh token + mint new access token.' })
  @ApiBody({ type: RefreshTokenDto })
  async refresh(
    @CurrentUser() ctx: { accountId: string; tokenId: string; refreshToken: string },
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(
      ctx.accountId,
      ctx.tokenId,
      ctx.refreshToken,
      dto.organizationId,
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the supplied refresh token.' })
  @ApiBody({ type: RefreshTokenDto })
  async logout(@Body() dto: RefreshTokenDto, @CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(dto.refreshToken, user.accountId);
    return { message: 'Logged out' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the active account + membership context.' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
```

---

### Task 13: Verify backend compiles and end-to-end via curl

- [ ] **Step 1: Watch the api container compile cleanly**

Run:
```bash
docker compose logs --tail 100 -f api
```

Wait for `Nest application successfully started` and `HRMS API running on http://localhost:3001`. Press `Ctrl+C` to detach.

If TypeScript errors appear, read the file referenced in the error and fix per the spec / earlier tasks. Common error: a forgotten reference to the old `email` / `passwordHash` columns.

- [ ] **Step 2: Login (single-membership path)**

The seed admin has only one membership, so login should return a full token pair.

Run:
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pbhub.com","password":"admin123"}' | jq
```

Expected JSON shape:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "account": { "id": "...", "email": "admin@pbhub.com", "firstName": "Super", "lastName": "Admin" },
  "memberships": [{ "userId": "...", "organizationId": "...", "organizationName": "PbHub", "organizationSlug": "pbhub", "roles": ["super_admin"] }],
  "activeOrganizationId": "...",
  "user": { "id": "...", "organizationId": "...", "roles": ["super_admin"], "permissions": [...] }
}
```

- [ ] **Step 3: Wrong password is rejected with 401**

Run:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pbhub.com","password":"WRONG"}'
```

Expected: `401`.

- [ ] **Step 4: Authenticated `/auth/me` works**

Run (substitute `<TOKEN>`):
```bash
ACCESS_TOKEN=<paste accessToken from Step 2>
curl -s http://localhost:3001/api/auth/me -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

Expected: returns the `{ account, activeOrganizationId, user }` shape from the controller.

- [ ] **Step 5: Old org-slug login is rejected by the validator**

Run:
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"organizationSlug":"pbhub","email":"admin@pbhub.com","password":"admin123"}' | jq
```

Expected: `400` with a class-validator message like `property organizationSlug should not exist`. (Login still works because the rest of the body is valid.) The point is to confirm the slug field is unknown.

Actually, with `forbidNonWhitelisted: true` in `main.ts`, this returns `400`. Confirm.

- [ ] **Step 6: Refresh works**

Run (substitute `<REFRESH>`):
```bash
REFRESH_TOKEN=<paste refreshToken from Step 2>
curl -s -X POST http://localhost:3001/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq
```

Expected: a fresh access token + a NEW refresh token (different from the input).

- [ ] **Step 7: Logout revokes the (new) refresh token**

Run (substitute the new tokens from Step 6):
```bash
NEW_ACCESS=<from step 6>
NEW_REFRESH=<from step 6>
curl -s -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $NEW_ACCESS" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$NEW_REFRESH\"}" | jq
```

Expected: `{ "message": "Logged out" }`.

Then attempt a refresh with the same token:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3001/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$NEW_REFRESH\"}"
```

Expected: `401`.

---

### Task 14: Commit Phase 2

- [ ] **Step 1: Commit**

Run:
```bash
git add apps/api/src
git status
git commit -m "$(cat <<'EOF'
refactor(auth): rewrite auth module for account+membership model

- Login now takes (email, password) — no orgSlug.
- Account-scoped refresh tokens; access tokens carry accountId+userId+orgId.
- New endpoints: POST /auth/select-organization (post-login pick) and
  POST /auth/switch-organization/:orgId (mid-session switch).
- Refresh endpoint accepts an optional organizationId and rotates the
  refresh token per the existing rotation policy.
- AuthenticatedUser gains accountId; UsersService rebuilt around
  Account+Membership lookups.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Frontend

### Task 15: Add active-org helpers to `lib/auth.ts`

**Files:**
- Modify: `apps/web/src/lib/auth.ts`

- [ ] **Step 1: Replace the file**

Replace `apps/web/src/lib/auth.ts` with:

```typescript
const TOKEN_KEY = 'hrms_access_token';
const REFRESH_KEY = 'hrms_refresh_token';
const ACTIVE_ORG_KEY = 'hrms_active_org_id';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token);
}

export function getActiveOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_ORG_KEY);
}

export function setActiveOrgId(orgId: string): void {
  localStorage.setItem(ACTIVE_ORG_KEY, orgId);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACTIVE_ORG_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
```

---

### Task 16: Update `lib/api.ts` for the new auth shapes and endpoints

**Files:**
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Replace the file**

Replace `apps/web/src/lib/api.ts` with:

```typescript
import { API_BASE_URL } from './utils';
import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  getActiveOrgId,
  setActiveOrgId,
  clearTokens,
} from './auth';

// ─── Types ───────────────────────────────────

export interface ApiError extends Error {
  status: number;
}

export interface AccountProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Membership {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roles: string[];
}

export interface ActiveUser {
  id: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

export interface AuthUser {
  account: AccountProfile;
  activeOrganizationId: string | null;
  user: ActiveUser | null;
  memberships: Membership[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken: string;
  account: AccountProfile;
  memberships: Membership[];
  activeOrganizationId?: string;
  user?: ActiveUser;
}

export interface SelectOrganizationResponse {
  accessToken: string;
  activeOrganizationId: string;
  memberships: Membership[];
  user: ActiveUser;
}

// ─── Silent refresh ──────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  if (refreshPromise) return refreshPromise;

  const orgId = getActiveOrgId();

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: rt,
          ...(orgId ? { organizationId: orgId } : {}),
        }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as SelectOrganizationResponse & { refreshToken: string };
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setActiveOrgId(data.activeOrganizationId);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function forceLogout(): never {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  throw new Error('Session expired. Please log in again.');
}

// ─── Core request ────────────────────────────

interface RequestOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = options?.skipAuth ? null : getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !options?.skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = getToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      res = await fetch(`${API_BASE_URL}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    if (res.status === 401) {
      forceLogout();
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    let message: string;
    if (errBody?.message) {
      message = Array.isArray(errBody.message) ? errBody.message.join('. ') : errBody.message;
    } else if (res.status === 403) {
      message = 'You do not have permission to access this resource';
    } else if (res.status === 404) {
      message = 'The requested resource was not found';
    } else {
      message = `Request failed (${res.status})`;
    }
    const err = new Error(message);
    (err as ApiError).status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── HTTP methods ────────────────────────────

export function get<T>(url: string, options?: RequestOptions) {
  return request<T>('GET', url, undefined, options);
}

export function post<T>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>('POST', url, body, options);
}

export function patch<T>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>('PATCH', url, body, options);
}

export function put<T>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>('PUT', url, body, options);
}

export function del<T>(url: string, options?: RequestOptions) {
  return request<T>('DELETE', url, undefined, options);
}

// ─── Auth endpoints ──────────────────────────

export function login(payload: LoginPayload) {
  return post<LoginResponse>('/api/auth/login', payload, { skipAuth: true });
}

export function selectOrganization(organizationId: string, refreshToken: string) {
  return post<SelectOrganizationResponse>(
    '/api/auth/select-organization',
    { organizationId, refreshToken },
    { skipAuth: true },
  );
}

export function switchOrganization(organizationId: string) {
  return post<SelectOrganizationResponse>(
    `/api/auth/switch-organization/${organizationId}`,
  );
}

export function logout(refreshToken: string) {
  return post<{ message: string }>('/api/auth/logout', { refreshToken });
}

export function fetchMe() {
  return get<AuthUser>('/api/auth/me');
}
```

---

### Task 17: Update `auth-context.tsx` to handle the multi-membership branch

**Files:**
- Modify: `apps/web/src/context/auth-context.tsx`

- [ ] **Step 1: Replace the file**

Replace `apps/web/src/context/auth-context.tsx` with:

```typescript
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getToken,
  setToken,
  setRefreshToken,
  getRefreshToken,
  setActiveOrgId,
  clearTokens,
} from '@/lib/auth';
import {
  login as apiLogin,
  selectOrganization as apiSelectOrganization,
  switchOrganization as apiSwitchOrganization,
  fetchMe,
  type LoginPayload,
  type AuthUser,
  type Membership,
} from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingMemberships: Membership[] | null;  // when login required org pick
  login: (payload: LoginPayload) => Promise<'authenticated' | 'needs_org_selection'>;
  selectOrganization: (organizationId: string) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingMemberships, setPendingMemberships] = useState<Membership[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate user from API on mount if token exists
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<'authenticated' | 'needs_org_selection'> => {
      const res = await apiLogin(payload);
      setRefreshToken(res.refreshToken);

      if (res.accessToken && res.activeOrganizationId && res.user) {
        // Single-membership path: fully authenticated
        setToken(res.accessToken);
        setActiveOrgId(res.activeOrganizationId);
        setUser({
          account: res.account,
          activeOrganizationId: res.activeOrganizationId,
          user: res.user,
          memberships: res.memberships,
        });
        setPendingMemberships(null);
        router.push('/dashboard');
        return 'authenticated';
      }

      // 2+ memberships: caller routes to /select-organization
      setUser({
        account: res.account,
        activeOrganizationId: null,
        user: null,
        memberships: res.memberships,
      });
      setPendingMemberships(res.memberships);
      return 'needs_org_selection';
    },
    [router],
  );

  const selectOrganization = useCallback(
    async (organizationId: string) => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        router.push('/login');
        return;
      }
      const res = await apiSelectOrganization(organizationId, refreshToken);
      setToken(res.accessToken);
      setActiveOrgId(res.activeOrganizationId);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              activeOrganizationId: res.activeOrganizationId,
              user: res.user,
              memberships: res.memberships,
            }
          : prev,
      );
      setPendingMemberships(null);
      router.push('/dashboard');
    },
    [router],
  );

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const res = await apiSwitchOrganization(organizationId);
      setToken(res.accessToken);
      setActiveOrgId(res.activeOrganizationId);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              activeOrganizationId: res.activeOrganizationId,
              user: res.user,
              memberships: res.memberships,
            }
          : prev,
      );
      router.refresh();
    },
    [router],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setPendingMemberships(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!user.activeOrganizationId,
        isLoading,
        pendingMemberships,
        login,
        selectOrganization,
        switchOrganization,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

---

### Task 18: Update the login page

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Read the current file to know what to preserve**

Run:
```bash
cat apps/web/src/app/login/page.tsx
```

Note the existing JSX structure (form layout, error handling, button styles). The change is: drop the org-slug input field and branch on the login result.

- [ ] **Step 2: Replace the file**

Replace `apps/web/src/app/login/page.tsx` with:

```typescript
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (result === 'needs_org_selection') {
        router.push('/select-organization');
      }
      // 'authenticated' branch routes itself in the context
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Sign in to PbHub HRMS</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### Task 19: Create the `/select-organization` page

**Files:**
- Create: `apps/web/src/app/select-organization/page.tsx`

- [ ] **Step 1: Create the directory and file**

Run:
```bash
mkdir -p apps/web/src/app/select-organization
```

Create `apps/web/src/app/select-organization/page.tsx` with:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { user, pendingMemberships, selectOrganization } = useAuth();
  const memberships = pendingMemberships ?? user?.memberships ?? [];
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memberships.length === 0) {
      router.push('/login');
    }
  }, [memberships.length, router]);

  if (memberships.length === 0) {
    return null;
  }

  async function handlePick(orgId: string) {
    setSubmittingId(orgId);
    setError(null);
    try {
      await selectOrganization(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter organization');
      setSubmittingId(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Choose an organization</h1>
          <p className="mt-1 text-sm text-gray-600">
            Pick the organization you want to work in. You can switch later from the top nav.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => (
            <button
              key={m.organizationId}
              type="button"
              disabled={submittingId !== null}
              onClick={() => handlePick(m.organizationId)}
              className="flex flex-col items-start gap-2 rounded-lg border bg-white p-5 text-left shadow-sm transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            >
              <span className="text-base font-semibold text-gray-900">{m.organizationName}</span>
              <span className="text-xs text-gray-500">/{m.organizationSlug}</span>
              <div className="flex flex-wrap gap-1">
                {m.roles.map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {r}
                  </span>
                ))}
              </div>
              {submittingId === m.organizationId && (
                <span className="text-xs text-blue-600">Entering…</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 20: Add the org switcher to the nav

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`

- [ ] **Step 1: Read the current file**

Run:
```bash
cat apps/web/src/components/layout/app-shell.tsx
```

Note the current header layout (notification bell + name block + logout button at lines ~163–204). The org switcher goes between the notification bell and the name block, only when the user has 2+ memberships.

- [ ] **Step 2: Add a new client component for the switcher dropdown**

Create `apps/web/src/components/layout/org-switcher.tsx` with:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';

export function OrgSwitcher() {
  const { user, switchOrganization } = useAuth();
  const [open, setOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  if (!user || user.memberships.length <= 1) return null;

  const active = user.memberships.find((m) => m.organizationId === user.activeOrganizationId);

  async function handlePick(orgId: string) {
    if (orgId === user!.activeOrganizationId) {
      setOpen(false);
      return;
    }
    setSubmittingId(orgId);
    try {
      await switchOrganization(orgId);
      setOpen(false);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>{active?.organizationName ?? 'Select organization'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-4 w-4 text-gray-400"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border bg-white py-1 shadow-lg">
          {user.memberships.map((m) => {
            const isActive = m.organizationId === user.activeOrganizationId;
            return (
              <button
                key={m.organizationId}
                type="button"
                disabled={submittingId !== null}
                onClick={() => handlePick(m.organizationId)}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 ${
                  isActive ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                  {m.organizationName}
                </span>
                <span className="text-xs text-gray-500">/{m.organizationSlug}</span>
                {submittingId === m.organizationId && (
                  <span className="text-xs text-blue-600">Switching…</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render `<OrgSwitcher />` in the header**

In `apps/web/src/components/layout/app-shell.tsx`, find the header block that starts with `<header className="flex items-center justify-end border-b bg-white px-6 py-3">` (around line 163). Inside that header, **before** the existing `<Link href="/notifications" ...>` (the notification bell), insert the import and the component.

At the top of the file (with the other imports), add:

```typescript
import { OrgSwitcher } from './org-switcher';
```

And inside the header `<div className="flex items-center gap-3">` block, put `<OrgSwitcher />` as the **first** child:

```tsx
<div className="flex items-center gap-3">
  <OrgSwitcher />
  {/* Notification bell */}
  <Link
    href="/notifications"
    ...
```

---

### Task 21: Verify the UI flow

- [ ] **Step 1: Open the login page in a browser**

Visit http://localhost:3000/login. Confirm the form has only Email and Password (no organization slug field).

- [ ] **Step 2: Log in as the seed admin**

Email: `admin@pbhub.com`. Password: `admin123`. Submit.

Expected: routes straight to `/dashboard` (single-membership path). The header shows the user's name + Logout. No org switcher in the nav (only one membership).

- [ ] **Step 3: Logout**

Click Logout. Expected: routes back to `/login`. localStorage should no longer have `hrms_access_token` or `hrms_refresh_token`.

- [ ] **Step 4: Try a deliberately wrong password**

Login with the wrong password. Expected: red error message "Invalid email or password" inline on the form.

---

### Task 22: Commit Phase 3

- [ ] **Step 1: Commit**

Run:
```bash
git add apps/web/src
git status
git commit -m "$(cat <<'EOF'
refactor(web): drop org slug from login + add org picker / switcher

- Login form takes (email, password); auth-context branches on the
  response to either route to /dashboard or /select-organization.
- New /select-organization page renders membership cards.
- New OrgSwitcher dropdown in the app shell, hidden when the account
  has only one membership.
- lib/auth.ts gains active-org-id helpers; lib/api.ts plumbs the
  org id into the refresh body and adds switch/select endpoints.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Multi-membership end-to-end verification

### Task 23: Add a second organization + membership for the seed admin

**Files:**
- (No code changes — manual SQL)

- [ ] **Step 1: Insert a second organization, then a User membership for the existing admin account**

Run:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db <<'SQL'
INSERT INTO organizations (id, name, slug, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'Acme HR', 'acme', true, NOW(), NOW())
RETURNING id, slug;
SQL
```

Note the printed UUID of the new org. Call it `<ACME_ORG_ID>`.

- [ ] **Step 2: Find the admin's account id**

Run:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c \
  "SELECT id FROM accounts WHERE email = 'admin@pbhub.com';"
```

Note the printed UUID. Call it `<ADMIN_ACCOUNT_ID>`.

- [ ] **Step 3: Create the membership and assign super_admin role**

Run (substitute the UUIDs):
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db <<SQL
INSERT INTO users (id, account_id, organization_id, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), '<ADMIN_ACCOUNT_ID>', '<ACME_ORG_ID>', true, NOW(), NOW())
RETURNING id;
SQL
```

Note the new `users.id`, call it `<ACME_USER_ID>`.

Run:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c \
  "SELECT id FROM roles WHERE slug = 'super_admin' AND organization_id IS NULL;"
```

Note that role id, call it `<SUPER_ADMIN_ROLE_ID>`.

Run (substitute):
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db <<SQL
INSERT INTO user_roles (id, user_id, role_id, organization_id, created_at)
VALUES (gen_random_uuid(), '<ACME_USER_ID>', '<SUPER_ADMIN_ROLE_ID>', '<ACME_ORG_ID>', NOW());
SQL
```

---

### Task 24: Multi-membership verification through the UI

- [ ] **Step 1: Log in fresh**

In a private/incognito browser window, go to http://localhost:3000/login. Sign in as `admin@pbhub.com` / `admin123`.

Expected: routes to `/select-organization`, showing two cards: "PbHub" and "Acme HR".

- [ ] **Step 2: Pick PbHub**

Click PbHub. Expected: routes to `/dashboard`. The top-right nav shows an org switcher button reading "PbHub".

- [ ] **Step 3: Switch to Acme**

Click the org switcher → click "Acme HR". Expected: dropdown closes, page refreshes, the switcher now reads "Acme HR".

- [ ] **Step 4: Verify the access token now scopes to Acme**

Open DevTools → Network → reload `/dashboard`. Inspect a request like `GET /api/employees`. Decode the `Authorization` Bearer token (e.g. via jwt.io). The `organizationId` claim should match the Acme org id.

- [ ] **Step 5: Logout, then login again — picker shows again**

Logout. Login again. Expected: picker again (account has 2 memberships).

- [ ] **Step 6: Deactivate the Acme membership and confirm it disappears**

Run:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c \
  "UPDATE users SET is_active = false WHERE organization_id = '<ACME_ORG_ID>' AND account_id = '<ADMIN_ACCOUNT_ID>';"
```

Logout, login fresh. Expected: routes straight to `/dashboard` for PbHub (only one active membership). The nav has no org switcher.

Re-activate it for cleanliness:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c \
  "UPDATE users SET is_active = true WHERE organization_id = '<ACME_ORG_ID>' AND account_id = '<ADMIN_ACCOUNT_ID>';"
```

- [ ] **Step 7: Account-level deactivation blocks login entirely**

Run:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c \
  "UPDATE accounts SET is_active = false WHERE email = 'admin@pbhub.com';"
```

Try to login. Expected: `401 Invalid email or password` (uniform error).

Re-activate:
```bash
docker compose exec -T postgres psql -U hrms -d hrms_db -c \
  "UPDATE accounts SET is_active = true WHERE email = 'admin@pbhub.com';"
```

---

### Task 25: Final commit

- [ ] **Step 1: Confirm the working tree is clean**

Run:
```bash
git status
```

Expected: nothing to commit (Phase 4 was data-only, no source changes). If there are stray edits from manual debugging, review them and decide.

- [ ] **Step 2: Push the branch (only if you want to share)**

This step is optional and not required by the plan. The user will push when they're ready to open a PR.

---

## Done

The branch `refactor/multi-org-identity` now contains:

- A new `Account` Prisma model + the schema/migration changes.
- An updated seed that creates Account first, then membership.
- A rewritten auth module (login, select-organization, switch-organization, refresh, logout, me) keyed on Account.
- Frontend changes: cleaner login form, `/select-organization` page, persistent nav org switcher, refresh-token wiring.
- Three verification phases proving the single-membership and multi-membership paths both work end-to-end.
