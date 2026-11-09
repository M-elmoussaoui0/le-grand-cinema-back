import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches } from 'class-validator';

export class RechercheSeancesDto {
  @ApiPropertyOptional({
    example: '2026-12-05',
    description: "Jour des séances (aujourd'hui par défaut)",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La date doit être au format AAAA-MM-JJ.' })
  date?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  filmId?: number;

  @ApiPropertyOptional({ enum: ['VF', 'VOST'] })
  @IsOptional()
  @IsIn(['VF', 'VOST'])
  langue?: 'VF' | 'VOST';
}
