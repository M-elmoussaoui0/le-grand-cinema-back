import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Seance } from '../catalogue/seance.entity';

export type StatutReservation = 'en_attente' | 'payee' | 'annulee';

@Entity('reservation')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'utilisateur_id' })
  utilisateurId: number;

  @Column({ name: 'seance_id' })
  seanceId: number;

  @ManyToOne(() => Seance)
  @JoinColumn({ name: 'seance_id' })
  seance: Seance;

  @Column()
  statut: StatutReservation;

  @Column({
    name: 'montant_total',
    type: 'numeric',
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  montantTotal: number;

  @Column({ name: 'reference_paiement', type: 'varchar', nullable: true, select: false })
  referencePaiement: string | null;

  @Column({ name: 'code_billet', type: 'varchar', nullable: true })
  codeBillet: string | null;

  @Column({ name: 'date_reservation', type: 'timestamp' })
  dateReservation: Date;
}
