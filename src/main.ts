import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurerApp } from './app.setup';
import { FUSEAU_CINEMA } from './common/temps';

// Dates lues et écrites en heure locale du cinéma
process.env.TZ = FUSEAU_CINEMA;

async function bootstrap() {
  const app = configurerApp(await NestFactory.create(AppModule));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API démarrée sur le port ${port} – documentation : /api/docs`, 'Bootstrap');
}

// Une erreur au démarrage (base injoignable, port occupé…) est journalisée et arrête le processus
bootstrap().catch((erreur: unknown) => {
  Logger.error(`Démarrage impossible : ${String(erreur)}`, 'Bootstrap');
  process.exit(1);
});
