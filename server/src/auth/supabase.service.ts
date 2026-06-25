import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createClient,
  type SupabaseClient,
  type User as SupabaseUser,
} from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Wraps Supabase Auth (GoTrue) for the backend:
 *  - an admin client (service-role key) for managing users, and
 *  - local access-token verification via the project's JWKS endpoint.
 *
 * Authentication is owned by Supabase; this app's `users` table remains the
 * source of truth for role / department / active state. The Supabase access
 * token carries the auth user's UUID in its `sub` claim, which equals the
 * `users.id` of the matching application user (see the user-import migration).
 */
@Injectable()
export class SupabaseService {
  private adminClient: SupabaseClient | null = null;
  private anonClient: SupabaseClient | null = null;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  /**
   * Admin client backed by the service-role key. Bypasses RLS and can manage
   * users; must never be exposed to the browser.
   */
  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      const url = this.requireEnv('SUPABASE_URL');
      const serviceRoleKey = this.requireEnv('SUPABASE_SERVICE_ROLE_KEY');

      this.adminClient = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    return this.adminClient;
  }

  /**
   * Anon client used only to verify a user's current password by attempting a
   * sign-in (e.g. during change-password). Does not persist any session.
   */
  getAnonClient(): SupabaseClient {
    if (!this.anonClient) {
      const url = this.requireEnv('SUPABASE_URL');
      const anonKey = this.requireEnv('SUPABASE_ANON_KEY');

      this.anonClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    return this.anonClient;
  }

  /**
   * Verifies a Supabase-issued access token and returns its subject (the auth
   * user id, equal to `users.id`).
   *
   * Fast path: local verification against the project's JWKS (asymmetric
   * signing keys). Keys are fetched once and cached by `jose`, so there is no
   * per-request network call. If that fails (e.g. the project still signs
   * tokens with the legacy shared HS256 secret, so no JWKS key matches), we
   * fall back to asking Supabase to validate the token via `getUser`.
   */
  async verifyAccessToken(token: string): Promise<{ sub: string }> {
    try {
      const { payload } = await jwtVerify(token, this.getJwks());

      if (typeof payload.sub === 'string' && payload.sub.length > 0) {
        return { sub: payload.sub };
      }
    } catch {
      // Fall through to the remote validation path.
    }

    const { data, error } = await this.getAdminClient().auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return { sub: data.user.id };
  }

  /**
   * Creates a user in Supabase Auth. Email is pre-confirmed because accounts
   * are provisioned by a system administrator, not via self sign-up.
   */
  async createAuthUser(params: {
    email: string;
    password: string;
    role: string;
  }): Promise<SupabaseUser> {
    const { data, error } = await this.getAdminClient().auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      app_metadata: { role: params.role, provider: 'email' },
    });

    if (error || !data.user) {
      throw new InternalServerErrorException(
        error?.message ?? 'Failed to create Supabase auth user',
      );
    }

    return data.user;
  }

  /** Deletes a Supabase auth user (used to compensate a failed registration). */
  async deleteAuthUser(userId: string): Promise<void> {
    await this.getAdminClient().auth.admin.deleteUser(userId);
  }

  /** Updates a Supabase auth user's password. */
  async updateAuthUserPassword(
    userId: string,
    password: string,
  ): Promise<void> {
    const { error } = await this.getAdminClient().auth.admin.updateUserById(
      userId,
      { password },
    );

    if (error) {
      throw new InternalServerErrorException(
        error.message ?? 'Failed to update password',
      );
    }
  }

  /** Returns true if the supplied credentials are valid Supabase credentials. */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const { error } = await this.getAnonClient().auth.signInWithPassword({
      email,
      password,
    });

    return !error;
  }

  /**
   * Revokes every active session for the user behind the supplied access token
   * (server-side global logout). The client also clears its local session.
   */
  async revokeSessions(accessToken: string): Promise<void> {
    await this.getAdminClient().auth.admin.signOut(accessToken, 'global');
  }

  private getJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks) {
      const jwksUrl =
        process.env.SUPABASE_JWKS_URL ??
        `${this.requireEnv('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`;

      this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    }

    return this.jwks;
  }

  private requireEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new InternalServerErrorException(`${name} must be configured`);
    }

    return value;
  }
}
