/**
 * Production-Ready Logger
 * 
 * Replaces console.log with proper logging that:
 * - Only logs in development
 * - Sends errors to Sentry in production
 * - Provides structured logging
 * - Can be easily disabled
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId: 123 });
 *   logger.error('API call failed', error);
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (isProduction) {
      return level === 'warn' || level === 'error';
    }
    // In development, log everything
    return true;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      };
      console.error(this.formatMessage('error', message, errorContext));

      // In production, send to Sentry
      if (isProduction && window.Sentry) {
        window.Sentry.captureException(error, {
          extra: context,
        });
      }
    }
  }

  // Trading-specific logging
  trade(action: string, details: LogContext): void {
    this.info(`[TRADE] ${action}`, details);
  }

  risk(action: string, details: LogContext): void {
    this.warn(`[RISK] ${action}`, details);
  }

  killSwitch(reason: string, details?: LogContext): void {
    this.error(`[KILL SWITCH] ${reason}`, undefined, details);
  }
}

// Export singleton instance
export const logger = new Logger();

// For backward compatibility, export individual functions
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  trade: logger.trade.bind(logger),
  risk: logger.risk.bind(logger),
  killSwitch: logger.killSwitch.bind(logger),
};

// Type augmentation for Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: unknown, context?: { extra?: LogContext }) => void;
    };
  }
}

