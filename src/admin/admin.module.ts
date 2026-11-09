import { Module } from '@nestjs/common';
import { GuichetService } from './guichet.service';
import { SeancesAdminController } from './seances-admin.controller';
import { SeancesAdminService } from './seances-admin.service';
import { StatistiquesController } from './statistiques.controller';
import { StatistiquesService } from './statistiques.service';

@Module({
  controllers: [SeancesAdminController, StatistiquesController],
  providers: [SeancesAdminService, GuichetService, StatistiquesService],
})
export class AdminModule {}
