import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { UploadService } from './upload.service';
import type { UploadPurpose, UploadResponse } from './upload.types';

/**
 * Upload + serve flow:
 *
 *   1. Browser POSTs multipart/form-data to /api/uploads with the file +
 *      `purpose` field + any context (employeeId, claimId, …).
 *   2. Server returns { key, url, filename, size, contentType }.
 *      The `key` is what the caller stores in the DB. The `url` is a renderable
 *      URL (signed for private keys, plain for public).
 *   3. When rendering later, frontend calls GET /api/uploads/url?key=… to get
 *      a fresh signed URL (private keys only).
 */
@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(private readonly service: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB hard cap; per-purpose limits enforced in service
    }),
  )
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('purpose') purpose: UploadPurpose | undefined,
    @Body('employeeId') employeeId?: string,
    @Body('claimId') claimId?: string,
    @Body('instanceId') instanceId?: string,
    @Body('taskId') taskId?: string,
  ): Promise<UploadResponse> {
    if (!file) throw new BadRequestException('No file provided in `file` field');
    if (!purpose) throw new BadRequestException('Missing `purpose` field');
    return this.service.upload(user, purpose, file, {
      employeeId,
      claimId,
      instanceId,
      taskId,
    });
  }

  @Get('url')
  @ApiOperation({ summary: 'Get a fresh download URL for a stored key' })
  async getUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Query('key') key?: string,
  ): Promise<{ url: string }> {
    if (!key) throw new BadRequestException('Missing `key` query param');
    // Authorization on individual keys is best handled at the calling resource
    // (e.g. fetch the expense_item, ensure caller owns or has expense.read).
    // Here we just verify the caller is authenticated; the storage service
    // performs the path-traversal check.
    void user;
    return this.service.getDownloadUrl(key);
  }

  @Delete(':key([^/]+(?:/[^/]+)*)')
  @ApiOperation({ summary: 'Delete a stored object by key' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
  ): Promise<{ deleted: true }> {
    // Same caveat as `getUrl`: caller-resource is responsible for ownership
    // checks before calling this endpoint.
    void user;
    await this.service.delete(key);
    return { deleted: true };
  }
}
