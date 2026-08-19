import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ExportsService } from './exports.service';

@ApiTags('Exportaciones')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(
    private readonly exportsService: ExportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('assets')
  @Permissions('report.export')
  @ApiOperation({ summary: 'Exportar inventario a Excel (XLSX)' })
  async assets(
    @Res() res: Response,
    @Query('categoryId') categoryId?: string,
    @Query('statusId') statusId?: string,
    @Query('locationId') locationId?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('search') search?: string,
  ) {
    const where: any = { deletedAt: null, active: true };
    if (categoryId) where.categoryId = categoryId;
    if (statusId) where.statusId = statusId;
    if (locationId) where.locationId = locationId;
    if (responsibleId) where.responsibleId = responsibleId;
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { assetCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.exportsService.exportAssetsExcel(res, where);
  }

  @Get('movements')
  @Permissions('report.export')
  @ApiOperation({ summary: 'Exportar movimientos a Excel' })
  async movements(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    const where: any = {};
    if (from) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(from) };
    if (to) where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(to) };
    if (type) where.type = type;
    return this.exportsService.exportMovementsExcel(res, where);
  }

  @Get('template')
  @Permissions('report.export')
  @ApiOperation({ summary: 'Descargar plantilla de importación Excel' })
  template(@Res() res: Response) {
    return this.exportsService.exportTemplate(res);
  }
}