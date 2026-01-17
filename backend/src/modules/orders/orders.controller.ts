import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import {
  AddOrderCommentDto,
  AddOrderFileDto,
  AssignVendorDto,
  CancelOrderDto,
  ChangeStatusDto,
  CreateOrderDto,
  DecideOrderDto,
  ListOrdersQueryDto,
} from './dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Roles('CLIENT')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create({
      userId: user.id,
      ...dto,
    });
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListOrdersQueryDto) {
    return this.orders.listForUser(user, q);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.getByIdForUser(user, id);
  }

  @Roles('ADMIN')
  @Patch(':id/assign')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignVendorDto,
  ) {
    return this.orders.assignVendor(id, dto.vendorId, user.id, dto.note);
  }

  @Roles('ADMIN', 'VENDOR')
  @Patch(':id/status')
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.orders.changeStatusGuarded(user, id, dto.status, dto.note);
  }

  @Roles('VENDOR')
  @Patch(':id/accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideOrderDto,
  ) {
    return this.orders.acceptGuarded(user, id, dto.note);
  }

  @Roles('VENDOR')
  @Patch(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideOrderDto,
  ) {
    return this.orders.rejectGuarded(user, id, dto.note);
  }

  @Roles('ADMIN', 'CLIENT', 'VENDOR')
  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancelGuarded(user, id, dto.reason);
  }

  @Roles('ADMIN', 'CLIENT', 'VENDOR')
  @Post(':id/comments')
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderCommentDto,
  ) {
    return this.orders.addCommentGuarded(user, id, dto.message);
  }

  @Roles('ADMIN', 'CLIENT', 'VENDOR')
  @Post(':id/files')
  addFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderFileDto,
  ) {
    return this.orders.addFileGuarded(user, id, dto);
  }
}
