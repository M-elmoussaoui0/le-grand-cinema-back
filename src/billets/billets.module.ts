import { Module } from '@nestjs/common';
import { BilletsController } from './billets.controller';
import { BilletsService } from './billets.service';

@Module({
  controllers: [BilletsController],
  providers: [BilletsService],
})
export class BilletsModule {}
