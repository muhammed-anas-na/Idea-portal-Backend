import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
