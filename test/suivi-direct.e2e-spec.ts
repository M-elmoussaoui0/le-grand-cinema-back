import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp, jeton } from './outils';

describe('US10 – Suivre une séance en direct', () => {
  let app: INestApplication;
  let db: DataSource;
  let admin: string;

  beforeAll(async () => {
    ({ app, db } = await demarrerApp());
    admin = await jeton(app, 'admin@legrandcinema.fr');
  });
  afterAll(() => app.close());

  it('donne les ventes en direct et se met à jour après une vente au guichet', async () => {
    const [{ id }] = await db.query(
      `SELECT id FROM seance WHERE debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 1 ORDER BY id LIMIT 1`,
    );
    const avant = await request(app.getHttpServer())
      .get(`/api/admin/seances/${id}/direct`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(avant.body.vendues.enLigne).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post('/api/admin/guichet/ventes')
      .set('Authorization', `Bearer ${admin}`)
      .send({ seanceId: id, nombre: 2 })
      .expect(201);

    const apres = await request(app.getHttpServer())
      .get(`/api/admin/seances/${id}/direct`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(apres.body.vendues.guichet).toBe(avant.body.vendues.guichet + 2);
    expect(apres.body.restantes).toBe(avant.body.restantes - 2);
  });

  it('refusé à un client (403)', async () => {
    const client = await jeton(app, 'client@legrandcinema.fr');
    await request(app.getHttpServer())
      .get('/api/admin/seances/1/direct')
      .set('Authorization', `Bearer ${client}`)
      .expect(403);
  });
});
