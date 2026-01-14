// src/modules/vendors/dto.ts
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(200)
  legalName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  binIin?: string | null;

  @IsObject()
  contacts!: Record<string, any>; // позже можно строго типизировать

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
