import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('salle')
export class Salle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column()
  capacite: number;

  @Column()
  configuration: string;
}
