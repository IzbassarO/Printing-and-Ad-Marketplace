import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(ctx: ExecutionContext): boolean {
        const allowedRoles =
            this.reflector.getAllAndOverride<Array<'CLIENT' | 'VENDOR' | 'ADMIN'>>(ROLES_KEY, [
                ctx.getHandler(),
                ctx.getClass(),
            ]) ?? [];

        if (allowedRoles.length === 0) return true;

        const req = ctx.switchToHttp().getRequest();
        const user = req.user as { id: number; role: 'CLIENT' | 'VENDOR' | 'ADMIN'; vendorId?: number | null } | undefined;

        if (!user) {
            throw new UnauthorizedException();
        }

        if (!allowedRoles.includes(user.role)) {
            throw new ForbiddenException('Forbidden');
        }

        return true;
    }
}
