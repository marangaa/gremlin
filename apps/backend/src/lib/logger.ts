/**
 * Structured Logger for Cloudflare Workers & Hono API.
 * Emits clean, structured log entries with timestamps, severity levels, and contextual metadata.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private service: string;

  constructor(service = 'gremlin-backend') {
    this.service = service;
  }

  private format(level: LogLevel, message: string, context?: LogContext): string {
    const entry = {
      timestamp: new Date().toISOString(),
      service: this.service,
      level: level.toUpperCase(),
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };
    return JSON.stringify(entry);
  }

  public debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.format('debug', message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    console.info(this.format('info', message, context));
  }

  public warn(message: string, context?: LogContext): void {
    console.warn(this.format('warn', message, context));
  }

  public error(message: string, error?: unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;

    console.error(
      this.format('error', message, {
        ...context,
        ...(errorDetails ? { error: errorDetails } : {}),
      }),
    );
  }
}

export const logger = new Logger();
