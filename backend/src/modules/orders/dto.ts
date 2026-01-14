import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @Type(() => Number)
  @IsInt()
  serviceId!: number;

  @IsObject()
  paramsJson!: Record<string, any>;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotal!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  commission!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  total!: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class AssignVendorDto {
  @Type(() => Number)
  @IsInt()
  vendorId!: number;

  @Type(() => Number)
  @IsInt()
  changedByUserId!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ChangeStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @Type(() => Number)
  @IsInt()
  changedByUserId!: number;
}
