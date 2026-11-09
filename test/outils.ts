import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configurerApp } from '../src/app.setup';
import { seed } from '../src/database/seed';

/** Démarre l'API complète sur une base de test remise à zéro avec le jeu de démonstration. */
export async function demarrerApp(): Promise<{ app: INestApplication; db: DataSource }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configurerApp(moduleRef.createNestApplication());
  // Serveur réellement à l’écoute : nécessaire pour les requêtes simultanées
  await app.listen(0);
  const db = app.get(DataSource);
  await db.query(
    'TRUNCATE reservation_place, reservation, seance, place, salle, film, utilisateur RESTART IDENTITY CASCADE',
  );
  await seed(db);
  return { app, db };
}

export async function jeton(app: INestApplication, email: string, motDePasse = 'Demo2026!') {
  const res = await request(app.getHttpServer())
    .post('/api/auth/connexion')
    .send({ email, motDePasse })
    .expect(200);
  return res.body.accessToken as string;
}
