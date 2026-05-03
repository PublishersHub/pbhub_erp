import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { STORAGE_SERVICE } from '../storage/storage.module';
import type { StorageService } from '../storage/storage.types';
import type { AuthenticatedUser } from '../../common/types';
import type {
  UploadPolicy,
  UploadPurpose,
  UploadResponse,
} from './upload.types';

const MB = 1024 * 1024;

const POLICIES: Record<UploadPurpose, UploadPolicy> = {
  'expense-receipt': {
    allowedContentTypes: [/^image\/(png|jpe?g|webp|gif|heic)$/, /^application\/pdf$/],
    maxBytes: 10 * MB,
    isPublic: false,
    requiredPermissions: ['expense.create'],
  },
  'profile-photo': {
    allowedContentTypes: [/^image\/(png|jpe?g|webp)$/],
    maxBytes: 5 * MB,
    isPublic: false,
    requiredPermissions: ['employee.update', 'employee.read_own'],
  },
  'employee-doc': {
    allowedContentTypes: [/^image\/(png|jpe?g)$/, /^application\/pdf$/],
    maxBytes: 25 * MB,
    isPublic: false,
    requiredPermissions: ['employee.update', 'employee.create'],
  },
  'onboarding-doc': {
    allowedContentTypes: [/^image\/(png|jpe?g)$/, /^application\/pdf$/],
    maxBytes: 25 * MB,
    isPublic: false,
    requiredPermissions: ['onboarding.task.update'],
  },
  'org-logo': {
    allowedContentTypes: [/^image\/(png|jpe?g|svg\+xml|webp)$/],
    maxBytes: 2 * MB,
    isPublic: true,
    requiredPermissions: ['settings.manage', 'organization.update'],
  },
  'org-favicon': {
    allowedContentTypes: [/^image\/(x-icon|vnd\.microsoft\.icon|png)$/],
    maxBytes: 256 * 1024,
    isPublic: true,
    requiredPermissions: ['settings.manage', 'organization.update'],
  },
  'org-login-bg': {
    allowedContentTypes: [/^image\/(png|jpe?g|webp)$/],
    maxBytes: 5 * MB,
    isPublic: true,
    requiredPermissions: ['settings.manage', 'organization.update'],
  },
};

@Injectable()
export class UploadService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /**
   * Validate, persist, and return public/internal URLs for a single uploaded file.
   *
   * `context` lets the caller scope the key path — e.g. for an expense receipt,
   * pass `{ employeeId, claimId }` so the key becomes
   *   private/expense-receipts/{orgId}/{employeeId}/{claimId}/{uuid}-{filename}
   */
  async upload(
    user: AuthenticatedUser,
    purpose: UploadPurpose,
    file: Express.Multer.File,
    context: Record<string, string | undefined> = {},
  ): Promise<UploadResponse> {
    const policy = POLICIES[purpose];
    if (!policy) throw new BadRequestException(`Unknown upload purpose: ${purpose}`);

    // 1. Permission gate — caller must hold any one of the required perms.
    const has = (p: string) => user.permissions.includes(p);
    if (!policy.requiredPermissions.some(has)) {
      throw new ForbiddenException(
        `Missing permission for ${purpose}. Need one of: ${policy.requiredPermissions.join(', ')}`,
      );
    }

    // 2. Content-type gate
    const contentType = file.mimetype;
    if (!policy.allowedContentTypes.some((rx) => rx.test(contentType))) {
      throw new BadRequestException(
        `${contentType} is not allowed for ${purpose}`,
      );
    }

    // 3. Size gate (multer enforces too, but double-check)
    if (file.size > policy.maxBytes) {
      throw new BadRequestException(
        `File too large (${file.size} bytes > ${policy.maxBytes} max for ${purpose})`,
      );
    }

    // 4. Build key
    const safeFilename = sanitizeFilename(file.originalname);
    const key = this.buildKey(purpose, user.organizationId, context, safeFilename, policy.isPublic);

    // 5. Write
    await this.storage.put({
      key,
      body: file.buffer,
      contentType,
    });

    const url = policy.isPublic
      ? this.storage.getPublicUrl(key)
      : await this.storage.getDownloadUrl(key);

    return {
      key,
      url,
      filename: safeFilename,
      size: file.size,
      contentType,
    };
  }

  /**
   * Mint a fresh download URL for an existing key. Used when the frontend
   * already has a key in the DB (e.g. expense_items.receipt_url stores keys)
   * and needs a renderable URL right now.
   */
  async getDownloadUrl(key: string): Promise<{ url: string }> {
    const url = await this.storage.getDownloadUrl(key);
    return { url };
  }

  async delete(key: string): Promise<void> {
    await this.storage.delete(key);
  }

  /** purpose → key prefix. Mirrors the bucket layout in infra/lib/stacks/storage-stack.ts. */
  private buildKey(
    purpose: UploadPurpose,
    organizationId: string,
    context: Record<string, string | undefined>,
    filename: string,
    isPublic: boolean,
  ): string {
    const uuid = randomUUID();
    const scope = isPublic ? 'public' : 'private';

    switch (purpose) {
      case 'expense-receipt': {
        const empId = context.employeeId ?? 'unknown';
        const claimId = context.claimId ?? 'tmp';
        return `${scope}/expense-receipts/${organizationId}/${empId}/${claimId}/${uuid}-${filename}`;
      }
      case 'profile-photo': {
        const empId = context.employeeId ?? 'unknown';
        return `${scope}/profile-photos/${organizationId}/${empId}/${uuid}-${filename}`;
      }
      case 'employee-doc': {
        const empId = context.employeeId ?? 'unknown';
        return `${scope}/employee-docs/${organizationId}/${empId}/${uuid}-${filename}`;
      }
      case 'onboarding-doc': {
        const instanceId = context.instanceId ?? 'unknown';
        const taskId = context.taskId ?? 'tmp';
        return `${scope}/onboarding-docs/${organizationId}/${instanceId}/${taskId}/${uuid}-${filename}`;
      }
      case 'org-logo':
        return `public/branding/${organizationId}/logo-${uuid}-${filename}`;
      case 'org-favicon':
        return `public/branding/${organizationId}/favicon-${uuid}-${filename}`;
      case 'org-login-bg':
        return `public/branding/${organizationId}/login-bg-${uuid}-${filename}`;
    }
  }
}

/**
 * Strip path separators and weird characters from a user-supplied filename.
 * Preserves the extension.
 */
function sanitizeFilename(name: string): string {
  const ext = path.extname(name).slice(0, 16);
  const base = path
    .basename(name, ext)
    .replace(/[^\w\-.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'file';
  return `${base}${ext}`;
}
