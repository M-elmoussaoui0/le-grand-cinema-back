import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { demarrerApp, jeton } from './outils';

describe('US8 – Créer une séance', () => {
  let app: INestApplication;
  let admin: string;
  // Dans 70 jours : après les séances de démonstration
  const jour = new Date(Date.now() + 70 * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  beforeAll(async () => {
    ({ app } = await demarrerApp());
    admin = await jeton(app, 'admin@legrandcinema.fr');
  });
  afterAll(() => app.close());

  it('un client ne peut pas créer de séance (403)', async () => {
    const client = await jeton(app, 'client@legrandcinema.fr');
    await request(app.getHttpServer())
      .post('/api/admin/seances')
      .set('Authorization', `Bearer ${client}`)
      .send({ filmId: 1, salleId: 1, debut: `${jour}T18:00`, prix: 9.5, langue: 'VF' })
      .expect(403);
  });

  it("l'administrateur crée une séance : fin calculée et visible dans la programmation", async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/seances')
      .set('Authorization', `Bearer ${admin}`)
      .send({ filmId: 1, salleId: 1, debut: `${jour}T18:00`, prix: 9.5, langue: 'VOST' })
      .expect(201);
    // Film 1 : 118 minutes + 15 minutes de nettoyage = fin à 20:13
    expect(new Date(res.body.fin).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })).toBe('20:13:00');
    expect(res.body.quotaGuichet).toBe(30);

    const programme = await request(app.getHttpServer()).get('/api/seances').query({ date: jour }).expect(200);
    expect(programme.body).toHaveLength(1);
  });

  it('refuse une séance qui chevauche une autre dans la même salle (409)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/seances')
      .set('Authorization', `Bearer ${admin}`)
      .send({ filmId: 2, salleId: 1, debut: `${jour}T19:30`, prix: 9.5, langue: 'VF' })
      .expect(409);
    expect(res.body.message).toContain('chevauche');
  });

  it('accepte la même heure dans une autre salle', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/seances')
      .set('Authorization', `Bearer ${admin}`)
      .send({ filmId: 2, salleId: 2, debut: `${jour}T19:30`, prix: 9.5, langue: 'VF' })
      .expect(201);
  });
});
