import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { demarrerApp } from './outils';

describe('US3 – Choisir sa place sur un plan', () => {
  let app: INestApplication;

  beforeAll(async () => ({ app } = await demarrerApp()));
  afterAll(() => app.close());

  it('renvoie le plan complet de la salle, rangée par rangée', async () => {
    const res = await request(app.getHttpServer()).get('/api/seances/1/plan').expect(200);
    const places = res.body.rangees.flatMap((r: { places: unknown[] }) => r.places);
    expect(res.body.rangees[0].rangee).toBe('A');
    expect(places).toHaveLength(300);
    expect(places.filter((p: { statut: string }) => p.statut === 'guichet')).toHaveLength(30);
    expect(places.filter((p: { type: string }) => p.type === 'pmr')).toHaveLength(4);
  });

  it('les places du guichet sont les dernières rangées', async () => {
    const res = await request(app.getHttpServer()).get('/api/seances/1/plan').expect(200);
    const derniere = res.body.rangees.at(-1);
    expect(derniere.places.every((p: { statut: string }) => p.statut === 'guichet')).toBe(true);
  });

  it('renvoie 404 pour une séance inexistante', async () => {
    await request(app.getHttpServer()).get('/api/seances/999999/plan').expect(404);
  });
});
