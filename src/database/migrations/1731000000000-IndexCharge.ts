import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * US15 – Tenir la charge du festival : index pour les requêtes les plus fréquentes.
 * - places restantes et tableau de bord : réservations d'une séance par statut ;
 * - pic de ventes : réservations payées récentes.
 */
export class IndexCharge1731000000000 implements MigrationInterface {
  name = 'IndexCharge1731000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE INDEX idx_reservation_seance_statut ON reservation (seance_id, statut)');
    await q.query('CREATE INDEX idx_reservation_date ON reservation (date_reservation)');
    await q.query('CREATE INDEX idx_seance_salle_debut ON seance (salle_id, debut)');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP INDEX idx_seance_salle_debut');
    await q.query('DROP INDEX idx_reservation_date');
    await q.query('DROP INDEX idx_reservation_seance_statut');
  }
}
