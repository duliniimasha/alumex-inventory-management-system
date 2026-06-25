import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { roleEnumToSlug, roleSlugToEnum, type RoleSlug } from './role.util';
import { SupabaseService } from './supabase.service';

export interface RegisterUserDto {
  name: string;
  email: string;
  password: string;
  role: RoleSlug;
  department?: string;
  is_active?: boolean;
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

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Provisions a user in Supabase Auth (source of truth for credentials) and
   * mirrors them into the application `users` table using the same id, so the
   * Supabase token `sub` resolves to the app user. On a mirror failure the
   * Supabase user is removed to avoid orphaned auth accounts.
   */
  async register(dto: RegisterUserDto): Promise<AuthUserProfile> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    this.ensurePasswordValid(dto.password);

    const role = roleSlugToEnum(dto.role);

    const authUser = await this.supabase.createAuthUser({
      email,
      password: dto.password,
      role: dto.role,
    });

    try {
      const createdUser = await this.prisma.user.create({
        data: {
          id: authUser.id,
          name: dto.name.trim(),
          email,
          role,
          department: dto.department?.trim() || null,
          isActive: dto.is_active ?? true,
        },
      });

      return this.toAuthUserProfile(createdUser);
    } catch (error) {
      // Compensate: roll back the Supabase auth user so the two stay in sync.
      await this.supabase.deleteAuthUser(authUser.id);
      throw error;
    }
  }

  async logout(accessToken: string): Promise<void> {
    await this.supabase.revokeSessions(accessToken);
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

    const currentPasswordMatches = await this.supabase.verifyPassword(
      user.email,
      dto.current_password,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.supabase.updateAuthUserPassword(userId, dto.new_password);
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
