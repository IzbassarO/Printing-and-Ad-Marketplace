import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async register(email: string, password: string) {
    const user = await this.users.create({ email, password });
    return this.sign(user.id, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.users.findForAuth(email); // ✅ тут
    if (!user || user.password !== password) {         // ✅ password есть
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.sign(user.id, user.role);
  }

  private sign(userId: number, role: string) {
    return { accessToken: this.jwt.sign({ sub: userId, role }) };
  }
}
