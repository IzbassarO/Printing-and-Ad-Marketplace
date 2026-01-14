import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @Type(() => Number)
  @IsInt()
  serviceId!: number;

  @IsObject()
  params!: Record<string, any>;

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
}

export class AssignVendorDto {
  @Type(() => Number)
  @IsInt()
  vendorId!: number;

  // кто назначил (потом будет из JWT)
  @Type(() => Number)
  @IsInt()
  changedBy!: number;
}

export class ChangeStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @Type(() => Number)
  @IsInt()
  changedBy!: number;
}
