import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditDto } from './dto/audit.dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Registro de auditoría (solo lectura)' })
  findAll(@Query() query: QueryAuditDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get('actions')
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Acciones disponibles para filtros' })
  actions() {
    return this.auditLogsService.distinctActions();
  }
}