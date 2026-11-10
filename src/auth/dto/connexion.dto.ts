import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ConnexionDto {
  @ApiProperty({ example: 'client@legrandcinema.fr' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Studi2026' })
  @IsNotEmpty()
  motDePasse: string;
}
