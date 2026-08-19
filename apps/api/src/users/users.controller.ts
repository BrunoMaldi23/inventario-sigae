import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Listar usuarios (paginado)' })
  findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 50, @Query('search') search?: string) {
    return this.usersService.findAll(Number(page), Number(pageSize), search);
  }

  @Get(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Detalle de usuario y sus permisos' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('user.manage')
  @ApiOperation({ summary: 'Desactivar usuario (soft delete)' })
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.deactivate(id, user.id);
  }
}