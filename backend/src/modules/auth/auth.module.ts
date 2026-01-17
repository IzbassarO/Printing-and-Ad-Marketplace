import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import type { JwtModuleOptions } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';

function parseExpiresIn(raw?: string): number {
  const v = Number((raw ?? '').trim());
  if (Number.isFinite(v) && v > 0) return Math.floor(v);
  return 60 * 60 * 24 * 7;
}

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): JwtModuleOptions => {
        const secret = cfg.get<string>('JWT_SECRET')?.trim() || 'dev_secret_change_me';
        return {
          secret,
          signOptions: { expiresIn: parseExpiresIn(cfg.get<string>('JWT_EXPIRES_IN')) },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy], // ✅ добавить
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
