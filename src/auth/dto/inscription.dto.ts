import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';

export class InscriptionDto {
  @ApiProperty({ example: 'Martin' })
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  @ApiProperty({ example: 'Léa' })
  @IsNotEmpty()
  @MaxLength(100)
  prenom: string;

  @ApiProperty({ example: 'lea.martin@exemple.fr' })
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide." })
  email: string;

  @ApiProperty({
    example: 'MotDePasse2026',
    description: '8 caractères minimum, une majuscule, une minuscule et un chiffre',
  })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.',
  })
  motDePasse: string;
}
