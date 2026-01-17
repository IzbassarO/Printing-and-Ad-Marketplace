import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CancelledByRole, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';

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
  constructor(private prisma: PrismaService) { }

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

  // ---------- helpers ----------
  private isAdmin(user: AuthUser) {
    return user.role === 'ADMIN';
  }

  private ensureVendorHasId(user: AuthUser) {
    if (user.role !== 'VENDOR') throw new ForbiddenException();
    if (user.vendorId == null) throw new ForbiddenException('Vendor account is not linked');
    return user.vendorId;
  }

  private async getOrderBasic(id: number) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, userId: true, vendorId: true, status: true },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  private canSeeOrder(user: AuthUser, order: { userId: number; vendorId: number | null }) {
    if (this.isAdmin(user)) return true;
    if (user.role === 'CLIENT') return order.userId === user.id;
    if (user.role === 'VENDOR') return user.vendorId != null && order.vendorId === user.vendorId;
    return false;
  }

  private requireCanSee(user: AuthUser, order: { userId: number; vendorId: number | null }) {
    if (!this.canSeeOrder(user, order)) throw new ForbiddenException();
  }

  // ---------- create ----------
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
      this.prisma.service.findUnique({
        where: { id: dto.serviceId },
        select: { id: true, isActive: true },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!service) throw new NotFoundException('Service not found');

    // ✅ ВАЖНО: запрещаем заказ на неактивную услугу
    if (!service.isActive) {
      throw new BadRequestException('Service is not active');
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    const orderId = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
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

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.NEW,
          changedByUserId: dto.userId,
          note: null,
        },
        select: { id: true },
      });

      return order.id;
    });

    return this.getById(orderId);
  }

  // ---------- reads (guarded wrappers) ----------
  async getById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderDetailsInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getByIdForUser(user: AuthUser, id: number) {
    const basic = await this.getOrderBasic(id);
    this.requireCanSee(user, basic);
    return this.getById(id);
  }

  async listForUser(user: AuthUser, q: any) {
    const where: Prisma.OrderWhereInput = {};

    if (this.isAdmin(user)) {
      // ADMIN может фильтровать как угодно (но можно оставить твои поля q)
      if (q.userId != null) where.userId = q.userId;
      if (q.vendorId != null) where.vendorId = q.vendorId;
      if (q.serviceId != null) where.serviceId = q.serviceId;
      if (q.status != null) where.status = q.status;
    } else if (user.role === 'CLIENT') {
      where.userId = user.id; // ✅ клиент видит только своё
      if (q.status != null) where.status = q.status;
      if (q.serviceId != null) where.serviceId = q.serviceId;
    } else if (user.role === 'VENDOR') {
      where.vendorId = this.ensureVendorHasId(user); // ✅ вендор видит только свои
      if (q.status != null) where.status = q.status;
      if (q.serviceId != null) where.serviceId = q.serviceId;
    } else {
      throw new ForbiddenException();
    }

    const take = Math.min(Math.max(q.take ?? 20, 1), 100);
    const skip = Math.max(q.skip ?? 0, 0);

    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: this.orderDetailsInclude,
      }),
    ]);

    return { total, take, skip, rows };
  }

  // ---------- admin action ----------
  async assignVendor(orderId: number, vendorId: number, changedByUserId: number, note?: string) {
    const [order, vendor] = await Promise.all([
      this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } }),
      this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, isActive: true } }),
    ]);

    if (!order) throw new NotFoundException('Order not found');
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (!vendor.isActive) throw new BadRequestException('Vendor is not active');

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { vendorId, status: OrderStatus.ASSIGNED },
        select: { id: true },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.ASSIGNED,
          changedByUserId,
          note: note?.trim() || null,
        },
        select: { id: true },
      }),
    ]);

    return this.getById(orderId);
  }

  // ---------- guarded state transitions ----------
  async changeStatusGuarded(user: AuthUser, orderId: number, status: OrderStatus, note?: string) {
    const order = await this.getOrderBasic(orderId);

    if (status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Use /orders/:id/cancel to cancel an order');
    }

    if (this.isAdmin(user)) {
      return this.changeStatus(orderId, status, user.id, note);
    }

    // vendor может менять статус только своего заказа
    if (user.role === 'VENDOR') {
      const vendorId = this.ensureVendorHasId(user);
      if (order.vendorId !== vendorId) throw new ForbiddenException();

      // можно ограничить допустимые статусы в MVP (пример)
      const allowed = new Set<OrderStatus>([
        OrderStatus.IN_PROGRESS,
        OrderStatus.READY,
        OrderStatus.DELIVERED,
      ]);
      if (!allowed.has(status)) throw new ForbiddenException();

      return this.changeStatus(orderId, status, user.id, note);
    }

    throw new ForbiddenException();
  }

  async changeStatus(orderId: number, status: OrderStatus, changedByUserId: number, note?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status }, select: { id: true } }),
      this.prisma.orderStatusHistory.create({
        data: { orderId, status, changedByUserId, note: note?.trim() || null },
        select: { id: true },
      }),
    ]);

    return this.getById(orderId);
  }

  async acceptGuarded(user: AuthUser, orderId: number, note?: string) {
    const vendorId = this.ensureVendorHasId(user);
    const order = await this.getOrderBasic(orderId);

    if (order.vendorId !== vendorId) throw new ForbiddenException();
    if (order.status !== OrderStatus.ASSIGNED) {
      throw new BadRequestException('Only ASSIGNED order can be accepted');
    }

    return this.accept(orderId, user.id, note);
  }

  async accept(orderId: number, decidedByUserId: number, note?: string) {
    const nextStatus = OrderStatus.IN_PROGRESS;

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: nextStatus }, select: { id: true } }),
      this.prisma.orderStatusHistory.create({
        data: { orderId, status: nextStatus, changedByUserId: decidedByUserId, note: note?.trim() || null },
        select: { id: true },
      }),
    ]);

    return this.getById(orderId);
  }

  async rejectGuarded(user: AuthUser, orderId: number, note?: string) {
    const vendorId = this.ensureVendorHasId(user);
    const order = await this.getOrderBasic(orderId);

    if (order.vendorId !== vendorId) throw new ForbiddenException();
    if (order.status !== OrderStatus.ASSIGNED) {
      throw new BadRequestException('Only ASSIGNED order can be rejected');
    }

    // в MVP reject = cancel by vendor
    return this.cancel(orderId, user.id, CancelledByRole.VENDOR, note);
  }

  async cancelGuarded(user: AuthUser, orderId: number, reason?: string) {
    const order = await this.getOrderBasic(orderId);

    if (this.isAdmin(user)) {
      return this.cancel(orderId, user.id, CancelledByRole.ADMIN, reason);
    }

    if (user.role === 'CLIENT') {
      if (order.userId !== user.id) throw new ForbiddenException();
      return this.cancel(orderId, user.id, CancelledByRole.CLIENT, reason);
    }

    if (user.role === 'VENDOR') {
      const vendorId = this.ensureVendorHasId(user);
      if (order.vendorId !== vendorId) throw new ForbiddenException();
      return this.cancel(orderId, user.id, CancelledByRole.VENDOR, reason);
    }

    throw new ForbiddenException();
  }

  async cancel(orderId: number, cancelledByUserId: number, cancelledByRole: CancelledByRole, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.DELIVERED) throw new BadRequestException('Delivered order cannot be cancelled');

    const note = reason?.trim() || null;

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledByUserId,
          cancelledByRole,
          cancelReason: note,
        },
        select: { id: true },
      }),
      this.prisma.orderStatusHistory.create({
        data: { orderId, status: OrderStatus.CANCELLED, changedByUserId: cancelledByUserId, note },
        select: { id: true },
      }),
    ]);

    return this.getById(orderId);
  }

  // ---------- comments/files guarded ----------
  async addCommentGuarded(user: AuthUser, orderId: number, message: string) {
    const basic = await this.getOrderBasic(orderId);
    this.requireCanSee(user, basic);

    const msg = message.trim();
    if (!msg) throw new BadRequestException('message is required');

    await this.prisma.orderComment.create({
      data: { orderId, userId: user.id, message: msg },
      select: { id: true },
    });

    return this.getById(orderId);
  }

  async addFileGuarded(
    user: AuthUser,
    orderId: number,
    dto: { fileUrl: string; fileName: string; fileType?: string },
  ) {
    const basic = await this.getOrderBasic(orderId);
    this.requireCanSee(user, basic);

    await this.prisma.orderFile.create({
      data: {
        orderId,
        uploadedByUserId: user.id,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName.trim(),
        fileType: dto.fileType?.trim() || 'application/octet-stream',
      },
      select: { id: true },
    });

    return this.getById(orderId);
  }
}
