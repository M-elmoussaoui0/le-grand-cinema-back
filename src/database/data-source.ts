import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { InitialSchema1730000000000 } from './migrations/1730000000000-InitialSchema';

export const MIGRATIONS = [InitialSchema1730000000000];

/** Options de connexion lues dans les variables d'environnement (jamais en dur dans le code). */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    migrations: MIGRATIONS,
    synchronize: false,
    logging: ['error'],
  };
}

export default new DataSource(buildDataSourceOptions());
