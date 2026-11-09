import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogueService } from './catalogue.service';
import { RechercheSeancesDto } from './dto/recherche-seances.dto';

/** Routes publiques : aucune connexion n'est demandée pour consulter la programmation (US1). */
@ApiTags('Programmation')
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('films')
  @ApiOperation({ summary: 'Liste des films à l’affiche' })
  films() {
    return this.catalogue.listerFilms();
  }

  @Get('seances')
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
}
