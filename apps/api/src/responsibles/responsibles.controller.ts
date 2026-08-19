import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { ResponsiblesService } from './responsibles.service';
import { CreateResponsibleDto, UpdateResponsibleDto } from './dto/responsible.dto';

@ApiTags('Responsables')
@ApiBearerAuth()
@Controller('responsibles')
export class ResponsiblesController {
  constructor(private readonly responsiblesService: ResponsiblesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar responsables (paginado)' })
  findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 50, @Query('search') search?: string) {
    return this.responsiblesService.findAll(Number(page), Number(pageSize), search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Responsable por id' })
  findOne(@Param('id') id: string) {
    return this.responsiblesService.findOne(id);
  }

  @Post()
  @Permissions('responsible.manage')
  @ApiOperation({ summary: 'Crear responsable' })
  create(@Body() dto: CreateResponsibleDto, @CurrentUser() user: AuthUser) {
    return this.responsiblesService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('responsible.manage')
  @ApiOperation({ summary: 'Actualizar responsable' })
  update(@Param('id') id: string, @Body() dto: UpdateResponsibleDto, @CurrentUser() user: AuthUser) {
    return this.responsiblesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('responsible.manage')
  @ApiOperation({ summary: 'Desactivar responsable' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.responsiblesService.remove(id, user.id);
  }
}