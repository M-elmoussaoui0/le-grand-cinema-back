import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ScannerBilletDto {
  @ApiProperty({
    example: 'LGC-3fQm9xK2pLs7Vb1T',
    description: 'Contenu du QR code lu par la douchette ou la caméra',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;
}

export class BilletValideDto {
  @ApiProperty({ example: true })
  valide: boolean;

  @ApiProperty({ example: 'Entrée autorisée : 2 place(s).' })
  message: string;

  @ApiProperty({ example: 'Nuit Blanche' })
  film: string;

  @ApiProperty({ example: 'Salle 2' })
  salle: string;

  @ApiProperty({ example: '2026-12-05T19:30:00.000Z' })
  debut: Date;

  @ApiProperty({ example: ['A1', 'A2'] })
  places: string[];

  @ApiProperty({ example: '2026-12-05T19:12:44.000Z', description: 'Heure du passage au contrôle' })
  scanneLe: Date;
}

/**
 * Format commun des erreurs (AllExceptionsFilter), avec un exemple réaliste
 * pour chaque code HTTP dans la documentation Swagger.
 */
export function exempleErreur(statusCode: number, message: string) {
  return {
    type: 'object',
    properties: {
      statusCode: { type: 'number' },
      message: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
    },
    example: { statusCode, message, timestamp: '2026-12-05T19:14:02.512Z' },
  };
}
