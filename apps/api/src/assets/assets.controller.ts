import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { QrCodeService } from '../qrcode/qrcode.service';
import { AssetsService } from './assets.service';
import {
  BulkStatusDto,
  BulkTransferDto,
  ChangeStatusDto,
  CreateAssetDto,
  QueryAssetsDto,
  TransferAssetDto,
  UpdateAssetDto,
} from './dto/asset.dto';

@ApiTags('Bienes')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly qrcode: QrCodeService,
  ) {}

  @Get()
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Listar bienes (búsqueda + filtros + paginación)' })
  findAll(@Query() query: QueryAssetsDto) {
    return this.assetsService.findAll(query);
  }

  @Get('search-code')
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Buscar bien por código exacto' })
  findByCode(@Query('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  @Get('scan')
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Resolver QR/barcode a bien' })
  findByQr(@Query('qr') qr: string) {
    return this.assetsService.findByQr(qr);
  }

  @Get('locations')
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Listar inventario agrupado por ubicación' })
  findLocationGroups(@Query() query: QueryAssetsDto) {
    return this.assetsService.findLocationGroups(query);
  }

  @Get('locations/:locationId')
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Ficha mural completa de una ubicación' })
  findLocationSheet(@Param('locationId') locationId: string) {
    return this.assetsService.findLocationSheet(locationId);
  }

  @Get(':id')
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Ficha del bien' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/history')
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Historial completo del bien (movimientos)' })
  history(@Param('id') id: string) {
    return this.assetsService.history(id);
  }

  @Get(':id/qr')
  @Permissions('asset.read')
  @ApiOperation({ summary: 'QR del bien como data URL (para imprimir)' })
  async qrImage(@Param('id') id: string) {
    const asset = await this.assetsService.findByCodeOrId(id);
    const dataUrl = await this.qrcode.toDataUrl(asset.qrCode ?? `inventario://asset/${asset.id}`);
    return { qrCode: asset.qrCode, assetCode: asset.assetCode, dataUrl };
  }

  @Post()
  @SkipThrottle({ default: true })
  @Permissions('asset.create')
  @ApiOperation({ summary: 'Crear bien' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.assetsService.create(dto, user);
  }

  @Patch(':id')
  @Permissions('asset.update')
  @ApiOperation({ summary: 'Actualizar bien (con optimistic locking)' })
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @CurrentUser() user: AuthUser) {
    return this.assetsService.update(id, dto, user);
  }

  @Delete(':id')
  @Permissions('asset.delete')
  @ApiOperation({ summary: 'Eliminación lógica del bien' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assetsService.remove(id, user);
  }

  @Post(':id/transfer')
  @Permissions('asset.transfer')
  @ApiOperation({ summary: 'Trasladar bien (atómico: actualiza ubicación + historial + auditoría)' })
  transfer(@Param('id') id: string, @Body() dto: TransferAssetDto, @CurrentUser() user: AuthUser) {
    return this.assetsService.transfer(id, dto, user);
  }

  @Post(':id/status')
  @Permissions('asset.status')
  @ApiOperation({ summary: 'Cambiar estado del bien (atómico)' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto, @CurrentUser() user: AuthUser) {
    return this.assetsService.changeStatus(id, dto, user);
  }

  @Post('bulk/transfer')
  @Permissions('asset.transfer')
  @ApiOperation({ summary: 'Traslado masivo de bienes' })
  bulkTransfer(@Body() dto: BulkTransferDto, @CurrentUser() user: AuthUser) {
    return this.assetsService.bulkTransfer(dto, user);
  }

  @Post('bulk/status')
  @Permissions('asset.status')
  @ApiOperation({ summary: 'Cambio de estado masivo' })
  bulkStatus(@Body() dto: BulkStatusDto, @CurrentUser() user: AuthUser) {
    return this.assetsService.bulkStatus(dto, user);
  }
}
