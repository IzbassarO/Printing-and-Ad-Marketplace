import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsUrl,
} from 'class-validator';
import { CancelledByRole, OrderStatus } from '@prisma/client';

export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  serviceId?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number = 0;
}

export class AddOrderCommentDto {
  @IsString()
  @MaxLength(2000)
  message!: string;
}

export class AddOrderFileDto {
  @IsUrl()
  fileUrl!: string;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileType?: string;
}

export class DecideOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class CreateOrderDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ChangeStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
