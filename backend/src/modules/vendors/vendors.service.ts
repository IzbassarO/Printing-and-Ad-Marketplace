// src/modules/vendors/vendors.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Vendor } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorDto } from './dto';

const vendorPublicSelect = Prisma.validator<Prisma.VendorSelect>()({
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
});

const vendorAdminSelect = Prisma.validator<Prisma.VendorSelect>()({
  id: true,
  name: true,
  legalName: true,
  binIin: true,
  contacts: true,
  isActive: true,
  createdAt: true,
});

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
        name: dto.name.trim(),
        legalName: dto.legalName.trim(),
        binIin: dto.binIin?.trim() || null,
        contacts: dto.contacts as Prisma.JsonObject,
        isActive: dto.isActive ?? true,
      },
      select: vendorAdminSelect, // создание обычно только админ
    });
  }

  list(params?: { onlyActive?: boolean; adminView?: boolean }) {
    const where: Prisma.VendorWhereInput | undefined = params?.onlyActive
      ? { isActive: true }
      : undefined;

    return this.prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: params?.adminView ? vendorAdminSelect : vendorPublicSelect,
    });
  }

  async setActive(id: number, isActive: boolean) {
    const exists = await this.prisma.vendor.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Vendor not found');

    return this.prisma.vendor.update({
      where: { id },
      data: { isActive },
      select: vendorAdminSelect,
    });
  }
}
