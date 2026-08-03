import { z } from 'zod';

const developmentDefaults = {
  API_PORT: '3001',
  DATABASE_URL: 'postgresql://uckg:uckg@localhost:5432/uckg_donations',
  WEB_ORIGINS: 'http://localhost:3000',
  TRUST_PROXY: 'false',
  METRICS_TOKEN: 'development-metrics-token',
  BODY_LIMIT: '256kb',
  DB_POOL_MAX: '10',
  DB_CONNECTION_TIMEOUT_MS: '5000',
  DB_IDLE_TIMEOUT_MS: '30000',
  DB_STATEMENT_TIMEOUT_MS: '15000',
  DB_READY_TIMEOUT_MS: '1000',
  LOGIN_SOURCE_LIMIT: '10',
  LOGIN_SOURCE_WINDOW_MS: '60000',
  LOGIN_ACCOUNT_LIMIT: '5',
  LOGIN_ACCOUNT_WINDOW_MS: '900000',
} as const;

const productionRequiredKeys = Object.keys(
  developmentDefaults,
) as (keyof typeof developmentDefaults)[];

const positiveInteger = z.coerce.number().int().positive();

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_PORT: z.coerce.number().int().min(1).max(65_535),
  DATABASE_URL: z.string().url(),
  WEB_ORIGINS: z.string().min(1),
  TRUST_PROXY: z.string().min(1),
  METRICS_TOKEN: z.string().min(1),
  BODY_LIMIT: z.string().regex(/^\d+(?:b|kb|mb)$/i),
  DB_POOL_MAX: positiveInteger,
  DB_CONNECTION_TIMEOUT_MS: positiveInteger,
  DB_IDLE_TIMEOUT_MS: positiveInteger,
  DB_STATEMENT_TIMEOUT_MS: positiveInteger,
  DB_READY_TIMEOUT_MS: positiveInteger,
  LOGIN_SOURCE_LIMIT: positiveInteger,
  LOGIN_SOURCE_WINDOW_MS: positiveInteger,
  LOGIN_ACCOUNT_LIMIT: positiveInteger,
  LOGIN_ACCOUNT_WINDOW_MS: positiveInteger,
});

export interface ApiConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly apiPort: number;
  readonly databaseUrl: string;
  readonly webOrigins: readonly string[];
  readonly trustProxy: false | readonly string[];
  readonly metricsToken: string;
  readonly bodyLimit: string;
  readonly dbPoolMax: number;
  readonly dbConnectionTimeoutMs: number;
  readonly dbIdleTimeoutMs: number;
  readonly dbStatementTimeoutMs: number;
  readonly dbReadyTimeoutMs: number;
  readonly loginSourceLimit: number;
  readonly loginSourceWindowMs: number;
  readonly loginAccountLimit: number;
  readonly loginAccountWindowMs: number;
}

function configError(keys: readonly string[]): Error {
  return new Error(
    `Invalid API configuration: ${[...new Set(keys)].sort().join(', ')}`,
  );
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost')
  );
}

export function validateApiEnvironment(
  input: Record<string, unknown>,
): ApiConfig {
  const nodeEnvironment = z
    .enum(['development', 'test', 'production'])
    .safeParse(input.NODE_ENV ?? 'development');
  if (!nodeEnvironment.success) {
    throw configError(['NODE_ENV']);
  }

  const rawEnvironment: Record<string, unknown> = { ...input };
  if (nodeEnvironment.data === 'production') {
    const missingKeys = productionRequiredKeys.filter((key) => {
      const value = rawEnvironment[key];
      return typeof value !== 'string' || value.trim() === '';
    });
    if (missingKeys.length > 0) {
      throw configError(missingKeys);
    }
  } else {
    for (const [key, defaultValue] of Object.entries(developmentDefaults)) {
      const suppliedValue = rawEnvironment[key];
      if (suppliedValue === undefined || suppliedValue === '') {
        rawEnvironment[key] = defaultValue;
      }
    }
  }
  rawEnvironment.NODE_ENV = nodeEnvironment.data;

  const parsed = environmentSchema.safeParse(rawEnvironment);
  if (!parsed.success) {
    throw configError(
      parsed.error.issues.map((issue) =>
        String(issue.path[0] ?? 'environment'),
      ),
    );
  }

  const webOrigins = parsed.data.WEB_ORIGINS.split(',').map((origin) =>
    origin.trim(),
  );
  const trustProxyValue = parsed.data.TRUST_PROXY.trim();
  const trustProxy =
    trustProxyValue.toLowerCase() === 'false'
      ? false
      : trustProxyValue.split(',').map((entry) => entry.trim());

  const insecureKeys: string[] = [];
  let databaseUrl: URL;
  const parsedOrigins: URL[] = [];
  try {
    databaseUrl = new URL(parsed.data.DATABASE_URL);
  } catch {
    throw configError(['DATABASE_URL']);
  }
  for (const origin of webOrigins) {
    try {
      parsedOrigins.push(new URL(origin));
    } catch {
      insecureKeys.push('WEB_ORIGINS');
    }
  }

  if (webOrigins.includes('*')) {
    insecureKeys.push('WEB_ORIGINS');
  }
  if (
    trustProxyValue.toLowerCase() === 'true' ||
    (Array.isArray(trustProxy) &&
      trustProxy.some((entry) => entry.length === 0))
  ) {
    insecureKeys.push('TRUST_PROXY');
  }
  if (nodeEnvironment.data === 'production') {
    if (isLocalHostname(databaseUrl.hostname)) {
      insecureKeys.push('DATABASE_URL');
    }
    if (parsedOrigins.some((origin) => isLocalHostname(origin.hostname))) {
      insecureKeys.push('WEB_ORIGINS');
    }
  }
  if (insecureKeys.length > 0) {
    throw configError(insecureKeys);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    apiPort: parsed.data.API_PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    webOrigins,
    trustProxy,
    metricsToken: parsed.data.METRICS_TOKEN,
    bodyLimit: parsed.data.BODY_LIMIT.toLowerCase(),
    dbPoolMax: parsed.data.DB_POOL_MAX,
    dbConnectionTimeoutMs: parsed.data.DB_CONNECTION_TIMEOUT_MS,
    dbIdleTimeoutMs: parsed.data.DB_IDLE_TIMEOUT_MS,
    dbStatementTimeoutMs: parsed.data.DB_STATEMENT_TIMEOUT_MS,
    dbReadyTimeoutMs: parsed.data.DB_READY_TIMEOUT_MS,
    loginSourceLimit: parsed.data.LOGIN_SOURCE_LIMIT,
    loginSourceWindowMs: parsed.data.LOGIN_SOURCE_WINDOW_MS,
    loginAccountLimit: parsed.data.LOGIN_ACCOUNT_LIMIT,
    loginAccountWindowMs: parsed.data.LOGIN_ACCOUNT_WINDOW_MS,
  };
}
