import { Logging } from '@google-cloud/logging';

const isProd = process.env.NODE_ENV === 'production';

let gcpLogger: ReturnType<Logging['log']> | null = null;

if (isProd) {
  const logging = new Logging();
  gcpLogger = logging.log('hubspot-notification-app'); // log name in Cloud Logging
}

type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export const logger = {
  log: (
    severity: LogSeverity,
    message: string,
    meta: Record<string, any> = {},
  ) => {
    if (!isProd) {
      // Local dev → log to console
      const formatted = `[${severity}] ${message}`;
      if (severity === 'ERROR') {
        console.error(formatted, meta);
      } else if (severity === 'WARNING') {
        console.warn(formatted, meta);
      } else {
        console.log(formatted, meta);
      }
      return;
    }

    if (gcpLogger) {
      const entry = gcpLogger.entry(
        { resource: { type: 'cloud_run_revision' } }, // for Cloud Run
        {
          severity,
          message,
          ...meta,
        },
      );
      gcpLogger.write(entry).catch((err) => {
        console.error('Failed to write log to GCP:', err);
      });
    }
  },

  info: (msg: string, meta?: Record<string, any>) =>
    logger.log('INFO', msg, meta),
  debug: (msg: string, meta?: Record<string, any>) =>
    logger.log('DEBUG', msg, meta),
  warn: (msg: string, meta?: Record<string, any>) =>
    logger.log('WARNING', msg, meta),
  error: (msg: string, meta?: Record<string, any>) =>
    logger.log('ERROR', msg, meta),
};

/**
 * Helper for error logging with stack traces and context
 */
export const logError = (
  msg: string,
  err: unknown,
  context: Record<string, any> = {},
) => {
  logger.error(msg, {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...context,
  });
};
