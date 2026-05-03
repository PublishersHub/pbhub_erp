import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  NotFound,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageService, StorageObjectInput } from './storage.types';

@Injectable()
export class S3StorageService implements StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private _bucket?: string;
  private _region?: string;
  private _client?: S3Client;

  constructor(private readonly config: ConfigService) {}

  /**
   * Lazy initialization. Validating credentials at boot would crash dev where
   * STORAGE_DRIVER=local and S3_* env vars aren't set, even though the S3 service
   * is never actually used.
   */
  private get bucket(): string {
    if (!this._bucket) this.init();
    return this._bucket!;
  }
  private get region(): string {
    if (!this._region) this.init();
    return this._region!;
  }
  private get client(): S3Client {
    if (!this._client) this.init();
    return this._client!;
  }

  private init() {
    const bucket = this.config.get<string>('app.storage.s3.bucket');
    const region = this.config.get<string>('app.storage.s3.region');
    if (!bucket || !region) {
      throw new InternalServerErrorException(
        'STORAGE_DRIVER=s3 requires S3_BUCKET and S3_REGION env vars',
      );
    }
    this._bucket = bucket;
    this._region = region;

    const accessKey = this.config.get<string>('app.storage.s3.accessKey');
    const secretKey = this.config.get<string>('app.storage.s3.secretKey');
    this._client = new S3Client({
      region,
      ...(accessKey && secretKey
        ? { credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } }
        : {}),
    });
  }

  async put({ key, body, contentType }: StorageObjectInput) {
    this.guardKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.debug(`PUT ${key} (${body.length} bytes, ${contentType})`);
    return { key };
  }

  async delete(key: string) {
    this.guardKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    this.guardKey(key);
    if (key.startsWith('public/')) {
      return this.getPublicUrl(key);
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  getPublicUrl(key: string): string {
    if (!key.startsWith('public/')) {
      throw new BadRequestException(`getPublicUrl requires a public/ prefix: ${key}`);
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async exists(key: string) {
    this.guardKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      if (err instanceof NoSuchKey || err instanceof NotFound) return false;
      // Any other error (auth, network) is a real problem
      throw err;
    }
  }

  private guardKey(key: string) {
    if (!/^(private|public|cache)\/[\w\-./@]+$/.test(key) || key.includes('..')) {
      throw new BadRequestException(`Invalid storage key: ${key}`);
    }
  }
}
