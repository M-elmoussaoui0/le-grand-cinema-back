import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AlertesService } from './alertes.service';
import { RemplissageDto } from './dto/remplissage.dto';
import { StatistiquesService } from './statistiques.service';

@ApiTags('Tableau de bord')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Réservé aux administrateurs.' })
@UseGuards(JwtAuthGuard)
@Roles('admin')
@Controller('admin')
export class StatistiquesController {
  constructor(
    private readonly stats: StatistiquesService,
    private readonly alertesService: AlertesService,
  ) {}

  @Get('seances/:id/direct')
  @ApiOperation({
    summary: 'Suivre une séance en direct',
    description:
      'Places vendues en ligne et au guichet, en attente de paiement, restantes, recettes.',
  })
  @ApiNotFoundResponse({ description: 'Séance introuvable.' })
  direct(@Param('id', ParseIntPipe) id: number) {
    return this.stats.direct(id);
  }

  @Get('remplissage')
  @ApiOperation({
    summary: 'Taux de remplissage du jour',
    description: 'Résumé du jour, classement des films et détail de chaque séance.',
  })
  @ApiQuery({ name: 'date', required: false, example: '2026-12-05' })
  remplissage(@Query() { date }: RemplissageDto) {
    return this.stats.remplissage(date);
  }

  @Get('alertes')
  @ApiOperation({
    summary: 'Alertes en cas de pic',
    description:
      'Séances presque complètes (90 % par défaut), complètes, ou avec un pic de ventes (50 places en une heure par défaut). ' +
      'Seuils réglables : ALERTE_SEUIL_REMPLISSAGE et ALERTE_PIC_VENTES_HEURE.',
  })
  alertes() {
    return this.alertesService.alertes();
  }
}
