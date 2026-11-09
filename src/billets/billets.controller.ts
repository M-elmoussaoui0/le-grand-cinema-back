import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UtilisateurCourant, UtilisateurJwt } from '../auth/utilisateur-courant.decorator';
import { BilletsService } from './billets.service';

@ApiTags('Billets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class BilletsController {
  constructor(private readonly billets: BilletsService) {}

  @Get(':id/billet')
  @ApiOperation({ summary: 'Billet électronique avec QR code' })
  @ApiOkResponse({ description: 'Billet : film, salle, horaire, places et QR code.' })
  @ApiBadRequestResponse({ description: 'Réservation pas encore payée.' })
  @ApiNotFoundResponse({
    description: "Réservation introuvable ou appartenant à quelqu'un d'autre.",
  })
  billet(@UtilisateurCourant() u: UtilisateurJwt, @Param('id', ParseIntPipe) id: number) {
    return this.billets.billet(id, u.id);
  }
}
