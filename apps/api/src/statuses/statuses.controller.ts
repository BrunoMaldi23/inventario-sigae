import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { StatusesService } from './statuses.service';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';

@ApiTags('Estados')
@ApiBearerAuth()
@Controller('statuses')
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de estados' })
  findAll() {
    return this.statusesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Estado por id' })
  findOne(@Param('id') id: string) {
    return this.statusesService.findOne(id);
  }

  @Post()
  @Permissions('status.manage')
  @ApiOperation({ summary: 'Crear estado' })
  create(@Body() dto: CreateStatusDto, @CurrentUser() user: AuthUser) {
    return this.statusesService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('status.manage')
  @ApiOperation({ summary: 'Actualizar estado' })
  update(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: AuthUser) {
    return this.statusesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('status.manage')
  @ApiOperation({ summary: 'Desactivar estado' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.statusesService.remove(id, user.id);
  }
}