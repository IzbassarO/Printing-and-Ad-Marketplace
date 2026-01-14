import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

const USER_PUBLIC_SELECT = {
    id: true,
    email: true,
    role: true,
    vendorId: true,
    createdAt: true,
} as const;

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            select: USER_PUBLIC_SELECT,
        });
    }

    findForAuth(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            // ВАЖНО: без select → вернёт password
        });
    }

    async create(data: { email: string; password: string; role?: UserRole; vendorId?: number | null }) {
        const role = data.role ?? UserRole.CLIENT;

        if (role === UserRole.VENDOR && !data.vendorId) {
            throw new BadRequestException('vendorId is required for VENDOR role');
        }
        if (role !== UserRole.VENDOR && data.vendorId) {
            throw new BadRequestException('vendorId allowed only for VENDOR role');
        }

        return this.prisma.user.create({
            data: {
                email: data.email,
                password: data.password, // пока plain
                role,
                vendorId: data.vendorId ?? null,
            },
            select: USER_PUBLIC_SELECT,
        });
    }
}
