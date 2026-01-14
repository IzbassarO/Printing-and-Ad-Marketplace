import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // публичный метод (БЕЗ password)
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, vendorId: true, createdAt: true },
    });
  }

  // ✅ для логина (с password = HASH)
  findForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, role: true, vendorId: true },
    });
  }

  async create(data: {
    email: string;
    password: string; // ✅ тут хеш
    role?: UserRole;
    vendorId?: number | null;
  }) {
    const role = data.role ?? UserRole.CLIENT;

    if (role === UserRole.VENDOR && !data.vendorId) {
      throw new BadRequestException('vendorId is required for VENDOR role');
    }
    if (role !== UserRole.VENDOR && data.vendorId) {
      throw new BadRequestException('vendorId allowed only for VENDOR role');
    }

    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          password: data.password, // ✅ prisma ожидает password
          role,
          vendorId: data.vendorId ?? null,
        },
        select: { id: true, email: true, role: true, vendorId: true, createdAt: true },
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Email already exists');
      }
      throw e;
    }
  }
}
