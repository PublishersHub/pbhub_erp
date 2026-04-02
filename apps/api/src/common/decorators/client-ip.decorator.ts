import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const first = typeof forwarded === 'string' ? forwarded : forwarded[0];
      return first.split(',')[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? '0.0.0.0';
  },
);
