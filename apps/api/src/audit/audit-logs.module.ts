import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
  controllers: [AuditController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}