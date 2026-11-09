import { Module } from '@nestjs/common';
import { GuichetService } from './guichet.service';
import { SeancesAdminController } from './seances-admin.controller';
import { SeancesAdminService } from './seances-admin.service';

@Module({
  controllers: [SeancesAdminController],
  providers: [SeancesAdminService, GuichetService],
})
export class AdminModule {}
