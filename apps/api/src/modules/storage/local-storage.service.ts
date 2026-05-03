import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageService, StorageObjectInput } from './storage.types';

/**
 * Disk-backed storage for local development.
 *
 * Files live under `STORAGE_LOCAL_ROOT` (default `apps/api/storage/`).
 * Public URLs are served by Nest's StaticAssetsMiddleware mounted at `/storage/`.
 * For signed download URLs we just return the same plain URL — no HMAC needed in dev.
 */
@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(
      process.cwd(),
      process.env.STORAGE_LOCAL_ROOT || 'storage',
    );
    this.publicBaseUrl = `${config.get<string>('app.apiBaseUrl')}/storage`;
  }

  async put({ key, body, contentType }: StorageObjectInput) {
    this.guardKey(key);
    const fullPath = path.join(this.root, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, body);
    // Stash content-type so download URL serves the right header.
    await fs.writeFile(`${fullPath}.meta`, JSON.stringify({ contentType }));
    this.logger.debug(`PUT ${key} (${body.length} bytes, ${contentType})`);
    return { key };
  }

  async delete(key: string) {
    this.guardKey(key);
    const fullPath = path.join(this.root, key);
    await fs.unlink(fullPath).catch(() => undefined);
    await fs.unlink(`${fullPath}.meta`).catch(() => undefined);
  }

  async getDownloadUrl(key: string) {
    if (!(await this.exists(key))) {
      throw new NotFoundException(`Object not found: ${key}`);
    }
    return `${this.publicBaseUrl}/${key}`;
  }

  getPublicUrl(key: string): string {
    if (!key.startsWith('public/')) {
      throw new BadRequestException(`getPublicUrl requires a public/ prefix: ${key}`);
    }
    return `${this.publicBaseUrl}/${key}`;
  }

  async exists(key: string) {
    this.guardKey(key);
    return fs
      .access(path.join(this.root, key))
      .then(() => true)
      .catch(() => false);
  }

  /** Block path traversal. Only allow keys with safe characters and our prefixes. */
  private guardKey(key: string) {
    if (!/^(private|public|cache)\/[\w\-./@]+$/.test(key) || key.includes('..')) {
      throw new BadRequestException(`Invalid storage key: ${key}`);
    }
  }
}
