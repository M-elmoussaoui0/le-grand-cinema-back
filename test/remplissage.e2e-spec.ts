import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { demarrerApp, jeton } from './outils';

describe('US11 – Voir le taux de remplissage', () => {
  let app: INestApplication;
  let admin: string;
  const demain = new Date(Date.now() + 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  beforeAll(async () => {
    ({ app } = await demarrerApp());
    admin = await jeton(app, 'admin@legrandcinema.fr');
  });
  afterAll(() => app.close());

  it('donne le remplissage des 30 séances de demain (jeu de démonstration)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/remplissage')
      .query({ date: demain })
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(res.body.seances).toHaveLength(30);
    expect(res.body.resume.capacite).toBe(5100);
    expect(res.body.resume.placesVendues).toBe(
      res.body.seances.reduce((t: number, s: { vendues: number }) => t + s.vendues, 0),
    );
    expect(res.body.resume.tauxRemplissage).toBeGreaterThan(0);
  });

  it('refuse une date mal formée (400)', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/remplissage')
      .query({ date: 'demain' })
      .set('Authorization', `Bearer ${admin}`)
      .expect(400);
  });
});
