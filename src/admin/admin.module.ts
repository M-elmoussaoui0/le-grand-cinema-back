import { Module } from '@nestjs/common';
import { AlertesService } from './alertes.service';
import { GuichetService } from './guichet.service';
import { SeancesAdminController } from './seances-admin.controller';
import { SeancesAdminService } from './seances-admin.service';
import { StatistiquesController } from './statistiques.controller';
import { StatistiquesService } from './statistiques.service';

@Module({
  controllers: [SeancesAdminController, StatistiquesController],
  providers: [SeancesAdminService, GuichetService, StatistiquesService, AlertesService],
})
export class AdminModule {}
