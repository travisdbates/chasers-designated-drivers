// Notification utilities for error handling and retry logic
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export interface NotificationError extends Error {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
  originalError?: any;
}

export interface NotificationResult {
  success: boolean;
  result?: any;
  error?: NotificationError;
  attempts: number;
  totalDuration: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,     // 1 second
  maxDelay: 30000,     // 30 seconds
  backoffMultiplier: 2
};

// Errors that should not be retried
const NON_RETRYABLE_ERRORS = [
  'INVALID_EMAIL',
  'INVALID_PHONE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'MISSING_CREDENTIALS',
  'CONFIGURATION_ERROR'
];

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation'
): Promise<NotificationResult> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: NotificationError | undefined;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      console.log(`${operationName} - Attempt ${attempt}/${retryConfig.maxRetries + 1}`);
      
      const result = await operation();
      const duration = Date.now() - startTime;
      
      console.log(`${operationName} - Success on attempt ${attempt} (${duration}ms)`);
      
      return {
        success: true,
        result,
        attempts: attempt,
        totalDuration: duration
      };
      
    } catch (error) {
      const notificationError = normalizeError(error);
      lastError = notificationError;
      
      console.error(`${operationName} - Attempt ${attempt} failed:`, {
        error: notificationError.message,
        code: notificationError.code,
        retryable: notificationError.retryable
      });
      
      // Don't retry if this is the last attempt
      if (attempt > retryConfig.maxRetries) {
        break;
      }
      
      // Don't retry non-retryable errors
      if (!notificationError.retryable) {
        console.error(`${operationName} - Non-retryable error, aborting:`, notificationError.code);
        break;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt - 1, retryConfig);
      console.log(`${operationName} - Retrying in ${delay}ms...`);
      
      await sleep(delay);
    }
  }
  
  const duration = Date.now() - startTime;
  
  return {
    success: false,
    error: lastError,
    attempts: retryConfig.maxRetries + 1,
    totalDuration: duration
  };
}

/**
 * Send email notification with retry logic
 */
export async function sendEmailWithRetry(
  notificationData: any,
  config: Partial<RetryConfig> = {}
): Promise<NotificationResult> {
  return withRetry(
    async () => {
      const response = await fetch('/api/send-email-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createNotificationError(
          `Email notification failed: ${errorData.error || response.statusText}`,
          'EMAIL_SEND_FAILED',
          response.status,
          response.status < 500 // 4xx errors are usually not retryable
        );
      }
      
      return await response.json();
    },
    config,
    'Email Notification'
  );
}

/**
 * Send SMS notification with retry logic
 */
export async function sendSMSWithRetry(
  notificationData: any,
  config: Partial<RetryConfig> = {}
): Promise<NotificationResult> {
  return withRetry(
    async () => {
      const response = await fetch('/api/send-sms-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createNotificationError(
          `SMS notification failed: ${errorData.error || response.statusText}`,
          'SMS_SEND_FAILED',
          response.status,
          response.status < 500 // 4xx errors are usually not retryable
        );
      }
      
      return await response.json();
    },
    config,
    'SMS Notification'
  );
}

/**
 * Normalize different types of errors into NotificationError
 */
function normalizeError(error: any): NotificationError {
  if (error instanceof Error) {
    const notificationError = error as NotificationError;
    
    // If it's already a NotificationError, return as-is
    if (notificationError.code && notificationError.retryable !== undefined) {
      return notificationError;
    }
    
    // Try to determine if it's retryable based on the message or type
    const isRetryable = !NON_RETRYABLE_ERRORS.some(code => 
      notificationError.message.includes(code) || 
      notificationError.name?.includes(code)
    );
    
    return createNotificationError(
      notificationError.message,
      'UNKNOWN_ERROR',
      500,
      isRetryable,
      notificationError
    );
  }
  
  // Handle non-Error objects
  return createNotificationError(
    String(error),
    'UNKNOWN_ERROR',
    500,
    true,
    error
  );
}

/**
 * Create a standardized NotificationError
 */
function createNotificationError(
  message: string,
  code: string,
  statusCode: number,
  retryable: boolean,
  originalError?: any
): NotificationError {
  const error = new Error(message) as NotificationError;
  error.code = code;
  error.statusCode = statusCode;
  error.retryable = retryable;
  error.originalError = originalError;
  return error;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attemptNumber: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber);
  
  // Add jitter (random variation) to prevent thundering herd
  const jitter = Math.random() * 0.1 * exponentialDelay;
  
  const delay = exponentialDelay + jitter;
  
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch process notifications with error handling
 */
export async function sendNotificationBatch(
  notifications: Array<{
    type: 'email' | 'sms';
    data: any;
  }>,
  config: Partial<RetryConfig> = {}
): Promise<{
  successful: number;
  failed: number;
  results: NotificationResult[];
}> {
  const results: NotificationResult[] = [];
  let successful = 0;
  let failed = 0;
  
  // Process notifications in parallel with limited concurrency
  const BATCH_SIZE = 5; // Process 5 notifications at a time
  
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (notification) => {
      const result = notification.type === 'email' 
        ? await sendEmailWithRetry(notification.data, config)
        : await sendSMSWithRetry(notification.data, config);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      return result;
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming the services
    if (i + BATCH_SIZE < notifications.length) {
      await sleep(100);
    }
  }
  
  console.log(`Notification batch processed: ${successful} successful, ${failed} failed`);
  
  return {
    successful,
    failed,
    results
  };
}

/**
 * Log notification metrics for monitoring
 */
export function logNotificationMetrics(
  type: 'email' | 'sms',
  result: NotificationResult,
  context?: any
): void {
  const metrics = {
    type,
    success: result.success,
    attempts: result.attempts,
    duration: result.totalDuration,
    error: result.error ? {
      code: result.error.code,
      message: result.error.message,
      retryable: result.error.retryable
    } : undefined,
    context,
    timestamp: new Date().toISOString()
  };
  
  // In production, send these metrics to your monitoring system
  // For now, just log them
  console.log('Notification Metrics:', JSON.stringify(metrics, null, 2));
}