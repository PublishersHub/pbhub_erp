import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Serve uploaded files from disk in dev (STORAGE_DRIVER=local).
  // In prod (STORAGE_DRIVER=s3), browsers fetch directly from S3 / CloudFront and
  // /storage/* is unused.
  if ((process.env.STORAGE_DRIVER || 'local') === 'local') {
    const root = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT || 'storage');
    app.useStaticAssets(root, { prefix: '/storage/' });
  }

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.APP_BASE_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PbHub HRMS API')
    .setDescription('Human Resource Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3001;
  await app.listen(port);
  console.log(`HRMS API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
