export type Environment = 'development' | 'production' | 'test';

export interface EnvironmentConfig {
  env: Environment;
  supabase: {
    url: string;
    anonKey: string;
  };
  api: {
    timeout: number;
  };
  features: {
    enableDebugLogs: boolean;
    enableAnalytics: boolean;
    enableTestData: boolean;
    strictValidation: boolean;
    requireConfirmationForDeletes: boolean;
    enableAuditLogging: boolean;
  };
}

function getEnvironment(): Environment {
  const env = import.meta.env.VITE_ENV || import.meta.env.MODE || 'development';

  if (env === 'production' || env === 'prod') {
    return 'production';
  }

  if (env === 'test') {
    return 'test';
  }

  return 'development';
}

function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  if (!config.supabase.url || config.supabase.url.includes('your-')) {
    errors.push('Supabase URL is not configured');
  }

  if (!config.supabase.anonKey || config.supabase.anonKey.includes('your-')) {
    errors.push('Supabase Anon Key is not configured');
  }

  if (config.env === 'production') {
    if (config.supabase.url.includes('localhost') || config.supabase.url.includes('127.0.0.1')) {
      errors.push('Production environment cannot use localhost database');
    }

    if (config.features.enableTestData) {
      errors.push('Test data cannot be enabled in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment Configuration Error:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
      `Please check your environment variables in .env.${config.env}`
    );
  }
}

function loadConfig(): EnvironmentConfig {
  const env = getEnvironment();

  const config: EnvironmentConfig = {
    env,
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    api: {
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
    },
    features: {
      enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
      enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
      enableTestData: import.meta.env.VITE_ENABLE_TEST_DATA === 'true',
      strictValidation: import.meta.env.VITE_STRICT_VALIDATION === 'true',
      requireConfirmationForDeletes: import.meta.env.VITE_REQUIRE_CONFIRMATION_FOR_DELETES === 'true',
      enableAuditLogging: import.meta.env.VITE_ENABLE_AUDIT_LOGGING === 'true',
    },
  };

  validateConfig(config);

  return config;
}

export const config = loadConfig();

export function logEnvironmentInfo(): void {
  const isDev = config.env === 'development';
  const isProd = config.env === 'production';

  const envColor = isDev ? '#4ade80' : isProd ? '#ef4444' : '#fbbf24';
  const envLabel = config.env.toUpperCase();

  console.log(
    '%c╔════════════════════════════════════════════════════════════╗',
    'color: ' + envColor
  );
  console.log(
    `%c║  🏥 WESABI PHARMACY POS - ${envLabel.padEnd(36)}║`,
    'color: ' + envColor + '; font-weight: bold; font-size: 14px'
  );
  console.log(
    '%c╠════════════════════════════════════════════════════════════╣',
    'color: ' + envColor
  );
  console.log(
    `%c║  Environment: ${config.env.padEnd(44)}║`,
    'color: ' + envColor
  );
  console.log(
    `%c║  Database: ${(config.supabase.url.split('//')[1]?.split('.')[0] || 'unknown').padEnd(47)}║`,
    'color: ' + envColor
  );
  console.log(
    `%c║  Debug Logs: ${(config.features.enableDebugLogs ? 'Enabled' : 'Disabled').padEnd(45)}║`,
    'color: ' + envColor
  );
  console.log(
    `%c║  Analytics: ${(config.features.enableAnalytics ? 'Enabled' : 'Disabled').padEnd(46)}║`,
    'color: ' + envColor
  );
  console.log(
    `%c║  Strict Validation: ${(config.features.strictValidation ? 'Enabled' : 'Disabled').padEnd(38)}║`,
    'color: ' + envColor
  );
  console.log(
    '%c╚════════════════════════════════════════════════════════════╝',
    'color: ' + envColor
  );

  if (isProd) {
    console.warn(
      '%c⚠️  PRODUCTION MODE - All changes will affect live data!',
      'background: #ef4444; color: white; font-weight: bold; padding: 8px; font-size: 14px'
    );
  } else if (isDev) {
    console.log(
      '%c✓ Development Mode - Safe to test',
      'background: #4ade80; color: black; font-weight: bold; padding: 8px'
    );
  }

  if (config.features.enableDebugLogs) {
    console.log('%c[Config] Full configuration:', 'color: #6366f1; font-weight: bold');
    console.log({
      environment: config.env,
      supabaseUrl: config.supabase.url,
      features: config.features,
      apiTimeout: config.api.timeout,
    });
  }
}

export function isProduction(): boolean {
  return config.env === 'production';
}

export function isDevelopment(): boolean {
  return config.env === 'development';
}

export function isTest(): boolean {
  return config.env === 'test';
}

export function getSupabaseConfig() {
  return {
    url: config.supabase.url,
    anonKey: config.supabase.anonKey,
  };
}

export function shouldEnableFeature(feature: keyof EnvironmentConfig['features']): boolean {
  return config.features[feature];
}
