import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  create(@Body() dto: CreateServiceDto) {
    return this.services.create(dto);
  }

  @Get()
  list(
    @Query('active') active?: string,
    @Query('category') category?: string,
  ) {
    return this.services.list({
      onlyActive: active === 'true' || active === '1',
      category,
    });
  }

  // /services/:id/active?value=false
  @Patch(':id/active')
  setActive(
    @Param('id', ParseIntPipe) id: number,
    @Query('value', ParseBoolPipe) value: boolean,
  ) {
    return this.services.setActive(id, value);
  }
}
