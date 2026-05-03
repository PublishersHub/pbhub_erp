import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageService,
    S3StorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (
        config: ConfigService,
        local: LocalStorageService,
        s3: S3StorageService,
      ) => {
        const driver = config.get<string>('app.storage.driver');
        const logger = new Logger('StorageModule');
        if (driver === 's3') {
          logger.log('Storage driver: S3');
          return s3;
        }
        logger.log('Storage driver: local disk');
        return local;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
