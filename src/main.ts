import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurerApp } from './app.setup';

async function bootstrap() {
  const app = configurerApp(await NestFactory.create(AppModule));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`API démarrée sur le port ${port} – documentation : /api/docs`, 'Bootstrap');
}

bootstrap();
