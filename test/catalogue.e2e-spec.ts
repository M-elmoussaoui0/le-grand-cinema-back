import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { aujourdhui } from '../src/common/temps';
import { demarrerApp } from './outils';

describe('US1 – Voir les séances sans compte', () => {
  let app: INestApplication;

  beforeAll(async () => ({ app } = await demarrerApp()));
  afterAll(() => app.close());

  it('liste les films sans être connecté', async () => {
    const res = await request(app.getHttpServer()).get('/api/films').expect(200);
    expect(res.body).toHaveLength(6);
  });

  it('liste les 30 séances du jour (10 salles × 3 horaires) sans être connecté', async () => {
    const res = await request(app.getHttpServer()).get('/api/seances').expect(200);
    expect(res.body).toHaveLength(30);
    expect(res.body[0]).toMatchObject({
      film: { titre: expect.any(String) },
      salle: { nom: expect.any(String) },
    });
    expect(
      new Date(res.body[0].debut).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }),
    ).toBe(aujourdhui());
  });

  it('filtre par langue', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/seances')
      .query({ langue: 'VOST' })
      .expect(200);
    expect(res.body.every((s: { langue: string }) => s.langue === 'VOST')).toBe(true);
  });

  it('refuse une date mal formée (400)', async () => {
    await request(app.getHttpServer())
      .get('/api/seances')
      .query({ date: '05/12/2026' })
      .expect(400);
  });

  it('renvoie 404 pour une séance inexistante', async () => {
    await request(app.getHttpServer()).get('/api/seances/999999').expect(404);
  });
});
