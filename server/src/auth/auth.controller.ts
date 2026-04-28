import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { ApiResponse } from '../common/api-response.interface';
import {
  AuthService,
  type AuthUserProfile,
  type ChangePasswordDto,
  type LoginDto,
  type LoginResult,
  type RegisterUserDto,
} from './auth.service';
import type { AuthenticatedRequest } from './auth.middleware';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: RegisterUserDto,
  ): Promise<ApiResponse<AuthUserProfile>> {
    const user = await this.authService.register(body);

    return {
      success: true,
      data: user,
      message: 'User registered successfully',
    };
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<ApiResponse<LoginResult>> {
    const result = await this.authService.login(body);

    return {
      success: true,
      data: result,
      message: 'Login successful',
    };
  }

  @Post('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse<{ logged_out: boolean }>> {
    if (!request.user || !request.tokenPayload) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.authService.logout(request.user, request.tokenPayload);

    return {
      success: true,
      data: { logged_out: true },
      message: 'Logout successful',
    };
  }

  @Get('me')
  async me(
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResponse<AuthUserProfile>> {
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const profile = await this.authService.me(request.user.id);

    return {
      success: true,
      data: profile,
      message: 'Current user fetched successfully',
    };
  }

  @Post('change-password')
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ): Promise<ApiResponse<{ success: boolean }>> {
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.authService.changePassword(request.user.id, body);

    return {
      success: true,
      data: { success: true },
      message: 'Password changed successfully',
    };
  }
}
