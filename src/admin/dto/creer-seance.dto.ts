import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, Matches, Max, Min } from 'class-validator';

export class CreerSeanceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  filmId: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  salleId: number;

  @ApiProperty({
    example: '2026-12-05T22:45',
    description: 'Heure locale du cinéma (AAAA-MM-JJTHH:MM)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
    message: 'Le début doit être au format AAAA-MM-JJTHH:MM.',
  })
  debut: string;

  @ApiProperty({ example: 9.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  prix: number;

  @ApiProperty({ enum: ['VF', 'VOST'] })
  @IsIn(['VF', 'VOST'])
  langue: 'VF' | 'VOST';

  @ApiPropertyOptional({
    example: 20,
    description: 'Places gardées pour le guichet (10 % de la salle par défaut)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  quotaGuichet?: number;
}
