import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import type { ConnectionOptions } from 'tls';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL or DIRECT_URL must be configured');
    }

    const useSsl = parseBoolean(process.env.PG_SSL, true);
    const rejectUnauthorized = parseBoolean(
      process.env.PG_SSL_REJECT_UNAUTHORIZED,
      true,
    );
    const ca = process.env.PG_SSL_CA?.replace(/\\n/g, '\n');

    const ssl: ConnectionOptions | undefined = useSsl
      ? {
          rejectUnauthorized,
          ...(ca ? { ca } : {}),
        }
      : undefined;

    const pool = new Pool({
      connectionString,
      ...(ssl ? { ssl } : {}),
    });
    super({
      adapter: new PrismaPg(pool),
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
