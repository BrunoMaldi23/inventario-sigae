import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { AssetsService } from '../assets/assets.service';

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, AssetsService],
  exports: [ImportsService],
})
export class ImportsModule {}