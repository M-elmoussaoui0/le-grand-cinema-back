import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Configuration commune à l'application réelle (main.ts) et aux tests d'intégration :
 * on teste exactement ce qui tourne en production.
 */
export function configurerApp(app: INestApplication) {
  // Sécurité : en-têtes HTTP protecteurs et origine du front autorisée uniquement
  app.use(helmet());
  app.enableCors({ origin: (process.env.FRONT_URL ?? 'http://localhost:5173').split(',') });

  app.setGlobalPrefix('api');

  // Validation de toutes les entrées : les champs inconnus sont refusés
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Documentation de l'API (Swagger / OpenAPI) disponible sur /api/docs
  const config = new DocumentBuilder()
    .setTitle('Le Grand Cinéma – API')
    .setDescription("API REST de l'application de réservation de places du cinéma Le Grand Cinéma")
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  return app;
}
