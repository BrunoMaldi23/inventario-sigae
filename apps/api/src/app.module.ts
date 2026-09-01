import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { QrCodeModule } from './qrcode/qrcode.module';
import { StorageModule } from './storage/storage.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CategoriesModule } from './categories/categories.module';
import { StatusesModule } from './statuses/statuses.module';
import { LocationsModule } from './locations/locations.module';
import { ResponsiblesModule } from './responsibles/responsibles.module';
import { AssetsModule } from './assets/assets.module';
import { MovementsModule } from './movements/movements.module';
import { AuditLogsModule } from './audit/audit-logs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ExportsModule } from './exports/exports.module';
import { ImportsModule } from './imports/imports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 20,
      },
    ]),
    PrismaModule,
    AuditModule,
    QrCodeModule,
    StorageModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CategoriesModule,
    StatusesModule,
    LocationsModule,
    ResponsiblesModule,
    AssetsModule,
    MovementsModule,
    AuditLogsModule,
    DashboardModule,
    HealthModule,
    AttachmentsModule,
    ExportsModule,
    ImportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
