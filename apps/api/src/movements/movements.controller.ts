import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { MovementsService } from './movements.service';
import { QueryMovementsDto } from './dto/movement.dto';

@ApiTags('Movimientos')
@ApiBearerAuth()
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  @Permissions('movement.read')
  @ApiOperation({ summary: 'Listar movimientos históricos (filtros + paginación)' })
  findAll(@Query() query: QueryMovementsDto) {
    return this.movementsService.findAll(query);
  }

  @Get(':id')
  @Permissions('movement.read')
  @ApiOperation({ summary: 'Movimiento por id' })
  findOne(@Param('id') id: string) {
    return this.movementsService.findOne(id);
  }
}