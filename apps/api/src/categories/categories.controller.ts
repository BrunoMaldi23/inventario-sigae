import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Árbol de categorías' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Categoría por id' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Permissions('category.manage')
  @ApiOperation({ summary: 'Crear categoría' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categoriesService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('category.manage')
  @ApiOperation({ summary: 'Actualizar categoría' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categoriesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('category.manage')
  @ApiOperation({ summary: 'Desactivar categoría' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.categoriesService.remove(id, user.id);
  }
}