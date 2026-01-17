import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export type AuthUser = {
  id: number;
  role: 'CLIENT' | 'VENDOR' | 'ADMIN';
  vendorId: number | null;
};

export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest();
  if (!req.user) {
    throw new UnauthorizedException();
  }
  return req.user as AuthUser;
});
