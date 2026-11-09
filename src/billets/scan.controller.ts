import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { BilletValideDto, ErreurDto, ScannerBilletDto } from './dto/scan.dto';
import { ScanService } from './scan.service';

@ApiTags('Contrôle des billets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('admin')
@Controller('billets')
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  @Post('scan')
  @HttpCode(200)
  @ApiOperation({
    summary: "Scanner un billet à l'entrée",
    description:
      'Vérifie le QR code présenté par le spectateur et enregistre son entrée. ' +
      "Un billet n'est valable qu'une fois, de 1 heure avant la séance jusqu'à sa fin.",
  })
  @ApiOkResponse({ description: 'Billet valide : entrée autorisée.', type: BilletValideDto })
  @ApiBadRequestResponse({
    description: 'Billet annulé, non payé, trop tôt ou séance terminée.',
    type: ErreurDto,
  })
  @ApiNotFoundResponse({ description: 'Billet inconnu.', type: ErreurDto })
  @ApiConflictResponse({ description: 'Billet déjà utilisé.', type: ErreurDto })
  @ApiUnauthorizedResponse({ description: 'Connexion requise.', type: ErreurDto })
  @ApiForbiddenResponse({ description: 'Réservé au personnel du cinéma.', type: ErreurDto })
  scanner(@Body() dto: ScannerBilletDto): Promise<BilletValideDto> {
    return this.scan.scanner(dto.code);
  }
}
