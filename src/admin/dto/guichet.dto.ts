import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Max, Min } from 'class-validator';

export class ModifierQuotaDto {
  @ApiProperty({ example: 40, description: 'Nombre de places gardées pour la vente au guichet' })
  @IsInt()
  @Min(0)
  quotaGuichet: number;
}

export class VenteGuichetDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @IsPositive()
  seanceId: number;

  @ApiProperty({ example: 2, description: 'Nombre de billets vendus au guichet' })
  @IsInt()
  @Min(1)
  @Max(20)
  nombre: number;
}
