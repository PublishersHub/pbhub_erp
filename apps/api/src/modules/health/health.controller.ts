import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check — verifies API, database, and Redis connectivity' })
  async check() {
    const status = {
      api: 'ok' as const,
      database: 'ok' as string,
      redis: 'ok' as string,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      status.database = 'error';
    }

    try {
      await this.redis.ping();
    } catch {
      status.redis = 'error';
    }

    const healthy = status.database === 'ok' && status.redis === 'ok';

    return {
      status: healthy ? 'healthy' : 'degraded',
      services: status,
    };
  }
}
