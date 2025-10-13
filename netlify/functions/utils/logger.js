/**
 * Structured Logger for Netlify Functions
 * 
 * Provides consistent logging across all serverless functions with:
 * - Structured JSON output for easy parsing
 * - Performance tracking
 * - Error context capture
 * - Request metadata
 * 
 * Usage:
 * ```javascript
 * import { Logger } from './utils/logger.js'
 * 
 * export async function handler(event) {
 *   const logger = new Logger('function-name')
 *   
 *   try {
 *     logger.info('Processing request', { userId: 123 })
 *     // ... function logic
 *     logger.performance()
 *     return response
 *   } catch (error) {
 *     logger.error('Function failed', error, { userId: 123 })
 *     throw error
 *   }
 * }
 * ```
 */

export class Logger {
  constructor(functionName, event = null) {
    this.functionName = functionName
    this.startTime = Date.now()
    this.requestId = event?.headers?.['x-request-id'] || this.generateRequestId()
    this.event = event
  }

  /**
   * Generate a unique request ID for tracking
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log info-level message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.log('info', message, meta)
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta)
  }

  /**
   * Log error with full context
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {object} meta - Additional metadata
   */
  error(message, error, meta = {}) {
    const errorDetails = {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      statusCode: error?.statusCode
    }

    this.log('error', message, {
      ...meta,
      error: errorDetails
    })
  }

  /**
   * Log debug information (only in development)
   * @param {string} message - Debug message
   * @param {object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      this.log('debug', message, meta)
    }
  }

  /**
   * Log function performance metrics
   * @param {object} additionalMetrics - Additional performance metrics
   */
  performance(additionalMetrics = {}) {
    const duration = Date.now() - this.startTime
    
    this.info('Function execution complete', {
      performance: {
        duration,
        durationMs: duration,
        durationSeconds: (duration / 1000).toFixed(2),
        ...additionalMetrics
      }
    })

    // Warn if function is slow
    if (duration > 5000) {
      this.warn('Slow function execution detected', {
        duration,
        threshold: 5000
      })
    }
  }

  /**
   * Log database query
   * @param {string} query - SQL query or operation name
   * @param {number} duration - Query duration in ms
   * @param {object} meta - Additional metadata
   */
  query(query, duration, meta = {}) {
    this.debug('Database query', {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      ...meta
    })

    // Warn if query is slow
    if (duration > 1000) {
      this.warn('Slow database query detected', {
        query: query.substring(0, 200),
        duration,
        threshold: 1000
      })
    }
  }

  /**
   * Log API call to external service
   * @param {string} service - Service name (e.g., 'Resend', 'Square')
   * @param {string} operation - Operation name
   * @param {number} duration - Request duration in ms
   * @param {object} meta - Additional metadata
   */
  apiCall(service, operation, duration, meta = {}) {
    this.info('External API call', {
      service,
      operation,
      duration,
      ...meta
    })
  }

  /**
   * Core logging method
   * @private
   */
  log(level, message, meta = {}) {
    const logEntry = {
      level,
      function: this.functionName,
      requestId: this.requestId,
      message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      ...this.getRequestMetadata(),
      ...meta
    }

    // Use appropriate console method based on level
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    console[consoleMethod](JSON.stringify(logEntry))
  }

  /**
   * Extract useful metadata from the request event
   * @private
   */
  getRequestMetadata() {
    if (!this.event) return {}

    return {
      request: {
        method: this.event.httpMethod,
        path: this.event.path,
        userAgent: this.event.headers?.['user-agent'],
        ip: this.event.headers?.['x-forwarded-for'] || 
            this.event.headers?.['x-nf-client-connection-ip'],
        country: this.event.headers?.['x-country'],
      }
    }
  }

  /**
   * Create a child logger for sub-operations
   * @param {string} operation - Sub-operation name
   */
  child(operation) {
    const child = new Logger(`${this.functionName}:${operation}`, this.event)
    child.requestId = this.requestId
    child.startTime = Date.now()
    return child
  }
}

/**
 * Helper function to wrap async handlers with automatic logging
 * @param {string} functionName - Name of the function
 * @param {Function} handler - Async handler function
 */
export function withLogging(functionName, handler) {
  return async (event, context) => {
    const logger = new Logger(functionName, event)
    
    logger.info('Function invoked', {
      coldStart: context.coldStart || false
    })

    try {
      const result = await handler(event, context, logger)
      logger.performance()
      return result
    } catch (error) {
      logger.error('Function execution failed', error)
      throw error
    }
  }
}

/**
 * Sanitize sensitive data from logs
 * @param {object} data - Data to sanitize
 * @returns {object} Sanitized data
 */
export function sanitize(data) {
  if (!data || typeof data !== 'object') return data

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'authorization']
  const sanitized = { ...data }

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key])
    }
  }

  return sanitized
}
