import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrerApp } from './outils';

describe('US15 – Tenir la charge du festival', () => {
  let app: INestApplication;
  let db: DataSource;

  beforeAll(async () => ({ app, db } = await demarrerApp()));
  afterAll(() => app.close());

  it('80 consultations simultanées de la programmation répondent toutes', async () => {
    const reponses = await Promise.all(
      Array.from({ length: 80 }, () => request(app.getHttpServer()).get('/api/seances')),
    );
    expect(reponses.every((r) => r.status === 200)).toBe(true);
  });

  it('la programmation est servie depuis le cache', async () => {
    const debut = Date.now();
    await request(app.getHttpServer()).get('/api/films').expect(200);
    await db.query("UPDATE film SET titre = 'Titre modifié' WHERE id = 1");
    const res = await request(app.getHttpServer()).get('/api/films').expect(200);
    // Toujours l'ancienne version pendant 5 minutes : la base n'a pas été interrogée
    expect(res.body.some((f: { titre: string }) => f.titre === 'Titre modifié')).toBe(false);
    expect(Date.now() - debut).toBeLessThan(2000);
  });

  it('le plan de salle est compressé en gzip', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/seances/1/plan')
      .set('Accept-Encoding', 'gzip')
      .expect(200);
    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('les index de la migration US15 existent', async () => {
    const index: { indexname: string }[] = await db.query(
      "SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_reservation_seance_statut', 'idx_reservation_date', 'idx_seance_salle_debut')",
    );
    expect(index).toHaveLength(3);
  });
});
