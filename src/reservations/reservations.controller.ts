import { Body, Controller, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UtilisateurCourant, UtilisateurJwt } from '../auth/utilisateur-courant.decorator';
import { CreerReservationDto } from './dto/creer-reservation.dto';
import { PayerReservationDto } from './dto/payer-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Réservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Réserver des places',
    description: 'Les places sont bloquées 15 minutes en attendant le paiement.',
  })
  @ApiCreatedResponse({ description: 'Réservation créée, en attente de paiement.' })
  @ApiBadRequestResponse({
    description: 'Place inexistante, place du guichet ou séance commencée.',
  })
  @ApiConflictResponse({ description: 'Une des places est déjà réservée.' })
  creer(@UtilisateurCourant() u: UtilisateurJwt, @Body() dto: CreerReservationDto) {
    return this.reservations.creer(u.id, dto);
  }

  @Post(':id/paiement')
  @HttpCode(200)
  @ApiOperation({ summary: 'Payer une réservation (carte, Apple Pay, Google Pay)' })
  @ApiOkResponse({ description: 'Réservation payée, code du billet renvoyé.' })
  @ApiResponse({ status: 402, description: 'Paiement refusé par la banque.' })
  @ApiNotFoundResponse({
    description: "Réservation introuvable ou appartenant à quelqu'un d'autre.",
  })
  @ApiConflictResponse({ description: 'Réservation déjà payée.' })
  @ApiGoneResponse({ description: 'Délai de paiement de 15 minutes dépassé.' })
  payer(
    @UtilisateurCourant() u: UtilisateurJwt,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayerReservationDto,
  ) {
    return this.reservations.payer(id, u.id, dto);
  }
}
