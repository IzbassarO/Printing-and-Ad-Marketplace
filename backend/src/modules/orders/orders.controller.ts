import { Controller, Get, Param, ParseIntPipe, Patch, Post, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AssignVendorDto, ChangeStatusDto, CreateOrderDto } from './dto';

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.orders.getById(id);
  }

  @Patch(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignVendorDto,
  ) {
    return this.orders.assignVendor(id, dto.vendorId, dto.changedBy);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.orders.changeStatus(id, dto.status, dto.changedBy);
  }
}
