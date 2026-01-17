import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

function normalizeEmail(email: string) {
  return (email ?? '').trim().toLowerCase();
}

function nameFromEmail(email: string) {
  const base = normalizeEmail(email).split('@')[0] ?? 'User';
  const cleaned = base.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'User';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
    .slice(0, 120);
}

function jwtExpiresInSec(): number {
  const raw = (process.env.JWT_EXPIRES_IN ?? '').trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 60 * 60 * 24 * 7; // 7 days default
}

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) { }

  async register(dto: { email: string; password: string; name?: string; phone?: string }) {
    const email = normalizeEmail(dto.email);
    const password = dto.password ?? '';

    if (!email) throw new BadRequestException('email is required');
    if (!password) throw new BadRequestException('password is required');
    if (password.length < 6) throw new BadRequestException('password must be at least 6 chars');

    const name = (dto.name ?? '').trim() || nameFromEmail(email);
    const phone = (dto.phone ?? '').trim() || null;

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.users.createClient({
      name,
      email,
      phone,
      passwordHash,
    });

    const expiresInSec = jwtExpiresInSec();

    return {
      token: this.sign(user.id, user.role, user.vendorId, expiresInSec),
      expiresInSec,
      user,
    };
  }

  async login(emailRaw: string, password: string) {
    const email = normalizeEmail(emailRaw);
    if (!email || !password) throw new BadRequestException('email and password are required');

    const user = await this.users.findForAuthByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const safeUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      vendorId: user.vendorId,
      createdAt: user.createdAt,
    };

    const expiresInSec = jwtExpiresInSec();

    return {
      token: this.sign(user.id, user.role, user.vendorId, expiresInSec),
      expiresInSec,
      user,
    };
  }

  async logout() {
    return { ok: true };
  }

  private sign(userId: number, role: string, vendorId: number | null, expiresInSec: number) {
    return this.jwt.sign(
      { sub: userId, role, vendorId },
      { expiresIn: expiresInSec },
    );
  }
}
