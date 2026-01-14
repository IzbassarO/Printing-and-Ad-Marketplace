import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async register(email: string, password: string) {
    if (!email || !password) throw new BadRequestException('email and password are required');
    if (password.length < 6) throw new BadRequestException('password must be at least 6 chars');

    const hash = await bcrypt.hash(password, 12);

    const user = await this.users.create({
      email,
      password: hash, // ✅ сохраняем хеш в поле password
    });

    return this.sign(user.id, user.role);
  }

  async login(email: string, password: string) {
    if (!email || !password) throw new BadRequestException('email and password are required');

    const user = await this.users.findForAuth(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password); // ✅ сравниваем с хешем
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.sign(user.id, user.role);
  }

  async logout() {
    return { ok: true };
  }

  private sign(userId: number, role: string) {
    return { accessToken: this.jwt.sign({ sub: userId, role }) };
  }
}
