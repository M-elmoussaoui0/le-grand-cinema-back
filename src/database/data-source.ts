import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { InitialSchema1730000000000 } from './migrations/1730000000000-InitialSchema';
import { IndexCharge1731000000000 } from './migrations/1731000000000-IndexCharge';
import { ScanBillet1732000000000 } from './migrations/1732000000000-ScanBillet';

export const MIGRATIONS = [
  InitialSchema1730000000000,
  IndexCharge1731000000000,
  ScanBillet1732000000000,
];

/** Options de connexion lues dans les variables d'environnement (jamais en dur dans le code). */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    migrations: MIGRATIONS,
    synchronize: false,
    logging: ['error'],
    // Pool de connexions : les requêtes simultanées partagent un nombre limité de connexions
    extra: { max: Number(process.env.DB_POOL_MAX ?? 10) },
  };
}

export default new DataSource(buildDataSourceOptions());
