import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  create(dto: { name: string; isActive?: boolean }) {
    return this.prisma.vendor.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  list(params?: { onlyActive?: boolean }) {
    const where = params?.onlyActive ? { isActive: true } : undefined;
    return this.prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setActive(id: number, isActive: boolean) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.vendor.update({
      where: { id },
      data: { isActive },
    });
  }
}
