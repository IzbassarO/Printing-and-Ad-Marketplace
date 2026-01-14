import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  role: true,
  vendorId: true,
  createdAt: true,
} as const;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: {
    userId: number;
    serviceId: number;
    params: any;
    subtotal: number;
    commission: number;
    total: number;
  }) {
    if (dto.total !== dto.subtotal + dto.commission) {
      throw new BadRequestException('total must equal subtotal + commission');
    }

    const [user, service] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.service.findUnique({ where: { id: dto.serviceId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!service) throw new NotFoundException('Service not found');

    const order = await this.prisma.order.create({
      data: {
        userId: dto.userId,
        serviceId: dto.serviceId,
        params: dto.params,
        subtotal: dto.subtotal,
        commission: dto.commission,
        total: dto.total,
        status: 'NEW',
      },
      include: { history: true },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'NEW',
        changedBy: dto.userId,
      },
    });

    return this.getById(order.id);
  }

  getById(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: USER_PUBLIC_SELECT }, // ✅ без password
        vendor: true,
        service: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async assignVendor(orderId: number, vendorId: number, changedBy: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (!vendor.isActive) throw new BadRequestException('Vendor is not active');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { vendorId },
    });

    // ⚠️ сейчас это создаёт дубль статуса (NEW -> NEW)
    // Можно заменить на "ASSIGNED" / "VENDOR_ASSIGNED"
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        changedBy,
      },
    });

    return this.getById(orderId);
  }

  async changeStatus(orderId: number, status: string, changedBy: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        changedBy,
      },
    });

    return this.getById(orderId);
  }
}
