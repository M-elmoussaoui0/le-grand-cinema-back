import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database/data-source';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BilletsModule } from './billets/billets.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { HealthModule } from './health/health.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildDataSourceOptions(),
        autoLoadEntities: true,
        migrationsRun: true,
      }),
    }),
    // Limitation globale : 100 requêtes par minute et par adresse IP (réglable avec THROTTLE_LIMIT)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.THROTTLE_LIMIT ?? 100) }]),
    // Cache en mémoire des lectures publiques les plus demandées (US15)
    CacheModule.register({ isGlobal: true }),
    HealthModule,
    AuthModule,
    CatalogueModule,
    ReservationsModule,
    BilletsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
