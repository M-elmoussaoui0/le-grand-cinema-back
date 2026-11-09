import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';

export const PLACES_MAX_PAR_RESERVATION = 10;

export class CreerReservationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  seanceId: number;

  @ApiProperty({
    example: [5, 6],
    description: `De 1 à ${PLACES_MAX_PAR_RESERVATION} places, identifiants issus du plan de salle`,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choisissez au moins une place.' })
  @ArrayMaxSize(PLACES_MAX_PAR_RESERVATION, {
    message: `${PLACES_MAX_PAR_RESERVATION} places maximum par réservation.`,
  })
  @ArrayUnique()
  @IsInt({ each: true })
  placeIds: number[];
}
