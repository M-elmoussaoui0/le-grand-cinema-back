import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UtilisateurCourant, UtilisateurJwt } from '../auth/utilisateur-courant.decorator';
import { CreerReservationDto } from './dto/creer-reservation.dto';
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
}
