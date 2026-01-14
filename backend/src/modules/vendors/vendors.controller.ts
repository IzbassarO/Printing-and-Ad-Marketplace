import { Body, Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto';

@Controller('vendors')
export class VendorsController {
  constructor(private vendors: VendorsService) {}

  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendors.create(dto);
  }

  @Get()
  list(@Query('active') active?: string) {
    const onlyActive = active === 'true' || active === '1';
    return this.vendors.list({ onlyActive });
  }

  // /vendors/5/active?value=true
  @Patch(':id/active')
  setActive(
    @Param('id', ParseIntPipe) id: number,
    @Query('value', ParseBoolPipe) value: boolean,
  ) {
    return this.vendors.setActive(id, value);
  }
}
