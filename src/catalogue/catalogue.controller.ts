import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, ParseIntPipe, Query, UseInterceptors } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogueService } from './catalogue.service';
import { RechercheSeancesDto } from './dto/recherche-seances.dto';

/** Routes publiques : aucune connexion n'est demandée pour consulter la programmation (US1). */
@ApiTags('Programmation')
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('films')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300_000) // 5 minutes : le catalogue change rarement
  @ApiOperation({ summary: 'Liste des films à l’affiche' })
  films() {
    return this.catalogue.listerFilms();
  }

  @Get('seances')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10_000) // 10 secondes : le plan et la réservation restent toujours en temps réel
  @ApiOperation({ summary: 'Séances d’un jour, filtrables par film et par langue' })
  @ApiOkResponse({ description: 'Séances triées par heure de début.' })
  seances(@Query() filtres: RechercheSeancesDto) {
    return this.catalogue.rechercherSeances(filtres);
  }

  @Get('seances/:id')
  @ApiOperation({ summary: 'Détail d’une séance' })
  @ApiNotFoundResponse({ description: 'Séance introuvable.' })
  seance(@Param('id', ParseIntPipe) id: number) {
    return this.catalogue.seance(id);
  }

  @Get('seances/:id/plan')
  @ApiOperation({
    summary: 'Plan de la salle pour une séance',
    description:
      'Chaque place a un statut : libre, occupee (déjà réservée) ou guichet (gardée pour la vente sur place).',
  })
  @ApiNotFoundResponse({ description: 'Séance introuvable.' })
  plan(@Param('id', ParseIntPipe) id: number) {
    return this.catalogue.plan(id);
  }
}
