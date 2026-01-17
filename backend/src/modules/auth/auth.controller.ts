import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

function isProd() {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);

    res.cookie('access_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd(),
      maxAge: result.expiresInSec * 1000,
      path: '/',
    });

    return { user: result.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);

    res.cookie('access_token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd(),
      maxAge: result.expiresInSec * 1000,
      path: '/',
    });

    return { user: result.user };
  }

  @Post('logout')
  async logout(@Req() _req: Request, @Res({ passthrough: true }) res: Response) {
    res.cookie('access_token', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd(),
      expires: new Date(0),
      path: '/',
    });
    return { ok: true };
  }
}
