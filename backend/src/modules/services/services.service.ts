import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: {
    category: string;
    name: string;
    description?: string;
    isActive?: boolean;
  }) {
    const category = dto.category.trim();
    const name = dto.name.trim();

    if (!category) throw new BadRequestException('Category is required');
    if (!name) throw new BadRequestException('Name is required');

    return this.prisma.service.create({
      data: {
        category,
        name,
        description: dto.description?.trim() || null,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        category: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
  }

  list(params?: { onlyActive?: boolean; category?: string }) {
    const where: Prisma.ServiceWhereInput = {};

    if (params?.onlyActive) where.isActive = true;
    if (params?.category) where.category = params.category;

    return this.prisma.service.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        category: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
  }

  async setActive(id: number, isActive: boolean) {
    const exists = await this.prisma.service.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Service not found');
    }

    return this.prisma.service.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        category: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
  }
}
