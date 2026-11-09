import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogueController } from './catalogue.controller';
import { CatalogueService } from './catalogue.service';
import { DisponibiliteService } from './disponibilite.service';
import { Film } from './film.entity';
import { Salle } from './salle.entity';
import { Seance } from './seance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Film, Salle, Seance])],
  controllers: [CatalogueController],
  providers: [CatalogueService, DisponibiliteService],
  exports: [CatalogueService, DisponibiliteService, TypeOrmModule],
})
export class CatalogueModule {}
