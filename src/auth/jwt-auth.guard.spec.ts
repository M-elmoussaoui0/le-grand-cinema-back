import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contexte(authorization?: string) {
  const request: Record<string, unknown> = { headers: { authorization } };
  return {
    request,
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function route() {},
      getClass: () => class Controleur {},
    } as unknown as ExecutionContext,
  };
}

describe('JwtAuthGuard (US16 – accès par rôle)', () => {
  const jwt = new JwtService({ secret: 'secret-test' });
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(jwt, reflector);

  afterEach(() => jest.restoreAllMocks());

  it('refuse une requête sans jeton', () => {
    expect(() => guard.canActivate(contexte().ctx)).toThrow(UnauthorizedException);
  });

  it('refuse un jeton falsifié', () => {
    const faux = new JwtService({ secret: 'autre-secret' }).sign({ sub: 1, role: 'admin' });
    expect(() => guard.canActivate(contexte(`Bearer ${faux}`).ctx)).toThrow(UnauthorizedException);
  });

  it("accepte un jeton valide et place l'utilisateur dans la requête", () => {
    const { ctx, request } = contexte(
      `Bearer ${jwt.sign({ sub: 2, email: 'c@x.fr', role: 'client' })}`,
    );
    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual({ id: 2, email: 'c@x.fr', role: 'client' });
  });

  it("refuse un client sur une route réservée à l'administrateur", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const { ctx } = contexte(`Bearer ${jwt.sign({ sub: 2, role: 'client' })}`);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("laisse passer l'administrateur sur une route réservée", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const { ctx } = contexte(`Bearer ${jwt.sign({ sub: 1, role: 'admin' })}`);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
