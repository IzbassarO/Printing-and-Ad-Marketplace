import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'CLIENT' | 'VENDOR' | 'ADMIN'>) =>
  SetMetadata(ROLES_KEY, roles);
