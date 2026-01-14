import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { IsEmail, IsOptional, IsString, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

class CreateUserDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  role?: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendorId?: number;
}

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  getByEmail(@Query('email') email: string) {
    return this.users.findByEmail(email);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}
