import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsOptional()
  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL_DAYS = 7;

  @IsOptional()
  @IsInt()
  PORT = 3000;

  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsOptional()
  @IsString()
  CORS_ORIGINS = 'http://localhost:3001,http://localhost:3002';

  @IsOptional()
  @IsString()
  STORAGE_PATH = './storage';

  @IsOptional()
  @IsBoolean()
  SWAGGER_ENABLED = true;

  @IsOptional()
  @IsInt()
  RATE_LIMIT_TTL_MS = 60000;

  @IsOptional()
  @IsInt()
  RATE_LIMIT_LIMIT = 20;
}

function toNumber(value: unknown): unknown {
  if (value === undefined || value === '' || value === null) return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function toBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return value;
  const s = String(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return value;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const coerced: Record<string, unknown> = { ...config };
  for (const key of ['PORT', 'JWT_REFRESH_TTL_DAYS', 'RATE_LIMIT_TTL_MS', 'RATE_LIMIT_LIMIT']) {
    coerced[key] = toNumber(config[key]);
  }
  coerced.SWAGGER_ENABLED = toBoolean(config.SWAGGER_ENABLED);

  const validated = plainToInstance(EnvironmentVariables, coerced);
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Variables de entorno inválidas: ${details}`);
  }
  return validated;
}