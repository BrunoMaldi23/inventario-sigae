import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Raíz')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Info de la API' })
  root() {
    return {
      name: 'Inventario Escolar API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/health',
    };
  }
}