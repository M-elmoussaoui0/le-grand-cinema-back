import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Film } from './film.entity';
import { Salle } from './salle.entity';

@Entity('seance')
export class Seance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'film_id' })
  filmId: number;

  @ManyToOne(() => Film)
  @JoinColumn({ name: 'film_id' })
  film: Film;

  @Column({ name: 'salle_id' })
  salleId: number;

  @ManyToOne(() => Salle)
  @JoinColumn({ name: 'salle_id' })
  salle: Salle;

  @Column({ type: 'timestamp' })
  debut: Date;

  @Column({ type: 'timestamp' })
  fin: Date;

  /** NUMERIC est renvoyé en chaîne par PostgreSQL : on le convertit en nombre. */
  @Column({
    type: 'numeric',
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  prix: number;

  @Column()
  langue: 'VF' | 'VOST';

  @Column({ name: 'quota_guichet' })
  quotaGuichet: number;
}
