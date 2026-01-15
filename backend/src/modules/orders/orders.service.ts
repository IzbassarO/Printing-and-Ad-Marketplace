import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  vendorId: true,
  createdAt: true,
} as const;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private orderDetailsInclude = Prisma.validator<Prisma.OrderInclude>()({
    user: { select: USER_PUBLIC_SELECT },
    vendor: {
      select: {
        id: true,
        name: true,
        legalName: true,
        binIin: true,
        contacts: true,
        isActive: true,
        createdAt: true,
      },
    },
    service: {
      select: {
        id: true,
        category: true,
        name: true,
        description: true,
        isActive: true,
      },
    },
    
    history: {
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        status: true,
        changedByUserId: true,
        note: true,
        createdAt: true,
      },
    },

    files: {
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        uploadedByUserId: true,
        createdAt: true,
      },
    },
    comments: {
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderId: true,
        userId: true,
        message: true,
        createdAt: true,
      },
    },

    // offers relation существует только если у тебя реально `offers OrderOffer[]` в Order.
    // Если Prisma ругнётся и на offers — значит в schema оно называется иначе (например orderOffers).
    offers: {
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderId: true,
        vendorId: true,
        subtotal: true,
        commission: true,
        total: true,
        dueAt: true,
        note: true,
        status: true,
        createdAt: true,
        decidedAt: true,
        decidedByUserId: true,
      },
    },
  });

  async create(dto: {
    userId: number;
    serviceId: number;
    paramsJson: any;
    subtotal: number;
    commission: number;
    total: number;
    dueAt?: string;
  }) {
    if (dto.total !== dto.subtotal + dto.commission) {
      throw new BadRequestException('total must equal subtotal + commission');
    }

    const [user, service] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } }),
      this.prisma.service.findUnique({ where: { id: dto.serviceId }, select: { id: true } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!service) throw new NotFoundException('Service not found');

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    const order = await this.prisma.order.create({
      data: {
        userId: dto.userId,
        serviceId: dto.serviceId,
        paramsJson: dto.paramsJson as any,
        subtotal: dto.subtotal,
        commission: dto.commission,
        total: dto.total,
        dueAt,
        status: OrderStatus.NEW,
      },
      select: { id: true },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: OrderStatus.NEW,
        changedByUserId: dto.userId,
        note: null,
      },
      select: { id: true },
    });

    return this.getById(order.id);
  }

  getById(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: this.orderDetailsInclude,
    });
  }

  async assignVendor(orderId: number, vendorId: number, changedByUserId: number, note?: string) {
    const [order, vendor] = await Promise.all([
      this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } }),
      this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, isActive: true } }),
    ]);

    if (!order) throw new NotFoundException('Order not found');
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (!vendor.isActive) throw new BadRequestException('Vendor is not active');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { vendorId, status: OrderStatus.ASSIGNED },
      select: { id: true },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: OrderStatus.ASSIGNED,
        changedByUserId,
        note: note?.trim() || null,
      },
      select: { id: true },
    });

    return this.getById(orderId);
  }

  async changeStatus(orderId: number, status: OrderStatus, changedByUserId: number, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      select: { id: true },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        changedByUserId,
        note: note?.trim() || null,
      },
      select: { id: true },
    });

    return this.getById(orderId);
  }
}
