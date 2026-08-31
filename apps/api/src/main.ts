import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001,http://localhost:3002,https://inventario-sigae.vercel.app')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const isAllowedOrigin = (origin: string): boolean => {
    if (!origin) return true;
    if (corsOrigins.includes(origin)) return true;
    const host = new URL(origin).hostname.toLowerCase();
    if (host === 'vercel.app') return true;
    if (host.endsWith('.vercel.app')) return true;
    if (host.endsWith('.ts.net')) return true;
    if (process.env.NODE_ENV !== 'production' && /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return true;
    return false;
  };

  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin ?? '')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(helmet());
  app.use(cookieParser());

  // Almacenamiento local de adjuntos expuesto como /files/*
  const storagePath = process.env.STORAGE_PATH ?? './storage';
  app.useStaticAssets(resolve(storagePath), { prefix: '/files/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.setGlobalPrefix('api');

  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Inventario Escolar API')
      .setDescription('API del Sistema Integral de Inventario Escolar')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`API escuchando en http://0.0.0.0:${port}/api`);
  logger.log(`Swagger disponible en http://localhost:${port}/api/docs`);
}

void bootstrap();
