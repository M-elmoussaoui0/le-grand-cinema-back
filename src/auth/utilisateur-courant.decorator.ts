import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UtilisateurJwt {
  id: number;
  email: string;
  role: 'client' | 'admin';
}

/** Récupère l'utilisateur authentifié à partir du jeton JWT. */
export const UtilisateurCourant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UtilisateurJwt => ctx.switchToHttp().getRequest().user,
);
