import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UtilisateurCourant, UtilisateurJwt } from '../auth/utilisateur-courant.decorator';
import { CreerSeanceDto } from './dto/creer-seance.dto';
import { ModifierQuotaDto, VenteGuichetDto } from './dto/guichet.dto';
import { GuichetService } from './guichet.service';
import { SeancesAdminService } from './seances-admin.service';

@ApiTags('Administration')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Réservé aux administrateurs.' })
@UseGuards(JwtAuthGuard)
@Roles('admin')
@Controller('admin')
export class SeancesAdminController {
  constructor(
    private readonly service: SeancesAdminService,
    private readonly guichet: GuichetService,
  ) {}

  @Get('salles')
  @ApiOperation({ summary: 'Liste des salles' })
  salles() {
    return this.service.salles();
  }

  @Post('seances')
  @ApiOperation({
    summary: 'Créer une séance',
    description: 'La fin est calculée : durée du film + 15 minutes de nettoyage.',
  })
  @ApiCreatedResponse({ description: 'Séance créée.' })
  @ApiBadRequestResponse({ description: 'Données invalides ou date passée.' })
  @ApiConflictResponse({ description: 'Chevauchement avec une autre séance de la même salle.' })
  creer(@Body() dto: CreerSeanceDto) {
    return this.service.creer(dto);
  }

  @Delete('seances/:id')
  @ApiOperation({ summary: 'Supprimer une séance sans réservation' })
  @ApiConflictResponse({ description: 'La séance a des réservations.' })
  supprimer(@Param('id', ParseIntPipe) id: number) {
    return this.service.supprimer(id);
  }

  @Patch('seances/:id/quota')
  @ApiOperation({ summary: 'Modifier le quota de places gardées pour le guichet' })
  modifierQuota(@Param('id', ParseIntPipe) id: number, @Body() dto: ModifierQuotaDto) {
    return this.guichet.modifierQuota(id, dto);
  }

  @Post('guichet/ventes')
  @ApiOperation({
    summary: 'Vendre des billets au guichet',
    description: 'Attribue d’abord les places du quota guichet, puis les places libres restantes.',
  })
  @ApiCreatedResponse({ description: 'Billets vendus, places attribuées.' })
  @ApiConflictResponse({ description: 'Plus assez de places.' })
  vendre(@UtilisateurCourant() u: UtilisateurJwt, @Body() dto: VenteGuichetDto) {
    return this.guichet.vendre(u.id, dto);
  }
}
