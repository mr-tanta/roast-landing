type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logData = {
      level,
      message,
      timestamp,
      ...context,
    }

    if (this.isDevelopment) {
      // Pretty console logging for development
      const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🐛',
      }[level]

      console.log(
        `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`,
        context ? context : ''
      )
    } else {
      // JSON logging for production (compatible with log aggregation services)
      console.log(JSON.stringify(logData))
    }

    // In production, send to monitoring service
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoring(logData)
    }
  }

  private sendToMonitoring(logData: any) {
    // TODO: Integrate with Sentry, LogRocket, or other monitoring service
    // Example:
    // Sentry.captureException(new Error(logData.message), {
    //   extra: logData,
    // })
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  // Performance logging
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      this.info(`${operation} completed`, { duration, success: true })
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.error(`${operation} failed`, {
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}

export const logger = new Logger()