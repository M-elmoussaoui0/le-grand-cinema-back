import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Codes d'erreur PostgreSQL traduits en réponses HTTP compréhensibles. */
const PG_ERRORS: Record<string, { status: number; message: string }> = {
  '23505': {
    status: HttpStatus.CONFLICT,
    message: 'Cette ressource existe déjà ou cette place est déjà réservée.',
  },
  '23P01': {
    status: HttpStatus.CONFLICT,
    message: 'Ce créneau chevauche une autre séance dans la même salle.',
  },
  '23503': { status: HttpStatus.BAD_REQUEST, message: 'Une ressource liée est introuvable.' },
  '23514': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Une valeur ne respecte pas les règles métier.',
  },
  P0001: { status: HttpStatus.BAD_REQUEST, message: 'Une règle métier a été violée.' },
};

/**
 * Gestion centralisée des erreurs : toutes les erreurs sont renvoyées au même format JSON,
 * et aucune information technique (pile d'appels, requête SQL) n'est exposée au client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Erreurs');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Une erreur interne est survenue.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
    } else if (exception instanceof QueryFailedError) {
      const code = (exception as QueryFailedError & { code?: string }).code ?? '';
      const known = PG_ERRORS[code];
      if (known) {
        status = known.status;
        message = known.message;
      } else {
        this.logger.error(exception.message);
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({ statusCode: status, message, timestamp: new Date().toISOString() });
  }
}
