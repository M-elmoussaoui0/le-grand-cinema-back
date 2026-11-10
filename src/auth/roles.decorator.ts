import { SetMetadata } from '@nestjs/common';
import { Role } from '../utilisateurs/utilisateur.entity';

export const ROLES_KEY = 'roles';
/** Restreint une route à certains rôles, par exemple @Roles('admin'). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
