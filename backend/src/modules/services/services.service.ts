import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  create(dto: { name: string; isActive?: boolean }) {
    return this.prisma.service.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  list(params?: { onlyActive?: boolean }) {
    const where = params?.onlyActive ? { isActive: true } : undefined;
    return this.prisma.service.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }

  async setActive(id: number, isActive: boolean) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');

    return this.prisma.service.update({
      where: { id },
      data: { isActive },
    });
  }
}
