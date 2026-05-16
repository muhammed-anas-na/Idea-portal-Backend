import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  admin: { id: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async adminExists(): Promise<boolean> {
    const count = await this.prisma.admin.count();
    return count > 0;
  }

  async signupBootstrap(email: string, password: string): Promise<AuthResult> {
    if (await this.adminExists()) {
      throw new ForbiddenException('Admin signup is closed; an admin already exists.');
    }
    const normalised = email.trim().toLowerCase();
    const existing = await this.prisma.admin.findUnique({ where: { email: normalised } });
    if (existing) {
      throw new ConflictException('Admin with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await this.prisma.admin.create({
      data: { email: normalised, passwordHash },
      select: { id: true, email: true },
    });
    return { admin, ...(await this.issueTokens(admin.id, admin.email)) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const normalised = email.trim().toLowerCase();
    const admin = await this.prisma.admin.findUnique({ where: { email: normalised } });
    if (!admin) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return {
      admin: { id: admin.id, email: admin.email },
      ...(await this.issueTokens(admin.id, admin.email)),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload: { sub: string; email: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalid or expired.');
    }
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!admin) {
      throw new UnauthorizedException('Admin no longer exists.');
    }
    return { admin, ...(await this.issueTokens(admin.id, admin.email)) };
  }

  private async issueTokens(adminId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: adminId, email });
    const refreshToken = await this.jwt.signAsync(
      { sub: adminId, email },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
      },
    );
    return { accessToken, refreshToken };
  }
}
