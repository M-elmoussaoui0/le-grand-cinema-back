import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('film')
export class Film {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  titre: string;

  @Column({ type: 'text', nullable: true })
  synopsis: string | null;

  @Column({ name: 'duree_minutes' })
  dureeMinutes: number;

  @Column({ type: 'varchar', nullable: true })
  genre: string | null;

  @Column({ type: 'varchar', nullable: true })
  classification: string | null;

  @Column({ name: 'affiche_url', type: 'varchar', nullable: true })
  afficheUrl: string | null;
}
