import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, JwtClaims } from './auth.types';
import { roleEnumToSlug, roleSlugToEnum, type RoleSlug } from './role.util';

export interface RegisterUserDto {
  name: string;
  email: string;
  password: string;
  role: RoleSlug;
  department?: string;
  is_active?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AuthUserProfile {
  user_id: string;
  name: string;
  email: string;
  role: RoleSlug;
  department: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface LoginResult {
  token: string;
  user: AuthUserProfile;
}

const TOKEN_TTL_SECONDS = 60 * 60;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterUserDto): Promise<AuthUserProfile> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const role = roleSlugToEnum(dto.role);

    const createdUser = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        role,
        department: dto.department?.trim() || null,
        isActive: dto.is_active ?? true,
      },
    });

    return this.toAuthUserProfile(createdUser);
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jti = randomUUID();
    const claims: JwtClaims = {
      user_id: user.id,
      role: roleEnumToSlug(user.role),
      department: user.department ?? null,
      jti,
    };

    const token = jwt.sign(claims, this.getJwtSecret(), {
      expiresIn: TOKEN_TTL_SECONDS,
      subject: user.id,
    });

    await this.cleanupExpiredRevokedTokens();

    return {
      token,
      user: this.toAuthUserProfile(user),
    };
  }

  async logout(authUser: AuthenticatedUser, claims: JwtClaims): Promise<void> {
    const expiresAt = claims.exp
      ? new Date(claims.exp * 1000)
      : new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

    await this.prisma.revokedToken.upsert({
      where: { jti: claims.jti },
      update: {
        userId: authUser.id,
        expiresAt,
      },
      create: {
        jti: claims.jti,
        userId: authUser.id,
        expiresAt,
      },
    });
  }

  async me(userId: string): Promise<AuthUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Authenticated user not found');
    }

    return this.toAuthUserProfile(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    this.ensurePasswordValid(dto.new_password);

    if (dto.new_password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    const currentPasswordMatches = await bcrypt.compare(
      dto.current_password,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private async cleanupExpiredRevokedTokens(): Promise<void> {
    await this.prisma.revokedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET must be configured');
    }

    return secret;
  }

  private ensurePasswordValid(password: string): void {
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    if (
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      throw new BadRequestException(
        `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
      );
    }
  }

  private toAuthUserProfile(user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    department: string | null;
    isActive: boolean;
    createdAt: Date;
  }): AuthUserProfile {
    return {
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: roleEnumToSlug(user.role),
      department: user.department,
      is_active: user.isActive,
      created_at: user.createdAt,
    };
  }
}
