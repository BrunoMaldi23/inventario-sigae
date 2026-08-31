import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { invalidData } from '../common/exceptions/business.exception';
import { ImportsService } from './imports.service';

@ApiTags('Importaciones')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get()
  @Permissions('inventory.import')
  @ApiOperation({ summary: 'Historial de importaciones' })
  list(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
    return this.importsService.listJobs(Number(page), Number(pageSize));
  }

  @Get(':id')
  @Permissions('inventory.import')
  @ApiOperation({ summary: 'Detalle de una importación' })
  get(@Param('id') id: string) {
    return this.importsService.getJob(id);
  }

  @Post('assets')
  @Permissions('inventory.import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar Excel: genera preview y valida (no inserta aún)' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw invalidData('Archivo no recibido');
    if (!/\.(xlsx|xlsm)$/i.test(file.originalname ?? '')) {
      throw invalidData('Solo se admiten archivos .xlsx o .xlsm');
    }
    return this.importsService.processUpload(file.buffer, file.originalname, user.id);
  }

  @Post(':id/confirm')
  @Permissions('inventory.import')
  @ApiOperation({ summary: 'Confirmar importación previewada' })
  confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.importsService.confirm(id, user.id);
  }
}
