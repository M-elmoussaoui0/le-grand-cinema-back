import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { demarrerApp, jeton } from './outils';

describe('US9 – Réserver un quota au guichet', () => {
  let app: INestApplication;
  let admin: string;

  beforeAll(async () => {
    ({ app } = await demarrerApp());
    admin = await jeton(app, 'admin@legrandcinema.fr');
  });
  afterAll(() => app.close());

  it('modifie le quota guichet et le plan en tient compte', async () => {
    await request(app.getHttpServer())
      .patch('/api/admin/seances/1/quota')
      .set('Authorization', `Bearer ${admin}`)
      .send({ quotaGuichet: 50 })
      .expect(200);
    const res = await request(app.getHttpServer()).get('/api/seances/1').expect(200);
    expect(res.body.placesRestantes).toMatchObject({ enLigne: 250, guichet: 50 });
  });

  it('vend 3 billets au guichet sur les places du quota', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/guichet/ventes')
      .set('Authorization', `Bearer ${admin}`)
      .send({ seanceId: 1, nombre: 3 })
      .expect(201);
    expect(res.body.places).toHaveLength(3);
    expect(res.body.codeBillet).toMatch(/^LGC-/);
    const seance = await request(app.getHttpServer()).get('/api/seances/1');
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
