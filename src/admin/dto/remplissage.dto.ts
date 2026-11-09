import { IsOptional, Matches } from 'class-validator';

export class RemplissageDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La date doit être au format AAAA-MM-JJ.' })
  date?: string;
}
