import { Module } from '@nestjs/common';
import { SeancesAdminController } from './seances-admin.controller';
import { SeancesAdminService } from './seances-admin.service';

@Module({
  controllers: [SeancesAdminController],
  providers: [SeancesAdminService],
})
export class AdminModule {}
