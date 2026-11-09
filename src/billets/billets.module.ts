import { Module } from '@nestjs/common';
import { BilletsController } from './billets.controller';
import { BilletsService } from './billets.service';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({
  controllers: [BilletsController, ScanController],
  providers: [BilletsService, ScanService],
})
export class BilletsModule {}
