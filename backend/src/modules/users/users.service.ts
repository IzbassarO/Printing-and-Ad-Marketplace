import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CreateClientUserInput = {
    name: string;
    email: string;
    phone?: string | null;
    passwordHash: string; // ✅ only hash enters UsersService
};

export type CreateVendorUserInput = {
    name: string;
    email: string;
    phone?: string | null;
    passwordHash: string; // ✅ only hash enters UsersService
    vendorId: number;
};

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    private readonly safeSelect = Prisma.validator<Prisma.UserSelect>()({
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        vendorId: true,
        createdAt: true,
    });

    // ✅ for AuthService only (login)
    findForAuthByEmail(email: string) {
        const normalized = (email ?? '').trim().toLowerCase();
        return this.prisma.user.findUnique({
            where: { email: normalized },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                passwordHash: true,
                role: true,
                vendorId: true,
                createdAt: true,
            },
        });
    }

    // ✅ safe read (admin/dashboard)
    async getById(id: number) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: this.safeSelect,
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    // ✅ safe read (admin/dashboard)
    list(params?: {
        role?: UserRole;
        vendorId?: number;
        take?: number;
        skip?: number;
    }) {
        if (params?.role === UserRole.CLIENT && params?.vendorId != null) {
            throw new BadRequestException('CLIENT cannot have vendorId');
        }
        
        if (params?.role === UserRole.ADMIN && params?.vendorId != null) {
            throw new BadRequestException('ADMIN cannot have vendorId');
        }

        const take = Math.min(Math.max(params?.take ?? 50, 1), 200);
        const skip = Math.max(params?.skip ?? 0, 0);

        const where: Prisma.UserWhereInput = {};

        if (params?.role) {
            where.role = params.role;
        }

        if (params?.vendorId != null) {
            where.vendorId = params.vendorId;
        }

        return this.prisma.user.findMany({
            where,
            select: this.safeSelect,
            orderBy: { createdAt: 'desc' },
            take,
            skip,
        });
    }

    // ✅ used by AuthService.register() for CLIENT sign-up
    async createClient(input: CreateClientUserInput) {
        const email = (input.email ?? '').trim().toLowerCase();
        const name = (input.name ?? '').trim();
        if (!email) throw new BadRequestException('email is required');
        if (!name) throw new BadRequestException('name is required');
        if (!input.passwordHash) throw new BadRequestException('passwordHash is required');

        try {
            return await this.prisma.user.create({
                data: {
                    name,
                    phone: input.phone?.trim() || null,
                    email,
                    passwordHash: input.passwordHash,
                    role: UserRole.CLIENT,
                    vendorId: null,
                },
                select: this.safeSelect,
            });
        } catch (e: any) {
            if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002'
            ) {
                throw new BadRequestException('Email already exists');
            }
            throw e;
        }
    }

    // ✅ admin flow: create VENDOR user and bind to vendorId
    async createVendorUser(input: CreateVendorUserInput) {
        const email = (input.email ?? '').trim().toLowerCase();
        const name = (input.name ?? '').trim();

        if (!email) throw new BadRequestException('email is required');
        if (!name) throw new BadRequestException('name is required');
        if (!input.passwordHash) throw new BadRequestException('passwordHash is required');
        if (!input.vendorId) throw new BadRequestException('vendorId is required');

        const vendor = await this.prisma.vendor.findUnique({
            where: { id: input.vendorId },
            select: { id: true },
        });
        if (!vendor) throw new NotFoundException('Vendor not found');

        try {
            return await this.prisma.user.create({
                data: {
                    name,
                    phone: input.phone?.trim() || null,
                    email,
                    passwordHash: input.passwordHash,
                    role: UserRole.VENDOR,
                    vendorId: input.vendorId,
                },
                select: this.safeSelect,
            });
        } catch (e: any) {
            if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002'
            ) {
                throw new BadRequestException('Email already exists');
            }
            throw e;
        }
    }
}
