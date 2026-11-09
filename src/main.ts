import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité : en-têtes HTTP protecteurs et origine du front autorisée uniquement
  app.use(helmet());
  app.enableCors({ origin: (process.env.FRONT_URL ?? 'http://localhost:5173').split(',') });

  app.setGlobalPrefix('api');

  // Validation de toutes les entrées : les champs inconnus sont refusés
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Documentation de l'API (Swagger / OpenAPI)
  const config = new DocumentBuilder()
    .setTitle('Le Grand Cinéma – API')
    .setDescription("API REST de l'application de réservation de places du cinéma Le Grand Cinéma")
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API démarrée sur le port ${port} – documentation : /api/docs`, 'Bootstrap');
}

bootstrap();
