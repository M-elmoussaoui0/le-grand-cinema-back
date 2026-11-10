import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ConnexionDto } from './dto/connexion.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UtilisateurCourant, UtilisateurJwt } from './utilisateur-courant.decorator';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('inscription')
  @ApiOkResponse({ description: 'Compte client créé, jeton de connexion renvoyé.' })
  @ApiConflictResponse({ description: 'Adresse e-mail déjà utilisée.' })
  inscrire(@Body() dto: InscriptionDto) {
    return this.auth.inscrire(dto);
  }

  @Post('connexion')
  @HttpCode(200)
  // Protection contre les attaques par force brute : 5 tentatives par minute
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ description: 'Jeton JWT valable 2 heures.' })
  @ApiUnauthorizedResponse({ description: 'E-mail ou mot de passe incorrect.' })
  connecter(@Body() dto: ConnexionDto) {
    return this.auth.connecter(dto);
  }

  @Get('moi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Profil de l'utilisateur connecté." })
  profil(@UtilisateurCourant() u: UtilisateurJwt) {
    return this.auth.profil(u.id);
  }

  @Delete('moi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Données personnelles anonymisées (droit à l’effacement RGPD).' })
  supprimer(@UtilisateurCourant() u: UtilisateurJwt) {
    return this.auth.supprimerCompte(u.id);
  }
}
