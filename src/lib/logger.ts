/**
 * Secure logging utility that only logs in development mode
 * Prevents sensitive information exposure in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  // For production error tracking (use with error monitoring service like Sentry)
  logError: (error: unknown, context?: Record<string, any>) => {
    if (isDevelopment) {
      console.error('Error:', error, 'Context:', context);
    } else {
      // In production, send to error monitoring service
      // Example: Sentry.captureException(error, { extra: context });
    }
  }
};
