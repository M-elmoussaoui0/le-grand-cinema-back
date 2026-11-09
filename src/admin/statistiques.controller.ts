import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { StatistiquesService } from './statistiques.service';

@ApiTags('Tableau de bord')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Réservé aux administrateurs.' })
@UseGuards(JwtAuthGuard)
@Roles('admin')
@Controller('admin')
export class StatistiquesController {
  constructor(private readonly stats: StatistiquesService) {}

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
}
