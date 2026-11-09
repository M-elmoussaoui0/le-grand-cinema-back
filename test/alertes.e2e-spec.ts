import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp, jeton } from './outils';

describe('US12 – Être alerté en cas de pic', () => {
  let app: INestApplication;
  let db: DataSource;
  let admin: string;

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    admin = await jeton(app, 'admin@legrandcinema.fr');
  });
  afterAll(() => app.close());

  it('signale les séances de demain remplies à 90 % ou plus', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/alertes')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    const attendues: { id: number }[] = await db.query(`
      SELECT se.id FROM seance se JOIN salle sa ON sa.id = se.salle_id
      JOIN reservation_place rp ON rp.seance_id = se.id
      WHERE se.debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 1
      GROUP BY se.id, sa.capacite HAVING COUNT(*) * 100.0 / sa.capacite >= 90`);
    const signalees = res.body.filter((a: { type: string }) => a.type === 'presque_complet');
    expect(attendues.length).toBeGreaterThan(0);
    expect(signalees.map((a: { seanceId: number }) => a.seanceId).sort()).toEqual(
      attendues.map((a) => a.id).sort(),
    );
  });
});

describe('US12 – données de démonstration', () => {
  let app: INestApplication;

  beforeAll(async () => ({ app } = await demarrerApp()));
  afterAll(() => app.close());

  it("aucun faux pic de ventes juste après l'installation", async () => {
    const admin = await jeton(app, 'admin@legrandcinema.fr');
    const res = await request(app.getHttpServer())
      .get('/api/admin/alertes')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(res.body.filter((a: { type: string }) => a.type === 'pic_ventes')).toHaveLength(0);
  });
});
