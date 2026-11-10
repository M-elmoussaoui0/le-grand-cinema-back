import { MigrationInterface, QueryRunner } from 'typeorm';

/** US7 – Scanner un billet à l'entrée : heure de passage du billet au contrôle. */
export class ScanBillet1732000000000 implements MigrationInterface {
  name = 'ScanBillet1732000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE reservation ADD COLUMN scanne_le TIMESTAMP NULL');
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE reservation DROP COLUMN scanne_le');
  }
}
