import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@ApiTags('Ubicaciones')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listado plano de ubicaciones' })
  findAll() {
    return this.locationsService.findAll();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Árbol jerárquico de ubicaciones' })
  findTree() {
    return this.locationsService.findTree();
  }

  @Get('search')
  @ApiOperation({ summary: 'Búsqueda rápida de ubicaciones' })
  search(@Query('q') q = '') {
    return this.locationsService.search(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ubicación por id' })
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Post()
  @Permissions('location.manage')
  @ApiOperation({ summary: 'Crear ubicación' })
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: AuthUser) {
    return this.locationsService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('location.manage')
  @ApiOperation({ summary: 'Actualizar ubicación' })
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto, @CurrentUser() user: AuthUser) {
    return this.locationsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('location.manage')
  @ApiOperation({ summary: 'Desactivar ubicación' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.locationsService.remove(id, user.id);
  }
}