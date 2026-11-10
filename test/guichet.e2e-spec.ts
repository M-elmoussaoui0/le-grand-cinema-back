import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp, jeton } from './outils';

describe('US9 – Réserver un quota au guichet', () => {
  let app: INestApplication;
  let admin: string;
  let seanceId: number;

  beforeAll(async () => {
    let db: DataSource;
    ({ app, db } = await demarrerApp());
    admin = await jeton(app, 'admin@legrandcinema.fr');
    // Une séance de la salle 1 (300 places) dans 2 jours : jamais commencée, quelle que soit l'heure du test
    [{ id: seanceId }] = await db.query(
      `SELECT id FROM seance WHERE salle_id = 1
       AND debut::date = (now() AT TIME ZONE 'Europe/Paris')::date + 2 ORDER BY debut LIMIT 1`,
    );
  });
  afterAll(() => app.close());

  it('modifie le quota guichet et le plan en tient compte', async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/seances/${seanceId}/quota`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ quotaGuichet: 50 })
      .expect(200);
    const res = await request(app.getHttpServer()).get(`/api/seances/${seanceId}`).expect(200);
    expect(res.body.placesRestantes).toMatchObject({ enLigne: 250, guichet: 50 });
  });

  it('vend 3 billets au guichet sur les places du quota', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/guichet/ventes')
      .set('Authorization', `Bearer ${admin}`)
      .send({ seanceId, nombre: 3 })
      .expect(201);
    expect(res.body.places).toHaveLength(3);
    expect(res.body.codeBillet).toMatch(/^LGC-/);
    const seance = await request(app.getHttpServer()).get(`/api/seances/${seanceId}`);
    expect(seance.body.placesRestantes).toMatchObject({ enLigne: 250, guichet: 47 });
  });

  it('un client ne peut pas vendre au guichet (403)', async () => {
    const client = await jeton(app, 'client@legrandcinema.fr');
    await request(app.getHttpServer())
      .post('/api/admin/guichet/ventes')
      .set('Authorization', `Bearer ${client}`)
      .send({ seanceId: 1, nombre: 1 })
      .expect(403);
  });
});
