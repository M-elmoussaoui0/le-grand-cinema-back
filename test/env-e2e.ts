// Les tests d'intégration tournent sur une base dédiée, jamais sur la base de démonstration
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/cinema_test';
process.env.DATABASE_SSL = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'secret-de-test';
process.env.TZ = 'Europe/Paris';
