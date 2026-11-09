import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { MoyenPaiement } from '../../paiement/paiement.service';

export class PayerReservationDto {
  @ApiProperty({ enum: ['carte', 'apple_pay', 'google_pay'], example: 'apple_pay' })
  @IsIn(['carte', 'apple_pay', 'google_pay'])
  moyen: MoyenPaiement;

  @ApiProperty({
    example: 'tok_visa',
    description:
      'Jeton créé par le prestataire de paiement (test : tok_visa accepté, tok_chargeDeclined refusé)',
  })
  @IsString()
  @IsNotEmpty()
  jetonPaiement: string;
}
